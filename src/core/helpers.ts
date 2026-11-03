// 🧰 The helper circle (data/helpers.ts): one skill's by-product boosts another skill.
// Helpers turn up through the loot system straight into the bank (so they never fill the bag) and are used up on their own,
// 1 per action, from the bag first, then the bank. The player can pause one from its skill screen.
import { HELPER, HELPER_FOR, type HelperDef } from '../data/helpers';
import type { SkillId } from '../data/items';
import type { ActionDef } from '../data/skills';
import { countInBag, countInBank, removeFromBag, removeFromBank } from './inventory';
import { giveLoot, rollLoot } from './loot';
import type { PlayerState } from './player';
import type { ProgressReport } from './idle';

/** How many of a helper you have (bag + bank). */
export function helperCount(p: PlayerState, h: HelperDef): number {
  return countInBag(p.inventory, h.id) + countInBank(p, h.id);
}

export function helperPaused(p: PlayerState, h: HelperDef): boolean {
  return p.helpersOff.includes(h.id);
}

/** Pause or resume using a helper. Returns true when it's now in use. */
export function toggleHelper(p: PlayerState, id: string): boolean {
  const i = p.helpersOff.indexOf(id);
  if (i >= 0) { p.helpersOff.splice(i, 1); return true; }
  p.helpersOff.push(id);
  return false;
}

/**
 * Uses up one helper for this action, if there is one for its skill. Enhancing helpers work on enhancing
 * attempts; every other helper only on the skill's normal actions (not tool upgrades).
 */
export function takeHelper(p: PlayerState, skill: SkillId, report: ProgressReport, action?: ActionDef): HelperDef | null {
  const h = HELPER_FOR[skill];
  if (!h || helperPaused(p, h)) return null;
  if (action && (skill === 'enhancing' ? action.kind !== 'enhance' : !!action.kind)) return null;
  if (removeFromBag(p.inventory, h.id, 1) < 1 && removeFromBank(p, h.id, 1) < 1) return null;
  report.used[h.id] = (report.used[h.id] ?? 0) + 1;
  return h;
}

/** 'extra' and 'save' helpers work this often. */
export const helperWorks = (h: HelperDef | null, effect: HelperDef['effect']) => !!h && h.effect === effect && Math.random() < HELPER.chance;

/** Now and then, training a skill turns up its helper (for another skill). */
export function dropHelper(p: PlayerState, skill: SkillId, report: ProgressReport) {
  const loot = rollLoot(`helper_${skill}`);
  if (!loot.length) return;
  giveLoot(p, loot, { toBank: true });
  for (const st of loot) report.gained[st.id] = (report.gained[st.id] ?? 0) + st.qty;
}
