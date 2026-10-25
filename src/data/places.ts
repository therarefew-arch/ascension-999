// Local names for each skill's place in every town (shown on the skill screen).
import type { SkillId } from './items';
import { SKILLS } from './skills';
import type { Region } from './tiers';

const PLACE_NAMES: Partial<Record<Region, Partial<Record<SkillId, string>>>> = {
  Ironmoor: {
    mining: 'The Deep Mine', smithing: 'Ironworks Forge', woodcutting: 'Oakwood Grove', fishing: 'Rushwater Falls',
    cooking: 'Miners’ Canteen', firemaking: 'The Ember Pit', crafting: 'Tinker’s Bench', runecrafting: 'Stone Circle', enhancing: 'Rune Anvil',
  },
  Coalhaven: {
    mining: 'Blackseam Pit', smithing: 'Harbour Steelworks', woodcutting: 'Weeping Willows', fishing: 'Salmon Quay',
    cooking: 'The Salty Kettle', firemaking: 'Lantern Row', crafting: 'Shipwright’s Loft', runecrafting: 'Tide Stones', enhancing: 'Anchor Forge',
  },
};

/** Where the combat area is in each town. */
export const TRAINING: Partial<Record<Region, string>> = { Pocketvale: 'Training Grounds', Ironmoor: 'Mine Tunnels', Coalhaven: 'The Docks' };

export function placeName(region: Region, skill: SkillId): string {
  return PLACE_NAMES[region]?.[skill] ?? SKILLS[skill].place;
}
