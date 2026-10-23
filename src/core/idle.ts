// The idle system: one slot that repeats a chosen action. The same code runs
// while you play and when catching up on time you were away (offline progress).
import { ACTIONS, type ActionDef } from '../data/skills';
import { getItem, STAT_LABELS, type ItemStats, type SkillId } from '../data/items';
import { enhanceChance, FAIL_XP_SHARE } from './enhancing';
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
  /** Enhancing tries that didn't succeed (the item was kept). */
  failed: number;
}

export function skillLevel(p: PlayerState, skill: SkillId): number {
  return levelForXp(p.skills[skill].xp);
}

/** How long one action takes for this player (tools can speed it up). */
export function actionDuration(p: PlayerState, action: ActionDef): number {
  const statKey = `${action.skill}Speed` as keyof ItemStats;
  const speed = statKey in STAT_LABELS ? equipmentStats(p)[statKey] ?? 0 : 0;
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
      if (input.item === action.upgrades) {
        return countInBank(p, input.item) > 0 ? `Withdraw your ${name} from the bank to upgrade it` : `No ${name} in your bag to upgrade`;
      }
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
  return { actionId, ms: 0, actions: 0, xp: {}, gained: {}, used: {}, levelUps: [], stopped: null, failed: 0 };
}

/**
 * Finishes one action: uses inputs, rolls loot (through the central loot system), gives XP.
 * Used by idling and by the minigames. Call whyCantDo first.
 * `bonusRolls` = extra loot rolls (minigame bonuses); bonus items that don't fit are simply skipped.
 */
export function completeAction(
  p: PlayerState,
  action: ActionDef,
  report: ProgressReport,
  opts: { xpMult?: number; bonusRolls?: number; lootTable?: string; chanceBonus?: number } = {},
): boolean {
  // Enhancing can fail: then only the materials are used, the item itself stays.
  const success = action.kind !== 'enhance' || Math.random() < enhanceChance(p, action, opts.chanceBonus ?? 0);
  for (const input of action.inputs) {
    if (!success && input.item === action.upgrades) continue;
    removeFromBag(p.inventory, input.item, input.qty);
    report.used[input.item] = (report.used[input.item] ?? 0) + input.qty;
  }
  if (!success) {
    report.failed++;
    addXp(p, action, report, Math.round(action.xp * FAIL_XP_SHARE));
    report.actions++;
    return false;
  }
  for (let roll = 0; roll <= (opts.bonusRolls ?? 0); roll++) {
    const loot = rollLoot(opts.lootTable ?? action.lootTable);
    const leftover = giveLoot(p, loot);
    for (const st of loot) {
      const lost = leftover.find((l) => l.id === st.id)?.qty ?? 0;
      if (st.qty - lost > 0) report.gained[st.id] = (report.gained[st.id] ?? 0) + st.qty - lost;
    }
  }
  addXp(p, action, report, Math.round(action.xp * (opts.xpMult ?? 1)));
  report.actions++;
  return true;
}

function addXp(p: PlayerState, action: ActionDef, report: ProgressReport, xp: number) {
  const skill = p.skills[action.skill];
  const before = levelForXp(skill.xp);
  skill.xp = Math.min(MAX_XP, skill.xp + xp);
  report.xp[action.skill] = (report.xp[action.skill] ?? 0) + xp;
  const after = levelForXp(skill.xp);
  if (after > before) {
    const existing = report.levelUps.find((l) => l.skill === action.skill);
    if (existing) existing.to = after;
    else report.levelUps.push({ skill: action.skill, from: before, to: after });
  }
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

    completeAction(p, action, report);

    // Stop straight away if the next one can't happen (bag full, out of ore...)
    const next = whyCantDo(p, action);
    if (next) { stop(action.id, next); break; }
  }

  report.ms = elapsed;
  return report;
}
