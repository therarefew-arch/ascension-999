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
import { giveLoot, maxLoot, recordCollection, rollLoot, rollPet, satchelOn } from './loot';
import { PET_XP_BONUS, petBoosts } from '../data/pets';
import { LOCAL_SKILLS, regionOpen, WOODS } from '../data/tiers';
import type { IdleSlot, PlayerState } from './player';
import { MAX_XP, levelForXp } from './xp';
import { xpBoost } from './boosts';
import { FIND_ITEM, LOOT_TABLES } from '../data/lootTables';
import { buffSpeedPct, buffXpMult } from './buffs';
import { cottageFirePct, cottageXpMult } from './cottage';
import { equipmentStats } from './equipment';
import { advanceFight, isFightId, type CombatReport } from './combat';
import { STIR_XP_MULT, stirBoosts } from './cinderpeak';
import { festivalXpMult, rollFestivalToken } from './festivals';
import { recordRareFish, type RareCatch } from './fishJournal';
import { RELIC, relicOn } from './relics';
import { ascBonus, ascXpMult, rollAscendedDrops } from './ascension';
import { MONSTER_MAP } from '../data/monsters';
import { weaponStyle } from './combat';

export interface ProgressReport {
  /** The first running activity (kept for simple screens). */
  actionId: string | null;
  /** Every activity that was running. */
  actionIds: string[];
  /** Every slot that stopped by itself. */
  stops: { actionId: string; reason: string; afterMs: number }[];
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
  /** 🐟 Rare fish caught (size, first catch, new record). */
  rareFish?: RareCatch[];
  combat?: CombatReport;
  /** Pets found. */
  pets: string[];
  /** 🌟 Ascended items found (levels 750+). */
  ascended?: string[];
}

export function skillLevel(p: PlayerState, skill: SkillId): number {
  return levelForXp(p.skills[skill].xp);
}

/** 🪓 Seasoned tools: +1% speed for every 2,500 actions in a tool skill, up to +10%. */
export const SEASONED = { perPercent: 2500, maxPercent: 10 };
export function seasonedPercent(p: PlayerState, skill: SkillId): number {
  if (!TOOL_SLOT_FOR[skill]) return 0;
  return Math.min(SEASONED.maxPercent, Math.floor((p.toolUses[skill] ?? 0) / SEASONED.perPercent));
}

/** Gathering that happens in one town (mining, woodcutting, fishing, foraging there). */
export function isLocalGather(action: ActionDef): boolean {
  return !!action.region && action.inputs.length === 0 && (LOCAL_SKILLS as readonly string[]).includes(action.skill);
}

/** 🏡 Home turf: gathering in the town you're standing in is this much faster (%). */
export const HOME_TURF_PCT = 10;
export function homeTurf(p: PlayerState, action: ActionDef): boolean {
  return isLocalGather(action) && p.location === action.region;
}

/**
 * 🛠️ How much of an action's time is left with this much tool speed (a gear stat, %).
 * Up to 30% it's the plain rule (30% speed = 30% less time). Past that, each extra % counts a
 * little less, so stacking speed never reaches zero time (before v0.0.1.46 top tools went
 * past 100% and every action hit the floor). 55% → ×0.52, 121% → ×0.30, 154% → ×0.25.
 */
export const TOOL_SPEED_SOFT = 30;
export function toolSpeedMult(speed: number): number {
  if (speed <= TOOL_SPEED_SOFT) return 1 - Math.max(0, speed) / 100;
  const g0 = 1 - TOOL_SPEED_SOFT / 100;
  return g0 / (1 + (speed - TOOL_SPEED_SOFT) / (100 * g0));
}

/** How long one action takes for this player (tools, how seasoned they are, meals and home turf speed it up). */
export function actionDuration(p: PlayerState, action: ActionDef): number {
  const statKey = `${action.skill}Speed` as keyof ItemStats;
  const speed = statKey in STAT_LABELS ? equipmentStats(p)[statKey] ?? 0 : 0;
  const meal = buffSpeedPct(p, action.skill);
  const turf = homeTurf(p, action) ? HOME_TURF_PCT : 0;
  return Math.max(500, Math.round(action.durationMs * toolSpeedMult(speed) * (1 - seasonedPercent(p, action.skill) / 100) * (1 - meal / 100) * (1 - turf / 100)));
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

/** How long one log keeps the cooking fire going, and the colour of its flame (every wood tier burns a different colour). */
const FLAME_HUES = [25, 45, 85, 10, 55, 330, 220, 5, 190, 280, 50, 170, 120, 0, 40, 300, 245, 30, 150, 60];
export const FIRE_LOGS: Record<string, { heatMs: number; color: string; burnAction: string }> = Object.fromEntries(
  WOODS.map((w, t) => [`${w.key}_logs`, {
    heatMs: 20_000 * (t + 1),
    color: t === 0 ? '#f97316' : t === 1 ? '#fbbf24' : `hsl(${FLAME_HUES[t]} 90% 58%)`,
    burnAction: `burn_${w.key}`,
  }]),
);
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
  const bonus = (1 + skillLevel(p, 'firemaking') / 250) * (1 + cottageFirePct(p) / 100);
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
export function whyCantDo(p: PlayerState, action: ActionDef, opts: { manual?: boolean; start?: boolean } = {}): string | null {
  if (!regionOpen(action.region)) return `Found in ${action.region} — coming in a future update`;
  if (action.region && !p.regions.includes(action.region)) return `Travel to ${action.region} to unlock this`;
  // 📨 Send word (v0.0.1.35): idling can be started for any town you've discovered, from anywhere —
  // a helper gathers there. Playing the minigame by hand still means being there in person.
  if (opts.manual && isLocalGather(action) && p.location !== action.region) {
    return `Play this in ${action.region} — you can still idle it from here`;
  }
  if (skillLevel(p, action.skill) < action.level) return `Needs level ${action.level}`;
  if (action.needsTool !== undefined && equippedToolTier(p, action.skill) < action.needsTool) {
    return toolNeededText(action.skill, action.needsTool);
  }
  if (action.requires && countInBag(p.inventory, action.requires) < 1) {
    const name = getItem(action.requires).name;
    const article = /^[aeiou]/i.test(name) ? 'an' : 'a';
    return countInBank(p, action.requires) > 0 ? `Withdraw your ${name} from the bank (it's not used up)` : `Needs ${article} ${name} in your bag (it's not used up)`;
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
  // 🎒 With the Satchel on, anything that doesn't fit goes to the bank — so a full bag never stops you.
  if (satchelOn(p)) return null;
  const bag = p.inventory.map((s) => (s ? { ...s } : null));
  for (const input of action.inputs) removeFromBag(bag, input.item, input.qty);
  if (!canFitAll(bag, maxLoot(action.lootTable))) return 'Your bag is full';
  return null;
}

// ---------------------------------------------------------------------------
// Idle slots (1 to start, up to 3 unlocked with total level or coins)
// ---------------------------------------------------------------------------

/** The skill a slot is working on ('combat' for fights). */
function slotSkill(actionId: string): SkillId | 'combat' | null {
  if (isFightId(actionId)) return 'combat';
  return ACTIONS[actionId]?.skill ?? null;
}

/** Index of the slot running this action, or -1. */
export function slotOf(p: PlayerState, actionId: string): number {
  return p.slots.findIndex((s) => s?.actionId === actionId);
}

/** All running slots with their index. */
export function runningSlots(p: PlayerState): { index: number; slot: IdleSlot }[] {
  return p.slots.map((slot, index) => ({ slot, index })).filter((x): x is { index: number; slot: IdleSlot } => !!x.slot);
}

/** Which slot a new activity goes into: the slot already doing that skill, else a free one, else slot 1. */
export function chooseSlot(p: PlayerState, actionId: string): number {
  const skill = slotSkill(actionId);
  for (let i = 0; i < p.unlockedSlots; i++) {
    const s = p.slots[i];
    if (s && slotSkill(s.actionId) === skill) return i;
  }
  for (let i = 0; i < p.unlockedSlots; i++) if (!p.slots[i]) return i;
  return 0;
}

/** Puts an activity into a slot (chosen automatically unless given). Returns a reason if it can't start. */
export function startIdle(p: PlayerState, actionId: string, slot?: number): string | null {
  const action = ACTIONS[actionId];
  if (!action) return 'Unknown activity';
  const why = whyCantDo(p, action, { start: true });
  if (why) return why;
  if (slotOf(p, actionId) >= 0) return null; // already running
  const i = slot ?? chooseSlot(p, actionId);
  if (i >= p.unlockedSlots) return 'That idle slot is locked';
  if (p.slots[i] && isFightId(p.slots[i]!.actionId)) p.fight = null;
  p.slots[i] = { actionId, progressMs: 0 };
  p.lastStop = null;
  return null;
}

/** Stops one slot (or all of them when no slot is given). */
export function stopIdle(p: PlayerState, slot?: number): void {
  const indexes = slot === undefined ? p.slots.map((_, i) => i) : [slot];
  for (const i of indexes) {
    if (p.slots[i] && isFightId(p.slots[i]!.actionId)) p.fight = null;
    p.slots[i] = null;
  }
}

export function emptyReport(actionId: string | null): ProgressReport {
  return { actionId, actionIds: actionId ? [actionId] : [], ms: 0, actions: 0, xp: {}, gained: {}, used: {}, levelUps: [], stopped: null, stops: [], failed: 0, pets: [] };
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
  opts: { xpMult?: number; bonusRolls?: number; lootTable?: string; chanceBonus?: number; at?: number } = {},
): boolean {
  // 🌋 The Mountain Stirs: Emberite mining in Cinderpeak gives double XP and more ember geodes.
  const stirring = stirBoosts(p, action, opts.at ?? Date.now());
  const fromSlot = upgradeSource(p, action);
  // Enhancing can fail: then only the materials are used, the item itself stays.
  const success = action.kind !== 'enhance' || Math.random() < enhanceChance(p, action, opts.chanceBonus ?? 0);
  // ✨ Relics: a free second log / ore / meal, or smithing that uses no materials.
  let relicRolls = 0;
  let thrifty = false;
  if (!action.kind) {
    const double = (action.skill === 'woodcutting' && relicOn(p, 'whisperwood_axe'))
      || (action.skill === 'mining' && relicOn(p, 'deepdelver_pick'))
      || (action.skill === 'cooking' && relicOn(p, 'bramble_skillet'));
    if (double && Math.random() < RELIC.doubleChance) relicRolls = 1;
    // 🌟 Ascended tools: a chance of a double result.
    const asc = ascBonus(p, 'dr', action.skill);
    if (asc && Math.random() < asc / 100) relicRolls++;
    // Only when the result still fits, since the materials stay in the bag.
    thrifty = action.skill === 'smithing' && action.inputs.length > 0 && relicOn(p, 'hearthsong_hammer') && Math.random() < RELIC.thriftChance
      && (satchelOn(p) || canFitAll(p.inventory, maxLoot(opts.lootTable ?? action.lootTable)));
  }
  for (const input of action.inputs) {
    if (thrifty) break;
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
  for (let roll = 0; roll <= (opts.bonusRolls ?? 0) + relicRolls; roll++) {
    let loot = rollLoot(opts.lootTable ?? action.lootTable);
    // Upgrading worn gear: the improved item goes back into the same slot.
    if (roll === 0 && fromSlot && fromSlot !== 'bag' && action.output) {
      const made = loot.find((l) => l.id === action.output!.item);
      if (made) {
        p.equipment[fromSlot] = made.id;
        recordCollection(p, made.id, 1);
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
  // 🪓 Your tools get a little more seasoned with every use.
  if (TOOL_SLOT_FOR[action.skill]) p.toolUses[action.skill] = (p.toolUses[action.skill] ?? 0) + 1;
  // 🎁 A rare find now and then while gathering (bird nests, geodes, bottles).
  // 🌟 Ascended tools with "rare finds" give finds and rare fish an extra chance.
  const ascFinds = !action.kind ? ascBonus(p, 'rf', action.skill) : 0;
  const findTries = ascFinds && Math.random() < ascFinds / 100 ? 2 : 1;
  for (let k = 0; k < findTries && !action.kind && action.skill in FIND_ITEM; k++) {
    const find = rollLoot(stirring ? 'find_ember_geode' : `find_${action.skill}`);
    if (find.length) {
      giveLoot(p, find);
      for (const st of find) report.gained[st.id] = (report.gained[st.id] ?? 0) + st.qty;
    }
  }
  // 🐟 A rare fish now and then — recorded in the Fishing Journal.
  // ✨ The Tidecaller Rod gives rare fish a second chance to bite.
  const rareTries = !action.kind && action.skill === 'fishing' && action.region && LOOT_TABLES[`rare_fish_${action.region}`]
    ? (relicOn(p, 'tidecaller_rod') ? 2 : 1) + (ascFinds && Math.random() < ascFinds / 100 ? 1 : 0) : 0;
  for (let k = 0; k < rareTries; k++) {
    const rare = rollLoot(`rare_fish_${action.region}`);
    if (rare.length) {
      giveLoot(p, rare);
      for (const st of rare) {
        report.gained[st.id] = (report.gained[st.id] ?? 0) + st.qty;
        const c = recordRareFish(p, st.id);
        if (c) (report.rareFish ??= []).push(c);
      }
    }
  }
  // 🎪 Festival tokens.
  rollFestivalToken(p, report, opts.at ?? Date.now());
  addXp(p, action, report, Math.round(action.xp * (opts.xpMult ?? 1) * (stirring ? STIR_XP_MULT : 1)));
  report.actions++;
  const pet = rollPet(p, action.skill);
  if (pet) report.pets.push(pet);
  return true;
}

export function addXp(p: PlayerState, action: { skill: SkillId }, report: ProgressReport, xp: number) {
  // 🌱 Early-level boost and 🧭 catch-up bonus (core/boosts.ts).
  xp = xp * xpBoost(p, action.skill).total;
  // Your active pet gives +2% XP in its skill.
  // (Not rounded, so even small actions get the bonus over time.)
  if (petBoosts(p.activePet, action.skill)) xp = xp * (1 + PET_XP_BONUS);
  // A lit bonfire warms everyone up: +5% XP to all skills.
  if (p.bonfire && p.bonfire.until > Date.now()) xp = xp * 1.05;
  // 🍵 Brews from Cooking, and 🏡 Cottage furniture.
  xp = xp * buffXpMult(p, action.skill) * cottageXpMult(p, action.skill);
  // 🎪 The season's festival skill gets +10%.
  xp = xp * festivalXpMult(action.skill);
  // ✨ The Wanderer's Crown: +5% XP in every skill.
  if (relicOn(p, 'wanderers_crown')) xp = xp * RELIC.crownXp;
  // 🌟 Ascended bonuses.
  xp = xp * ascXpMult(p, action.skill);
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

/**
 * Runs all idle slots forward by `ms` milliseconds. Changes the player.
 * With several slots running, time is shared out in small chunks so they all fill the bag fairly.
 */
export function advanceIdle(p: PlayerState, ms: number, now = Date.now()): ProgressReport {
  const running = runningSlots(p);
  const report = emptyReport(running[0]?.slot.actionId ?? null);
  report.actionIds = running.map((r) => r.slot.actionId);
  const total = Math.max(0, ms);
  const chunk = running.length > 1 ? 5000 : total;
  const startAt = now - total;
  for (let done = 0; done < total && runningSlots(p).length > 0;) {
    const step = Math.min(chunk, total - done);
    for (const { index } of runningSlots(p)) advanceSlot(p, index, step, startAt + done, report, startAt);
    done += step;
  }
  report.ms = total;
  report.stopped = report.stops[0] ? { reason: report.stops[0].reason, afterMs: report.stops[0].afterMs } : null;
  return report;
}

/** Runs one slot forward by `ms`, starting at time `startAt`. */
function advanceSlot(p: PlayerState, i: number, ms: number, startAt: number, report: ProgressReport, overallStart: number) {
  const slot = p.slots[i];
  if (!slot) return;
  let worked = ms;
  const stop = (actionId: string, reason: string, usedMs: number) => {
    worked = usedMs;
    const at = startAt + usedMs;
    report.stops.push({ actionId, reason, afterMs: at - overallStart });
    if (isFightId(actionId)) p.fight = null;
    p.slots[i] = null;
    p.lastStop = { actionId, reason, at };
  };

  // Fighting uses a slot too.
  if (isFightId(slot.actionId)) {
    const cr = (report.combat ??= { kills: 0, damageDealt: 0, damageTaken: 0, foodEaten: 0 });
    const monster = MONSTER_MAP[slot.actionId.slice('fight:'.length)];
    const style = weaponStyle(p);
    const { stop: why, usedMs } = advanceFight(p, ms, report, cr, startAt);
    if (why) stop(slot.actionId, why, usedMs);
    rollAscendedDrops(p, style, worked, monster?.region, report);
    return;
  }

  let remaining = ms;
  let elapsed = 0;
  while (p.slots[i] === slot && remaining > 0) {
    const action = ACTIONS[slot.actionId];
    if (!action) { p.slots[i] = null; break; }

    const duration = actionDuration(p, action);
    const need = duration - slot.progressMs;
    if (remaining < need) {
      slot.progressMs += remaining;
      break;
    }
    remaining -= need;
    elapsed += need;
    slot.progressMs = 0;

    const why = whyCantDo(p, action);
    if (why) { stop(action.id, why, elapsed); break; }

    // Cooking: keep the fire fed from the bag, and let it burn down as you cook.
    if (action.skill === 'cooking') {
      if (p.fire.heatMs <= 0) {
        const cant = stokeFire(p, report);
        if (cant) { stop(action.id, 'No logs to keep the cooking fire going', elapsed); break; }
      }
      drainFire(p, duration);
    }

    completeAction(p, action, report, { at: startAt + elapsed });

    // Stop straight away if the next one can't happen (bag full, out of ore...)
    const next = whyCantDo(p, action);
    if (next) { stop(action.id, next, elapsed); break; }
  }
  // 🌟 Levels 750+: a chance of an Ascended item for every bit of time spent working.
  const action = ACTIONS[slot.actionId];
  if (action) rollAscendedDrops(p, action.skill, worked, action.region, report);
}
