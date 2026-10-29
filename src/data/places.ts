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
  Cinderpeak: {
    herblore: 'The Warm Terraces', farming: 'Your Garden (back in Pocketvale)',
    mining: 'The Glowing Vents', smithing: 'The Old Kiln Forge', woodcutting: 'Emberbark Slopes', fishing: 'The Lava Lake',
    cooking: 'Hot-Stone Bakery', firemaking: 'The Ember Steps', crafting: 'Potters’ Row', runecrafting: 'The Fire Circle', enhancing: 'The Magma Anvil',
  },
  Frosthold: {
    herblore: 'Frostmint Hollow', farming: 'Your Garden (back in Pocketvale)',
    mining: 'The Frostcore Glacier', smithing: 'The Rimefire Forge', woodcutting: 'Frostpine Ridge', fishing: 'The Ice Holes',
    cooking: 'The Stew Hall', firemaking: 'The Long Hearth', crafting: 'The Sled Barn', runecrafting: 'The Singing Stones', enhancing: 'The Frost Anvil',
  },
  Voidreach: {
    herblore: 'The Rim Gardens', farming: 'Your Garden (back in Pocketvale)',
    mining: 'The Edge Quarry', smithing: 'The Hanging Forge', woodcutting: 'The Voidwood Thicket', fishing: 'The Star Well',
    cooking: 'The Rope-Bridge Inn', firemaking: 'The Lamp Pegs', crafting: 'The Ribbon Loft', runecrafting: 'The Echo Circle', enhancing: 'The Gravity Anvil',
  },
  'Starfall Crater': {
    herblore: 'The Thistle Rows', farming: 'Your Garden (back in Pocketvale)',
    mining: 'The Impact Seam', smithing: 'The Starmetal Smithy', woodcutting: 'The Starbloom Orchard', fishing: 'The Crater Pond',
    cooking: 'The Harvest Table', firemaking: 'The Comet Pit', crafting: 'The Barn Loft', runecrafting: 'The Humming Stone', enhancing: 'The Skyfall Anvil',
  },
  'Celestine Spires': {
    herblore: 'The Sky Gardens', farming: 'Your Garden (back in Pocketvale)',
    mining: 'The Floating Quarry', smithing: 'The Wind Forge', woodcutting: 'The Celestwood Terraces', fishing: 'The Cloud Nets',
    cooking: 'The Sky Kitchen', firemaking: 'The Beacon Spire', crafting: 'The Chime-Maker’s Workshop', runecrafting: 'The Star Observatory', enhancing: 'The Zenith Anvil',
  },
  'Primordial Rift': {
    herblore: 'The Fern Valley', farming: 'Your Garden (back in Pocketvale)',
    mining: 'The First Stone', smithing: 'The Dawn Forge', woodcutting: 'The Worldtree Roots', fishing: 'The Leviathan Deeps',
    cooking: 'The First Fire', firemaking: 'The Eternal Flame', crafting: 'The Ancestors’ Workshop', runecrafting: 'The Origin Circle', enhancing: 'The Anvil of Ages',
  },
};

/** Where the combat area is in each town. */
export const TRAINING: Partial<Record<Region, string>> = { Pocketvale: 'Training Grounds', Ironmoor: 'Mine Tunnels', Coalhaven: 'The Docks', Bluecliff: 'The Cliff Path', Lunaria: 'The Fog Streets', Cinderpeak: 'The Ash Fields',
  Frosthold: 'The Snowfields', Voidreach: 'The Chasm Rim', 'Starfall Crater': 'The Crater Fields', 'Celestine Spires': 'The High Bridges', 'Primordial Rift': 'The Wild Valley' };

export function placeName(region: Region, skill: SkillId): string {
  return PLACE_NAMES[region]?.[skill] ?? SKILLS[skill].place;
}
