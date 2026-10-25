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
  /** Mini bosses: the combat pet they can drop. */
  pet?: string;
  /** Colours for its portrait. */
  colors: { body: string; dark: string; accent: string };
  art: 'rat' | 'sprite' | 'bandit' | 'boar' | 'bear' | 'treant' | 'crab' | 'bird' | 'ghost';
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

export const MONSTER_MAP: Record<string, MonsterDef> = Object.fromEntries([...MONSTERS, WEEKLY_BOSS].map((m) => [m.id, m]));

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
  if (!m.weekly) return m.style;
  const week = Math.floor(weekStart(now) / WEEK_MS);
  return (['melee', 'ranged', 'magic'] as CombatStyle[])[((week % 3) + 3) % 3];
}
