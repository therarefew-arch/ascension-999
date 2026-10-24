// "Time to next level" estimates.
import type { SkillId } from '../data/items';
import { ACTIONS, actionsForSkill, type ActionDef } from '../data/skills';
import { actionDuration, skillLevel } from './idle';
import type { PlayerState } from './player';
import { levelProgress } from './xp';
import { countInBag, countInBank } from './inventory';

export interface NextLevelEstimate {
  ms: number;
  action: ActionDef;
  /** True if based on what you're doing right now; false if based on your best option. */
  current: boolean;
}

export function xpPerHour(p: PlayerState, action: ActionDef): number {
  return (action.xp / actionDuration(p, action)) * 3_600_000;
}

/** Best unlocked action for a skill, by XP per second. */
export function bestAction(p: PlayerState, skill: SkillId): ActionDef | null {
  const lvl = skillLevel(p, skill);
  let best: ActionDef | null = null;
  for (const a of actionsForSkill(skill)) {
    if (a.level > lvl || a.kind) continue; // upgrades depend on owning the item, so skip them
    if (!best || xpPerHour(p, a) > xpPerHour(p, best)) best = a;
  }
  return best;
}

/**
 * Actions to show for a skill. Upgrades only appear for items you own (bag or bank),
 * and only the next step for each item — otherwise Enhancing would list 120 options.
 */
export function visibleActions(p: PlayerState, skill: SkillId): ActionDef[] {
  return actionsForSkill(skill).filter((a) => {
    if (!a.upgrades) return true;
    const worn = Object.values(p.equipment).includes(a.upgrades) ? 1 : 0;
    return countInBag(p.inventory, a.upgrades) + countInBank(p, a.upgrades) + worn > 0;
  });
}

export function timeToNextLevel(p: PlayerState, skill: SkillId): NextLevelEstimate | null {
  const prog = levelProgress(p.skills[skill].xp);
  if (prog.maxed) return null;
  const slot = p.slots.find((s) => s && ACTIONS[s.actionId]?.skill === skill);
  const currentAction = slot ? ACTIONS[slot.actionId] : undefined;
  const current = !!currentAction;
  const action = currentAction ?? bestAction(p, skill);
  if (!action) return null;
  const remainingXp = prog.needed - prog.into;
  const actionsNeeded = Math.ceil(remainingXp / action.xp);
  let ms = actionsNeeded * actionDuration(p, action);
  if (slot) ms -= slot.progressMs;
  return { ms: Math.max(0, ms), action, current };
}
