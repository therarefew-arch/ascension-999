// Loot tables. Every item a player receives comes from one of these,
// rolled by the central loot system in src/core/loot.ts.
import { ACTION_LIST, GREAT_FOOD } from './skills';
import { GEM_RANGES, GEM_TYPES, gemId, RARITIES, type GemRarity, type GemType } from './items';
import { CROPS, FISH, HERBS, METALS, TIER_COUNT, WOODS } from './tiers';
import { RARE_FISH, RARE_FISH_CHANCE, rareFishIn } from './rareFish';
import { FESTIVALS, TOKEN_CHANCE, TOKEN_CHANCE_KILL } from './festivals';

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

// ----- Monsters (Ironmoor) -----
tables.push(
  { id: 'mon_ore_mole', source: 'monster', entries: [e('coins', 40, 90, 1), e('iron_ore', 2, 6, 0.5), e('stone', 4, 10, 0.3), e('rune_essence', 3, 8, 0.3)] },
  { id: 'mon_rust_sprite', source: 'monster', entries: [e('coins', 50, 110, 1), e('water_rune', 10, 25, 0.4), e('earth_rune', 8, 20, 0.35), e('iron_bar', 1, 3, 0.2)] },
  { id: 'mon_ironmoor_raider', source: 'monster', entries: [e('coins', 70, 140, 1), e('iron_arrows', 10, 25, 0.45), e('iron_bar', 1, 3, 0.25), e('cooked_trout', 1, 3, 0.3)] },
  { id: 'mon_ironhide_boar', source: 'monster', entries: [e('coins', 90, 180, 1), e('raw_trout', 2, 5, 0.35), e('oak_logs', 3, 8, 0.35), e('iron_ore', 3, 8, 0.3)] },
  {
    id: 'boss_forgefather_brask', source: 'miniboss',
    entries: [e('coins', 400, 800, 1), e('iron_bar', 6, 14, 0.6), e('great_trout', 3, 8, 0.5), e('iron_arrows', 30, 60, 0.4), e('fire_rune', 20, 40, 0.4)],
    groups: [{ chance: 0, items: [] }], // replaced below with the gem group
  },
);

// ----- Monsters (Coalhaven) -----
tables.push(
  { id: 'mon_soot_crab', source: 'monster', entries: [e('coins', 120, 240, 1), e('raw_salmon', 2, 5, 0.4), e('coal', 3, 8, 0.4), e('stone', 5, 12, 0.25)] },
  { id: 'mon_smog_wisp', source: 'monster', entries: [e('coins', 140, 280, 1), e('air_rune', 20, 45, 0.4), e('water_rune', 15, 35, 0.35), e('coal', 3, 6, 0.3), e('steel_bar', 1, 2, 0.15)] },
  { id: 'mon_dockside_smuggler', source: 'monster', entries: [e('coins', 180, 340, 1), e('steel_arrows', 15, 35, 0.45), e('steel_bar', 1, 3, 0.25), e('cooked_salmon', 1, 3, 0.3)] },
  { id: 'mon_cinderhide_boar', source: 'monster', entries: [e('coins', 220, 420, 1), e('willow_logs', 4, 10, 0.35), e('raw_salmon', 3, 6, 0.35), e('coal', 4, 10, 0.3)] },
  {
    id: 'boss_mother_clawsoot', source: 'miniboss',
    entries: [e('coins', 900, 1800, 1), e('steel_bar', 8, 18, 0.6), e('great_salmon', 3, 8, 0.5), e('steel_arrows', 40, 80, 0.4), e('water_rune', 30, 60, 0.4), e('coal', 20, 40, 0.5)],
    groups: [{ chance: 0, items: [] }], // replaced below with the gem group
  },
);

// ----- Monsters (Bluecliff) -----
tables.push(
  { id: 'mon_gull_thief', source: 'monster', entries: [e('coins', 260, 480, 1), e('raw_lobster', 2, 5, 0.45), e('cobalt_arrows', 10, 25, 0.3), e('maple_logs', 3, 7, 0.25)] },
  { id: 'mon_spray_sprite', source: 'monster', entries: [e('coins', 280, 520, 1), e('nature_rune', 15, 35, 0.4), e('water_rune', 25, 50, 0.35), e('rune_essence', 10, 25, 0.3)] },
  { id: 'mon_cliff_wrecker', source: 'monster', entries: [e('coins', 340, 620, 1), e('cobalt_arrows', 20, 40, 0.45), e('cobalt_bar', 1, 3, 0.25), e('cooked_lobster', 1, 3, 0.3)] },
  { id: 'mon_cobalt_crab', source: 'monster', entries: [e('coins', 400, 720, 1), e('cobalt_ore', 4, 10, 0.45), e('raw_lobster', 3, 6, 0.35), e('maple_logs', 4, 10, 0.3)] },
  {
    id: 'boss_old_galewing', source: 'miniboss',
    entries: [e('coins', 1600, 3000, 1), e('cobalt_bar', 8, 18, 0.6), e('great_lobster', 3, 8, 0.5), e('cobalt_arrows', 50, 100, 0.4), e('nature_rune', 40, 80, 0.45), e('maple_logs', 20, 40, 0.4)],
    groups: [{ chance: 0, items: [] }], // replaced below with the gem group
  },
);

// ----- Monsters (Lunaria) -----
tables.push(
  { id: 'mon_mist_crab', source: 'monster', entries: [e('coins', 480, 860, 1), e('raw_moonfin', 2, 5, 0.45), e('moonsilver_ore', 3, 7, 0.3), e('stone', 8, 16, 0.2)] },
  { id: 'mon_moonmoth', source: 'monster', entries: [e('coins', 520, 920, 1), e('nature_rune', 25, 50, 0.4), e('air_rune', 40, 80, 0.35), e('moonwood_logs', 3, 7, 0.3)] },
  { id: 'mon_fog_scavenger', source: 'monster', entries: [e('coins', 600, 1050, 1), e('moonsilver_arrows', 20, 45, 0.45), e('moonsilver_bar', 1, 3, 0.25), e('cooked_moonfin', 1, 3, 0.3)] },
  { id: 'mon_hollow_hound', source: 'monster', entries: [e('coins', 680, 1200, 1), e('moonwood_logs', 4, 10, 0.4), e('moonsilver_ore', 4, 9, 0.35), e('raw_moonfin', 3, 6, 0.3)] },
  {
    id: 'boss_the_hush', source: 'miniboss',
    entries: [e('coins', 2600, 4800, 1), e('moonsilver_bar', 8, 18, 0.6), e('great_moonfin', 3, 8, 0.5), e('moonwood_logs', 20, 40, 0.5), e('nature_rune', 50, 100, 0.45)],
    groups: [{ chance: 0, items: [] }], // replaced below with the gem group
  },
);

// ----- Monsters (Cinderpeak) -----
tables.push(
  { id: 'mon_ash_goat', source: 'monster', entries: [e('coins', 820, 1400, 1), e('emberite_ore', 3, 8, 0.4), e('emberpepper', 1, 3, 0.25), e('stone', 10, 20, 0.2)] },
  { id: 'mon_fire_salamander', source: 'monster', entries: [e('coins', 880, 1500, 1), e('fire_rune', 50, 100, 0.45), e('raw_emberfin', 2, 5, 0.35), e('emberbark_logs', 3, 7, 0.3)] },
  { id: 'mon_sooty_imp', source: 'monster', entries: [e('coins', 980, 1700, 1), e('emberite_arrows', 20, 45, 0.45), e('emberite_bar', 1, 3, 0.25), e('cooked_emberfin', 1, 3, 0.3)] },
  { id: 'mon_magma_tortoise', source: 'monster', entries: [e('coins', 1100, 1900, 1), e('emberite_ore', 5, 11, 0.45), e('emberbark_logs', 4, 10, 0.35), e('fire_rune', 40, 80, 0.3)] },
  {
    id: 'boss_kiln_wyrm', source: 'miniboss',
    entries: [e('coins', 4200, 7600, 1), e('emberite_bar', 8, 18, 0.6), e('great_emberfin', 3, 8, 0.5), e('emberbark_logs', 20, 40, 0.5), e('fire_rune', 80, 160, 0.5), e('heartfire_ember', 1, 1, 0.1)],
    groups: [{ chance: 0, items: [] }], // replaced below with the gem group
  },
);

// ----- 🌋 The Mountain Stirs: ember geodes (much likelier than plain finds) and what's inside. Never gems. -----
tables.push(
  { id: 'find_ember_geode', source: 'skilling', entries: [e('ember_geode', 1, 1, 1 / 40)] },
  { id: 'open_ember_geode', source: 'skilling', entries: [e('coins', 300, 900, 1), e('emberite_ore', 6, 14, 0.9), e('fire_rune', 20, 60, 0.5), e('heartfire_ember', 1, 1, 0.06), e('starlit_crystal', 1, 1, 0.05)] },
  // 🎒 The Traveller's gift at Cinderpeak's well.
  { id: 'gift_cinderpeak', source: 'skilling', entries: [e('coins', 5000, 5000, 1), e('travellers_compass', 1, 1, 1), e('emberpepper_seed', 3, 3, 1), e('ember_geode', 2, 2, 1)] },
);

// ----- 🐟 Rare fish: one roll per fishing action, then one fish of that water picked by weight -----
for (const region of new Set(RARE_FISH.map((f) => f.region))) {
  tables.push({ id: `rare_fish_${region}`, source: 'skilling', entries: [], groups: [{ chance: RARE_FISH_CHANCE, items: rareFishIn(region).map((f) => ({ item: f.id, weight: f.weight })) }] });
}

// ----- 🎪 Festivals: tokens while skilling or fighting, and the stall's treats -----
for (const f of FESTIVALS) {
  tables.push(
    { id: `festival_token_${f.id}`, source: 'skilling', entries: [e(f.token.id, 1, 1, TOKEN_CHANCE)] },
    { id: `festival_kill_${f.id}`, source: 'monster', entries: [e(f.token.id, 1, 1, TOKEN_CHANCE_KILL)] },
    { id: `festival_treat_${f.id}`, source: 'skilling', entries: [e(f.treat.id, 1, 1, 1)] },
  );
}

// ----- 🌿 Foraging: the herb, and sometimes a seed for your garden (replaces the plain herb table) -----
for (let t = 0; t < TIER_COUNT; t++) {
  tables.push({ id: `forage_${HERBS[t].key}`, source: 'skilling', entries: [e(HERBS[t].key, 1, 1, 1), e(`${CROPS[t].key}_seed`, 1, 1, 0.12)] });
}

// ----- 🌱 Harvesting a garden plot: a handful of the crop, and often a seed or two back -----
for (let t = 0; t < TIER_COUNT; t++) {
  tables.push({ id: `harvest_${CROPS[t].key}`, source: 'skilling', entries: [e(CROPS[t].key, 3, 6, 1), e(`${CROPS[t].key}_seed`, 1, 2, 0.6)] });
}

// ----- 🎁 Rare finds while gathering, and what's inside when you open them -----
/** Chance per gathering action to turn up a find. */
export const FIND_CHANCE = 1 / 250;
export const FIND_ITEM = { woodcutting: 'bird_nest', mining: 'geode', fishing: 'message_bottle' } as const;
for (const [skill, item] of Object.entries(FIND_ITEM)) {
  tables.push({ id: `find_${skill}`, source: 'skilling', entries: [e(item, 1, 1, FIND_CHANCE)] });
}
const oreFor = (t: number) => (t === 0 ? 'copper_ore' : t === 1 ? 'iron_ore' : t === 2 ? 'coal' : `${METALS[t].key}_ore`);
for (let t = 0; t < TIER_COUNT; t++) {
  const m = t + 1;
  tables.push(
    { id: `open_woodcutting_${t}`, source: 'skilling', entries: [e('coins', 30 * m, 90 * m, 1), e(`${WOODS[t].key}_logs`, 6, 15, 0.8), e('rune_essence', 5, 15, 0.4), e('golden_egg', 1, 1, 0.05)] },
    { id: `open_mining_${t}`, source: 'skilling', entries: [e('coins', 30 * m, 90 * m, 1), e(oreFor(t), 5, 12, 0.8), e('stone', 6, 15, 0.4), e('starlit_crystal', 1, 1, 0.05)] },
    { id: `open_fishing_${t}`, source: 'skilling', entries: [e('coins', 50 * m, 150 * m, 1), e(`raw_${FISH[t].key}`, 3, 8, 0.6), e('sea_pearl', 1, 1, 0.06)] },
  );
}

// ----- The Frontier beyond Cinderpeak (tiers 6–10): Frosthold, Voidreach, Starfall Crater, Celestine Spires, the Primordial Rift -----
// Coins grow about ×1.6 a town. Each town drops its own metal, wood, fish, crop and a rune that suits it.
{
  const town = (tier: number, ids: [string, string, string, string, string], rune: string, treasure: string, gift: { id: string; extra: [string, number][] }) => {
    const m = METALS[tier].key, w = WOODS[tier].key, f = FISH[tier].key, c = CROPS[tier].key;
    const k = Math.pow(1.6, tier - 5);
    const coins = (lo: number, hi: number) => e('coins', Math.round(lo * k / 10) * 10, Math.round(hi * k / 10) * 10, 1);
    const [melee, magic, ranged, tough, boss] = ids;
    tables.push(
      { id: `mon_${melee}`, source: 'monster', entries: [coins(820, 1400), e(oreFor(tier), 3, 8, 0.4), e(c, 1, 3, 0.25), e('stone', 10, 20, 0.2)] },
      { id: `mon_${magic}`, source: 'monster', entries: [coins(880, 1500), e(rune, 50, 100, 0.45), e(`raw_${f}`, 2, 5, 0.35), e(`${w}_logs`, 3, 7, 0.3)] },
      { id: `mon_${ranged}`, source: 'monster', entries: [coins(980, 1700), e(`${m}_arrows`, 20, 45, 0.45), e(`${m}_bar`, 1, 3, 0.25), e(`cooked_${f}`, 1, 3, 0.3)] },
      { id: `mon_${tough}`, source: 'monster', entries: [coins(1100, 1900), e(oreFor(tier), 5, 11, 0.45), e(`${w}_logs`, 4, 10, 0.35), e(rune, 40, 80, 0.3)] },
      {
        id: `boss_${boss}`, source: 'miniboss',
        entries: [coins(4200, 7600), e(`${m}_bar`, 8, 18, 0.6), e(`great_${f}`, 3, 8, 0.5), e(`${w}_logs`, 20, 40, 0.5), e(rune, 80, 160, 0.5), e(treasure, 1, 1, 0.1)],
        groups: [{ chance: 0, items: [] }], // replaced below with the gem group
      },
      // 🎒 The Traveller's gift at this town's well.
      { id: gift.id, source: 'skilling', entries: [e('coins', Math.round(5000 * k / 100) * 100, Math.round(5000 * k / 100) * 100, 1), e(treasure, 1, 1, 1), e(`${c}_seed`, 3, 3, 1), ...gift.extra.map(([id, n]) => e(id, n, n, 1))] },
    );
  };
  town(6, ['snow_hare', 'frost_wisp', 'snowball_bandit', 'woolly_ram', 'old_rimeback'], 'frost_rune', 'singing_icicle', { id: 'gift_frosthold', extra: [['great_frostcod', 5]] });
  town(7, ['gloom_mole', 'echo_wisp', 'ribbon_bandit', 'chasm_crawler', 'hollow_wyrm'], 'shadow_rune', 'echo_shell', { id: 'gift_voidreach', extra: [['dried_voidbloom', 10]] });
  town(8, ['crater_boar', 'star_sprite', 'comet_hawk', 'stardust_treant', 'stargrown_elder'], 'light_rune', 'star_shard', { id: 'gift_starfall_crater', extra: [['starbloom_logs', 30]] });
  town(9, ['cloud_ram', 'chime_sprite', 'sky_pirate', 'storm_gryphon', 'aurelion'], 'air_rune', 'cloud_pearl', { id: 'gift_celestine_spires', extra: [['light_rune', 150]] });
  town(10, ['fern_raptor', 'first_light', 'thornback', 'moss_colossus', 'first_wyrm'], 'nature_rune', 'first_fossil', { id: 'gift_primordial_rift', extra: [['travellers_cloak', 1]] });
}

// ----- Mini boss: the ONLY place gems drop (in Pocketvale) -----
/** Chance weights per rarity: common is common, mythic is very rare. */
export const GEM_RARITY_WEIGHTS: Partial<Record<GemRarity, number>> = { common: 45, uncommon: 28, rare: 15, epic: 8, legendary: 3, mythic: 1 };
function gemGroup(chance: number, weights: Partial<Record<GemRarity, number>> = GEM_RARITY_WEIGHTS): LootGroup {
  const groupItems: { item: string; weight: number }[] = [];
  for (const rarity of RARITIES) {
    if (!weights[rarity]) continue; // e.g. 🌌 Starborn: only the Ascension bosses have it
    const [lo, hi] = GEM_RANGES[rarity];
    const rolls = hi - lo + 1;
    for (const g of GEM_TYPES) {
      for (let v = lo; v <= hi; v++) {
        groupItems.push({ item: gemId(g.type, rarity, v * g.mult), weight: weights[rarity]! / rolls / GEM_TYPES.length });
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

// Forgefather Brask: a gem 80% of the time, slightly better odds than Old Thornhide.
tables.find((t) => t.id === 'boss_forgefather_brask')!.groups = [gemGroup(0.8, { common: 35, uncommon: 30, rare: 20, epic: 10, legendary: 4, mythic: 1 })];

// Mother Clawsoot: a gem 85% of the time, better odds again than Brask.
tables.find((t) => t.id === 'boss_mother_clawsoot')!.groups = [gemGroup(0.85, { common: 28, uncommon: 30, rare: 22, epic: 13, legendary: 5, mythic: 2 })];

// Old Galewing: a gem 88% of the time, rarities a step better again.
tables.find((t) => t.id === 'boss_old_galewing')!.groups = [gemGroup(0.88, { common: 22, uncommon: 30, rare: 25, epic: 15, legendary: 6, mythic: 2 })];

// The Hush: a gem 90% of the time, rarities a step better again.
tables.find((t) => t.id === 'boss_the_hush')!.groups = [gemGroup(0.9, { common: 18, uncommon: 29, rare: 27, epic: 17, legendary: 7, mythic: 2 })];

// The Kiln Wyrm: a gem 92% of the time, rarities a step better again.
tables.find((t) => t.id === 'boss_kiln_wyrm')!.groups = [gemGroup(0.92, { common: 14, uncommon: 28, rare: 29, epic: 19, legendary: 8, mythic: 2 })];

// The Frontier's mini bosses: a gem more often each town, and rarities a step better each time.
tables.find((t) => t.id === 'boss_old_rimeback')!.groups = [gemGroup(0.93, { common: 11, uncommon: 26, rare: 30, epic: 21, legendary: 9, mythic: 3 })];
tables.find((t) => t.id === 'boss_hollow_wyrm')!.groups = [gemGroup(0.94, { common: 9, uncommon: 24, rare: 30, epic: 23, legendary: 10, mythic: 4 })];
tables.find((t) => t.id === 'boss_stargrown_elder')!.groups = [gemGroup(0.95, { common: 7, uncommon: 22, rare: 30, epic: 25, legendary: 11, mythic: 5 })];
tables.find((t) => t.id === 'boss_aurelion')!.groups = [gemGroup(0.96, { common: 5, uncommon: 20, rare: 30, epic: 27, legendary: 12, mythic: 6 })];
tables.find((t) => t.id === 'boss_first_wyrm')!.groups = [gemGroup(0.98, { common: 3, uncommon: 17, rare: 30, epic: 29, legendary: 14, mythic: 7 })];

// ----- 🧭 Expedition bosses (v0.0.1.60): the town's mini boss loot, doubled, with a gem every time
// (same rarity odds as that town's mini boss) and a 30% chance of a second one.
const EXP_BOSS_FROM: [string, string][] = [
  ['whispering_oak', 'boss_old_thornhide'], ['lamp_eater', 'boss_forgefather_brask'], ['bog_lantern', 'boss_mother_clawsoot'],
  ['captain_barnacle', 'boss_old_galewing'], ['lamplighter', 'boss_the_hush'], ['ashhorn', 'boss_kiln_wyrm'], ['pass_yeti', 'boss_old_rimeback'],
  ['ribbon_heron', 'boss_hollow_wyrm'], ['starhorn', 'boss_stargrown_elder'], ['old_nimbus', 'boss_aurelion'], ['old_tusk', 'boss_first_wyrm'],
];
for (const [boss, from] of EXP_BOSS_FROM) {
  const mini = tables.find((t) => t.id === from)!;
  const gem = mini.groups![0];
  tables.push({
    id: `exp_${boss}`, source: 'boss',
    entries: mini.entries.map((x) => ({ ...x, min: x.min * 2, max: x.max * 2, chance: Math.min(1, x.chance + 0.2) })),
    groups: [{ chance: 1, items: gem.items }, { chance: 0.3, items: gem.items }],
  });
}

// ----- Weekly boss: 2 guaranteed gems with better rarity odds -----
const WEEKLY_GEM_WEIGHTS: Partial<Record<GemRarity, number>> = { common: 20, uncommon: 30, rare: 25, epic: 15, legendary: 7, mythic: 3 };
tables.push({
  id: 'boss_grumbleroot', source: 'boss',
  entries: [e('coins', 800, 1500, 1), e('great_trout', 5, 10, 1), e('iron_bar', 10, 20, 0.8), e('fire_rune', 30, 60, 0.6), e('oak_logs', 30, 60, 0.6), e('rune_essence', 40, 80, 0.5)],
  groups: [gemGroup(1, WEEKLY_GEM_WEIGHTS), gemGroup(1, WEEKLY_GEM_WEIGHTS)],
});

// ----- Wildfire (Firemaking mini boss) -----
tables.push({
  id: 'boss_wildfire', source: 'miniboss',
  entries: [e('coins', 100, 250, 1), e('oak_logs', 10, 20, 0.5), e('fire_rune', 10, 25, 0.6), e('pine_logs', 20, 40, 0.5)],
  groups: [gemGroup(0.35)],
});

// ----- 🌌 The Ascension bosses (the Road Up): the best gems, the only 🌌 Starborn ones, and Starlight.
// (Their Ascended item is rolled by core/combat.ts through the loot system, with better grade odds.)
const ASC_BOSS_LOOT: [string, number, number, number, number, Partial<Record<GemRarity, number>>][] = [
  // id, coins, starlight min, starlight max, gems, gem weights
  ['boss_skyward_warden', 30_000, 40, 80, 2, { uncommon: 10, rare: 30, epic: 32, legendary: 18, mythic: 8, starborn: 2 }],
  ['boss_cometail', 40_000, 60, 110, 2, { rare: 25, epic: 33, legendary: 24, mythic: 13, starborn: 5 }],
  ['boss_lantern_leviathan', 50_000, 80, 140, 2, { rare: 18, epic: 32, legendary: 27, mythic: 16, starborn: 7 }],
  ['boss_unlit_star', 65_000, 120, 200, 3, { rare: 12, epic: 28, legendary: 30, mythic: 20, starborn: 10 }],
];
for (const [id, coins, slMin, slMax, gems, weights] of ASC_BOSS_LOOT) {
  tables.push({
    id, source: 'boss',
    entries: [e('coins', coins, coins * 2, 1), e('starlight', slMin, slMax, 1)],
    groups: Array.from({ length: gems }, () => gemGroup(1, weights)),
  });
}

/** Gem rerolls: a fresh roll within the same type and rarity (used by the loot system). */
export function gemRerollTable(type: GemType, rarity: GemRarity): LootTable {
  const [lo, hi] = GEM_RANGES[rarity];
  const mult = GEM_TYPES.find((g) => g.type === type)!.mult;
  const groupItems = [];
  for (let v = lo; v <= hi; v++) groupItems.push({ item: gemId(type, rarity, v * mult), weight: 1 });
  return { id: `reroll_${type}_${rarity}`, source: 'miniboss', entries: [], groups: [{ chance: 1, items: groupItems }] };
}

export const LOOT_TABLES: Record<string, LootTable> = Object.fromEntries(tables.map((t) => [t.id, t]));
