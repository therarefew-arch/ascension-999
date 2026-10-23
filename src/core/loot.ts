// THE central loot system. Every item a player gains goes through here.
// Rule: gems can only drop from bosses and mini bosses — enforced below.
import { getItem, type GemRarity, type GemType } from '../data/items';
import { gemRerollTable, LOOT_TABLES, type LootGroup, type LootSource, type LootTable } from '../data/lootTables';
import { addToBag, canFitAll } from './inventory';
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

/** Puts rolled loot into the player's bag (coins go to the purse). Returns anything that didn't fit. */
export function giveLoot(p: PlayerState, loot: ItemStack[]): ItemStack[] {
  const leftover: ItemStack[] = [];
  for (const st of loot) {
    if (st.id === 'coins') { p.coins += st.qty; continue; }
    const added = addToBag(p.inventory, st.id, st.qty);
    if (added < st.qty) leftover.push({ id: st.id, qty: st.qty - added });
  }
  return leftover;
}

/**
 * Gem reroll: swaps an owned gem for a fresh roll of the same type and rarity.
 * It's not a new drop (you already own the gem), but the new roll still comes from this loot system.
 */
export function rollGemReroll(type: GemType, rarity: GemRarity, rng: () => number = Math.random): string {
  return roll(gemRerollTable(type, rarity), rng)[0].id;
}
