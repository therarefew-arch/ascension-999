// 🧵 Tinker's Tray — Crafting's match-3. Rules live in core/tinkersTray.ts.
// Swap two neighbouring scraps (tap-tap or swipe) to line up 3+. Fill a customer's order in 20 moves.
import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import type { ActionDef } from '../data/skills';
import { skillLevel } from '../core/idle';
import {
  adjacent, clearMatches, collapse, colOf, hasMove, idx, MOVES, newBoard, newOrder, orderProgress, orderXp, rowOf, SCRAPS, shuffleBoard,
  SIZE, SPECIAL_INFO, swap, swapWorks, syncIds, type Board, type Clear, type Order,
} from '../core/tinkersTray';
import { game, useGame } from '../core/store';
import { FeedbackLayer, useFeedback } from './Minigames';
import { useNoScroll } from './useNoScroll';

interface Saved { board: Board; order: Order; got: number[]; moves: number; phase: Phase }
type Phase = 'play' | 'done' | 'out';
const KEY = (slot: number | null) => `ui.tray.${slot ?? 0}`;
function loadSaved(slot: number | null): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY(slot)) ?? 'null') as Saved | null;
    if (!s || !Array.isArray(s.board) || s.board.length !== SIZE * SIZE) return null;
    syncIds(s.board);
    return s;
  } catch { return null; }
}
function writeSaved(slot: number | null, s: Saved) { try { localStorage.setItem(KEY(slot), JSON.stringify(s)); } catch { /* ignore */ } }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const POP_MS = 220;
const FALL_MS = 260;

export function TinkersTray({ action }: { action: ActionDef }) {
  const { player, slot } = useGame();
  const { items, push } = useFeedback();
  const [init] = useState(() => loadSaved(slot));
  const [board, setBoard] = useState<Board>(() => init?.board ?? newBoard());
  const [order, setOrder] = useState<Order>(() => init?.order ?? newOrder(1));
  const [got, setGot] = useState<number[]>(() => init?.got ?? SCRAPS.map(() => 0));
  const [moves, setMoves] = useState(init?.moves ?? MOVES);
  const [phase, setPhase] = useState<Phase>(init?.phase ?? 'play');
  const [sel, setSel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [popping, setPopping] = useState<Set<number>>(new Set());
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState<Set<number>>(new Set());
  const [hint, setHint] = useState<number[]>([]);
  const trayRef = useRef<HTMLDivElement>(null);
  useNoScroll(trayRef);
  const blocked = skillLevel(player, 'crafting') < action.level ? `Pick a recipe you know (needs Crafting ${action.level})` : null;

  // The kitchen's calm tune suits the workbench too; the town's song comes back when you leave.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_kitchen');
    return () => sound.playMusic(musicFor(town));
  }, [town]);

  // Saved on this device after every move, so you can come back to your order.
  useEffect(() => { if (!busy) writeSaved(slot, { board, order, got, moves, phase }); }, [slot, board, order, got, moves, phase, busy]);

  // Stuck for a while? A gentle nudge shows a move.
  useEffect(() => {
    setHint([]);
    if (busy || phase !== 'play') return;
    const t = window.setTimeout(() => {
      for (let i = 0; i < board.length; i++) {
        for (const j of [i + 1, i + SIZE]) {
          if (j < board.length && adjacent(i, j) && swapWorks(board, i, j)) { setHint([i, j]); return; }
        }
      }
    }, 7000);
    return () => clearTimeout(t);
  }, [board, busy, phase]);

  const progress = orderProgress(order, got);

  /** Shows one clear: the scraps pop, then everything falls and new scraps drop in. */
  const showClear = async (before: Board, after: Board, res: Clear, combo: number, tally: number[]) => {
    setPopping(new Set(res.cleared.map((i) => before[i]?.id).filter((x): x is number => x != null)));
    sound.play('match', { rate: Math.min(1.8, 1 + combo * 0.12), volume: 0.7 });
    for (const sp of res.fired) {
      if (sp === 'row' || sp === 'col') sound.play('anvil', { rate: 1.3, volume: 0.45 });
      else sound.play('boom', { rate: sp === 'star' ? 1.2 : 1, volume: 0.75 });
    }
    if (res.made.length) sound.play('enchant', { rate: 1.1, volume: 0.6 });
    res.got.forEach((n, k) => { tally[k] += n; });
    setGot([...tally]);
    await wait(POP_MS);
    setPopping(new Set());
    const dropped = collapse(after);
    setFresh(dropped);
    setBoard([...after]);
    await wait(FALL_MS);
  };

  const attempt = async (a: number, c: number) => {
    if (busy || phase !== 'play' || blocked) return;
    setSel(null);
    const before = [...board];
    const work = [...board];
    const res = swap(work, a, c);
    if (!res) {
      // Doesn't make a match: a little wiggle, nothing used up.
      setShake(new Set([before[a]?.id ?? -1, before[c]?.id ?? -1]));
      sound.play('whoosh', { volume: 0.5 });
      window.setTimeout(() => setShake(new Set()), 300);
      return;
    }
    setBusy(true);
    sound.play('carve', { rate: 1.2, volume: 0.5 });
    // Show the swap first…
    const swapped = [...before];
    [swapped[a], swapped[c]] = [swapped[c], swapped[a]];
    setBoard(swapped);
    await wait(170);
    // …then each clear, and the cascades that follow.
    const tally = [...got];
    let combo = 0;
    await showClear(swapped, work, res, combo, tally);
    for (;;) {
      const snap = [...work];
      const more = clearMatches(work);
      if (!more) break;
      combo += 1;
      await showClear(snap, work, more, combo, tally);
    }
    if (combo >= 2) push(combo >= 4 ? `Wonderful! ${combo + 1}× cascade` : `Cascade ×${combo + 1}!`, combo >= 4 ? 'combo' : 'perfect');
    const left = moves - 1;
    setMoves(left);
    const p = orderProgress(order, tally);
    if (p >= 1) {
      finish(true, p);
    } else if (left <= 0) {
      finish(false, p);
    } else if (!hasMove(work)) {
      const mixed = shuffleBoard(work);
      setBoard(mixed);
      push('No moves left — the tray gets a shake', 'good');
      sound.play('tile', { volume: 0.6 });
    }
    setBusy(false);
  };

  const finish = (complete: boolean, p: number) => {
    const xp = orderXp(action.xp, p, complete, order.number);
    game.minigameXp(action.id, xp, 60);
    setPhase(complete ? 'done' : 'out');
    if (complete) { sound.play('levelup', { volume: 0.7 }); push(`Order filled! +${xp.toLocaleString()} Crafting XP`, 'combo'); }
    else { sound.play('coin', { volume: 0.6 }); push(`Out of moves — +${xp.toLocaleString()} Crafting XP for what you gathered`, 'good'); }
  };

  const nextOrder = () => {
    const n = phase === 'done' ? order.number + 1 : order.number;
    setOrder(newOrder(n));
    setGot(SCRAPS.map(() => 0));
    setMoves(MOVES);
    setPhase('play');
    setSel(null);
    if (!hasMove(board)) setBoard(newBoard());
    sound.play('card', { volume: 0.7 });
  };

  // ----- Input: tap one scrap then a neighbour, or swipe a scrap -----
  const down = useRef<{ i: number; x: number; y: number } | null>(null);
  const cellAt = (x: number, y: number) => {
    const r = trayRef.current!.getBoundingClientRect();
    const c = Math.floor(((x - r.left) / r.width) * SIZE);
    const w = Math.floor(((y - r.top) / r.height) * SIZE);
    return c >= 0 && c < SIZE && w >= 0 && w < SIZE ? idx(w, c) : null;
  };
  const onDown = (e: React.PointerEvent) => {
    const i = cellAt(e.clientX, e.clientY);
    down.current = i == null ? null : { i, x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = down.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    down.current = null;
    const r = rowOf(d.i) + (Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0);
    const c = colOf(d.i) + (Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0);
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) void attempt(d.i, idx(r, c));
  };
  const onUp = () => {
    const d = down.current;
    down.current = null;
    if (!d || busy || phase !== 'play') return;
    if (sel == null || sel === d.i) {
      setSel(sel === d.i ? null : d.i);
      sound.play('tile', { rate: sel === d.i ? 0.85 : 1.15, volume: 0.5 });
    } else if (adjacent(sel, d.i)) {
      void attempt(sel, d.i);
    } else {
      setSel(d.i);
      sound.play('tile', { rate: 1.15, volume: 0.5 });
    }
  };

  const cell = 100 / SIZE;
  return (
    <div className="mg">
      <div className="tt-order">
        <div className="row-between">
          <span className="small"><b>{order.who}</b> needs:</span>
          <span className={`tt-moves mono ${moves <= 5 ? 'low' : ''}`}>{moves} move{moves === 1 ? '' : 's'}</span>
        </div>
        <div className="tt-wants">
          {order.want.map((w) => {
            const have = Math.min(w.n, got[w.k]);
            return (
              <div key={w.k} className={`tt-want ${have >= w.n ? 'met' : ''}`} style={{ ['--sc' as string]: SCRAPS[w.k].color }}>
                <span className="tt-want-emoji">{SCRAPS[w.k].emoji}</span>
                <span className="mono">{have}/{w.n}</span>
                {have >= w.n && <span>✓</span>}
              </div>
            );
          })}
        </div>
        <div className="bar"><div className="bar-fill tone-gold" style={{ width: `${progress * 100}%` }} /></div>
      </div>

      <div className="tt-wrap">
        <div ref={trayRef} className="tt-tray" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { down.current = null; }}
          role="application" aria-label="Tinker's Tray. Tap a scrap, then a neighbour, or swipe to swap.">
          {board.map((t, i) => t && (
            <div key={t.id} className={`tt-tile ${sel === i ? 'sel' : ''} ${popping.has(t.id) ? 'pop' : ''} ${shake.has(t.id) ? 'shake' : ''} ${hint.includes(i) ? 'hint' : ''}`}
              style={{ left: `${colOf(i) * cell}%`, top: `${rowOf(i) * cell}%`, width: `${cell}%`, height: `${cell}%` }}>
              <div className={`tt-face ${fresh.has(t.id) ? 'drop' : ''} ${t.sp ? `sp sp-${t.sp}` : ''}`}
                style={{ ['--sc' as string]: t.k >= 0 ? SCRAPS[t.k].color : '#f59e0b' }}>
                <span className="tt-emoji">{t.sp === 'star' ? '✨' : SCRAPS[t.k].emoji}</span>
                {t.sp && t.sp !== 'star' && <span className="tt-badge">{t.sp === 'box' ? '🧰' : t.sp === 'row' ? '↔' : '↕'}</span>}
              </div>
            </div>
          ))}
          {phase !== 'play' && (
            <div className="tt-done">
              <b>{phase === 'done' ? '📦 Order filled!' : '⌛ Out of moves'}</b>
              <span className="small">{phase === 'done' ? `${order.who} is delighted.` : `You gathered ${Math.round(progress * 100)}% — XP given for that.`}</span>
              <button className="btn btn-hero" onClick={nextOrder}>{phase === 'done' ? 'Next order ▶' : 'Try a new order'}</button>
            </div>
          )}
        </div>
        <FeedbackLayer items={items} />
      </div>

      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Tinker's Tray</span>
          <span className="mg-hint">{blocked ?? 'Swap neighbours to line up 3 or more'}</span>
        </div>
        <p className="mg-foot">
          Match 4 → {SPECIAL_INFO.row.emoji} Mallet ({'clears a line'}), an L or T → {SPECIAL_INFO.box.emoji} Toolbox ({SPECIAL_INFO.box.text}), 5 in a row → {SPECIAL_INFO.star.emoji} Master's Touch ({SPECIAL_INFO.star.text}).
          No materials needed. A filled order gives <b>{orderXp(action.xp, 1, true, order.number).toLocaleString()} Crafting XP</b>; running out of moves still pays for what you gathered.
        </p>
      </div>
    </div>
  );
}
