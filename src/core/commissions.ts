// 📜 Commissions (v0.0.2.41, owner: "a no harm no foul integration"). Each local day two townsfolk ask for 2–3 things
// from different skills — sized to a few minutes of work each, from what you can make now. Deliver from bag + bank
// for a generous reward: coins (well over the goods' value), bonus XP in each skill involved, and a rare find.
// Rewards are given by the store through the loot system.
import { ACTION_LIST, type ActionDef } from '../data/skills';
import { getItem, type SkillId } from '../data/items';
import { regionOpen } from '../data/tiers';
import { baseValue } from '../market/market';
import { countInBag, countInBank } from './inventory';
import { today } from './cozy';
import type { PlayerState } from './player';
import { levelForXp } from './xp';

export const CLIENTS = [
  { name: 'Bramble the innkeeper', emoji: '🍺', line: 'The harvest feast is coming and my larder is bare!' },
  { name: 'Captain Holt', emoji: '⚓', line: 'My ship sails at dawn — could you fill the hold?' },
  { name: 'Tilly the tinker', emoji: '🔧', line: 'I’ve a big order from the city and too few hands.' },
  { name: 'Granny Moss', emoji: '👵', line: 'My old bones can’t gather like they used to, dear.' },
  { name: 'Pip the courier', emoji: '📦', line: 'Three towns are waiting on this delivery!' },
  { name: 'Lord Ashby', emoji: '🎩', line: 'I’m hosting a grand dinner. Only the finest will do.' },
  { name: 'Rowan the ranger', emoji: '🏹', line: 'The watchtower needs stocking before winter.' },
  { name: 'Sister Wren', emoji: '🕯️', line: 'The chapel is mending its roof and feeding the poor.' },
];

const SKILLS: SkillId[] = ['mining', 'woodcutting', 'fishing', 'smithing', 'cooking', 'herblore', 'crafting', 'runecrafting'];

export interface Ask { item: string; qty: number; skill: SkillId; xp: number }
export interface Commission { client: number; asks: Ask[]; done: boolean }
export interface Commissions { day: string; list: Commission[] }

/** Things you can make now, per skill — the upper part of what you can do, so asks stay worth your time. */
function choicesBySkill(p: PlayerState): Map<SkillId, ActionDef[]> {
  const by = new Map<SkillId, ActionDef[]>();
  for (const a of ACTION_LIST) {
    if (!a.output || a.kind || a.lost || a.requires || !SKILLS.includes(a.skill)) continue;
    if (a.region && (!regionOpen(a.region) || !p.regions.includes(a.region))) continue;
    if (levelForXp(p.skills[a.skill].xp) < a.level) continue;
    const it = getItem(a.output.item);
    if (!it.stackable || ['weapon', 'armour', 'tool'].includes(it.category)) continue;
    by.set(a.skill, [...(by.get(a.skill) ?? []), a]);
  }
  for (const [k, list] of by) { list.sort((x, y) => x.level - y.level); by.set(k, list.slice(Math.floor(list.length * 0.5))); }
  return by;
}

function rngFrom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let s = h >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function makeCommissions(p: PlayerState, day: string): Commissions {
  const r = rngFrom(`com-${day}-${p.createdAt ?? 0}`);
  const by = choicesBySkill(p);
  const skills = [...by.keys()];
  const list: Commission[] = [];
  const clients = [...CLIENTS.keys()].sort(() => r() - 0.5);
  for (let k = 0; k < 2 && skills.length >= 2; k++) {
    const pool = [...skills].sort(() => r() - 0.5).slice(0, skills.length >= 3 && r() < 0.6 ? 3 : 2);
    const asks: Ask[] = pool.map((skill) => {
      const options = by.get(skill)!;
      const a = options[Math.floor(r() * options.length)];
      const minutes = 5 + Math.floor(r() * 5);
      const per = a.output!.qty || 1;
      const qty = Math.max(5, Math.min(400, Math.round(((minutes * 60_000) / a.durationMs) * per / 5) * 5));
      return { item: a.output!.item, qty, skill, xp: Math.round((a.xp / per) * qty * 0.4) };
    });
    list.push({ client: clients[k % clients.length], asks, done: false });
  }
  return { day, list };
}

/** Today's commissions (made fresh each local day). */
export function ensureCommissions(p: PlayerState, now = Date.now()): Commissions {
  const day = today(now);
  if (!p.commissions || p.commissions.day !== day) p.commissions = makeCommissions(p, day);
  return p.commissions;
}

export const haveOf = (p: PlayerState, id: string) => countInBag(p.inventory, id) + countInBank(p, id);
export const canDeliver = (p: PlayerState, c: Commission) => !c.done && c.asks.every((a) => haveOf(p, a.item) >= a.qty);

/** Coins for a commission: 2.5× what the goods are worth, plus a little thank-you. */
export const commissionCoins = (c: Commission) => Math.round(c.asks.reduce((s, a) => s + baseValue(getItem(a.item)) * a.qty, 0) * 2.5 + 100);

export function loadCommissions(raw: unknown): Commissions | undefined {
  const r = raw as Commissions;
  if (!r || typeof r.day !== 'string' || !Array.isArray(r.list)) return undefined;
  const list = r.list.filter((c) => c && Array.isArray(c.asks) && c.asks.every((a) => a && typeof a.item === 'string' && Number(a.qty) > 0))
    .map((c) => ({ client: Math.max(0, Math.min(CLIENTS.length - 1, Math.floor(Number(c.client) || 0))), done: !!c.done,
      asks: c.asks.map((a) => ({ item: a.item, qty: Math.floor(Number(a.qty)), skill: a.skill, xp: Math.max(0, Math.floor(Number(a.xp) || 0)) })) }));
  return { day: r.day, list };
}
