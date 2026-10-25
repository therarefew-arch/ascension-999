// XP boosts that keep the early game snappy and stop skills from falling behind.
//  🌱 Apprentice's Zeal: ×3 XP below level 90, fading smoothly back to ×1 by level 180.
//  🧭 Catch-up: a skill behind your highest skill gets +10% XP for every 10 levels behind (up to +100%).
// Together they never go above ×4. Pet and bonfire bonuses stack on top (see addXp).
import type { SkillId } from '../data/items';
import type { PlayerState } from './player';
import { levelForXp } from './xp';

export const ZEAL = { mult: 3, fullUntil: 90, goneAt: 180 };
export const CATCH_UP = { per10: 0.1, max: 1 };
export const MAX_BOOST = 4;

export function zealMult(level: number): number {
  if (level < ZEAL.fullUntil) return ZEAL.mult;
  if (level >= ZEAL.goneAt) return 1;
  return ZEAL.mult - (ZEAL.mult - 1) * ((level - ZEAL.fullUntil) / (ZEAL.goneAt - ZEAL.fullUntil));
}

export function catchUpMult(level: number, highest: number): number {
  const behind = Math.max(0, highest - level);
  return 1 + Math.min(CATCH_UP.max, Math.floor(behind / 10) * CATCH_UP.per10);
}

export interface XpBoost {
  /** Everything together (what XP is multiplied by). */
  total: number;
  zeal: number;
  catchUp: number;
  /** The skill it's catching up to. */
  highestSkill: SkillId | null;
  highest: number;
}

export function xpBoost(p: PlayerState, skill: SkillId): XpBoost {
  const level = levelForXp(p.skills[skill].xp);
  let highest = level;
  let highestSkill: SkillId | null = null;
  for (const [s, v] of Object.entries(p.skills) as [SkillId, { xp: number }][]) {
    const l = levelForXp(v.xp);
    if (l > highest) { highest = l; highestSkill = s; }
  }
  const zeal = zealMult(level);
  const catchUp = catchUpMult(level, highest);
  return { total: Math.min(MAX_BOOST, zeal * catchUp), zeal, catchUp, highestSkill, highest };
}
