/* ---------- Primitivas geométricas ---------- */

export interface Vector2D {
  x: number;
  y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Vector2D, Size {}

export type Facing = 'up' | 'down' | 'left' | 'right';

/* ---------- Colisão ---------- */

/**
 * Caixa AABB relativa à posição do objeto dono.
 * Destruir a colisão de um objeto = `object.collider = null`.
 */
export interface Collider {
  readonly offset: Vector2D;
  readonly size: Size;
}

/* ---------- Entidades ---------- */

export type PropKind =
  | 'plant'
  | 'pillar'
  | 'desk'
  | 'bench'
  | 'luggage'
  | 'scanner'
  | 'board'
  | 'plane'
  | 'mat';

export type EntityKind = 'player' | 'npc' | 'wall' | 'gate' | PropKind;

/**
 * 'ground' é desenhado antes de tudo (tapetes, marcações no chão);
 * 'sorted' participa do Y-Sorting.
 */
export type RenderLayer = 'ground' | 'sorted';

export interface GameObject {
  readonly id: string;
  readonly kind: EntityKind;
  readonly layer: RenderLayer;
  /** Canto superior esquerdo da "pegada" (footprint) no mundo. */
  position: Vector2D;
  /** Tamanho da pegada. A base de ordenação Y é `position.y + size.height`. */
  readonly size: Size;
  /** Altura visual desenhada acima da pegada (paredes, árvores, aviões...). */
  readonly elevation: number;
  /** Variação visual (cor, texto, modelo). */
  readonly variant: number;
  collider: Collider | null;
  /** Só é chamado enquanto o objeto está dentro do viewport da câmera. */
  update?(deltaTime: number): void;
}

export interface Player extends GameObject {
  readonly kind: 'player';
  readonly speed: number;
  direction: Vector2D;
  facing: Facing;
  isMoving: boolean;
  animTime: number;
}

export type NpcOutfit = 'agent' | 'security' | 'pilot';

export interface TriggerZone {
  /** Raio (px) medido do centro do NPC até o centro do jogador. */
  readonly radius: number;
}

export interface NPC extends GameObject {
  readonly kind: 'npc';
  readonly name: string;
  readonly role: string;
  readonly outfit: NpcOutfit;
  readonly questId: string;
  readonly trigger: TriggerZone;
  /** Fala exibida depois que a quest foi concluída. */
  readonly doneLine: string;
  completed: boolean;
  animTime: number;
}

export interface ProgressGate extends GameObject {
  readonly kind: 'gate';
  readonly questId: string;
  readonly label: string;
  unlocked: boolean;
  /** 0 = fechado, 1 = totalmente aberto (só animação). */
  openProgress: number;
}

export const isPlayer = (o: GameObject): o is Player => o.kind === 'player';
export const isNPC = (o: GameObject): o is NPC => o.kind === 'npc';
export const isGate = (o: GameObject): o is ProgressGate => o.kind === 'gate';

/* ---------- Mundo ---------- */

export interface Zone {
  readonly id: string;
  readonly name: string;
  readonly rect: Rect;
  readonly pattern: 'checker' | 'asphalt';
  readonly colors: readonly [string, string];
}

/* ---------- Quests ---------- */

export type QuestStatus = 'pending' | 'completed';

export interface Quest {
  readonly id: string;
  readonly title: string;
  readonly npcId: string;
  /** Portão que será destrancado quando a quest for concluída. */
  readonly gateId: string;
  readonly intro: string;
  readonly question: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
  readonly wrongHint: string;
  status: QuestStatus;
  attempts: number;
}

export interface AnswerResult {
  readonly correct: boolean;
  readonly quest: Quest;
}
