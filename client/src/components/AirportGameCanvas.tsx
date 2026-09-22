import { useEffect, useRef, useState } from "react";
import { Game } from "@/game/airport/Game";
import type { NPC, Quest } from "@/game/airport/types";
import type { AirportUiState } from "@/game/airport/ui-adapter";

type HudState = Extract<AirportUiState, { type: "hud" }>;
const initial: HudState = { type: "hud", zone: "Saguão de check-in", objective: "Explore o aeroporto e encontre o primeiro atendente.", done: 0, total: 3 };
const profile = "/manus-storage/catalina-profile_f0381987.png";
export default function AirportGameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState(initial);
  const [hint, setHint] = useState(false);
  const [toast, setToast] = useState("");
  const [quest, setQuest] = useState<{ npc: NPC; data: Quest; feedback?: string } | null>(null);
  const [victory, setVictory] = useState<(() => void) | null>(null);
  useEffect(() => { const onUi = (event: Event) => { const detail = (event as CustomEvent<AirportUiState>).detail; if (detail.type === "hud") setHud((old) => ({ ...old, ...detail })); if (detail.type === "hint") setHint(detail.visible); if (detail.type === "toast") { setToast(detail.message); window.setTimeout(() => setToast(""), 3600); } if (detail.type === "quest") { if (!detail.open) setQuest(null); else if (detail.npc && detail.quest) setQuest({ npc: detail.npc, data: detail.quest }); else if (detail.feedback) setQuest((old) => old ? { ...old, feedback: detail.feedback } : old); } if (detail.type === "victory") setVictory(detail.open ? detail.restart || (() => undefined) : null); }; window.addEventListener("airport-game:ui", onUi); return () => window.removeEventListener("airport-game:ui", onUi); }, []);
  useEffect(() => { const canvas = canvasRef.current; if (!canvas) return; const game = new Game(canvas); gameRef.current = game; game.start(); return () => { gameRef.current = null; }; }, []);
  const answer = (index: number) => window.dispatchEvent(new CustomEvent("airport-game:answer", { detail: index }));
  const closeQuest = () => window.dispatchEvent(new CustomEvent("airport-game:close-quest"));
  return <main className="airport-shell"><canvas ref={canvasRef} className="airport-canvas" aria-label="Mapa top-down do aeroporto" /><header className="airport-topbar"><div><span className="airport-kicker">EL ENCUENTRO · PORTÃO DE EMBARQUE</span><h1>Diário de viagem</h1></div><aside className="airport-profile"><img src={profile} alt="Catalina" /><div><b>CATALINA</b><span>Chile → Brasil</span></div><strong>♥</strong></aside></header><section className="airport-hud"><span>{hud.zone}</span><b>{hud.objective}</b><div className="airport-progress"><i style={{ width: `${hud.total ? ((hud.done || 0) / hud.total) * 100 : 0}%` }} /></div><small>{hud.done || 0} de {hud.total || 3} portões liberados · WASD/setas mover · E falar · F3 debug</small></section>{hint && <div className="airport-hint">Pressione <b>E</b> para conversar</div>}{toast && <div className="airport-toast">{toast}</div>}{quest && <div className="airport-modal"><section className="airport-quest"><button className="airport-close" onClick={closeQuest}>×</button><div className="airport-npc"><span>✦</span><div><small>{quest.data.title}</small><h2>{quest.npc.name}</h2><p>{quest.npc.role}</p></div></div><p className="airport-intro">{quest.data.intro}</p><h3>{quest.data.question}</h3><ol>{quest.data.options.map((option, index) => <li key={option}><button onClick={() => answer(index)}><b>{index + 1}</b>{option}</button></li>)}</ol>{quest.feedback && <div className="airport-feedback">{quest.feedback}</div>}<small className="airport-foot">Escolha uma resposta ou use as teclas 1 a 4 · Esc fecha</small></section></div>}{victory && <div className="airport-modal"><section className="airport-quest airport-victory"><span className="airport-kicker">DESTINO ALCANÇADO</span><h2>Embarque autorizado</h2><p>Você passou pelo check-in, pela segurança e pelo portão. Catalina está esperando na pista.</p><button onClick={victory}>JOGAR NOVAMENTE</button></section></div>}</main>;
}
