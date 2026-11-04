// 🎡 The festival Prize Wheel (v0.0.2.24): spin leftover tokens for prizes. Slices are sized by their real odds.
import { useEffect, useRef, useState } from 'react';
import { WHEEL, WHEEL_COST, type FestivalDef } from '../data/festivals';
import { getItem } from '../data/items';
import { tokensHave, wheelCoins, whyCantSpin, type WheelResult } from '../core/festivals';
import { game, useGame } from '../core/store';
import { sound } from '../audio/sound';
import { fmtNum } from './format';

const COLORS = ['#b45309', '#7c2d12', '#a16207', '#9a3412', '#15803d', '#1d4ed8', '#7e22ce', '#be185d'];
const TOTAL = WHEEL.reduce((s, w) => s + w.weight, 0);
// Each slice's start and end, in degrees clockwise from the top.
const SPANS = (() => {
  let a = 0;
  return WHEEL.map((w) => { const s = a; a += (w.weight / TOTAL) * 360; return [s, a] as const; });
})();
const GRADIENT = `conic-gradient(${SPANS.map(([s, e], i) => `${COLORS[i]} ${s}deg ${e}deg`).join(', ')})`;
// Which result to land on for a ×10 spin: the most exciting one.
const RANK = ['treasure', 'coins8', 'tokens', 'helpers', 'coins3', 'find', 'treat', 'coins'];
const SPIN_MS = 2800;

function describe(results: WheelResult[]): string {
  const sum: Record<string, number> = {};
  for (const r of results) for (const st of r.got) sum[st.id] = (sum[st.id] ?? 0) + st.qty;
  return Object.entries(sum).map(([id, n]) => (id === 'coins' ? `+${fmtNum(n)} coins` : `${n}× ${getItem(id).emoji ?? ''} ${getItem(id).name}`)).join(' · ');
}

export function PrizeWheel({ f }: { f: FestivalDef }) {
  const { player } = useGame();
  const [rot, setRot] = useState(0);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<{ text: string; big: boolean } | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);
  const have = tokensHave(player, f);

  const spin = (n: number) => {
    if (busy) return;
    const res = game.spinWheel(n);
    if (!res) return;
    const land = [...res].sort((a, b) => RANK.indexOf(WHEEL[a.slice].prize) - RANK.indexOf(WHEEL[b.slice].prize))[0];
    const [s, e] = SPANS[land.slice];
    const at = s + (e - s) * (0.2 + Math.random() * 0.6); // somewhere inside the slice
    const next = rot - (rot % 360) + 360 * 5 + (360 - at);
    setBusy(true);
    setShown(null);
    setRot(next);
    sound.play('riffle', { volume: 0.6 });
    // Clicks that slow down as the wheel does.
    let t = 0;
    for (let k = 0; k < 18; k++) {
      t += 40 + k * k * 1.6;
      if (t > SPIN_MS - 150) break;
      timers.current.push(window.setTimeout(() => sound.play('tick', { rate: 1.3 - k * 0.02, volume: 0.5 }), t));
    }
    timers.current.push(window.setTimeout(() => {
      const big = res.some((r) => ['treasure', 'coins8'].includes(WHEEL[r.slice].prize));
      setShown({ text: (n > 1 ? `${n} spins: ` : `${WHEEL[land.slice].emoji} `) + describe(res), big });
      setBusy(false);
      if (big) game.wheelCheer();
      else sound.play('coin');
    }, SPIN_MS));
  };

  const why1 = whyCantSpin(player, 1);
  const why10 = whyCantSpin(player, 10);
  const c = wheelCoins(player);
  return (
    <div className="pw">
      <div className="pw-head">
        <b>🎡 PRIZE WHEEL</b>
        <span className="small muted">{f.token.emoji} {WHEEL_COST} a spin</span>
      </div>
      <div className="pw-stage">
        <div className="pw-pointer" aria-hidden="true">▼</div>
        <div className="pw-wheel" style={{ background: GRADIENT, transform: `rotate(${rot}deg)`, transitionDuration: busy ? `${SPIN_MS}ms` : '0ms' }}>
          {WHEEL.map((w, i) => {
            const [s, e] = SPANS[i];
            const mid = (s + e) / 2;
            const small = e - s < 20;
            return (
              <span key={w.prize} className={`pw-emoji ${small ? 'sm' : ''}`} style={{ transform: `rotate(${mid}deg) translateY(${small ? -92 : -72}px)` }}>
                <span style={{ transform: `rotate(${-mid}deg)` }}>{w.emoji}</span>
              </span>
            );
          })}
          <div className="pw-hub">{f.token.emoji}</div>
        </div>
      </div>
      <div className={`pw-result ${shown?.big ? 'big' : ''}`} role="status">
        {busy ? 'Round and round it goes…' : shown ? shown.text : 'Spin your leftover tokens for prizes!'}
      </div>
      <div className="btn-pair">
        <button className="btn btn-primary" disabled={busy || !!why1} title={why1 ?? undefined} onClick={() => spin(1)}>Spin · {f.token.emoji} {WHEEL_COST}</button>
        <button className="btn" disabled={busy || !!why10} title={why10 ?? undefined} onClick={() => spin(10)}>×10 · {f.token.emoji} {WHEEL_COST * 10}</button>
      </div>
      <div className="pw-odds small muted">
        {WHEEL.map((w) => (
          <span key={w.prize}>
            {w.emoji} {w.prize === 'coins' ? `${fmtNum(c)} coins` : w.prize === 'coins3' ? `${fmtNum(c * 3)} coins` : w.prize === 'coins8' ? `${fmtNum(c * 8)} coins` : w.label} <b>{Math.round((w.weight / TOTAL) * 100)}%</b>
          </span>
        ))}
      </div>
      {have < WHEEL_COST && <p className="small dim center">Everything you do can turn up more {f.token.name.toLowerCase()}s.</p>}
    </div>
  );
}
