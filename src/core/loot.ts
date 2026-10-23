// THE central loot system. Every item a player gains goes through here.
// Rule: gems can only drop from bosses and mini bosses — enforced below.
import { getItem } from '../data/items';
import { LOOT_TABLES, type LootSource, type LootTable } from '../data/lootTables';
import { addToBag, canFitAll } from './inventory';
import type { ItemStack, PlayerState } from './player';

const GEM_SOURCES: LootSource[] = ['boss', 'miniboss'];

function gemAllowed(table: LootTable, itemId: string): boolean {
  return getItem(itemId).category !== 'gem' || GEM_SOURCES.includes(table.source);
}

/** Checks every loot table once at start-up. Breaks loudly if a rule is broken. */
export function validateLootTables(): void {
  for (const table of Object.values(LOOT_TABLES)) {
    for (const e of table.entries) {
      getItem(e.item); // throws if the item doesn't exist
      if (!gemAllowed(table, e.item)) {
        throw new Error(`Loot rule broken: gem "${e.item}" in non-boss table "${table.id}"`);
      }
    }
  }
}

export function getTable(id: string): LootTable {
  const t = LOOT_TABLES[id];
  if (!t) throw new Error(`Unknown loot table: ${id}`);
  return t;
}

/** Rolls a table and returns what dropped. Does not give it to anyone yet. */
export function rollLoot(tableId: string, rng: () => number = Math.random): ItemStack[] {
  const table = getTable(tableId);
  const out: ItemStack[] = [];
  for (const e of table.entries) {
    if (!gemAllowed(table, e.item)) continue; // gems never leak from non-boss sources
    if (rng() >= e.chance) continue;
    const qty = e.min + Math.floor(rng() * (e.max - e.min + 1));
    if (qty > 0) out.push({ id: e.item, qty });
  }
  return out;
}

/** The most a table could ever give in one roll — used to check bag space before starting. */
export function maxLoot(tableId: string): ItemStack[] {
  return getTable(tableId).entries.map((e) => ({ id: e.item, qty: e.max }));
}

export function lootFits(p: PlayerState, tableId: string): boolean {
  return canFitAll(p.inventory, maxLoot(tableId));
}

/** Puts rolled loot into the player's bag. Returns anything that didn't fit. */
export function giveLoot(p: PlayerState, loot: ItemStack[]): ItemStack[] {
  const leftover: ItemStack[] = [];
  for (const st of loot) {
    const added = addToBag(p.inventory, st.id, st.qty);
    if (added < st.qty) leftover.push({ id: st.id, qty: st.qty - added });
  }
  return leftover;
}
