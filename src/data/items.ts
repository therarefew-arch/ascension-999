// Static item definitions. No player data lives here.

export type ItemCategory = 'ore' | 'bar' | 'weapon' | 'armour' | 'tool' | 'gem';
export type EquipSlot = 'head' | 'body' | 'legs' | 'weapon' | 'shield' | 'tool';
export type IconKind = 'ore' | 'bar' | 'pickaxe' | 'sword' | 'shield' | 'helmet' | 'chest' | 'legs' | 'gem';
export type SkillId = 'mining' | 'smithing';

/** Colour keys for metals. Each tier gets its own tint so icons look unique. */
export const TIER_COLORS: Record<string, { main: string; light: string; dark: string }> = {
  copper: { main: '#c8773f', light: '#e9a46f', dark: '#7e4320' },
  tin: { main: '#aab6bd', light: '#dbe3e7', dark: '#5f6a70' },
  bronze: { main: '#c99248', light: '#ecc27d', dark: '#7a5320' },
  iron: { main: '#8b949c', light: '#c4cbd1', dark: '#4a5157' },
};

export interface ItemStats {
  attack?: number;
  defense?: number;
  /** Percent faster mining, e.g. 5 = actions take 5% less time. */
  miningSpeed?: number;
}

export const STAT_LABELS: Record<keyof ItemStats, string> = {
  attack: 'Attack',
  defense: 'Defense',
  miningSpeed: 'Mining speed %',
};

export interface EquipInfo {
  slot: EquipSlot;
  stats: ItemStats;
  /** Skill level needed to equip (Phase 1: only tools have one). */
  req?: { skill: SkillId; level: number };
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
}

const items: ItemDef[] = [
  { id: 'copper_ore', name: 'Copper ore', category: 'ore', tier: 'copper', icon: 'ore', stackable: true, description: 'A warm orange ore. Smelt with tin to make bronze.' },
  { id: 'tin_ore', name: 'Tin ore', category: 'ore', tier: 'tin', icon: 'ore', stackable: true, description: 'A soft grey ore. Smelt with copper to make bronze.' },
  { id: 'iron_ore', name: 'Iron ore', category: 'ore', tier: 'iron', icon: 'ore', stackable: true, description: 'Heavy and dependable. Smelts into iron bars.' },
  { id: 'bronze_bar', name: 'Bronze bar', category: 'bar', tier: 'bronze', icon: 'bar', stackable: true, description: 'A bar of bronze, ready for the anvil.' },
  { id: 'iron_bar', name: 'Iron bar', category: 'bar', tier: 'iron', icon: 'bar', stackable: true, description: 'A bar of iron, ready for the anvil.' },
];

/** Gear pieces made at the anvil, per metal tier. */
export const GEAR_PIECES = [
  { key: 'pickaxe', name: 'pickaxe', icon: 'pickaxe', slot: 'tool', category: 'tool', bars: 2, levelOffset: 2 },
  { key: 'sword', name: 'sword', icon: 'sword', slot: 'weapon', category: 'weapon', bars: 2, levelOffset: 8 },
  { key: 'helmet', name: 'helmet', icon: 'helmet', slot: 'head', category: 'armour', bars: 2, levelOffset: 14 },
  { key: 'shield', name: 'shield', icon: 'shield', slot: 'shield', category: 'armour', bars: 3, levelOffset: 20 },
  { key: 'platelegs', name: 'platelegs', icon: 'legs', slot: 'legs', category: 'armour', bars: 4, levelOffset: 28 },
  { key: 'chestplate', name: 'chestplate', icon: 'chest', slot: 'body', category: 'armour', bars: 5, levelOffset: 36 },
] as const;

export const METAL_TIERS = [
  { tier: 'bronze', name: 'Bronze', bar: 'bronze_bar', level: 1, power: 1 },
  { tier: 'iron', name: 'Iron', bar: 'iron_bar', level: 50, power: 2 },
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
    items.push({
      id: `${metal.tier}_${piece.key}`,
      name: `${metal.name} ${piece.name}`,
      category: piece.category,
      tier: metal.tier,
      icon: piece.icon,
      stackable: false,
      description: piece.key === 'pickaxe'
        ? `Mines faster while equipped.`
        : `Sturdy ${metal.name.toLowerCase()} gear. Combat arrives in a later update.`,
      equip: {
        slot: piece.slot,
        stats: gearStats(piece.key, metal.power),
        req: piece.key === 'pickaxe' ? { skill: 'mining', level: metal.level } : undefined,
      },
    });
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
  head: 'Head', body: 'Body', legs: 'Legs', weapon: 'Weapon', shield: 'Shield', tool: 'Tool',
};
export const SLOT_ORDER: EquipSlot[] = ['head', 'weapon', 'body', 'shield', 'legs', 'tool'];
