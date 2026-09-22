import { MAP_SIZE, type Rect, type Vector2D } from "./types";
export class Camera {
  readonly viewport: Rect;
  offset: Vector2D = { x: 0, y: 0 };
  constructor(width: number, height: number) { this.viewport = { x: 0, y: 0, width, height }; }
  follow(target: Vector2D, targetSize: Vector2D) { this.offset.x = Math.max(0, Math.min(MAP_SIZE - this.viewport.width, target.x + targetSize.x / 2 - this.viewport.width / 2)); this.offset.y = Math.max(0, Math.min(MAP_SIZE - this.viewport.height, target.y + targetSize.y / 2 - this.viewport.height / 2)); }
  worldToScreen(point: Vector2D): Vector2D { return { x: point.x - this.offset.x, y: point.y - this.offset.y }; }
  visible(rect: Rect): boolean { return rect.x + rect.width >= this.offset.x && rect.x <= this.offset.x + this.viewport.width && rect.y + rect.height >= this.offset.y && rect.y <= this.offset.y + this.viewport.height; }
}
