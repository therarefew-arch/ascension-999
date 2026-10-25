// XP curve, cap 999. Built from time targets (one skill, idling its best basic action, no boosts):
//   town 2 (75) ≈ 6 h · town 3 (150) ≈ 24 h · town 5 (300) ≈ 96 h · all towns (750) ≈ 600 h
//   then the endgame, 750 → 999 ≈ 520 h more (slightly shorter than the journey).
// Each level's XP cost = hours that level should take × XP per hour at that level's tier.
// The early ×3 boost and catch-up bonus (core/boosts.ts) make the real game faster than this.
import { gatherXpPerHour, tierForLevel } from '../data/tiers';

export const MAX_LEVEL = 999;
/** Every town is open by this level; after it comes the endgame. */
export const JOURNEY_END = 750;

const JOURNEY_HOURS = 600;
const ENDGAME_HOURS = 520;
const A = JOURNEY_HOURS / Math.pow(JOURNEY_END - 1, 2);
const SLOPE_AT_END = 2 * A * (JOURNEY_END - 1);
const ENDGAME_LEVELS = MAX_LEVEL - JOURNEY_END;
const C = (ENDGAME_HOURS - SLOPE_AT_END * ENDGAME_LEVELS) / (ENDGAME_LEVELS * ENDGAME_LEVELS);

/** Target hours (one skill, no boosts) to reach a level. */
export function targetHours(level: number): number {
  if (level <= JOURNEY_END) return A * Math.pow(level - 1, 2);
  const d = level - JOURNEY_END;
  return JOURNEY_HOURS + SLOPE_AT_END * d + C * d * d;
}

/** The first XP curve (before v0.0.1.5). Early levels never cost more than this, so no save ever loses a level. */
const oldXpToNext = (level: number) => Math.round(0.5 * Math.pow(level, 2.2) + 10 * level);

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  const hours = targetHours(level + 1) - targetHours(level);
  const xp = Math.max(10, Math.round(hours * gatherXpPerHour(tierForLevel(level))));
  return level < 100 ? Math.min(xp, oldXpToNext(level)) : xp;
}

/** XP_AT[L] = total XP needed to reach level L. XP_AT[1] = 0. */
export const XP_AT: number[] = (() => {
  const table = [0, 0];
  for (let L = 1; L < MAX_LEVEL; L++) table.push(table[L] + xpToNext(L));
  return table;
})();

export const MAX_XP = XP_AT[MAX_LEVEL];

export function levelForXp(xp: number): number {
  let lo = 1;
  let hi = MAX_LEVEL;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (XP_AT[mid] <= xp) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export interface LevelProgress {
  level: number;
  xp: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level needs in total. */
  needed: number;
  /** 0..1 */
  fraction: number;
  maxed: boolean;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  if (level >= MAX_LEVEL) return { level, xp, into: 0, needed: 0, fraction: 1, maxed: true };
  const into = xp - XP_AT[level];
  const needed = XP_AT[level + 1] - XP_AT[level];
  return { level, xp, into, needed, fraction: into / needed, maxed: false };
}
