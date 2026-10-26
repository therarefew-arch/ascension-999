// The skill minigames. Relaxed and forgiving: misses never cost anything.
import { useEffect, useRef, useState } from 'react';
import { getItem } from '../data/items';
import type { ActionDef } from '../data/skills';
import { whyCantDo } from '../core/idle';
import { ANVIL_RHYTHM, STRIKE_VEIN, type HitGrade } from '../core/minigames';
import { game, useGame, type MinigameResult } from '../core/store';
import { ItemIcon, UiIcon } from './icons';
import { sound } from '../audio/sound';

interface Feedback { id: number; text: string; kind: HitGrade | 'combo' | 'info' }

export function useFeedback() {
  const [items, setItems] = useState<Feedback[]>([]);
  const nextId = useRef(1);
  const push = (text: string, kind: Feedback['kind']) => {
    const id = nextId.current++;
    setItems((list) => [...list.slice(-2), { id, text, kind }]);
    setTimeout(() => setItems((list) => list.filter((f) => f.id !== id)), 1300);
  };
  return { items, push };
}

export function gainText(r: MinigameResult) {
  const parts = Object.entries(r.gained).map(([id, n]) => `+${n} ${getItem(id).name}`);
  return parts.length ? `${parts.join(' · ')}  +${r.xp} XP` : `+${r.xp} XP`;
}

export function FeedbackLayer({ items }: { items: Feedback[] }) {
  return (
    <div className="mg-feedback" aria-live="polite">
      {items.map((f) => <div key={f.id} className={`mg-float mg-${f.kind}`}>{f.text}</div>)}
    </div>
  );
}

/** Animation clock that keeps running while the component is on screen. */
export function useAnimationTime() {
  const [, setFrame] = useState(0);
  const start = useRef(performance.now());
  useEffect(() => {
    let raf = 0;
    const loop = () => { setFrame((f) => (f + 1) % 1_000_000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return { now: performance.now(), reset: () => { start.current = performance.now(); }, start };
}

// ---------------------------------------------------------------------------
// Mining — Strike Vein
// ---------------------------------------------------------------------------
export function StrikeVein({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const clock = useAnimationTime();
  const [zoneCenter, setZoneCenter] = useState(0.5);
  const [combo, setCombo] = useState(0);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [shake, setShake] = useState(0);
  const blocked = whyCantDo(player, action, { manual: true });

  // Marker glides back and forth (0 → 1 → 0).
  const t = ((pausedAt ?? clock.now) - clock.start.current) / 1000 / STRIKE_VEIN.sweepSeconds;
  const phase = t % 2;
  const pos = phase < 1 ? phase : 2 - phase;

  const strike = () => {
    if (pausedAt !== null || blocked) return;
    const dist = Math.abs(pos - zoneCenter);
    const grade: HitGrade = dist <= STRIKE_VEIN.perfectZone / 2 ? 'perfect' : dist <= STRIKE_VEIN.zone / 2 ? 'good' : 'miss';
    setPausedAt(clock.now);
    setTimeout(() => {
      // Resume from the same spot so the marker doesn't jump.
      clock.start.current += performance.now() - (clock.now);
      setPausedAt(null);
    }, STRIKE_VEIN.pauseMs);

    // Pickaxe on stone every swing — a clean hit rings higher.
    sound.play('pickaxe', grade === 'miss' ? { rate: 0.8, volume: 0.55 } : { rate: grade === 'perfect' ? 1.12 : 1 });
    if (grade === 'miss') {
      setCombo(0);
      push('So close! Try again', 'miss');
      return;
    }
    const nextCombo = combo + 1;
    const comboHit = nextCombo % STRIKE_VEIN.comboEvery === 0;
    const base = STRIKE_VEIN.rewards[grade];
    const result = game.minigameReward(action.id, {
      xpMult: base.xpMult,
      bonusRolls: base.bonusRolls + (comboHit ? STRIKE_VEIN.comboBonusRolls : 0),
    });
    if (!result.ok) return;
    setCombo(nextCombo);
    setShake((s) => s + 1);
    push(grade === 'perfect' ? `PERFECT!  ${gainText(result)}` : gainText(result), grade);
    if (comboHit) push(`Combo ×${nextCombo}! Bonus ore!`, 'combo');
    // Move the gold zone somewhere new for variety.
    setZoneCenter(0.2 + Math.random() * 0.6);
  };

  return (
    <div className="mg">
      <div className="mg-stage">
        <div key={shake} className={`mg-rock ${shake ? 'hit' : ''}`}>
          <ItemIcon id={action.iconItem} size={72} />
        </div>
        <div className="mg-stage-name">{action.name}</div>
        <div className="mg-stage-xp">+{action.xp} XP per strike</div>
        <FeedbackLayer items={items} />
      </div>

      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Strike Timing</span>
          <span className="mg-hint">{combo > 0 ? `Combo ×${combo}` : 'Chain hits for combo bonus ore!'}</span>
        </div>
        <div className="strike-bar">
          <div className="strike-zone" style={{ left: `${(zoneCenter - STRIKE_VEIN.zone / 2) * 100}%`, width: `${STRIKE_VEIN.zone * 100}%` }}>
            <div className="strike-perfect" style={{ width: `${(STRIKE_VEIN.perfectZone / STRIKE_VEIN.zone) * 100}%` }} />
          </div>
          <div className="strike-marker" style={{ left: `calc(${pos * 100}% - 4px)` }} />
        </div>
        <button className="btn btn-hero btn-xl" onClick={strike} disabled={!!blocked} data-silent>
          <UiIcon name="mining" size={24} /> {blocked ?? 'STRIKE VEIN'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Smithing — Anvil Rhythm
// ---------------------------------------------------------------------------
export function AnvilRhythm({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const clock = useAnimationTime();
  const [hits, setHits] = useState<HitGrade[]>([]);
  const blocked = whyCantDo(player, action, { manual: true });

  // The ring shrinks from big to small; it lines up with the anvil at 75% of the way.
  const TARGET = 0.75;
  const t = (((clock.now - clock.start.current) / 1000) / ANVIL_RHYTHM.ringSeconds) % 1.15;
  const ringScale = 2.2 - 1.6 * Math.min(t, 1);
  const glow = Math.max(0, 1 - Math.abs(t - TARGET) * 6);

  // Reset progress if the recipe changes.
  useEffect(() => { setHits([]); }, [action.id]);

  const hammer = () => {
    if (blocked) return;
    const off = Math.abs(t - TARGET) * ANVIL_RHYTHM.ringSeconds;
    const grade: HitGrade = off <= ANVIL_RHYTHM.perfectWindow ? 'perfect' : off <= ANVIL_RHYTHM.goodWindow ? 'good' : 'miss';
    clock.reset();
    // Hammer on anvil every swing: a perfect hit rings bright, a mistimed one is a dull tap.
    sound.play('anvil', grade === 'miss' ? { rate: 0.82, volume: 0.45 } : { rate: grade === 'perfect' ? 1.1 : 1 });
    // Every tap counts (owner's wish) — a mistimed one is just a bit rough, not wasted.
    const next = [...hits, grade];
    if (next.length < ANVIL_RHYTHM.hitsNeeded) {
      setHits(next);
      push(grade === 'perfect' ? 'Perfect clang!' : grade === 'good' ? 'Clang!' : 'A bit rough — still counts', grade);
      return;
    }
    const perfects = next.filter((g) => g === 'perfect').length;
    const masterwork = perfects === ANVIL_RHYTHM.hitsNeeded;
    const result = game.minigameReward(action.id, {
      xpMult: 1 + perfects * ANVIL_RHYTHM.xpPerPerfect,
      bonusRolls: masterwork ? ANVIL_RHYTHM.masterworkBonusRolls : 0,
    });
    setHits([]);
    if (!result.ok) return;
    push(masterwork ? `MASTERWORK!  ${gainText(result)}` : gainText(result), masterwork ? 'combo' : 'good');
  };

  return (
    <div className="mg">
      <div className="mg-stage">
        <div className="anvil-wrap">
          <div className="anvil-ring" style={{ transform: `scale(${ringScale})`, opacity: t > 1 ? 0 : 0.35 + glow * 0.65 }} />
          <div className="anvil-target" style={{ boxShadow: `0 0 ${8 + glow * 30}px rgba(245, 158, 11, ${0.25 + glow * 0.6})` }}>
            <ItemIcon id={action.iconItem} size={60} />
          </div>
        </div>
        <div className="mg-stage-name">{action.name}</div>
        <div className="mg-stage-xp">+{action.xp} XP · {action.inputs.map((i) => `${i.qty} ${getItem(i.item).name}`).join(' + ')}</div>
        <div className="pips">
          {Array.from({ length: ANVIL_RHYTHM.hitsNeeded }, (_, i) => (
            <span key={i} className={`pip ${hits[i] ?? ''}`} />
          ))}
        </div>
        <FeedbackLayer items={items} />
      </div>

      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Anvil Rhythm</span>
          <span className="mg-hint">Tap as the ring glows on the anvil</span>
        </div>
        <button className="btn btn-hero btn-xl" onClick={hammer} disabled={!!blocked} data-silent>
          <UiIcon name="smithing" size={24} /> {blocked ?? 'HAMMER'}
        </button>
        <p className="mg-foot">Every tap counts — 3 taps finish the item. Tap as the ring glows for clean hits: 3 perfect = a masterwork bonus.</p>
      </div>
    </div>
  );
}
