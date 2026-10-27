// Fishing: Reel It In, or "Sort the Catch" — a Mahjong-Blast style tile game (rules in core/sortCatch.ts).
// Flip face-down tiles to find matches, gather fish in your basket, and clear them in threes. Both give Fishing XP.
import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import type { ActionDef } from '../data/skills';
import { whyCantDo } from '../core/idle';
import { addToHand, FACES, HAND_SIZE, isBust, isFree, newBoard, tripleXp, type Tile } from '../core/sortCatch';
import { game, useGame } from '../core/store';
import { UiIcon } from './icons';
import { FeedbackLayer, gainText, useFeedback } from './Minigames';
import { ReelItIn } from './Minigames2';

const TILE_W = 46;
const TILE_H = 58;
const LIFT = 5;
/** How long a mismatched pair stays face-up before flipping back (ms). */
const PEEK_MS = 850;

type HandTile = { id: number; face: number };

export function TileMatch({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const [tiles, setTiles] = useState<Tile[]>(() => newBoard());
  const [peek, setPeek] = useState<number[]>([]);
  const [hand, setHand] = useState<HandTile[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'play' | 'bust' | 'clear'>('play');
  const [threes, setThrees] = useState(0);
  const [glow, setGlow] = useState<{ face: number; at: number } | null>(null);
  const timer = useRef<number | null>(null);
  // Matching only needs the level and rod; bag space only matters for the board-clear bonus.
  const why = whyCantDo(player, action, { manual: true });
  const blocked = why && why !== 'Your bag is full' ? why : null;

  // Calm lofi music while you play; the town's own song comes back when you leave.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_mahjong');
    return () => { sound.playMusic(musicFor(town)); if (timer.current) clearTimeout(timer.current); };
  }, [town]);

  /** Tiles go into the basket: a wooden thud each, threes clear, a full basket busts. */
  const take = (taken: Tile[], board: Tile[]) => {
    const left = board.filter((o) => !taken.some((t) => t.id === o.id));
    setTiles(left);
    taken.forEach((_, i) => window.setTimeout(() => sound.play('thud', { rate: 0.95 + i * 0.08, volume: 0.8 }), i * 90));
    const res = addToHand(hand, taken.map((t) => ({ id: t.id, face: t.face })));
    setHand(res.hand);
    if (res.cleared.length) {
      const xp = tripleXp(action.xp) * res.cleared.length;
      game.minigameXp(action.id, xp);
      setThrees((n) => n + res.cleared.length);
      setGlow({ face: res.cleared[0], at: Date.now() });
      window.setTimeout(() => { sound.play('match', { volume: 0.8 }); sound.play('clack', { rate: 1.35, volume: 0.6 }); }, 160);
      push(`Three ${FACES[res.cleared[0]]}! +${xp.toLocaleString()} Fishing XP`, 'good');
    }
    if (isBust(res.hand)) {
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

  const tap = (t: Tile) => {
    if (blocked || busy || phase !== 'play') return;
    if (!isFree(t, tiles)) { sound.play('tile', { rate: 0.7, volume: 0.3 }); return; }
    // Face-up, or the tile you just flipped: straight into the basket.
    if (t.up || peek.includes(t.id)) {
      setPeek((p) => p.filter((x) => x !== t.id));
      sound.play('clack', { rate: 1.1, volume: 0.6 });
      take([t], tiles);
      return;
    }
    // Face-down: flip it over.
    sound.play('clack', { rate: 0.95 + Math.random() * 0.1, volume: 0.85 });
    if (peek.length === 0) { setPeek([t.id]); return; }
    const other = tiles.find((o) => o.id === peek[0]);
    if (!other) { setPeek([t.id]); return; }
    setPeek([other.id, t.id]);
    setBusy(true);
    if (other.face === t.face) {
      // A match: both drop into the basket.
      timer.current = window.setTimeout(() => { setPeek([]); setBusy(false); take([other, t], tiles); }, 380);
    } else {
      // Not a match: remember them — they flip back over.
      timer.current = window.setTimeout(() => {
        setPeek([]);
        setBusy(false);
        sound.play('clack', { rate: 0.75, volume: 0.45 });
        sound.play('whoosh', { rate: 1.2, volume: 0.35 });
      }, PEEK_MS);
    }
  };

  const fresh = () => {
    if (timer.current) clearTimeout(timer.current);
    setTiles(newBoard()); setPeek([]); setHand([]); setBusy(false); setPhase('play'); setThrees(0);
    [0, 1, 2].forEach((i) => window.setTimeout(() => sound.play('clack', { rate: 0.8 + i * 0.15, volume: 0.5 }), i * 70));
  };

  const width = 6 * TILE_W + 2 * LIFT;
  const height = 4 * TILE_H + 2 * LIFT;
  const sorted = [...tiles].sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  const danger = hand.length >= HAND_SIZE - 2;

  return (
    <div className="mg">
      <div className="mj-board-wrap">
        <div className="mj-board" style={{ width, height }}>
          {sorted.map((t) => {
            const free = isFree(t, tiles);
            const shown = t.up || peek.includes(t.id);
            return (
              <button key={t.id} data-silent
                className={`mj-tile ${free ? 'free' : ''} ${shown ? 'shown' : ''} ${peek.includes(t.id) ? 'peek' : ''}`}
                style={{ left: t.x * TILE_W + 2 * LIFT - t.z * LIFT, top: t.y * TILE_H + 2 * LIFT - t.z * LIFT, width: TILE_W - 2, height: TILE_H - 2, zIndex: t.z * 10 + t.y }}
                onClick={() => tap(t)} aria-label={shown ? `Catch ${FACES[t.face]}${free ? '' : ' (blocked)'}` : `Face-down tile${free ? '' : ' (blocked)'}`}>
                <span className="mj-flip">
                  <span className="mj-front">{FACES[t.face]}</span>
                  <span className="mj-back" />
                </span>
              </button>
            );
          })}
          {phase === 'clear' && <div className="mj-done">🧺 All sorted!</div>}
          {phase === 'bust' && <div className="mj-done bust">🧺💥 The basket overflowed!<span className="small">You keep the XP you earned.</span></div>}
        </div>
        <FeedbackLayer items={items} />
      </div>

      <div className={`mj-hand ${danger ? 'danger' : ''} ${phase === 'bust' ? 'bust' : ''}`} aria-label={`Basket: ${hand.length} of ${HAND_SIZE}`}>
        {Array.from({ length: HAND_SIZE }, (_, i) => {
          const h = hand[i];
          return (
            <span key={h ? h.id : `e${i}`} className={`mj-slot ${h ? 'full' : ''} ${h && glow && glow.face === h.face && Date.now() - glow.at < 600 ? 'glow' : ''}`}>
              {h ? FACES[h.face] : ''}
            </span>
          );
        })}
      </div>

      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Sort the Catch</span>
          <span className="mg-hint">{blocked ?? `Flip, match, three in the basket · ${threes} threes`}</span>
        </div>
        <button className="btn btn-hero btn-lg btn-wide" onClick={fresh}><UiIcon name="play" size={18} /> {phase === 'play' ? 'Fresh catch' : 'Next catch'}</button>
        <p className="mg-foot">
          Tap a face-down tile to flip it, then flip another — a match drops both into your basket, otherwise they flip back (remember them!). Face-up tiles go straight in.
          Three of a fish clear for <b>{tripleXp(action.xp).toLocaleString()} Fishing XP</b>. The basket holds {HAND_SIZE} — fill it without a three and it overflows. Sort the whole crate for bonus fish.
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
