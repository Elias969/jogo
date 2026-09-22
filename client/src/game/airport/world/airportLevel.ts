import { PLAYER_SIZE, WALL_THICKNESS, WORLD_HEIGHT, WORLD_WIDTH } from '../config';
import { createQuests } from '../data/quests';
import type { GameObject, Player, Quest, Rect, Zone } from '../types';
import { createGate, createNPC, createPlayer, createProp, createWall } from './factories';
import { World } from './World';

export interface AirportLevel {
  world: World;
  player: Player;
  quests: Quest[];
}

/**
 * Mapa 2000x2000, quatro zonas empilhadas de baixo para cima:
 *   Check-in (y 1400+) → Segurança (800–1400) → Embarque (400–800) → Pátio (0–400)
 * Cada divisória tem um vão fechado por um Portão de Progresso; os vãos ficam em
 * lados diferentes (centro, direita, esquerda) para forçar a exploração.
 */
export function createAirportLevel(): AirportLevel {
  const objects: GameObject[] = [];
  const add = (...items: GameObject[]): void => {
    objects.push(...items);
  };

  const zones: Zone[] = [
    { id: 'checkin', name: 'Saguão de check-in', rect: { x: 0, y: 1400, width: 2000, height: 600 }, pattern: 'checker', colors: ['#dbe3ec', '#cdd7e3'] },
    { id: 'security', name: 'Controle de segurança', rect: { x: 0, y: 800, width: 2000, height: 600 }, pattern: 'checker', colors: ['#d0d9df', '#c3ccd3'] },
    { id: 'boarding', name: 'Salão de embarque', rect: { x: 0, y: 400, width: 2000, height: 400 }, pattern: 'checker', colors: ['#cdd9ec', '#bfcde5'] },
    { id: 'tarmac', name: 'Pátio de aeronaves', rect: { x: 0, y: 0, width: 2000, height: 400 }, pattern: 'asphalt', colors: ['#4b5763', '#434e59'] },
  ];

  /* ----- Divisórias com vão + Portões de Progresso ----- */
  const dividerWithGap = (y: number, gapX: number, gapW: number): void => {
    add(createWall(0, y, gapX));
    add(createWall(gapX + gapW, y, WORLD_WIDTH - (gapX + gapW)));
  };

  dividerWithGap(1400 - WALL_THICKNESS, 900, 200);
  dividerWithGap(800 - WALL_THICKNESS, 1500, 200);
  dividerWithGap(400 - WALL_THICKNESS, 300, 200);

  add(
    createGate({ id: 'gate-security', questId: 'quest-checkin', x: 900, y: 1380, width: 200, label: 'SEGURANÇA' }),
    createGate({ id: 'gate-boarding', questId: 'quest-security', x: 1500, y: 780, width: 200, label: 'EMBARQUE' }),
    createGate({ id: 'gate-tarmac', questId: 'quest-boarding', x: 300, y: 380, width: 200, label: 'PÁTIO' }),
  );

  /* ----- Zona 1: Saguão de check-in ----- */
  for (const x of [120, 300, 480, 1330, 1510, 1690]) add(createProp('desk', x, 1450));
  add(
    createProp('luggage', 140, 1540, { variant: 0 }),
    createProp('luggage', 190, 1545, { variant: 1 }),
    createProp('luggage', 330, 1550, { variant: 2 }),
    createProp('luggage', 1360, 1545, { variant: 3 }),
    createProp('luggage', 1550, 1548, { variant: 4 }),
    createProp('luggage', 1720, 1540, { variant: 1 }),
    createProp('pillar', 240, 1700),
    createProp('pillar', 700, 1760),
    createProp('pillar', 1300, 1760),
    createProp('pillar', 1760, 1700),
    createProp('plant', 40, 1425),
    createProp('plant', 1930, 1425),
    createProp('plant', 40, 1950),
    createProp('plant', 1930, 1950),
    createProp('plant', 860, 1425),
    createProp('plant', 1110, 1425),
    createProp('bench', 150, 1870),
    createProp('bench', 300, 1870),
    createProp('bench', 1550, 1870),
    createProp('bench', 1700, 1870),
    createProp('board', 740, 1440, { variant: 0 }),
  );

  /* ----- Zona 2: Segurança ----- */
  for (const [x, y] of [[180, 1000], [180, 1110], [380, 1000], [380, 1110]] as const) {
    add(createProp('scanner', x, y));
  }
  add(
    createProp('board', 720, 1000, { variant: 1 }),
    createProp('pillar', 700, 1200),
    createProp('pillar', 1300, 1250),
    createProp('pillar', 1800, 1100),
    createProp('bench', 560, 900),
    createProp('bench', 1650, 1300),
    createProp('bench', 1780, 1300),
    createProp('luggage', 860, 1200, { variant: 2 }),
    createProp('luggage', 900, 1210, { variant: 0 }),
    createProp('luggage', 1720, 930, { variant: 3 }),
    createProp('plant', 40, 830),
    createProp('plant', 1930, 830),
    createProp('plant', 40, 1350),
    createProp('plant', 1930, 1350),
  );

  /* ----- Zona 3: Salão de embarque ----- */
  for (const x of [1100, 1240, 1380]) {
    add(createProp('bench', x, 480), createProp('bench', x, 540));
  }
  add(
    createProp('bench', 620, 650),
    createProp('bench', 760, 650),
    createProp('board', 900, 430, { variant: 2 }),
    createProp('pillar', 1000, 560),
    createProp('pillar', 1700, 560),
    createProp('luggage', 900, 650, { variant: 4 }),
    createProp('luggage', 1560, 600, { variant: 1 }),
    createProp('luggage', 1600, 610, { variant: 2 }),
    createProp('plant', 40, 430),
    createProp('plant', 1930, 430),
    createProp('plant', 40, 750),
    createProp('plant', 1930, 750),
  );

  /* ----- Zona 4: Pátio (aviões) ----- */
  const goal: Rect = { x: 380, y: 230, width: 120, height: 40 };
  add(
    createProp('plane', 100, 110, { variant: 0, width: 800 }),
    createProp('plane', 1200, 110, { variant: 1, width: 600 }),
    createProp('mat', goal.x, goal.y),
    createProp('luggage', 620, 250, { variant: 3 }),
    createProp('luggage', 660, 254, { variant: 0 }),
    createProp('luggage', 1100, 240, { variant: 1 }),
    createProp('luggage', 1500, 250, { variant: 4 }),
  );

  /* ----- NPCs ----- */
  add(
    createNPC({
      id: 'npc-checkin',
      name: 'Marina',
      role: 'Agente de check-in',
      outfit: 'agent',
      questId: 'quest-checkin',
      x: 1160,
      y: 1620,
      doneLine: 'Boa viagem! A segurança fica logo acima, pelo portão central.',
    }),
    createNPC({
      id: 'npc-security',
      name: 'Oficial Rocha',
      role: 'Agente de segurança',
      outfit: 'security',
      questId: 'quest-security',
      x: 1300,
      y: 1000,
      doneLine: 'Pode seguir. O salão de embarque é pelo portão da direita.',
    }),
    createNPC({
      id: 'npc-pilot',
      name: 'Comandante Silva',
      role: 'Piloto',
      outfit: 'pilot',
      questId: 'quest-boarding',
      x: 760,
      y: 560,
      doneLine: 'Estamos te esperando na pista. O portão da esquerda leva ao avião.',
    }),
  );

  /* ----- Jogador ----- */
  const player = createPlayer(WORLD_WIDTH / 2 - PLAYER_SIZE.width / 2, 1880);
  add(player);

  const world = new World(WORLD_WIDTH, WORLD_HEIGHT, zones, objects, goal);
  return { world, player, quests: createQuests() };
}
