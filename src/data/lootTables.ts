// Loot tables. Every item a player receives comes from one of these,
// rolled by the central loot system in src/core/loot.ts.
import { ACTION_LIST, GREAT_FOOD } from './skills';
import { GEM_RANGES, GEM_TYPES, gemId, RARITIES, type GemRarity, type GemType } from './items';

/** Where a loot table is used. Gems may only appear in 'boss' and 'miniboss' tables. */
export type LootSource = 'skilling' | 'monster' | 'miniboss' | 'boss';

export interface LootEntry {
  item: string;
  min: number;
  max: number;
  /** 0..1 chance this entry drops on each roll. */
  chance: number;
}

/** "Pick one" group: rolls `chance` once, then picks exactly one item by weight. */
export interface LootGroup {
  chance: number;
  items: { item: string; weight: number }[];
}

export interface LootTable {
  id: string;
  source: LootSource;
  entries: LootEntry[];
  groups?: LootGroup[];
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

// ----- Monsters (Pocketvale) -----
const e = (item: string, min: number, max: number, chance: number): LootEntry => ({ item, min, max, chance });
tables.push(
  { id: 'mon_field_rat', source: 'monster', entries: [e('coins', 1, 4, 1), e('raw_shrimp', 1, 2, 0.15), e('pine_logs', 1, 2, 0.15)] },
  { id: 'mon_hedge_sprite', source: 'monster', entries: [e('coins', 3, 9, 1), e('air_rune', 3, 8, 0.4), e('rune_essence', 2, 5, 0.3), e('stone', 2, 4, 0.2)] },
  { id: 'mon_bandit_archer', source: 'monster', entries: [e('coins', 8, 18, 1), e('bronze_arrows', 5, 12, 0.45), e('bronze_bar', 1, 2, 0.15), e('cooked_shrimp', 1, 2, 0.2)] },
  { id: 'mon_mossback_boar', source: 'monster', entries: [e('coins', 14, 30, 1), e('raw_trout', 1, 3, 0.3), e('iron_ore', 1, 3, 0.25), e('oak_logs', 1, 3, 0.2)] },
);

// ----- Mini boss: the ONLY place gems drop (in Pocketvale) -----
/** Chance weights per rarity: common is common, mythic is very rare. */
export const GEM_RARITY_WEIGHTS: Record<GemRarity, number> = { common: 45, uncommon: 28, rare: 15, epic: 8, legendary: 3, mythic: 1 };
function gemGroup(chance: number): LootGroup {
  const groupItems: { item: string; weight: number }[] = [];
  for (const rarity of RARITIES) {
    const [lo, hi] = GEM_RANGES[rarity];
    const rolls = hi - lo + 1;
    for (const g of GEM_TYPES) {
      for (let v = lo; v <= hi; v++) {
        groupItems.push({ item: gemId(g.type, rarity, v * g.mult), weight: GEM_RARITY_WEIGHTS[rarity] / rolls / GEM_TYPES.length });
      }
    }
  }
  return { chance, items: groupItems };
}
tables.push({
  id: 'boss_old_thornhide', source: 'miniboss',
  entries: [e('coins', 80, 160, 1), e('iron_bar', 2, 5, 0.5), e('great_trout', 1, 3, 0.4), e('iron_arrows', 10, 25, 0.35), e('earth_rune', 8, 20, 0.25), e('fire_rune', 6, 15, 0.2), e('rune_essence', 10, 25, 0.4)],
  groups: [gemGroup(0.7)],
});

/** Gem rerolls: a fresh roll within the same type and rarity (used by the loot system). */
export function gemRerollTable(type: GemType, rarity: GemRarity): LootTable {
  const [lo, hi] = GEM_RANGES[rarity];
  const mult = GEM_TYPES.find((g) => g.type === type)!.mult;
  const groupItems = [];
  for (let v = lo; v <= hi; v++) groupItems.push({ item: gemId(type, rarity, v * mult), weight: 1 });
  return { id: `reroll_${type}_${rarity}`, source: 'miniboss', entries: [], groups: [{ chance: 1, items: groupItems }] };
}

export const LOOT_TABLES: Record<string, LootTable> = Object.fromEntries(tables.map((t) => [t.id, t]));
