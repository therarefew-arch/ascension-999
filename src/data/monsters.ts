// Monsters and their loot tables. Static data only.
import type { CombatStyle } from './items';
import { REGIONS, TIER_LEVELS, type Region } from './tiers';

export interface MonsterDef {
  id: string;
  name: string;
  region: string;
  level: number;
  style: CombatStyle;
  hp: number;
  /** Accuracy rating. */
  attack: number;
  /** Makes your hits miss more often. */
  defense: number;
  maxHit: number;
  /** Milliseconds between its attacks. */
  speedMs: number;
  lootTable: string;
  /** Mini bosses (and the weekly boss): fought by hand only, respawn after this long. */
  miniboss?: { respawnMs: number };
  /** Weekly boss: returns every Monday, and its combat style changes each week. */
  weekly?: boolean;
  /** 🌌 Ascension bosses (the Road Up): 1–4. Beaten once a day, need a combat skill at 750. */
  ascension?: number;
  /** Its combat style changes every day (Melee → Ranged → Magic). */
  daily?: boolean;
  /** 🧭 An expedition boss (only met at the end of an expedition). */
  expedition?: boolean;
  /** Mini bosses: the combat pet they can drop. */
  pet?: string;
  /** Colours for its portrait. */
  colors: { body: string; dark: string; accent: string };
  art: 'rat' | 'sprite' | 'bandit' | 'boar' | 'bear' | 'treant' | 'crab' | 'bird' | 'ghost' | 'goat' | 'lizard' | 'tortoise' | 'wyrm';
  blurb: string;
}

export const MONSTERS: MonsterDef[] = [
  {
    id: 'field_rat', name: 'Field Rat', region: 'Pocketvale', level: 1, style: 'melee',
    hp: 8, attack: 1, defense: 1, maxHit: 1, speedMs: 1900, lootTable: 'mon_field_rat',
    colors: { body: '#a39382', dark: '#5c4f43', accent: '#f9a8d4' }, art: 'rat',
    blurb: 'Nibbles on crops at the edge of town. Bites, but only a little.',
  },
  {
    id: 'hedge_sprite', name: 'Hedge Sprite', region: 'Pocketvale', level: 8, style: 'magic',
    hp: 18, attack: 8, defense: 5, maxHit: 3, speedMs: 2000, lootTable: 'mon_hedge_sprite',
    colors: { body: '#86efac', dark: '#166534', accent: '#fde68a' }, art: 'sprite',
    blurb: 'A mischievous little spark of magic living in the hedgerows.',
  },
  {
    id: 'bandit_archer', name: 'Bandit Archer', region: 'Pocketvale', level: 18, style: 'ranged',
    hp: 30, attack: 18, defense: 12, maxHit: 4, speedMs: 1900, lootTable: 'mon_bandit_archer',
    colors: { body: '#7c5a3a', dark: '#3f2a18', accent: '#ef4444' }, art: 'bandit',
    blurb: 'Lurks by the old road, plinking arrows at travellers.',
  },
  {
    id: 'mossback_boar', name: 'Mossback Boar', region: 'Pocketvale', level: 30, style: 'melee',
    hp: 50, attack: 30, defense: 24, maxHit: 6, speedMs: 2000, lootTable: 'mon_mossback_boar',
    colors: { body: '#6b5a44', dark: '#3a2f22', accent: '#65a30d' }, art: 'boar',
    blurb: 'A grumpy boar with a back so mossy, flowers grow on it.',
  },
  {
    id: 'old_thornhide', name: 'Old Thornhide', region: 'Pocketvale', level: 45, style: 'melee',
    hp: 180, attack: 45, defense: 36, maxHit: 10, speedMs: 2200, lootTable: 'boss_old_thornhide',
    miniboss: { respawnMs: 5 * 60 * 1000 }, pet: 'pet_bramble',
    colors: { body: '#5b4636', dark: '#2a1f17', accent: '#a3e635' }, art: 'bear',
    blurb: 'Mini boss. A great bramble-covered bear who guards the old forest. Drops gems.',
  },
];

// ----- Ironmoor (tier 1, levels 90+) -----
MONSTERS.push(
  {
    id: 'ore_mole', name: 'Ore Mole', region: 'Ironmoor', level: 95, style: 'melee',
    hp: 150, attack: 95, defense: 80, maxHit: 12, speedMs: 1900, lootTable: 'mon_ore_mole',
    colors: { body: '#6b5b4e', dark: '#2f2620', accent: '#fca5a5' }, art: 'rat',
    blurb: 'Tunnels through the mines, nibbling on iron. Its teeth are very shiny.',
  },
  {
    id: 'rust_sprite', name: 'Rust Sprite', region: 'Ironmoor', level: 110, style: 'magic',
    hp: 180, attack: 110, defense: 90, maxHit: 15, speedMs: 2000, lootTable: 'mon_rust_sprite',
    colors: { body: '#c2410c', dark: '#7c2d12', accent: '#fde68a' }, art: 'sprite',
    blurb: 'A crackly little spirit born from old rusty pipes.',
  },
  {
    id: 'ironmoor_raider', name: 'Ironmoor Raider', region: 'Ironmoor', level: 125, style: 'ranged',
    hp: 220, attack: 125, defense: 105, maxHit: 18, speedMs: 1900, lootTable: 'mon_ironmoor_raider',
    colors: { body: '#4b5563', dark: '#1f2937', accent: '#f59e0b' }, art: 'bandit',
    blurb: 'Raids ore carts on the mountain road with a heavy crossbow.',
  },
  {
    id: 'ironhide_boar', name: 'Ironhide Boar', region: 'Ironmoor', level: 145, style: 'melee',
    hp: 280, attack: 145, defense: 125, maxHit: 22, speedMs: 2000, lootTable: 'mon_ironhide_boar',
    colors: { body: '#6b7280', dark: '#374151', accent: '#a8a29e' }, art: 'boar',
    blurb: 'Rolled in iron dust so often its bristles turned to metal.',
  },
  {
    id: 'forgefather_brask', name: 'Forgefather Brask', region: 'Ironmoor', level: 170, style: 'melee',
    hp: 900, attack: 170, defense: 150, maxHit: 32, speedMs: 2200, lootTable: 'boss_forgefather_brask',
    miniboss: { respawnMs: 5 * 60 * 1000 },
    colors: { body: '#57534e', dark: '#1c1917', accent: '#f97316' }, art: 'bear',
    blurb: 'Mini boss. A huge old forge-bear who guards the deepest mine. Drops gems.',
  },
);

// ----- Coalhaven (tier 2, levels 180+) — a sooty harbour town -----
MONSTERS.push(
  {
    id: 'soot_crab', name: 'Soot Crab', region: 'Coalhaven', level: 185, style: 'melee',
    hp: 340, attack: 185, defense: 160, maxHit: 26, speedMs: 2000, lootTable: 'mon_soot_crab',
    colors: { body: '#57534e', dark: '#1c1917', accent: '#fb923c' }, art: 'crab',
    blurb: 'Scuttles over the coal heaps on the quay. Its shell is always a bit dusty.',
  },
  {
    id: 'smog_wisp', name: 'Smog Wisp', region: 'Coalhaven', level: 200, style: 'magic',
    hp: 320, attack: 195, defense: 160, maxHit: 27, speedMs: 2000, lootTable: 'mon_smog_wisp',
    colors: { body: '#71717a', dark: '#27272a', accent: '#a5f3fc' }, art: 'sprite',
    blurb: 'A curl of chimney smoke that came alive and learned a few spells.',
  },
  {
    id: 'dockside_smuggler', name: 'Dockside Smuggler', region: 'Coalhaven', level: 220, style: 'ranged',
    hp: 440, attack: 220, defense: 190, maxHit: 34, speedMs: 1900, lootTable: 'mon_dockside_smuggler',
    colors: { body: '#1e3a5f', dark: '#0f172a', accent: '#facc15' }, art: 'bandit',
    blurb: 'Sneaks crates off the coal barges at night, crossbow at the ready.',
  },
  {
    id: 'cinderhide_boar', name: 'Cinderhide Boar', region: 'Coalhaven', level: 245, style: 'melee',
    hp: 450, attack: 240, defense: 205, maxHit: 36, speedMs: 2000, lootTable: 'mon_cinderhide_boar',
    colors: { body: '#3f3f46', dark: '#18181b', accent: '#f97316' }, art: 'boar',
    blurb: 'Roots for warm coal under the willows. Its bristles glow faintly.',
  },
  {
    id: 'mother_clawsoot', name: 'Mother Clawsoot', region: 'Coalhaven', level: 265, style: 'ranged',
    hp: 1600, attack: 265, defense: 235, maxHit: 50, speedMs: 2200, lootTable: 'boss_mother_clawsoot',
    miniboss: { respawnMs: 5 * 60 * 1000 }, pet: 'pet_pinch',
    colors: { body: '#7c2d12', dark: '#1c1917', accent: '#fbbf24' }, art: 'crab',
    blurb: 'Mini boss. A giant harbour crab who spits lumps of hot coal. Drops gems.',
  },
);

// ----- Bluecliff (tier 3, levels 270+) — windswept sea cliffs and a lighthouse -----
MONSTERS.push(
  {
    id: 'gull_thief', name: 'Gull Thief', region: 'Bluecliff', level: 275, style: 'ranged',
    hp: 580, attack: 275, defense: 240, maxHit: 42, speedMs: 1900, lootTable: 'mon_gull_thief',
    colors: { body: '#f1f5f9', dark: '#334155', accent: '#f59e0b' }, art: 'bird',
    blurb: 'Steals lobsters from the pots and throws pebbles at anyone who complains.',
  },
  {
    id: 'spray_sprite', name: 'Spray Sprite', region: 'Bluecliff', level: 290, style: 'magic',
    hp: 520, attack: 285, defense: 240, maxHit: 41, speedMs: 2000, lootTable: 'mon_spray_sprite',
    colors: { body: '#7dd3fc', dark: '#0c4a6e', accent: '#e0f2fe' }, art: 'sprite',
    blurb: 'Born from sea spray hitting the cliffs. Giggles like a wave on pebbles.',
  },
  {
    id: 'cliff_wrecker', name: 'Cliff Wrecker', region: 'Bluecliff', level: 310, style: 'ranged',
    hp: 580, attack: 305, defense: 260, maxHit: 46, speedMs: 1900, lootTable: 'mon_cliff_wrecker',
    colors: { body: '#1e293b', dark: '#020617', accent: '#fbbf24' }, art: 'bandit',
    blurb: 'Swings a false lantern on stormy nights to lure ships onto the rocks.',
  },
  {
    id: 'cobalt_crab', name: 'Cobalt Crab', region: 'Bluecliff', level: 335, style: 'melee',
    hp: 600, attack: 325, defense: 280, maxHit: 48, speedMs: 2000, lootTable: 'mon_cobalt_crab',
    colors: { body: '#1d4ed8', dark: '#172554', accent: '#93c5fd' }, art: 'crab',
    blurb: 'Its shell is studded with cobalt from the cliffs. Clacks very proudly.',
  },
  {
    id: 'old_galewing', name: 'Old Galewing', region: 'Bluecliff', level: 355, style: 'magic',
    hp: 2300, attack: 355, defense: 315, maxHit: 66, speedMs: 2200, lootTable: 'boss_old_galewing',
    miniboss: { respawnMs: 5 * 60 * 1000 }, pet: 'pet_peep',
    colors: { body: '#e2e8f0', dark: '#1e293b', accent: '#38bdf8' }, art: 'bird',
    blurb: 'Mini boss. A huge, grumpy old gull who rides the storm winds. Drops gems.',
  },
);

// ----- Lunaria (tier 4) — the ghost town on the misty island -----
// The ghosts are the townsfolk (gentle, not monsters). These are the things that moved in after the lights went out.
MONSTERS.push(
  {
    id: 'mist_crab', name: 'Mist Crab', region: 'Lunaria', level: 365, style: 'melee',
    hp: 640, attack: 355, defense: 310, maxHit: 52, speedMs: 2000, lootTable: 'mon_mist_crab',
    colors: { body: '#cbd5e1', dark: '#475569', accent: '#e0e7ff' }, art: 'crab',
    blurb: 'Half there, half fog. Scuttles through the empty streets looking for warm lanterns.',
  },
  {
    id: 'moonmoth', name: 'Moonmoth', region: 'Lunaria', level: 380, style: 'magic',
    hp: 600, attack: 370, defense: 315, maxHit: 52, speedMs: 2000, lootTable: 'mon_moonmoth',
    colors: { body: '#e0e7ff', dark: '#3730a3', accent: '#fef9c3' }, art: 'sprite',
    blurb: 'Drawn to the dark lanterns, fluttering silver dust that stings like frost.',
  },
  {
    id: 'fog_scavenger', name: 'Fog Scavenger', region: 'Lunaria', level: 400, style: 'ranged',
    hp: 720, attack: 395, defense: 340, maxHit: 58, speedMs: 1900, lootTable: 'mon_fog_scavenger',
    colors: { body: '#334155', dark: '#0f172a', accent: '#cbd5e1' }, art: 'bandit',
    blurb: 'Rowed over to loot the empty houses. The ghosts keep hiding the silverware.',
  },
  {
    id: 'hollow_hound', name: 'Hollow Hound', region: 'Lunaria', level: 425, style: 'melee',
    hp: 760, attack: 420, defense: 365, maxHit: 62, speedMs: 2000, lootTable: 'mon_hollow_hound',
    colors: { body: '#64748b', dark: '#1e293b', accent: '#a5b4fc' }, art: 'boar',
    blurb: 'A shadowy beast that prowls the shore where the lanterns used to shine.',
  },
  {
    id: 'the_hush', name: 'The Hush', region: 'Lunaria', level: 445, style: 'magic',
    hp: 2900, attack: 445, defense: 395, maxHit: 82, speedMs: 2200, lootTable: 'boss_the_hush',
    miniboss: { respawnMs: 5 * 60 * 1000 }, pet: 'pet_mote',
    colors: { body: '#1e1b4b', dark: '#020617', accent: '#c7d2fe' }, art: 'ghost',
    blurb: 'Mini boss. The silence that swallowed every light in Lunaria. Drops gems.',
  },
);

// ----- Cinderpeak (tier 5) — the volcano village. Nothing here is truly mean, just very warm. -----
MONSTERS.push(
  {
    id: 'ash_goat', name: 'Ash Goat', region: 'Cinderpeak', level: 455, style: 'melee',
    hp: 780, attack: 445, defense: 390, maxHit: 64, speedMs: 2000, lootTable: 'mon_ash_goat',
    colors: { body: '#78716c', dark: '#292524', accent: '#fb923c' }, art: 'goat',
    blurb: 'Its horns glow like coals. Headbutts anyone standing on its favourite warm rock.',
  },
  {
    id: 'fire_salamander', name: 'Fire Salamander', region: 'Cinderpeak', level: 470, style: 'magic',
    hp: 740, attack: 460, defense: 395, maxHit: 64, speedMs: 2000, lootTable: 'mon_fire_salamander',
    colors: { body: '#ea580c', dark: '#7c2d12', accent: '#fde047' }, art: 'lizard',
    blurb: 'Basks in the lava pools and spits little fireballs when you block its sun.',
  },
  {
    id: 'sooty_imp', name: 'Sooty Imp', region: 'Cinderpeak', level: 490, style: 'ranged',
    hp: 860, attack: 485, defense: 420, maxHit: 70, speedMs: 1900, lootTable: 'mon_sooty_imp',
    colors: { body: '#44403c', dark: '#1c1917', accent: '#f97316' }, art: 'sprite',
    blurb: 'Lives in the chimneys of the Ash Market and lobs hot coals for fun.',
  },
  {
    id: 'magma_tortoise', name: 'Magma Tortoise', region: 'Cinderpeak', level: 515, style: 'melee',
    hp: 1000, attack: 505, defense: 470, maxHit: 74, speedMs: 2200, lootTable: 'mon_magma_tortoise',
    colors: { body: '#3f3f46', dark: '#18181b', accent: '#f97316' }, art: 'tortoise',
    blurb: 'Takes a hundred years to cross the lava field. Very hard to hurry, very hard to dent.',
  },
  {
    id: 'kiln_wyrm', name: 'The Kiln Wyrm', region: 'Cinderpeak', level: 535, style: 'melee',
    hp: 3500, attack: 535, defense: 480, maxHit: 98, speedMs: 2200, lootTable: 'boss_kiln_wyrm',
    miniboss: { respawnMs: 5 * 60 * 1000 }, pet: 'pet_kindle',
    colors: { body: '#b91c1c', dark: '#450a0a', accent: '#fbbf24' }, art: 'wyrm',
    blurb: 'Mini boss. A sleepy lava dragon curled inside the old kiln. Grumpy when woken. Drops gems.',
  },
);

// ----- Frosthold (tier 6) — the singing snow village. Cold, but nobody here is unkind. -----
MONSTERS.push(
  {
    id: 'snow_hare', name: "Snowdrift Hare", region: 'Frosthold', level: 545, style: 'melee',
    hp: 880, attack: 535, defense: 470, maxHit: 72, speedMs: 2000, lootTable: 'mon_snow_hare',
    colors: { body: '#f1f5f9', dark: '#94a3b8', accent: '#7dd3fc' }, art: 'rat',
    blurb: "Big as a dog, white as the snow, and it kicks like a mule when you step on its burrow.",
  },
  {
    id: 'frost_wisp', name: "Frost Wisp", region: 'Frosthold', level: 560, style: 'magic',
    hp: 840, attack: 550, defense: 475, maxHit: 72, speedMs: 2000, lootTable: 'mon_frost_wisp',
    colors: { body: '#bae6fd', dark: '#0e7490', accent: '#f0f9ff' }, art: 'sprite',
    blurb: "A little puff of winter that hums along when the village sings — and freezes you when it stops.",
  },
  {
    id: 'snowball_bandit', name: "Snowball Bandit", region: 'Frosthold', level: 580, style: 'ranged',
    hp: 960, attack: 575, defense: 500, maxHit: 78, speedMs: 1900, lootTable: 'mon_snowball_bandit',
    colors: { body: '#1e3a8a', dark: '#172554', accent: '#e0f2fe' }, art: 'bandit',
    blurb: "Hides behind snowdrifts and pelts travellers with snowballs. Some of them have rocks in.",
  },
  {
    id: 'woolly_ram', name: "Woolly Ram", region: 'Frosthold', level: 605, style: 'melee',
    hp: 1120, attack: 595, defense: 550, maxHit: 82, speedMs: 2200, lootTable: 'mon_woolly_ram',
    colors: { body: '#e7e5e4', dark: '#57534e', accent: '#a5f3fc' }, art: 'goat',
    blurb: "So much wool that your arrows just get lost in it. Charges anything that sings off-key.",
  },
  {
    id: 'old_rimeback', name: "Old Rimeback", region: 'Frosthold', level: 625, style: 'melee',
    hp: 4100, attack: 625, defense: 560, maxHit: 108, speedMs: 2200, lootTable: 'boss_old_rimeback',
    miniboss: { respawnMs: 5 * 60 * 1000 }, pet: 'pet_snowdrop',
    colors: { body: '#f8fafc', dark: '#64748b', accent: '#38bdf8' }, art: 'bear',
    blurb: "Mini boss. A great white bear with icicles in its fur, sleeping off the winter in the glacier caves. Drops gems.",
  },
);

// ----- Voidreach (tier 7) — the rope-bridge town at the edge of the starry chasm. Strange, but gentle. -----
MONSTERS.push(
  {
    id: 'gloom_mole', name: "Gloomburrow Mole", region: 'Voidreach', level: 635, style: 'melee',
    hp: 990, attack: 625, defense: 550, maxHit: 80, speedMs: 2000, lootTable: 'mon_gloom_mole',
    colors: { body: '#3b0764', dark: '#1e1b4b', accent: '#c4b5fd' }, art: 'rat',
    blurb: "Digs tunnels that come out somewhere slightly different every time. Grumpy about it.",
  },
  {
    id: 'echo_wisp', name: "Echo Wisp", region: 'Voidreach', level: 650, style: 'magic',
    hp: 950, attack: 640, defense: 555, maxHit: 80, speedMs: 2000, lootTable: 'mon_echo_wisp',
    colors: { body: '#a78bfa', dark: '#4c1d95', accent: '#f5f3ff' }, art: 'sprite',
    blurb: "Repeats the last thing you said — a day late, and much louder.",
  },
  {
    id: 'ribbon_bandit', name: "Ribbon Cutter", region: 'Voidreach', level: 670, style: 'ranged',
    hp: 1070, attack: 665, defense: 580, maxHit: 86, speedMs: 1900, lootTable: 'mon_ribbon_bandit',
    colors: { body: '#581c87', dark: '#2e1065', accent: '#f0abfc' }, art: 'bandit',
    blurb: "Snips the safety ribbons folk tie to the posts, then fires at whoever wobbles.",
  },
  {
    id: 'chasm_crawler', name: "Chasm Crawler", region: 'Voidreach', level: 695, style: 'melee',
    hp: 1240, attack: 685, defense: 630, maxHit: 90, speedMs: 2200, lootTable: 'mon_chasm_crawler',
    colors: { body: '#312e81', dark: '#0f0a2e', accent: '#818cf8' }, art: 'crab',
    blurb: "Climbs up out of the stars at night. Its shell is full of tiny lights.",
  },
  {
    id: 'hollow_wyrm', name: "The Hollow Wyrm", region: 'Voidreach', level: 715, style: 'magic',
    hp: 4700, attack: 715, defense: 640, maxHit: 118, speedMs: 2200, lootTable: 'boss_hollow_wyrm',
    miniboss: { respawnMs: 5 * 60 * 1000 }, pet: 'pet_nib',
    colors: { body: '#1e1b4b', dark: '#020617', accent: '#e9d5ff' }, art: 'wyrm',
    blurb: "Mini boss. A long, starry serpent that coils under the bridges. You can see the night sky through it. Drops gems.",
  },
);

// ----- Starfall Crater (tier 8) — the farming village where a star came down. It hums. -----
MONSTERS.push(
  {
    id: 'crater_boar', name: "Crater Boar", region: 'Starfall Crater', level: 725, style: 'melee',
    hp: 1100, attack: 715, defense: 630, maxHit: 88, speedMs: 2000, lootTable: 'mon_crater_boar',
    colors: { body: '#a16207', dark: '#422006', accent: '#fde047' }, art: 'boar',
    blurb: "Has been rooting for starmetal in the fields so long its tusks have gone golden.",
  },
  {
    id: 'star_sprite', name: "Stardust Sprite", region: 'Starfall Crater', level: 740, style: 'magic',
    hp: 1060, attack: 730, defense: 635, maxHit: 88, speedMs: 2000, lootTable: 'mon_star_sprite',
    colors: { body: '#fef08a', dark: '#a16207', accent: '#ffffff' }, art: 'sprite',
    blurb: "A crumb that broke off the fallen star. Very excited about everything. Fizzes when cross.",
  },
  {
    id: 'comet_hawk', name: "Comet Hawk", region: 'Starfall Crater', level: 760, style: 'ranged',
    hp: 1180, attack: 755, defense: 660, maxHit: 94, speedMs: 1900, lootTable: 'mon_comet_hawk',
    colors: { body: '#c2410c', dark: '#431407', accent: '#fde68a' }, art: 'bird',
    blurb: "Dives out of the sky trailing sparks. Steals starfruit from the orchards.",
  },
  {
    id: 'stardust_treant', name: "Starbloom Treant", region: 'Starfall Crater', level: 785, style: 'melee',
    hp: 1360, attack: 775, defense: 710, maxHit: 98, speedMs: 2200, lootTable: 'mon_stardust_treant',
    colors: { body: '#65a30d', dark: '#1a2e05', accent: '#fde047' }, art: 'treant',
    blurb: "An orchard tree that drank too much starlight and wandered off. Its blossoms glow.",
  },
  {
    id: 'stargrown_elder', name: "The Stargrown Elder", region: 'Starfall Crater', level: 805, style: 'magic',
    hp: 5300, attack: 805, defense: 720, maxHit: 128, speedMs: 2200, lootTable: 'boss_stargrown_elder',
    miniboss: { respawnMs: 5 * 60 * 1000 }, pet: 'pet_nova',
    colors: { body: '#4d7c0f', dark: '#14280a', accent: '#fef08a' }, art: 'treant',
    blurb: "Mini boss. A great tree that grew up around the fallen star to keep it safe. Hums the same note. Drops gems.",
  },
);

// ----- Celestine Spires (tier 9) — towers above the clouds. Breezy, bright and a little proud. -----
MONSTERS.push(
  {
    id: 'cloud_ram', name: "Cloud Ram", region: 'Celestine Spires', level: 815, style: 'melee',
    hp: 1210, attack: 805, defense: 710, maxHit: 96, speedMs: 2000, lootTable: 'mon_cloud_ram',
    colors: { body: '#f8fafc', dark: '#94a3b8', accent: '#bae6fd' }, art: 'goat',
    blurb: "Leaps from spire to spire on wool so light it floats. Lands on people. On purpose.",
  },
  {
    id: 'chime_sprite', name: "Chime Sprite", region: 'Celestine Spires', level: 830, style: 'magic',
    hp: 1170, attack: 820, defense: 715, maxHit: 96, speedMs: 2000, lootTable: 'mon_chime_sprite',
    colors: { body: '#99f6e4', dark: '#0f766e', accent: '#ffffff' }, art: 'sprite',
    blurb: "Lives inside the wind chimes. Rings a wrong note at you, very loudly.",
  },
  {
    id: 'sky_pirate', name: "Sky Pirate", region: 'Celestine Spires', level: 850, style: 'ranged',
    hp: 1290, attack: 845, defense: 740, maxHit: 102, speedMs: 1900, lootTable: 'mon_sky_pirate',
    colors: { body: '#0f766e', dark: '#042f2e', accent: '#fcd34d' }, art: 'bandit',
    blurb: "Sails a little cloud-skiff between the towers, firing a crossbow and stealing hats.",
  },
  {
    id: 'storm_gryphon', name: "Storm Gryphon", region: 'Celestine Spires', level: 875, style: 'melee',
    hp: 1480, attack: 865, defense: 790, maxHit: 106, speedMs: 2200, lootTable: 'mon_storm_gryphon',
    colors: { body: '#ca8a04', dark: '#422006', accent: '#e0f2fe' }, art: 'bird',
    blurb: "Nests on the tallest spire and guards it from everyone, including the people who live there.",
  },
  {
    id: 'aurelion', name: "Aurelion, the Sky Sovereign", region: 'Celestine Spires', level: 895, style: 'magic',
    hp: 5900, attack: 895, defense: 800, maxHit: 138, speedMs: 2200, lootTable: 'boss_aurelion',
    miniboss: { respawnMs: 5 * 60 * 1000 }, pet: 'pet_cirrus',
    colors: { body: '#fbbf24', dark: '#78350f', accent: '#f0fdfa' }, art: 'bird',
    blurb: "Mini boss. A golden eagle as big as a house, who thinks the Spires were built for her. Drops gems.",
  },
);

// ----- The Primordial Rift (tier 10) — where the world began. Ancient, wild and wonderful. -----
MONSTERS.push(
  {
    id: 'fern_raptor', name: "Fern Raptor", region: 'Primordial Rift', level: 905, style: 'melee',
    hp: 1320, attack: 895, defense: 790, maxHit: 104, speedMs: 2000, lootTable: 'mon_fern_raptor',
    colors: { body: '#15803d', dark: '#052e16', accent: '#fbbf24' }, art: 'lizard',
    blurb: "Quick, clever and curious. Hunts in the giant ferns and is very interested in your snacks.",
  },
  {
    id: 'first_light', name: "First Light", region: 'Primordial Rift', level: 920, style: 'magic',
    hp: 1280, attack: 910, defense: 795, maxHit: 104, speedMs: 2000, lootTable: 'mon_first_light',
    colors: { body: '#d9f99d', dark: '#3f6212', accent: '#ffffff' }, art: 'sprite',
    blurb: "One of the very first lights in the world. Older than the stars, and a bit cross about being woken.",
  },
  {
    id: 'thornback', name: "Thornback", region: 'Primordial Rift', level: 940, style: 'ranged',
    hp: 1400, attack: 935, defense: 820, maxHit: 110, speedMs: 1900, lootTable: 'mon_thornback',
    colors: { body: '#4d7c0f', dark: '#1a2e05', accent: '#f87171' }, art: 'tortoise',
    blurb: "An ancient tortoise that flicks thorns off its shell. It has been here since before the Rift opened.",
  },
  {
    id: 'moss_colossus', name: "Moss Colossus", region: 'Primordial Rift', level: 965, style: 'melee',
    hp: 1600, attack: 955, defense: 870, maxHit: 114, speedMs: 2200, lootTable: 'mon_moss_colossus',
    colors: { body: '#166534', dark: '#052e16', accent: '#a3e635' }, art: 'treant',
    blurb: "A walking hill. Birds nest in it. It does not notice you until you hit it.",
  },
  {
    id: 'first_wyrm', name: "The First Wyrm", region: 'Primordial Rift', level: 985, style: 'melee',
    hp: 6500, attack: 985, defense: 880, maxHit: 148, speedMs: 2200, lootTable: 'boss_first_wyrm',
    miniboss: { respawnMs: 5 * 60 * 1000 }, pet: 'pet_pip',
    colors: { body: '#064e3b', dark: '#022c22', accent: '#fde047' }, art: 'wyrm',
    blurb: "Mini boss. The oldest creature in the world, curled around the roots of the Worldtree. Drops gems.",
  },
);

// Monsters above are written for the first town spacing (a town every 90 levels).
// Towns now open at TIER_LEVELS (1, 50, 110, 175 …), so each monster is moved to the same spot
// inside its town's new level band, and its stats scale with its level — same feel, earlier.
for (const m of MONSTERS) {
  const t = REGIONS.indexOf(m.region as Region);
  if (t <= 0) continue;
  const oldLo = t * 90;
  const newLo = TIER_LEVELS[t];
  const newHi = TIER_LEVELS[t + 1] ?? newLo + 90;
  const level = Math.round(newLo + (m.level - oldLo) * ((newHi - newLo) / 90));
  const s = level / m.level;
  m.level = level;
  m.hp = Math.round(m.hp * s);
  m.attack = Math.round(m.attack * s);
  m.defense = Math.round(m.defense * s);
  m.maxHit = Math.round(m.maxHit * s);
}

/** The weekly boss sits apart from the regular list on the Combat screen. */
export const WEEKLY_BOSS: MonsterDef = {
  id: 'grumbleroot', name: 'Grumbleroot, the Moss King', region: 'Pocketvale', level: 80, style: 'melee',
  hp: 1200, attack: 75, defense: 60, maxHit: 16, speedMs: 2400, lootTable: 'boss_grumbleroot',
  miniboss: { respawnMs: 0 }, weekly: true,
  colors: { body: '#4d5e37', dark: '#22301a', accent: '#a3e635' }, art: 'treant',
  blurb: 'Weekly boss. An ancient walking tree who wakes once a week. Its fighting style changes every week.',
};

// ----- 🌌 The Ascension bosses: the Road Up, above the Primordial Rift. -----
// Fought by hand, once a day each (they return at midnight). Stats come from one formula so
// a player at the boss's level wins in about 2–5 minutes (bot-tested in v0.0.1.48):
// hp 10×Lv (+500 per step up), attack Lv+197, defense Lv+76, max hit 0.27×Lv.
const ascBoss = (n: number, level: number, m: Omit<MonsterDef, 'level' | 'hp' | 'attack' | 'defense' | 'maxHit' | 'region' | 'miniboss' | 'ascension'>): MonsterDef => ({
  ...m, level, region: 'Primordial Rift', ascension: n, miniboss: { respawnMs: 0 },
  hp: 10 * level + 500 * (n - 1), attack: level + 197, defense: level + 76, maxHit: Math.round(0.27 * level),
});
export const ASCENSION_BOSSES: MonsterDef[] = [
  ascBoss(1, 780, {
    id: 'skyward_warden', name: 'The Skyward Warden', style: 'melee', speedMs: 2300, lootTable: 'boss_skyward_warden',
    colors: { body: '#a8a29e', dark: '#44403c', accent: '#fde68a' }, art: 'treant',
    blurb: 'A stone giant at the foot of the Road Up. It has stood guard so long that clouds snag on its shoulders.',
  }),
  ascBoss(2, 850, {
    id: 'cometail', name: 'Cometail', style: 'ranged', speedMs: 2200, lootTable: 'boss_cometail',
    colors: { body: '#7dd3fc', dark: '#0c4a6e', accent: '#fef08a' }, art: 'bird',
    blurb: 'A great bird with a comet for a tail. It flings sparks from the sky and laughs like wind chimes.',
  }),
  ascBoss(3, 920, {
    id: 'lantern_leviathan', name: 'The Lantern Leviathan', style: 'magic', speedMs: 2400, lootTable: 'boss_lantern_leviathan',
    colors: { body: '#312e81', dark: '#1e1b4b', accent: '#fbbf24' }, art: 'wyrm',
    blurb: 'It swims through the night sky with a thousand little lanterns glowing along its back.',
  }),
  ascBoss(4, 990, {
    id: 'unlit_star', name: 'The Unlit Star', style: 'magic', daily: true, speedMs: 2300, lootTable: 'boss_unlit_star', pet: 'pet_wishling',
    colors: { body: '#1f2937', dark: '#030712', accent: '#e0f2fe' }, art: 'ghost',
    blurb: 'A star that forgot how to shine, at the very top of the Road Up. Beat it and, for a moment, it remembers. Its fighting style changes every day.',
  }),
];

// ----- 🧭 Expedition bosses (v0.0.1.60): one at the end of each town's expedition road. -----
// Not in MONSTERS (they're never fought on the Combat screen). Their stats start from the town's mini boss
// (expeditions scale health and hits per town anyway — see core/expedition.ts `fairPower`).
const expBoss = (region: Region, m: Pick<MonsterDef, 'id' | 'name' | 'style' | 'pet' | 'colors' | 'art' | 'blurb'>): MonsterDef => {
  const mini = MONSTERS.find((x) => x.region === region && x.miniboss && !x.weekly)!;
  return {
    ...mini, ...m, region, level: mini.level + 10, lootTable: `exp_${m.id}`, expedition: true, miniboss: undefined,
    hp: Math.round(mini.hp * 1.3), attack: mini.attack + 10, defense: mini.defense + 10, maxHit: Math.round(mini.maxHit * 1.15),
  };
};
export const EXPEDITION_BOSSES: MonsterDef[] = [
  expBoss('Pocketvale', { id: 'whispering_oak', name: 'The Whispering Oak', style: 'magic', pet: 'pet_bristle', art: 'treant',
    colors: { body: '#6b8f4e', dark: '#2f3f22', accent: '#fde68a' }, blurb: 'The oldest oak in the woods. When the wind blows through it, you can almost hear names.' }),
  expBoss('Ironmoor', { id: 'lamp_eater', name: 'The Lamp-Eater', style: 'melee', pet: 'pet_flicker', art: 'lizard',
    colors: { body: '#57534e', dark: '#1c1917', accent: '#fbbf24' }, blurb: 'A great pale cave salamander that swallows lamps whole. Its belly glows.' }),
  expBoss('Coalhaven', { id: 'bog_lantern', name: 'The Bog Lantern', style: 'magic', pet: 'pet_puddle', art: 'ghost',
    colors: { body: '#a3e635', dark: '#1a2e05', accent: '#ecfccb' }, blurb: 'A greenish light that bobs over the marsh and leads travellers in circles.' }),
  expBoss('Bluecliff', { id: 'captain_barnacle', name: 'Captain Barnacle', style: 'ranged', pet: 'pet_squawk', art: 'bandit',
    colors: { body: '#1e3a5f', dark: '#0b1a2e', accent: '#f59e0b' }, blurb: 'The last of the wreckers, still guarding a cove full of other people’s treasure.' }),
  expBoss('Lunaria', { id: 'lamplighter', name: 'The Lamplighter', style: 'magic', pet: 'pet_velvet', art: 'ghost',
    colors: { body: '#cbd5e1', dark: '#334155', accent: '#fde68a' }, blurb: 'A tall figure with a long pole, still walking his route through the fog — lighting lamps that will not stay lit.' }),
  expBoss('Cinderpeak', { id: 'ashhorn', name: 'The Ashhorn Ram', style: 'melee', pet: 'pet_cinder', art: 'goat',
    colors: { body: '#44403c', dark: '#1c1917', accent: '#f97316' }, blurb: 'A huge ram with horns like cooled lava. It butts the mountain to keep it awake.' }),
  expBoss('Frosthold', { id: 'pass_yeti', name: 'The Yeti of the Pass', style: 'melee', pet: 'pet_waddles', art: 'bear',
    colors: { body: '#f1f5f9', dark: '#94a3b8', accent: '#38bdf8' }, blurb: 'Shaggy, enormous and very grumpy about the noise. It only wants the pass to itself.' }),
  expBoss('Voidreach', { id: 'ribbon_heron', name: 'The Ribbon Heron', style: 'ranged', pet: 'pet_ripple', art: 'bird',
    colors: { body: '#c4b5fd', dark: '#2e1065', accent: '#f472b6' }, blurb: 'A heron as tall as a house, wading through the starlight at the bottom of the chasm.' }),
  expBoss('Starfall Crater', { id: 'starhorn', name: 'Starhorn', style: 'magic', pet: 'pet_comet', art: 'goat',
    colors: { body: '#fde68a', dark: '#78350f', accent: '#ffffff' }, blurb: 'A golden stag whose antlers hold little stars. Where it walks, star-flowers grow.' }),
  expBoss('Celestine Spires', { id: 'old_nimbus', name: 'Old Nimbus', style: 'melee', pet: 'pet_nimbus', art: 'tortoise',
    colors: { body: '#e0f2fe', dark: '#64748b', accent: '#facc15' }, blurb: 'A tortoise carrying a whole rain cloud on its shell. Slow, wise, and very loud.' }),
  expBoss('Primordial Rift', { id: 'old_tusk', name: 'Old Tusk, the First Beast', style: 'melee', pet: 'pet_truffle', art: 'boar',
    colors: { body: '#4d3b2a', dark: '#1f160e', accent: '#86efac' }, blurb: 'The first boar there ever was. Ferns grow on its back and its tusks are older than mountains.' }),
];
/** The signature big hit of each expedition boss. */
export const EXP_BOSS_MOVE: Record<string, string> = {
  whispering_oak: 'Hushing Roots', lamp_eater: 'Snuff the Lamps', bog_lantern: 'Will-o’-Wisp', captain_barnacle: 'Grapeshot', lamplighter: 'Snuffing Hush',
  ashhorn: 'Lava Charge', pass_yeti: 'Avalanche', ribbon_heron: 'Ribbon Lash', starhorn: 'Falling Star', old_nimbus: 'Thunderclap', old_tusk: 'Primal Charge',
};

export const MONSTER_MAP: Record<string, MonsterDef> = Object.fromEntries([...MONSTERS, WEEKLY_BOSS, ...ASCENSION_BOSSES, ...EXPEDITION_BOSSES].map((m) => [m.id, m]));

/** Midnight (local time) tonight: when the Ascension bosses come back. */
export function nextMidnight(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Monday 00:00 (local time) of the current week. */
export function weekStart(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return d.getTime() - day * 24 * 60 * 60 * 1000;
}
export function nextWeeklyReset(now = Date.now()): number {
  return weekStart(now) + WEEK_MS;
}

/** A monster's style right now (the weekly boss rotates Melee → Ranged → Magic each week). */
export function monsterStyle(m: MonsterDef, now = Date.now()): CombatStyle {
  if (m.daily) {
    const d = new Date(now);
    const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
    return (['melee', 'ranged', 'magic'] as CombatStyle[])[day % 3];
  }
  if (!m.weekly) return m.style;
  const week = Math.floor(weekStart(now) / WEEK_MS);
  return (['melee', 'ranged', 'magic'] as CombatStyle[])[((week % 3) + 3) % 3];
}
