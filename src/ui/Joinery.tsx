// 🧩 Crafting's second minigame: Joinery. Turn the wooden pieces until every joint meets another.
// No timer, no materials — finishing a board gives Crafting XP.
import { useEffect, useState } from 'react';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import type { ActionDef } from '../data/skills';
import { skillLevel } from '../core/idle';
import { E, jointOk, joineryXp, N, newJoinery, S, solved, turnPiece, W, type JoineryBoard } from '../core/joinery';
import { game, useGame } from '../core/store';
import { UiIcon } from './icons';
import { FeedbackLayer, useFeedback } from './Minigames';
import { SteadyHands } from './Minigames2';

const ARM: Record<number, string> = { [N]: 'M50 50 L50 0', [E]: 'M50 50 L100 50', [S]: 'M50 50 L50 100', [W]: 'M50 50 L0 50' };

function Piece({ mask, ok, done }: { mask: number; ok: (d: number) => boolean; done: boolean }) {
  const dirs = [N, E, S, W].filter((d) => mask & d);
  return (
    <svg viewBox="0 0 100 100" className="jn-svg">
      {dirs.map((d) => (
        <path key={d} d={ARM[d]} stroke={done || ok(d) ? '#fbbf24' : '#a0703f'} strokeWidth="22" strokeLinecap="round" />
      ))}
      {dirs.map((d) => <path key={`g${d}`} d={ARM[d]} stroke={done || ok(d) ? '#fde68a' : '#c08a52'} strokeWidth="6" strokeLinecap="round" opacity="0.7" />)}
      <circle cx="50" cy="50" r={dirs.length === 1 ? 15 : 13} fill={done ? '#fbbf24' : '#8a5a32'} stroke="#4a2e17" strokeWidth="4" />
    </svg>
  );
}

function Joinery({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const [size, setSize] = useState(4);
  const [board, setBoard] = useState<JoineryBoard>(() => newJoinery(4));
  const [turns, setTurns] = useState(0);
  const done = solved(board);
  const blocked = skillLevel(player, 'crafting') < action.level ? `Pick a recipe you know (needs Crafting ${action.level})` : null;

  // A calm tune while you work the wood; the town's song comes back when you leave.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_kitchen');
    return () => sound.playMusic(musicFor(town));
  }, [town]);

  const fresh = (n = size) => { setSize(n); setBoard(newJoinery(n)); setTurns(0); sound.play('tile', { volume: 0.6 }); };

  const turn = (i: number) => {
    if (done || blocked) return;
    const next = turnPiece(board, i);
    setBoard(next);
    setTurns((t) => t + 1);
    sound.play('tile', { rate: 0.9 + Math.random() * 0.2, volume: 0.55 });
    if (solved(next)) {
      const xp = joineryXp(size, action.xp);
      game.minigameXp(action.id, xp, 60);
      sound.play('match');
      sound.play('carve', { rate: 1.2 });
      push(`Perfect joinery! +${xp.toLocaleString()} Crafting XP`, 'combo');
    }
  };

  return (
    <div className="mg">
      <div className="jn-wrap">
        <div className={`jn-board ${done ? 'done' : ''}`} style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
          {board.tiles.map((m, i) => (
            <button key={i} data-silent className="jn-cell" onClick={() => turn(i)} aria-label="Turn this piece" disabled={!!blocked}>
              <Piece mask={m} ok={(d) => jointOk(board, i, d)} done={done} />
            </button>
          ))}
          {done && <div className="jn-done">🪵 A tidy piece of joinery!</div>}
        </div>
        <FeedbackLayer items={items} />
      </div>
      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Joinery</span>
          <span className="mg-hint">{blocked ?? 'Tap a piece to turn it — join every joint'}</span>
        </div>
        <div className="tab-row small-tabs no-pad">
          {[4, 5, 6].map((n) => (
            <button key={n} className={`tab-pill ${size === n ? 'on' : ''}`} onClick={() => fresh(n)}>{n}×{n} board</button>
          ))}
        </div>
        <button className="btn btn-hero btn-wide" onClick={() => fresh()}><UiIcon name="refresh" size={16} /> {done ? 'Next board' : 'New board'}</button>
        <p className="mg-foot">No timer, no materials. A finished board gives Crafting XP based on the recipe you picked — bigger boards give more ({joineryXp(4, action.xp).toLocaleString()} / {joineryXp(5, action.xp).toLocaleString()} / {joineryXp(6, action.xp).toLocaleString()} XP). {turns ? `${turns} turns` : ''}</p>
      </div>
    </div>
  );
}

export function CraftingGames({ action }: { action: ActionDef }) {
  const [mode, setMode] = useState<'bench' | 'joinery'>('bench');
  return (
    <>
      <div className="tab-row small-tabs">
        <button className={`tab-pill ${mode === 'bench' ? 'on' : ''}`} onClick={() => setMode('bench')}><UiIcon name="crafting" size={16} /> WORKBENCH</button>
        <button className={`tab-pill ${mode === 'joinery' ? 'on' : ''}`} onClick={() => setMode('joinery')}>🧩 JOINERY</button>
      </div>
      {mode === 'bench' ? <SteadyHands action={action} /> : <Joinery action={action} />}
    </>
  );
}
