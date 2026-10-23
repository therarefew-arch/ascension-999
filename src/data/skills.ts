// Skills and the actions (resources/recipes) you can idle on or play minigames with. Static data only.
import { CRAFTED_TOOLS, GEAR_PIECES, MAX_UPGRADE, METAL_TIERS, upgradeId, WOOD_TIERS, type SkillId } from './items';
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
  smithing: { id: 'smithing', name: 'Smithing', verb: 'Smithing', place: 'The Forge', description: 'Smelt ores into bars and hammer bars into gear.' },
  woodcutting: { id: 'woodcutting', name: 'Woodcutting', verb: 'Chopping', place: 'Whispering Woods', description: 'Chop trees for logs.' },
  firemaking: { id: 'firemaking', name: 'Firemaking', verb: 'Burning', place: 'The Campfire', description: 'Light cozy fires from logs.' },
  fishing: { id: 'fishing', name: 'Fishing', verb: 'Fishing', place: 'Willow River', description: 'Catch fish from the river.' },
  cooking: { id: 'cooking', name: 'Cooking', verb: 'Cooking', place: 'The Kitchen', description: 'Cook fish into food for future adventures.' },
  crafting: { id: 'crafting', name: 'Crafting', verb: 'Crafting', place: 'The Workshop', description: 'Make skilling tools from wood and stone, and upgrade them +1 to +10.' },
  enhancing: { id: 'enhancing', name: 'Enhancing', verb: 'Enhancing', place: 'Rune Tower', description: 'Improve smithed gear +1 to +10. A failed try only uses the bars — never the item.' },
};
export const SKILL_ORDER: SkillId[] = ['mining', 'smithing', 'woodcutting', 'firemaking', 'fishing', 'cooking', 'crafting', 'enhancing'];

export interface ActionDef {
  id: string;
  skill: SkillId;
  name: string;
  group: string;
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
  /** 'upgrade' = guaranteed tool upgrade (Crafting). 'enhance' = chance-based gear upgrade (Enhancing). */
  kind?: 'upgrade' | 'enhance';
  /** For upgrades: the item being improved (also used to only show upgrades for items you own). */
  upgrades?: string;
}

const actions: ActionDef[] = [];
const add = (a: Omit<ActionDef, 'lootTable'> & { lootTable?: string }) =>
  actions.push({ ...a, lootTable: a.lootTable ?? a.id });

// ----- Mining -----
add({ id: 'mine_copper', skill: 'mining', name: 'Copper ore', group: 'Ores', level: 1, durationMs: 3000, xp: 8, inputs: [], output: { item: 'copper_ore', qty: 1 }, iconItem: 'copper_ore', sound: 'mine' });
add({ id: 'mine_tin', skill: 'mining', name: 'Tin ore', group: 'Ores', level: 1, durationMs: 3000, xp: 8, inputs: [], output: { item: 'tin_ore', qty: 1 }, iconItem: 'tin_ore', sound: 'mine' });
add({ id: 'mine_stone', skill: 'mining', name: 'Stone', group: 'Ores', level: 1, durationMs: 2600, xp: 5, inputs: [], output: { item: 'stone', qty: 1 }, iconItem: 'stone', sound: 'mine' });
add({ id: 'mine_iron', skill: 'mining', name: 'Iron ore', group: 'Ores', level: 50, durationMs: 3300, xp: 12, inputs: [], output: { item: 'iron_ore', qty: 1 }, iconItem: 'iron_ore', sound: 'mine' });

// ----- Smithing -----
add({ id: 'smelt_bronze', skill: 'smithing', name: 'Bronze bar', group: 'Bars', level: 1, durationMs: 3000, xp: 8, inputs: [{ item: 'copper_ore', qty: 1 }, { item: 'tin_ore', qty: 1 }], output: { item: 'bronze_bar', qty: 1 }, iconItem: 'bronze_bar', sound: 'smith' });
add({ id: 'smelt_iron', skill: 'smithing', name: 'Iron bar', group: 'Bars', level: 50, durationMs: 3300, xp: 12, inputs: [{ item: 'iron_ore', qty: 1 }], output: { item: 'iron_bar', qty: 1 }, iconItem: 'iron_bar', sound: 'smith' });
for (const metal of METAL_TIERS) {
  for (const piece of GEAR_PIECES) {
    const id = `${metal.tier}_${piece.key}`;
    add({
      id: `smith_${id}`, skill: 'smithing', name: `${metal.name} ${piece.name}`, group: `${metal.name} gear`,
      level: metal.level + piece.levelOffset, durationMs: 2500 + 500 * piece.bars,
      xp: Math.round(metal.barXp * (0.6 * piece.bars + 0.4)),
      inputs: [{ item: metal.bar, qty: piece.bars }], output: { item: id, qty: 1 }, iconItem: id, sound: 'smith',
    });
  }
}

// ----- Woodcutting -----
add({ id: 'chop_pine', skill: 'woodcutting', name: 'Pine tree', group: 'Trees', level: 1, durationMs: 3000, xp: 8, inputs: [], output: { item: 'pine_logs', qty: 1 }, iconItem: 'pine_logs', sound: 'chop' });
add({ id: 'chop_oak', skill: 'woodcutting', name: 'Oak tree', group: 'Trees', level: 50, durationMs: 3300, xp: 12, inputs: [], output: { item: 'oak_logs', qty: 1 }, iconItem: 'oak_logs', sound: 'chop' });

// ----- Firemaking (burning gives XP, no item) -----
add({ id: 'burn_pine', skill: 'firemaking', name: 'Pine logs', group: 'Logs', level: 1, durationMs: 3000, xp: 9, inputs: [{ item: 'pine_logs', qty: 1 }], output: null, iconItem: 'pine_logs', sound: 'crackle' });
add({ id: 'burn_oak', skill: 'firemaking', name: 'Oak logs', group: 'Logs', level: 50, durationMs: 3300, xp: 13, inputs: [{ item: 'oak_logs', qty: 1 }], output: null, iconItem: 'oak_logs', sound: 'crackle' });

// ----- Fishing -----
add({ id: 'fish_shrimp', skill: 'fishing', name: 'Shrimp', group: 'River', level: 1, durationMs: 3000, xp: 8, inputs: [], output: { item: 'raw_shrimp', qty: 1 }, iconItem: 'raw_shrimp', sound: 'splash' });
add({ id: 'fish_trout', skill: 'fishing', name: 'River trout', group: 'River', level: 50, durationMs: 3300, xp: 12, inputs: [], output: { item: 'raw_trout', qty: 1 }, iconItem: 'raw_trout', sound: 'splash' });

// ----- Cooking (idle makes normal food; the minigame can make "Great" food) -----
add({ id: 'cook_shrimp', skill: 'cooking', name: 'Shrimp', group: 'Fish', level: 1, durationMs: 2500, xp: 8, inputs: [{ item: 'raw_shrimp', qty: 1 }], output: { item: 'cooked_shrimp', qty: 1 }, greatLootTable: 'cook_shrimp_great', iconItem: 'cooked_shrimp', sound: 'sizzle' });
add({ id: 'cook_trout', skill: 'cooking', name: 'River trout', group: 'Fish', level: 50, durationMs: 2800, xp: 12, inputs: [{ item: 'raw_trout', qty: 1 }], output: { item: 'cooked_trout', qty: 1 }, greatLootTable: 'cook_trout_great', iconItem: 'cooked_trout', sound: 'sizzle' });
export const GREAT_FOOD: Record<string, string> = { cook_shrimp_great: 'great_shrimp', cook_trout_great: 'great_trout' };

// ----- Crafting: make tools, then upgrade them (always succeeds) -----
for (const wood of WOOD_TIERS) {
  for (const tool of CRAFTED_TOOLS) {
    const id = `${wood.tier}_${tool.key}`;
    const mats = tool.logs + tool.stone;
    const level = wood.level + tool.levelOffset;
    const inputs = [{ item: wood.logs, qty: tool.logs }, ...(tool.stone ? [{ item: 'stone', qty: tool.stone }] : [])];
    const name = tool.key === 'rod' ? `${wood.woodName} fishing rod` : `${wood.name} ${tool.name}`;
    add({
      id: `craft_${id}`, skill: 'crafting', name, group: 'Tools', level,
      durationMs: 2600 + 400 * mats, xp: Math.round(wood.logXp * (0.5 * mats + 0.5)),
      inputs, output: { item: id, qty: 1 }, iconItem: id, sound: 'craft',
    });
    for (let n = 0; n < MAX_UPGRADE; n++) {
      add({
        id: `upgrade_${id}_${n + 1}`, skill: 'crafting', name: `${name} +${n + 1}`, group: 'Upgrades',
        level: level + 3 * (n + 1), durationMs: 4000, xp: Math.round(wood.logXp * (2 + n) * 1.2),
        inputs: [{ item: upgradeId(id, n), qty: 1 }, { item: wood.logs, qty: (n + 1) * 2 }, { item: 'stone', qty: n + 1 }],
        output: { item: upgradeId(id, n + 1), qty: 1 }, iconItem: upgradeId(id, n + 1), sound: 'craft',
        kind: 'upgrade', upgrades: upgradeId(id, n),
      });
    }
  }
}

// ----- Enhancing: improve smithed gear (chance-based; failure only uses the bars) -----
for (const metal of METAL_TIERS) {
  for (const piece of GEAR_PIECES) {
    const id = `${metal.tier}_${piece.key}`;
    const name = `${metal.name} ${piece.name}`;
    for (let n = 0; n < MAX_UPGRADE; n++) {
      add({
        id: `enhance_${id}_${n + 1}`, skill: 'enhancing', name: `${name} +${n + 1}`, group: name,
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
