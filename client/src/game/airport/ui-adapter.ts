import type { NPC, Quest } from "./types";
export interface QuestViewCallbacks { onAnswer(index: number): void; onClose(): void }
export type AirportUiState = { type: "hud"; zone?: string; objective?: string; done?: number; total?: number } | { type: "hint"; visible: boolean } | { type: "toast"; message: string } | { type: "quest"; open: boolean; npc?: NPC; quest?: Quest; feedback?: string } | { type: "victory"; open: boolean; restart?: () => void } | { type: "debug"; visible: boolean; message: string };
export const emitAirportUi = (state: AirportUiState) => window.dispatchEvent(new CustomEvent<AirportUiState>("airport-game:ui", { detail: state }));
export class UIManager {
  private callbacks: QuestViewCallbacks | null = null;
  setZone(name: string): void { emitAirportUi({ type: "hud", zone: name }); }
  updateProgress(done: number, total: number, objective: string): void { emitAirportUi({ type: "hud", done, total, objective }); }
  setHint(visible: boolean): void { emitAirportUi({ type: "hint", visible }); }
  toast(message: string, _durationMs = 3600): void { emitAirportUi({ type: "toast", message }); }
  setDebug(visible: boolean, message = ""): void { emitAirportUi({ type: "debug", visible, message }); }
  showQuest(npc: NPC, quest: Quest, callbacks: QuestViewCallbacks): void { this.callbacks = callbacks; emitAirportUi({ type: "quest", open: true, npc, quest }); }
  showWrongAnswer(_optionIndex: number, hint: string): void { emitAirportUi({ type: "quest", open: true, feedback: `Resposta incorreta. ${hint}` }); }
  hideQuest(): void { this.callbacks = null; emitAirportUi({ type: "quest", open: false }); }
  showVictory(_onRestart: () => void): void { emitAirportUi({ type: "victory", open: true }); }
  hideVictory(): void { emitAirportUi({ type: "victory", open: false }); }
  answer(index: number): void { this.callbacks?.onAnswer(index); }
  close(): void { this.callbacks?.onClose(); }
}
