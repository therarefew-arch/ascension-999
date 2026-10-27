// Cooking: Sear at the stove, or Pantry Prep — a calm sliding puzzle on a cutting board. Both give Cooking XP.
// Pantry Prep is built for long, relaxed sessions: two boards (4×4 and the 5×5 banquet table, each kept
// separately), kitchen orders that pay Chef's Tips, and kitchen tools to spend them on.
import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import { getItem } from '../data/items';
import type { ActionDef } from '../data/skills';
import { regionOpen } from '../data/tiers';
import { skillLevel, whyCantDo } from '../core/idle';
import {
  applyTool, bestDish, BOARD_NAMES, canMove, COOK_AT, DISHES, fillOrders, GREAT_AT, MAX_DISH, mergeScore, mergeXp, newBoard, newOrderDish,
  ORDER_SLOTS, orderTips, orderXp, sizeOf, SIZES, slide, spawn, TOOLS, type Board, type BoardSize, type Dir, type Tool,
} from '../core/pantry';
import { game, useGame } from '../core/store';
import { UiIcon } from './icons';
import { FeedbackLayer, gainText, useFeedback } from './Minigames';
import { HeatPrecision } from './Minigames2';
import { useNoScroll } from './useNoScroll';

/** One board in progress. */
interface BoardState {
  board: Board;
  best: number;
  score: number;
  cooked: boolean;
  orders: number[];
  /** One step back: the board before your last slide. */
  prev: { board: Board; best: number; score: number } | null;
}
/** Everything Pantry Prep keeps, saved on this device per save slot (leaving the screen or the game keeps it). */
interface Saved { v: 2; size: BoardSize; states: Record<BoardSize, BoardState>; tips: number; bestScore: Record<BoardSize, number> }

const KEY = (slot: number | null) => `ui.pantry.${slot ?? 0}`;
const freshState = (size: BoardSize): BoardState => {
  const board = newBoard(Math.random, size);
  const orders: number[] = [];
  for (let i = 0; i < ORDER_SLOTS; i++) orders.push(newOrderDish(1, size, Math.random, orders));
  return { board, best: bestDish(board), score: 0, cooked: false, prev: null, orders };
};
function loadSaved(slot: number | null): Saved {
  const base: Saved = { v: 2, size: 4, states: { 4: freshState(4), 5: freshState(5) }, tips: 0, bestScore: { 4: 0, 5: 0 } };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY(slot)) ?? 'null');
    if (raw?.v === 2) {
      for (const n of SIZES) if (raw.states?.[n]?.board?.length === n * n) base.states[n] = { ...freshState(n), ...raw.states[n] };
      return { ...base, size: SIZES.includes(raw.size) ? raw.size : 4, tips: Number(raw.tips) || 0, bestScore: { ...base.bestScore, ...raw.bestScore } };
    }
    // The first version saved just one 4×4 board — keep it.
    if (Array.isArray(raw?.board) && raw.board.length === 16) {
      base.states[4] = { ...base.states[4], board: raw.board, best: raw.best ?? bestDish(raw.board), cooked: !!raw.cooked, prev: null };
    }
  } catch { /* start fresh */ }
  return base;
}
function writeSaved(slot: number | null, s: Saved) { try { localStorage.setItem(KEY(slot), JSON.stringify(s)); } catch { /* ignore */ } }

function PantryPrep({ action }: { action: ActionDef }) {
  const { player, slot } = useGame();
  const { items, push } = useFeedback();
  const [data, setData] = useState<Saved>(() => loadSaved(slot));
  const [pops, setPops] = useState<{ cells: number[]; at: number }>({ cells: [], at: 0 });
  const [tool, setTool] = useState<Tool | null>(null);
  const [picks, setPicks] = useState<number[]>([]);
  const [filledFlash, setFilledFlash] = useState<number[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  useNoScroll(boardRef);

  const size = data.size;
  const st = data.states[size];
  const { board, best, score, orders, prev } = st;
  // Prep only needs the level and the town — no fire or fish needed to play.
  const regionOk = regionOpen(action.region) && (!action.region || player.regions.includes(action.region));
  const blocked = skillLevel(player, 'cooking') < action.level ? `Needs Cooking ${action.level}` : !regionOk ? `Travel to ${action.region} first` : null;
  const tidy = !canMove(board);

  useEffect(() => { writeSaved(slot, data); }, [slot, data]);

  // Cozy kitchen music while you prep; the town's song comes back when you leave.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_kitchen');
    return () => sound.playMusic(musicFor(town));
  }, [town]);

  /** Changes the current board's state (and anything else). */
  const update = (fn: (s: BoardState, d: Saved) => Partial<BoardState>, extra: Partial<Saved> = {}) =>
    setData((d) => ({ ...d, ...extra, states: { ...d.states, [d.size]: { ...d.states[d.size], ...fn(d.states[d.size], d) } } }));

  const fresh = () => {
    setTool(null); setPicks([]);
    update(() => { const f = freshState(size); return { board: f.board, best: f.best, score: 0, cooked: false, prev: null }; });
    sound.play('tile', { volume: 0.6 });
  };

  const switchSize = (n: BoardSize) => {
    if (n === size) return;
    setTool(null); setPicks([]);
    setData((d) => ({ ...d, size: n }));
    sound.play('tile', { rate: n === 5 ? 0.8 : 1.1, volume: 0.6 });
  };

  /** Takes back your last slide (one step). XP, tips and orders already earned are kept; the fish only cooks once per board. */
  const undo = () => {
    if (!prev) return;
    update(() => ({ board: prev.board, best: prev.best, score: prev.score, prev: null }));
    sound.play('whoosh', { rate: 1.2, volume: 0.6 });
    sound.play('tile', { rate: 0.8, volume: 0.4 });
  };

  const move = (dir: Dir) => {
    if (blocked || tidy || tool) return;
    const r = slide(board, dir);
    if (!r.moved) { sound.play('tile', { rate: 0.7, volume: 0.35 }); return; }
    const next = spawn(r.board);
    sound.play('tile', { volume: 0.45 });
    let newBest = best;
    let cooked = st.cooked;
    let newOrders = orders;
    let tipsGained = 0;
    const gained = r.merges.reduce((s, lv) => s + mergeScore(lv), 0);
    if (r.merges.length) {
      const top = Math.max(...r.merges);
      setPops({ cells: r.merged, at: Date.now() });
      // A knife "chop" for each combine — higher for bigger dishes. Stews and up sizzle.
      sound.play('chop', { rate: 0.85 + top * 0.06, volume: 0.8 });
      if (top >= COOK_AT) sound.play('sizzle', { volume: 0.6 });
      const xp = r.merges.reduce((sum, lv) => sum + mergeXp(lv, action.xp), 0);
      game.minigameXp(action.id, xp);
      if (top > best) {
        newBest = top;
        if (top >= 4) {
          sound.play('match');
          push(`New dish: ${DISHES[top - 1].emoji} ${DISHES[top - 1].name}!`, top >= GREAT_AT ? 'combo' : 'perfect');
        }
        // Your first stew (or better) this board cooks one of your fish for real — Pie or better makes it Great.
        if (top >= COOK_AT && !cooked && !whyCantDo(player, action, { manual: true })) {
          cooked = true;
          const res = game.minigameReward(action.id, { xpMult: 1, bonusRolls: 0, great: top >= GREAT_AT });
          if (res.ok) push(`Cooked!  ${gainText(res)}`, 'good');
        }
      }
      // Kitchen orders: each combine can fill one ticket on the rail.
      const filled = fillOrders(orders, r.merges);
      if (filled.length) {
        newOrders = [...orders];
        let bonus = 0;
        for (const i of filled) {
          tipsGained += orderTips(orders[i]);
          bonus += orderXp(orders[i], action.xp);
          newOrders[i] = newOrderDish(Math.max(newBest, top), size, Math.random, newOrders.filter((_, k) => k !== i));
        }
        game.minigameXp(action.id, bonus, 20);
        setFilledFlash(filled);
        window.setTimeout(() => setFilledFlash([]), 700);
        sound.play('coin', { volume: 0.8 });
        window.setTimeout(() => sound.play('coin', { rate: 1.25, volume: 0.6 }), 120);
        push(`Order up! ${filled.map((i) => DISHES[orders[i] - 1].emoji).join(' ')}  +${tipsGained} 🪙 tips`, 'perfect');
      }
    }
    const newScore = score + gained;
    update(
      () => ({ board: next, best: newBest, score: newScore, cooked, orders: newOrders, prev: { board, best, score } }),
      { tips: data.tips + tipsGained, bestScore: { ...data.bestScore, [size]: Math.max(data.bestScore[size], newScore) } },
    );
    if (!canMove(next)) {
      sound.play('levelup', { volume: 0.5 });
      push(`Kitchen's tidy! Best dish: ${DISHES[bestDish(next) - 1].emoji}${data.tips + tipsGained >= TOOLS.chop.cost ? ' — a tool can make room' : ''}`, 'combo');
    }
  };

  // ----- Kitchen tools: pick the tool, then the ingredient(s) -----
  const pickTool = (t: Tool) => {
    if (blocked) return;
    if (tool === t) { setTool(null); setPicks([]); return; }
    if (data.tips < TOOLS[t].cost) { push(`${TOOLS[t].name} costs ${TOOLS[t].cost} tips — fill orders to earn them`, 'miss'); return; }
    setTool(t); setPicks([]);
    sound.play('tile', { rate: 1.2, volume: 0.5 });
  };
  const tapCell = (i: number) => {
    if (!tool) return;
    if (!board[i]) { sound.play('whoosh', { volume: 0.4 }); return; }
    const p = picks.includes(i) ? picks.filter((x) => x !== i) : [...picks, i];
    sound.play('tile', { rate: 1.1, volume: 0.5 });
    if (p.length < TOOLS[tool].picks) { setPicks(p); return; }
    const res = applyTool(board, tool, p);
    if (typeof res === 'string') { push(res, 'miss'); setPicks([]); return; }
    const cost = TOOLS[tool].cost;
    const newBest = Math.max(best, bestDish(res));
    // Tools can't be undone (the step-back is cleared).
    update(() => ({ board: res, best: newBest, prev: null }), { tips: data.tips - cost });
    setPops({ cells: tool === 'chop' ? [] : p, at: Date.now() });
    sound.play(tool === 'chop' ? 'chop' : tool === 'stir' ? 'whoosh' : 'enchant', { rate: tool === 'stir' ? 1.4 : 1, volume: 0.7 });
    push(`${TOOLS[tool].emoji} ${TOOLS[tool].name}!`, 'good');
    setTool(null); setPicks([]);
  };

  // Swipe on the board (or use the arrow keys / buttons).
  const start = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current; start.current = null;
    if (!s || tool) return;
    const dx = e.clientX - s.x; const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const d = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as Record<string, Dir>)[e.key];
      if (d) { e.preventDefault(); move(d); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const fireLit = player.fire.heatMs > 0;
  const fish = action.inputs[0] ? getItem(action.inputs[0].item).name : 'fish';
  const n = sizeOf(board);
  return (
    <div className="mg">
      <div className="tab-row small-tabs no-pad">
        {SIZES.map((s) => (
          <button key={s} className={`tab-pill ${size === s ? 'on' : ''}`} onClick={() => switchSize(s)} title={BOARD_NAMES[s]}>{s === 4 ? '🔪' : '🍽️'} {s}×{s} {s === 4 ? 'Board' : 'Banquet'}</button>
        ))}
      </div>

      <div className="pp-rail" aria-label="Kitchen orders">
        <span className="pp-rail-label">Orders</span>
        {orders.map((lv, i) => (
          <div key={i} className={`pp-ticket ${filledFlash.includes(i) ? 'filled' : ''}`} title={`${DISHES[lv - 1].name}: +${orderTips(lv)} tips`}>
            <span className="pp-ticket-emoji">{DISHES[lv - 1].emoji}</span>
            <span className="pp-ticket-tip">+{orderTips(lv)}🪙</span>
          </div>
        ))}
        <span className="pp-tips mono" title="Chef's Tips">🪙 {data.tips}</span>
      </div>

      <div className="pp-wrap">
        <div ref={boardRef} className={`pp-board pp-n${n} ${tidy ? 'tidy' : ''} ${tool ? 'tooling' : ''}`} style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
          onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { start.current = null; }}
          role="application" aria-label="Pantry Prep board. Swipe or use arrow keys.">
          {board.map((v, i) => (
            <div key={`${i}-${v}-${pops.cells.includes(i) ? pops.at : 0}`} onClick={() => tapCell(i)}
              className={`pp-cell ${v ? `pp-lv${v}` : ''} ${pops.cells.includes(i) ? 'pop' : ''} ${picks.includes(i) ? 'picked' : ''}`}>
              {v > 0 && <span className="pp-emoji">{DISHES[v - 1].emoji}</span>}
            </div>
          ))}
          {tidy && !tool && <div className="pp-done">✨ Kitchen's tidy!</div>}
        </div>
        <FeedbackLayer items={items} />
      </div>

      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Pantry Prep</span>
          <span className="mg-hint">{blocked ?? (tool ? `${TOOLS[tool].emoji} ${TOOLS[tool].text} — tap ${TOOLS[tool].picks === 2 ? 'two' : 'one'}` : 'Swipe to slide · two the same combine')}</span>
        </div>
        <div className="row-between small mono pp-score">
          <span>Score {score.toLocaleString()}</span>
          <span className="muted">Best {data.bestScore[size].toLocaleString()}</span>
        </div>
        <div className="pp-ladder" aria-label="Dish ladder">
          {DISHES.slice(0, size === 5 ? MAX_DISH : MAX_DISH - 2).map((d, i) => (
            <span key={d.name} className={`pp-step ${i + 1 <= best ? 'got' : ''}`} title={d.name}>{d.emoji}</span>
          ))}
        </div>
        <div className="pp-tools">
          {(Object.keys(TOOLS) as Tool[]).map((t) => (
            <button key={t} className={`btn btn-sm pp-tool ${tool === t ? 'on' : ''}`} disabled={!!blocked || (data.tips < TOOLS[t].cost && tool !== t)} onClick={() => pickTool(t)} title={TOOLS[t].text}>
              {TOOLS[t].emoji} {TOOLS[t].name} <span className="mono gold">{TOOLS[t].cost}</span>
            </button>
          ))}
        </div>
        <div className="pp-pad">
          <button className="btn" data-silent onClick={() => move('left')} aria-label="Slide left">◀</button>
          <button className="btn" data-silent onClick={() => move('up')} aria-label="Slide up">▲</button>
          <button className="btn" data-silent onClick={() => move('down')} aria-label="Slide down">▼</button>
          <button className="btn" data-silent onClick={() => move('right')} aria-label="Slide right">▶</button>
          <button className="btn" onClick={tool ? () => { setTool(null); setPicks([]); } : undo} disabled={!tool && !prev} aria-label={tool ? 'Put the tool away' : 'Undo your last slide'}>{tool ? '✕ Put away' : '↶ Undo'}</button>
          <button className="btn btn-hero" onClick={fresh}><UiIcon name="refresh" size={16} /> Fresh board</button>
        </div>
        <p className="mg-foot">
          Every combine gives Cooking XP — bigger dishes give more. Make the dishes on the <b>order rail</b> for bonus XP and 🪙 Chef's Tips, then spend tips on kitchen tools (they can rescue a full board).
          Your first {DISHES[COOK_AT - 1].emoji} {DISHES[COOK_AT - 1].name} each board also cooks a {fish}{fireLit ? '' : ' (if the fire is lit)'}; a {DISHES[GREAT_AT - 1].emoji} {DISHES[GREAT_AT - 1].name} makes it Great.
          {size === 5 ? ` The banquet table is roomy enough for ${DISHES[10].emoji} and ${DISHES[11].emoji}.` : ''} No timer, nothing to lose.
        </p>
      </div>
    </div>
  );
}

/** Remembered while the app is open, so Cooking reopens on the game you were playing. */
let lastCookMode: 'sear' | 'prep' = 'sear';

export function CookingGames({ action }: { action: ActionDef }) {
  const [mode, setModeState] = useState<'sear' | 'prep'>(lastCookMode);
  const setMode = (m: 'sear' | 'prep') => { lastCookMode = m; setModeState(m); };
  return (
    <>
      <div className="tab-row small-tabs">
        <button className={`tab-pill ${mode === 'sear' ? 'on' : ''}`} onClick={() => setMode('sear')}><UiIcon name="cooking" size={16} /> STOVE</button>
        <button className={`tab-pill ${mode === 'prep' ? 'on' : ''}`} onClick={() => setMode('prep')}>🔪 PANTRY PREP</button>
      </div>
      {mode === 'sear' ? <HeatPrecision action={action} /> : <PantryPrep action={action} />}
    </>
  );
}
