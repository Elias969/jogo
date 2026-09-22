import { useEffect, useRef, useState } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameHandle, type GameState } from "@/game/scene";

const initial: GameState = { stage: "title", stageIndex: 0, title: "El Encuentro", subtitle: "Uma jornada do Chile ao Brasil", prompt: "", npc: "", dialogOpen: false, choices: [], correct: 0, answered: false, message: "Aperte ESPAÇO para começar sua jornada.", direction: "right" };
const profile = "/manus-storage/catalina-profile_f0381987.png";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null); const startedRef = useRef(false); const [state, setState] = useState<GameState>(initial);
  useEffect(() => { const onState = (event: Event) => setState((event as CustomEvent<GameState>).detail); window.addEventListener("el-encuentro:state", onState); return () => window.removeEventListener("el-encuentro:state", onState); }, []);
  useEffect(() => { const canvas = canvasRef.current; if (!canvas || startedRef.current) return; startedRef.current = true; const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true }); let handle: GameHandle | null = null; createGameScene(engine, canvas).then(h => { handle = h; engine.runRenderLoop(() => h.scene.render()); }); const resize = () => engine.resize(); window.addEventListener("resize", resize); return () => { window.removeEventListener("resize", resize); handle?.dispose(); engine.dispose(); startedRef.current = false; }; }, []);
  const answer = (index: number) => window.dispatchEvent(new CustomEvent("el-encuentro:answer", { detail: index }));
  const interact = () => window.dispatchEvent(new Event("el-encuentro:interact"));
  return <main className={`game-shell stage-${state.stage}`}>
    <canvas ref={canvasRef} className="game-canvas" style={{ touchAction: "none" }} />
    <div className="scanlines" />
    <header className="topbar"><div><span className="eyebrow">A JOURNEY BUILT WITH LOVE</span><h1>{state.title}</h1></div><div className="progress"><span>{String(state.stageIndex).padStart(2, "0")}</span><i /><span>04</span></div></header>
    {state.stage !== "title" && <aside className="profile-card"><img src={profile} alt="Catalina" /><div><b>CATALINA</b><span>Chile → Brasil</span></div><div className="heart-badge">♥</div></aside>}
    <section className="mission"><span className="mission-label">MISSÃO ATUAL</span><strong>{state.stage === "title" ? "O amor atravessa fronteiras" : state.stage === "reunion" ? "Reencontro desbloqueado" : state.message}</strong><small>WASD para andar · E ou ESPAÇO para interagir</small></section>
    {state.stage === "title" && <section className="title-card"><div className="route-line"><span>✦ SCL</span><b>✈</b><span>GRU ✦</span></div><h2>El Encuentro</h2><p>Olá, mi amor! Preparei uma pequena surpresa para você. Eu sei que a distância é difícil, mas nada pode nos separar.</p><p>Para me encontrar no aeroporto, você precisará provar que me conhece bem…</p><button onClick={interact}>COMEÇAR A JORNADA <span>SPACE</span></button></section>}
    {state.stage === "reunion" && <section className="reunion-card"><span className="eyebrow">DESTINO ALCANÇADO</span><h2>Você conseguiu, meu amor!</h2><p>Eu sabia que você viria. A distância acabou.</p><div className="dialog-bubble"><b>SEU NOME</b><br />Te amo!<br /><br /><b>CATALINA</b><br />Te amo mais! ♥</div><small>Obrigado por jogar! Nos vemos na vida real em breve.</small></section>}
    {state.dialogOpen && <div className="dialog-backdrop"><section className="dialog"><div className="dialog-head"><span className="npc-dot" /><div><span className="eyebrow">{state.npc}</span><h2>Uma pergunta para atravessar</h2></div><button className="close" onClick={interact}>×</button></div><p className="prompt">{state.prompt}</p><div className="choices">{state.choices.map((choice, i) => <button key={choice} onClick={() => answer(i)} className="choice"><span>{String.fromCharCode(65 + i)}</span>{choice.replace(/^[A-C]\) /, "")}</button>)}</div><small>Se errar, você pode tentar novamente.</small></section></div>}
    {state.stage !== "title" && state.stage !== "reunion" && <button className="interact-button" onClick={interact}>E<br /><small>INTERAGIR</small></button>}
  </main>;
}
