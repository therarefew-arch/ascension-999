// Loot tables. Every item a player receives comes from one of these,
// rolled by the central loot system in src/core/loot.ts.
import { ACTION_LIST } from './skills';

/** Where a loot table is used. Gems may only appear in 'boss' and 'miniboss' tables. */
export type LootSource = 'skilling' | 'monster' | 'miniboss' | 'boss';

export interface LootEntry {
  item: string;
  min: number;
  max: number;
  /** 0..1 chance this entry drops on each roll. */
  chance: number;
}

export interface LootTable {
  id: string;
  source: LootSource;
  entries: LootEntry[];
}

const tables: LootTable[] = [];

// Each skilling action produces exactly its icon item.
for (const action of ACTION_LIST) {
  tables.push({
    id: action.lootTable,
    source: 'skilling',
    entries: [{ item: action.iconItem, min: 1, max: 1, chance: 1 }],
  });
}

export const LOOT_TABLES: Record<string, LootTable> = Object.fromEntries(tables.map((t) => [t.id, t]));
