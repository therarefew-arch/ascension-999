// 👪 Family (v0.0.1.55; weekly goal + Hearth Together in v0.0.1.56): play alongside your family — an invite link, a family board with everyone's
// adventurer, a feed of big moments you can cheer, and a friendly once-a-day nudge.
// The server is the notification server (push-server/, routes /family/*). No accounts: each save slot
// that joins gets a member id + secret token, kept in `player.family`.
// This file talks to the server and decides what goes on the board; it never changes items or XP.
import { ACTIONS, ALL_SKILLS, SKILLS } from '../data/skills';
import { getItem, type EquipSlot, type SkillId } from '../data/items';
import { PET_MAP } from '../data/pets';
import { PUSH_SERVER, pushSubscription } from './push';
import type { PlayerState } from './player';
import { levelForXp } from './xp';

export interface FamilyLink {
  /** Family id (it's in the invite link). */
  f: string;
  /** Your member id and secret token. */
  m: string;
  t: string;
  /** The family's name, and the name you go by in it. */
  family: string;
  me: string;
}

/** The small summary of your adventurer that your family sees. */
export interface FamilySnap {
  town?: string;
  total?: number;
  best?: { skill: SkillId; level: number };
  idle?: string[];
  eq?: Partial<Record<EquipSlot, string>>;
  pet?: string;
}
export interface FamilyMember { id: string; name: string; updated: number; snap: FamilySnap }
export interface FamilyMoment { id: number; member: string; kind: string; text: string; at: number; cheers: string[] }
/** This week's family goal (the server adds up everyone's counts). */
export interface FamilyGoal { week: string; kind: string; label: string; steps: number[]; total: number; by: Record<string, number> }
export interface FamilyBoard { name: string; members: FamilyMember[]; feed: FamilyMoment[]; now: number; goal?: FamilyGoal }

// ----- 🏆 Weekly family goal + 🔥 Hearth Together (v0.0.1.56) -----
/** Your own counts for this week's family goal (logs chopped, monsters defeated…), and steps claimed. */
export interface FamilyWeek { week: string; n: Record<string, number>; claimed: number }

const pad = (n: number) => String(n).padStart(2, '0');
/** The phone's local day, e.g. "2026-10-30". */
export function dayKey(at = Date.now()): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** The Monday this week started (the goal resets every Monday). */
export function weekKey(at = Date.now()): string {
  const d = new Date(at);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d.getTime());
}
/** When the week's goal resets (next Monday, midnight). */
export function nextWeekStart(at = Date.now()): number {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (7 - ((d.getDay() + 6) % 7)));
  return d.getTime();
}
/** Which counters can be goals (the server picks one a week). */
export const GOAL_SKILLS = new Set(['woodcutting', 'mining', 'fishing', 'cooking', 'smithing', 'crafting']);
export const GOAL_EMOJI: Record<string, string> = {
  woodcutting: '🪓', mining: '⛏️', fishing: '🎣', cooking: '🍲', smithing: '🔨', crafting: '🧵', kills: '⚔️', any: '✨',
};
export const MEDALS = ['🥉', '🥈', '🥇'];
export const MEDAL_NAMES = ['Bronze', 'Silver', 'Gold'];

/** Counts something you did toward the weekly family goal (only while in a family). */
export function familyCount(p: PlayerState, kind: string, n = 1): void {
  if (!p.family) return;
  const wk = weekKey();
  if (!p.familyWeek || p.familyWeek.week !== wk) p.familyWeek = { week: wk, n: {}, claimed: 0 };
  if (kind !== 'any' && kind !== 'kills' && !GOAL_SKILLS.has(kind)) kind = '';
  if (kind) p.familyWeek.n[kind] = (p.familyWeek.n[kind] ?? 0) + n;
  p.familyWeek.n.any = (p.familyWeek.n.any ?? 0) + n;
}
/** This week's own counts (empty if the saved ones are from last week). */
export function thisWeek(p: PlayerState): FamilyWeek {
  const wk = weekKey();
  return p.familyWeek?.week === wk ? p.familyWeek : { week: wk, n: {}, claimed: 0 };
}

/** 🔥 Hearth Together: +5% XP in every skill on a day someone else in your family also played. */
export const HEARTH_XP = 0.05;
export const hearthLit = (p: PlayerState, at = Date.now()) => !!p.family && p.hearth === dayKey(at);
/** Who else in the family has played today (their last check-in was today on this phone's clock). */
export function playedToday(board: FamilyBoard, me: string, at = Date.now()): FamilyMember[] {
  const today = dayKey(at);
  return board.members.filter((m) => m.id !== me && dayKey(m.updated) === today);
}

/** What each step of the weekly goal gives: coins by your best skill + a rare find (Gold: the family portrait, once). */
export function goalReward(bestLevel: number, step: number): { coins: number; find: boolean; keepsake: boolean } {
  const per = Math.round(30 + Math.min(999, bestLevel) * 0.9);
  return { coins: per * [4, 10, 20][step], find: true, keepsake: step === 2 };
}
export const FAMILY_KEEPSAKE = 'family_portrait';

const LOOK_SLOTS: EquipSlot[] = ['head', 'body', 'legs', 'weapon', 'shield'];

export function familySnap(p: PlayerState): FamilySnap {
  let best: { skill: SkillId; level: number } | undefined;
  let total = 0;
  for (const s of ALL_SKILLS) {
    const level = levelForXp(p.skills[s].xp);
    total += level;
    if (!best || level > best.level) best = { skill: s, level };
  }
  const idle = p.slots.filter(Boolean).map((sl) => {
    const a = ACTIONS[sl!.actionId];
    return a ? `${SKILLS[a.skill].name}: ${a.name}` : sl!.actionId.startsWith('fight') ? 'Fighting' : '';
  }).filter(Boolean).slice(0, 3);
  if (p.fight?.monsterId) idle.unshift('Fighting');
  const eq: Partial<Record<EquipSlot, string>> = {};
  for (const s of LOOK_SLOTS) if (p.equipment[s]) eq[s] = p.equipment[s];
  return { town: p.location, total, best, idle: [...new Set(idle)].slice(0, 3), eq, pet: p.activePet ? PET_MAP[p.activePet]?.emoji : undefined };
}

// ----- Big moments: queued while playing, sent with the next check-in -----
let pending: { kind: string; text: string; at: number }[] = [];
let flushSoon: (() => void) | null = null;

/** A big moment for the family feed (written without your name: "discovered Lunaria!"). */
export function familyMoment(p: PlayerState, kind: string, text: string): void {
  if (!p.family) return;
  pending.push({ kind, text, at: Date.now() });
  if (pending.length > 20) pending = pending.slice(-20);
  flushSoon?.();
}
/** The app sets this so a moment gets sent within a few seconds. */
export function onFamilyMoment(fn: (() => void) | null) { flushSoon = fn; }

/** Which level-ups the family hears about: every 10th level from 50 (and every level-up at 999). */
export function familyLevelMoment(skill: SkillId, from: number, to: number): string | null {
  if (to >= 999 && from < 999) return `mastered ${SKILLS[skill].name} — level 999!`;
  const step = Math.floor(to / 10) * 10;
  if (step >= 50 && step > from) return `reached ${SKILLS[skill].name} level ${step}`;
  return null;
}

/** Item names for the feed (e.g. Ascended finds). */
export const itemName = (id: string) => getItem(id).name;

// ----- Server calls -----
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PUSH_SERVER}/family/${path}`, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain' } });
  const data = await res.json().catch(() => ({}));
  if (res.status === 403) throw new Error('You are no longer in this guild');
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Could not reach the guild board');
  return data as T;
}

export async function createFamily(family: string, me: string): Promise<FamilyLink> {
  const r = await post<{ f: string; m: string; t: string; name: string }>('create', { family, name: me });
  return { f: r.f, m: r.m, t: r.t, family: r.name, me };
}

export async function familyInfo(f: string): Promise<{ name: string; count: number; full: boolean; members: string[] }> {
  const res = await fetch(`${PUSH_SERVER}/family/info?f=${encodeURIComponent(f)}`);
  if (res.status === 404) throw new Error('This invite is no longer valid — the guild may have been closed.');
  if (!res.ok) throw new Error('Could not reach the guild board');
  return res.json();
}

export async function joinFamily(f: string, me: string): Promise<FamilyLink> {
  const r = await post<{ f: string; m: string; t: string; name: string }>('join', { f, name: me });
  return { f: r.f, m: r.m, t: r.t, family: r.name, me };
}

const auth = (l: FamilyLink) => ({ f: l.f, m: l.m, t: l.t });

/** Check in: sends your summary + any big moments (+ your phone's push id), gets the board back. */
export async function syncFamily(p: PlayerState): Promise<FamilyBoard> {
  const link = p.family!;
  const events = pending;
  pending = [];
  try {
    const wk = thisWeek(p);
    return await post<FamilyBoard>('sync', { ...auth(link), name: link.me, snap: familySnap(p), events, sub: pushSubscription() ?? undefined, week: { week: wk.week, n: wk.n } });
  } catch (e) {
    pending = [...events, ...pending].slice(-20); // try those moments again next time
    throw e;
  }
}

export const cheerMoment = (l: FamilyLink, feed: number) => post<FamilyBoard>('cheer', { ...auth(l), feed, wk: weekKey() });
export const nudgeMember = (l: FamilyLink, to: string) => post<{ ok: boolean; why?: string; push?: boolean }>('nudge', { ...auth(l), to });
export const leaveFamily = (l: FamilyLink) => post<{ ok: boolean }>('leave', auth(l));

/** The invite link for a family. */
export function inviteLink(f: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}?family=${encodeURIComponent(f)}`;
}

// ----- The last board, shared with the Family tab -----
let board: FamilyBoard | null = null;
const listeners = new Set<() => void>();
export const lastBoard = () => board;
export function setBoard(b: FamilyBoard | null) {
  if (b && !b.goal && board?.goal) b = { ...b, goal: board.goal }; // a cheer's answer has no goal in it
  board = b; listeners.forEach((fn) => fn()); }
export function subscribeBoard(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

// ----- Invite links: remembered until a save slot is open -----
const JOIN_KEY = 'a999.familyInvite';
/** On start-up: pick the family id out of the address (and tidy the address). */
export function captureInvite(): void {
  try {
    const url = new URL(location.href);
    const f = url.searchParams.get('family');
    if (!f) return;
    sessionStorage.setItem(JOIN_KEY, f);
    url.searchParams.delete('family');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  } catch { /* ignore */ }
}
export function pendingInvite(): string | null { try { return sessionStorage.getItem(JOIN_KEY); } catch { return null; } }
export function clearInvite(): void { try { sessionStorage.removeItem(JOIN_KEY); } catch { /* ignore */ } }

/** The name you used last time (handy for the second save slot). */
const NAME_KEY = 'a999.familyName';
export function lastFamilyName(): string { try { return localStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; } }
export function rememberFamilyName(n: string) { try { localStorage.setItem(NAME_KEY, n); } catch { /* ignore */ } }

/** "playing now" / "12m ago" / "3h ago" / "2d ago". */
export function seen(at: number, now: number): string {
  const m = Math.max(0, Math.round((now - at) / 60_000));
  if (m < 5) return 'playing now';
  if (m < 60) return `${m}m ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

/** An emoji for each kind of moment. */
export const MOMENT_ICON: Record<string, string> = {
  join: '👋', leave: '🚪', town: '🗺️', level: '⭐', master: '✦', boss: '🏆', ascended: '🌟', pet: '🐾', parade: '🎪', wall: '🛡️', dawn: '🏮', fish: '🐟', goal: '🏆',
};
