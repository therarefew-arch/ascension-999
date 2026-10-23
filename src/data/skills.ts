// Skills and the actions (resources/recipes) you can idle on or play minigames with. Static data only.
import {
  BOWS, CRAFTED_TOOLS, ELEMENTS, GEAR_PIECES, MAX_UPGRADE, METAL_TIERS, STAFF_WOODS, TOOL_TIERS, toolName, upgradeId, type SkillId,
} from './items';
import type { SoundKey } from '../audio/soundList';

export interface SkillDef {
  id: SkillId;
  name: string;
  verb: string;
  place: string;
  description: string;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  mining: { id: 'mining', name: 'Mining', verb: 'Mining', place: 'The Mine', description: 'Dig ores and stone from the hills.' },
  smithing: { id: 'smithing', name: 'Smithing', verb: 'Smithing', place: 'The Forge', description: 'Smelt ores into bars and hammer bars into weapons and armour.' },
  woodcutting: { id: 'woodcutting', name: 'Woodcutting', verb: 'Chopping', place: 'Whispering Woods', description: 'Chop trees for logs.' },
  firemaking: { id: 'firemaking', name: 'Firemaking', verb: 'Burning', place: 'The Campfire', description: 'Light cozy fires from logs.' },
  fishing: { id: 'fishing', name: 'Fishing', verb: 'Fishing', place: 'Willow River', description: 'Catch fish from the river — or relax with a game of tile matching.' },
  cooking: { id: 'cooking', name: 'Cooking', verb: 'Cooking', place: 'The Kitchen', description: 'Keep the fire fed with logs and cook fish into food.' },
  crafting: { id: 'crafting', name: 'Crafting', verb: 'Crafting', place: 'The Workshop', description: 'Make a tool for every skill and upgrade it +1 to +10.' },
  enhancing: { id: 'enhancing', name: 'Enhancing', verb: 'Enhancing', place: 'Rune Tower', description: 'Improve weapons and armour +1 to +10. A failed try only uses the bars — never the item.' },
  runecrafting: { id: 'runecrafting', name: 'Runecrafting', verb: 'Runecrafting', place: 'Rune Altar', description: 'Shape rune essence into talismans and runes, and give blank staffs an element.' },
  melee: { id: 'melee', name: 'Melee', verb: 'Fighting', place: 'Training Grounds', description: 'Fight up close with swords. Beats Ranged.' },
  ranged: { id: 'ranged', name: 'Ranged', verb: 'Fighting', place: 'Training Grounds', description: 'Fight from afar with bows and arrows. Beats Magic.' },
  magic: { id: 'magic', name: 'Magic', verb: 'Fighting', place: 'Training Grounds', description: 'Cast spells with staffs and runes. Beats Melee.' },
  defense: { id: 'defense', name: 'Defense', verb: 'Fighting', place: 'Training Grounds', description: 'Take less damage. Trained by dodging and blocking.' },
  health: { id: 'health', name: 'Health', verb: 'Fighting', place: 'Training Grounds', description: 'More hit points. Trained by all combat.' },
};
/** Gathering & making skills (shown on the Skills tab). */
export const SKILL_ORDER: SkillId[] = ['mining', 'smithing', 'woodcutting', 'firemaking', 'fishing', 'cooking', 'crafting', 'runecrafting', 'enhancing'];
/** Combat skills (shown on the Combat tab). */
export const COMBAT_SKILLS: SkillId[] = ['melee', 'ranged', 'magic', 'defense', 'health'];
export const ALL_SKILLS: SkillId[] = [...SKILL_ORDER, ...COMBAT_SKILLS];

export interface ActionDef {
  id: string;
  skill: SkillId;
  name: string;
  /** Tab inside the skill screen (Smithing: Smelt / Weapons / Armour, Crafting: Tools / Upgrades). */
  tab?: string;
  level: number;
  durationMs: number;
  xp: number;
  inputs: { item: string; qty: number }[];
  /** What it produces (null = nothing, e.g. burning logs). Always given through the central loot system. */
  output: { item: string; qty: number } | null;
  /** Loot table id (made from `output`). */
  lootTable: string;
  /** Cooking: the better food a great minigame result makes (its own loot table). */
  greatLootTable?: string;
  /** Item shown as this action's icon. */
  iconItem: string;
  sound: SoundKey;
  /** The skill's tool (of at least this tier) must be equipped. Tier-0 resources need no tool. */
  needsTool?: number;
  /** An item that must be in your bag but is NOT used up (e.g. a talisman). */
  requires?: string;
  /** 'upgrade' = guaranteed tool upgrade (Crafting). 'enhance' = chance-based gear upgrade (Enhancing). */
  kind?: 'upgrade' | 'enhance';
  /** For upgrades: the item being improved (from the bag, or straight from its gear slot). */
  upgrades?: string;
}

const actions: ActionDef[] = [];
const add = (a: Omit<ActionDef, 'lootTable'> & { lootTable?: string }) =>
  actions.push({ ...a, lootTable: a.lootTable ?? a.id });

// ----- Mining -----
add({ id: 'mine_copper', skill: 'mining', name: 'Copper ore', level: 1, durationMs: 3000, xp: 8, inputs: [], output: { item: 'copper_ore', qty: 1 }, iconItem: 'copper_ore', sound: 'mine' });
add({ id: 'mine_tin', skill: 'mining', name: 'Tin ore', level: 1, durationMs: 3000, xp: 8, inputs: [], output: { item: 'tin_ore', qty: 1 }, iconItem: 'tin_ore', sound: 'mine' });
add({ id: 'mine_stone', skill: 'mining', name: 'Stone', level: 1, durationMs: 2600, xp: 5, inputs: [], output: { item: 'stone', qty: 1 }, iconItem: 'stone', sound: 'mine' });
add({ id: 'mine_essence', skill: 'mining', name: 'Rune essence', level: 5, durationMs: 2800, xp: 7, inputs: [], output: { item: 'rune_essence', qty: 1 }, iconItem: 'rune_essence', sound: 'mine' });
add({ id: 'mine_iron', skill: 'mining', name: 'Iron ore', level: 50, needsTool: 1, durationMs: 3300, xp: 12, inputs: [], output: { item: 'iron_ore', qty: 1 }, iconItem: 'iron_ore', sound: 'mine' });

// ----- Smithing -----
add({ id: 'smelt_bronze', skill: 'smithing', name: 'Bronze bar', tab: 'Smelt', level: 1, durationMs: 3000, xp: 8, inputs: [{ item: 'copper_ore', qty: 1 }, { item: 'tin_ore', qty: 1 }], output: { item: 'bronze_bar', qty: 1 }, iconItem: 'bronze_bar', sound: 'smith' });
add({ id: 'smelt_iron', skill: 'smithing', name: 'Iron bar', tab: 'Smelt', level: 50, needsTool: 1, durationMs: 3300, xp: 12, inputs: [{ item: 'iron_ore', qty: 1 }], output: { item: 'iron_bar', qty: 1 }, iconItem: 'iron_bar', sound: 'smith' });
for (const metal of METAL_TIERS) {
  for (const piece of GEAR_PIECES) {
    const id = `${metal.tier}_${piece.key}`;
    add({
      id: `smith_${id}`, skill: 'smithing', name: `${metal.name} ${piece.name}`, tab: piece.tab,
      level: metal.level + piece.levelOffset, needsTool: metal.level >= 50 ? 1 : undefined,
      durationMs: 2500 + 500 * piece.bars, xp: Math.round(metal.barXp * (0.6 * piece.bars + 0.4)),
      inputs: [{ item: metal.bar, qty: piece.bars }], output: { item: id, qty: 1 }, iconItem: id, sound: 'smith',
    });
  }
}

// ----- Woodcutting -----
add({ id: 'chop_pine', skill: 'woodcutting', name: 'Pine tree', level: 1, durationMs: 3000, xp: 8, inputs: [], output: { item: 'pine_logs', qty: 1 }, iconItem: 'pine_logs', sound: 'chop' });
add({ id: 'chop_oak', skill: 'woodcutting', name: 'Oak tree', level: 50, needsTool: 1, durationMs: 3300, xp: 12, inputs: [], output: { item: 'oak_logs', qty: 1 }, iconItem: 'oak_logs', sound: 'chop' });

// ----- Firemaking (burning gives XP, no item) -----
add({ id: 'burn_pine', skill: 'firemaking', name: 'Pine logs', level: 1, durationMs: 3000, xp: 9, inputs: [{ item: 'pine_logs', qty: 1 }], output: null, iconItem: 'pine_logs', sound: 'crackle' });
add({ id: 'burn_oak', skill: 'firemaking', name: 'Oak logs', level: 50, needsTool: 1, durationMs: 3300, xp: 13, inputs: [{ item: 'oak_logs', qty: 1 }], output: null, iconItem: 'oak_logs', sound: 'crackle' });

// ----- Fishing -----
add({ id: 'fish_shrimp', skill: 'fishing', name: 'Shrimp', level: 1, durationMs: 3000, xp: 8, inputs: [], output: { item: 'raw_shrimp', qty: 1 }, iconItem: 'raw_shrimp', sound: 'splash' });
add({ id: 'fish_trout', skill: 'fishing', name: 'River trout', level: 50, needsTool: 1, durationMs: 3300, xp: 12, inputs: [], output: { item: 'raw_trout', qty: 1 }, iconItem: 'raw_trout', sound: 'splash' });

// ----- Cooking (needs a fire fed with logs; idle makes normal food, the minigame can make "Great" food) -----
add({ id: 'cook_shrimp', skill: 'cooking', name: 'Shrimp', level: 1, durationMs: 2500, xp: 8, inputs: [{ item: 'raw_shrimp', qty: 1 }], output: { item: 'cooked_shrimp', qty: 1 }, greatLootTable: 'cook_shrimp_great', iconItem: 'cooked_shrimp', sound: 'sizzle' });
add({ id: 'cook_trout', skill: 'cooking', name: 'River trout', level: 50, needsTool: 1, durationMs: 2800, xp: 12, inputs: [{ item: 'raw_trout', qty: 1 }], output: { item: 'cooked_trout', qty: 1 }, greatLootTable: 'cook_trout_great', iconItem: 'cooked_trout', sound: 'sizzle' });
export const GREAT_FOOD: Record<string, string> = { cook_shrimp_great: 'great_shrimp', cook_trout_great: 'great_trout' };

// ----- Crafting: a tool for every skill, then upgrades (always succeed) -----
for (const tier of TOOL_TIERS) {
  for (const tool of CRAFTED_TOOLS) {
    const id = `${tier.tier}_${tool.key}`;
    const name = toolName(tier, tool);
    const level = tier.level + tool.levelOffset;
    // Bronze tools need a Stone knife (tier 0) — but the Stone knife itself needs nothing.
    const needsTool = tier.toolTier > 0 ? tier.toolTier - 1 : undefined;
    const inputs = [{ item: tier.logs, qty: tool.logs }, { item: tier.hard, qty: tool.hard }];
    add({
      id: `craft_${id}`, skill: 'crafting', name, tab: 'Tools', level, needsTool,
      durationMs: 2600 + 400 * (tool.logs + tool.hard), xp: Math.round(tier.xpBase * (0.5 * (tool.logs + tool.hard) + 0.5)),
      inputs, output: { item: id, qty: 1 }, iconItem: id, sound: 'craft',
    });
    for (let n = 0; n < MAX_UPGRADE; n++) {
      add({
        id: `upgrade_${id}_${n + 1}`, skill: 'crafting', name: `${name} +${n + 1}`, tab: 'Upgrades',
        level: level + 3 * (n + 1), needsTool, durationMs: 4000, xp: Math.round(tier.xpBase * (2 + n) * 1.2),
        inputs: [{ item: upgradeId(id, n), qty: 1 }, { item: tier.logs, qty: (n + 1) * 2 }, { item: tier.hard, qty: n + 1 }],
        output: { item: upgradeId(id, n + 1), qty: 1 }, iconItem: upgradeId(id, n + 1), sound: 'craft',
        kind: 'upgrade', upgrades: upgradeId(id, n),
      });
    }
  }
}

// ----- Crafting: bows, staffs, arrows and runes for combat -----
add({ id: 'craft_pine_shortbow', skill: 'crafting', name: 'Pine shortbow', tab: 'Weapons', level: 8, durationMs: 4000, xp: 16, inputs: [{ item: 'pine_logs', qty: 3 }, { item: 'stone', qty: 1 }], output: { item: 'pine_shortbow', qty: 1 }, iconItem: 'pine_shortbow', sound: 'craft' });
add({ id: 'craft_pine_staff', skill: 'crafting', name: 'Blank pine staff', tab: 'Weapons', level: 12, durationMs: 4000, xp: 18, inputs: [{ item: 'pine_logs', qty: 2 }, { item: 'stone', qty: 2 }], output: { item: 'pine_staff', qty: 1 }, iconItem: 'pine_staff', sound: 'craft' });
add({ id: 'craft_oak_longbow', skill: 'crafting', name: 'Oak longbow', tab: 'Weapons', level: 55, needsTool: 0, durationMs: 4500, xp: 40, inputs: [{ item: 'oak_logs', qty: 3 }, { item: 'bronze_bar', qty: 1 }], output: { item: 'oak_longbow', qty: 1 }, iconItem: 'oak_longbow', sound: 'craft' });
add({ id: 'craft_oak_staff', skill: 'crafting', name: 'Blank oak staff', tab: 'Weapons', level: 60, needsTool: 0, durationMs: 4500, xp: 44, inputs: [{ item: 'oak_logs', qty: 2 }, { item: 'iron_bar', qty: 1 }], output: { item: 'oak_staff', qty: 1 }, iconItem: 'oak_staff', sound: 'craft' });
add({ id: 'craft_bronze_arrows', skill: 'crafting', name: 'Bronze arrows ×15', tab: 'Ammo', level: 5, durationMs: 3200, xp: 10, inputs: [{ item: 'pine_logs', qty: 1 }, { item: 'bronze_bar', qty: 1 }], output: { item: 'bronze_arrows', qty: 15 }, iconItem: 'bronze_arrows', sound: 'craft' });
add({ id: 'craft_iron_arrows', skill: 'crafting', name: 'Iron arrows ×15', tab: 'Ammo', level: 52, needsTool: 1, durationMs: 3500, xp: 18, inputs: [{ item: 'oak_logs', qty: 1 }, { item: 'iron_bar', qty: 1 }], output: { item: 'iron_arrows', qty: 15 }, iconItem: 'iron_arrows', sound: 'craft' });

// ----- Runecrafting: talismans (kept), runes (need the talisman in your bag), elemental staffs -----
for (const el of ELEMENTS) {
  add({
    id: `rc_talisman_${el.element}`, skill: 'runecrafting', name: `${el.name} talisman`, tab: 'Talismans', level: el.level,
    durationMs: 4000, xp: 20 + el.level, inputs: [{ item: 'rune_essence', qty: 5 }, { item: 'stone', qty: 2 }],
    output: { item: `${el.element}_talisman`, qty: 1 }, iconItem: `${el.element}_talisman`, sound: 'enchant',
  });
}
for (const el of ELEMENTS) {
  add({
    id: `rc_runes_${el.element}`, skill: 'runecrafting', name: `${el.name} runes ×2`, tab: 'Runes', level: el.level,
    durationMs: 2800, xp: 6 + Math.round(el.level / 5) * 2, inputs: [{ item: 'rune_essence', qty: 1 }],
    requires: `${el.element}_talisman`,
    output: { item: `${el.element}_rune`, qty: 2 }, iconItem: `${el.element}_rune`, sound: 'enchant',
  });
}
for (const s of STAFF_WOODS) {
  for (const el of ELEMENTS) {
    add({
      id: `rc_staff_${s.wood}_${el.element}`, skill: 'runecrafting', name: `${s.name} ${el.name.toLowerCase()} staff`, tab: 'Staffs',
      level: Math.max(s.imbueLevel, el.level + (s.wood === 'oak' ? 30 : 2)),
      durationMs: 5000, xp: s.wood === 'oak' ? 120 + el.level * 2 : 40 + el.level * 2,
      inputs: [{ item: `${s.wood}_staff`, qty: 1 }, { item: `${el.element}_rune`, qty: s.runes }],
      output: { item: `${s.wood}_${el.element}_staff`, qty: 1 }, iconItem: `${s.wood}_${el.element}_staff`, sound: 'enchant',
    });
  }
}

// ----- Enhancing: improve weapons and armour (chance-based; failure only uses the bars) -----
const ENHANCEABLE: { id: string; name: string; bar: string; level: number; barXp: number }[] = [
  ...METAL_TIERS.flatMap((metal) => GEAR_PIECES.map((piece) => ({
    id: `${metal.tier}_${piece.key}`, name: `${metal.name} ${piece.name}`, bar: metal.bar as string, level: metal.level, barXp: metal.barXp as number,
  }))),
  ...BOWS.map((w) => ({ id: w.id, name: w.name, bar: w.bar as string, level: w.req > 1 ? 50 : 1, barXp: w.req > 1 ? 12 : 8 })),
  ...STAFF_WOODS.flatMap((s) => ELEMENTS.map((el) => ({
    id: `${s.wood}_${el.element}_staff`, name: `${s.name} ${el.name.toLowerCase()} staff`, bar: s.bar as string,
    level: s.req > 1 ? 50 : 1, barXp: s.req > 1 ? 12 : 8,
  }))),
];
for (const g of ENHANCEABLE) {
  for (let n = 0; n < MAX_UPGRADE; n++) {
    add({
      id: `enhance_${g.id}_${n + 1}`, skill: 'enhancing', name: `${g.name} +${n + 1}`,
      level: g.level + 4 * n, durationMs: 4000, xp: Math.round(g.barXp * (n + 1) * 1.5),
      inputs: [{ item: upgradeId(g.id, n), qty: 1 }, { item: g.bar, qty: n + 1 }],
      output: { item: upgradeId(g.id, n + 1), qty: 1 }, iconItem: upgradeId(g.id, n + 1), sound: 'enchant',
      kind: 'enhance', upgrades: upgradeId(g.id, n),
    });
  }
}

export const ACTIONS: Record<string, ActionDef> = Object.fromEntries(actions.map((a) => [a.id, a]));
export const ACTION_LIST = actions;

export function actionsForSkill(skill: SkillId): ActionDef[] {
  return actions.filter((a) => a.skill === skill);
}

/** Tabs a skill screen shows (empty = no tabs). */
export function tabsForSkill(skill: SkillId): string[] {
  return Array.from(new Set(actionsForSkill(skill).map((a) => a.tab).filter((t): t is string => !!t)));
}
