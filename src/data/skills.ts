// Skills and the actions (resources/recipes) you can idle on or play minigames with. Static data only.
import { CRAFTED_TOOLS, GEAR_PIECES, MAX_UPGRADE, METAL_TIERS, TOOL_TIERS, toolName, upgradeId, type SkillId } from './items';
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
};
export const SKILL_ORDER: SkillId[] = ['mining', 'smithing', 'woodcutting', 'firemaking', 'fishing', 'cooking', 'crafting', 'enhancing'];

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

// ----- Enhancing: improve weapons and armour (chance-based; failure only uses the bars) -----
for (const metal of METAL_TIERS) {
  for (const piece of GEAR_PIECES) {
    const id = `${metal.tier}_${piece.key}`;
    const name = `${metal.name} ${piece.name}`;
    for (let n = 0; n < MAX_UPGRADE; n++) {
      add({
        id: `enhance_${id}_${n + 1}`, skill: 'enhancing', name: `${name} +${n + 1}`,
        level: metal.level + 4 * n, durationMs: 4000, xp: Math.round(metal.barXp * (n + 1) * 1.5),
        inputs: [{ item: upgradeId(id, n), qty: 1 }, { item: metal.bar, qty: n + 1 }],
        output: { item: upgradeId(id, n + 1), qty: 1 }, iconItem: upgradeId(id, n + 1), sound: 'enchant',
        kind: 'enhance', upgrades: upgradeId(id, n),
      });
    }
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
