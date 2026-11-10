// 🌲 Forester's Grove (v0.0.2.35): Woodcutting's sudoku-style puzzle. Rules in core/grove.ts; this file draws it.
// The grove in progress is kept on this device per save slot (`ui.grove.<slot>`). Also holds WoodcuttingGames: the
// tabs 🪓 TIMBER! (Chop) / 🌲 FORESTER'S GROVE.
import { useEffect, useMemo, useState } from 'react';
import type { ActionDef } from '../data/skills';
import { clashes, finishedUnits, groveDone, groveSpec, groveXp, MAX_GROVE_LEVEL, newGrove, TREES, units, type Grove } from '../core/grove';
import { lockedReason } from '../core/idle';
import { minigameXpScale } from '../core/rates';
import { game, useGame } from '../core/store';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import { Chop } from './Minigames2';
import { FeedbackLayer, useFeedback } from './Minigames';

type WcMode = 'chop' | 'grove';
let lastMode: WcMode = 'chop';

export function WoodcuttingGames({ action }: { action: ActionDef }) {
  const [mode, setModeState] = useState<WcMode>(lastMode);
  const setMode = (m: WcMode) => { lastMode = m; setModeState(m); sound.play('click', { volume: 0.4 }); };
  return (
    <>
      <div className="tab-row small-tabs">
        <button className={`tab-pill ${mode === 'chop' ? 'on' : ''}`} onClick={() => setMode('chop')}>🪓 TIMBER!</button>
        <button className={`tab-pill ${mode === 'grove' ? 'on' : ''}`} onClick={() => setMode('grove')}>🌲 FORESTER'S GROVE</button>
      </div>
      {mode === 'chop' ? <Chop action={action} /> : <ForestersGrove action={action} />}
    </>
  );
}

interface Saved { grove: Grove; board: number[]; notes: number[][]; hints: number; done: boolean }
const keyFor = (slot: number | null) => `ui.grove.${slot ?? 0}`;
function readSaved(slot: number | null): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(keyFor(slot)) ?? 'null') as Saved | null;
    // Groves are always 9×9 since v0.0.2.36 — an old smaller one in progress is swapped for a fresh 9×9.
    return s && s.grove && s.grove.n === 9 && Array.isArray(s.board) && s.board.length === 81 ? s : null;
  } catch { return null; }
}
function writeSaved(slot: number | null, s: Saved) { try { localStorage.setItem(keyFor(slot), JSON.stringify(s)); } catch { /* no storage: lasts this visit */ } }

/** A gentle pentatonic chime per tree, so planting sounds like a little tune. */
const TREE_RATE = [1, 1.122, 1.26, 1.498, 1.682, 2, 2.245, 2.52, 2.997];

function fresh(level: number): Saved {
  const grove = newGrove(level);
  return { grove, board: [...grove.given], notes: grove.given.map(() => []), hints: groveSpec(level).hints, done: false };
}

export function ForestersGrove({ action }: { action: ActionDef }) {
  const { player, slot } = useGame();
  const { items, push } = useFeedback();
  const level = Math.min(MAX_GROVE_LEVEL, player.groveLevel ?? 1);
  const [st, setSt] = useState<Saved>(() => readSaved(slot) ?? fresh(level));
  const [sel, setSel] = useState<number | null>(null);
  const [noting, setNoting] = useState(false);
  const [glow, setGlow] = useState<string[]>([]);
  const blocked = lockedReason(player, action);
  const { grove, board } = st;
  const n = grove.n;
  const u = useMemo(() => units(n, grove.bw, grove.bh), [n, grove.bw, grove.bh]);
  const bad = useMemo(() => clashes(grove, board), [grove, board]);

  // A calm puzzle tune while you plant; the town's song comes back when you leave.
  const town = player.location;
  useEffect(() => { sound.playMusic('music_mahjong'); return () => sound.playMusic(musicFor(town)); }, [town]);

  const save = (s: Saved) => { setSt(s); writeSaved(slot, s); };
  // Keep a freshly dealt grove too, so it's the same one next time you open the game.
  useEffect(() => { if (!readSaved(slot)) writeSaved(slot, st); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finishCheck = (s: Saved, before: string[]) => {
    const now = finishedUnits(s.grove, s.board);
    const newly = now.filter((k) => !before.includes(k));
    if (newly.length) {
      setGlow(newly);
      window.setTimeout(() => setGlow([]), 900);
      sound.play('ding', { rate: 1.5 + newly.length * 0.12, volume: 0.45 });
      sound.play('zap', { volume: 0.25, rate: 1.2 });
    }
    if (!s.done && groveDone(s.grove, s.board)) {
      s.done = true;
      const xp = groveXp(s.grove.level, action.xp);
      if (!blocked) {
        game.minigameXp(action.id, xp, 60);
        if (s.grove.level >= level) game.groveLevelUp();
      }
      window.setTimeout(() => { sound.play('timber', { volume: 0.6 }); sound.play('levelup', { volume: 0.6 }); }, 250);
      game.vibrate(35);
      push(blocked ? 'Grove planted!' : `Grove planted! Level ${s.grove.level} · +${Math.round(xp * minigameXpScale(player, action)).toLocaleString()} Woodcutting XP`, 'combo');
    }
  };

  const plant = (tree: number) => {
    if (sel === null || st.done || grove.given[sel] >= 0) return;
    const before = finishedUnits(grove, board);
    if (noting && board[sel] < 0) {
      const notes = st.notes.map((x) => [...x]);
      notes[sel] = notes[sel].includes(tree) ? notes[sel].filter((t) => t !== tree) : [...notes[sel], tree].sort();
      sound.play('tick', { volume: 0.3, rate: TREE_RATE[tree] });
      save({ ...st, notes });
      return;
    }
    const next = [...board];
    next[sel] = next[sel] === tree ? -1 : tree;
    const s: Saved = { ...st, board: next };
    if (next[sel] >= 0) {
      // Clear that tree from the notes in the same row, column and patch.
      s.notes = st.notes.map((x, i) => (i === sel ? [] : (u.row(i) === u.row(sel) || u.col(i) === u.col(sel) || u.box(i) === u.box(sel)) ? x.filter((t) => t !== tree) : x));
      const clash = clashes(grove, next).has(sel);
      sound.play(clash ? 'thud' : 'ding', { rate: clash ? 1 : TREE_RATE[tree] * 0.9, volume: clash ? 0.35 : 0.38 });
      if (!clash) sound.play('chop', { volume: 0.12, rate: 1.6 });
    } else sound.play('whoosh', { volume: 0.3 });
    save(s);
    finishCheck(s, before);
  };

  const erase = () => {
    if (sel === null || grove.given[sel] >= 0 || st.done) return;
    const next = [...board]; next[sel] = -1;
    const notes = st.notes.map((x, i) => (i === sel ? [] : x));
    sound.play('whoosh', { volume: 0.3 });
    save({ ...st, board: next, notes });
  };

  const hint = () => {
    if (st.done || st.hints <= 0) return;
    const empties = board.map((v, i) => (v !== grove.solution[i] ? i : -1)).filter((i) => i >= 0);
    if (!empties.length) return;
    const target = sel !== null && board[sel] !== grove.solution[sel] ? sel : empties[Math.floor(Math.random() * empties.length)];
    const before = finishedUnits(grove, board);
    const next = [...board]; next[target] = grove.solution[target];
    const s: Saved = { ...st, board: next, hints: st.hints - 1, notes: st.notes.map((x, i) => (i === target ? [] : x)) };
    setSel(target);
    sound.play('enchant', { volume: 0.5 });
    save(s);
    finishCheck(s, before);
  };

  const another = (lv: number) => { sound.play('riffle', { volume: 0.5 }); setSel(null); setNoting(false); save(fresh(lv)); };

  const selTree = sel !== null ? board[sel] : -1;
  const filled = board.filter((v) => v >= 0).length;
  const counts = TREES.slice(0, n).map((_, t) => board.filter((v) => v === t).length);

  return (
    <div className={`fg-root fg-n${n}`}>
      <div className="fg-head">
        <b className="small">🌲 LEVEL {grove.level}/{MAX_GROVE_LEVEL}</b>
        <span className="tiny muted">{n}×{n} · {filled}/{n * n} planted</span>
      </div>
      {blocked && <p className="tiny red">{blocked} — you can still plant for fun, but it won't give XP.</p>}

      <div className="fg-board" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {board.map((v, i) => {
          const isGiven = grove.given[i] >= 0;
          const r = u.row(i), c = u.col(i);
          const same = sel !== null && (u.row(sel) === r || u.col(sel) === c || u.box(sel) === u.box(i));
          const lit = glow.some((k) => (k[0] === 'r' && Number(k.slice(1)) === r) || (k[0] === 'c' && Number(k.slice(1)) === c) || (k[0] === 'b' && Number(k.slice(1)) === u.box(i)));
          const cls = ['fg-cell', isGiven ? 'given' : '', sel === i ? 'sel' : '', same ? 'same' : '', v >= 0 && v === selTree ? 'match' : '',
            bad.has(i) ? 'bad' : '', lit ? 'lit' : '', c % grove.bw === grove.bw - 1 && c < n - 1 ? 'br' : '', r % grove.bh === grove.bh - 1 && r < n - 1 ? 'bb' : ''].join(' ');
          return (
            <button key={i} className={cls} onClick={() => { setSel(i); sound.play('tick', { volume: 0.15 }); }} aria-label={`Row ${r + 1}, column ${c + 1}${v >= 0 ? `, ${TREES[v].name}` : ', empty'}`}>
              {v >= 0
                ? <span className="fg-tree">{TREES[v].emoji}</span>
                : st.notes[i]?.length ? <span className="fg-notes" style={{ gridTemplateColumns: `repeat(${n === 4 ? 2 : 3}, 1fr)` }}>{TREES.slice(0, n).map((t, k) => <span key={k}>{st.notes[i].includes(k) ? t.emoji : ''}</span>)}</span> : null}
            </button>
          );
        })}
      </div>

      {st.done ? (
        <div className="fg-done">
          <p className="small">🌳 Every row, column and patch holds one of each tree. Beautiful!</p>
          <button className="btn btn-hero" onClick={() => another(Math.min(MAX_GROVE_LEVEL, player.groveLevel ?? 1))}>NEXT GROVE · LEVEL {Math.min(MAX_GROVE_LEVEL, player.groveLevel ?? 1)} ▶</button>
        </div>
      ) : (
        <>
          <div className="fg-palette" style={{ gridTemplateColumns: `repeat(${n <= 6 ? n : 5}, 1fr)` }}>
            {TREES.slice(0, n).map((t, k) => (
              <button key={k} className={`fg-seed ${selTree === k ? 'on' : ''} ${counts[k] >= n ? 'full' : ''}`} onClick={() => plant(k)} disabled={sel === null || grove.given[sel ?? 0] >= 0}>
                <span className="fg-seed-emoji">{t.emoji}</span>
                <span className="tiny">{counts[k]}/{n}</span>
              </button>
            ))}
          </div>
          <div className="fg-tools">
            <button className={`btn btn-sm ${noting ? 'on' : ''}`} onClick={() => { setNoting((x) => !x); sound.play('click', { volume: 0.4 }); }}>✏️ Notes {noting ? 'on' : 'off'}</button>
            <button className="btn btn-sm" onClick={erase} disabled={sel === null || grove.given[sel] >= 0 || board[sel] < 0}>🧹 Clear</button>
            <button className="btn btn-sm" onClick={hint} disabled={st.hints <= 0}>💡 Hint ({st.hints})</button>
            <button className="btn btn-sm" onClick={() => another(grove.level)}>🔄 New</button>
          </div>
          <p className="tiny muted center">Tap a square, then a tree. Each row, column and patch needs one of each. Finish a grove for <b>{Math.round(groveXp(grove.level, action.xp) * minigameXpScale(player, action)).toLocaleString()} Woodcutting XP</b> and the next level.</p>
        </>
      )}
      <FeedbackLayer items={items} />
    </div>
  );
}
