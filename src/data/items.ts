// Static item definitions. No player data lives here.

export type ItemCategory = 'ore' | 'bar' | 'log' | 'material' | 'fish' | 'food' | 'weapon' | 'armour' | 'tool' | 'gem';
export type EquipSlot =
  | 'head' | 'body' | 'legs' | 'weapon' | 'shield'
  | 'pickaxe' | 'axe' | 'rod' | 'tinderbox' | 'skillet';
export type IconKind =
  | 'ore' | 'rock' | 'bar' | 'log' | 'fish' | 'cooked' | 'gem'
  | 'pickaxe' | 'axe' | 'rod' | 'tinderbox' | 'skillet'
  | 'sword' | 'shield' | 'helmet' | 'chest' | 'legs';
export type SkillId = 'mining' | 'smithing' | 'woodcutting' | 'firemaking' | 'fishing' | 'cooking' | 'crafting' | 'enhancing';

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
};

export interface ItemStats {
  attack?: number;
  defense?: number;
  /** Percent faster actions in that skill, e.g. 5 = 5% less time. */
  miningSpeed?: number;
  woodcuttingSpeed?: number;
  fishingSpeed?: number;
  firemakingSpeed?: number;
  cookingSpeed?: number;
}

export const STAT_LABELS: Record<keyof ItemStats, string> = {
  attack: 'Attack',
  defense: 'Defense',
  miningSpeed: 'Mining speed %',
  woodcuttingSpeed: 'Woodcutting speed %',
  fishingSpeed: 'Fishing speed %',
  firemakingSpeed: 'Firemaking speed %',
  cookingSpeed: 'Cooking speed %',
};

export interface EquipInfo {
  slot: EquipSlot;
  stats: ItemStats;
  /** Skill level needed to equip (tools only for now). */
  req?: { skill: SkillId; level: number };
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
  /** Food: how much Health it restores once combat arrives. */
  heals?: number;
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
  { id: 'raw_shrimp', name: 'Raw shrimp', category: 'fish', tier: 'shrimp', icon: 'fish', stackable: true, description: 'Fresh from the river. Cook it before eating.' },
  { id: 'raw_trout', name: 'Raw river trout', category: 'fish', tier: 'trout', icon: 'fish', stackable: true, description: 'A lively trout. Cook it before eating.' },
  { id: 'cooked_shrimp', name: 'Cooked shrimp', category: 'food', tier: 'shrimp', icon: 'cooked', stackable: true, heals: 3, description: 'Tasty! Heals you in combat (coming soon).' },
  { id: 'great_shrimp', name: 'Great shrimp', category: 'food', tier: 'shrimp', icon: 'cooked', stackable: true, heals: 5, description: 'Perfectly seared. Heals more in combat.' },
  { id: 'cooked_trout', name: 'Cooked trout', category: 'food', tier: 'trout', icon: 'cooked', stackable: true, heals: 7, description: 'A hearty meal. Heals you in combat (coming soon).' },
  { id: 'great_trout', name: 'Great trout', category: 'food', tier: 'trout', icon: 'cooked', stackable: true, heals: 10, description: 'Perfectly seared. Heals more in combat.' },
];

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
  { key: 'pickaxe', name: 'pickaxe', icon: 'pickaxe', slot: 'pickaxe', category: 'tool', bars: 2, levelOffset: 2 },
  { key: 'sword', name: 'sword', icon: 'sword', slot: 'weapon', category: 'weapon', bars: 2, levelOffset: 8 },
  { key: 'helmet', name: 'helmet', icon: 'helmet', slot: 'head', category: 'armour', bars: 2, levelOffset: 14 },
  { key: 'shield', name: 'shield', icon: 'shield', slot: 'shield', category: 'armour', bars: 3, levelOffset: 20 },
  { key: 'platelegs', name: 'platelegs', icon: 'legs', slot: 'legs', category: 'armour', bars: 4, levelOffset: 28 },
  { key: 'chestplate', name: 'chestplate', icon: 'chest', slot: 'body', category: 'armour', bars: 5, levelOffset: 36 },
] as const;

export const METAL_TIERS = [
  { tier: 'bronze', name: 'Bronze', bar: 'bronze_bar', level: 1, power: 1, barXp: 8 },
  { tier: 'iron', name: 'Iron', bar: 'iron_bar', level: 50, power: 2, barXp: 12 },
] as const;

function gearStats(piece: (typeof GEAR_PIECES)[number]['key'], power: number): ItemStats {
  switch (piece) {
    case 'pickaxe': return { miningSpeed: 5 * power, attack: power };
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
      description: piece.key === 'pickaxe'
        ? 'Mines faster while equipped. Improve it with Enhancing.'
        : `Sturdy ${metal.name.toLowerCase()} gear. Improve it with Enhancing. Combat arrives in a later update.`,
      equip: {
        slot: piece.slot,
        stats: gearStats(piece.key, metal.power),
        req: piece.key === 'pickaxe' ? { skill: 'mining', level: metal.level } : undefined,
      },
    }, 'enhancing');
  }
}

/** Skilling tools made at the Crafting bench, per wood tier. */
export const CRAFTED_TOOLS = [
  { key: 'axe', name: 'axe', icon: 'axe', slot: 'axe', skill: 'woodcutting', stat: 'woodcuttingSpeed', logs: 2, stone: 2, levelOffset: 0 },
  { key: 'rod', name: 'fishing rod', icon: 'rod', slot: 'rod', skill: 'fishing', stat: 'fishingSpeed', logs: 3, stone: 0, levelOffset: 5 },
  { key: 'tinderbox', name: 'tinderbox', icon: 'tinderbox', slot: 'tinderbox', skill: 'firemaking', stat: 'firemakingSpeed', logs: 1, stone: 2, levelOffset: 10 },
  { key: 'skillet', name: 'skillet', icon: 'skillet', slot: 'skillet', skill: 'cooking', stat: 'cookingSpeed', logs: 1, stone: 4, levelOffset: 15 },
] as const;

export const WOOD_TIERS = [
  { tier: 'pine', name: 'Stone', woodName: 'Pine', logs: 'pine_logs', level: 1, power: 1, logXp: 8 },
  { tier: 'oak', name: 'Oak', woodName: 'Oak', logs: 'oak_logs', level: 50, power: 2, logXp: 12 },
] as const;

for (const wood of WOOD_TIERS) {
  for (const tool of CRAFTED_TOOLS) {
    const toolName = tool.key === 'rod' ? `${wood.woodName} fishing rod` : `${wood.name} ${tool.name}`;
    addUpgradable({
      id: `${wood.tier}_${tool.key}`,
      name: toolName,
      category: 'tool',
      tier: wood.tier,
      icon: tool.icon,
      stackable: false,
      description: `Makes ${tool.skill} faster while equipped. Upgrade it at the Crafting bench.`,
      equip: {
        slot: tool.slot,
        stats: { [tool.stat]: 5 * wood.power },
        req: { skill: tool.skill, level: wood.level },
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
  pickaxe: 'Pickaxe', axe: 'Axe', rod: 'Rod', tinderbox: 'Tinderbox', skillet: 'Skillet',
};
export const ARMOUR_SLOTS: EquipSlot[] = ['head', 'weapon', 'body', 'shield', 'legs'];
export const TOOL_SLOTS: EquipSlot[] = ['pickaxe', 'axe', 'rod', 'tinderbox', 'skillet'];
export const SLOT_ORDER: EquipSlot[] = [...ARMOUR_SLOTS, ...TOOL_SLOTS];
