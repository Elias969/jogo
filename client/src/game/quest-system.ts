import { distanceTo } from "./collision";
import type { Collider, Player, Quest, Rect } from "./types";
export class QuestSystem {
  private readonly quests: Quest[]; private active: Quest | null = null;
  constructor(quests: Quest[]) { this.quests = quests; }
  get current(): Quest | null { return this.active; }
  tryTrigger(player: Player, npc: Rect): Quest | null { const quest = this.quests.find(q => !q.completed && q.stage === this.stage); if (quest && distanceTo({ ...player.position, width: player.size.x, height: player.size.y }, npc) <= quest.triggerRadius) { this.active = quest; return quest; } return null; }
  stage: Quest["stage"] = "santiago";
  setStage(stage: Quest["stage"]) { this.stage = stage; this.active = null; }
  answer(index: number, colliders: Collider[]): { correct: boolean; quest: Quest | null } { if (!this.active) return { correct: false, quest: null }; const quest = this.active; if (index !== quest.correct) return { correct: false, quest }; quest.completed = true; const gate = colliders.find(c => c.id === quest.gateId); if (gate) gate.solid = false; this.active = null; return { correct: true, quest }; }
}
