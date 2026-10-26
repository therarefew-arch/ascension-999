// 📖 The Fishing Journal: every rare fish you've caught, how many, and your biggest one.
import { RARE_FISH_MAP } from '../data/rareFish';
import type { PlayerState } from './player';

export interface RareCatch { id: string; cm: number; first: boolean; record: boolean }

/** Writes a rare catch into the journal with a random size (big ones are rarer). */
export function recordRareFish(p: PlayerState, id: string, rng: () => number = Math.random): RareCatch | null {
  const f = RARE_FISH_MAP[id];
  if (!f) return null;
  const cm = Math.round((f.minCm + (f.maxCm - f.minCm) * Math.pow(rng(), 2)) * 10) / 10;
  const entry = p.fishJournal[id];
  const first = !entry;
  const record = !!entry && cm > entry.best;
  p.fishJournal[id] = { n: (entry?.n ?? 0) + 1, best: Math.max(entry?.best ?? 0, cm) };
  return { id, cm, first, record };
}
