import type { Scene } from "@babylonjs/core/scene";
import type { Camera } from "./camera";
import type { GameObject } from "./types";
import { rectFor } from "./types";
export class Renderer {
  private readonly objects: GameObject[] = [];
  private visibleObjects: GameObject[] = [];
  constructor(private readonly scene: Scene) {}
  add(object: GameObject) { this.objects.push(object); }
  remove(id: string) { const index = this.objects.findIndex(o => o.id === id); if (index >= 0) this.objects.splice(index, 1); }
  update(camera: Camera) { this.visibleObjects = this.objects.filter(object => object.visible && camera.visible(rectFor(object))); this.visibleObjects.sort((a, b) => (a.position.y + a.size.y) - (b.position.y + b.size.y)); for (const object of this.objects) { const visible = this.visibleObjects.includes(object); if (object.mesh) { object.mesh.isVisible = visible; if (visible) { const screen = camera.worldToScreen(object.position); object.mesh.position.x = screen.x + object.size.x / 2; object.mesh.position.y = screen.y + object.size.y / 2; object.mesh.position.z = object.z; } } } }
  getVisibleObjects(): readonly GameObject[] { return this.visibleObjects; }
  dispose() { for (const object of this.objects) object.mesh?.dispose(); this.objects.length = 0; this.visibleObjects = []; }
}
