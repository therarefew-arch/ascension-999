// 🌦️ Weather on screen (v0.0.2.21): a layer over the town picture, a small Town card (what it does, when it
// changes, what's next, and the sky in the other towns you've found), and a chip in each skill's boost row.
import { useEffect, useState } from 'react';
import { SKILLS } from '../data/skills';
import type { SkillId } from '../data/items';
import { REGIONS } from '../data/tiers';
import type { WeatherDef } from '../data/weather';
import { nextWindow, weatherAt, weatherHere } from '../core/weather';
import { useGame } from '../core/store';
import { FoldHead, useFold } from './Fold';

/** Re-render when the weather window changes (checked once a minute). */
function useWeatherClock() {
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 60_000); return () => clearInterval(t); }, []);
}

const boostText = (w: WeatherDef) => {
  const skills = Object.keys(w.boost) as SkillId[];
  const parts = skills.length ? [`${skills.map((s) => SKILLS[s].name).join(' & ')} +${Math.round((w.boost[skills[0]] ?? 0) * 100)}% XP`] : [];
  if (w.stars && w.stars > 1) parts.push(`Lucky Stars ×${w.stars}`);
  return parts.join(' · ');
};

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Rain, snow, fog… drawn over the town picture. Purely for looks. */
export function WeatherLayer() {
  const { player } = useGame();
  useWeatherClock();
  const w = weatherHere(player);
  if (w.sky === 'none') return null;
  const drops = w.sky === 'rain' || w.sky === 'storm' ? 40 : w.sky === 'snow' || w.sky === 'ash' ? 22 : w.sky === 'stars' ? 18 : w.sky === 'wind' ? 7 : 0;
  return (
    <div className={`wx-layer wx-${w.sky}`} aria-hidden="true">
      {Array.from({ length: drops }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, ['--d' as string]: (0.6 + ((i * 7) % 5) * 0.12).toFixed(2), ['--k' as string]: ((i * 0.37) % 3).toFixed(2) }} />
      ))}
    </div>
  );
}

/** The Town card. */
export function WeatherCard() {
  const { player } = useGame();
  useWeatherClock();
  const [open, toggle] = useFold('weather', false);
  const now = Date.now();
  const w = weatherHere(player, now);
  const until = nextWindow(now);
  const next = weatherAt(player.location, until);
  const others = REGIONS.filter((r) => r !== player.location && player.regions.includes(r));
  return (
    <section className="today-card wx-card">
      <FoldHead title={<>{w.emoji} {w.name.toUpperCase()}</>} open={open} onToggle={toggle}
        summary={open ? `until ${clock(until)}` : boostText(w)} />
      {open && <>
        <p className="small muted wx-line">{w.line}</p>
        <div className="wx-boost"><b>{boostText(w)}</b> <span className="small muted">while you're in {player.location}</span></div>
        <div className="small muted">{next.id === w.id ? `Still ${w.name.toLowerCase()} after ${clock(until)}` : <>Next, from {clock(until)}: {next.emoji} {next.name} — {boostText(next)}</>}</div>
        {others.length > 0 && (
          <div className="wx-others">
            {others.map((r) => { const o = weatherAt(r, now); return (
              <span key={r} className="wx-town" title={boostText(o)}>{o.emoji} {r}</span>
            ); })}
          </div>
        )}
      </>}
    </section>
  );
}

/** Chip for a skill's boost row (null when the weather here doesn't favour it). */
export function WeatherChip({ skill }: { skill: SkillId }) {
  const { player } = useGame();
  const w = weatherHere(player);
  const b = w.boost[skill];
  if (!b) return null;
  return <span className="boost-chip wx" title={`${w.name} in ${player.location}: +${Math.round(b * 100)}% XP`}>{w.emoji} {w.name} +{Math.round(b * 100)}%</span>;
}

/** Emoji for a town on the travel map. */
export const weatherEmoji = (town: (typeof REGIONS)[number]) => weatherAt(town).emoji;
