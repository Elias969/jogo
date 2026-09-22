import type { Facing, GameObject, NPC, NpcOutfit, ProgressGate } from '../types';
import { isGate, isNPC, isPlayer } from '../types';

const CATALINA: Record<Facing, HTMLImageElement> = {
  up: Object.assign(new Image(), { src: '/manus-storage/catalina-back-full_236464c3.png' }),
  down: Object.assign(new Image(), { src: '/manus-storage/catalina-front-full_5063d7a9.png' }),
  left: Object.assign(new Image(), { src: '/manus-storage/catalina-left-full_ee3b3808.png' }),
  right: Object.assign(new Image(), { src: '/manus-storage/catalina-right-full_7ee74711.png' }),
};

/** Sprites 100% procedurais (sem assets externos): tudo é desenhado com primitivas do Canvas. */
export interface DrawContext {
  readonly ctx: CanvasRenderingContext2D;
  readonly time: number;
  readonly viewWidth: number;
}

/* ---------------- helpers ---------------- */

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number): number => Math.max(0, Math.min(255, Math.round(c + 255 * amount)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Caixa 2.5D. (x, y) = canto da pegada; `e` = elevação.
 * Face de cima: (x, y-e, w, h). Face frontal: (x, y+h-e, w, e).
 */
function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, e: number, top: string, front: string): void {
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(x + 4, y + h - 2, w, 6);
  ctx.fillStyle = front;
  ctx.fillRect(x, y + h - e, w, e);
  ctx.fillStyle = top;
  ctx.fillRect(x, y - e, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y - e + 0.5, w - 1, h + e - 1);
  ctx.beginPath();
  ctx.moveTo(x, y + h - e + 0.5);
  ctx.lineTo(x + w, y + h - e + 0.5);
  ctx.stroke();
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'center'): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

/* ---------------- entrada principal ---------------- */

export function drawGameObject(dc: DrawContext, obj: GameObject, sx: number, sy: number): void {
  if (isPlayer(obj)) {
    drawCatalina(dc.ctx, sx, sy, obj.facing, obj.animTime * 10, obj.isMoving);
    return;
  }
  if (isNPC(obj)) return drawNpc(dc, obj, sx, sy);
  if (isGate(obj)) return drawGate(dc, obj, sx, sy);

  const { ctx } = dc;
  const { width: w, height: h } = obj.size;
  const e = obj.elevation;

  switch (obj.kind) {
    case 'wall': return drawWall(dc, obj, sx, sy);
    case 'plant': return drawPlant(ctx, sx, sy, w, h);
    case 'pillar': return drawPillar(ctx, sx, sy, w, h, e);
    case 'desk': return drawDesk(ctx, sx, sy, w, h, e);
    case 'bench': return drawBench(ctx, sx, sy, w, h, e);
    case 'luggage': return drawLuggage(ctx, sx, sy, w, h, e, obj.variant);
    case 'scanner': return drawScanner(ctx, sx, sy, w, h, e);
    case 'board': return drawBoard(ctx, sx, sy, w, h, e, obj.variant);
    case 'plane': return drawPlane(ctx, sx, sy, w, h, e, obj.variant);
    case 'mat': return drawMat(dc, sx, sy, w, h);
    default: return;
  }
}

function drawCatalina(ctx: CanvasRenderingContext2D, x: number, y: number, facing: Facing, phase: number, moving: boolean): void {
  const image = CATALINA[facing];
  if (!image.complete) return;
  const bob = moving ? Math.abs(Math.sin(phase)) * 2 : 0;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, x - 28, y - 112 - bob, 92, 168);
  ctx.restore();
}

/* ---------------- pessoas ---------------- */

interface PersonLook {
  skin: string;
  hair: string;
  top: string;
  bottom: string;
  accent: string;
  hat: 'none' | 'cap' | 'pilot';
  scarf: boolean;
  badge: boolean;
}

const LOOKS: Record<'player' | NpcOutfit, PersonLook> = {
  player: { skin: '#f1c9a0', hair: '#3e2723', top: '#ff7043', bottom: '#37474f', accent: '#ffe0b2', hat: 'none', scarf: false, badge: false },
  agent: { skin: '#e0ac86', hair: '#4e342e', top: '#1565c0', bottom: '#263238', accent: '#ffca28', hat: 'none', scarf: true, badge: false },
  security: { skin: '#c68e6b', hair: '#212121', top: '#2b3a44', bottom: '#1c262d', accent: '#ffd54f', hat: 'cap', scarf: false, badge: true },
  pilot: { skin: '#f1c9a0', hair: '#9e9e9e', top: '#10214a', bottom: '#0b1633', accent: '#ffd54f', hat: 'pilot', scarf: false, badge: true },
};

function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  look: PersonLook,
  facing: Facing,
  phase: number,
  moving: boolean,
  idle: number,
): void {
  const swing = moving ? Math.sin(phase) * 4 : 0;
  const bob = moving ? Math.abs(Math.sin(phase)) * 2 : idle;
  const by = y - bob;

  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.24)';
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 46, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // pernas + sapatos
  const legL = 13 + swing * 0.5;
  const legR = 13 - swing * 0.5;
  ctx.fillStyle = look.bottom;
  ctx.fillRect(x + 8, y + 46 - legL, 7, legL);
  ctx.fillRect(x + 17, y + 46 - legR, 7, legR);
  ctx.fillStyle = '#111';
  ctx.fillRect(x + 7, y + 44, 9, 3);
  ctx.fillRect(x + 16, y + 44, 9, 3);

  // braços
  ctx.fillStyle = look.top;
  ctx.fillRect(x + 1, by + 18 + swing * 0.4, 5, 13);
  ctx.fillRect(x + 26, by + 18 - swing * 0.4, 5, 13);
  ctx.fillStyle = look.skin;
  ctx.fillRect(x + 1, by + 30 + swing * 0.4, 5, 3);
  ctx.fillRect(x + 26, by + 30 - swing * 0.4, 5, 3);

  // tronco
  ctx.fillStyle = look.top;
  roundedRect(ctx, x + 6, by + 16, 20, 19, 5);
  ctx.fill();
  if (look.scarf) {
    ctx.fillStyle = look.accent;
    ctx.fillRect(x + 9, by + 15, 14, 4);
  }
  if (look.badge) {
    ctx.fillStyle = look.accent;
    ctx.fillRect(x + 19, by + 21, 4, 3);
  }
  if (look.hat === 'pilot') {
    ctx.fillStyle = look.accent;
    ctx.fillRect(x + 6, by + 25, 20, 2);
    ctx.fillRect(x + 6, by + 29, 20, 2);
  }

  // cabeça
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(x + 16, by + 9, 8, 0, Math.PI * 2);
  ctx.fill();

  // cabelo (cobre tudo quando de costas)
  ctx.fillStyle = look.hair;
  ctx.beginPath();
  if (facing === 'up') ctx.arc(x + 16, by + 9, 8.5, 0, Math.PI * 2);
  else ctx.arc(x + 16, by + 9, 8.5, Math.PI, Math.PI * 2);
  ctx.fill();

  // olhos
  if (facing !== 'up') {
    const dx = facing === 'left' ? -2.5 : facing === 'right' ? 2.5 : 0;
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(x + 12 + dx, by + 9, 2, 3);
    ctx.fillRect(x + 18 + dx, by + 9, 2, 3);
  }

  // chapéus
  if (look.hat === 'cap') {
    ctx.fillStyle = '#10181d';
    ctx.fillRect(x + 7, by, 18, 5);
    ctx.fillRect(x + 8, by + 4, 16, 2);
    ctx.fillStyle = look.accent;
    ctx.fillRect(x + 14, by + 1, 4, 3);
  } else if (look.hat === 'pilot') {
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(x + 7, by - 1, 18, 5);
    ctx.fillStyle = '#0b1633';
    ctx.fillRect(x + 7, by + 3, 18, 3);
    ctx.fillStyle = look.accent;
    ctx.fillRect(x + 14, by + 3, 4, 3);
  }
}

function drawNpc(dc: DrawContext, npc: NPC, sx: number, sy: number): void {
  const { ctx } = dc;
  drawPerson(ctx, sx, sy, LOOKS[npc.outfit], 'down', 0, false, Math.sin(npc.animTime * 2) * 1);

  if (!npc.completed) {
    const bounce = Math.sin(npc.animTime * 4) * 2;
    ctx.fillStyle = '#ffb703';
    ctx.beginPath();
    ctx.arc(sx + 16, sy - 12 + bounce, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0b1b2b';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, '!', sx + 16, sy - 7 + bounce, 'bold 13px sans-serif', '#0b1b2b');
  }
}

/* ---------------- estrutura ---------------- */

function drawWall(dc: DrawContext, obj: GameObject, sx: number, sy: number): void {
  const { ctx, viewWidth } = dc;
  const { width: w, height: h } = obj.size;
  const e = obj.elevation;
  drawBox(ctx, sx, sy, w, h, e, '#eef2f7', '#b7c3d1');

  ctx.fillStyle = '#8a99ab';
  ctx.fillRect(sx, sy + h - 8, w, 8);

  // janelas: só as que estão na tela (parede pode ter 1900px)
  const faceTop = sy + h - e;
  const step = 120;
  const first = Math.max(0, Math.floor(-sx / step));
  const last = Math.min(Math.floor(w / step), Math.ceil((viewWidth - sx) / step));
  for (let i = first; i <= last; i++) {
    const lx = 24 + i * step;
    if (lx + 70 > w - 10) break;
    ctx.fillStyle = 'rgba(110,185,230,0.6)';
    ctx.fillRect(sx + lx, faceTop + 10, 70, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(sx + lx + 8, faceTop + 32);
    ctx.lineTo(sx + lx + 26, faceTop + 10);
    ctx.lineTo(sx + lx + 38, faceTop + 10);
    ctx.lineTo(sx + lx + 20, faceTop + 32);
    ctx.fill();
  }
}

function drawGate(dc: DrawContext, gate: ProgressGate, sx: number, sy: number): void {
  const { ctx } = dc;
  const { width: w, height: h } = gate.size;
  const e = gate.elevation;
  drawBox(ctx, sx, sy, w, h, e, '#cfd8e3', '#6f7f93');

  const faceTop = sy + h - e;
  const dx = sx + 12;
  const dw = w - 24;
  const dy = faceTop + 16;
  const dh = e - 16 - 6;

  ctx.fillStyle = '#0f1f30';
  ctx.fillRect(dx, dy, dw, dh);

  const leaf = (dw / 2) * (1 - gate.openProgress);
  ctx.fillStyle = gate.unlocked ? 'rgba(120,255,190,0.45)' : 'rgba(120,200,255,0.55)';
  ctx.fillRect(dx, dy, leaf, dh);
  ctx.fillRect(dx + dw - leaf, dy, leaf, dh);
  if (leaf > 2) {
    ctx.fillStyle = gate.unlocked ? '#3ddc84' : '#ff4d4f';
    ctx.fillRect(dx + leaf - 2, dy, 2, dh);
    ctx.fillRect(dx + dw - leaf, dy, 2, dh);
  }

  // luz de status + placa
  ctx.fillStyle = gate.unlocked ? '#3ddc84' : '#ff4d4f';
  ctx.beginPath();
  ctx.arc(sx + 10, faceTop + 8, 4, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, gate.label, sx + w / 2, faceTop + 12, 'bold 11px sans-serif', '#ffb703');
}

/* ---------------- mobiliário ---------------- */

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const base = y + h;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, base - 1, w / 2 + 2, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c1663a';
  ctx.fillRect(x + 6, base - 14, w - 12, 14);
  ctx.fillStyle = '#9e4f2b';
  ctx.fillRect(x + 6, base - 14, w - 12, 3);
  ctx.fillStyle = '#2e7d32';
  for (const [cx, cy, r] of [[w / 2, -26, 12], [w / 2 - 8, -18, 9], [w / 2 + 8, -18, 9], [w / 2, -34, 8]] as const) {
    ctx.beginPath();
    ctx.arc(x + cx, base + cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#43a047';
  ctx.beginPath();
  ctx.arc(x + w / 2 - 3, base - 30, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPillar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, e: number): void {
  drawBox(ctx, x, y, w, h, e, '#f4f7fa', '#c9d3de');
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x + w * 0.7, y + h - e, w * 0.3, e);
  ctx.fillStyle = '#1e6fbf';
  ctx.fillRect(x, y + h - e + 44, w, 8);
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, e: number): void {
  drawBox(ctx, x, y, w, h, e, '#f1f4f8', '#1e6fbf');
  for (const mx of [22, w - 46]) {
    ctx.fillStyle = '#263238';
    ctx.fillRect(x + mx, y - e + 6, 24, 14);
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(x + mx + 2, y - e + 8, 20, 9);
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(x + mx + 9, y - e + 20, 6, 4);
  }
  ctx.fillStyle = '#cfe3f7';
  ctx.fillRect(x + w / 2 - 34, y - e + 26, 68, 6);
  text(ctx, 'CHECK-IN', x + w / 2, y + h - e / 2 + 4, 'bold 12px sans-serif', '#ffffff');
}

function drawBench(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, e: number): void {
  drawBox(ctx, x, y, w, h, e, '#78909c', '#455a64');
  ctx.fillStyle = '#1f3a4d';
  ctx.fillRect(x, y + h - 14, w, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  for (let i = 1; i < 4; i++) ctx.fillRect(x + (w / 4) * i - 1, y + h - e, 2, e - 14);
}

const LUGGAGE_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa'] as const;

function drawLuggage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, e: number, variant: number): void {
  const color = LUGGAGE_COLORS[variant % LUGGAGE_COLORS.length] ?? '#e53935';
  drawBox(ctx, x, y, w, h, e, shade(color, 0.12), color);
  ctx.fillStyle = '#1b1b1b';
  ctx.fillRect(x + w / 2 - 6, y - e - 3, 12, 3);
  ctx.fillRect(x + 4, y + h - 3, 5, 3);
  ctx.fillRect(x + w - 9, y + h - 3, 5, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x, y + h - e / 2, w, 2);
}

function drawScanner(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, e: number): void {
  drawBox(ctx, x, y, w, h, e, '#78909c', '#37474f');
  ctx.fillStyle = '#263238';
  ctx.fillRect(x + 6, y - e + 18, w - 12, 14);
  ctx.fillStyle = '#455a64';
  for (let rx = x + 10; rx < x + w - 10; rx += 10) ctx.fillRect(rx, y - e + 18, 2, 14);
  ctx.fillStyle = '#0d1418';
  ctx.fillRect(x + w * 0.2, y + h - e + 8, w * 0.6, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let fx = x + w * 0.2 + 6; fx < x + w * 0.8 - 4; fx += 8) ctx.fillRect(fx, y + h - e + 8, 3, 26);
  ctx.fillStyle = '#ffb703';
  ctx.fillRect(x + w - 16, y + h - e + 4, 8, 3);
}

const BOARD_TEXT: readonly (readonly [string, string, string])[] = [
  ['PARTIDAS', 'GRU 14:20  no horário', 'REC 15:05  embarcando'],
  ['SEGURANÇA', 'Líquidos: até 100 ml', 'Tire o notebook da mochila'],
  ['EMBARQUE', 'Portão 07 aberto', 'Tenha o cartão à mão'],
];

function drawBoard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, e: number, variant: number): void {
  const faceTop = y + h - e;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 6, y + h - 2, w - 6, 5);
  ctx.fillStyle = '#37474f';
  ctx.fillRect(x + 12, faceTop + 50, 5, e - 50);
  ctx.fillRect(x + w - 17, faceTop + 50, 5, e - 50);
  ctx.fillStyle = '#0b1b2b';
  roundedRect(ctx, x, faceTop, w, 52, 5);
  ctx.fill();
  ctx.strokeStyle = '#ffb703';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const [title, row1, row2] = BOARD_TEXT[variant % BOARD_TEXT.length] ?? BOARD_TEXT[0]!;
  text(ctx, title, x + w / 2, faceTop + 16, 'bold 12px sans-serif', '#ffb703');
  text(ctx, row1, x + w / 2, faceTop + 31, '9px sans-serif', '#dbe7f3');
  text(ctx, row2, x + w / 2, faceTop + 44, '9px sans-serif', '#8fa3b8');
}

function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, e: number, variant: number): void {
  const top = y - e;
  const accent = variant === 0 ? '#1976d2' : '#e53935';

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h - 2, w * 0.47, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // trem de pouso
  for (const gx of [0.2, 0.68]) {
    const cx = x + w * gx;
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(cx - 2, top + 126, 4, 32);
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(cx, y + h - 8, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // asa + motor
  ctx.fillStyle = '#b0bec5';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.38, top + 108);
  ctx.lineTo(x + w * 0.62, top + 108);
  ctx.lineTo(x + w * 0.5, top + 150);
  ctx.lineTo(x + w * 0.3, top + 150);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#90a4ae';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.44, top + 144, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // deriva
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(x + w - 120, top + 58);
  ctx.lineTo(x + w - 44, top + 2);
  ctx.lineTo(x + w - 18, top + 2);
  ctx.lineTo(x + w - 40, top + 62);
  ctx.closePath();
  ctx.fill();

  // fuselagem
  ctx.fillStyle = '#f4f6f8';
  roundedRect(ctx, x + 4, top + 50, w - 8, 82, 40);
  ctx.fill();
  ctx.strokeStyle = '#b0bec5';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.fillRect(x + 46, top + 108, w - 100, 8);

  // cabine e janelas
  ctx.fillStyle = '#2b3d4d';
  ctx.beginPath();
  ctx.moveTo(x + 30, top + 74);
  ctx.lineTo(x + 66, top + 72);
  ctx.lineTo(x + 62, top + 86);
  ctx.lineTo(x + 24, top + 86);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5d7b96';
  for (let wx = x + 100; wx < x + w - 110; wx += 34) {
    ctx.beginPath();
    ctx.arc(wx, top + 84, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // porta
  ctx.strokeStyle = '#90a4ae';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 300, top + 66, 34, 58);
}

function drawMat(dc: DrawContext, x: number, y: number, w: number, h: number): void {
  const { ctx, time } = dc;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.fillStyle = `rgba(255,183,3,${0.22 + 0.22 * pulse})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#ffb703';
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 8]);
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.setLineDash([]);
  text(ctx, 'EMBARQUE', x + w / 2, y + h / 2 + 5, 'bold 14px sans-serif', '#ffe08a');
}
