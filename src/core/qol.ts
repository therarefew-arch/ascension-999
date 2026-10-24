// Quality of life: XP tracker, gear loadouts, idle presets.
import { getItem, type EquipSlot, type SkillId } from '../data/items';
import { ACTIONS, ALL_SKILLS } from '../data/skills';
import { equip } from './equipment';
import { startIdle, stopIdle } from './idle';
import { countInBag, countInBank } from './inventory';
import type { PlayerState } from './player';

// ----- XP tracker -----

export function trackerGains(p: PlayerState, now = Date.now()) {
  const hours = Math.max(1 / 60, (now - p.tracker.since) / 3_600_000);
  return ALL_SKILLS
    .map((s: SkillId) => {
      const gained = Math.max(0, p.skills[s].xp - (p.tracker.xp[s] ?? 0));
      return { skill: s, gained, perHour: gained / hours };
    })
    .filter((g) => g.gained > 0)
    .sort((a, b) => b.gained - a.gained);
}

export function resetTracker(p: PlayerState, now = Date.now()) {
  p.tracker = { since: now, xp: Object.fromEntries(ALL_SKILLS.map((s) => [s, p.skills[s].xp])) };
}

// ----- Gear loadouts -----

export function saveLoadout(p: PlayerState, i: number, name: string) {
  p.loadouts[i] = { name: name.trim().slice(0, 20) || `Loadout ${i + 1}`, equipment: { ...p.equipment } };
}

/** Equips a saved loadout from your bag/bank. Returns the names of items it couldn't find. */
export function applyLoadout(p: PlayerState, i: number): string[] {
  const l = p.loadouts[i];
  if (!l) return [];
  const missing: string[] = [];
  for (const [slot, id] of Object.entries(l.equipment) as [EquipSlot, string][]) {
    if (!id || p.equipment[slot] === id) continue;
    if (countInBag(p.inventory, id) + countInBank(p, id) < 1) { missing.push(getItem(id).name); continue; }
    const why = equip(p, id);
    if (why) missing.push(`${getItem(id).name} (${why})`);
  }
  return missing;
}

// ----- Idle presets ("queue presets") -----

export function savePreset(p: PlayerState, i: number, name: string) {
  p.presets[i] = {
    name: name.trim().slice(0, 20) || `Preset ${i + 1}`,
    actions: p.slots.map((s) => (s && ACTIONS[s.actionId] ? s.actionId : null)),
  };
}

/** Starts every activity in a saved preset. Returns problems (e.g. locked slot, out of ore). */
export function applyPreset(p: PlayerState, i: number): string[] {
  const pr = p.presets[i];
  if (!pr) return [];
  const problems: string[] = [];
  pr.actions.forEach((actionId, slot) => {
    if (!actionId) return;
    if (slot >= p.unlockedSlots) { problems.push(`Slot ${slot + 1} is locked`); return; }
    if (p.slots[slot]?.actionId === actionId) return;
    stopIdle(p, slot);
    const why = startIdle(p, actionId, slot);
    if (why) problems.push(`${ACTIONS[actionId].name}: ${why}`);
  });
  return problems;
}
