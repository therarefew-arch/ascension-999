// THE central loot system. Every item a player gains goes through here.
// Rule: gems can only drop from bosses and mini bosses — enforced below.
import { getItem, type GemRarity, type GemType, type SkillId } from '../data/items';
import { PETS } from '../data/pets';
import { gemRerollTable, LOOT_TABLES, type LootGroup, type LootSource, type LootTable } from '../data/lootTables';
import { addToBag, addToBank, canFitAll } from './inventory';
import type { ItemStack, PlayerState } from './player';

const GEM_SOURCES: LootSource[] = ['boss', 'miniboss'];

function gemAllowed(table: LootTable, itemId: string): boolean {
  return getItem(itemId).category !== 'gem' || GEM_SOURCES.includes(table.source);
}

/** Checks every loot table once at start-up. Breaks loudly if a rule is broken. */
export function validateLootTables(): void {
  for (const table of Object.values(LOOT_TABLES)) {
    const ids = [...table.entries.map((e) => e.item), ...(table.groups ?? []).flatMap((g) => g.items.map((i) => i.item))];
    for (const id of ids) {
      getItem(id); // throws if the item doesn't exist
      if (!gemAllowed(table, id)) throw new Error(`Loot rule broken: gem "${id}" in non-boss table "${table.id}"`);
    }
  }
}

export function getTable(id: string): LootTable {
  const t = LOOT_TABLES[id];
  if (!t) throw new Error(`Unknown loot table: ${id}`);
  return t;
}

function pickFromGroup(group: LootGroup, rng: () => number): string | null {
  if (rng() >= group.chance) return null;
  const total = group.items.reduce((a, i) => a + i.weight, 0);
  let r = rng() * total;
  for (const i of group.items) {
    r -= i.weight;
    if (r <= 0) return i.item;
  }
  return group.items[group.items.length - 1]?.item ?? null;
}

function roll(table: LootTable, rng: () => number): ItemStack[] {
  const out: ItemStack[] = [];
  for (const e of table.entries) {
    if (!gemAllowed(table, e.item)) continue; // gems never leak from non-boss sources
    if (rng() >= e.chance) continue;
    const qty = e.min + Math.floor(rng() * (e.max - e.min + 1));
    if (qty > 0) out.push({ id: e.item, qty });
  }
  for (const g of table.groups ?? []) {
    const item = pickFromGroup(g, rng);
    if (item && gemAllowed(table, item)) out.push({ id: item, qty: 1 });
  }
  return out;
}

/** Rolls a table and returns what dropped. Does not give it to anyone yet. */
export function rollLoot(tableId: string, rng: () => number = Math.random): ItemStack[] {
  return roll(getTable(tableId), rng);
}

/** The most a table could ever give in one roll — used to check bag space before starting. */
export function maxLoot(tableId: string): ItemStack[] {
  const t = getTable(tableId);
  return t.entries.filter((e) => e.item !== 'coins').map((e) => ({ id: e.item, qty: e.max }));
}

export function lootFits(p: PlayerState, tableId: string): boolean {
  return canFitAll(p.inventory, maxLoot(tableId));
}

/** Is the 🎒 Satchel switched on? (Anything that doesn't fit in the bag goes to the bank.) */
export const satchelOn = (p: PlayerState) => p.satchel.owned && p.satchel.on;

/**
 * Puts rolled loot into the player's bag (coins go to the purse). Returns anything that didn't fit.
 * With the Satchel on, whatever doesn't fit in the bag goes straight to the bank instead.
 */
export function giveLoot(p: PlayerState, loot: ItemStack[], opts: { overflowToBank?: boolean } = {}): ItemStack[] {
  const leftover: ItemStack[] = [];
  for (const st of loot) {
    if (st.id === 'coins') { p.coins += st.qty; continue; }
    const added = addToBag(p.inventory, st.id, st.qty);
    if (added > 0) recordCollection(p, st.id, added);
    if (added < st.qty) {
      // Bought things (the Pedlar's crates) are never lost: what doesn't fit waits in the bank.
      if (satchelOn(p) || opts.overflowToBank) {
        addToBank(p, st.id, st.qty - added);
        recordCollection(p, st.id, st.qty - added);
      } else {
        leftover.push({ id: st.id, qty: st.qty - added });
      }
    }
  }
  return leftover;
}

/** Collection log: counts every item you've ever received. */
export function recordCollection(p: PlayerState, id: string, qty: number) {
  p.collection[id] = (p.collection[id] ?? 0) + qty;
}

/** Rare pet roll after a finished action (or mini boss kill). Returns the new pet's id, if any. */
export function rollPet(p: PlayerState, source: SkillId | 'combat', rng: () => number = Math.random, petId?: string): string | null {
  // Pets with odds 0 are rewards (never random drops).
  const pet = petId ? PETS.find((x) => x.id === petId) : PETS.find((x) => x.skill === source && x.odds > 0);
  if (!pet || pet.odds <= 0 || p.pets.includes(pet.id)) return null;
  if (rng() >= 1 / pet.odds) return null;
  p.pets.push(pet.id);
  if (!p.activePet) p.activePet = pet.id;
  return pet.id;
}

/** A reward pet (odds 0) given for finishing something special. */
export function grantPet(p: PlayerState, petId: string): boolean {
  const pet = PETS.find((x) => x.id === petId);
  if (!pet || p.pets.includes(pet.id)) return false;
  p.pets.push(pet.id);
  return true;
}

/**
 * Gem reroll: swaps an owned gem for a fresh roll of the same type and rarity.
 * It's not a new drop (you already own the gem), but the new roll still comes from this loot system.
 */
export function rollGemReroll(type: GemType, rarity: GemRarity, rng: () => number = Math.random): string {
  return roll(gemRerollTable(type, rarity), rng)[0].id;
}
