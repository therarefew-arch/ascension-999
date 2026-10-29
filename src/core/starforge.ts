// ✨ The Starforge (the Ascension's crafting): break Ascended items down into Starlight,
// craft a fresh one for a slot you choose, or reforge one (lock the bonuses you like).
// New items always come through the loot system (loot.ts).
import {
  ASC_BASE_MAP, ASCENSION_LEVEL, BREAK_VALUE, CRAFT_COST, reforgeAscended, reforgeCost, rollAscended, type BonusKey,
} from '../data/ascended';
import { ITEMS } from '../data/items';
import { REGIONS } from '../data/tiers';
import { countInBag, countInBank, removeFromBag, removeFromBank } from './inventory';
import { giveLoot, giveWorn } from './loot';
import type { PlayerState } from './player';
import { levelForXp } from './xp';

export type ForgePlace = 'bag' | 'bank' | 'worn';

const where = (p: PlayerState, id: string, from: ForgePlace): boolean =>
  from === 'bag' ? countInBag(p.inventory, id) > 0
    : from === 'bank' ? countInBank(p, id) > 0
      : Object.values(p.equipment).includes(id);

/** Breaks an Ascended item (from the bag or bank) down into Starlight. Returns the Starlight gained. */
export function breakDown(p: PlayerState, id: string, from: 'bag' | 'bank'): number {
  const a = ITEMS[id]?.ascended;
  if (!a || !where(p, id, from)) return 0;
  if (from === 'bag') removeFromBag(p.inventory, id, 1);
  else removeFromBank(p, id, 1);
  const gain = BREAK_VALUE[a.grade.key];
  giveLoot(p, [{ id: 'starlight', qty: gain }]);
  return gain;
}

/** Fine items in the bag and bank that aren't 📌 kept (for "Break down all Fine"). */
export function spareFine(p: PlayerState): { id: string; from: 'bag' | 'bank'; qty: number }[] {
  const out: { id: string; from: 'bag' | 'bank'; qty: number }[] = [];
  const fine = (id: string) => ITEMS[id]?.ascended?.grade.key === 'f' && !p.keep.includes(id);
  for (const s of p.inventory) if (s && fine(s.id)) out.push({ id: s.id, from: 'bag', qty: s.qty });
  for (const s of p.bank) if (s && fine(s.id)) out.push({ id: s.id, from: 'bank', qty: s.qty });
  return out;
}

export function breakDownAllFine(p: PlayerState): { items: number; starlight: number } {
  let items = 0, starlight = 0;
  for (const f of spareFine(p)) for (let k = 0; k < f.qty; k++) {
    const g = breakDown(p, f.id, f.from);
    if (g) { items++; starlight += g; }
  }
  return { items, starlight };
}

/** Why you can't craft this kind of Ascended item (null = you can). */
export function whyCantCraft(p: PlayerState, baseKey: string): string | null {
  const base = ASC_BASE_MAP[baseKey];
  if (!base) return 'Unknown item';
  if (levelForXp(p.skills[base.skill].xp) < ASCENSION_LEVEL) return `Needs ${base.skill[0].toUpperCase() + base.skill.slice(1)} level ${ASCENSION_LEVEL}`;
  if (p.starlight < CRAFT_COST) return `Needs ${CRAFT_COST} Starlight`;
  return null;
}

/** Crafts a fresh Ascended item. Its grade is rolled like a drop, capped by that skill's level. */
export function craftAscended(p: PlayerState, baseKey: string, rng: () => number = Math.random): string | null {
  if (whyCantCraft(p, baseKey)) return null;
  const base = ASC_BASE_MAP[baseKey];
  p.starlight -= CRAFT_COST;
  const id = rollAscended(base, levelForXp(p.skills[base.skill].xp), Math.max(0, REGIONS.indexOf(p.location)), rng);
  giveLoot(p, [{ id, qty: 1 }], { overflowToBank: true });
  return id;
}

/** Why this reforge can't happen (null = it can). */
export function whyCantReforge(p: PlayerState, id: string, from: ForgePlace, locked: BonusKey[]): string | null {
  const a = ITEMS[id]?.ascended;
  if (!a) return "That isn't Ascended";
  if (from === 'bank') return 'Take it out of the bank first';
  if (!where(p, id, from)) return "You don't have it there";
  if (locked.length >= a.bonuses.length) return 'Leave at least one bonus unlocked';
  const cost = reforgeCost(a.grade.key, locked.length);
  if (p.starlight < cost) return `Needs ${cost} Starlight`;
  return null;
}

/** Reforges an item in the bag or a worn one (in place). Returns the new item id. */
export function reforge(p: PlayerState, id: string, from: ForgePlace, locked: BonusKey[], rng: () => number = Math.random): string | null {
  if (whyCantReforge(p, id, from, locked)) return null;
  const a = ITEMS[id]!.ascended!;
  const next = reforgeAscended(id, locked, rng);
  if (!next) return null;
  p.starlight -= reforgeCost(a.grade.key, locked.length);
  if (from === 'worn') {
    giveWorn(p, a.base.slot, next);
  } else {
    // Swap it in the same bag slot, so it doesn't jump around.
    const i = p.inventory.findIndex((s) => s?.id === id);
    removeFromBag(p.inventory, id, 1);
    const free = p.inventory[i] ? -1 : i;
    giveLoot(p, [{ id: next, qty: 1 }], { overflowToBank: true });
    const landed = p.inventory.findIndex((s) => s?.id === next);
    if (free >= 0 && landed >= 0 && landed !== free) [p.inventory[free], p.inventory[landed]] = [p.inventory[landed], p.inventory[free]];
  }
  if (p.keep.includes(id)) p.keep = p.keep.map((k) => (k === id ? next : k));
  return next;
}
