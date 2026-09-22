import { Camera } from './core/Camera';
import {
  aabbIntersects,
  centerOf,
  getColliderRect,
  inflate,
  moveWithCollisions,
} from './core/Collision';
import { GameLoop } from './core/GameLoop';
import { InputManager } from './core/InputManager';
import { Renderer } from './rendering/Renderer';
import { QuestSystem } from './systems/QuestSystem';
import type { GameObject, NPC, Player, Quest } from './types';
import { isNPC } from './types';
import { UIManager } from './ui/UIManager';
import { createAirportLevel } from './world/airportLevel';
import type { World } from './world/World';

/** Orquestra os módulos: entrada → movimento/colisão → câmera → culling → interação → render. */
export class Game {
  private readonly renderer: Renderer;
  private readonly input = new InputManager();
  private readonly ui = new UIManager();
  private readonly loop: GameLoop;

  private world!: World;
  private player!: Player;
  private camera!: Camera;
  private quests!: QuestSystem;

  private visible: GameObject[] = [];
  private nearbyNpc: NPC | null = null;
  private zoneId = '';
  private finished = false;
  private debugEnabled = false;
  private debugTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: (t) => this.render(t),
    });

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('airport-game:answer', this.handleDomAnswer);
    window.addEventListener('airport-game:close-quest', this.handleDomClose);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.debugEnabled = !this.debugEnabled;
        this.renderer.debug = this.debugEnabled;
        this.ui.setDebug(this.debugEnabled, '');
        if (!this.loop.isRunning) this.renderFrame();
      }
    });

    this.loadLevel();
    this.handleResize();
  }

  private readonly handleDomAnswer = (event: Event): void => {
    const index = (event as CustomEvent<number>).detail;
    if (Number.isInteger(index)) this.ui.answer(index);
  };

  private readonly handleDomClose = (): void => this.ui.close();

  start(): void {
    this.loop.start();
  }

  /* ---------------- ciclo de vida ---------------- */

  private loadLevel(): void {
    const level = createAirportLevel();
    this.world = level.world;
    this.player = level.player;
    this.quests = new QuestSystem(level.quests);
    this.quests.onCompleted(this.handleQuestCompleted);
    this.camera = new Camera(window.innerWidth, window.innerHeight, this.world.width, this.world.height);
    this.camera.follow(this.player);

    this.visible = [];
    this.nearbyNpc = null;
    this.zoneId = '';
    this.finished = false;
    this.input.reset();
    this.ui.setHint(false);
    this.refreshProgress();
  }

  private restart(): void {
    this.ui.hideVictory();
    this.loadLevel();
    this.handleResize();
    this.loop.resume();
  }

  private readonly handleResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);
    this.camera.resize(w, h);
    this.camera.follow(this.player);
    if (!this.loop.isRunning) this.renderFrame(); // pausado: redesenha o quadro estático
  };

  private renderFrame(): void {
    this.visible = this.renderer.cull(this.world.objects, this.camera);
    this.renderer.render(this.world, this.camera, this.visible, this.loop.elapsed);
  }

  /* ---------------- update / render ---------------- */

  private update(dt: number): void {
    this.movePlayer(dt);
    this.camera.follow(this.player);

    // Culling: só o que está no viewport é atualizado (e depois renderizado).
    this.visible = this.renderer.cull(this.world.objects, this.camera);
    for (const obj of this.visible) obj.update?.(dt);

    this.updateZone();
    this.updateInteraction();
    this.checkGoal();
    this.updateDebug(dt);
  }

  private render(elapsed: number): void {
    this.renderer.render(this.world, this.camera, this.visible, elapsed);
  }

  private movePlayer(dt: number): void {
    const p = this.player;
    const dir = this.input.direction;
    p.direction.x = dir.x;
    p.direction.y = dir.y;
    p.isMoving = dir.x !== 0 || dir.y !== 0;
    if (!p.isMoving) return;

    p.facing =
      Math.abs(dir.x) > Math.abs(dir.y)
        ? dir.x > 0 ? 'right' : 'left'
        : dir.y > 0 ? 'down' : 'up';

    // deslocamento = direção × velocidade × deltaTime → independe do FPS
    const delta = { x: dir.x * p.speed * dt, y: dir.y * p.speed * dt };

    const box = getColliderRect(p);
    const solids = box ? this.world.queryColliders(inflate(box, 64), p) : [];
    moveWithCollisions(p, delta, solids, this.world);
  }

  /* ---------------- interação e quests ---------------- */

  private updateInteraction(): void {
    const interact = this.input.consumeInteract();
    const pc = centerOf(this.player);

    let nearest: NPC | null = null;
    let best = Infinity;
    for (const npc of this.world.npcs) {
      const nc = centerOf(npc);
      const dist = Math.hypot(pc.x - nc.x, pc.y - nc.y);
      if (dist <= npc.trigger.radius && dist < best) {
        nearest = npc;
        best = dist;
      }
    }

    if (nearest !== this.nearbyNpc) {
      this.nearbyNpc = nearest;
      this.ui.setHint(nearest !== null);
    }

    if (!interact || !nearest) return;
    if (nearest.completed) {
      this.ui.toast(`${nearest.name}: ${nearest.doneLine}`);
    } else {
      this.openQuest(nearest);
    }
  }

  private openQuest(npc: NPC): void {
    const quest = this.quests.get(npc.questId);
    if (!quest || quest.status === 'completed') return;

    this.loop.pause(); // congela update e render
    this.input.reset();
    this.nearbyNpc = null;
    this.ui.setHint(false);
    this.ui.showQuest(npc, quest, {
      onAnswer: (index) => this.handleAnswer(quest, index),
      onClose: () => this.closeQuest(),
    });
  }

  private handleAnswer(quest: Quest, optionIndex: number): void {
    const result = this.quests.submitAnswer(quest.id, optionIndex);
    if (!result.correct) this.ui.showWrongAnswer(optionIndex, quest.wrongHint);
    // se correta, `handleQuestCompleted` (evento do QuestSystem) faz o resto
  }

  private readonly handleQuestCompleted = (quest: Quest): void => {
    this.ui.hideQuest();
    this.world.unlockGate(quest.gateId); // destrói o Collider do portão
    const npc = this.world.getById(quest.npcId);
    if (npc && isNPC(npc)) npc.completed = true;

    this.refreshProgress();
    this.ui.toast(quest.explanation, 4800);
    this.input.reset();
    this.loop.resume();
  };

  private closeQuest(): void {
    this.ui.hideQuest();
    this.input.reset();
    this.loop.resume();
  }

  private refreshProgress(): void {
    const next = this.quests.nextPending;
    const npc = next ? this.world.getById(next.npcId) : undefined;
    const objective =
      next && npc && isNPC(npc)
        ? `Fale com ${npc.name} (${npc.role}).`
        : 'Todos os portões abertos: vá até a faixa de embarque no pátio.';
    this.ui.updateProgress(this.quests.completedCount, this.quests.total, objective);
  }

  /* ---------------- objetivo e HUD ---------------- */

  private checkGoal(): void {
    if (this.finished) return;
    const box = getColliderRect(this.player);
    if (box && aabbIntersects(box, this.world.goal)) {
      this.finished = true;
      this.loop.pause();
      this.input.reset();
      this.ui.setHint(false);
      this.ui.showVictory(() => this.restart());
    }
  }

  private updateZone(): void {
    const zone = this.world.getZoneAt(centerOf(this.player));
    if (zone && zone.id !== this.zoneId) {
      this.zoneId = zone.id;
      this.ui.setZone(zone.name);
    }
  }

  private updateDebug(dt: number): void {
    if (!this.debugEnabled) return;
    this.debugTimer += dt;
    if (this.debugTimer < 0.25) return;
    this.debugTimer = 0;
    this.ui.setDebug(
      true,
      `${Math.round(this.loop.fps)} FPS · ${this.visible.length}/${this.world.objects.length} objetos visíveis · câmera (${this.camera.x}, ${this.camera.y})`,
    );
  }
}
