import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

export type Direction = "up" | "down" | "left" | "right";
export type Stage = "title" | "santiago" | "connection" | "brazil" | "reunion";
export interface Vector2D { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }
export interface Collider { id: string; rect: Rect; solid: boolean; kind: "wall" | "gate" | "npc" }
export interface GameObject { id: string; position: Vector2D; size: Vector2D; z: number; visible: boolean; mesh?: AbstractMesh; collider?: Collider }
export interface Player extends GameObject { speed: number; direction: Direction }
export interface Quest { id: string; stage: Exclude<Stage, "title" | "reunion">; npcName: string; triggerRadius: number; prompt: string; choices: string[]; correct: number; gateId: string; completed: boolean }
export interface GameState { stage: Stage; stageIndex: number; title: string; subtitle: string; prompt: string; npc: string; dialogOpen: boolean; choices: string[]; correct: number; answered: boolean; message: string; direction: Direction }
export const MAP_SIZE = 2000;
export const VIEWPORT = { width: 1280, height: 720 } as const;
export const rectFor = (o: GameObject): Rect => ({ x: o.position.x, y: o.position.y, width: o.size.x, height: o.size.y });
