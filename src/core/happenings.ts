// 🎪 Town happenings (v0.0.2.10): each local day one of the towns you've found holds a small event for one skill.
//  • That skill gets +HAPPENING_XP XP all day, wherever you are.
//  • Join in (earn about half an hour of that skill's XP) and collect a prize from the host — in that town.
// The day's happening is worked out from the date (like the Pedlar's visits); only progress is saved.
import { HAPPENING_MAP, HAPPENINGS, type HappeningDef } from '../data/happenings';
import { SKILLS } from '../data/skills';
import type { SkillId } from '../data/items';
import { FIND_ITEM } from '../data/lootTables';
import type { Region } from '../data/tiers';
import type { ProgressReport } from './idle';
import { giveLoot } from './loot';
import type { ItemStack, PlayerState } from './player';
import { bestAction, xpPerHour } from './rates';
import { levelForXp, xpToNext } from './xp';
import { today } from './cozy';

export const HAPPENING_XP = 0.2;
/** How long the goal is, in hours of your best action for that skill. */
export const HAPPENING_HOURS = 0.5;

export interface HappeningState { day: string; id: string; goal: number; progress: number; claimed: boolean }

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  // Stir the bits well, so day after day doesn't fall into a pattern.
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}

/** Towns that can hold a happening for you: found ones (Lunaria only once its lights are back). */
function eligible(p: PlayerState): Region[] {
  return [...new Set(HAPPENINGS.map((h) => h.town))].filter((t) => p.regions.includes(t) && (t !== 'Lunaria' || p.lunaria.restored));
}

/** The happening on a given day (null if you haven't found any town that holds one). */
export function happeningOn(p: PlayerState, now = Date.now()): HappeningDef | null {
  const towns = eligible(p);
  if (!towns.length) return null;
  const day = today(now);
  const town = towns[hashStr(`hap-${day}`) % towns.length];
  const list = HAPPENINGS.filter((h) => h.town === town);
  return list[hashStr(`hapd-${day}`) % list.length];
}

/** +20% XP for today's happening skill. */
export function happeningXpMult(p: PlayerState, skill: SkillId, now = Date.now()): number {
  const h = happeningOn(p, now);
  return h && h.skill === skill ? 1 + HAPPENING_XP : 1;
}

function goalFor(p: PlayerState, skill: SkillId): number {
  const a = bestAction(p, skill);
  const xp = a ? xpPerHour(p, a) * HAPPENING_HOURS : xpToNext(levelForXp(p.skills[skill].xp)) * 0.3;
  return Math.max(200, Math.round(xp / 50) * 50);
}

/** Today's progress, read only: the saved one, or what a fresh one would look like (nothing is changed). */
export function happeningState(p: PlayerState, now = Date.now()): HappeningState | null {
  const h = happeningOn(p, now);
  if (!h) return null;
  const day = today(now);
  if (p.happening && p.happening.day === day && p.happening.id === h.id) return p.happening;
  return { day, id: h.id, goal: goalFor(p, h.skill), progress: 0, claimed: false };
}
/** Today's progress, saved on the player (made fresh at the start of each day). */
export function ensureHappening(p: PlayerState, now = Date.now()): HappeningState | null {
  const st = happeningState(p, now);
  if (st && st !== p.happening) p.happening = st;
  return st;
}

/** Counts the happening skill's XP from anything that happened. */
export function trackHappening(p: PlayerState, report: ProgressReport | null) {
  if (!report) return;
  const st = ensureHappening(p);
  if (!st || st.claimed) return;
  const h = HAPPENING_MAP[st.id];
  const add = report.xp[h.skill] ?? 0;
  if (add > 0) st.progress = Math.min(st.goal, st.progress + add);
}

/** The prize: coins by your best skill, and a rare find. */
export function happeningPrize(p: PlayerState, h: HappeningDef): ItemStack[] {
  const best = Math.max(...Object.values(p.skills).map((s) => levelForXp(s.xp)));
  const coins = Math.round((30 + Math.min(999, best) * 0.9) * 10);
  const finds = Object.values(FIND_ITEM);
  const find = (FIND_ITEM as Record<string, string>)[h.skill] ?? finds[hashStr(h.id) % finds.length];
  return [{ id: 'coins', qty: coins }, { id: find, qty: 1 }];
}

export function whyCantClaimHappening(p: PlayerState, now = Date.now()): string | null {
  const st = happeningState(p, now);
  if (!st) return 'No happening today';
  const h = HAPPENING_MAP[st.id];
  if (st.claimed) return 'Prize collected — see you tomorrow';
  if (st.progress < st.goal) return `Join in: earn ${(st.goal - st.progress).toLocaleString()} more ${SKILLS[h.skill].name} XP`;
  if (p.travel || p.location !== h.town) return `Collect your prize in ${h.town}`;
  return null;
}

export function claimHappening(p: PlayerState, now = Date.now()): { h: HappeningDef; prize: ItemStack[] } | null {
  if (whyCantClaimHappening(p, now)) return null;
  const st = ensureHappening(p, now)!;
  const h = HAPPENING_MAP[st.id];
  const prize = happeningPrize(p, h);
  giveLoot(p, prize, { overflowToBank: true });
  st.claimed = true;
  return { h, prize };
}

/** Is there anything to do with the happening? (Used for a little dot on the town chip.) */
export const happeningReady = (p: PlayerState, now = Date.now()) => !whyCantClaimHappening(p, now);

/** Keep only a valid saved state. */
export function loadHappening(raw: unknown): HappeningState | undefined {
  const r = raw as Partial<HappeningState> | null;
  if (!r || typeof r.day !== 'string' || typeof r.id !== 'string' || !HAPPENING_MAP[r.id] || typeof r.goal !== 'number') return undefined;
  return { day: r.day, id: r.id, goal: r.goal, progress: Math.max(0, Number(r.progress) || 0), claimed: !!r.claimed };
}
