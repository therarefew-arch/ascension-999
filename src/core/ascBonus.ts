// 🌟 Reading the bonuses on worn Ascended items. Kept apart from ascension.ts (drops) so the
// loot system can use it too without the two importing each other.
import { isTownBonus, type BonusKey } from '../data/ascended';
import { ITEMS, type SkillId } from '../data/items';
import type { PlayerState } from './player';

/** Skill-bound bonuses only count on the tool for that skill. */
const SKILL_BOUND: BonusKey[] = ['sp', 'dr', 'xp', 'rf', 'th', 'td'];

/**
 * Adds up a bonus across worn Ascended items. Skill-bound ones need the matching skill's tool.
 * 🗺️ Town bonuses count once: wearing two only gives the stronger one.
 */
export function ascBonus(p: PlayerState, key: BonusKey, skill?: SkillId): number {
  const town = isTownBonus(key);
  let total = 0;
  for (const id of Object.values(p.equipment)) {
    const a = id ? ITEMS[id]?.ascended : undefined;
    if (!a) continue;
    if (SKILL_BOUND.includes(key) && a.base.skill !== skill) continue;
    for (const b of a.bonuses) if (b.key === key) total = town ? Math.max(total, b.value) : total + b.value;
  }
  return total;
}
