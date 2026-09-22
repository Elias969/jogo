import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Engine } from "@babylonjs/core/Engines/engine";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Scene } from "@babylonjs/core/scene";
import { Camera } from "./camera";
import { moveWithAabb } from "./collision";
import { GameLoop } from "./game-loop";
import { InputManager } from "./input-manager";
import { QuestSystem } from "./quest-system";
import { Renderer } from "./renderer";
import { type Collider, type Direction, type GameObject, type GameState, type Player, type Quest, type Stage, MAP_SIZE, VIEWPORT } from "./types";
export type { GameState } from "./types";

export type GameHandle = { scene: Scene; dispose: () => void };
const ASSET = { airport: "/manus-storage/airport-terminal_f34d1466.jpg", front: "/manus-storage/catalina-front-full_5063d7a9.png", back: "/manus-storage/catalina-back-full_236464c3.png", left: "/manus-storage/catalina-left-full_ee3b3808.png", right: "/manus-storage/catalina-right-full_7ee74711.png" };
const events = { state: "el-encuentro:state", interact: "el-encuentro:interact", answer: "el-encuentro:answer" } as const;
const quests: Quest[] = [
  { id: "date", stage: "santiago", npcName: "Funcionário da Alfândega", triggerRadius: 150, prompt: "Em que dia, mês e ano nós oficialmente começamos a namorar?", choices: ["12 de fevereiro de 2022", "[DATA REAL — configure no código]", "7 de agosto de 2021"], correct: 1, gateId: "gate-santiago", completed: false },
  { id: "phrase", stage: "connection", npcName: "Senhora das malas", triggerRadius: 150, prompt: "Complete: O amor não conhece barreiras, ele pula cercas, salta muros e atravessa…", choices: ["o Oceano Pacífico.", "las Cordilleras.", "todo el continente."], correct: 2, gateId: "gate-connection", completed: false },
  { id: "food", stage: "brazil", npcName: "Segurança brasileiro", triggerRadius: 150, prompt: "Para te conquistar, eu prometi que te levaria para comer o melhor ______ do Brasil.", choices: ["Pão de queijo", "Brigadeiro", "Coxinha"], correct: 1, gateId: "gate-brazil", completed: false },
];
const stageIndex: Record<Stage, number> = { title: 0, santiago: 1, connection: 2, brazil: 3, reunion: 4 };
function texture(scene: Scene, url: string) { const t = new Texture(url, scene, true, false); t.hasAlpha = url.endsWith(".png"); return t; }
function material(scene: Scene, name: string, color: string, url?: string) { const m = new StandardMaterial(name, scene); m.backFaceCulling = false; m.diffuseColor = Color3.FromHexString(color); m.emissiveColor = m.diffuseColor.scale(.22); if (url) { m.diffuseTexture = texture(scene, url); m.useAlphaFromDiffuseTexture = true; m.transparencyMode = 2; } return m; }
function stateFor(stage: Stage, quest: Quest | null, message: string, direction: Direction, dialogOpen: boolean, answered: boolean): GameState { return { stage, stageIndex: stageIndex[stage], title: stage === "title" ? "El Encuentro" : stage === "reunion" ? "O reencontro" : `Cena ${stageIndex[stage]} · ${stage === "santiago" ? "Partindo de Santiago" : stage === "connection" ? "Área de conexão" : "Chegada ao Brasil"}`, subtitle: "Uma jornada do Chile ao Brasil", prompt: quest?.prompt || "", npc: quest?.npcName || "", dialogOpen, choices: quest?.choices || [], correct: quest?.correct || 0, answered, message, direction }; }

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine); scene.clearColor = new Color4(.95, .91, .85, 1);
  const camera = new FreeCamera("camera", new Vector3(0, 0, -20), scene); camera.mode = FreeCamera.ORTHOGRAPHIC_CAMERA; camera.orthoLeft = 0; camera.orthoRight = VIEWPORT.width; camera.orthoTop = 0; camera.orthoBottom = VIEWPORT.height; scene.activeCamera = camera;
  const viewportCamera = new Camera(VIEWPORT.width, VIEWPORT.height); const renderer = new Renderer(scene); const input = new InputManager(); const questSystem = new QuestSystem(quests);
  const colliders: Collider[] = [{ id: "airport-wall", rect: { x: 0, y: 0, width: MAP_SIZE, height: 30 }, solid: true, kind: "wall" }, { id: "gate-santiago", rect: { x: 1710, y: 560, width: 42, height: 390 }, solid: true, kind: "gate" }, { id: "gate-connection", rect: { x: 900, y: 60, width: 390, height: 36 }, solid: true, kind: "gate" }, { id: "gate-brazil", rect: { x: 1710, y: 560, width: 42, height: 390 }, solid: true, kind: "gate" }];
  const makeObject = (id: string, x: number, y: number, width: number, height: number, z: number, url?: string, color = "#ffffff"): GameObject => { const mesh = MeshBuilder.CreatePlane(id, { width, height }, scene); mesh.material = material(scene, `${id}-mat`, color, url); const object: GameObject = { id, position: { x, y }, size: { x: width, y: height }, z, visible: true, mesh }; renderer.add(object); return object; };
  const background = makeObject("airport", 0, 0, MAP_SIZE, 1125, 8, ASSET.airport); background.visible = true;
  const playerObject = makeObject("catalina", 180, 610, 250, 460, 2, ASSET.front); const player: Player = Object.assign(playerObject, { speed: 320, direction: "right" as Direction });
  const npc = makeObject("npc", 1500, 610, 100, 130, 1, undefined, "#d48b72");
  const gate = makeObject("progress-gate", 1710, 560, 42, 390, 1.5, undefined, "#356874");
  let stage: Stage = "title"; let dialogOpen = false; let answered = false; let message = "O amor atravessa fronteiras"; let direction: Direction = "right"; let activeQuest: Quest | null = null;
  const emit = () => window.dispatchEvent(new CustomEvent<GameState>(events.state, { detail: stateFor(stage, activeQuest, message, direction, dialogOpen, answered) }));
  const configure = (next: Stage) => { stage = next; dialogOpen = false; answered = false; activeQuest = null; questSystem.setStage(next === "title" || next === "reunion" ? "santiago" : next); player.visible = next !== "title"; npc.visible = next !== "title" && next !== "reunion"; gate.visible = next !== "title" && next !== "reunion"; player.mesh!.isVisible = player.visible; npc.mesh!.isVisible = npc.visible; gate.mesh!.isVisible = gate.visible; player.position = next === "connection" ? { x: 180, y: 500 } : next === "reunion" ? { x: 720, y: 590 } : { x: 180, y: 610 }; message = next === "santiago" ? "Caminhe até a direita e encontre o funcionário." : next === "connection" ? "A conexão está logo acima. Siga com carinho." : next === "brazil" ? "Bem-vinda ao Brasil! A última confirmação está à direita." : next === "reunion" ? "Você conseguiu, meu amor!" : "O amor atravessa fronteiras"; emit(); };
  const tryInteract = () => { if (stage === "title") { configure("santiago"); return; } if (stage === "reunion") return; const q = questSystem.tryTrigger(player, { x: npc.position.x, y: npc.position.y, width: npc.size.x, height: npc.size.y }); if (q) { activeQuest = q; dialogOpen = true; loop.pause(); message = "Escolha a resposta que parece mais com a história de vocês."; emit(); } };
  const onInteract = () => tryInteract(); const onAnswer = (event: Event) => { const result = questSystem.answer((event as CustomEvent<number>).detail, colliders); answered = true; if (!result.correct) { message = "Quase… confira no coração e tente de novo."; emit(); return; } dialogOpen = false; activeQuest = null; answered = false; message = "Resposta conferida. O caminho se abriu!"; gate.visible = false; loop.resume(); emit(); window.setTimeout(() => configure(stage === "santiago" ? "connection" : stage === "connection" ? "brazil" : "reunion"), 700); };
  window.addEventListener(events.interact, onInteract); window.addEventListener(events.answer, onAnswer); const onKey = (e: KeyboardEvent) => { if (e.type === "keydown" && e.key.toLowerCase() === "e") tryInteract(); }; window.addEventListener("keydown", onKey);
  const loop = new GameLoop((deltaTime) => { const inputDirection = input.direction; if (stage !== "title" && stage !== "reunion" && !dialogOpen) { if (inputDirection.x || inputDirection.y) { const length = Math.hypot(inputDirection.x, inputDirection.y) || 1; const delta = { x: inputDirection.x / length * player.speed * deltaTime, y: inputDirection.y / length * player.speed * deltaTime }; const solids = colliders.filter(c => c.solid).map(c => c.rect); moveWithAabb(player.position, player.size, delta, solids); if (inputDirection.x > 0) { direction = "right"; player.direction = direction; player.mesh!.material = material(scene, "player-right", "#ffffff", ASSET.right); } else if (inputDirection.x < 0) { direction = "left"; player.direction = direction; player.mesh!.material = material(scene, "player-left", "#ffffff", ASSET.left); } else if (inputDirection.y < 0) { direction = "down"; player.direction = direction; player.mesh!.material = material(scene, "player-down", "#ffffff", ASSET.front); } else if (inputDirection.y > 0) { direction = "up"; player.direction = direction; player.mesh!.material = material(scene, "player-up", "#ffffff", ASSET.back); } } } if (stage === "reunion") player.position.x = Math.min(900, player.position.x + 30 * deltaTime); viewportCamera.follow(player.position, player.size); renderer.update(viewportCamera); });
  configure("title"); loop.start(); const resize = () => { const ratio = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight()); camera.orthoRight = VIEWPORT.height * ratio; camera.orthoBottom = VIEWPORT.height; viewportCamera.viewport.width = VIEWPORT.height * ratio; }; window.addEventListener("resize", resize); resize();
  return { scene, dispose: () => { loop.dispose(); input.dispose(); renderer.dispose(); window.removeEventListener(events.interact, onInteract); window.removeEventListener(events.answer, onAnswer); window.removeEventListener("keydown", onKey); window.removeEventListener("resize", resize); scene.dispose(); } };
}
