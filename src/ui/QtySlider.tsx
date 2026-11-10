// 🎚️ Buy many at once (v0.0.2.30, owner: "sliders that fit the aesthetic in shops and seasonal shops… instead of
// spamming the buy button"). A gold coin-handle slider with quick chips (1 / 10 / ½ / Max) and a buy button that
// shows the total. Used by the Trading Post's Buy tab and the festival stall.
import { useEffect, useState, type ReactNode } from 'react';
import { sound } from '../audio/sound';

export function QtySlider({ max, unit, onBuy, label = 'Buy', start = 1 }: {
  /** The most you can buy right now (money, bag space…). 0 = can't buy any. */
  max: number;
  /** What one costs, for the total on the button: e.g. (n) => `${n * 30}g`. */
  unit: (n: number) => ReactNode;
  onBuy: (n: number) => void;
  label?: string;
  start?: number;
}) {
  const top = Math.max(0, Math.floor(max));
  const [n, setN] = useState(() => Math.min(top, Math.max(1, start)));
  // Keep the pick inside what you can afford as coins/space change.
  useEffect(() => { setN((v) => Math.max(top ? 1 : 0, Math.min(v, top))); }, [top]);
  if (top <= 0) return null;
  const set = (v: number) => {
    const c = Math.max(1, Math.min(top, Math.round(v)));
    if (c !== n) sound.play('tick', { volume: 0.18, rate: 0.8 + (c / top) * 0.7 });
    setN(c);
  };
  const pct = top <= 1 ? 100 : ((n - 1) / (top - 1)) * 100;
  const chips = [1, 10, Math.floor(top / 2), top].filter((v, i, a) => v >= 1 && v <= top && a.indexOf(v) === i);
  return (
    <div className="qs">
      <div className="qs-row">
        <input className="qs-range" type="range" min={1} max={Math.max(1, top)} step={1} value={n}
          style={{ ['--pct' as string]: `${pct}%` }} aria-label="How many" onChange={(e) => set(Number(e.target.value))} />
        <span className="qs-n mono">×{n.toLocaleString()}</span>
      </div>
      <div className="qs-row">
        <div className="qs-chips">
          {chips.map((v) => (
            <button key={v} className={`qs-chip ${v === n ? 'on' : ''}`} onClick={() => set(v)}>
              {v === top && top > 1 ? 'Max' : v === Math.floor(top / 2) && v !== 1 && v !== 10 ? '½' : v}
            </button>
          ))}
        </div>
        <button className="btn btn-primary qs-buy" onClick={() => { onBuy(n); }}>{label} {n.toLocaleString()} · {unit(n)}</button>
      </div>
    </div>
  );
}
