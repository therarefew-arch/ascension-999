// ✨ Relic traits: small checks the skills and combat code ask ("is the Tidecaller Rod equipped?").
// A Relic only works while it's worn in its gear slot. The Relics themselves are in data/relics.ts.
import { ITEMS } from '../data/items';
import { RELIC_MAP, type RelicKey } from '../data/relics';
import type { PlayerState } from './player';

/** Is this Relic worn right now? */
export function relicOn(p: PlayerState, key: RelicKey): boolean {
  const id = p.equipment[RELIC_MAP[key].slot];
  return !!id && ITEMS[id]?.relic?.key === key;
}

/** Is this Relic worn right now, in its 🌟 Ascended form? */
export function relicAsc(p: PlayerState, key: RelicKey): boolean {
  const id = p.equipment[RELIC_MAP[key].slot];
  return !!id && ITEMS[id]?.relic?.key === key && !!ITEMS[id]?.relic?.ascended;
}

/** 🌟 The same numbers for Ascended Relics (and their extra powers). */
export const RELIC_ASC = {
  doubleChance: 0.25,
  thriftChance: 0.2, hammerDouble: 0.1,
  arrowSave: 0.85, bowAccuracy: 0.05,
  runeSave: 0.6,
  kindlePerSwing: 0.08, kindleMax: 1,
  wardEvery: 5,
  crownXp: 1.08,
  coatCoins: 1.25, coatDiscount: 0.8,
  skilletFire: 2,
} as const;

/** Trait numbers, kept in one place. */
export const RELIC = {
  /** Whisperwood Axe / Deepdelver's Pick / Granny Bramble's Skillet: chance of a free second roll. */
  doubleChance: 0.15,
  /** Hearthsong Hammer: chance smithing uses no materials. */
  thriftChance: 0.12,
  /** Galewhisper Bow: chance an arrow is saved. */
  arrowSave: 0.6,
  /** Emberheart Blade: extra damage per swing at the same foe, and the most it can add. */
  kindlePerSwing: 0.05, kindleMax: 0.5,
  /** Wanderer's Crown: XP multiplier. */
  crownXp: 1.05,
  /** Pedlar's Patchwork Coat: coins from monsters, and crate discount. */
  coatCoins: 1.15, coatDiscount: 0.9,
} as const;

/** Where the player keeps a Relic (any tier): worn, in the bag or in the bank. */
export function findRelic(p: PlayerState, key: RelicKey): { where: 'worn' | 'bag' | 'bank'; id: string } | null {
  const worn = p.equipment[RELIC_MAP[key].slot];
  if (worn && ITEMS[worn]?.relic?.key === key) return { where: 'worn', id: worn };
  for (const s of p.inventory) if (s && ITEMS[s.id]?.relic?.key === key) return { where: 'bag', id: s.id };
  for (const s of p.bank) if (ITEMS[s.id]?.relic?.key === key) return { where: 'bank', id: s.id };
  return null;
}

/** Swaps a Relic the player already keeps for a stronger one, right where it is (worn stays worn). */
export function replaceRelic(p: PlayerState, oldId: string, newId: string): boolean {
  for (const [slot, id] of Object.entries(p.equipment)) {
    if (id === oldId) { p.equipment[slot as keyof PlayerState['equipment']] = newId; return true; }
  }
  for (const s of p.inventory) if (s && s.id === oldId) { s.id = newId; return true; }
  for (const s of p.bank) if (s.id === oldId) { s.id = newId; return true; }
  return false;
}
