// 💰 Long-term Trading Post upgrades (v0.0.2.26, owner: "I'm about to be level 400 and have all the upgrades…
// there should be something to work for"). Owner picked: skill tutors, more garden plots, a bigger bag and a 4th idle
// slot. Coins only — never real money.
import type { SkillId } from '../data/items';
import { levelForXp } from '../core/xp';
import type { PlayerState } from '../core/player';

// ----- 📚 Skill tutors: +1% XP per level in one skill -----
export const TUTOR = {
  max: 25,
  /** Tutor level n needs the skill at n × perLevel (level 25 at 950). */
  perLevel: 38,
  /** Price of the first lesson; each one after costs ×grow. */
  base: 5_000,
  grow: 1.35,
};

export const tutorLevel = (p: PlayerState, s: SkillId) => p.tutors[s] ?? 0;
/** Price of the next lesson (null = maxed). */
export function tutorCost(p: PlayerState, s: SkillId): number | null {
  const n = tutorLevel(p, s);
  return n >= TUTOR.max ? null : Math.round(TUTOR.base * Math.pow(TUTOR.grow, n) / 100) * 100;
}
export function whyCantTutor(p: PlayerState, s: SkillId): string | null {
  const n = tutorLevel(p, s);
  const cost = tutorCost(p, s);
  if (cost === null) return 'Your tutor has nothing left to teach you';
  const need = (n + 1) * TUTOR.perLevel;
  if (levelForXp(p.skills[s].xp) < need) return `Next lesson at level ${need}`;
  if (p.coins < cost) return `Needs ${cost.toLocaleString()} coins`;
  return null;
}
export function buyTutor(p: PlayerState, s: SkillId): string | null {
  const why = whyCantTutor(p, s);
  if (why) return why;
  p.coins -= tutorCost(p, s)!;
  p.tutors[s] = tutorLevel(p, s) + 1;
  return null;
}
/** XP multiplier from your tutor (1 = none). */
export const tutorXpMult = (p: PlayerState, s: SkillId) => 1 + tutorLevel(p, s) / 100;

// ----- 🌱 More garden plots (4 → 8) -----
export const MAX_PLOTS = 8;
const PLOT_COSTS: Record<number, number> = { 4: 100_000, 5: 300_000, 6: 800_000, 7: 2_000_000 };
export const plotCost = (p: PlayerState): number | null => PLOT_COSTS[p.farm.plots.length] ?? null;
export function buyPlot(p: PlayerState): string | null {
  const cost = plotCost(p);
  if (cost === null) return 'Your garden is as big as it gets';
  if (p.coins < cost) return `Needs ${cost.toLocaleString()} coins`;
  p.coins -= cost;
  p.farm.plots.push(null);
  return null;
}
