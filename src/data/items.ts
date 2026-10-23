// Static item definitions. No player data lives here.

export type ItemCategory = 'ore' | 'bar' | 'log' | 'material' | 'fish' | 'food' | 'weapon' | 'armour' | 'tool' | 'gem' | 'ammo' | 'currency';
export type CombatStyle = 'melee' | 'ranged' | 'magic';
export type GemType = 'ruby' | 'sapphire' | 'emerald';
export type GemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type EquipSlot =
  | 'head' | 'body' | 'legs' | 'weapon' | 'shield'
  | 'pickaxe' | 'axe' | 'rod' | 'tinderbox' | 'skillet' | 'hammer' | 'knife';
export type IconKind =
  | 'ore' | 'rock' | 'bar' | 'log' | 'fish' | 'cooked' | 'shrimp' | 'cooked_shrimp' | 'gem'
  | 'pickaxe' | 'axe' | 'rod' | 'tinderbox' | 'skillet' | 'hammer' | 'knife'
  | 'sword' | 'shield' | 'helmet' | 'chest' | 'legs'
  | 'bow' | 'staff' | 'arrows' | 'rune' | 'coins' | 'talisman';
export type SkillId =
  | 'mining' | 'smithing' | 'woodcutting' | 'firemaking' | 'fishing' | 'cooking' | 'crafting' | 'enhancing'
  | 'runecrafting'
  | 'melee' | 'ranged' | 'magic' | 'defense' | 'health';

/** Colour keys. Each tier/material gets its own tint so icons look unique. */
export const TIER_COLORS: Record<string, { main: string; light: string; dark: string }> = {
  copper: { main: '#c8773f', light: '#e9a46f', dark: '#7e4320' },
  tin: { main: '#aab6bd', light: '#dbe3e7', dark: '#5f6a70' },
  bronze: { main: '#c99248', light: '#ecc27d', dark: '#7a5320' },
  iron: { main: '#8b949c', light: '#c4cbd1', dark: '#4a5157' },
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
  ruby: { main: '#ef4444', light: '#fecaca', dark: '#7f1d1d' },
  sapphire: { main: '#3b82f6', light: '#bfdbfe', dark: '#1e3a8a' },
  emerald: { main: '#22c55e', light: '#bbf7d0', dark: '#14532d' },
};

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
};

export interface EquipInfo {
  slot: EquipSlot;
  stats: ItemStats;
  /** Skill level needed to equip (tools only for now). */
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
}

export const MAX_UPGRADE = 10;
export const upgradeId = (base: string, level: number) => (level === 0 ? base : `${base}_p${level}`);

const items: ItemDef[] = [
  // Ores & stone
  { id: 'copper_ore', name: 'Copper ore', category: 'ore', tier: 'copper', icon: 'ore', stackable: true, description: 'A warm orange ore. Smelt with tin to make bronze.' },
  { id: 'tin_ore', name: 'Tin ore', category: 'ore', tier: 'tin', icon: 'ore', stackable: true, description: 'A soft grey ore. Smelt with copper to make bronze.' },
  { id: 'iron_ore', name: 'Iron ore', category: 'ore', tier: 'iron', icon: 'ore', stackable: true, description: 'Heavy and dependable. Smelts into iron bars.' },
  { id: 'stone', name: 'Stone', category: 'material', tier: 'stone', icon: 'rock', stackable: true, description: 'A sturdy chunk of stone. Used for crafting tools.' },
  // Bars
  { id: 'bronze_bar', name: 'Bronze bar', category: 'bar', tier: 'bronze', icon: 'bar', stackable: true, description: 'A bar of bronze, ready for the anvil.' },
  { id: 'iron_bar', name: 'Iron bar', category: 'bar', tier: 'iron', icon: 'bar', stackable: true, description: 'A bar of iron, ready for the anvil.' },
  // Logs
  { id: 'pine_logs', name: 'Pine logs', category: 'log', tier: 'pine', icon: 'log', stackable: true, description: 'Light, sappy logs. Burn with a bright orange flame.' },
  { id: 'oak_logs', name: 'Oak logs', category: 'log', tier: 'oak', icon: 'log', stackable: true, description: 'Strong oak. Burns long with a golden flame.' },
  // Fish & food
  { id: 'raw_shrimp', name: 'Raw shrimp', category: 'fish', tier: 'shrimp', icon: 'shrimp', stackable: true, description: 'Fresh from the river. Cook it before eating.' },
  { id: 'raw_trout', name: 'Raw river trout', category: 'fish', tier: 'trout', icon: 'fish', stackable: true, description: 'A lively trout. Cook it before eating.' },
  { id: 'cooked_shrimp', name: 'Cooked shrimp', category: 'food', tier: 'shrimp', icon: 'cooked_shrimp', stackable: true, heals: 6, description: 'Tasty! Eat it in combat to heal.' },
  { id: 'great_shrimp', name: 'Great shrimp', category: 'food', tier: 'shrimp', icon: 'cooked_shrimp', stackable: true, heals: 9, description: 'Perfectly seared. Heals more in combat.' },
  { id: 'cooked_trout', name: 'Cooked trout', category: 'food', tier: 'trout', icon: 'cooked', stackable: true, heals: 14, description: 'A hearty meal. Eat it in combat to heal.' },
  { id: 'great_trout', name: 'Great trout', category: 'food', tier: 'trout', icon: 'cooked', stackable: true, heals: 20, description: 'Perfectly seared. Heals more in combat.' },
  // Coins (go straight to your purse, not your bag)
  { id: 'coins', name: 'Coins', category: 'currency', tier: 'gold', icon: 'coins', stackable: true, description: 'Shiny coins. Spend them on gem rerolls now — shops and the market are coming.' },
  // Ammo
  { id: 'bronze_arrows', name: 'Bronze arrows', category: 'ammo', tier: 'bronze', icon: 'arrows', stackable: true, ammo: { style: 'ranged', power: 2 }, description: 'Fired by bows. Each shot uses one (sometimes you get it back).' },
  { id: 'iron_arrows', name: 'Iron arrows', category: 'ammo', tier: 'iron', icon: 'arrows', stackable: true, ammo: { style: 'ranged', power: 4 }, description: 'Sharper arrows that hit harder.' },
  { id: 'rune_essence', name: 'Rune essence', category: 'material', tier: 'essence', icon: 'rock', stackable: true, description: 'Glittering stone humming with magic. Runecrafting turns it into runes and talismans.' },
];

// ----- Runecrafting: elements, talismans, runes -----
export type Element = 'air' | 'water' | 'earth' | 'fire';
export const ELEMENTS: { element: Element; name: string; level: number; power: number }[] = [
  { element: 'air', name: 'Air', level: 1, power: 2 },
  { element: 'water', name: 'Water', level: 10, power: 3 },
  { element: 'earth', name: 'Earth', level: 20, power: 4 },
  { element: 'fire', name: 'Fire', level: 30, power: 5 },
];
for (const el of ELEMENTS) {
  items.push(
    { id: `${el.element}_talisman`, name: `${el.name} talisman`, category: 'material', tier: el.element, icon: 'talisman', stackable: false,
      description: `Keep it in your bag to craft ${el.name} runes. It's never used up.` },
    { id: `${el.element}_rune`, name: `${el.name} rune`, category: 'ammo', tier: el.element, icon: 'rune', stackable: true,
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

export const METAL_TIERS = [
  { tier: 'bronze', name: 'Bronze', bar: 'bronze_bar', level: 1, power: 1, barXp: 8 },
  { tier: 'iron', name: 'Iron', bar: 'iron_bar', level: 50, power: 2, barXp: 12 },
] as const;

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
    addUpgradable({
      id: `${metal.tier}_${piece.key}`,
      name: `${metal.name} ${piece.name}`,
      category: piece.category,
      tier: metal.tier,
      icon: piece.icon,
      stackable: false,
      description: piece.key === 'sword'
        ? `A ${metal.name.toLowerCase()} sword for Melee combat. Improve it with Enhancing.`
        : `Sturdy ${metal.name.toLowerCase()} armour. Improve it with Enhancing.`,
      equip: {
        slot: piece.slot,
        stats: gearStats(piece.key, metal.power),
        req: metal.level >= 50 ? { skill: piece.key === 'sword' ? 'melee' : 'defense', level: 30 } : undefined,
        ...(piece.key === 'sword' ? { style: 'melee' as const, speedMs: WEAPON_SPEED.melee } : {}),
      },
    }, 'enhancing');
  }
}

/** Bows (Ranged), made at the Workshop. Improve them with Enhancing (uses bars). */
export const BOWS = [
  { id: 'pine_shortbow', name: 'Pine shortbow', tier: 'pine', attack: 5, req: 1, bar: 'bronze_bar' },
  { id: 'oak_longbow', name: 'Oak longbow', tier: 'oak', attack: 10, req: 30, bar: 'iron_bar' },
] as const;
for (const w of BOWS) {
  addUpgradable({
    id: w.id, name: w.name, category: 'weapon', tier: w.tier, icon: 'bow', stackable: false,
    description: 'A bow for Ranged combat. Needs arrows in your bag.',
    equip: { slot: 'weapon', stats: { attack: w.attack }, style: 'ranged', speedMs: WEAPON_SPEED.ranged, req: w.req > 1 ? { skill: 'ranged', level: w.req } : undefined },
  }, 'enhancing');
}

/** Blank staffs come from the Workshop; Runecrafting turns them into elemental staffs with runes. */
export const STAFF_WOODS = [
  { wood: 'pine', name: 'Pine', attack: 5, req: 1, bar: 'bronze_bar', runes: 50, imbueLevel: 2 },
  { wood: 'oak', name: 'Oak', attack: 10, req: 30, bar: 'iron_bar', runes: 100, imbueLevel: 50 },
] as const;
for (const s of STAFF_WOODS) {
  items.push({
    id: `${s.wood}_staff`, name: `Blank ${s.name.toLowerCase()} staff`, category: 'material', tier: s.wood, icon: 'staff', stackable: false,
    description: 'A plain staff with no magic yet. At Runecrafting, add runes to make it an elemental staff.',
  });
  for (const el of ELEMENTS) {
    addUpgradable({
      id: `${s.wood}_${el.element}_staff`, name: `${s.name} ${el.name.toLowerCase()} staff`, category: 'weapon', tier: el.element, icon: 'staff', stackable: false,
      description: `A Magic staff that casts ${el.name} spells using ${el.name} runes from your bag.`,
      equip: {
        slot: 'weapon', stats: { attack: s.attack }, style: 'magic', element: el.element, speedMs: WEAPON_SPEED.magic,
        req: s.req > 1 ? { skill: 'magic', level: s.req } : undefined,
      },
    }, 'enhancing');
  }
}

/**
 * Skilling tools made at the Crafting bench. Every skill that gathers or makes things has one.
 * A tool of tier N is needed to gather/make that skill's tier-N resources (tier 0 needs no tool).
 * `logs` + `hard` = materials (hard = stone for Stone tools, bronze bars for Bronze tools).
 */
export const CRAFTED_TOOLS = [
  { key: 'pickaxe', name: 'pickaxe', icon: 'pickaxe', slot: 'pickaxe', skill: 'mining', stat: 'miningSpeed', logs: 2, hard: 2, levelOffset: 0 },
  { key: 'axe', name: 'axe', icon: 'axe', slot: 'axe', skill: 'woodcutting', stat: 'woodcuttingSpeed', logs: 2, hard: 2, levelOffset: 0 },
  { key: 'rod', name: 'fishing rod', icon: 'rod', slot: 'rod', skill: 'fishing', stat: 'fishingSpeed', logs: 3, hard: 1, levelOffset: 3 },
  { key: 'knife', name: 'knife', icon: 'knife', slot: 'knife', skill: 'crafting', stat: 'craftingSpeed', logs: 1, hard: 1, levelOffset: 5 },
  { key: 'hammer', name: 'hammer', icon: 'hammer', slot: 'hammer', skill: 'smithing', stat: 'smithingSpeed', logs: 1, hard: 2, levelOffset: 8 },
  { key: 'tinderbox', name: 'tinderbox', icon: 'tinderbox', slot: 'tinderbox', skill: 'firemaking', stat: 'firemakingSpeed', logs: 1, hard: 2, levelOffset: 10 },
  { key: 'skillet', name: 'skillet', icon: 'skillet', slot: 'skillet', skill: 'cooking', stat: 'cookingSpeed', logs: 1, hard: 3, levelOffset: 15 },
] as const;

export const TOOL_TIERS = [
  { tier: 'stone', name: 'Stone', rodName: 'Pine fishing rod', logs: 'pine_logs', hard: 'stone', level: 1, power: 1, toolTier: 0, xpBase: 8 },
  { tier: 'bronze', name: 'Bronze', rodName: 'Bronze fishing rod', logs: 'pine_logs', hard: 'bronze_bar', level: 50, power: 2, toolTier: 1, xpBase: 12 },
] as const;

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
};
export const ARMOUR_SLOTS: EquipSlot[] = ['head', 'weapon', 'body', 'shield', 'legs'];
export const TOOL_SLOTS: EquipSlot[] = ['pickaxe', 'axe', 'rod', 'hammer', 'knife', 'tinderbox', 'skillet'];
export const SLOT_ORDER: EquipSlot[] = [...ARMOUR_SLOTS, ...TOOL_SLOTS];
