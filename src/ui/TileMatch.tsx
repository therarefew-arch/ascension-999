// Fishing: Reel It In, or "Sort the Catch" — a relaxing pair-matching game (mahjong solitaire rules). Both give Fishing XP.
import { useEffect, useState } from 'react';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import type { ActionDef } from '../data/skills';
import { whyCantDo } from '../core/idle';
import { hasMove, isFree, newBoard, shuffle, type Tile } from '../core/mahjong';
import { game, useGame } from '../core/store';
import { UiIcon } from './icons';
import { FeedbackLayer, gainText, useFeedback } from './Minigames';
import { ReelItIn } from './Minigames2';

/** Tile faces: river and sea friends. */
const FACES = ['🐟', '🦐', '🦀', '🐚', '⭐', '🐙', '🐠', '⚓', '🐡', '🦑', '🐢', '🌊'];
const TILE_W = 46;
const TILE_H = 58;
const LIFT = 5;

export function TileMatch({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const [tiles, setTiles] = useState<Tile[]>(newBoard);
  const [picked, setPicked] = useState<number | null>(null);
  const [pairs, setPairs] = useState(0);
  // Matching only needs the level and rod; bag space only matters for the board-clear bonus.
  const why = whyCantDo(player, action, { manual: true });
  const blocked = why && why !== 'Your bag is full' ? why : null;

  // Calm lofi music while you play; the town's own song comes back when you leave.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_mahjong');
    return () => sound.playMusic(musicFor(town));
  }, [town]);

  const tap = (t: Tile) => {
    if (blocked || !isFree(t, tiles)) return;
    sound.play('tile');
    if (picked === null || picked === t.id) { setPicked(picked === t.id ? null : t.id); return; }
    const other = tiles.find((o) => o.id === picked);
    if (!other || other.face !== t.face) { setPicked(t.id); return; }
    sound.play('match');
    const left = tiles.filter((o) => o.id !== t.id && o.id !== other.id);
    setTiles(left);
    setPicked(null);
    setPairs((n) => n + 1);
    game.minigameXp(action.id, action.xp);
    if (left.length === 0) {
      const r = game.minigameReward(action.id, { xpMult: 2, bonusRolls: 2 });
      push(r.ok ? `BOARD CLEARED!  ${gainText(r)}` : 'Board cleared!', 'combo');
    } else {
      push(`Match! +${action.xp} Fishing XP`, 'good');
    }
  };

  const width = 6 * TILE_W + 2 * LIFT;
  const height = 4 * TILE_H + 2 * LIFT;
  const stuck = tiles.length > 0 && !hasMove(tiles);
  const sorted = [...tiles].sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);

  return (
    <div className="mg">
      <div className="mj-board-wrap">
        <div className="mj-board" style={{ width, height }}>
          {sorted.map((t) => {
            const free = isFree(t, tiles);
            return (
              <button key={t.id} data-silent
                className={`mj-tile ${free ? 'free' : ''} ${picked === t.id ? 'picked' : ''}`}
                style={{ left: t.x * TILE_W + 2 * LIFT - t.z * LIFT, top: t.y * TILE_H + 2 * LIFT - t.z * LIFT, width: TILE_W - 2, height: TILE_H - 2, zIndex: t.z * 10 + t.y }}
                onClick={() => tap(t)} aria-label={`Catch ${FACES[t.face]}${free ? '' : ' (blocked)'}`}>
                <span>{FACES[t.face]}</span>
              </button>
            );
          })}
          {tiles.length === 0 && <div className="mj-done">🧺 All sorted!</div>}
        </div>
        <FeedbackLayer items={items} />
      </div>
      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Sort the Catch</span>
          <span className="mg-hint">{blocked ?? `Pair up free fish · +${action.xp} XP each · ${pairs} pairs`}</span>
        </div>
        {stuck && <div className="warn">No pairs left — give the crates a shake (it's free).</div>}
        <div className="btn-pair">
          <button className="btn btn-lg" onClick={() => { setTiles(shuffle(tiles)); setPicked(null); }} disabled={tiles.length === 0}>
            <UiIcon name="refresh" size={18} /> Shake crates
          </button>
          <button className="btn btn-hero btn-lg" onClick={() => { setTiles(newBoard()); setPicked(null); setPairs(0); }}>
            <UiIcon name="play" size={18} /> Fresh catch
          </button>
        </div>
        <p className="mg-foot">Sort the day's catch into pairs. A piece is free when nothing sits on top of it and its left or right side is open. Sort everything for bonus fish.</p>
      </div>
    </div>
  );
}

export function FishingGames({ action }: { action: ActionDef }) {
  const [mode, setMode] = useState<'reel' | 'tiles'>('reel');
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
