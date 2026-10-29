// 🌟 The Ascension (levels 750 → 999): Ascended drops and the bonuses on worn Ascended items.
// Drops are rolled per minute of work (not per action), so every skill and every town is equally good.
import { ASC_BASES, ASC_DROP_MS, ASCENSION_LEVEL, rollAscended, STARLIGHT_PER_HOUR, type AscBase } from '../data/ascended';
import { ITEMS, type SkillId } from '../data/items';
import { REGIONS, type Region } from '../data/tiers';
import { ascBonus } from './ascBonus';
import { giveLoot } from './loot';
import { OFFLINE_CAP_MS, type PlayerState } from './player';
import { levelForXp } from './xp';

const COMBAT: SkillId[] = ['melee', 'ranged', 'magic', 'defense', 'health'];
const ARMOUR = ASC_BASES.filter((b) => b.kind === 'armour');
const WEAPONS = ASC_BASES.filter((b) => b.kind === 'weapon');

export { ascBonus };

/** How much time away counts: 24 hours, plus 🕳️ Echoing (Voidreach town bonus). */
export function offlineCapMs(p: PlayerState): number {
  return OFFLINE_CAP_MS + ascBonus(p, 'ec') * 3_600_000;
}

/** XP multiplier from Ascended bonuses for one skill. */
export function ascXpMult(p: PlayerState, skill: SkillId): number {
  // 🏡 Homespun (Pocketvale): extra XP for skills still under 750.
  const homespun = levelForXp(p.skills[skill].xp) < ASCENSION_LEVEL ? ascBonus(p, 'hs') : 0;
  const pct = ascBonus(p, 'xp', skill) + ascBonus(p, 'ax') + (COMBAT.includes(skill) ? ascBonus(p, 'cx') : 0) + homespun;
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
  // ✨ A little Starlight drifts down while you work (whole bits, the rest is a chance).
  // 🌠 Starcaught (Starfall Crater): more of it.
  const sl = (ms / 3_600_000) * STARLIGHT_PER_HOUR * (1 + ascBonus(p, 'sc') / 100);
  const bits = Math.floor(sl) + (rng() < sl - Math.floor(sl) ? 1 : 0);
  if (bits > 0) {
    giveLoot(p, [{ id: 'starlight', qty: bits }]);
    report.gained.starlight = (report.gained.starlight ?? 0) + bits;
  }
  // 🌳 Primordial (the Rift): Ascended items turn up a little more often.
  const n = poisson(ms, ASC_DROP_MS / (1 + ascBonus(p, 'pr') / 100), rng);
  const town = Math.max(0, REGIONS.indexOf((where ?? p.location) as Region));
  for (let i = 0; i < n; i++) {
    const id = rollAscended(pickBase(p, skill, rng), level, town, rng);
    giveLoot(p, [{ id, qty: 1 }], { overflowToBank: true });
    report.gained[id] = (report.gained[id] ?? 0) + 1;
    (report.ascended ??= []).push(id);
  }
}
