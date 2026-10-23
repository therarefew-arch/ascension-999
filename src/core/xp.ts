// XP curve. Cap is 500. Tuned so one skill takes roughly 876 hours to max
// once all 11 tiers exist (about 6h to level 50, 35h to 100). See docs/design.md.

export const MAX_LEVEL = 500;
export const TIER_EVERY = 50;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(0.5 * Math.pow(level, 2.2) + 10 * level);
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
