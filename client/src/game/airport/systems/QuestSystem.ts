import type { AnswerResult, Quest } from '../types';

type CompletedListener = (quest: Quest) => void;

/** Regras das quests: estado, validação de respostas e eventos de conclusão. */
export class QuestSystem {
  private readonly quests = new Map<string, Quest>();
  private readonly listeners = new Set<CompletedListener>();

  constructor(quests: readonly Quest[]) {
    for (const q of quests) this.quests.set(q.id, q);
  }

  get(id: string): Quest | undefined {
    return this.quests.get(id);
  }

  get all(): readonly Quest[] {
    return Array.from(this.quests.values());
  }

  get total(): number {
    return this.quests.size;
  }

  get completedCount(): number {
    return this.all.filter((q) => q.status === 'completed').length;
  }

  get nextPending(): Quest | undefined {
    return this.all.find((q) => q.status === 'pending');
  }

  /** Registra um listener; retorna a função para cancelar. */
  onCompleted(listener: CompletedListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  submitAnswer(questId: string, optionIndex: number): AnswerResult {
    const quest = this.quests.get(questId);
    if (!quest) throw new Error(`Quest desconhecida: ${questId}`);

    if (quest.status === 'completed') return { correct: true, quest };

    quest.attempts += 1;
    const correct = optionIndex === quest.correctIndex;
    if (correct) {
      quest.status = 'completed';
      this.listeners.forEach((listener) => listener(quest));
    }
    return { correct, quest };
  }
}
