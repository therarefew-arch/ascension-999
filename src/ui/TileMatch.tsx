// Fishing: Reel It In, or "Sort the Catch" — a tile-stack game (rules in core/sortCatch.ts, v3 in v0.0.1.63).
// Pick free tiles off the pile into a 4-slot basket; two of a fish clear for Fishing XP.
// v0.0.2.13 (owner): carved ivory tiles on a dock table, a ⛶ full screen mode, and levels 1–999 that get harder.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import type { ActionDef } from '../data/skills';
import { whyCantDo } from '../core/idle';
import {
  addToBasket, BASKET, clearReward, COMBO_BAR, comboMult, FACES, hintTile, isBust, isFree, levelSpec, MAX_SORT_LEVEL, newBoard, shuffleBoard, matchXp,
  type LevelSpec, type Slot, type Tile,
} from '../core/sortCatch';
import { game, useGame } from '../core/store';
import { useOwnFullScreen } from './MinigameFrame';
import { UiIcon } from './icons';
import { FeedbackLayer, gainText, useFeedback } from './Minigames';
import { ReelItIn } from './Minigames2';

/** How far each layer sits up-and-left of the one below (px). */
const LIFT = 4;
type HelperKey = keyof LevelSpec['helpers'];

export function TileMatch({ action }: { action: ActionDef }) {
  useOwnFullScreen(); // has its own ⛶ (the skill screen's frame hides its button)
  const { player } = useGame();
  const { items, push } = useFeedback();
  const level = Math.min(MAX_SORT_LEVEL, player.sortLevel ?? 1);
  // The crate on the table, and the level it was dealt for (the size stays put while you clear it).
  const [deal, setDeal] = useState(() => ({ level, spec: levelSpec(level), tiles: newBoard(level) }));
  const tiles = deal.tiles;
  const setTiles = (t: Tile[] | ((t: Tile[]) => Tile[])) => setDeal((d) => ({ ...d, tiles: typeof t === 'function' ? t(d.tiles) : t }));
  const [basket, setBasket] = useState<Slot[]>([]);
  const [history, setHistory] = useState<{ tile: Tile; basket: Slot[] }[]>([]);
  const [phase, setPhase] = useState<'play' | 'bust' | 'clear'>('play');
  const [pairs, setPairs] = useState(0);
  const [score, setScore] = useState(0);
  const [helpers, setHelpers] = useState<Record<HelperKey, number>>({ ...deal.spec.helpers });
  const [hint, setHint] = useState<number | null>(null);
  const [pop, setPop] = useState<{ face: number; at: number } | null>(null);
  const [full, setFull] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const [tw, setTw] = useState(48);
  // Matching only needs the level and rod; bag space only matters for the board-clear bonus.
  const why = whyCantDo(player, action, { manual: true });
  const blocked = why && why !== 'Your bag is full' ? why : null;
  const { cols, rows, layers } = deal.spec;
  const lift = (layers - 1) * LIFT;

  // Calm lofi music while you play; the town's own song comes back when you leave.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_mahjong');
    return () => sound.playMusic(musicFor(town));
  }, [town]);
  // Tiles fit the space: the phone's width, and in full screen the height too.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const byW = (el.clientWidth - lift - 8) / cols;
      const byH = full ? (el.clientHeight - lift - 12) / (rows * 1.22) : Infinity;
      setTw(Math.max(30, Math.min(full ? 76 : 60, Math.floor(Math.min(byW, byH)))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cols, rows, lift, full]);
  const th = Math.round(tw * 1.22);

  // ⛶ Full screen: the game covers the whole screen (and the browser goes full screen where it can).
  useEffect(() => {
    if (!full) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Leaving the browser's own full screen (back gesture, Esc) leaves ours too — but only once we were really in it.
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
    try { document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {}); } catch { /* not on this phone — the overlay still covers the screen */ }
  };

  const mult = comboMult(Math.floor(pairs / COMBO_BAR));

  const tap = (t: Tile) => {
    if (blocked) { sound.play('error', { volume: 0.4 }); push(blocked, 'info'); return; }
    if (phase !== 'play') return;
    if (!isFree(t, tiles)) { sound.play('tile', { rate: 0.7, volume: 0.3 }); game.vibrate(8); return; }
    setHint(null);
    sound.play('clack', { rate: 1 + Math.random() * 0.1, volume: 0.7 });
    window.setTimeout(() => sound.play('thud', { rate: 1.05, volume: 0.6 }), 110);
    const left = tiles.filter((o) => o.id !== t.id);
    const res = addToBasket(basket, t);
    setTiles(left);
    setBasket(res.basket);
    if (res.cleared !== null) {
      const xp = Math.round(matchXp(action.xp) * mult);
      game.minigameXp(action.id, xp);
      setPairs((n) => n + 1);
      setScore((s) => s + xp);
      setHistory([]); // a cleared pair can't be undone
      setPop({ face: res.cleared, at: Date.now() });
      window.setTimeout(() => { sound.play('match', { volume: 0.8 }); sound.play('clack', { rate: 1.4, volume: 0.5 }); }, 160);
      if ((pairs + 1) % COMBO_BAR === 0) { push(`Combo! ×${comboMult(Math.floor((pairs + 1) / COMBO_BAR))} XP`, 'combo'); window.setTimeout(() => sound.play('levelup', { volume: 0.5 }), 300); }
      else push(`A pair of ${FACES[res.cleared]}! +${xp.toLocaleString()} XP`, 'good');
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
      const r = game.minigameReward(action.id, clearReward(deal.level));
      if (deal.level >= level) game.sortLevelUp();
      window.setTimeout(() => sound.play('levelup', { volume: 0.7 }), 250);
      push(r.ok ? `LEVEL ${deal.level} SORTED!  ${gainText(r)}` : `Level ${deal.level} sorted!`, 'combo');
    }
  };

  const helper = (k: HelperKey) => {
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

  /** Deal a crate for the level you're on (a fresh try, or the next level after a clear). */
  const fresh = () => {
    const L = Math.min(MAX_SORT_LEVEL, player.sortLevel ?? 1);
    const spec = levelSpec(L);
    setDeal({ level: L, spec, tiles: newBoard(L) });
    setBasket([]); setHistory([]); setPhase('play'); setPairs(0); setScore(0); setHelpers({ ...spec.helpers }); setHint(null);
    [0, 1, 2].forEach((i) => window.setTimeout(() => sound.play('clack', { rate: 0.8 + i * 0.15, volume: 0.5 }), i * 70));
  };

  const width = cols * tw + lift;
  const height = rows * th + lift;
  const sorted = [...tiles].sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  const danger = basket.length >= BASKET;
  const total = useRef(tiles.length);
  if (phase === 'play' && pairs === 0 && history.length === 0) total.current = Math.max(tiles.length, 1);
  const done = 1 - tiles.length / total.current;
  const freshLabel = phase === 'clear' ? `Level ${Math.min(MAX_SORT_LEVEL, player.sortLevel ?? 1)} ▸` : phase === 'bust' ? 'Try again' : 'Fresh crate';

  const game_ = (
    <div className={`mg st ${full ? 'st-full' : ''}`}>
      <div className="st-head">
        <span className="st-level"><span className="st-level-k">LEVEL</span> <b className="mono">{deal.level}</b><span className="st-level-of mono">/{MAX_SORT_LEVEL}</span></span>
        <div className="st-progress" aria-label={`${Math.round(done * 100)}% sorted`}><div style={{ width: `${done * 100}%` }} /></div>
        <span className="st-score mono">{score.toLocaleString()}</span>
        <button className="st-full-btn" onClick={toggleFull} aria-label={full ? 'Leave full screen' : 'Full screen'} title={full ? 'Leave full screen' : 'Full screen'}>{full ? '✕' : '⛶'}</button>
      </div>
      {full && blocked && <div className="st-blocked">🔒 {blocked}</div>}
      <div className="st-top">
        <div className={`st-basket ${danger ? 'danger' : ''} ${phase === 'bust' ? 'bust' : ''}`} aria-label={`Basket: ${basket.length} of ${BASKET} kinds`}>
          {Array.from({ length: BASKET }, (_, i) => {
            const s = basket[i];
            return (
              <span key={s ? `f${s.face}` : `e${i}`} className={`st-slot ${s ? 'full' : ''}`}>
                {s && <><span className="st-face">{FACES[s.face]}</span>{s.ids.length > 1 && <span className="st-count">{s.ids.length}</span>}</>}
              </span>
            );
          })}
          {basket.length > BASKET && <span className="st-slot full over"><span className="st-face">{FACES[basket[BASKET].face]}</span></span>}
        </div>
        <div className="st-combo">
          <div className="st-bar"><div style={{ width: `${((pairs % COMBO_BAR) / COMBO_BAR) * 100}%` }} /><span className="mono">{pairs % COMBO_BAR}/{COMBO_BAR}</span></div>
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
                style={{ left: (t.x / 2) * tw + lift - t.z * LIFT, top: (t.y / 2) * th + lift - t.z * LIFT, width: tw - 2, height: th - 2, zIndex: t.z * 100 + t.y * 2,
                  fontSize: Math.round(tw * 0.56) }}
                onClick={() => tap(t)} aria-label={`Catch ${FACES[t.face]}${free ? '' : ' (covered)'}`}>
                <span className="st-face">{FACES[t.face]}</span>
              </button>
            );
          })}
          {pop && Date.now() - pop.at < 700 && <span key={pop.at} className="st-pop">{FACES[pop.face]}{FACES[pop.face]}</span>}
        </div>
        {phase === 'clear' && (
          <div className="st-done">
            <span className="st-done-big">🧺 Level {deal.level} sorted!</span>
            <span className="small">{deal.level >= MAX_SORT_LEVEL ? 'You sorted every crate on the coast. Play on for XP!' : `Next up: level ${Math.min(MAX_SORT_LEVEL, deal.level + 1)}`}</span>
            <button className="btn btn-hero" onClick={fresh}>Next level ▸</button>
          </div>
        )}
        {phase === 'bust' && (
          <div className="st-done bust">
            <span className="st-done-big">🧺💥 The basket overflowed!</span>
            <span className="small">You keep the XP you earned.{helpers.undo > 0 && history.length > 0 ? ' Tap ↩️ to take that one back,' : ''} or try level {deal.level} again.</span>
            <button className="btn btn-hero" onClick={fresh}>Try again</button>
          </div>
        )}
        <FeedbackLayer items={items} />
      </div>

      <div className="st-helpers">
        {([['shuffle', '🔀', 'Shuffle'], ['hint', '🔍', 'Hint'], ['undo', '↩️', 'Undo']] as const).map(([k, emoji, label]) => (
          <button key={k} className="st-helper" disabled={helpers[k] <= 0} onClick={() => helper(k)} aria-label={`${label} (${helpers[k]} left)`}>
            <span>{emoji}</span><span className="st-helper-n mono">{helpers[k]}</span>
          </button>
        ))}
        {full && <button className="st-helper st-helper-fresh" onClick={fresh} aria-label={freshLabel}><span>🔄</span></button>}
      </div>

      {!full && (
        <div className="mg-panel">
          <div className="mg-row">
            <span className="mg-label">Sort the Catch</span>
            <span className="mg-hint">{blocked ?? `${tiles.length} tiles left · ${pairs} pair${pairs === 1 ? '' : 's'}`}</span>
          </div>
          <button className="btn btn-hero btn-lg btn-wide" onClick={fresh}><UiIcon name="play" size={18} /> {freshLabel}</button>
          <p className="mg-foot">
            Tap any tile that nothing is lying on (covered tiles look darker). It goes in your basket.
            Two alike clear for <b>{matchXp(action.xp).toLocaleString()} Fishing XP</b> × your combo. The basket has {BASKET} slots — a 5th different fish overflows it.
            Every {COMBO_BAR} pairs adds +0.5× XP (up to 3×). Sort the whole crate to reach the next level (up to {MAX_SORT_LEVEL}) — each one is a bigger pile with more kinds of fish and fewer helpers, and a bigger bonus.
          </p>
        </div>
      )}
    </div>
  );
  return full ? createPortal(<div className="mg-skin mg-skin-fishing">{game_}</div>, document.body) : game_;
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
