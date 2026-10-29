// Static item definitions. No player data lives here.
// Tiered items (ores, bars, logs, fish, gear, tools, ammo) are generated for all 20 tiers from data/tiers.ts.
import { CROPS, FISH, HERBS, METALS, TIER_COUNT, WOODS, tierForLevel, tierLevel, tierPalette, tierRegion, tierXp, type Region } from './tiers';
import { RARE_FISH } from './rareFish';
import { FESTIVALS, TREAT_BUFF } from './festivals';
import { RELICS, relicItemId, type RelicKey } from './relics';

export type ItemCategory = 'ore' | 'bar' | 'log' | 'material' | 'fish' | 'food' | 'weapon' | 'armour' | 'tool' | 'gem' | 'ammo' | 'currency' | 'treasure'
  | 'herb' | 'crop' | 'seed' | 'meal';
export type CombatStyle = 'melee' | 'ranged' | 'magic';
export type GemType = 'ruby' | 'sapphire' | 'emerald';
export type GemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type EquipSlot =
  | 'head' | 'body' | 'legs' | 'weapon' | 'shield'
  | 'pickaxe' | 'axe' | 'rod' | 'tinderbox' | 'skillet' | 'hammer' | 'knife' | 'sickle' | 'trowel';
export type IconKind =
  | 'ore' | 'rock' | 'bar' | 'log' | 'fish' | 'cooked' | 'shrimp' | 'cooked_shrimp' | 'gem'
  | 'pickaxe' | 'axe' | 'rod' | 'tinderbox' | 'skillet' | 'hammer' | 'knife' | 'sickle' | 'trowel'
  | 'sword' | 'shield' | 'helmet' | 'chest' | 'legs'
  | 'bow' | 'staff' | 'arrows' | 'rune' | 'coins' | 'talisman';
export type SkillId =
  | 'mining' | 'smithing' | 'woodcutting' | 'firemaking' | 'fishing' | 'cooking' | 'crafting' | 'enhancing'
  | 'runecrafting' | 'herblore' | 'farming'
  | 'melee' | 'ranged' | 'magic' | 'defense' | 'health';

/** A timed bonus from a meal or brew (Cooking). 'speed' makes actions faster; 'xp' gives more XP. */
export interface Buff {
  /** The skill it helps, 'combat' (all combat skills) or 'all'. */
  skill: SkillId | 'combat' | 'all';
  kind: 'speed' | 'xp';
  pct: number;
  minutes: number;
  /** Its own bonus slot, so it stacks with meals/brews instead of replacing them (festival treats). */
  slot?: string;
}

/** Colour keys. Each tier/material gets its own tint so icons look unique. */
export const TIER_COLORS: Record<string, { main: string; light: string; dark: string }> = {
  copper: { main: '#c8773f', light: '#e9a46f', dark: '#7e4320' },
  tin: { main: '#aab6bd', light: '#dbe3e7', dark: '#5f6a70' },
  bronze: { main: '#c99248', light: '#ecc27d', dark: '#7a5320' },
  iron: { main: '#8b949c', light: '#c4cbd1', dark: '#4a5157' },
  coal: { main: '#3f3f46', light: '#71717a', dark: '#18181b' },
  stone: { main: '#8a8278', light: '#b3aa9e', dark: '#4f4942' },
  pine: { main: '#a8743f', light: '#d6a66b', dark: '#5f3d1d' },
  oak: { main: '#7d5a36', light: '#b58b5c', dark: '#45301a' },
  shrimp: { main: '#f08a6c', light: '#ffc2ad', dark: '#a04a33' },
  trout: { main: '#7aa6b8', light: '#c3dde6', dark: '#3f6473' },
  gold: { main: '#fbbf24', light: '#fde68a', dark: '#92610f' },
  essence: { main: '#c7d2fe', light: '#eef2ff', dark: '#6366f1' },
  air: { main: '#e0f2fe', light: '#ffffff', dark: '#7dd3fc' },
  water: { main: '#3b82f6', light: '#bfdbfe', dark: '#1e3a8a' },
  earth: { main: '#84cc16', light: '#d9f99d', dark: '#3f6212' },
  fire: { main: '#f97316', light: '#fed7aa', dark: '#9a3412' },
  nature: { main: '#22c55e', light: '#bbf7d0', dark: '#166534' },
  frost: { main: '#67e8f9', light: '#ecfeff', dark: '#0e7490' },
  shadow: { main: '#6d28d9', light: '#c4b5fd', dark: '#2e1065' },
  light: { main: '#fde047', light: '#fefce8', dark: '#a16207' },
  ruby: { main: '#ef4444', light: '#fecaca', dark: '#7f1d1d' },
  sapphire: { main: '#3b82f6', light: '#bfdbfe', dark: '#1e3a8a' },
  emerald: { main: '#22c55e', light: '#bbf7d0', dark: '#14532d' },
};
// Generated colours for the new tiers (existing hand-picked ones are kept).
for (const m of METALS) TIER_COLORS[m.key] ??= tierPalette(m.hue, m.sat, m.light);
for (const w of WOODS) TIER_COLORS[w.key] ??= tierPalette(w.hue, 40, w.light);
for (const f of FISH) TIER_COLORS[f.key] ??= tierPalette(f.hue, 60, 60);

export const RARITIES: GemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
export const RARITY_COLORS: Record<GemRarity, string> = {
  common: '#a8a29e', uncommon: '#4ade80', rare: '#60a5fa', epic: '#c084fc', legendary: '#fb923c', mythic: '#f472b6',
};

export interface ItemStats {
  attack?: number;
  defense?: number;
  /** Extra maximum hit points. */
  health?: number;
  /** Percent faster actions in that skill, e.g. 5 = 5% less time. */
  miningSpeed?: number;
  woodcuttingSpeed?: number;
  fishingSpeed?: number;
  firemakingSpeed?: number;
  cookingSpeed?: number;
  smithingSpeed?: number;
  craftingSpeed?: number;
  herbloreSpeed?: number;
  farmingSpeed?: number;
}

export const STAT_LABELS: Record<keyof ItemStats, string> = {
  attack: 'Attack',
  defense: 'Defense',
  health: 'Max HP',
  miningSpeed: 'Mining speed %',
  woodcuttingSpeed: 'Woodcutting speed %',
  fishingSpeed: 'Fishing speed %',
  firemakingSpeed: 'Firemaking speed %',
  cookingSpeed: 'Cooking speed %',
  smithingSpeed: 'Smithing speed %',
  craftingSpeed: 'Crafting speed %',
  herbloreSpeed: 'Herblore speed %',
  farmingSpeed: 'Farming growth %',
};

export type Element = 'air' | 'water' | 'earth' | 'fire' | 'nature' | 'frost' | 'shadow' | 'light';

export interface EquipInfo {
  slot: EquipSlot;
  stats: ItemStats;
  /** Skill level needed to equip. */
  req?: { skill: SkillId; level: number };
  /** Tools: which resource tier this tool unlocks (0 = Stone, 1 = Bronze, ...). */
  toolTier?: number;
  /** Weapons: which combat style they use. */
  style?: CombatStyle;
  /** Weapons: milliseconds between attacks. */
  speedMs?: number;
  /** Elemental staffs: which runes they cast with. */
  element?: Element;
}

/** For items that can be improved +1 to +10. */
export interface UpgradeInfo {
  /** Item id of the +0 version. */
  base: string;
  level: number;
  /** Which skill improves it: Crafting for tools, Enhancing for smithed gear. */
  by: 'crafting' | 'enhancing';
}

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  tier: string;
  icon: IconKind;
  stackable: boolean;
  description: string;
  equip?: EquipInfo;
  upgrade?: UpgradeInfo;
  /** Food: how many hit points it restores. */
  heals?: number;
  /** Arrows and runes: used up by Ranged/Magic attacks; power adds to max hit. */
  ammo?: { style: 'ranged' | 'magic'; power: number; element?: Element };
  /** Gems: socket into a gear slot. Higher rarity = better stat rolls. */
  gem?: { type: GemType; rarity: GemRarity; value: number };
  /** Region this item comes from (locked regions aren't built yet). */
  region?: Region;
  /** Resource tier 0–19. */
  tierNum?: number;
  /** Drawn as this emoji instead of a drawn icon (rare finds and treasures). */
  emoji?: string;
  /** Fixed trading value (treasures). */
  value?: number;
  /** Rare finds: which gathering skill's open table it uses when opened. */
  opens?: 'woodcutting' | 'mining' | 'fishing';
  /** A find that always opens with this loot table (instead of the best-area one). */
  opensTable?: string;
  /** Meals and brews: the timed bonus you get when you eat or drink it. */
  buff?: Buff;
  /** Seeds: the crop (tier index into CROPS) it grows into. */
  seedOf?: number;
  /** ✨ Relics: one-of-a-kind gear from the Pedlar's crates (can't be sold or upgraded). */
  relic?: { key: RelicKey };
}

export const MAX_UPGRADE = 10;
export const upgradeId = (base: string, level: number) => (level === 0 ? base : `${base}_p${level}`);

const items: ItemDef[] = [
  { id: 'copper_ore', name: 'Copper ore', category: 'ore', tier: 'copper', icon: 'ore', stackable: true, tierNum: 0, region: 'Pocketvale', description: 'A warm orange ore. Smelt with tin to make bronze.' },
  { id: 'tin_ore', name: 'Tin ore', category: 'ore', tier: 'tin', icon: 'ore', stackable: true, tierNum: 0, region: 'Pocketvale', description: 'A soft grey ore. Smelt with copper to make bronze.' },
  { id: 'iron_ore', name: 'Iron ore', category: 'ore', tier: 'iron', icon: 'ore', stackable: true, tierNum: 1, region: tierRegion(1), description: 'Heavy and dependable. Smelts into iron bars.' },
  { id: 'coal', name: 'Coal', category: 'ore', tier: 'coal', icon: 'ore', stackable: true, tierNum: 2, region: tierRegion(2), description: 'Black and dusty. Needed with iron ore to make steel.' },
  { id: 'stone', name: 'Stone', category: 'material', tier: 'stone', icon: 'rock', stackable: true, description: 'A sturdy chunk of stone. Used for crafting tools.' },
  { id: 'rune_essence', name: 'Rune essence', category: 'material', tier: 'essence', icon: 'rock', stackable: true, description: 'Glittering stone humming with magic. Runecrafting turns it into runes and talismans.' },
  // Coins (go straight to your purse, not your bag)
  { id: 'coins', name: 'Coins', category: 'currency', tier: 'gold', icon: 'coins', stackable: true, description: 'Shiny coins. Spend them at the Trading Post and on upgrades.' },
];

// ----- Ores (tier 3+ have their own ore; tier 0 = copper+tin, 1 = iron, 2 = iron+coal) -----
/** What each metal's bar is smelted from. */
export const METAL_ORES: { item: string; qty: number }[][] = METALS.map((m, t) => {
  if (t === 0) return [{ item: 'copper_ore', qty: 1 }, { item: 'tin_ore', qty: 1 }];
  if (t === 1) return [{ item: 'iron_ore', qty: 1 }];
  if (t === 2) return [{ item: 'iron_ore', qty: 1 }, { item: 'coal', qty: 2 }];
  return [{ item: `${m.key}_ore`, qty: 1 }];
});
for (let t = 3; t < TIER_COUNT; t++) {
  const m = METALS[t];
  items.push({ id: `${m.key}_ore`, name: `${m.name} ore`, category: 'ore', tier: m.key, icon: 'ore', stackable: true, tierNum: t, region: tierRegion(t), description: `Rare ore from ${tierRegion(t)}. Smelts into ${m.name.toLowerCase()} bars.` });
}

// ----- Bars -----
for (let t = 0; t < TIER_COUNT; t++) {
  const m = METALS[t];
  items.push({ id: `${m.key}_bar`, name: `${m.name} bar`, category: 'bar', tier: m.key, icon: 'bar', stackable: true, tierNum: t, region: tierRegion(t), description: `A bar of ${m.name.toLowerCase()}, ready for the anvil.` });
}

// ----- Logs -----
for (let t = 0; t < TIER_COUNT; t++) {
  const w = WOODS[t];
  const desc = t === 0 ? 'Light, sappy logs. Burn with a bright orange flame.' : t === 1 ? 'Strong oak. Burns long with a golden flame.' : `${w.name} logs from ${tierRegion(t)}. Burn long with a coloured flame.`;
  items.push({ id: `${w.key}_logs`, name: `${w.name} logs`, category: 'log', tier: w.key, icon: 'log', stackable: true, tierNum: t, region: tierRegion(t), description: desc });
}

// ----- Fish & food -----
/** Hit points restored by normal / Great food per fish tier. */
export const foodHeals = (t: number) => (t === 0 ? [6, 9] : t === 1 ? [14, 20] : [Math.round(6 * Math.pow(1.45, t)), Math.round(6 * Math.pow(1.45, t) * 1.4)]);
for (let t = 0; t < TIER_COUNT; t++) {
  const f = FISH[t];
  const [heal, great] = foodHeals(t);
  const short = t === 1 ? 'trout' : f.name.toLowerCase();
  items.push(
    { id: `raw_${f.key}`, name: `Raw ${f.name.toLowerCase()}`, category: 'fish', tier: f.key, icon: f.shrimp ? 'shrimp' : 'fish', stackable: true, tierNum: t, region: tierRegion(t), description: t === 0 ? 'Fresh from the river. Cook it before eating.' : `Cook it before eating.` },
    { id: `cooked_${f.key}`, name: `Cooked ${short}`, category: 'food', tier: f.key, icon: f.shrimp ? 'cooked_shrimp' : 'cooked', stackable: true, heals: heal, tierNum: t, region: tierRegion(t), description: 'Tasty! Eat it in combat to heal.' },
    { id: `great_${f.key}`, name: `Great ${short}`, category: 'food', tier: f.key, icon: f.shrimp ? 'cooked_shrimp' : 'cooked', stackable: true, heals: great, tierNum: t, region: tierRegion(t), description: 'Perfectly seared. Heals more in combat.' },
  );
}

// ----- Arrows (one per metal) -----
for (let t = 0; t < TIER_COUNT; t++) {
  const m = METALS[t];
  items.push({
    id: `${m.key}_arrows`, name: `${m.name} arrows`, category: 'ammo', tier: m.key, icon: 'arrows', stackable: true, tierNum: t, region: tierRegion(t),
    ammo: { style: 'ranged', power: 2 * (t + 1) },
    description: t === 0 ? 'Fired by bows. Each shot uses one (sometimes you get it back).' : 'Sharper arrows that hit harder.',
  });
}

// ----- Runecrafting: elements, talismans, runes -----
export const ELEMENTS: { element: Element; name: string; level: number; power: number }[] = [
  { element: 'air', name: 'Air', level: 1, power: 2 },
  { element: 'water', name: 'Water', level: 10, power: 3 },
  { element: 'earth', name: 'Earth', level: 20, power: 4 },
  { element: 'fire', name: 'Fire', level: 30, power: 5 },
  { element: 'nature', name: 'Nature', level: tierLevel(3), power: 9 },
  { element: 'frost', name: 'Frost', level: tierLevel(6), power: 14 },
  { element: 'shadow', name: 'Shadow', level: tierLevel(7), power: 20 },
  { element: 'light', name: 'Light', level: tierLevel(9), power: 27 },
];
export const elementRegion = (level: number) => tierRegion(tierForLevel(level));
for (const el of ELEMENTS) {
  const region = elementRegion(el.level);
  items.push(
    { id: `${el.element}_talisman`, name: `${el.name} talisman`, category: 'material', tier: el.element, icon: 'talisman', stackable: false, region,
      description: `Keep it in your bag to craft ${el.name} runes. It's never used up.` },
    { id: `${el.element}_rune`, name: `${el.name} rune`, category: 'ammo', tier: el.element, icon: 'rune', stackable: true, region,
      ammo: { style: 'magic', power: el.power, element: el.element },
      description: `Powers ${el.name} staffs. Each cast uses one (sometimes you keep it). Also used to make ${el.name} staffs.` },
  );
}

// ----- Gems: 3 types × 6 rarities × each possible stat roll -----
export const GEM_TYPES: { type: GemType; name: string; stat: 'attack' | 'defense' | 'health'; mult: number }[] = [
  { type: 'ruby', name: 'Ruby', stat: 'attack', mult: 1 },
  { type: 'sapphire', name: 'Sapphire', stat: 'defense', mult: 1 },
  { type: 'emerald', name: 'Emerald', stat: 'health', mult: 3 },
];
/** Stat range for each rarity (before the type multiplier). */
export const GEM_RANGES: Record<GemRarity, [number, number]> = {
  common: [1, 2], uncommon: [2, 3], rare: [3, 5], epic: [5, 7], legendary: [7, 10], mythic: [10, 14],
};
export const gemId = (type: GemType, rarity: GemRarity, value: number) => `${type}_${rarity}_${value}`;
for (const g of GEM_TYPES) {
  for (const rarity of RARITIES) {
    const [lo, hi] = GEM_RANGES[rarity];
    for (let v = lo; v <= hi; v++) {
      const value = v * g.mult;
      const rarityName = rarity[0].toUpperCase() + rarity.slice(1);
      items.push({
        id: gemId(g.type, rarity, value),
        name: `${rarityName} ${g.name}`,
        category: 'gem', tier: g.type, icon: 'gem', stackable: true,
        gem: { type: g.type, rarity, value },
        description: `+${value} ${g.stat === 'health' ? 'Max HP' : g.stat === 'attack' ? 'Attack' : 'Defense'} when socketed. Rolls ${lo * g.mult}–${hi * g.mult} at this rarity.`,
      });
    }
  }
}

export function gemStats(id: string): ItemStats {
  const g = ITEMS[id]?.gem;
  if (!g) return {};
  const stat = GEM_TYPES.find((t) => t.type === g.type)!.stat;
  return { [stat]: g.value };
}

/** Stats grow with each upgrade level: roughly +12% of the base per level, at least +1. */
export function upgradedStats(base: ItemStats, level: number): ItemStats {
  const out: ItemStats = {};
  for (const [k, v] of Object.entries(base) as [keyof ItemStats, number][]) {
    out[k] = v + (level === 0 ? 0 : Math.max(level, Math.ceil(v * 0.12 * level)));
  }
  return out;
}

function addUpgradable(base: Omit<ItemDef, 'upgrade'> & { equip: EquipInfo }, by: UpgradeInfo['by']) {
  for (let level = 0; level <= MAX_UPGRADE; level++) {
    items.push({
      ...base,
      id: upgradeId(base.id, level),
      name: level === 0 ? base.name : `${base.name} +${level}`,
      equip: { ...base.equip, stats: upgradedStats(base.equip.stats, level) },
      upgrade: { base: base.id, level, by },
    });
  }
}

/** Combat level needed to equip tier-t gear: none at tier 0, then the tier level minus 20 (70, 160, 250 …). */
export const gearReq = (t: number) => (t === 0 ? 0 : tierLevel(t) - 20);

/** Gear pieces made at the anvil, per metal tier. */
export const GEAR_PIECES = [
  { key: 'sword', name: 'sword', icon: 'sword', slot: 'weapon', category: 'weapon', bars: 2, levelOffset: 5, tab: 'Weapons' },
  { key: 'helmet', name: 'helmet', icon: 'helmet', slot: 'head', category: 'armour', bars: 2, levelOffset: 12, tab: 'Armour' },
  { key: 'shield', name: 'shield', icon: 'shield', slot: 'shield', category: 'armour', bars: 3, levelOffset: 20, tab: 'Armour' },
  { key: 'platelegs', name: 'platelegs', icon: 'legs', slot: 'legs', category: 'armour', bars: 4, levelOffset: 28, tab: 'Armour' },
  { key: 'chestplate', name: 'chestplate', icon: 'chest', slot: 'body', category: 'armour', bars: 5, levelOffset: 36, tab: 'Armour' },
] as const;

/** Milliseconds between your attacks for each style (lower = faster, snappier fights). */
export const WEAPON_SPEED = { melee: 1600, ranged: 1700, magic: 1900 } as const;

export const METAL_TIERS = METALS.map((m, t) => ({
  t, tier: m.key, name: m.name, bar: `${m.key}_bar`, level: tierLevel(t), power: t + 1,
  barXp: t === 0 ? 8 : t === 1 ? 12 : tierXp(t), region: tierRegion(t),
}));

function gearStats(piece: (typeof GEAR_PIECES)[number]['key'], power: number): ItemStats {
  switch (piece) {
    case 'sword': return { attack: 6 * power };
    case 'helmet': return { defense: 3 * power };
    case 'shield': return { defense: 5 * power };
    case 'platelegs': return { defense: 5 * power };
    case 'chestplate': return { defense: 8 * power };
  }
}

for (const metal of METAL_TIERS) {
  for (const piece of GEAR_PIECES) {
    const req = gearReq(metal.t);
    addUpgradable({
      id: `${metal.tier}_${piece.key}`,
      name: `${metal.name} ${piece.name}`,
      category: piece.category,
      tier: metal.tier,
      icon: piece.icon,
      stackable: false,
      tierNum: metal.t,
      region: metal.region,
      description: piece.key === 'sword'
        ? `A ${metal.name.toLowerCase()} sword for Melee combat. Improve it with Enhancing.`
        : `Sturdy ${metal.name.toLowerCase()} armour. Improve it with Enhancing.`,
      equip: {
        slot: piece.slot,
        stats: gearStats(piece.key, metal.power),
        req: req ? { skill: piece.key === 'sword' ? 'melee' : 'defense', level: req } : undefined,
        ...(piece.key === 'sword' ? { style: 'melee' as const, speedMs: WEAPON_SPEED.melee } : {}),
      },
    }, 'enhancing');
  }
}

/** Bows (Ranged), one per wood tier, made at the Workshop. Improve them with Enhancing (uses bars). */
export const BOWS = WOODS.map((w, t) => ({
  t, id: t === 0 ? 'pine_shortbow' : t === 1 ? 'oak_longbow' : `${w.key}_bow`,
  name: t === 0 ? 'Pine shortbow' : t === 1 ? 'Oak longbow' : `${w.name} bow`,
  tier: w.key, attack: 5 * (t + 1), req: gearReq(t) || 1, bar: METALS[t].key + '_bar', region: tierRegion(t),
}));
for (const w of BOWS) {
  addUpgradable({
    id: w.id, name: w.name, category: 'weapon', tier: w.tier, icon: 'bow', stackable: false, tierNum: w.t, region: w.region,
    description: 'A bow for Ranged combat. Needs arrows in your bag.',
    equip: { slot: 'weapon', stats: { attack: w.attack }, style: 'ranged', speedMs: WEAPON_SPEED.ranged, req: w.req > 1 ? { skill: 'ranged', level: w.req } : undefined },
  }, 'enhancing');
}

/** Blank staffs come from the Workshop (one per wood tier); Runecrafting turns them into elemental staffs with runes. */
export const STAFF_WOODS = WOODS.map((w, t) => ({
  t, wood: w.key, name: w.name, attack: 5 * (t + 1), req: gearReq(t) || 1, bar: METALS[t].key + '_bar',
  runes: Math.min(500, 50 * (t + 1)), imbueLevel: t === 0 ? 2 : tierLevel(t), region: tierRegion(t),
}));
for (const s of STAFF_WOODS) {
  items.push({
    id: `${s.wood}_staff`, name: `Blank ${s.name.toLowerCase()} staff`, category: 'material', tier: s.wood, icon: 'staff', stackable: false, tierNum: s.t, region: s.region,
    description: 'A plain staff with no magic yet. At Runecrafting, add runes to make it an elemental staff.',
  });
  for (const el of ELEMENTS) {
    const later = elementRegion(el.level);
    const region = REGION_ORDER(later) > REGION_ORDER(s.region) ? later : s.region;
    addUpgradable({
      id: `${s.wood}_${el.element}_staff`, name: `${s.name} ${el.name.toLowerCase()} staff`, category: 'weapon', tier: el.element, icon: 'staff', stackable: false, tierNum: s.t, region,
      description: `A Magic staff that casts ${el.name} spells using ${el.name} runes from your bag.`,
      equip: {
        slot: 'weapon', stats: { attack: s.attack }, style: 'magic', element: el.element, speedMs: WEAPON_SPEED.magic,
        req: s.req > 1 ? { skill: 'magic', level: s.req } : undefined,
      },
    }, 'enhancing');
  }
}
function REGION_ORDER(r: Region): number {
  return ['Pocketvale', 'Ironmoor', 'Coalhaven', 'Bluecliff', 'Lunaria', 'Cinderpeak', 'Frosthold', 'Voidreach', 'Starfall Crater', 'Celestine Spires', 'Primordial Rift'].indexOf(r);
}

/**
 * Skilling tools made at the Crafting bench. Every skill that gathers or makes things has one.
 * A tool of tier N is needed to gather/make that skill's tier-N resources (tier 0 needs no tool).
 * `logs` + `hard` = materials (stone for Stone tools; the previous tier's bars and logs after that).
 */
export const CRAFTED_TOOLS = [
  { key: 'pickaxe', name: 'pickaxe', icon: 'pickaxe', slot: 'pickaxe', skill: 'mining', stat: 'miningSpeed', logs: 2, hard: 2, levelOffset: 0 },
  { key: 'axe', name: 'axe', icon: 'axe', slot: 'axe', skill: 'woodcutting', stat: 'woodcuttingSpeed', logs: 2, hard: 2, levelOffset: 0 },
  { key: 'rod', name: 'fishing rod', icon: 'rod', slot: 'rod', skill: 'fishing', stat: 'fishingSpeed', logs: 3, hard: 1, levelOffset: 3 },
  { key: 'knife', name: 'knife', icon: 'knife', slot: 'knife', skill: 'crafting', stat: 'craftingSpeed', logs: 1, hard: 1, levelOffset: 5 },
  { key: 'hammer', name: 'hammer', icon: 'hammer', slot: 'hammer', skill: 'smithing', stat: 'smithingSpeed', logs: 1, hard: 2, levelOffset: 8 },
  { key: 'tinderbox', name: 'tinderbox', icon: 'tinderbox', slot: 'tinderbox', skill: 'firemaking', stat: 'firemakingSpeed', logs: 1, hard: 2, levelOffset: 10 },
  { key: 'skillet', name: 'skillet', icon: 'skillet', slot: 'skillet', skill: 'cooking', stat: 'cookingSpeed', logs: 1, hard: 3, levelOffset: 15 },
  { key: 'sickle', name: 'sickle', icon: 'sickle', slot: 'sickle', skill: 'herblore', stat: 'herbloreSpeed', logs: 1, hard: 2, levelOffset: 0 },
  { key: 'trowel', name: 'trowel', icon: 'trowel', slot: 'trowel', skill: 'farming', stat: 'farmingSpeed', logs: 1, hard: 2, levelOffset: 0 },
] as const;

/** Tool tiers: 0 = Stone (pine + stone), k ≥ 1 = made from tier k-1 bars and logs (Bronze, Iron, Steel, …). */
export const TOOL_TIERS = Array.from({ length: TIER_COUNT }, (_, k) => {
  if (k === 0) return { k, tier: 'stone', name: 'Stone', rodName: 'Pine fishing rod', logs: 'pine_logs', hard: 'stone', level: 1, power: 1, toolTier: 0, xpBase: 8, region: tierRegion(0) };
  const m = METALS[k - 1];
  return {
    k, tier: m.key, name: m.name, rodName: `${m.name} fishing rod`, logs: `${WOODS[k - 1].key}_logs`, hard: `${m.key}_bar`,
    level: tierLevel(k), power: k + 1, toolTier: k, xpBase: k === 1 ? 12 : tierXp(k), region: tierRegion(k),
  };
});

/** Which gear slot holds each skill's tool. */
export const TOOL_SLOT_FOR: Partial<Record<SkillId, EquipSlot>> = Object.fromEntries(
  CRAFTED_TOOLS.map((t) => [t.skill, t.slot]),
);

export function toolName(tier: (typeof TOOL_TIERS)[number], tool: (typeof CRAFTED_TOOLS)[number]) {
  return tool.key === 'rod' ? tier.rodName : `${tier.name} ${tool.name}`;
}

for (const tier of TOOL_TIERS) {
  for (const tool of CRAFTED_TOOLS) {
    addUpgradable({
      id: `${tier.tier}_${tool.key}`,
      name: toolName(tier, tool),
      category: 'tool',
      tier: tier.tier,
      icon: tool.icon,
      stackable: false,
      tierNum: tier.k,
      region: tier.region,
      description: `Makes ${tool.skill} faster. ${tier.toolTier > 0 ? `Needed for tier ${tier.toolTier + 1} ${tool.skill} resources (level ${tier.level}+). ` : ''}Upgrade it at the Workshop — even while equipped.`,
      equip: {
        slot: tool.slot,
        stats: { [tool.stat]: 5 * tier.power },
        req: { skill: tool.skill, level: tier.level },
        toolTier: tier.toolTier,
      },
    }, 'crafting');
  }
}

// ----- ✨ Relics (one per town strength; found only in the Wandering Pedlar's sealed crates) -----
// About as strong as a +4 piece of that town's gear, plus a special trait (core/relics.ts).
const RELIC_GEAR: Record<string, { icon: IconKind; category: ItemCategory; skill?: SkillId; stat: (t: number) => ItemStats; style?: CombatStyle }> = {
  axe: { icon: 'axe', category: 'tool', skill: 'woodcutting', stat: (t) => ({ woodcuttingSpeed: Math.round(7.5 * (t + 1)) }) },
  pickaxe: { icon: 'pickaxe', category: 'tool', skill: 'mining', stat: (t) => ({ miningSpeed: Math.round(7.5 * (t + 1)) }) },
  rod: { icon: 'rod', category: 'tool', skill: 'fishing', stat: (t) => ({ fishingSpeed: Math.round(7.5 * (t + 1)) }) },
  hammer: { icon: 'hammer', category: 'tool', skill: 'smithing', stat: (t) => ({ smithingSpeed: Math.round(7.5 * (t + 1)) }) },
  skillet: { icon: 'skillet', category: 'tool', skill: 'cooking', stat: (t) => ({ cookingSpeed: Math.round(7.5 * (t + 1)) }) },
  emberheart_blade: { icon: 'sword', category: 'weapon', skill: 'melee', style: 'melee', stat: (t) => ({ attack: 9 * (t + 1) }) },
  galewhisper_bow: { icon: 'bow', category: 'weapon', skill: 'ranged', style: 'ranged', stat: (t) => ({ attack: Math.round(7.5 * (t + 1)) }) },
  starweaver_staff: { icon: 'staff', category: 'weapon', skill: 'magic', style: 'magic', stat: (t) => ({ attack: Math.round(7.5 * (t + 1)) }) },
  shield: { icon: 'shield', category: 'armour', skill: 'defense', stat: (t) => ({ defense: Math.round(7.5 * (t + 1)) }) },
  head: { icon: 'helmet', category: 'armour', skill: 'defense', stat: (t) => ({ defense: Math.round(4.5 * (t + 1)) }) },
  body: { icon: 'chest', category: 'armour', skill: 'defense', stat: (t) => ({ defense: 12 * (t + 1) }) },
};
for (const r of RELICS) {
  const g = RELIC_GEAR[r.slot === 'weapon' ? r.key : r.slot];
  for (let t = 0; t < TIER_COUNT; t++) {
    const region = tierRegion(t);
    const req = g.category === 'tool' ? (t > 0 ? tierLevel(t) : 0) : gearReq(t);
    items.push({
      id: relicItemId(r.key, t), name: t === 0 ? r.name : `${r.name} (${region})`, category: g.category, tier: METALS[t].key, icon: g.icon, emoji: r.emoji,
      stackable: false, tierNum: t, region, relic: { key: r.key },
      description: `✨ Relic — one of a kind. ${r.trait}. ${r.lore}`,
      equip: {
        slot: r.slot, stats: g.stat(t),
        req: req && g.skill ? { skill: g.skill, level: req } : undefined,
        ...(g.category === 'tool' ? { toolTier: t } : {}),
        ...(g.style ? { style: g.style, speedMs: WEAPON_SPEED[g.style] } : {}),
      },
    });
  }
}

// ----- 🎁 Rare finds while gathering (open them from the bag) and the treasures inside -----
// Never gems: gems only come from bosses.
items.push(
  { id: 'bird_nest', name: "Bird's nest", category: 'treasure', tier: 'pine', icon: 'coins', emoji: '🪺', stackable: true,
    description: 'Knocked loose from a tree. Something rustles inside — open it!', opens: 'woodcutting' },
  { id: 'geode', name: 'Geode', category: 'treasure', tier: 'stone', icon: 'coins', emoji: '🪨', stackable: true,
    description: 'A plain-looking rock that sparkles when you shake it. Crack it open!', opens: 'mining' },
  { id: 'message_bottle', name: 'Corked bottle', category: 'treasure', tier: 'trout', icon: 'coins', emoji: '🍶', stackable: true,
    description: 'Bobbing in your net. There might be a note inside — open it!', opens: 'fishing' },
  { id: 'golden_egg', name: 'Golden egg', category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🥚', stackable: true, value: 1500,
    description: 'A real golden egg from a bird\'s nest. Traders pay handsomely for these.' },
  { id: 'starlit_crystal', name: 'Starlit crystal', category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🔮', stackable: true, value: 1800,
    description: 'Found inside a geode. Tiny stars drift inside it. Worth a lot at the Trading Post.' },
  { id: 'sea_pearl', name: 'Sea pearl', category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🦪', stackable: true, value: 1600,
    description: 'A perfect pearl that rolled out of a bottle. Traders love these.' },
  // 🌋 Cinderpeak
  { id: 'ember_geode', name: 'Ember geode', category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🌋', stackable: true,
    description: 'Shaken loose when the mountain stirs. Still warm, and it glows through the cracks. Crack it open!', opens: 'mining', opensTable: 'open_ember_geode' },
  { id: 'heartfire_ember', name: 'Heartfire ember', category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🔥', stackable: true, value: 4000,
    description: 'A coal from the heart of the mountain that never goes out. Traders in Cinderpeak treasure these.' },
  ...RARE_FISH.map((f): ItemDef => ({ id: f.id, name: f.name, category: 'treasure', tier: 'trout', icon: 'coins', emoji: f.emoji, stackable: true, value: f.value,
    region: f.region, description: `A rare fish from ${f.region}. ${f.blurb} Recorded in your Fishing Journal.` })),
  // 🎪 Seasonal festival tokens (spend them at the festival stall) and treats (+5% XP to everything for 30 min).
  ...FESTIVALS.flatMap((f): ItemDef[] => [
    { id: f.token.id, name: f.token.name, category: 'treasure', tier: 'gold', icon: 'coins', emoji: f.token.emoji, stackable: true, value: 20,
      description: `A keepsake from the ${f.name}. Trade them at the festival stall while the festival is on.` },
    { id: f.treat.id, name: f.treat.name, category: 'meal', tier: 'oak', icon: 'log', emoji: f.treat.emoji, stackable: true, tierNum: 0,
      buff: TREAT_BUFF, description: `${f.treat.description} (${f.name} treat)` },
  ]),
  { id: 'travellers_compass', name: "Traveller's compass", category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🧭', stackable: true, value: 2500,
    description: 'Left at a well by someone always one town ahead. The needle doesn\'t point north. It points further.' },
  // ❄️ Frosthold · 🌌 Voidreach · 🌠 Starfall Crater · ☁️ Celestine Spires · 🌀 the Primordial Rift
  { id: 'singing_icicle', name: 'Singing icicle', category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🧊', stackable: true, value: 6500, region: 'Frosthold',
    description: 'Hums one clear note when you hold it up to the light. It never melts. Frosthold choirs tune to these.' },
  { id: 'echo_shell', name: 'Echo shell', category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🐚', stackable: true, value: 9000, region: 'Voidreach',
    description: 'Found on the rim of the chasm. Hold it to your ear and you hear something someone will say tomorrow.' },
  { id: 'star_shard', name: 'Star shard', category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🌟', stackable: true, value: 12500, region: 'Starfall Crater',
    description: 'A chip of the fallen star. Warm, and humming the same note as the crater.' },
  { id: 'cloud_pearl', name: 'Cloud pearl', category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🫧', stackable: true, value: 17000, region: 'Celestine Spires',
    description: 'A pearl the sky carp make out of mist. Weighs nothing at all — keep a hand on it.' },
  { id: 'first_fossil', name: 'First fossil', category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🦴', stackable: true, value: 24000, region: 'Primordial Rift',
    description: 'The print of something that lived on the very first morning of the world.' },
  { id: 'travellers_cloak', name: "Traveller's cloak", category: 'treasure', tier: 'gold', icon: 'coins', emoji: '🧥', stackable: true, value: 1,
    description: 'Faded, patched, and soft from walking every road there is. Given to you at the end of the world. Nobody would buy it. Nobody should.' },
);

// ----- 🌿 Herblore: herbs and dried herbs · 🌱 Farming: seeds and crops (one of each per town) -----
for (let t = 0; t < TIER_COUNT; t++) {
  const h = HERBS[t];
  const c = CROPS[t];
  const region = tierRegion(t);
  items.push(
    { id: h.key, name: h.name, category: 'herb', tier: 'oak', icon: 'log', emoji: '🌿', stackable: true, tierNum: t, region,
      description: `A wild herb that grows around ${region}. Dry it to use in brews.` },
    { id: `dried_${h.key}`, name: `Dried ${h.name.toLowerCase()}`, category: 'herb', tier: 'oak', icon: 'log', emoji: '🍂', stackable: true, tierNum: t, region,
      description: `${h.name}, dried and fragrant. Used in Cooking brews.` },
    { id: `${c.key}_seed`, name: `${c.name} seed`, category: 'seed', tier: 'oak', icon: 'log', emoji: '🌱', stackable: true, tierNum: t, region, seedOf: t,
      description: `Plant it in your garden (Farming). Grows into ${c.name.toLowerCase()} in about ${c.growMinutes >= 60 ? `${c.growMinutes / 60} hour${c.growMinutes > 60 ? 's' : ''}` : `${c.growMinutes} minutes`}.` },
    { id: c.key, name: c.name, category: 'crop', tier: 'oak', icon: 'log', emoji: c.emoji, stackable: true, tierNum: t, region,
      description: `Fresh from your garden. Used in Cooking meals.` },
  );
}

// ----- 🍲 Meals (+speed) and 🍵 brews (+XP), made in Cooking. Eat or drink them from your bag. -----
export interface MealDef {
  id: string; name: string; emoji: string; tab: 'Meals' | 'Brews'; level: number; tierNum: number;
  inputs: { item: string; qty: number }[]; buff: Buff; description: string;
}
export const MEALS: MealDef[] = [
  { id: 'miners_pasty', name: "Miner's pasty", emoji: '🥟', tab: 'Meals', level: 10, tierNum: 0,
    inputs: [{ item: 'cooked_shrimp', qty: 2 }, { item: 'garlic', qty: 2 }], buff: { skill: 'mining', kind: 'speed', pct: 6, minutes: 30 },
    description: 'A warm pasty that fits in a miner\'s pocket.' },
  { id: 'foragers_salad', name: "Forager's salad", emoji: '🥗', tab: 'Meals', level: 20, tierNum: 0,
    inputs: [{ item: 'garlic', qty: 2 }, { item: 'dried_meadowsweet', qty: 1 }], buff: { skill: 'herblore', kind: 'speed', pct: 6, minutes: 30 },
    description: 'Crunchy, green and full of the meadow.' },
  { id: 'woodsmans_stew', name: "Woodsman's stew", emoji: '🍲', tab: 'Meals', level: 55, tierNum: 1,
    inputs: [{ item: 'cooked_shrimp', qty: 2 }, { item: 'onion', qty: 2 }], buff: { skill: 'woodcutting', kind: 'speed', pct: 6, minutes: 30 },
    description: 'Thick, hearty and good for swinging an axe all day.' },
  { id: 'anglers_chowder', name: "Angler's chowder", emoji: '🥣', tab: 'Meals', level: 60, tierNum: 1,
    inputs: [{ item: 'cooked_trout', qty: 2 }, { item: 'garlic', qty: 2 }], buff: { skill: 'fishing', kind: 'speed', pct: 6, minutes: 30 },
    description: 'Creamy chowder that keeps your hands steady on the rod.' },
  { id: 'forgehand_pie', name: 'Forge-hand pie', emoji: '🥧', tab: 'Meals', level: 70, tierNum: 1,
    inputs: [{ item: 'cooked_trout', qty: 2 }, { item: 'onion', qty: 2 }], buff: { skill: 'smithing', kind: 'speed', pct: 6, minutes: 30 },
    description: 'A sturdy pie for a sturdy smith.' },
  { id: 'hearth_roast', name: 'Hearth roast', emoji: '🍖', tab: 'Meals', level: 115, tierNum: 2,
    inputs: [{ item: 'cooked_salmon', qty: 2 }, { item: 'carrot', qty: 2 }], buff: { skill: 'firemaking', kind: 'speed', pct: 6, minutes: 30 },
    description: 'Slow-roasted by the fire. Of course.' },
  { id: 'tinkers_hotpot', name: "Tinker's hotpot", emoji: '🫕', tab: 'Meals', level: 125, tierNum: 2,
    inputs: [{ item: 'cooked_salmon', qty: 2 }, { item: 'carrot', qty: 3 }], buff: { skill: 'crafting', kind: 'speed', pct: 6, minutes: 30 },
    description: 'Bubbling away on the workbench stove.' },
  { id: 'mystic_broth', name: 'Mystic broth', emoji: '🍜', tab: 'Meals', level: 180, tierNum: 3,
    inputs: [{ item: 'cooked_lobster', qty: 2 }, { item: 'potato', qty: 2 }], buff: { skill: 'runecrafting', kind: 'speed', pct: 6, minutes: 30 },
    description: 'The steam curls into little rune shapes.' },
  { id: 'meadow_tea', name: 'Meadow tea', emoji: '🍵', tab: 'Brews', level: 5, tierNum: 0,
    inputs: [{ item: 'dried_meadowsweet', qty: 2 }], buff: { skill: 'farming', kind: 'xp', pct: 8, minutes: 30 },
    description: 'Calming and sweet. Gardeners swear by it.' },
  { id: 'ironroot_tonic', name: 'Ironroot tonic', emoji: '🧉', tab: 'Brews', level: 55, tierNum: 1,
    inputs: [{ item: 'dried_ironroot', qty: 2 }, { item: 'onion', qty: 1 }], buff: { skill: 'combat', kind: 'xp', pct: 8, minutes: 30 },
    description: 'Bitter, bracing and good for a fight.' },
  { id: 'willowcap_brew', name: 'Willowcap brew', emoji: '☕', tab: 'Brews', level: 112, tierNum: 2,
    inputs: [{ item: 'dried_willowcap', qty: 2 }], buff: { skill: 'cooking', kind: 'xp', pct: 8, minutes: 30 },
    description: 'An earthy brew cooks drink while they cook.' },
  { id: 'seafennel_tonic', name: 'Sea fennel tonic', emoji: '🧋', tab: 'Brews', level: 178, tierNum: 3,
    inputs: [{ item: 'dried_seafennel', qty: 2 }, { item: 'potato', qty: 1 }], buff: { skill: 'enhancing', kind: 'xp', pct: 8, minutes: 30 },
    description: 'Salty and sharp. Steadies the hand at the anvil.' },
  { id: 'moonpetal_tea', name: 'Moonpetal tea', emoji: '🫖', tab: 'Brews', level: 248, tierNum: 4,
    inputs: [{ item: 'dried_moonpetal', qty: 3 }, { item: 'moonmelon', qty: 1 }], buff: { skill: 'all', kind: 'xp', pct: 4, minutes: 30 },
    description: 'Silver and sweet. Everything feels a little easier.' },
  // 🌋 Cinderpeak
  { id: 'firepepper_chili', name: 'Fire-pepper chili', emoji: '🥘', tab: 'Meals', level: 325, tierNum: 5,
    inputs: [{ item: 'cooked_emberfin', qty: 2 }, { item: 'emberpepper', qty: 2 }], buff: { skill: 'all', kind: 'speed', pct: 4, minutes: 30 },
    description: 'So spicy your hands move faster just to fan your mouth. Everything goes a little quicker.' },
  { id: 'emberleaf_chai', name: 'Emberleaf chai', emoji: '🍵', tab: 'Brews', level: 322, tierNum: 5,
    inputs: [{ item: 'dried_emberleaf', qty: 3 }, { item: 'emberpepper', qty: 1 }], buff: { skill: 'smithing', kind: 'xp', pct: 10, minutes: 30 },
    description: 'Warm, peppery and sweet. Cinderpeak smiths drink it by the kettle.' },
  // ❄️ Frosthold
  { id: 'winter_stew', name: 'Frosthold winter stew', emoji: '🍲', tab: 'Meals', level: 405, tierNum: 6,
    inputs: [{ item: 'cooked_frostcod', qty: 2 }, { item: 'snowcabbage', qty: 2 }], buff: { skill: 'fishing', kind: 'speed', pct: 7, minutes: 30 },
    description: 'One frostcod, snow cabbage, a knob of butter — and a song sung slowly while it simmers. The song is the important part.' },
  { id: 'frostmint_cocoa', name: 'Frostmint cocoa', emoji: '☕', tab: 'Brews', level: 402, tierNum: 6,
    inputs: [{ item: 'dried_frostmint', qty: 3 }, { item: 'snowcabbage', qty: 1 }], buff: { skill: 'combat', kind: 'xp', pct: 10, minutes: 30 },
    description: 'Thick, sweet and minty. Warms you from your toes up — good for a fight in the snow.' },
  // 🌌 Voidreach
  { id: 'void_plum_tart', name: 'Void plum tart', emoji: '🥧', tab: 'Meals', level: 490, tierNum: 7,
    inputs: [{ item: 'cooked_voideel', qty: 2 }, { item: 'voidplum', qty: 2 }], buff: { skill: 'mining', kind: 'speed', pct: 7, minutes: 30 },
    description: 'A purple tart that tastes a little different every bite. The edge-quarry miners swear by it.' },
  { id: 'voidbloom_tea', name: 'Voidbloom tea', emoji: '🫖', tab: 'Brews', level: 487, tierNum: 7,
    inputs: [{ item: 'dried_voidbloom', qty: 3 }, { item: 'voidplum', qty: 1 }], buff: { skill: 'runecrafting', kind: 'xp', pct: 12, minutes: 30 },
    description: 'Dark as the chasm, with little stars swirling at the bottom of the cup.' },
  // 🌠 Starfall Crater
  { id: 'starfruit_pie', name: 'Starfruit pie', emoji: '🥧', tab: 'Meals', level: 575, tierNum: 8,
    inputs: [{ item: 'cooked_starray', qty: 2 }, { item: 'starfruit', qty: 2 }], buff: { skill: 'farming', kind: 'speed', pct: 8, minutes: 30 },
    description: 'The harvest-supper pie of the crater farms. Glows faintly on the windowsill while it cools.' },
  { id: 'starthistle_tonic', name: 'Starthistle tonic', emoji: '🧋', tab: 'Brews', level: 572, tierNum: 8,
    inputs: [{ item: 'dried_starthistle', qty: 3 }, { item: 'starfruit', qty: 1 }], buff: { skill: 'all', kind: 'xp', pct: 5, minutes: 30 },
    description: 'Fizzy and bright. Everything you do feels like it matters a little more.' },
  // ☁️ Celestine Spires
  { id: 'sky_pear_crumble', name: 'Sky pear crumble', emoji: '🍮', tab: 'Meals', level: 665, tierNum: 9,
    inputs: [{ item: 'cooked_skycarp', qty: 2 }, { item: 'skypear', qty: 2 }], buff: { skill: 'woodcutting', kind: 'speed', pct: 8, minutes: 30 },
    description: 'So light you have to eat it quickly before it floats off the plate.' },
  { id: 'skysage_infusion', name: 'Skysage infusion', emoji: '🍵', tab: 'Brews', level: 662, tierNum: 9,
    inputs: [{ item: 'dried_skysage', qty: 3 }, { item: 'skypear', qty: 1 }], buff: { skill: 'enhancing', kind: 'xp', pct: 12, minutes: 30 },
    description: 'Clear as the air up high. The Spires\' scholars drink it to think straight.' },
  // 🌀 The Primordial Rift
  { id: 'first_feast', name: 'The First Feast', emoji: '🍖', tab: 'Meals', level: 755, tierNum: 10,
    inputs: [{ item: 'cooked_leviathan', qty: 2 }, { item: 'worldpumpkin', qty: 2 }], buff: { skill: 'all', kind: 'speed', pct: 5, minutes: 30 },
    description: 'Cooked on the First Fire, the way the very first meal was. Everything goes a little quicker afterwards.' },
  { id: 'worldroot_brew', name: 'Worldroot brew', emoji: '🧉', tab: 'Brews', level: 752, tierNum: 10,
    inputs: [{ item: 'dried_worldroot', qty: 3 }, { item: 'worldpumpkin', qty: 1 }], buff: { skill: 'all', kind: 'xp', pct: 6, minutes: 30 },
    description: 'Tastes like rain on old earth. You feel very small, and very much at home.' },
];
for (const m of MEALS) {
  items.push({ id: m.id, name: m.name, category: 'meal', tier: 'oak', icon: 'log', emoji: m.emoji, stackable: true, tierNum: m.tierNum,
    region: tierRegion(m.tierNum), buff: m.buff, description: m.description });
}

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(items.map((i) => [i.id, i]));
export const ITEM_LIST = items;

export function getItem(id: string): ItemDef {
  const item = ITEMS[id];
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

export const SLOT_LABELS: Record<EquipSlot, string> = {
  head: 'Head', body: 'Body', legs: 'Legs', weapon: 'Weapon', shield: 'Shield',
  pickaxe: 'Pickaxe', axe: 'Axe', rod: 'Rod', tinderbox: 'Tinderbox', skillet: 'Skillet', hammer: 'Hammer', knife: 'Knife',
  sickle: 'Sickle', trowel: 'Trowel',
};
export const ARMOUR_SLOTS: EquipSlot[] = ['head', 'weapon', 'body', 'shield', 'legs'];
export const TOOL_SLOTS: EquipSlot[] = ['pickaxe', 'axe', 'rod', 'hammer', 'knife', 'tinderbox', 'skillet', 'sickle', 'trowel'];
export const SLOT_ORDER: EquipSlot[] = [...ARMOUR_SLOTS, ...TOOL_SLOTS];
