// 🌿 Herblore minigame: "Ripe Picking". Herbs in a little patch light up when they're ripe —
// tap them while they glow. Three picks finish one forage (or drying). Missing costs nothing.
import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import type { ActionDef } from '../data/skills';
import { getItem } from '../data/items';
import { whyCantDo } from '../core/idle';
import { game, useGame } from '../core/store';
import { ItemIcon } from './icons';
import { FeedbackLayer, gainText, useFeedback } from './Minigames';

const CELLS = 9;
const PICKS = 3;
const RIPE_MS = 1700;

export function RipePicking({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const blocked = whyCantDo(player, action, { manual: true });
  const [ripe, setRipe] = useState<Record<number, number>>({});
  const [picks, setPicks] = useState(0);
  const [streak, setStreak] = useState(0);
  const [popped, setPopped] = useState<{ cell: number; at: number } | null>(null);
  const clean = useRef(true);
  const drying = action.inputs.length > 0;

  // Herbs ripen one at a time, here and there.
  useEffect(() => {
    if (blocked) return;
    const t = setInterval(() => {
      const now = Date.now();
      setRipe((r) => {
        const next: Record<number, number> = {};
        for (const [k, until] of Object.entries(r)) if (until > now) next[Number(k)] = until;
        if (Object.keys(next).length < 3) {
          const free = Array.from({ length: CELLS }, (_, i) => i).filter((i) => !next[i]);
          next[free[Math.floor(Math.random() * free.length)]] = now + RIPE_MS;
        }
        return next;
      });
    }, 650);
    return () => clearInterval(t);
  }, [blocked, action.id]);
  useEffect(() => { setPicks(0); setStreak(0); clean.current = true; }, [action.id]);

  const tap = (cell: number) => {
    if (blocked) return;
    const isRipe = (ripe[cell] ?? 0) > Date.now();
    if (!isRipe) { sound.play('whoosh', { volume: 0.5 }); clean.current = false; setStreak(0); return; }
    setRipe((r) => { const n = { ...r }; delete n[cell]; return n; });
    setPopped({ cell, at: Date.now() });
    const next = picks + 1;
    const s = streak + 1;
    setStreak(s);
    sound.play(drying ? 'crackle' : 'carve', { rate: 0.9 + next * 0.08, volume: 0.8 });
    if (next < PICKS) { setPicks(next); return; }
    setPicks(0);
    const perfect = clean.current;
    clean.current = true;
    const r = game.minigameReward(action.id, { xpMult: perfect ? 1.2 : 1, bonusRolls: perfect && !drying ? 1 : 0 });
    if (r.ok) push(perfect ? `LOVELY PICKING!  ${gainText(r)}` : gainText(r), perfect ? 'combo' : 'good');
  };

  return (
    <div className="mg">
      <div className="mg-stage">
        <div className="herb-patch">
          {Array.from({ length: CELLS }, (_, i) => {
            const isRipe = (ripe[i] ?? 0) > Date.now();
            return (
              <button key={i} data-silent className={`herb-cell ${isRipe ? 'ripe' : ''} ${popped?.cell === i && Date.now() - popped.at < 300 ? 'picked' : ''}`}
                onClick={() => tap(i)} disabled={!!blocked} aria-label={isRipe ? 'Ripe herb' : 'Herb'}>
                <span>{isRipe ? getItem(action.output?.item ?? action.iconItem).emoji ?? '🌿' : '🌱'}</span>
              </button>
            );
          })}
        </div>
        <div className="mg-stage-name"><ItemIcon id={action.iconItem} size={22} /> {action.name}</div>
        <div className="pips">{Array.from({ length: PICKS }, (_, i) => <span key={i} className={`pip ${i < picks ? 'good' : ''}`} />)}</div>
        <FeedbackLayer items={items} />
      </div>
      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Ripe Picking</span>
          <span className="mg-hint">{blocked ?? (drying ? 'Turn the herbs as they glow' : 'Tap herbs while they glow')}</span>
        </div>
        <p className="mg-foot">Three picks {drying ? 'dry a bundle' : 'gather an herb'}. Pick without a miss for bonus XP{drying ? '' : ' and an extra herb'}. Misses cost nothing.</p>
      </div>
    </div>
  );
}
