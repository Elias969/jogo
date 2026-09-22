/** Constantes globais do jogo. */
export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 2000;

export const PLAYER_SPEED = 220; // pixels por segundo
export const PLAYER_SIZE = { width: 32, height: 48 } as const;

/** Limita o deltaTime (s) para evitar "saltos" após trocar de aba ou pausar. */
export const MAX_DELTA_TIME = 0.1;

export const FLOOR_TILE = 100;
export const WALL_THICKNESS = 20;
export const WALL_ELEVATION = 56;
