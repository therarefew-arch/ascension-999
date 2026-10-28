// 🍲 Meal and brew buffs (Cooking): eat or drink one from your bag for a timed bonus.
// Meals make one skill faster; brews give more XP. Eating the same kind again adds time (up to 2 hours).
import { COMBAT_SKILL_IDS } from '../data/pets';
import { getItem, type Buff, type SkillId } from '../data/items';
import { countInBag, removeFromBag } from './inventory';
import type { PlayerState } from './player';

export const MAX_BUFF_MS = 2 * 60 * 60 * 1000;

export interface ActiveBuff { item: string; until: number }

const keyOf = (b: Buff) => b.slot ?? `${b.kind}:${b.skill}`;

function applies(b: Buff, skill: SkillId): boolean {
  return b.skill === skill || b.skill === 'all' || (b.skill === 'combat' && COMBAT_SKILL_IDS.includes(skill));
}

/** Active buffs right now (expired ones are tidied away). */
export function activeBuffs(p: PlayerState, now = Date.now()): (ActiveBuff & { buff: Buff })[] {
  const out: (ActiveBuff & { buff: Buff })[] = [];
  for (const [k, a] of Object.entries(p.buffs)) {
    if (a.until <= now) { delete p.buffs[k]; continue; }
    const buff = getItem(a.item).buff;
    if (buff) out.push({ ...a, buff });
  }
  return out;
}

/** Total speed bonus (%) for a skill from meals. */
export function buffSpeedPct(p: PlayerState, skill: SkillId, now = Date.now()): number {
  return activeBuffs(p, now).filter((a) => a.buff.kind === 'speed' && applies(a.buff, skill)).reduce((s, a) => s + a.buff.pct, 0);
}

/** XP multiplier for a skill from brews (1 = none). */
export function buffXpMult(p: PlayerState, skill: SkillId, now = Date.now()): number {
  return 1 + activeBuffs(p, now).filter((a) => a.buff.kind === 'xp' && applies(a.buff, skill)).reduce((s, a) => s + a.buff.pct, 0) / 100;
}

/** Eat a meal or drink a brew from the bag. */
export function consumeBuff(p: PlayerState, id: string, now = Date.now()): string | null {
  const buff = getItem(id).buff;
  if (!buff) return "That doesn't give a bonus";
  if (countInBag(p.inventory, id) < 1) return 'It needs to be in your bag';
  const k = keyOf(buff);
  const current = p.buffs[k];
  const from = current && current.until > now ? current.until : now;
  if (from - now >= MAX_BUFF_MS - 60_000) return 'That bonus is already as long as it can be (2 hours)';
  removeFromBag(p.inventory, id, 1);
  p.buffs[k] = { item: id, until: Math.min(now + MAX_BUFF_MS, from + buff.minutes * 60_000) };
  return null;
}

/** A short line describing a buff, e.g. "+6% Mining speed". */
export function buffText(b: Buff): string {
  const who = b.skill === 'all' ? 'all skills' : b.skill === 'combat' ? 'combat' : getSkillName(b.skill);
  return `+${b.pct}% ${who} ${b.kind === 'speed' ? 'speed' : 'XP'}`;
}
const NAMES: Partial<Record<SkillId, string>> = {
  mining: 'Mining', smithing: 'Smithing', woodcutting: 'Woodcutting', firemaking: 'Firemaking', fishing: 'Fishing', cooking: 'Cooking',
  crafting: 'Crafting', enhancing: 'Enhancing', runecrafting: 'Runecrafting', herblore: 'Herblore', farming: 'Farming',
};
function getSkillName(s: SkillId) { return NAMES[s] ?? s; }
