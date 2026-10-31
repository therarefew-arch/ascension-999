// Fishing: Reel It In, or "Sort the Catch" — a tile-stack game (rules in core/sortCatch.ts, v3 in v0.0.1.63).
// Pick free tiles off the pile into a 4-slot basket; three of a fish clear for Fishing XP.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import type { ActionDef } from '../data/skills';
import { whyCantDo } from '../core/idle';
import {
  addToBasket, BASKET, COLS, COMBO_BAR, comboMult, FACES, HELPERS, hintTile, isBust, isFree, newBoard, ROWS, shuffleBoard, tripleXp,
  type Slot, type Tile,
} from '../core/sortCatch';
import { game, useGame } from '../core/store';
import { UiIcon } from './icons';
import { FeedbackLayer, gainText, useFeedback } from './Minigames';
import { ReelItIn } from './Minigames2';

/** How far each layer sits up-and-left of the one below (px). */
const LIFT = 4;

export function TileMatch({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const [tiles, setTiles] = useState<Tile[]>(() => newBoard());
  const [basket, setBasket] = useState<Slot[]>([]);
  const [history, setHistory] = useState<{ tile: Tile; basket: Slot[] }[]>([]);
  const [phase, setPhase] = useState<'play' | 'bust' | 'clear'>('play');
  const [threes, setThrees] = useState(0);
  const [score, setScore] = useState(0);
  const [helpers, setHelpers] = useState<Record<keyof typeof HELPERS, number>>({ ...HELPERS });
  const [hint, setHint] = useState<number | null>(null);
  const [pop, setPop] = useState<{ face: number; at: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [tw, setTw] = useState(48);
  // Matching only needs the level and rod; bag space only matters for the board-clear bonus.
  const why = whyCantDo(player, action, { manual: true });
  const blocked = why && why !== 'Your bag is full' ? why : null;

  // Calm lofi music while you play; the town's own song comes back when you leave.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_mahjong');
    return () => sound.playMusic(musicFor(town));
  }, [town]);
  // Tiles fit the phone's width.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setTw(Math.max(34, Math.min(58, Math.floor((el.clientWidth - 3 * LIFT - 4) / COLS))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const th = Math.round(tw * 1.22);

  const mult = comboMult(Math.floor(threes / COMBO_BAR));

  const tap = (t: Tile) => {
    if (blocked || phase !== 'play') return;
    if (!isFree(t, tiles)) { sound.play('tile', { rate: 0.7, volume: 0.3 }); game.vibrate(8); return; }
    setHint(null);
    sound.play('clack', { rate: 1 + Math.random() * 0.1, volume: 0.7 });
    window.setTimeout(() => sound.play('thud', { rate: 1.05, volume: 0.6 }), 110);
    const left = tiles.filter((o) => o.id !== t.id);
    const res = addToBasket(basket, t);
    setTiles(left);
    setBasket(res.basket);
    if (res.cleared !== null) {
      const xp = Math.round(tripleXp(action.xp) * mult);
      game.minigameXp(action.id, xp);
      setThrees((n) => n + 1);
      setScore((s) => s + xp);
      setHistory([]); // a cleared three can't be undone
      setPop({ face: res.cleared, at: Date.now() });
      window.setTimeout(() => { sound.play('match', { volume: 0.8 }); sound.play('clack', { rate: 1.4, volume: 0.5 }); }, 160);
      if ((threes + 1) % COMBO_BAR === 0) { push(`Combo! ×${comboMult(Math.floor((threes + 1) / COMBO_BAR))} XP`, 'combo'); window.setTimeout(() => sound.play('levelup', { volume: 0.5 }), 300); }
      else push(`Three ${FACES[res.cleared]}! +${xp.toLocaleString()} XP`, 'good');
    } else {
      setHistory((h) => [...h, { tile: t, basket }]);
    }
    if (isBust(res.basket)) {
      setPhase('bust');
      window.setTimeout(() => sound.play('fail', { volume: 0.7 }), 200);
      return;
    }
    if (left.length === 0) {
      setPhase('clear');
      const r = game.minigameReward(action.id, { xpMult: 2, bonusRolls: 2 });
      window.setTimeout(() => sound.play('levelup', { volume: 0.7 }), 250);
      push(r.ok ? `ALL SORTED!  ${gainText(r)}` : 'All sorted!', 'combo');
    }
  };

  const helper = (k: keyof typeof HELPERS) => {
    if (blocked || helpers[k] <= 0 || phase === 'clear') { sound.play('error', { volume: 0.5 }); return; }
    if (k === 'undo') {
      const last = history[history.length - 1];
      if (!last) { sound.play('error', { volume: 0.5 }); push('Nothing to undo', 'info'); return; }
      setTiles((ts) => [...ts, last.tile]);
      setBasket(last.basket);
      setHistory((h) => h.slice(0, -1));
      setPhase('play');
      sound.play('whoosh', { rate: 0.85, volume: 0.6 });
      sound.play('clack', { rate: 0.9, volume: 0.5 });
    } else if (phase !== 'play') {
      sound.play('error', { volume: 0.5 }); return;
    } else if (k === 'shuffle') {
      setTiles(shuffleBoard(tiles, basket));
      setHint(null);
      sound.play('whoosh', { rate: 1.1, volume: 0.6 });
      [0, 1, 2, 3].forEach((i) => window.setTimeout(() => sound.play('clack', { rate: 0.8 + i * 0.12, volume: 0.45 }), 80 + i * 60));
    } else {
      const t = hintTile(tiles, basket);
      if (!t) { sound.play('error', { volume: 0.5 }); push('No good move — try a shuffle', 'info'); return; }
      setHint(t.id);
      sound.play('rune', { volume: 0.6 });
    }
    setHelpers((h) => ({ ...h, [k]: h[k] - 1 }));
  };

  const fresh = () => {
    setTiles(newBoard()); setBasket([]); setHistory([]); setPhase('play'); setThrees(0); setScore(0); setHelpers({ ...HELPERS }); setHint(null);
    [0, 1, 2].forEach((i) => window.setTimeout(() => sound.play('clack', { rate: 0.8 + i * 0.15, volume: 0.5 }), i * 70));
  };

  const width = COLS * tw + 3 * LIFT;
  const height = ROWS * th + 3 * LIFT;
  const sorted = [...tiles].sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  const danger = basket.length >= BASKET;

  return (
    <div className="mg st">
      <div className="st-top">
        <span className="st-score mono">{score.toLocaleString()}</span>
        <div className={`st-basket ${danger ? 'danger' : ''} ${phase === 'bust' ? 'bust' : ''}`} aria-label={`Basket: ${basket.length} of ${BASKET} kinds`}>
          {Array.from({ length: BASKET }, (_, i) => {
            const s = basket[i];
            return (
              <span key={s ? `f${s.face}` : `e${i}`} className={`st-slot ${s ? 'full' : ''}`}>
                {s && <>{FACES[s.face]}{s.ids.length > 1 && <span className="st-count">{s.ids.length}</span>}</>}
              </span>
            );
          })}
          {basket.length > BASKET && <span className="st-slot full over">{FACES[basket[BASKET].face]}</span>}
        </div>
        <div className="st-combo">
          <div className="st-bar"><div style={{ width: `${((threes % COMBO_BAR) / COMBO_BAR) * 100}%` }} /><span className="mono">{threes % COMBO_BAR}/{COMBO_BAR}</span></div>
          <b className="st-mult mono">{mult.toFixed(1)}x</b>
        </div>
      </div>

      <div className="st-board-wrap" ref={wrap}>
        <div className="st-board" style={{ width, height }}>
          {sorted.map((t) => {
            const free = isFree(t, tiles);
            return (
              <button key={t.id} data-silent
                className={`st-tile ${free ? 'free' : ''} ${hint === t.id ? 'hint' : ''}`}
                style={{ left: (t.x / 2) * tw + 3 * LIFT - t.z * LIFT, top: (t.y / 2) * th + 3 * LIFT - t.z * LIFT, width: tw - 2, height: th - 2, zIndex: t.z * 100 + t.y * 2,
                  fontSize: Math.round(tw * 0.58) }}
                onClick={() => tap(t)} aria-label={`Catch ${FACES[t.face]}${free ? '' : ' (covered)'}`}>
                <span>{FACES[t.face]}</span>
              </button>
            );
          })}
          {pop && Date.now() - pop.at < 700 && <span key={pop.at} className="st-pop">{FACES[pop.face]}{FACES[pop.face]}{FACES[pop.face]}</span>}
          {phase === 'clear' && <div className="st-done">🧺 All sorted!</div>}
          {phase === 'bust' && <div className="st-done bust">🧺💥 The basket overflowed!<span className="small">You keep the XP you earned.{helpers.undo > 0 && history.length > 0 ? ' Tap ↩️ to take that one back.' : ''}</span></div>}
        </div>
        <FeedbackLayer items={items} />
      </div>

      <div className="st-helpers">
        {([['shuffle', '🔀', 'Shuffle'], ['hint', '🔍', 'Hint'], ['undo', '↩️', 'Undo']] as const).map(([k, emoji, label]) => (
          <button key={k} className="st-helper" disabled={helpers[k] <= 0} onClick={() => helper(k)} aria-label={`${label} (${helpers[k]} left)`}>
            <span>{emoji}</span><span className="st-helper-n mono">{helpers[k]}</span>
          </button>
        ))}
      </div>

      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Sort the Catch</span>
          <span className="mg-hint">{blocked ?? `${tiles.length} tiles left · ${threes} threes`}</span>
        </div>
        <button className="btn btn-hero btn-lg btn-wide" onClick={fresh}><UiIcon name="play" size={18} /> {phase === 'play' ? 'Fresh catch' : 'Next catch'}</button>
        <p className="mg-foot">
          Tap any tile that nothing is lying on (covered tiles look darker). It goes in your basket — the same fish stack together.
          Three alike clear for <b>{tripleXp(action.xp).toLocaleString()} Fishing XP</b> × your combo. The basket has {BASKET} slots — a 5th different fish overflows it.
          Every {COMBO_BAR} threes adds +0.5× XP (up to 3×). Shuffle, Hint and Undo refill with every crate. Sort the whole crate for bonus fish.
        </p>
      </div>
    </div>
  );
}

/** Remembered while the app is open, so Fishing reopens on the game you were playing. */
let lastFishMode: 'reel' | 'tiles' = 'reel';

export function FishingGames({ action }: { action: ActionDef }) {
  const [mode, setModeState] = useState<'reel' | 'tiles'>(lastFishMode);
  const setMode = (m: 'reel' | 'tiles') => { lastFishMode = m; setModeState(m); };
  return (
    <>
      <div className="tab-row small-tabs">
        <button className={`tab-pill ${mode === 'reel' ? 'on' : ''}`} onClick={() => setMode('reel')}><UiIcon name="fishing" size={16} /> REEL</button>
        <button className={`tab-pill ${mode === 'tiles' ? 'on' : ''}`} onClick={() => setMode('tiles')}>🧺 SORT THE CATCH</button>
      </div>
      {mode === 'reel' ? <ReelItIn action={action} /> : <TileMatch action={action} />}
    </>
  );
}
