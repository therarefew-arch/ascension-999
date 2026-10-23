// The idle system: one slot that repeats a chosen action. The same code runs
// while you play and when catching up on time you were away (offline progress).
// Also holds the shared rules every action follows: levels, tools, materials, the cooking fire.
import { ACTIONS, type ActionDef } from '../data/skills';
import {
  CRAFTED_TOOLS, getItem, STAT_LABELS, TOOL_SLOT_FOR, TOOL_TIERS, toolName,
  type EquipSlot, type ItemStats, type SkillId,
} from '../data/items';
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

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

/** Tier of the tool equipped for a skill (-1 = none). */
export function equippedToolTier(p: PlayerState, skill: SkillId): number {
  const slot = TOOL_SLOT_FOR[skill];
  const id = slot ? p.equipment[slot] : undefined;
  return id ? getItem(id).equip?.toolTier ?? 0 : -1;
}

function toolNeededText(skill: SkillId, tier: number): string {
  const tool = CRAFTED_TOOLS.find((t) => t.skill === skill);
  const tierDef = TOOL_TIERS[Math.min(tier, TOOL_TIERS.length - 1)];
  return tool ? `Equip a ${toolName(tierDef, tool)} (or better)` : 'Needs a better tool';
}

/** Where an upgrade's item is: in the bag, or worn in a gear slot (upgrade in place). */
function upgradeSource(p: PlayerState, action: ActionDef): 'bag' | EquipSlot | null {
  if (!action.upgrades) return null;
  if (countInBag(p.inventory, action.upgrades) > 0) return 'bag';
  const slot = getItem(action.upgrades).equip?.slot;
  return slot && p.equipment[slot] === action.upgrades ? slot : null;
}

// ---------------------------------------------------------------------------
// The cooking fire
// ---------------------------------------------------------------------------

/** How long one log keeps the cooking fire going, and the colour of its flame. */
export const FIRE_LOGS: Record<string, { heatMs: number; color: string; burnAction: string }> = {
  pine_logs: { heatMs: 20_000, color: '#f97316', burnAction: 'burn_pine' },
  oak_logs: { heatMs: 40_000, color: '#fbbf24', burnAction: 'burn_oak' },
};
export const MAX_FIRE_MS = 120_000;

/** Logs in the bag this player is able to burn (Firemaking level and tinderbox allowing). */
export function usableFireLogs(p: PlayerState): string[] {
  return Object.entries(FIRE_LOGS)
    .filter(([log, f]) => countInBag(p.inventory, log) > 0 && !whyCantDo(p, ACTIONS[f.burnAction]))
    .map(([log]) => log);
}

/**
 * Feeds one log to the cooking fire. Gives Firemaking XP for that log (like burning it).
 * Better logs and a higher Firemaking level burn longer. Returns a reason if it can't.
 */
export function stokeFire(p: PlayerState, report: ProgressReport, log?: string): string | null {
  const logs = usableFireLogs(p);
  const chosen = log && logs.includes(log) ? log : logs[logs.length - 1]; // default: the best log you have
  if (!chosen) return 'No logs you can burn in your bag';
  if (p.fire.heatMs >= MAX_FIRE_MS - 1000) return 'The fire is already roaring';
  completeAction(p, ACTIONS[FIRE_LOGS[chosen].burnAction], report);
  const bonus = 1 + skillLevel(p, 'firemaking') / 250;
  p.fire.heatMs = Math.min(MAX_FIRE_MS, Math.max(0, p.fire.heatMs) + FIRE_LOGS[chosen].heatMs * bonus);
  p.fire.log = chosen;
  return null;
}

export function drainFire(p: PlayerState, ms: number) {
  p.fire.heatMs = Math.max(0, p.fire.heatMs - ms);
}

// ---------------------------------------------------------------------------
// Can it be done?
// ---------------------------------------------------------------------------

/**
 * Returns why this action can't be done right now, or null if it can.
 * `manual` = played by hand (minigame): the cooking fire must already be lit.
 * While idling, the fire is fed automatically from logs in the bag.
 */
export function whyCantDo(p: PlayerState, action: ActionDef, opts: { manual?: boolean } = {}): string | null {
  if (skillLevel(p, action.skill) < action.level) return `Needs level ${action.level}`;
  if (action.needsTool !== undefined && equippedToolTier(p, action.skill) < action.needsTool) {
    return toolNeededText(action.skill, action.needsTool);
  }
  const fromSlot = upgradeSource(p, action);
  for (const input of action.inputs) {
    const name = getItem(input.item).name;
    if (input.item === action.upgrades) {
      if (!fromSlot) {
        return countInBank(p, input.item) > 0 ? `Withdraw your ${name} from the bank to upgrade it` : `You need a ${name} to upgrade`;
      }
      continue;
    }
    if (countInBag(p.inventory, input.item) < input.qty) {
      return countInBank(p, input.item) > 0 ? `Out of ${name} in your bag (some is in the bank)` : `Out of ${name}`;
    }
  }
  if (action.skill === 'cooking' && p.fire.heatMs <= 0) {
    if (opts.manual) return 'The fire is out — stoke it with logs';
    if (usableFireLogs(p).length === 0) return 'No logs to keep the cooking fire going';
  }
  // Bag space after the inputs are used up. Upgrading a worn item puts the result straight back in its slot.
  if (fromSlot && fromSlot !== 'bag') return null;
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
 * Upgrades of a worn item happen in place: the improved item goes straight back into its gear slot.
 */
export function completeAction(
  p: PlayerState,
  action: ActionDef,
  report: ProgressReport,
  opts: { xpMult?: number; bonusRolls?: number; lootTable?: string; chanceBonus?: number } = {},
): boolean {
  const fromSlot = upgradeSource(p, action);
  // Enhancing can fail: then only the materials are used, the item itself stays.
  const success = action.kind !== 'enhance' || Math.random() < enhanceChance(p, action, opts.chanceBonus ?? 0);
  for (const input of action.inputs) {
    if (input.item === action.upgrades) {
      if (!success) continue;
      if (fromSlot && fromSlot !== 'bag') delete p.equipment[fromSlot];
      else removeFromBag(p.inventory, input.item, input.qty);
    } else {
      removeFromBag(p.inventory, input.item, input.qty);
    }
    report.used[input.item] = (report.used[input.item] ?? 0) + input.qty;
  }
  if (!success) {
    report.failed++;
    addXp(p, action, report, Math.round(action.xp * FAIL_XP_SHARE));
    report.actions++;
    return false;
  }
  for (let roll = 0; roll <= (opts.bonusRolls ?? 0); roll++) {
    let loot = rollLoot(opts.lootTable ?? action.lootTable);
    // Upgrading worn gear: the improved item goes back into the same slot.
    if (roll === 0 && fromSlot && fromSlot !== 'bag' && action.output) {
      const made = loot.find((l) => l.id === action.output!.item);
      if (made) {
        p.equipment[fromSlot] = made.id;
        report.gained[made.id] = (report.gained[made.id] ?? 0) + 1;
        loot = loot.filter((l) => l !== made);
      }
    }
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

export function addXp(p: PlayerState, action: { skill: SkillId }, report: ProgressReport, xp: number) {
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

    const duration = actionDuration(p, action);
    const need = duration - p.idle.progressMs;
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

    // Cooking: keep the fire fed from the bag, and let it burn down as you cook.
    if (action.skill === 'cooking') {
      if (p.fire.heatMs <= 0) {
        const cant = stokeFire(p, report);
        if (cant) { stop(action.id, 'No logs to keep the cooking fire going'); break; }
      }
      drainFire(p, duration);
    }

    completeAction(p, action, report);

    // Stop straight away if the next one can't happen (bag full, out of ore...)
    const next = whyCantDo(p, action);
    if (next) { stop(action.id, next); break; }
  }

  report.ms = elapsed;
  return report;
}
