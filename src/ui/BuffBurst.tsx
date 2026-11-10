// ✨ Seeing your boost (v0.0.2.31, owner: when you eat the apple "it doesn't show… you don't really get the physical
// satisfaction of seeing the stat"). Two pieces:
//  • BuffBurst — when you eat or drink something with a bonus, it pops up big in the middle of the screen with a
//    sparkle ring and the bonus floats up ("+2% XP · all skills · 30:00"). Mounted once in App.
//  • ActiveBoosts — a strip at the top of the bag: every bonus running now, with a countdown and a draining bar;
//    the one you just ate glows.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getItem } from '../data/items';
import { activeBuffs, buffText } from '../core/buffs';
import { useGame } from '../core/store';
import { sound } from '../audio/sound';

interface Burst { id: string; until: number; key: number }
let listener: ((b: Burst) => void) | null = null;
let lastAte: { id: string; at: number } | null = null;

/** Call after a bonus item was eaten/drunk successfully. */
export function showBuffBurst(id: string, until: number) {
  lastAte = { id, at: Date.now() };
  listener?.({ id, until, key: Date.now() });
}

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
};

export function BuffBurst() {
  const [b, setB] = useState<Burst | null>(null);
  useEffect(() => {
    listener = (x) => {
      setB(x);
      sound.play('zap', { volume: 0.5, rate: 1.05 });
      window.setTimeout(() => sound.play('ding', { rate: 1.5, volume: 0.35 }), 180);
    };
    return () => { listener = null; };
  }, []);
  useEffect(() => {
    if (!b) return;
    const t = window.setTimeout(() => setB(null), 2200);
    return () => clearTimeout(t);
  }, [b]);
  if (!b) return null;
  const item = getItem(b.id);
  const buff = item.buff;
  if (!buff) return null;
  return createPortal(
    <div className="bb-wrap" key={b.key} aria-live="polite">
      <div className="bb-ring" />
      <div className="bb-rays" />
      <div className="bb-emoji">{item.emoji ?? '✨'}</div>
      <div className="bb-text">
        <b>{buffText(buff)}</b>
        <span className="mono">⏳ {clock(b.until - Date.now())}</span>
      </div>
      {Array.from({ length: 10 }, (_, i) => <i key={i} className="bb-spark" style={{ ['--a' as string]: `${i * 36}deg` }} />)}
    </div>,
    document.body,
  );
}

/** Bonuses running now, for the top of the bag. Hidden when there are none. */
export function ActiveBoosts() {
  const { player } = useGame();
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const now = Date.now();
  const list = activeBuffs(player, now);
  if (!list.length) return null;
  return (
    <div className="ab-strip">
      <div className="tiny muted ab-head">✨ Active boosts</div>
      {list.map((a) => {
        const item = getItem(a.item);
        const total = a.buff.minutes * 60_000;
        const left = a.until - now;
        const fresh = lastAte && lastAte.id === a.item && now - lastAte.at < 4000;
        return (
          <div key={a.item + a.until} className={`ab-chip ${fresh ? 'fresh' : ''}`}>
            <span className="ab-emoji">{item.emoji ?? '✨'}</span>
            <div className="grow">
              <div className="small"><b>{buffText(a.buff)}</b></div>
              <div className="ab-bar"><div className="ab-fill" style={{ width: `${Math.min(100, (left / Math.max(total, left)) * 100)}%` }} /></div>
            </div>
            <span className="mono small ab-time">{clock(left)}</span>
          </div>
        );
      })}
    </div>
  );
}
