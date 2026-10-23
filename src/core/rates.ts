// "Time to next level" estimates.
import type { SkillId } from '../data/items';
import { ACTIONS, actionsForSkill, type ActionDef } from '../data/skills';
import { actionDuration, skillLevel } from './idle';
import type { PlayerState } from './player';
import { levelProgress } from './xp';

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
    if (a.level > lvl) continue;
    if (!best || xpPerHour(p, a) > xpPerHour(p, best)) best = a;
  }
  return best;
}

export function timeToNextLevel(p: PlayerState, skill: SkillId): NextLevelEstimate | null {
  const prog = levelProgress(p.skills[skill].xp);
  if (prog.maxed) return null;
  const currentAction = p.idle ? ACTIONS[p.idle.actionId] : undefined;
  const current = currentAction?.skill === skill;
  const action = current ? currentAction! : bestAction(p, skill);
  if (!action) return null;
  const remainingXp = prog.needed - prog.into;
  const actionsNeeded = Math.ceil(remainingXp / action.xp);
  let ms = actionsNeeded * actionDuration(p, action);
  if (current && p.idle) ms -= p.idle.progressMs;
  return { ms: Math.max(0, ms), action, current };
}
