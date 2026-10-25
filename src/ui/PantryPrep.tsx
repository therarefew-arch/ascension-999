// Cooking: Sear at the stove, or Pantry Prep — a calm sliding puzzle on a cutting board. Both give Cooking XP.
import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import { getItem } from '../data/items';
import type { ActionDef } from '../data/skills';
import { regionOpen } from '../data/tiers';
import { skillLevel, whyCantDo } from '../core/idle';
import { bestDish, canMove, COOK_AT, DISHES, GREAT_AT, mergeXp, newBoard, slide, spawn, type Board, type Dir } from '../core/pantry';
import { game, useGame } from '../core/store';
import { UiIcon } from './icons';
import { FeedbackLayer, gainText, useFeedback } from './Minigames';
import { HeatPrecision } from './Minigames2';

function PantryPrep({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const [board, setBoard] = useState<Board>(() => newBoard());
  const [pops, setPops] = useState<{ cells: number[]; at: number }>({ cells: [], at: 0 });
  const [best, setBest] = useState(1);
  const cooked = useRef(false);
  // Prep only needs the level and the town — no fire or fish needed to play.
  const regionOk = regionOpen(action.region) && (!action.region || player.regions.includes(action.region));
  const blocked = skillLevel(player, 'cooking') < action.level ? `Needs Cooking ${action.level}` : !regionOk ? `Travel to ${action.region} first` : null;
  const tidy = !canMove(board);

  // Cozy kitchen music while you prep; the town's song comes back when you leave.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_kitchen');
    return () => sound.playMusic(musicFor(town));
  }, [town]);

  const fresh = () => { setBoard(newBoard()); setBest(1); cooked.current = false; sound.play('tile', { volume: 0.6 }); };

  const move = (dir: Dir) => {
    if (blocked || tidy) return;
    const r = slide(board, dir);
    if (!r.moved) { sound.play('tile', { rate: 0.7, volume: 0.35 }); return; }
    const next = spawn(r.board);
    setBoard(next);
    sound.play('tile', { volume: 0.45 });
    if (r.merges.length) {
      const top = Math.max(...r.merges);
      setPops({ cells: r.merged, at: Date.now() });
      // A knife "chop" for each combine — higher for bigger dishes. Stews and up sizzle.
      sound.play('chop', { rate: 0.85 + top * 0.06, volume: 0.8 });
      if (top >= COOK_AT) sound.play('sizzle', { volume: 0.6 });
      const xp = r.merges.reduce((sum, lv) => sum + mergeXp(lv, action.xp), 0);
      game.minigameXp(action.id, xp);
      if (top > best) {
        setBest(top);
        if (top >= 4) {
          sound.play('match');
          push(`New dish: ${DISHES[top - 1].emoji} ${DISHES[top - 1].name}!`, top >= GREAT_AT ? 'combo' : 'perfect');
        }
        // Your first stew (or better) this board cooks one of your fish for real — Pie or better makes it Great.
        if (top >= COOK_AT && !cooked.current && !whyCantDo(player, action, { manual: true })) {
          cooked.current = true;
          const res = game.minigameReward(action.id, { xpMult: 1, bonusRolls: 0, great: top >= GREAT_AT });
          if (res.ok) push(`Cooked!  ${gainText(res)}`, 'good');
        }
      }
    }
    if (!canMove(next)) { sound.play('levelup', { volume: 0.5 }); push(`Kitchen's tidy! Best dish: ${DISHES[bestDish(next) - 1].emoji}`, 'combo'); }
  };

  // Swipe on the board (or use the arrow keys / buttons).
  const start = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current; start.current = null;
    if (!s) return;
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
  return (
    <div className="mg">
      <div className="pp-wrap">
        <div className={`pp-board ${tidy ? 'tidy' : ''}`} onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { start.current = null; }}
          role="application" aria-label="Pantry Prep board. Swipe or use arrow keys.">
          {board.map((v, i) => (
            <div key={`${i}-${v}-${pops.cells.includes(i) ? pops.at : 0}`} className={`pp-cell ${v ? `pp-lv${v}` : ''} ${pops.cells.includes(i) ? 'pop' : ''}`}>
              {v > 0 && <span className="pp-emoji">{DISHES[v - 1].emoji}</span>}
            </div>
          ))}
          {tidy && <div className="pp-done">✨ Kitchen's tidy!</div>}
        </div>
        <FeedbackLayer items={items} />
      </div>
      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Pantry Prep</span>
          <span className="mg-hint">{blocked ?? 'Swipe to slide · two the same combine'}</span>
        </div>
        <div className="pp-ladder" aria-label="Dish ladder">
          {DISHES.map((d, i) => (
            <span key={d.name} className={`pp-step ${i + 1 <= best ? 'got' : ''}`} title={d.name}>{d.emoji}</span>
          ))}
        </div>
        <div className="pp-pad">
          <button className="btn" data-silent onClick={() => move('left')} aria-label="Slide left">◀</button>
          <button className="btn" data-silent onClick={() => move('up')} aria-label="Slide up">▲</button>
          <button className="btn" data-silent onClick={() => move('down')} aria-label="Slide down">▼</button>
          <button className="btn" data-silent onClick={() => move('right')} aria-label="Slide right">▶</button>
          <button className="btn btn-hero" onClick={fresh}><UiIcon name="refresh" size={16} /> Fresh board</button>
        </div>
        <p className="mg-foot">
          Every combine gives Cooking XP — bigger dishes give more. Your first {DISHES[COOK_AT - 1].emoji} {DISHES[COOK_AT - 1].name} each board also cooks a {fish}
          {fireLit ? '' : ' (if the fire is lit)'}; a {DISHES[GREAT_AT - 1].emoji} {DISHES[GREAT_AT - 1].name} makes it Great. No timer, nothing to lose.
        </p>
      </div>
    </div>
  );
}

export function CookingGames({ action }: { action: ActionDef }) {
  const [mode, setMode] = useState<'sear' | 'prep'>('sear');
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
