// 🐟 Rare fish: a few special fish in every town, caught by chance while fishing there.
// Each catch has a random size — the Fishing Journal remembers how many you've caught and your biggest.
// They're treasures (sell them at the Trading Post). They drop through the central loot system.
import type { Region } from './tiers';

export interface RareFish {
  id: string;
  name: string;
  emoji: string;
  region: Region;
  /** Pick weight inside its town (bigger = more common). */
  weight: number;
  /** Size range in centimetres. */
  minCm: number;
  maxCm: number;
  value: number;
  blurb: string;
}

/** Chance per fishing action (in that town) of a rare fish. */
export const RARE_FISH_CHANCE = 1 / 200;

export const RARE_FISH: RareFish[] = [
  // Pocketvale
  { id: 'rf_golden_minnow', name: 'Golden minnow', emoji: '🐟', region: 'Pocketvale', weight: 60, minCm: 4, maxCm: 9, value: 300, blurb: 'A tiny fish that shines like a coin. Kids say it grants small wishes.' },
  { id: 'rf_pebble_pike', name: 'Pebble pike', emoji: '🐠', region: 'Pocketvale', weight: 30, minCm: 30, maxCm: 70, value: 600, blurb: 'Speckled like the riverbed. You only see it when it moves.' },
  { id: 'rf_old_whiskers', name: 'Old Whiskers', emoji: '🐡', region: 'Pocketvale', weight: 10, minCm: 80, maxCm: 140, value: 1500, blurb: 'A huge, ancient catfish. Everyone in Pocketvale has a story about the time they almost caught him.' },
  // Ironmoor
  { id: 'rf_ironscale_carp', name: 'Ironscale carp', emoji: '🐟', region: 'Ironmoor', weight: 60, minCm: 25, maxCm: 60, value: 700, blurb: 'Its scales clink when it flips. Miners keep one as a lucky charm.' },
  { id: 'rf_cave_glow_eel', name: 'Cave glow eel', emoji: '🐍', region: 'Ironmoor', weight: 30, minCm: 50, maxCm: 120, value: 1200, blurb: 'Swims out of the flooded tunnels, glowing a soft blue.' },
  { id: 'rf_rust_perch', name: 'Rust perch', emoji: '🐠', region: 'Ironmoor', weight: 10, minCm: 20, maxCm: 45, value: 2500, blurb: 'Bright orange, as if it was dipped in the mine’s rusty pipes. Very rare.' },
  // Coalhaven
  { id: 'rf_coal_bass', name: 'Coal-black bass', emoji: '🐟', region: 'Coalhaven', weight: 60, minCm: 30, maxCm: 75, value: 1000, blurb: 'Dark as a coal barge. Tastes faintly of smoke.' },
  { id: 'rf_willow_ghostfish', name: 'Willow ghostfish', emoji: '🐠', region: 'Coalhaven', weight: 30, minCm: 15, maxCm: 40, value: 1800, blurb: 'See-through, and only ever found under the weeping willows.' },
  { id: 'rf_harbour_sunfish', name: 'Harbour sunfish', emoji: '🐡', region: 'Coalhaven', weight: 10, minCm: 90, maxCm: 200, value: 3500, blurb: 'A round, sleepy giant that drifts in on warm days. The dockers cheer when it does.' },
  // Bluecliff
  { id: 'rf_rainbow_mackerel', name: 'Rainbow mackerel', emoji: '🐟', region: 'Bluecliff', weight: 60, minCm: 25, maxCm: 50, value: 1500, blurb: 'Every colour of the sea spray on one fish.' },
  { id: 'rf_lanternfish', name: 'Lighthouse lanternfish', emoji: '🐠', region: 'Bluecliff', weight: 30, minCm: 10, maxCm: 30, value: 2600, blurb: 'Carries its own little light. The keeper says they come to keep the lighthouse company.' },
  { id: 'rf_storm_squid', name: 'Storm squid', emoji: '🦑', region: 'Bluecliff', weight: 10, minCm: 60, maxCm: 180, value: 5000, blurb: 'Only bites on wild nights. Crackles faintly, like a far-off storm.' },
  // Lunaria
  { id: 'rf_moonlit_koi', name: 'Moonlit koi', emoji: '🐟', region: 'Lunaria', weight: 60, minCm: 30, maxCm: 80, value: 2200, blurb: 'Silver and white, and somehow always lit by the moon.' },
  { id: 'rf_fog_jelly', name: 'Fog jelly', emoji: '🪼', region: 'Lunaria', weight: 30, minCm: 10, maxCm: 50, value: 3600, blurb: 'Drifts like a little cloud. Glows when someone hums nearby.' },
  { id: 'rf_lunes_carp', name: 'Lune’s carp', emoji: '🐡', region: 'Lunaria', weight: 10, minCm: 70, maxCm: 150, value: 7000, blurb: 'The old bell-keeper’s favourite. Wears a little moon-shaped spot on its forehead.' },
  // Cinderpeak
  { id: 'rf_magma_guppy', name: 'Magma guppy', emoji: '🐟', region: 'Cinderpeak', weight: 60, minCm: 5, maxCm: 15, value: 3000, blurb: 'Swims happily in the lava lake. Do not hold it for long.' },
  { id: 'rf_ember_puffer', name: 'Ember puffer', emoji: '🐡', region: 'Cinderpeak', weight: 30, minCm: 20, maxCm: 50, value: 5000, blurb: 'Puffs up into a glowing ball of sparks when surprised.' },
  { id: 'rf_obsidian_ray', name: 'Obsidian ray', emoji: '🐠', region: 'Cinderpeak', weight: 10, minCm: 100, maxCm: 260, value: 10000, blurb: 'Glides under the lava crust like a shadow. Its edges glow orange.' },
];

export const RARE_FISH_MAP: Record<string, RareFish> = Object.fromEntries(RARE_FISH.map((f) => [f.id, f]));
export const rareFishIn = (r: Region) => RARE_FISH.filter((f) => f.region === r);
