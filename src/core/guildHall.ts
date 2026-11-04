// 🏰 Guild Hall rules (v0.0.2.22). Rooms in data/guildHall.ts.
// How it works without anything new on the server: each member's guild check-in summary (`FamilySnap.hall`)
// carries how many rooms they've seen finished and their own donations to the room being built. Every phone adds
// those up from the board, so the whole guild sees the same progress.
// Donations are scored in "work points": 1 point = 1 second of work at base speed to make that thing, so a log
// from any town counts about the same as any other — high and low levels help equally.
import { ACTION_LIST, SKILLS } from '../data/skills';
import { getItem, ITEMS, type SkillId } from '../data/items';
import { CROPS } from '../data/tiers';
import { HALL_ROOMS, type HallRoom } from '../data/guildHall';
import { countInBank, removeFromBag, removeFromBank } from './inventory';
import type { FamilyBoard } from './family';
import type { PlayerState } from './player';
import { harvestXp } from './farming';

/** Your Guild Hall state (saved per save slot, for the guild `f` you're in). */
export interface HallState {
  /** Guild id this belongs to (a new guild starts fresh). */
  f: string;
  /** Rooms finished (the most this phone has seen). */
  built: number;
  /** Your own donations to room `built`, per need (work points). */
  d: [number, number, number];
}

/** What one item is worth to the hall: which skill made it, work points each, and XP each (for the thank-you). */
export interface HallGood { skill: SkillId; pts: number; xp: number }

let goods: Map<string, HallGood> | null = null;
/** Every item the hall takes (materials and food — never gear, tools, gems, Relics, Ascended or Uniques). */
export function hallGoods(): Map<string, HallGood> {
  if (goods) return goods;
  goods = new Map();
  const put = (id: string, g: HallGood) => { const old = goods!.get(id); if (!old || g.pts < old.pts) goods!.set(id, g); };
  for (const a of ACTION_LIST) {
    if (!a.output || a.kind || a.lost) continue;
    const it = ITEMS[a.output.item];
    if (!it || ['weapon', 'armour', 'tool', 'gem', 'currency', 'treasure', 'charm', 'seed'].includes(it.category) || it.relic || it.uniqueOf) continue;
    const qty = Math.max(1, a.output.qty);
    put(it.id, { skill: a.skill, pts: Math.max(1, Math.round(a.durationMs / 1000 / qty)), xp: a.xp / qty });
  }
  // 🌱 Crops: a full garden (4 plots, ~4.5 crops a harvest) — points per crop from its growing time.
  CROPS.forEach((c, t) => {
    if (ITEMS[c.key]) put(c.key, { skill: 'farming', pts: Math.max(1, Math.round((c.growMinutes * 60) / 18)), xp: harvestXp(t) / 4.5 });
  });
  return goods;
}

export const roomNeed = (room: HallRoom) => Math.round(room.hours * 3600);

/** Your hall state for the guild you're in now (fresh if you changed guild). */
export function hallOf(p: PlayerState): HallState | null {
  if (!p.family) return null;
  if (p.hall && p.hall.f === p.family.f) return p.hall;
  return { f: p.family.f, built: 0, d: [0, 0, 0] };
}
/** Same, saved on the player (made fresh for a new guild). */
export function ensureHall(p: PlayerState): HallState | null {
  const h = hallOf(p);
  if (h && h !== p.hall) p.hall = h;
  return h;
}

/** What goes in your guild check-in summary. */
export const hallSnap = (p: PlayerState) => { const h = hallOf(p); return h ? { r: h.built, d: h.d } : undefined; };

export interface HallView {
  built: number;
  room: HallRoom | null;
  /** Guild totals and your own share, per need. */
  total: [number, number, number];
  mine: [number, number, number];
  need: number;
}

/** The whole guild's progress, from the last board (your own numbers always from this phone). */
export function hallView(p: PlayerState, board: FamilyBoard | null): HallView | null {
  const h = hallOf(p);
  if (!h || !p.family) return null;
  let built = h.built;
  for (const m of board?.members ?? []) {
    const r = Number(m.snap?.hall?.r);
    if (m.id !== p.family.m && Number.isInteger(r) && r > built && r <= HALL_ROOMS.length) built = r;
  }
  const room = HALL_ROOMS[built] ?? null;
  const mine: [number, number, number] = built === h.built ? [...h.d] : [0, 0, 0];
  const total: [number, number, number] = [...mine];
  for (const m of board?.members ?? []) {
    if (m.id === p.family.m || m.snap?.hall?.r !== built || !Array.isArray(m.snap.hall.d)) continue;
    m.snap.hall.d.slice(0, 3).forEach((v, i) => { const n = Number(v); if (Number.isFinite(n) && n > 0) total[i] += Math.floor(n); });
  }
  return { built, room, total, mine, need: room ? roomNeed(room) : 0 };
}

/** Catch up with what the board shows: rooms someone else saw finished, or a room that's now full. Returns rooms newly finished. */
export function syncHall(p: PlayerState, board: FamilyBoard | null): number {
  const h = ensureHall(p);
  const v = hallView(p, board);
  if (!h || !v) return 0;
  let built = v.built;
  if (v.room && v.total.every((t) => t >= v.need)) built++;
  if (built <= h.built) return 0;
  const gained = built - h.built;
  h.built = built;
  h.d = [0, 0, 0];
  return gained;
}

/** XP bonus from finished rooms (only while you're in that guild). */
export function hallXpMult(p: PlayerState, skill: SkillId): number {
  const h = p.family && p.hall && p.hall.f === p.family.f ? p.hall : null;
  if (!h || !h.built) return 1;
  let pct = 0;
  for (const room of HALL_ROOMS.slice(0, h.built)) {
    if (room.perk.skills === 'all' || room.perk.skills.includes(skill)) pct += room.perk.pct;
  }
  return 1 + pct / 100;
}

export const perkText = (room: HallRoom) => `+${room.perk.pct}% XP ${room.perk.skills === 'all' ? 'in every skill' : room.perk.skills.map((s) => SKILLS[s].name).join(', ')}`;

/** Things you have (bag + bank) that the current room takes for need `i`. */
export function donatable(p: PlayerState, room: HallRoom, i: number): { id: string; qty: number; good: HallGood }[] {
  const skill = room.needs[i];
  const all = hallGoods();
  const have = new Map<string, number>();
  for (const s of p.inventory) if (s && all.get(s.id)?.skill === skill) have.set(s.id, (have.get(s.id) ?? 0) + s.qty);
  for (const s of p.bank) if (all.get(s.id)?.skill === skill) have.set(s.id, (have.get(s.id) ?? 0) + s.qty);
  return [...have.entries()].map(([id, qty]) => ({ id, qty, good: all.get(id)! }))
    .sort((a, b) => getItem(a.id).name.localeCompare(getItem(b.id).name));
}

/** Takes up to qty of an item (bag first, then bank) for need `i` of the room being built; never more than the
 *  room still needs. Returns how many were taken and the points they gave. */
export function takeForHall(p: PlayerState, view: HallView, i: number, id: string, qty: number): { taken: number; pts: number } {
  const h = ensureHall(p);
  const g = hallGoods().get(id);
  if (!h || !view.room || h.built !== view.built || !g || g.skill !== view.room.needs[i]) return { taken: 0, pts: 0 };
  const left = Math.max(0, view.need - view.total[i]);
  const want = Math.min(qty, Math.ceil(left / g.pts));
  if (want <= 0) return { taken: 0, pts: 0 };
  let taken = removeFromBag(p.inventory, id, want);
  if (taken < want && countInBank(p, id) > 0) taken += removeFromBank(p, id, want - taken);
  const pts = taken * g.pts;
  h.d[i] += pts;
  return { taken, pts };
}
