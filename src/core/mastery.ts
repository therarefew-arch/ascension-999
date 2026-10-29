// ✦ Mastery perks (part 5 of the Ascension): small rewards for taking a skill to 800, 900 and 999.
// Kept small on purpose (the owner prefers goals to chase over passive bonuses).
import type { SkillId } from '../data/items';
import type { PlayerState } from './player';
import { levelForXp, MAX_LEVEL } from './xp';

export interface MasteryStep {
  level: number;
  name: string;
  /** What it gives, for a skill's name. */
  text: (skill: string) => string;
}

export const MASTERY: MasteryStep[] = [
  { level: 800, name: 'Adept', text: (s) => `+5% Starlight from ${s}` },
  { level: 900, name: 'Expert', text: (s) => `+5% Ascended finds from ${s}` },
  { level: MAX_LEVEL, name: 'Master', text: () => '+1% XP in every skill (for each skill you master)' },
];
/** Adept: Starlight from that skill's work (%). Expert: Ascended finds from it (%). Master: XP in every skill (% per mastered skill). */
export const MASTERY_NUM = { starlight: 5, finds: 5, masterXp: 1 } as const;

/** How many mastery steps a skill has reached (0–3). */
export function masteryRank(p: PlayerState, skill: SkillId): number {
  const lvl = levelForXp(p.skills[skill].xp);
  return MASTERY.filter((m) => lvl >= m.level).length;
}

/** Skills at 999. */
export function masteredCount(p: PlayerState): number {
  return (Object.keys(p.skills) as SkillId[]).filter((s) => levelForXp(p.skills[s].xp) >= MAX_LEVEL).length;
}

/** The mastery step a level-up just reached (for its announcement), if any. */
export function masteryReached(from: number, to: number): MasteryStep | undefined {
  return [...MASTERY].reverse().find((m) => from < m.level && to >= m.level);
}
