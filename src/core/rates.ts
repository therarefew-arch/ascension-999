// "Time to next level" estimates.
import type { SkillId } from '../data/items';
import { ACTIONS, actionsForSkill, type ActionDef } from '../data/skills';
import { actionDuration, skillLevel } from './idle';
import type { PlayerState } from './player';
import { levelForXp, levelProgress, MAX_LEVEL, XP_AT } from './xp';
import { catchUpMult, MAX_BOOST, xpBoost, zealMult } from './boosts';
import { PET_XP_BONUS, petBoosts } from '../data/pets';
import { countInBag, countInBank } from './inventory';
import { REGIONS, regionOpen } from '../data/tiers';

export interface NextLevelEstimate {
  ms: number;
  action: ActionDef;
  /** True if based on what you're doing right now; false if based on your best option. */
  current: boolean;
}

/** Real XP per hour for an action — includes the early boost, catch-up bonus, pet and bonfire. */
export function xpPerHour(p: PlayerState, action: ActionDef): number {
  return ((action.xp * xpBoost(p, action.skill).total * extraMult(p, action.skill)) / actionDuration(p, action)) * 3_600_000;
}

/** Best unlocked action for a skill, by XP per second. */
export function bestAction(p: PlayerState, skill: SkillId): ActionDef | null {
  const lvl = skillLevel(p, skill);
  let best: ActionDef | null = null;
  for (const a of actionsForSkill(skill)) {
    if (a.level > lvl || a.kind || !regionOpen(a.region)) continue; // upgrades depend on owning the item, so skip them
    if (!best || xpPerHour(p, a) > xpPerHour(p, best)) best = a;
  }
  return best;
}

/**
 * Actions to show for a skill. Upgrades only appear for items you own (bag or bank),
 * and only the next step for each item — otherwise Enhancing would list 120 options.
 */
export function visibleActions(p: PlayerState, skill: SkillId): ActionDef[] {
  // Show open regions, plus a peek at the next region (locked) so you can see what's coming.
  const nextRegion = REGIONS.find((r) => !regionOpen(r));
  return actionsForSkill(skill).filter((a) => {
    if (a.region && !regionOpen(a.region) && a.region !== nextRegion) return false;
    if (!a.upgrades) return true;
    const worn = Object.values(p.equipment).includes(a.upgrades) ? 1 : 0;
    return countInBag(p.inventory, a.upgrades) + countInBank(p, a.upgrades) + worn > 0;
  });
}

export function timeToNextLevel(p: PlayerState, skill: SkillId): NextLevelEstimate | null {
  const prog = levelProgress(p.skills[skill].xp);
  if (prog.maxed) return null;
  return timeForXp(p, skill, prog.level + 1);
}

/** How long until a skill reaches a target level (🎯 goals), at the current or best pace. */
export function timeToLevel(p: PlayerState, skill: SkillId, target: number): NextLevelEstimate | null {
  if (XP_AT[Math.min(MAX_LEVEL, target)] - p.skills[skill].xp <= 0) return null;
  return timeForXp(p, skill, Math.min(MAX_LEVEL, target));
}

/** Time to reach `target`, level by level — the early boost fades as you climb, so later levels are counted at their own rate. */
function timeForXp(p: PlayerState, skill: SkillId, target: number): NextLevelEstimate | null {
  const slot = p.slots.find((s) => s && ACTIONS[s.actionId]?.skill === skill);
  const currentAction = slot ? ACTIONS[slot.actionId] : undefined;
  const current = !!currentAction;
  const action = currentAction ?? bestAction(p, skill);
  if (!action) return null;
  const boost = xpBoost(p, skill);
  const perAction = action.xp * extraMult(p, skill);
  const msPerAction = actionDuration(p, action);
  let xp = p.skills[skill].xp;
  let ms = 0;
  for (let L = levelForXp(xp); L < target; L++) {
    const need = XP_AT[L + 1] - Math.max(xp, XP_AT[L]);
    const mult = Math.min(MAX_BOOST, zealMult(L) * catchUpMult(L, boost.highest));
    ms += (need / (perAction * mult)) * msPerAction;
    xp = XP_AT[L + 1];
  }
  if (slot) ms -= slot.progressMs;
  return { ms: Math.max(0, ms), action, current };
}

/** Pet and bonfire bonuses (the boosts are counted separately). */
function extraMult(p: PlayerState, skill: SkillId) {
  let m = 1;
  if (petBoosts(p.activePet, skill)) m *= 1 + PET_XP_BONUS;
  if (p.bonfire && p.bonfire.until > Date.now()) m *= 1.05;
  return m;
}
