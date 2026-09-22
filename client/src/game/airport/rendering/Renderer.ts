import { FLOOR_TILE } from '../config';
import { getBounds, getColliderRect } from '../core/Collision';
import type { Camera } from '../core/Camera';
import type { GameObject, Zone } from '../types';
import { isNPC } from '../types';
import type { World } from '../world/World';
import { drawGameObject } from './sprites';

/** Camada 'ground' primeiro; dentro da camada 'sorted', menor (y + height) = mais ao fundo. */
const byDepth = (a: GameObject, b: GameObject): number => {
  const la = a.layer === 'ground' ? 0 : 1;
  const lb = b.layer === 'ground' ? 0 : 1;
  if (la !== lb) return la - lb;
  return a.position.y + a.size.height - (b.position.y + b.size.height);
};

/** Renderiza apenas o jogo. Toda a UI textual vive no DOM (UIManager). */
export class Renderer {
  debug = false;

  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private viewWidth = 0;
  private viewHeight = 0;
  /** Array dinâmico reutilizado a cada frame (evita alocações). */
  private readonly visible: GameObject[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D não suportado neste navegador.');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.dpr = window.devicePixelRatio || 1;
    this.viewWidth = width;
    this.viewHeight = height;
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  /**
   * CULLING: mantém apenas objetos cuja caixa visual (pegada + elevação)
   * intersecta o viewport. O resultado também é usado pelo Game para
   * decidir quem recebe `update()`.
   */
  cull(objects: readonly GameObject[], camera: Camera): GameObject[] {
    this.visible.length = 0;
    for (const o of objects) {
      if (camera.intersects(getBounds(o))) this.visible.push(o);
    }
    return this.visible;
  }

  render(world: World, camera: Camera, visible: GameObject[], time: number): void {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0b1b2b';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    this.drawFloor(world.zones, camera);

    // Y-SORTING: ordena os visíveis do fundo (menor y + height) para a frente.
    visible.sort(byDepth);

    const dc = { ctx, time, viewWidth: this.viewWidth };
    for (const o of visible) {
      drawGameObject(dc, o, Math.round(o.position.x - camera.x), Math.round(o.position.y - camera.y));
    }

    if (this.debug) this.drawDebug(visible, camera);
  }

  private drawFloor(zones: readonly Zone[], camera: Camera): void {
    const { ctx } = this;
    const vp = camera.viewport;

    for (const z of zones) {
      const x0 = Math.max(z.rect.x, vp.x);
      const y0 = Math.max(z.rect.y, vp.y);
      const x1 = Math.min(z.rect.x + z.rect.width, vp.x + vp.width);
      const y1 = Math.min(z.rect.y + z.rect.height, vp.y + vp.height);
      if (x0 >= x1 || y0 >= y1) continue; // zona fora da tela

      ctx.fillStyle = z.colors[0];
      ctx.fillRect(x0 - vp.x, y0 - vp.y, x1 - x0, y1 - y0);

      ctx.fillStyle = z.colors[1];
      const rowStart = Math.floor(y0 / FLOOR_TILE);
      const rowEnd = Math.ceil(y1 / FLOOR_TILE);
      const colStart = Math.floor(x0 / FLOOR_TILE);
      const colEnd = Math.ceil(x1 / FLOOR_TILE);
      for (let row = rowStart; row < rowEnd; row++) {
        for (let col = colStart; col < colEnd; col++) {
          if ((row + col) % 2 === 0) continue;
          const tx = Math.max(col * FLOOR_TILE, x0);
          const ty = Math.max(row * FLOOR_TILE, y0);
          const tw = Math.min((col + 1) * FLOOR_TILE, x1) - tx;
          const th = Math.min((row + 1) * FLOOR_TILE, y1) - ty;
          ctx.fillRect(tx - vp.x, ty - vp.y, tw, th);
        }
      }

      if (z.pattern === 'asphalt') {
        // linha de taxiamento tracejada (só os traços visíveis)
        ctx.fillStyle = 'rgba(255,214,102,0.55)';
        for (let lx = Math.floor(x0 / 60) * 60; lx < x1; lx += 60) {
          ctx.fillRect(lx - vp.x, 300 - vp.y, 30, 4);
        }
      }
    }
  }

  private drawDebug(visible: readonly GameObject[], camera: Camera): void {
    const { ctx } = this;
    ctx.lineWidth = 1;
    for (const o of visible) {
      const box = getColliderRect(o);
      if (box) {
        ctx.strokeStyle = '#00e676';
        ctx.strokeRect(Math.round(box.x - camera.x) + 0.5, Math.round(box.y - camera.y) + 0.5, box.width, box.height);
      }
      if (isNPC(o)) {
        ctx.strokeStyle = '#ffb703';
        ctx.beginPath();
        ctx.arc(o.position.x + o.size.width / 2 - camera.x, o.position.y + o.size.height / 2 - camera.y, o.trigger.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}
