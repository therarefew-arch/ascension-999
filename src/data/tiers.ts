// The 11 resource tiers — one per region, a new tier every 90 levels (1, 90, 180 … 900), up to the 999 cap.
// Tiers outside an open region exist in the game data but stay locked until that region is built.

export const REGIONS = [
  'Pocketvale', 'Ironmoor', 'Coalhaven', 'Bluecliff', 'Lunaria', 'Cinderpeak',
  'Frosthold', 'Voidreach', 'Starfall Crater', 'Celestine Spires', 'Primordial Rift',
] as const;
export type Region = (typeof REGIONS)[number];

/** Regions that are built. Add a region here when it's built (players still have to travel there to unlock it). */
export const OPEN_REGIONS: Region[] = ['Pocketvale', 'Ironmoor'];

/** How to reach each built region. */
export const REGION_INFO: Partial<Record<Region, {
  /** Any skill at this level opens the road there. */
  unlockLevel: number;
  /** Walking time from any other town (free). */
  walkMs: number;
  /** Fast travel cost (instant, only to places you've visited). */
  fastTravelCoins: number;
  blurb: string;
  scene: 'town' | 'ironmoor';
}>> = {
  Pocketvale: { unlockLevel: 1, walkMs: 90_000, fastTravelCoins: 200, blurb: 'A quiet town at the edge of the hills', scene: 'town' },
  Ironmoor: { unlockLevel: 90, walkMs: 90_000, fastTravelCoins: 200, blurb: 'A smoky mountain town built around the deep iron mines', scene: 'ironmoor' },
};

/** Skills whose resources must be gathered on location (you start them in that region). */
export const LOCAL_SKILLS = ['mining', 'woodcutting', 'fishing'] as const;

export const TIER_COUNT = 11;
/** Level a tier unlocks at: 1, 90, 180, 270 … 900. */
export const tierLevel = (t: number) => (t === 0 ? 1 : t * 90);
/** One tier per region, in order (Pocketvale = tier 0 … Primordial Rift = tier 10). */
export const tierRegion = (t: number): Region => REGIONS[Math.min(REGIONS.length - 1, t)];
export const regionOpen = (r: Region | undefined) => !r || OPEN_REGIONS.includes(r);

/** XP and time per action at tier t (tiers 0–1 keep their hand-tuned values). ~3,150 hours to 999 per skill. */
export const tierXp = (t: number) => Math.round(8 * Math.pow(1.7, t));
export const tierTimeMs = (t: number) => 3000 + 300 * t;

/** A colour for each tier, so every tier's icons look different. */
export function tierPalette(hue: number, sat = 55, light = 55) {
  return {
    main: `hsl(${hue} ${sat}% ${light}%)`,
    light: `hsl(${hue} ${sat}% ${Math.min(92, light + 25)}%)`,
    dark: `hsl(${hue} ${sat}% ${Math.max(12, light - 28)}%)`,
  };
}

export interface MetalTier { key: string; name: string; hue: number; sat: number; light: number }
/** Metal tiers (ores → bars → weapons, armour, arrows, tools). Tier 0 = Bronze, tier 1 = Iron. */
export const METALS: MetalTier[] = [
  { key: 'bronze', name: 'Bronze', hue: 33, sat: 55, light: 53 },
  { key: 'iron', name: 'Iron', hue: 210, sat: 6, light: 58 },
  { key: 'steel', name: 'Steel', hue: 205, sat: 18, light: 68 },
  { key: 'cobalt', name: 'Cobalt', hue: 222, sat: 70, light: 52 },
  { key: 'moonsilver', name: 'Moonsilver', hue: 230, sat: 30, light: 80 },
  { key: 'emberite', name: 'Emberite', hue: 14, sat: 85, light: 52 },
  { key: 'frostcore', name: 'Frostcore', hue: 190, sat: 80, light: 70 },
  { key: 'voidstone', name: 'Voidstone', hue: 275, sat: 45, light: 35 },
  { key: 'starmetal', name: 'Starmetal', hue: 50, sat: 90, light: 65 },
  { key: 'celestium', name: 'Celestium', hue: 170, sat: 60, light: 65 },
  { key: 'primordial', name: 'Primordial', hue: 120, sat: 45, light: 38 },
];

export interface WoodTier { key: string; name: string; hue: number; light: number }
/** Wood tiers (trees → logs → bows, staffs, fires). Tier 0 = Pine, tier 1 = Oak. */
export const WOODS: WoodTier[] = [
  { key: 'pine', name: 'Pine', hue: 30, light: 45 },
  { key: 'oak', name: 'Oak', hue: 28, light: 35 },
  { key: 'willow', name: 'Willow', hue: 70, light: 40 },
  { key: 'maple', name: 'Maple', hue: 15, light: 42 },
  { key: 'moonwood', name: 'Moonwood', hue: 225, light: 60 },
  { key: 'emberbark', name: 'Emberbark', hue: 10, light: 40 },
  { key: 'frostpine', name: 'Frostpine', hue: 195, light: 65 },
  { key: 'voidwood', name: 'Voidwood', hue: 280, light: 28 },
  { key: 'starbloom', name: 'Starbloom', hue: 50, light: 60 },
  { key: 'celestwood', name: 'Celestwood', hue: 175, light: 55 },
  { key: 'worldtree', name: 'Worldtree', hue: 90, light: 55 },
];

export interface FishTier { key: string; name: string; hue: number; shrimp?: boolean }
/** Fish tiers (fishing → cooking). Tier 0 = Shrimp, tier 1 = River trout. */
export const FISH: FishTier[] = [
  { key: 'shrimp', name: 'Shrimp', hue: 12, shrimp: true },
  { key: 'trout', name: 'River trout', hue: 197 },
  { key: 'salmon', name: 'Salmon', hue: 8 },
  { key: 'lobster', name: 'Lobster', hue: 0, shrimp: true },
  { key: 'moonfin', name: 'Moonfin', hue: 235 },
  { key: 'emberfin', name: 'Emberfin', hue: 20 },
  { key: 'frostcod', name: 'Frostcod', hue: 190 },
  { key: 'voideel', name: 'Void eel', hue: 275 },
  { key: 'starray', name: 'Star ray', hue: 50 },
  { key: 'skycarp', name: 'Sky carp', hue: 200 },
  { key: 'leviathan', name: 'Leviathan', hue: 160 },
];
