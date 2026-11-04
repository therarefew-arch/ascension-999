// 🧶 Crafting's minigames: the Workbench (Steady Hands), The Loom (v0.0.2.16, replaced Joinery) and Tinker's Tray.
// The Loom: draw a thread from each spool to its partner; threads can't cross; fill every cell. Rules in core/loom.ts.
import { useEffect, useRef, useState } from 'react';
import { minigameXpScale } from '../core/rates';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import type { ActionDef } from '../data/skills';
import { lockedReason } from '../core/idle';
import { adjacent, joined, loomDone, loomSpec, loomXp, MAX_LOOM_LEVEL, newLoom, pegAt, YARN, YARN_NAMES } from '../core/loom';
import { game, useGame } from '../core/store';
import { useOwnFullScreen } from './MinigameFrame';
import { UiIcon } from './icons';
import { FeedbackLayer, useFeedback } from './Minigames';
import { SteadyHands } from './Minigames2';
import { TinkersTray } from './TinkersTray';
import { useNoScroll } from './useNoScroll';

const CELL = 100;

function TheLoom({ action }: { action: ActionDef }) {
  useOwnFullScreen(); // has its own ⛶ (the skill screen's frame hides its button)
  const { player } = useGame();
  const { items, push } = useFeedback();
  const level = Math.min(MAX_LOOM_LEVEL, player.loomLevel ?? 1);
  const [deal, setDeal] = useState(() => ({ level, loom: newLoom(level) }));
  const loom = deal.loom;
  const n = loom.n;
  const [paths, setPaths] = useState<number[][]>(() => loom.pegs.map(() => []));
  const [drawing, setDrawing] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [hints, setHints] = useState(() => loomSpec(level).hints);
  const [full, setFull] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const board = useRef<HTMLDivElement>(null);
  useNoScroll(board);
  const blocked = lockedReason(player, action);
  // Live copy for the pointer handlers (several moves can arrive before React re-renders).
  const live = useRef(paths);
  live.current = paths;

  // A calm tune while you weave; the town's song comes back when you leave.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_kitchen');
    return () => sound.playMusic(musicFor(town));
  }, [town]);

  // ⛶ Full screen — same as Spellcards (no remount, so a loom in progress is kept).
  useEffect(() => {
    if (!full) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let wasFs = !!document.fullscreenElement;
    const off = () => { if (document.fullscreenElement) wasFs = true; else if (wasFs) setFull(false); };
    document.addEventListener('fullscreenchange', off);
    return () => { document.body.style.overflow = before; document.removeEventListener('fullscreenchange', off); };
  }, [full]);
  useEffect(() => () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); }, []);
  const toggleFull = () => {
    sound.play('click');
    if (full) { setFull(false); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); return; }
    setFull(true);
    try { document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {}); } catch { /* the overlay still covers the screen */ }
  };

  const owner = (ps: number[][], cell: number) => ps.findIndex((p) => p.includes(cell));

  /** Puts the threads down; checks for a finished loom. */
  const commit = (next: number[][], colour: number | null, was?: boolean) => {
    live.current = next;
    setPaths(next);
    if (colour !== null && !was && joined(loom, colour, next[colour])) {
      sound.play('match', { rate: 1 + colour * 0.04, volume: 0.7 });
      sound.play('clack', { rate: 1.3, volume: 0.4 });
      game.vibrate(12);
    }
    if (loomDone(loom, next)) win();
  };

  const win = () => {
    if (done) return;
    setDone(true);
    setDrawing(null);
    const xp = loomXp(deal.level, action.xp);
    game.minigameXp(action.id, xp, 60);
    if (deal.level >= level) game.loomLevelUp();
    window.setTimeout(() => sound.play('levelup', { volume: 0.7 }), 200);
    game.vibrate(35);
    push(`Woven! Level ${deal.level} done · +${xp.toLocaleString()} Crafting XP`, 'combo');
  };

  /** One step of a thread into `cell` (it must be next to the thread's end). */
  const step = (ps: number[][], colour: number, cell: number): number[][] | null => {
    const path = ps[colour];
    const last = path[path.length - 1];
    if (last === undefined || !adjacent(n, last, cell)) return null;
    // Going back over your own thread rolls it back.
    const back = path.indexOf(cell);
    if (back >= 0) { sound.play('tick', { rate: 0.8, volume: 0.25 }); return ps.map((p, i) => (i === colour ? p.slice(0, back + 1) : p)); }
    if (joined(loom, colour, path)) return null; // already reached its partner
    const peg = pegAt(loom, cell);
    if (peg >= 0 && peg !== colour) return null; // another colour's spool
    const next = ps.map((p) => [...p]);
    // Crossing another thread cuts it there.
    const other = owner(next, cell);
    if (other >= 0 && other !== colour) {
      next[other] = next[other].slice(0, next[other].indexOf(cell));
      sound.play('whoosh', { rate: 1.6, volume: 0.3 });
    }
    next[colour] = [...path, cell];
    sound.play('tick', { rate: Math.min(2.2, 0.9 + next[colour].length * 0.06), volume: 0.4 });
    return next;
  };

  const cellAt = (e: React.PointerEvent): number | null => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return null;
    const x = Math.floor(((e.clientX - r.left) / r.width) * n);
    const y = Math.floor(((e.clientY - r.top) / r.height) * n);
    if (x < 0 || y < 0 || x >= n || y >= n) return null;
    return y * n + x;
  };

  const down = (e: React.PointerEvent) => {
    if (done) return;
    if (blocked) { sound.play('error', { volume: 0.4 }); push(blocked, 'info'); return; }
    const cell = cellAt(e);
    if (cell === null) return;
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); } catch { /* fine without it */ }
    const ps = live.current;
    const peg = pegAt(loom, cell);
    if (peg >= 0) {
      // Start this colour again from the spool you touched.
      const next = ps.map((p, i) => (i === peg ? [cell] : p));
      // If another thread ran over this spool (it can't), nothing else to do.
      setDrawing(peg);
      sound.play('slide', { rate: 1.3, volume: 0.5 });
      commit(next, null);
      return;
    }
    const o = owner(ps, cell);
    if (o >= 0) {
      // Pick a thread up from the middle: keep it up to here and carry on.
      setDrawing(o);
      sound.play('slide', { rate: 1.1, volume: 0.4 });
      commit(ps.map((p, i) => (i === o ? p.slice(0, p.indexOf(cell) + 1) : p)), null);
    }
  };

  const move = (e: React.PointerEvent) => {
    if (drawing === null || done) return;
    const target = cellAt(e);
    if (target === null) return;
    let ps = live.current;
    const was = joined(loom, drawing, ps[drawing]);
    // Fast swipes skip cells — walk there one step at a time.
    for (let guard = 0; guard < n * 2; guard++) {
      const path = ps[drawing];
      const last = path[path.length - 1];
      if (last === undefined || last === target) break;
      const lr = Math.floor(last / n), lc = last % n, tr = Math.floor(target / n), tc = target % n;
      const dr = Math.sign(tr - lr), dc = Math.sign(tc - lc);
      const nextCell = Math.abs(tr - lr) >= Math.abs(tc - lc) ? last + dr * n : last + dc;
      const res = step(ps, drawing, nextCell);
      if (!res) break;
      ps = res;
    }
    if (ps !== live.current) commit(ps, drawing, was);
  };

  const up = () => { setDrawing(null); };

  const fresh = () => {
    const L = Math.min(MAX_LOOM_LEVEL, player.loomLevel ?? 1);
    const l = newLoom(L);
    setDeal({ level: L, loom: l });
    setPaths(l.pegs.map(() => []));
    live.current = l.pegs.map(() => []);
    setDone(false); setDrawing(null); setHints(loomSpec(L).hints);
    sound.play('riffle', { rate: 0.8, volume: 0.5 });
  };

  const hint = () => {
    if (done || hints <= 0 || blocked) { sound.play('error', { volume: 0.4 }); return; }
    // Lay one unfinished thread exactly as the pattern has it (clearing anything in its way).
    const ps = live.current;
    const c = loom.solution.findIndex((s, i) => !(joined(loom, i, ps[i]) && ps[i].length === s.length && ps[i].every((x, k) => x === s[k] || x === s[s.length - 1 - k])));
    if (c < 0) return;
    const route = loom.solution[c];
    const next = ps.map((p, i) => {
      if (i === c) return [...route];
      const cut = p.findIndex((x) => route.includes(x));
      return cut >= 0 ? p.slice(0, cut) : p;
    });
    setHints((h) => h - 1);
    sound.play('rune', { volume: 0.6 });
    commit(next, c);
  };

  const clearAll = () => {
    if (done) return;
    commit(loom.pegs.map(() => []), null);
    sound.play('whoosh', { rate: 0.8, volume: 0.5 });
  };

  const filled = paths.reduce((a, p) => a + p.length, 0);
  const joinedCount = loom.pegs.filter((_, c) => joined(loom, c, paths[c])).length;
  const centre = (cell: number) => [(cell % n) * CELL + CELL / 2, Math.floor(cell / n) * CELL + CELL / 2];

  return (
    <div className={`mg lm-root ${full ? 'lm-full' : ''}`}>
      <div className="lm-head">
        <span className="lm-level"><span className="lm-level-k">LEVEL</span> <b className="mono">{deal.level}</b><span className="lm-level-of mono">/{MAX_LOOM_LEVEL}</span></span>
        <span className="lm-stat small mono">🧵 {joinedCount}/{loom.pegs.length} · ▦ {Math.round((filled / (n * n)) * 100)}%</span>
        <button className="lm-full-btn" onClick={toggleFull} aria-label={full ? 'Leave full screen' : 'Full screen'}>{full ? '✕' : '⛶'}</button>
      </div>
      {blocked && <div className="lm-blocked">🔒 {blocked}</div>}
      <div className="lm-frame" ref={board}>
        <svg ref={svg} className={`lm-board ${done ? 'done' : ''}`} viewBox={`0 0 ${n * CELL} ${n * CELL}`}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="application" aria-label={`Loom, ${n} by ${n}`}>
          <defs>
            <pattern id="lm-warp" width={CELL / 4} height={CELL} patternUnits="userSpaceOnUse">
              <rect width={CELL / 4} height={CELL} fill="#e9dcc0" />
              <line x1={CELL / 8} y1="0" x2={CELL / 8} y2={CELL} stroke="#cdb991" strokeWidth="3" />
            </pattern>
          </defs>
          <rect width={n * CELL} height={n * CELL} fill="url(#lm-warp)" />
          {/* faint cell lines */}
          {Array.from({ length: n - 1 }, (_, i) => (
            <g key={i} stroke="rgba(110, 80, 40, 0.18)" strokeWidth="2">
              <line x1={(i + 1) * CELL} y1="0" x2={(i + 1) * CELL} y2={n * CELL} />
              <line x1="0" y1={(i + 1) * CELL} x2={n * CELL} y2={(i + 1) * CELL} />
            </g>
          ))}
          {/* a soft tint under each thread's cells */}
          {paths.map((p, c) => p.map((cell) => {
            const [x, y] = centre(cell);
            return <rect key={`t${c}-${cell}`} x={x - CELL / 2 + 3} y={y - CELL / 2 + 3} width={CELL - 6} height={CELL - 6} rx="12" fill={YARN[c]} opacity="0.16" />;
          }))}
          {/* the threads: a thick yarn line with a twisted highlight */}
          {paths.map((p, c) => {
            if (p.length < 2) return null;
            const pts = p.map((cell) => centre(cell).join(',')).join(' ');
            const ok = joined(loom, c, p);
            return (
              <g key={`p${c}`} className={ok ? 'lm-thread ok' : 'lm-thread'}>
                <polyline points={pts} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth={CELL * 0.36} strokeLinecap="round" strokeLinejoin="round" transform="translate(3 5)" />
                <polyline points={pts} fill="none" stroke={YARN[c]} strokeWidth={CELL * 0.34} strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={pts} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={CELL * 0.09} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14 18" />
              </g>
            );
          })}
          {/* the spools */}
          {loom.pegs.map(([a, b], c) => [a, b].map((cell) => {
            const [x, y] = centre(cell);
            const ok = joined(loom, c, paths[c]);
            return (
              <g key={`s${c}-${cell}`} className={`lm-spool ${ok ? 'ok' : ''} ${drawing === c ? 'active' : ''}`}>
                <circle cx={x} cy={y + 4} r={CELL * 0.36} fill="rgba(0,0,0,0.3)" />
                <circle cx={x} cy={y} r={CELL * 0.36} fill="#8a5a32" stroke="#4a2e17" strokeWidth="4" />
                <circle cx={x} cy={y} r={CELL * 0.28} fill={YARN[c]} />
                <circle cx={x} cy={y} r={CELL * 0.2} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="3" />
                <circle cx={x} cy={y} r={CELL * 0.11} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="3" />
                <circle cx={x} cy={y} r={CELL * 0.07} fill="#4a2e17" />
                <circle cx={x - CELL * 0.1} cy={y - CELL * 0.12} r={CELL * 0.05} fill="rgba(255,255,255,0.55)" />
              </g>
            );
          }))}
        </svg>
        {done && (
          <div className="lm-done">
            <span className="lm-done-big">🧶 Level {deal.level} woven!</span>
            <span className="small">{deal.level >= MAX_LOOM_LEVEL ? 'You wove every loom there is. Play on for XP!' : `Next up: level ${Math.min(MAX_LOOM_LEVEL, deal.level + 1)}`}</span>
            <button className="btn btn-hero" onClick={fresh}>Next loom ▸</button>
          </div>
        )}
        <FeedbackLayer items={items} />
      </div>
      <div className="lm-tools">
        <button className="lm-tool" onClick={hint} disabled={hints <= 0 || done} aria-label={`Hint (${hints} left)`}>💡<span className="lm-tool-n mono">{hints}</span></button>
        <button className="lm-tool" onClick={clearAll} disabled={done || filled === 0} aria-label="Clear all threads">🧹</button>
        <button className="lm-tool" onClick={fresh} aria-label="A different loom">🔄</button>
      </div>
      {!full && (
        <div className="mg-panel">
          <div className="mg-row">
            <span className="mg-label">The Loom</span>
            <span className="mg-hint">{blocked ?? 'Join each pair of spools — fill every cell'}</span>
          </div>
          <p className="mg-foot">
            Drag from a spool to its partner of the same colour. Threads can't cross — drawing over one cuts it.
            Fill the <b>whole</b> loom to finish it: <b>{Math.round(loomXp(deal.level, action.xp) * minigameXpScale(player, action)).toLocaleString()} Crafting XP</b>, and the next level is a bigger loom
            with longer threads (up to {MAX_LOOM_LEVEL}). Tap 💡 to lay one thread for you. Colours: {YARN_NAMES.slice(0, loom.pegs.length).join(', ')}.
          </p>
        </div>
      )}
    </div>
  );
}

type CraftMode = 'bench' | 'loom' | 'tray';
/** Remembered while the app is open, so Crafting reopens on the game you were playing. */
let lastCraftMode: CraftMode = 'bench';

export function CraftingGames({ action }: { action: ActionDef }) {
  const [mode, setModeState] = useState<CraftMode>(lastCraftMode);
  const setMode = (m: CraftMode) => { lastCraftMode = m; setModeState(m); };
  return (
    <>
      <div className="tab-row small-tabs">
        <button className={`tab-pill ${mode === 'bench' ? 'on' : ''}`} onClick={() => setMode('bench')}><UiIcon name="crafting" size={16} /> WORKBENCH</button>
        <button className={`tab-pill ${mode === 'loom' ? 'on' : ''}`} onClick={() => setMode('loom')}>🧶 THE LOOM</button>
        <button className={`tab-pill ${mode === 'tray' ? 'on' : ''}`} onClick={() => setMode('tray')}>🧵 TINKER'S TRAY</button>
      </div>
      {mode === 'bench' ? <SteadyHands action={action} /> : mode === 'loom' ? <TheLoom action={action} /> : <TinkersTray action={action} />}
    </>
  );
}
