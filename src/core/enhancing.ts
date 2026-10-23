// Enhancing success chances. Cozy rule: a failed try only uses the bars — the item is never lost.
import type { ActionDef } from '../data/skills';
import { getItem } from '../data/items';
import type { PlayerState } from './player';
import { levelForXp } from './xp';

/** Chance (0..1) that an enhance attempt succeeds. `bonus` comes from the Rune Align minigame. */
export function enhanceChance(p: PlayerState, action: ActionDef, bonus = 0): number {
  if (action.kind !== 'enhance' || !action.upgrades) return 1;
  const from = getItem(action.upgrades).upgrade?.level ?? 0;
  const over = Math.max(0, levelForXp(p.skills.enhancing.xp) - action.level);
  const chance = 0.95 - 0.07 * from + 0.002 * over + bonus;
  return Math.min(0.98, Math.max(0.25, chance));
}

/** Share of XP you still get when an attempt fails. */
export const FAIL_XP_SHARE = 0.25;
