// Local names for each skill's place in every town (shown on the skill screen).
import type { SkillId } from './items';
import { SKILLS } from './skills';
import type { Region } from './tiers';

const PLACE_NAMES: Partial<Record<Region, Partial<Record<SkillId, string>>>> = {
  Pocketvale: { herblore: 'Buttercup Meadow', farming: 'Your Garden' },
  Ironmoor: {
    herblore: 'Rocky Slopes', farming: 'Your Garden (back in Pocketvale)',
    mining: 'The Deep Mine', smithing: 'Ironworks Forge', woodcutting: 'Oakwood Grove', fishing: 'Rushwater Falls',
    cooking: 'Miners’ Canteen', firemaking: 'The Ember Pit', crafting: 'Tinker’s Bench', runecrafting: 'Stone Circle', enhancing: 'Rune Anvil',
  },
  Coalhaven: {
    herblore: 'The Willow Banks', farming: 'Your Garden (back in Pocketvale)',
    mining: 'Blackseam Pit', smithing: 'Harbour Steelworks', woodcutting: 'Weeping Willows', fishing: 'Salmon Quay',
    cooking: 'The Salty Kettle', firemaking: 'Lantern Row', crafting: 'Shipwright’s Loft', runecrafting: 'Tide Stones', enhancing: 'Anchor Forge',
  },
  Bluecliff: {
    herblore: 'The Salt Meadows', farming: 'Your Garden (back in Pocketvale)',
    mining: 'Cobalt Cliffs', smithing: 'Lighthouse Forge', woodcutting: 'Maple Ridge', fishing: 'The Lobster Pots',
    cooking: 'Clifftop Chowder House', firemaking: 'Beacon Point', crafting: 'Netmaker’s Hut', runecrafting: 'Wind Stones', enhancing: 'Tidecut Anvil',
  },
  Lunaria: {
    herblore: 'The Silver Hollow', farming: 'Your Garden (back in Pocketvale)',
    mining: 'Moonsilver Seams', smithing: 'The Cold Forge', woodcutting: 'Moonwood Grove', fishing: 'The Still Quay',
    cooking: 'The Empty Tavern', firemaking: 'Lantern Walk', crafting: 'The Lamplighter’s Shed', runecrafting: 'The Moon Circle', enhancing: 'The Bell Anvil',
  },
};

/** Where the combat area is in each town. */
export const TRAINING: Partial<Record<Region, string>> = { Pocketvale: 'Training Grounds', Ironmoor: 'Mine Tunnels', Coalhaven: 'The Docks', Bluecliff: 'The Cliff Path', Lunaria: 'The Fog Streets' };

export function placeName(region: Region, skill: SkillId): string {
  return PLACE_NAMES[region]?.[skill] ?? SKILLS[skill].place;
}
