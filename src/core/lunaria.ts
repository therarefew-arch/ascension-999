// 🔍 "The Silent Bell" — Lunaria's mystery.
// 1. Arrive. 2. Find Lune's 4 clues while skilling on the island. 3. Defeat The Hush.
// 4. Relight the 7 Moonlanterns. 5. Ring the bell with the brass key from Old Galewing's nest (Bluecliff).
// Then Lunaria comes back to life: its market reopens and Wick the lantern spirit joins you.
import type { ProgressReport } from './idle';
import { addXp, skillLevel } from './idle';
import { countInBag, removeFromBag } from './inventory';
import { giveLoot, grantPet } from './loot';
import type { ItemStack, PlayerState } from './player';
import { LORE } from '../data/lore';

export const LANTERNS = 7;
export const LANTERN_COST: ItemStack[] = [{ id: 'moonwood_logs', qty: 8 }, { id: 'moonsilver_bar', qty: 2 }];
/** Firemaking level needed to light a Moonlantern. */
export const LANTERN_LEVEL = 245;
export const LANTERN_XP = 1000;
export const HUSH = 'the_hush';
/** The note that means you hold the bell tower key. */
export const KEY_NOTE = 'bc_galewing';
export const RESTORE_REWARD: ItemStack[] = [{ id: 'coins', qty: 5000 }, { id: 'great_moonfin', qty: 10 }, { id: 'moonsilver_bar', qty: 10 }];

export const CLUE_IDS = LORE.filter((n) => n.region === 'Lunaria' && n.trigger === 'find').map((n) => n.id);

export interface QuestState {
  arrived: boolean;
  clues: number;
  hushDefeated: boolean;
  lanterns: number;
  hasKey: boolean;
  restored: boolean;
}

export function questState(p: PlayerState): QuestState {
  return {
    arrived: p.regions.includes('Lunaria'),
    clues: CLUE_IDS.filter((id) => p.lore.includes(id)).length,
    hushDefeated: p.bossReadyAt[HUSH] !== undefined,
    lanterns: p.lunaria.lanterns,
    hasKey: p.lore.includes(KEY_NOTE),
    restored: p.lunaria.restored,
  };
}

export function whyCantLight(p: PlayerState): string | null {
  const q = questState(p);
  if (q.restored || q.lanterns >= LANTERNS) return 'Every Moonlantern is already lit';
  if (p.location !== 'Lunaria') return 'Travel to Lunaria first';
  if (!q.hushDefeated) return 'Defeat The Hush first — it swallows any light you make';
  if (skillLevel(p, 'firemaking') < LANTERN_LEVEL) return `Needs Firemaking ${LANTERN_LEVEL}`;
  for (const c of LANTERN_COST) if (countInBag(p.inventory, c.id) < c.qty) return `Needs ${c.qty} ${c.id === 'moonwood_logs' ? 'Moonwood logs' : 'Moonsilver bars'} in your bag`;
  return null;
}

/** Light one Moonlantern (uses the cost from your bag, gives Firemaking XP). */
export function lightLantern(p: PlayerState, report: ProgressReport): boolean {
  if (whyCantLight(p)) return false;
  for (const c of LANTERN_COST) removeFromBag(p.inventory, c.id, c.qty);
  p.lunaria.lanterns += 1;
  addXp(p, { skill: 'firemaking' }, report, LANTERN_XP);
  return true;
}

export function whyCantRing(p: PlayerState): string | null {
  const q = questState(p);
  if (q.restored) return 'The bell has already rung — Lunaria is home again';
  if (p.location !== 'Lunaria') return 'Travel to Lunaria first';
  if (!q.hasKey) return "The bell tower is locked — the key is somewhere in Bluecliff (Old Galewing's nest?)";
  if (q.clues < CLUE_IDS.length) return `Find all of Lune's clues first (${q.clues}/${CLUE_IDS.length})`;
  if (!q.hushDefeated) return 'The Hush is still here';
  if (q.lanterns < LANTERNS) return `Relight all the Moonlanterns first (${q.lanterns}/${LANTERNS})`;
  return null;
}

/** Ring the bell: Lunaria comes back. Rewards go through the loot system; Wick is a reward pet. */
export function ringBell(p: PlayerState): boolean {
  if (whyCantRing(p)) return false;
  p.lunaria.restored = true;
  giveLoot(p, RESTORE_REWARD);
  grantPet(p, 'pet_wick');
  return true;
}
