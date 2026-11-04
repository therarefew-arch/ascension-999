// 🌦️ Weather rules (v0.0.2.21). The sky in each town is worked out from the town, the date and a 4-hour window
// of the phone's clock, so nothing is saved and every phone agrees. The weather where you are counts.
import { CLIMATE, WEATHER, type WeatherDef, type WeatherId } from '../data/weather';
import type { SkillId } from '../data/items';
import type { Region } from '../data/tiers';
import type { PlayerState } from './player';

/** How long one spell of weather lasts. */
export const WEATHER_HOURS = 4;

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}

/** Start of the local 4-hour window that `now` is in. */
export function windowStart(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(Math.floor(d.getHours() / WEATHER_HOURS) * WEATHER_HOURS, 0, 0, 0);
  return d.getTime();
}
/** Start of the next window (handles clock changes by stepping a little past the end). */
export function nextWindow(now = Date.now()): number {
  return windowStart(windowStart(now) + (WEATHER_HOURS + 0.5) * 3600_000);
}

const isNightWindow = (start: number) => { const h = new Date(start).getHours(); return h >= 20 || h < 4; };

/** The weather in a town at a given time. */
export function weatherAt(town: Region, now = Date.now()): WeatherDef {
  if (import.meta.env?.DEV) { try { const t = localStorage.getItem('ui.weatherTest') as WeatherId | null; if (t && WEATHER[t]) return WEATHER[t]; } catch { /* no storage */ } } // dev only: try a weather
  const start = windowStart(now);
  const night = isNightWindow(start);
  const d = new Date(start);
  const key = `wx-${town}-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
  const pool = (Object.entries(CLIMATE[town] ?? { sunny: 1 }) as [WeatherId, number][])
    .filter(([id]) => night || !WEATHER[id].night);
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let roll = hashStr(key) % total;
  for (const [id, w] of pool) { if (roll < w) return WEATHER[id]; roll -= w; }
  return WEATHER[pool[0][0]];
}

/** The weather where you are now. */
export const weatherHere = (p: PlayerState, now = Date.now()) => weatherAt(p.location, now);

/** XP multiplier for a skill from the weather where you are. */
export function weatherXpMult(p: PlayerState, skill: SkillId, now = Date.now()): number {
  return 1 + (weatherHere(p, now).boost[skill] ?? 0);
}

/** Lucky Stars come this many times as often. */
export const weatherStarMult = (p: PlayerState, now = Date.now()) => weatherHere(p, now).stars ?? 1;
