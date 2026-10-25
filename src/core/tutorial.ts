// 📖 "Settling In" — a short starter questline in Pocketvale.
// Nine friendly errands that teach each part of the game and end with the road to Ironmoor.
// Rewards go through the central loot system. Players who are already past the start skip it.
import type { SkillId } from '../data/items';
import type { ProgressReport } from './idle';
import { giveLoot } from './loot';
import type { ItemStack, PlayerState } from './player';
import { levelForXp } from './xp';

export interface TutorialStep {
  title: string;
  /** A line of story from the townsfolk. */
  story: string;
  goal: { kind: 'gain'; item: string; qty: number } | { kind: 'kills'; qty: number } | { kind: 'anyLevel'; level: number };
  label: string;
  /** Where the Go button takes you. */
  go: SkillId | 'combat' | 'travel';
  reward: ItemStack[];
}

export const TUTORIAL: TutorialStep[] = [
  {
    title: 'Copper for the Bell', story: 'Old Hamm the blacksmith scratches his beard: "The town bell needs new hinges. Fetch me some copper from the mine?"',
    goal: { kind: 'gain', item: 'copper_ore', qty: 10 }, label: 'Mine 10 Copper ore', go: 'mining', reward: [{ id: 'coins', qty: 50 }],
  },
  {
    title: 'A Bit of Tin', story: '"Copper alone is too soft. Tin makes it strong — bring me some of that too."',
    goal: { kind: 'gain', item: 'tin_ore', qty: 10 }, label: 'Mine 10 Tin ore', go: 'mining', reward: [{ id: 'coins', qty: 50 }],
  },
  {
    title: 'Your First Bronze', story: '"Now the fun part. Copper and tin together in the furnace — tap in time with the glow!"',
    goal: { kind: 'gain', item: 'bronze_bar', qty: 5 }, label: 'Smelt 5 Bronze bars', go: 'smithing', reward: [{ id: 'coins', qty: 100 }],
  },
  {
    title: 'An Empty Woodpile', story: 'Maggie at the Mossy Mug inn sighs: "Not a log left for the fire. Could you chop a few pines?"',
    goal: { kind: 'gain', item: 'pine_logs', qty: 10 }, label: 'Chop 10 Pine logs', go: 'woodcutting', reward: [{ id: 'coins', qty: 100 }],
  },
  {
    title: 'Something for the Pot', story: '"Lovely! Now, the regulars will want supper. Shrimp from the river would do nicely."',
    goal: { kind: 'gain', item: 'raw_shrimp', qty: 10 }, label: 'Catch 10 Shrimp', go: 'fishing', reward: [{ id: 'coins', qty: 100 }],
  },
  {
    title: 'Supper Time', story: '"Stoke the kitchen fire with a log, then cook them up. Don\'t worry if one burns — nobody minds."',
    goal: { kind: 'gain', item: 'cooked_shrimp', qty: 5 }, label: 'Cook 5 Shrimp', go: 'cooking', reward: [{ id: 'coins', qty: 150 }, { id: 'pine_logs', qty: 10 }],
  },
  {
    title: 'Tools of Your Own', story: 'The tinker at the workshop grins: "Every adventurer needs their own pickaxe. Carve one — I\'ll show you how."',
    goal: { kind: 'gain', item: 'stone_pickaxe', qty: 1 }, label: 'Craft a Stone pickaxe', go: 'crafting', reward: [{ id: 'coins', qty: 150 }],
  },
  {
    title: 'Rats in the Grain', story: 'The miller waves you over: "Rats in the grain store again! Could you shoo them off? Bring food, just in case."',
    goal: { kind: 'kills', qty: 5 }, label: 'Defeat 5 monsters at the Training Grounds', go: 'combat', reward: [{ id: 'coins', qty: 200 }, { id: 'cooked_shrimp', qty: 5 }],
  },
  {
    title: 'The Road East', story: 'Old Hamm leans on the forge: "You\'re settling in nicely. Get any skill to 50 and the road to Ironmoor opens — tell them Hamm sent you."',
    goal: { kind: 'anyLevel', level: 50 }, label: 'Reach level 50 in any skill', go: 'travel', reward: [{ id: 'coins', qty: 500 }],
  },
];

/** A save that's already well past the start skips the questline. */
export function alreadySettled(p: PlayerState): boolean {
  const total = Object.values(p.skills).reduce((s, v) => s + levelForXp(v.xp), 0);
  return p.regions.length > 1 || total >= 120;
}

export function currentStep(p: PlayerState): TutorialStep | null {
  return p.tutorial.done ? null : TUTORIAL[p.tutorial.step] ?? null;
}

export function stepGoal(step: TutorialStep): number {
  return step.goal.kind === 'gain' ? step.goal.qty : step.goal.kind === 'kills' ? step.goal.qty : step.goal.level;
}

/** Progress for the current step (for "any level" it's your highest level). */
export function stepProgress(p: PlayerState): number {
  const step = currentStep(p);
  if (!step) return 0;
  if (step.goal.kind === 'anyLevel') return Math.max(...Object.values(p.skills).map((s) => levelForXp(s.xp)));
  return p.tutorial.progress;
}

export function stepDone(p: PlayerState): boolean {
  const step = currentStep(p);
  return !!step && stepProgress(p) >= stepGoal(step);
}

/** Counts progress from anything that happened (idle, minigames, fights). */
export function trackTutorial(p: PlayerState, report: ProgressReport | null) {
  const step = currentStep(p);
  if (!step || !report) return;
  let add = 0;
  if (step.goal.kind === 'gain') add = report.gained[step.goal.item] ?? 0;
  if (step.goal.kind === 'kills') add = report.combat?.kills ?? 0;
  if (add > 0) p.tutorial.progress = Math.min(stepGoal(step), p.tutorial.progress + add);
}

/** Claims the current step's reward and moves on. Returns the step claimed. */
export function claimStep(p: PlayerState): TutorialStep | null {
  const step = currentStep(p);
  if (!step || !stepDone(p)) return null;
  giveLoot(p, step.reward);
  p.tutorial.step += 1;
  p.tutorial.progress = 0;
  if (p.tutorial.step >= TUTORIAL.length) p.tutorial.done = true;
  return step;
}
