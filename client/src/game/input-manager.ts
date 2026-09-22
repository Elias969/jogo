import type { Vector2D } from "./types";
export class InputManager {
  private readonly keys = new Set<string>();
  constructor() { window.addEventListener("keydown", this.onKey); window.addEventListener("keyup", this.onKey); }
  private onKey = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(key)) { event.preventDefault(); event.type === "keydown" ? this.keys.add(key) : this.keys.delete(key); } };
  get direction(): Vector2D { return { x: Number(this.keys.has("d") || this.keys.has("arrowright")) - Number(this.keys.has("a") || this.keys.has("arrowleft")), y: Number(this.keys.has("s") || this.keys.has("arrowdown")) - Number(this.keys.has("w") || this.keys.has("arrowup")) }; }
  dispose() { window.removeEventListener("keydown", this.onKey); window.removeEventListener("keyup", this.onKey); }
}
