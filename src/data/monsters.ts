// Monsters and their loot tables. Static data only.
import type { CombatStyle } from './items';

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
  /** Mini bosses: fought by hand only, respawn after this long. */
  miniboss?: { respawnMs: number };
  /** Colours for its portrait. */
  colors: { body: string; dark: string; accent: string };
  art: 'rat' | 'sprite' | 'bandit' | 'boar' | 'bear';
  blurb: string;
}

export const MONSTERS: MonsterDef[] = [
  {
    id: 'field_rat', name: 'Field Rat', region: 'Pocketvale', level: 1, style: 'melee',
    hp: 8, attack: 1, defense: 1, maxHit: 1, speedMs: 2800, lootTable: 'mon_field_rat',
    colors: { body: '#a39382', dark: '#5c4f43', accent: '#f9a8d4' }, art: 'rat',
    blurb: 'Nibbles on crops at the edge of town. Bites, but only a little.',
  },
  {
    id: 'hedge_sprite', name: 'Hedge Sprite', region: 'Pocketvale', level: 8, style: 'magic',
    hp: 18, attack: 8, defense: 5, maxHit: 3, speedMs: 3000, lootTable: 'mon_hedge_sprite',
    colors: { body: '#86efac', dark: '#166534', accent: '#fde68a' }, art: 'sprite',
    blurb: 'A mischievous little spark of magic living in the hedgerows.',
  },
  {
    id: 'bandit_archer', name: 'Bandit Archer', region: 'Pocketvale', level: 18, style: 'ranged',
    hp: 30, attack: 18, defense: 12, maxHit: 4, speedMs: 2800, lootTable: 'mon_bandit_archer',
    colors: { body: '#7c5a3a', dark: '#3f2a18', accent: '#ef4444' }, art: 'bandit',
    blurb: 'Lurks by the old road, plinking arrows at travellers.',
  },
  {
    id: 'mossback_boar', name: 'Mossback Boar', region: 'Pocketvale', level: 30, style: 'melee',
    hp: 50, attack: 30, defense: 24, maxHit: 6, speedMs: 3000, lootTable: 'mon_mossback_boar',
    colors: { body: '#6b5a44', dark: '#3a2f22', accent: '#65a30d' }, art: 'boar',
    blurb: 'A grumpy boar with a back so mossy, flowers grow on it.',
  },
  {
    id: 'old_thornhide', name: 'Old Thornhide', region: 'Pocketvale', level: 45, style: 'melee',
    hp: 180, attack: 45, defense: 36, maxHit: 10, speedMs: 3200, lootTable: 'boss_old_thornhide',
    miniboss: { respawnMs: 5 * 60 * 1000 },
    colors: { body: '#5b4636', dark: '#2a1f17', accent: '#a3e635' }, art: 'bear',
    blurb: 'Mini boss. A great bramble-covered bear who guards the old forest. Drops gems.',
  },
];

export const MONSTER_MAP: Record<string, MonsterDef> = Object.fromEntries(MONSTERS.map((m) => [m.id, m]));
