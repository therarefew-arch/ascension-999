// 🗺️ Each town's own dungeon (v0.0.1.80, owner: "the maps and setting should be designed around each town dependent on
// which town you entered the dungeon for"). Static data only: the dungeon's name, what its rooms are called, a hint,
// and its signature hazard(s). The engine (core/dungeon.ts) places and runs the hazards; every one warns you first.
import type { RoomKind } from '../core/dungeonRun';
import type { Region } from './tiers';

export type Hazard = 'springs' | 'rockfall' | 'bog' | 'waves' | 'fog' | 'vents' | 'ice' | 'lowgrav' | 'stars' | 'wind' | 'thorns';
/** Hazards that stay in the boss's hall (the active, falling/rolling/erupting ones don't — the boss is enough). */
export const BOSS_HALL_HAZARDS: Hazard[] = ['fog', 'ice', 'lowgrav', 'springs'];

export interface DungeonTown {
  /** One line shown on the map and as you enter a room. */
  hint: string;
  hazards: Hazard[];
  rooms: Record<RoomKind, string>;
}

export const DUNGEON_TOWNS: Record<Region, DungeonTown> = {
  Pocketvale: {
    hint: '🍄 Jump on a big mushroom to bounce up to the high ledges.',
    hazards: ['springs'],
    rooms: { fight: 'Mossy hollow', elite: 'Badger sett', treasure: "Squirrel's hoard", camp: 'Fairy ring', exit: "Woodcutter's path", shop: "Wick's stall", boss: 'The old oak' },
  },
  Ironmoor: {
    hint: '🪨 Dust trickling from the roof means rocks are coming — step aside.',
    hazards: ['rockfall'],
    rooms: { fight: 'Old shaft', elite: 'Collapsed gallery', treasure: 'Ore-cart cache', camp: 'Lamp-lit nook', exit: 'Lift cage', shop: "Wick's stall", boss: 'The deepest seam' },
  },
  Coalhaven: {
    hint: '🟫 Bog pools slow you down — jump across them.',
    hazards: ['bog'],
    rooms: { fight: 'Reed beds', elite: 'Sunken barge', treasure: "Smuggler's crates", camp: 'Lantern buoy', exit: 'Barge landing', shop: "Wick's stall", boss: 'The black water' },
  },
  Bluecliff: {
    hint: '🌊 Waves roll in from the sea — jump over them.',
    hazards: ['waves'],
    rooms: { fight: 'Driftwood cove', elite: 'Wreck hold', treasure: "Wreckers' cache", camp: 'Lighthouse beam', exit: 'Cliff stairs', shop: "Wick's stall", boss: 'The drowned bell cave' },
  },
  Lunaria: {
    hint: '🌫️ The fog is thick here — you only see what is close.',
    hazards: ['fog'],
    rooms: { fight: 'Fog lane', elite: 'Drowned square', treasure: 'Barge cellar', camp: 'Lit lantern', exit: 'Harbour steps', shop: "Wick's stall", boss: 'Under the bell tower' },
  },
  Cinderpeak: {
    hint: '🌋 Vents glow before they burst — wait, then run past.',
    hazards: ['vents'],
    rooms: { fight: 'Ash path', elite: 'Magma den', treasure: 'Ash Market stash', camp: 'Hot spring', exit: 'Goat trail', shop: "Wick's stall", boss: 'The caldera' },
  },
  Frosthold: {
    hint: '🧊 The ground is ice — you slide, so stop early.',
    hazards: ['ice'],
    rooms: { fight: 'Snowdrift', elite: 'Ice cave', treasure: 'Frozen cache', camp: 'Singing hearth', exit: 'Pass gate', shop: "Wick's stall", boss: 'The whiteout' },
  },
  Voidreach: {
    hint: '🌌 Light as a feather — your jumps carry far.',
    hazards: ['lowgrav'],
    rooms: { fight: 'Rope bridge', elite: 'Echo hollow', treasure: 'Starlit hoard', camp: 'Echo fire', exit: 'Rope lift', shop: "Wick's stall", boss: 'The bottom of the chasm' },
  },
  'Starfall Crater': {
    hint: '🌠 Stars fall where they glow — and leave gold where they land.',
    hazards: ['stars'],
    rooms: { fight: 'Star-flower field', elite: 'Humming hollow', treasure: 'Fallen star', camp: 'Calm cow pasture', exit: 'Crater rim', shop: "Wick's stall", boss: 'The heart of the crater' },
  },
  'Celestine Spires': {
    hint: '💨 When the chimes ring, a gust is coming — brace yourself.',
    hazards: ['wind'],
    rooms: { fight: 'Cloud stair', elite: 'Tower lair', treasure: 'Sky vault', camp: 'Chime garden', exit: 'Sky bridge', shop: "Wick's stall", boss: 'The highest spire' },
  },
  'Primordial Rift': {
    hint: '🌿 Thorn vines bite — jump them. Jump on a great root to bounce up.',
    hazards: ['thorns', 'springs'],
    rooms: { fight: 'Giant ferns', elite: 'First den', treasure: 'Worldtree root', camp: 'Fern bower', exit: 'Rift edge', shop: "Wick's stall", boss: 'The first song' },
  },
};
