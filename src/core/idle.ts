// The idle system: one slot that repeats a chosen action. The same code runs
// while you play and when catching up on time you were away (offline progress).
import { ACTIONS, type ActionDef } from '../data/skills';
import { getItem, type SkillId } from '../data/items';
import { countInBag, countInBank, removeFromBag, canFitAll } from './inventory';
import { giveLoot, maxLoot, rollLoot } from './loot';
import type { PlayerState } from './player';
import { MAX_XP, levelForXp } from './xp';
import { equipmentStats } from './equipment';

export interface ProgressReport {
  actionId: string | null;
  /** Time that was simulated. */
  ms: number;
  actions: number;
  xp: Partial<Record<SkillId, number>>;
  gained: Record<string, number>;
  used: Record<string, number>;
  levelUps: { skill: SkillId; from: number; to: number }[];
  stopped: { reason: string; afterMs: number } | null;
}

export function skillLevel(p: PlayerState, skill: SkillId): number {
  return levelForXp(p.skills[skill].xp);
}

/** How long one action takes for this player (tools can speed it up). */
export function actionDuration(p: PlayerState, action: ActionDef): number {
  let speed = 0;
  if (action.skill === 'mining') speed = equipmentStats(p).miningSpeed ?? 0;
  return Math.max(500, Math.round(action.durationMs * (1 - speed / 100)));
}

/** Returns why this action can't be done right now, or null if it can. */
export function whyCantDo(p: PlayerState, action: ActionDef): string | null {
  if (skillLevel(p, action.skill) < action.level) {
    return `Needs level ${action.level}`;
  }
  for (const input of action.inputs) {
    if (countInBag(p.inventory, input.item) < input.qty) {
      const name = getItem(input.item).name;
      return countInBank(p, input.item) > 0
        ? `Out of ${name} in your bag (some is in the bank)`
        : `Out of ${name}`;
    }
  }
  // Check bag space after the inputs are used up.
  const bag = p.inventory.map((s) => (s ? { ...s } : null));
  for (const input of action.inputs) removeFromBag(bag, input.item, input.qty);
  if (!canFitAll(bag, maxLoot(action.lootTable))) return 'Your bag is full';
  return null;
}

export function startIdle(p: PlayerState, actionId: string): string | null {
  const action = ACTIONS[actionId];
  if (!action) return 'Unknown activity';
  const why = whyCantDo(p, action);
  if (why) return why;
  if (p.idle?.actionId !== actionId) p.idle = { actionId, progressMs: 0 };
  p.lastStop = null;
  return null;
}

export function stopIdle(p: PlayerState): void {
  p.idle = null;
}

export function emptyReport(actionId: string | null): ProgressReport {
  return { actionId, ms: 0, actions: 0, xp: {}, gained: {}, used: {}, levelUps: [], stopped: null };
}

/** Runs the idle slot forward by `ms` milliseconds. Changes the player. */
export function advanceIdle(p: PlayerState, ms: number, now = Date.now()): ProgressReport {
  const report = emptyReport(p.idle?.actionId ?? null);
  let remaining = Math.max(0, ms);
  let elapsed = 0;

  const stop = (actionId: string, reason: string) => {
    report.stopped = { reason, afterMs: elapsed };
    p.idle = null;
    p.lastStop = { actionId, reason, at: now - (ms - elapsed) };
  };

  while (p.idle && remaining > 0) {
    const action = ACTIONS[p.idle.actionId];
    if (!action) { p.idle = null; break; }

    const need = actionDuration(p, action) - p.idle.progressMs;
    if (remaining < need) {
      p.idle.progressMs += remaining;
      elapsed += remaining;
      remaining = 0;
      break;
    }
    remaining -= need;
    elapsed += need;
    p.idle.progressMs = 0;

    const why = whyCantDo(p, action);
    if (why) { stop(action.id, why); break; }

    // Use inputs
    for (const input of action.inputs) {
      removeFromBag(p.inventory, input.item, input.qty);
      report.used[input.item] = (report.used[input.item] ?? 0) + input.qty;
    }
    // Loot — always through the central loot system
    const loot = rollLoot(action.lootTable);
    giveLoot(p, loot);
    for (const st of loot) report.gained[st.id] = (report.gained[st.id] ?? 0) + st.qty;

    // XP and levels
    const skill = p.skills[action.skill];
    const before = levelForXp(skill.xp);
    skill.xp = Math.min(MAX_XP, skill.xp + action.xp);
    report.xp[action.skill] = (report.xp[action.skill] ?? 0) + action.xp;
    const after = levelForXp(skill.xp);
    if (after > before) {
      const existing = report.levelUps.find((l) => l.skill === action.skill);
      if (existing) existing.to = after;
      else report.levelUps.push({ skill: action.skill, from: before, to: after });
    }
    report.actions++;

    // Stop straight away if the next one can't happen (bag full, out of ore...)
    const next = whyCantDo(p, action);
    if (next) { stop(action.id, next); break; }
  }

  report.ms = elapsed;
  return report;
}
