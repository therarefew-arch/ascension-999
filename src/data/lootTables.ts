// Loot tables. Every item a player receives comes from one of these,
// rolled by the central loot system in src/core/loot.ts.
import { ACTION_LIST, GREAT_FOOD } from './skills';

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

// Each skilling action produces its output (or nothing, e.g. burning logs).
for (const action of ACTION_LIST) {
  tables.push({
    id: action.lootTable,
    source: 'skilling',
    entries: action.output ? [{ item: action.output.item, min: action.output.qty, max: action.output.qty, chance: 1 }] : [],
  });
}

// "Great" food from the cooking minigame.
for (const [id, item] of Object.entries(GREAT_FOOD)) {
  tables.push({ id, source: 'skilling', entries: [{ item, min: 1, max: 1, chance: 1 }] });
}

export const LOOT_TABLES: Record<string, LootTable> = Object.fromEntries(tables.map((t) => [t.id, t]));
