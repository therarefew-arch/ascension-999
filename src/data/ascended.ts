// 🌟 The Ascension (levels 750 → 999): Ascended items with randomly rolled bonuses.
// Pure data + the item id format. No player state here.
//
// An Ascended item's id describes the whole item, so bag, bank, saves and backups
// need nothing new:  asc.<base>.<grade>.<town>.<bonus><value>-<bonus><value>…
// e.g. asc.pickaxe.d.10.sp12-dr7-xp5-rf44  (a Divine pickaxe found in the Primordial Rift)
import type { CombatStyle, EquipSlot, IconKind, SkillId } from './items';
import { REGIONS } from './tiers';

export const ASC_PREFIX = 'asc.';
export const isAscendedId = (id: string) => id.startsWith(ASC_PREFIX);

/** The level where the Ascension starts. */
export const ASCENSION_LEVEL = 750;

export interface AscBase {
  key: string;
  name: string;
  slot: EquipSlot;
  icon: IconKind;
  /** The skill you need at 750 to wear it (and whose work drops it). */
  skill: SkillId;
  kind: 'tool' | 'weapon' | 'armour';
  style?: CombatStyle;
}

export const ASC_BASES: AscBase[] = [
  { key: 'sword', name: 'blade', slot: 'weapon', icon: 'sword', skill: 'melee', kind: 'weapon', style: 'melee' },
  { key: 'bow', name: 'bow', slot: 'weapon', icon: 'bow', skill: 'ranged', kind: 'weapon', style: 'ranged' },
  { key: 'staff', name: 'staff', slot: 'weapon', icon: 'staff', skill: 'magic', kind: 'weapon', style: 'magic' },
  { key: 'helmet', name: 'helm', slot: 'head', icon: 'helmet', skill: 'defense', kind: 'armour' },
  { key: 'chestplate', name: 'chestplate', slot: 'body', icon: 'chest', skill: 'defense', kind: 'armour' },
  { key: 'platelegs', name: 'platelegs', slot: 'legs', icon: 'legs', skill: 'defense', kind: 'armour' },
  { key: 'shield', name: 'shield', slot: 'shield', icon: 'shield', skill: 'defense', kind: 'armour' },
  { key: 'pickaxe', name: 'pickaxe', slot: 'pickaxe', icon: 'pickaxe', skill: 'mining', kind: 'tool' },
  { key: 'axe', name: 'axe', slot: 'axe', icon: 'axe', skill: 'woodcutting', kind: 'tool' },
  { key: 'rod', name: 'fishing rod', slot: 'rod', icon: 'rod', skill: 'fishing', kind: 'tool' },
  { key: 'knife', name: 'knife', slot: 'knife', icon: 'knife', skill: 'crafting', kind: 'tool' },
  { key: 'hammer', name: 'hammer', slot: 'hammer', icon: 'hammer', skill: 'smithing', kind: 'tool' },
  { key: 'tinderbox', name: 'tinderbox', slot: 'tinderbox', icon: 'tinderbox', skill: 'firemaking', kind: 'tool' },
  { key: 'skillet', name: 'skillet', slot: 'skillet', icon: 'skillet', skill: 'cooking', kind: 'tool' },
  { key: 'sickle', name: 'sickle', slot: 'sickle', icon: 'sickle', skill: 'herblore', kind: 'tool' },
  { key: 'trowel', name: 'trowel', slot: 'trowel', icon: 'trowel', skill: 'farming', kind: 'tool' },
];
export const ASC_BASE_MAP: Record<string, AscBase> = Object.fromEntries(ASC_BASES.map((b) => [b.key, b]));

// ----- Bonuses -----
export type BonusKey = 'sp' | 'dr' | 'xp' | 'rf' | 'ax' | 'at' | 'df' | 'hp' | 'bd' | 'cn' | 'cx' | 'fh';
export interface BonusDef {
  key: BonusKey;
  min: number;
  max: number;
  /** What it says on the item, for a value and the item's skill. */
  text: (v: number, skill: string) => string;
}
export const BONUSES: Record<BonusKey, BonusDef> = {
  sp: { key: 'sp', min: 5, max: 15, text: (v, s) => `+${v}% ${s} speed` },
  dr: { key: 'dr', min: 3, max: 10, text: (v) => `${v}% chance of a double result` },
  xp: { key: 'xp', min: 3, max: 8, text: (v, s) => `+${v}% ${s} XP` },
  rf: { key: 'rf', min: 20, max: 60, text: (v) => `+${v}% rare finds` },
  ax: { key: 'ax', min: 1, max: 4, text: (v) => `+${v}% XP in every skill` },
  at: { key: 'at', min: 15, max: 45, text: (v) => `+${v} Attack` },
  df: { key: 'df', min: 10, max: 30, text: (v) => `+${v} Defense` },
  hp: { key: 'hp', min: 25, max: 100, text: (v) => `+${v} max HP` },
  bd: { key: 'bd', min: 5, max: 20, text: (v) => `+${v}% damage to mini bosses` },
  cn: { key: 'cn', min: 5, max: 25, text: (v) => `+${v}% coins from monsters` },
  cx: { key: 'cx', min: 3, max: 8, text: (v) => `+${v}% combat XP` },
  fh: { key: 'fh', min: 10, max: 30, text: (v) => `Food heals ${v}% more` },
};
/** Skills with rare finds (bird nests, geodes, bottles, rare fish). */
const FIND_SKILLS: SkillId[] = ['mining', 'woodcutting', 'fishing'];

/** Which bonuses can roll on a base. */
export function bonusPool(base: AscBase): BonusKey[] {
  if (base.kind === 'tool') return FIND_SKILLS.includes(base.skill) ? ['sp', 'dr', 'xp', 'rf', 'ax'] : ['sp', 'dr', 'xp', 'ax'];
  if (base.kind === 'weapon') return ['at', 'bd', 'cn', 'cx', 'ax'];
  return ['df', 'hp', 'fh', 'cn', 'cx', 'ax'];
}

// ----- Grades -----
export type GradeKey = 'f' | 'b' | 'd' | 'g';
export interface GradeDef {
  key: GradeKey;
  name: string;
  color: string;
  /** How many bonuses it rolls. */
  bonuses: number;
  /** Each bonus lands this far between its min (0) and max (1). */
  q: [number, number];
  /** Skill level needed for this grade to be able to drop. */
  level: number;
  /** Chance for a drop to be this grade (before the level cap). */
  odds: number;
  /** Base stats multiplier. */
  power: number;
}
export const GRADES: GradeDef[] = [
  { key: 'f', name: 'Fine', color: '#cbd5e1', bonuses: 2, q: [0, 0.55], level: 750, odds: 0, power: 1 },
  { key: 'b', name: 'Blessed', color: '#60a5fa', bonuses: 3, q: [0.3, 0.8], level: 750, odds: 0.25, power: 1.04 },
  { key: 'd', name: 'Divine', color: '#c084fc', bonuses: 4, q: [0.6, 0.95], level: 850, odds: 0.05, power: 1.08 },
  { key: 'g', name: 'Godforged', color: '#fbbf24', bonuses: 4, q: [0.92, 1], level: 950, odds: 1 / 250, power: 1.15 },
];
export const GRADE_MAP: Record<GradeKey, GradeDef> = Object.fromEntries(GRADES.map((g) => [g.key, g])) as Record<GradeKey, GradeDef>;

/** On average, one Ascended item per this much 750+ work in one idle slot. */
export const ASC_DROP_MS = 3 * 60 * 60 * 1000;

// ----- The id format -----
export interface AscParts {
  base: AscBase;
  grade: GradeDef;
  /** Index into REGIONS: the town it was found in. */
  town: number;
  bonuses: { key: BonusKey; value: number }[];
}

export function ascendedId(a: { base: string; grade: GradeKey; town: number; bonuses: { key: BonusKey; value: number }[] }): string {
  return `${ASC_PREFIX}${a.base}.${a.grade}.${a.town}.${a.bonuses.map((b) => `${b.key}${b.value}`).join('-')}`;
}

const ID_RE = /^asc\.([a-z]+)\.([fbdg])\.(\d+)\.((?:[a-z]{2}\d+)(?:-[a-z]{2}\d+)*)$/;
export function parseAscended(id: string): AscParts | null {
  const m = ID_RE.exec(id);
  if (!m) return null;
  const base = ASC_BASE_MAP[m[1]];
  const grade = GRADE_MAP[m[2] as GradeKey];
  const town = Number(m[3]);
  if (!base || !grade || town >= REGIONS.length) return null;
  const bonuses: AscParts['bonuses'] = [];
  for (const part of m[4].split('-')) {
    const key = part.slice(0, 2) as BonusKey;
    const def = BONUSES[key];
    const value = Number(part.slice(2));
    if (!def || !bonusPool(base).includes(key) || value < 1 || value > def.max) return null;
    bonuses.push({ key, value });
  }
  return { base, grade, town, bonuses };
}

/** Rolls a brand-new Ascended item. `level` = the skill level that found it (caps the grade). */
export function rollAscended(base: AscBase, level: number, town: number, rng: () => number = Math.random): string {
  let grade = GRADES[0];
  const r = rng();
  let acc = 0;
  for (const g of [...GRADES].reverse()) {
    if (g.odds === 0) continue;
    acc += g.odds;
    if (r < acc) { grade = g; break; }
  }
  // Your level sets the best grade that can drop: Divine from 850, Godforged from 950.
  while (grade.level > level) grade = GRADES[GRADES.indexOf(grade) - 1];
  const pool = [...bonusPool(base)];
  const bonuses: AscParts['bonuses'] = [];
  for (let i = 0; i < grade.bonuses && pool.length; i++) {
    const key = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const def = BONUSES[key];
    const q = grade.q[0] + rng() * (grade.q[1] - grade.q[0]);
    bonuses.push({ key, value: Math.max(1, Math.round(def.min + q * (def.max - def.min))) });
  }
  bonuses.sort((a, b) => bonusPool(base).indexOf(a.key) - bonusPool(base).indexOf(b.key));
  return ascendedId({ base: base.key, grade: grade.key, town, bonuses });
}

/** The best grade a skill level can find. */
export function bestGradeFor(level: number): GradeDef {
  return [...GRADES].reverse().find((g) => g.level <= level) ?? GRADES[0];
}

// ----- ✨ The Starforge (Starlight crafting) -----
/** Starlight earned per hour of 750+ work in one idle slot (on top of breaking items down). */
export const STARLIGHT_PER_HOUR = 10;
/** Starlight for breaking an item down, by grade. */
export const BREAK_VALUE: Record<GradeKey, number> = { f: 10, b: 30, d: 120, g: 500 };
/** Starlight to craft a fresh Ascended item for a slot of your choice (bonuses still random). */
export const CRAFT_COST = 400;
/** Starlight to reforge an item (rerolls every unlocked bonus). Each locked bonus doubles it. */
export const REFORGE_COST: Record<GradeKey, number> = { f: 40, b: 80, d: 200, g: 500 };
export const reforgeCost = (grade: GradeKey, locks: number) => REFORGE_COST[grade] * 2 ** locks;

/**
 * Reforges an item: locked bonuses stay exactly as they are; every other bonus is rerolled
 * (which bonus it is and how strong), within the item's grade. The grade never changes.
 */
export function reforgeAscended(id: string, locked: BonusKey[], rng: () => number = Math.random): string | null {
  const a = parseAscended(id);
  if (!a) return null;
  const keep = a.bonuses.filter((b) => locked.includes(b.key));
  const pool = bonusPool(a.base).filter((k) => !keep.some((b) => b.key === k));
  const bonuses = [...keep];
  for (let i = keep.length; i < a.bonuses.length && pool.length; i++) {
    const key = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const def = BONUSES[key];
    const q = a.grade.q[0] + rng() * (a.grade.q[1] - a.grade.q[0]);
    bonuses.push({ key, value: Math.max(1, Math.round(def.min + q * (def.max - def.min))) });
  }
  bonuses.sort((x, y) => bonusPool(a.base).indexOf(x.key) - bonusPool(a.base).indexOf(y.key));
  return ascendedId({ base: a.base.key, grade: a.grade.key, town: a.town, bonuses });
}
