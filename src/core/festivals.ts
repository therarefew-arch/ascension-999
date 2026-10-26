// 🎪 Seasonal festivals on the phone's real calendar (see data/festivals.ts).
// Tokens, treats and pets all come through the central loot system / reward pets.
import { FESTIVAL_MAP, FESTIVAL_PRICES, FESTIVAL_XP_BONUS, FESTIVALS, type FestivalDef } from '../data/festivals';
import type { SkillId } from '../data/items';
import type { ProgressReport } from './idle';
import { canFitAll, countInBag, countInBank, removeFromBag, removeFromBank } from './inventory';
import { giveLoot, grantPet, rollLoot, satchelOn } from './loot';
import type { PlayerState } from './player';

const md = (d: Date) => (d.getMonth() + 1) * 100 + d.getDate();

/** The festival on right now (or null). */
export function activeFestival(now = Date.now()): FestivalDef | null {
  const today = md(new Date(now));
  for (const f of FESTIVALS) {
    const a = f.start[0] * 100 + f.start[1];
    const b = f.end[0] * 100 + f.end[1];
    if (a <= b ? today >= a && today <= b : today >= a || today <= b) return f;
  }
  return null;
}

/** "harvest-2026" — which year's festival this is (Winter Lights in January counts as last year's). */
export function festivalKey(f: FestivalDef, now = Date.now()): string {
  const d = new Date(now);
  const wraps = f.start[0] > f.end[0];
  const year = wraps && d.getMonth() + 1 <= f.end[0] ? d.getFullYear() - 1 : d.getFullYear();
  return `${f.id}-${year}`;
}

/** When a festival ends (end of its last day). */
export function festivalEndsAt(f: FestivalDef, now = Date.now()): number {
  const d = new Date(now);
  let year = d.getFullYear();
  if (f.start[0] > f.end[0] && d.getMonth() + 1 >= f.start[0]) year += 1; // Winter: ends next January
  return new Date(year, f.end[0] - 1, f.end[1], 23, 59, 59).getTime();
}

/** The next festival to come (for a gentle "coming up" hint). */
export function nextFestival(now = Date.now()): { f: FestivalDef; startsAt: number } {
  const d = new Date(now);
  let best: { f: FestivalDef; startsAt: number } | null = null;
  for (const f of FESTIVALS) {
    let s = new Date(d.getFullYear(), f.start[0] - 1, f.start[1]).getTime();
    if (s <= now) s = new Date(d.getFullYear() + 1, f.start[0] - 1, f.start[1]).getTime();
    if (!best || s < best.startsAt) best = { f, startsAt: s };
  }
  return best!;
}

/** +10% XP for the festival's skill while it's on. */
export function festivalXpMult(skill: SkillId, now = Date.now()): number {
  const f = activeFestival(now);
  return f && f.skill === skill ? 1 + FESTIVAL_XP_BONUS : 1;
}

/** A chance of a festival token after a skilling action (or a monster defeated), at time `at`. */
export function rollFestivalToken(p: PlayerState, report: ProgressReport, at = Date.now(), kill = false): void {
  const f = activeFestival(at);
  if (!f) return;
  const loot = rollLoot(kill ? `festival_kill_${f.id}` : `festival_token_${f.id}`);
  if (!loot.length) return;
  giveLoot(p, loot);
  for (const st of loot) report.gained[st.id] = (report.gained[st.id] ?? 0) + st.qty;
}

export type StallItem = keyof typeof FESTIVAL_PRICES;

export const tokensHave = (p: PlayerState, f: FestivalDef) => countInBag(p.inventory, f.token.id) + countInBank(p, f.token.id);

export function whyCantBuy(p: PlayerState, what: StallItem, now = Date.now()): string | null {
  const f = activeFestival(now);
  if (!f) return 'The festival stall is closed until the next festival';
  if (what === 'decoration' && p.cottage.includes(f.decoration.id)) return 'Already in your Cottage';
  if (what === 'pet' && p.pets.includes(f.pet.id)) return `${f.pet.name} already follows you`;
  const price = FESTIVAL_PRICES[what];
  if (tokensHave(p, f) < price) return `Needs ${price} ${f.token.name.toLowerCase()}s`;
  if (what === 'treat' && !satchelOn(p) && !canFitAll(p.inventory, [{ id: f.treat.id, qty: 1 }])) return 'Your bag is full';
  return null;
}

/** Trade tokens (bag first, then bank) at the festival stall. */
export function buyAtStall(p: PlayerState, what: StallItem, now = Date.now()): string | null {
  const why = whyCantBuy(p, what, now);
  if (why) return why;
  const f = activeFestival(now)!;
  const price = FESTIVAL_PRICES[what];
  const fromBag = removeFromBag(p.inventory, f.token.id, price);
  if (fromBag < price) removeFromBank(p, f.token.id, price - fromBag);
  if (what === 'treat') giveLoot(p, rollLoot(`festival_treat_${f.id}`));
  if (what === 'decoration') p.cottage.push(f.decoration.id);
  if (what === 'pet') { grantPet(p, f.pet.id); if (!p.activePet) p.activePet = f.pet.id; }
  return null;
}

/** First visit during a festival this year? (Marks it seen.) */
export function welcomeFestival(p: PlayerState, now = Date.now()): FestivalDef | null {
  const f = activeFestival(now);
  if (!f) return null;
  const key = festivalKey(f, now);
  if (p.festivalsSeen.includes(key)) return null;
  p.festivalsSeen.push(key);
  return f;
}

export { FESTIVAL_MAP };
