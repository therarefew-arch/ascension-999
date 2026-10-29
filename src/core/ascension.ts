// 🌟 The Ascension (levels 750 → 999): Ascended drops and the bonuses on worn Ascended items.
// Drops are rolled per minute of work (not per action), so every skill and every town is equally good.
import { ASC_BASES, ASC_DROP_MS, ASCENSION_LEVEL, rollAscended, type AscBase, type BonusKey } from '../data/ascended';
import { ITEMS, type SkillId } from '../data/items';
import { REGIONS, type Region } from '../data/tiers';
import { giveLoot } from './loot';
import type { PlayerState } from './player';
import { levelForXp } from './xp';

const COMBAT: SkillId[] = ['melee', 'ranged', 'magic', 'defense', 'health'];
const ARMOUR = ASC_BASES.filter((b) => b.kind === 'armour');
const WEAPONS = ASC_BASES.filter((b) => b.kind === 'weapon');

/** Skill-bound bonuses only count on the tool for that skill. */
const SKILL_BOUND: BonusKey[] = ['sp', 'dr', 'xp', 'rf'];

/** Adds up a bonus across worn Ascended items. Skill-bound ones need the matching skill's tool. */
export function ascBonus(p: PlayerState, key: BonusKey, skill?: SkillId): number {
  let total = 0;
  for (const id of Object.values(p.equipment)) {
    const a = id ? ITEMS[id]?.ascended : undefined;
    if (!a) continue;
    if (SKILL_BOUND.includes(key) && a.base.skill !== skill) continue;
    for (const b of a.bonuses) if (b.key === key) total += b.value;
  }
  return total;
}

/** XP multiplier from Ascended bonuses for one skill. */
export function ascXpMult(p: PlayerState, skill: SkillId): number {
  const pct = ascBonus(p, 'xp', skill) + ascBonus(p, 'ax') + (COMBAT.includes(skill) ? ascBonus(p, 'cx') : 0);
  return 1 + pct / 100;
}

/** How many events happen in this much time, when on average one happens every `meanMs`. */
function poisson(ms: number, meanMs: number, rng: () => number): number {
  const lambda = ms / meanMs;
  let n = 0;
  let prod = rng();
  const limit = Math.exp(-lambda);
  while (prod > limit && n < 50) { n++; prod *= rng(); }
  return n;
}

/** Which kind of Ascended item a bit of work can turn up. */
function pickBase(p: PlayerState, skill: SkillId, rng: () => number): AscBase {
  if (COMBAT.includes(skill)) {
    if (rng() < 0.35) {
      const style = p.equipment.weapon ? ITEMS[p.equipment.weapon]?.equip?.style : undefined;
      const mine = WEAPONS.find((w) => w.style === (style ?? 'melee'))!;
      return rng() < 0.7 ? mine : WEAPONS[Math.floor(rng() * WEAPONS.length)];
    }
    return ARMOUR[Math.floor(rng() * ARMOUR.length)];
  }
  const tool = ASC_BASES.find((b) => b.kind === 'tool' && b.skill === skill);
  if (tool && rng() < 0.85) return tool;
  return ARMOUR[Math.floor(rng() * ARMOUR.length)];
}

/**
 * Rolls Ascended drops for `ms` of work in a skill that's 750+.
 * Goes through the central loot system; if the bag is full it goes to the bank (never lost).
 */
export function rollAscendedDrops(
  p: PlayerState, skill: SkillId, ms: number, where: string | undefined,
  report: { gained: Record<string, number>; ascended?: string[] }, rng: () => number = Math.random,
): void {
  if (ms <= 0) return;
  const level = levelForXp(p.skills[skill].xp);
  if (level < ASCENSION_LEVEL) return;
  const n = poisson(ms, ASC_DROP_MS, rng);
  const town = Math.max(0, REGIONS.indexOf((where ?? p.location) as Region));
  for (let i = 0; i < n; i++) {
    const id = rollAscended(pickBase(p, skill, rng), level, town, rng);
    giveLoot(p, [{ id, qty: 1 }], { overflowToBank: true });
    report.gained[id] = (report.gained[id] ?? 0) + 1;
    (report.ascended ??= []).push(id);
  }
}
