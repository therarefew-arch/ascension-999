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
  // Frosthold
  { id: 'rf_snow_trout', name: 'Snow trout', emoji: '🐟', region: 'Frosthold', weight: 60, minCm: 30, maxCm: 70, value: 4200, blurb: 'Pale as the drifts. Bites best while someone sings by the ice hole.' },
  { id: 'rf_aurora_char', name: 'Aurora char', emoji: '🐠', region: 'Frosthold', weight: 30, minCm: 25, maxCm: 60, value: 7000, blurb: 'Its scales shimmer green and pink, like the lights over the glacier.' },
  { id: 'rf_icecrown_pike', name: 'Ice-crown pike', emoji: '🐡', region: 'Frosthold', weight: 10, minCm: 90, maxCm: 210, value: 14000, blurb: 'Wears a little crown of frost. The old fishers bow when one is landed.' },
  // Voidreach
  { id: 'rf_starling_minnow', name: 'Starling minnow', emoji: '🐟', region: 'Voidreach', weight: 60, minCm: 5, maxCm: 20, value: 5800, blurb: 'Swims up out of the chasm in shoals, twinkling like a handful of stars.' },
  { id: 'rf_echo_eel', name: 'Echo eel', emoji: '🐍', region: 'Voidreach', weight: 30, minCm: 60, maxCm: 160, value: 9500, blurb: 'You hear it splash a whole day after you catch it.' },
  { id: 'rf_abyssal_angler', name: 'Abyssal angler', emoji: '🐡', region: 'Voidreach', weight: 10, minCm: 80, maxCm: 240, value: 19000, blurb: 'Carries a tiny lantern on its head. Nobody knows what it uses for bait.' },
  // Starfall Crater
  { id: 'rf_comet_goldfish', name: 'Comet goldfish', emoji: '🐠', region: 'Starfall Crater', weight: 60, minCm: 10, maxCm: 30, value: 8000, blurb: 'Leaves a little trail of sparkles behind it in the crater pond.' },
  { id: 'rf_moonbeam_catfish', name: 'Moonbeam catfish', emoji: '🐟', region: 'Starfall Crater', weight: 30, minCm: 60, maxCm: 140, value: 13000, blurb: 'Whiskers that glow. The farmers say it hums along with the star at night.' },
  { id: 'rf_starheart_sturgeon', name: 'Starheart sturgeon', emoji: '🐡', region: 'Starfall Crater', weight: 10, minCm: 150, maxCm: 300, value: 26000, blurb: 'Huge, ancient and calm. It was here before the star fell, and wasn\'t bothered by it either.' },
  // Celestine Spires
  { id: 'rf_breeze_guppy', name: 'Breeze guppy', emoji: '🐟', region: 'Celestine Spires', weight: 60, minCm: 5, maxCm: 15, value: 11000, blurb: 'Swims through the air between the towers. Easily caught in a butterfly net.' },
  { id: 'rf_cloud_koi', name: 'Cloud koi', emoji: '🐠', region: 'Celestine Spires', weight: 30, minCm: 40, maxCm: 100, value: 18000, blurb: 'White and gold, and it leaves a little puff of cloud behind every flick of its tail.' },
  { id: 'rf_thunder_whale', name: 'Thunder whale calf', emoji: '🐋', region: 'Celestine Spires', weight: 10, minCm: 200, maxCm: 450, value: 36000, blurb: 'A baby sky whale. It rumbles happily, then floats off home. (It always gets home.)' },
  // The Primordial Rift
  { id: 'rf_trilobite', name: 'Living trilobite', emoji: '🦐', region: 'Primordial Rift', weight: 60, minCm: 5, maxCm: 30, value: 15000, blurb: 'Everyone thought these were only fossils. Nobody told the trilobites.' },
  { id: 'rf_coelacanth', name: 'First coelacanth', emoji: '🐟', region: 'Primordial Rift', weight: 30, minCm: 100, maxCm: 200, value: 25000, blurb: 'The fish that first thought about walking. It decided against it.' },
  { id: 'rf_little_leviathan', name: 'Little leviathan', emoji: '🐉', region: 'Primordial Rift', weight: 10, minCm: 300, maxCm: 900, value: 50000, blurb: '"Little." Lives in the Leviathan Deeps with its very much bigger family.' },
];

export const RARE_FISH_MAP: Record<string, RareFish> = Object.fromEntries(RARE_FISH.map((f) => [f.id, f]));
export const rareFishIn = (r: Region) => RARE_FISH.filter((f) => f.region === r);
