// Skills and the actions (resources) you can idle on. Static data only.
import { GEAR_PIECES, METAL_TIERS, type SkillId } from './items';
import type { SoundKey } from '../audio/soundList';

export interface SkillDef {
  id: SkillId;
  name: string;
  verb: string;
  place: string;
  description: string;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  mining: { id: 'mining', name: 'Mining', verb: 'Mining', place: 'The Mine', description: 'Dig ores from the hills around Pocketvale.' },
  smithing: { id: 'smithing', name: 'Smithing', verb: 'Smithing', place: 'The Forge', description: 'Smelt ores into bars and hammer bars into gear.' },
};
export const SKILL_ORDER: SkillId[] = ['mining', 'smithing'];

export interface ActionDef {
  id: string;
  skill: SkillId;
  name: string;
  group: string;
  level: number;
  durationMs: number;
  xp: number;
  inputs: { item: string; qty: number }[];
  /** What the action produces. Always rolled through the central loot system. */
  lootTable: string;
  /** Item shown as this action's icon. */
  iconItem: string;
  sound: SoundKey;
}

const actions: ActionDef[] = [
  // Mining — tier 0 (level 1), tier 1 (level 50)
  { id: 'mine_copper', skill: 'mining', name: 'Copper ore', group: 'Ores', level: 1, durationMs: 3000, xp: 8, inputs: [], lootTable: 'mine_copper', iconItem: 'copper_ore', sound: 'mine' },
  { id: 'mine_tin', skill: 'mining', name: 'Tin ore', group: 'Ores', level: 1, durationMs: 3000, xp: 8, inputs: [], lootTable: 'mine_tin', iconItem: 'tin_ore', sound: 'mine' },
  { id: 'mine_iron', skill: 'mining', name: 'Iron ore', group: 'Ores', level: 50, durationMs: 3300, xp: 12, inputs: [], lootTable: 'mine_iron', iconItem: 'iron_ore', sound: 'mine' },

  // Smithing — bars
  { id: 'smelt_bronze', skill: 'smithing', name: 'Bronze bar', group: 'Bars', level: 1, durationMs: 3000, xp: 8, inputs: [{ item: 'copper_ore', qty: 1 }, { item: 'tin_ore', qty: 1 }], lootTable: 'smelt_bronze', iconItem: 'bronze_bar', sound: 'smith' },
  { id: 'smelt_iron', skill: 'smithing', name: 'Iron bar', group: 'Bars', level: 50, durationMs: 3300, xp: 12, inputs: [{ item: 'iron_ore', qty: 1 }], lootTable: 'smelt_iron', iconItem: 'iron_bar', sound: 'smith' },
];

// Smithing — gear for each metal tier. Bigger pieces use more bars and give more XP per second.
for (const metal of METAL_TIERS) {
  const barXp = metal.tier === 'bronze' ? 8 : 12;
  for (const piece of GEAR_PIECES) {
    const id = `${metal.tier}_${piece.key}`;
    actions.push({
      id: `smith_${id}`,
      skill: 'smithing',
      name: `${metal.name} ${piece.name}`,
      group: `${metal.name} gear`,
      level: metal.level + piece.levelOffset,
      durationMs: 2500 + 500 * piece.bars,
      xp: Math.round(barXp * (0.6 * piece.bars + 0.4)),
      inputs: [{ item: metal.bar, qty: piece.bars }],
      lootTable: `smith_${id}`,
      iconItem: id,
      sound: 'smith',
    });
  }
}

export const ACTIONS: Record<string, ActionDef> = Object.fromEntries(actions.map((a) => [a.id, a]));
export const ACTION_LIST = actions;

export function actionsForSkill(skill: SkillId): ActionDef[] {
  return actions.filter((a) => a.skill === skill);
}
