// 🤝 Co-op dungeon (v0.0.2.0, owner: "could we have an option to link up and dungeon together?"). Two phones in one
// dungeon room. The party leader's phone runs the room (core/dungeon.ts with a second seat, `d.ally`); the friend's
// phone sends its button presses and draws the room from pictures the leader sends ~16 times a second.
//
// The live connection goes through the notification server (push-server/, a party room per 5-letter code). It only
// passes messages between the two phones and stores nothing. Rewards never travel over it as items: each phone pays
// its own player through the loot system for every monster beaten (owner: "tougher, better loot" — each gets the
// full loot of every kill).
import { PUSH_SERVER } from './push';
import { swapSeats, type Dungeon, type HeroCard, type Input } from './dungeon';
import type { Room } from './dungeonRun';
import type { Region } from '../data/tiers';

export type PartyRole = 'lead' | 'friend';

/** Messages between the two phones. */
export type PartyMsg =
  // from the server
  | { t: 'hello'; as: PartyRole; peer: boolean }
  | { t: 'peer'; on: boolean }
  | { t: 'nope'; why: string }
  // leader → friend
  | { t: 'party'; region: Region; lead: string }
  | { t: 'start'; d: Dungeon; room: number }
  | { t: 's'; s: Partial<Dungeon>; k?: { m: string; boss?: boolean }[]; snd?: string[]; g?: number; o?: number }
  | { t: 'end'; won: boolean }
  // 🗝️ An extraction run together (v0.0.2.4): the run is starting (gear up), the leader's map, which room they
  // walked into, back to the map without finishing a room, and getting out together.
  | { t: 'mode'; run: boolean }
  | { t: 'run'; rows: Room[][] }
  | { t: 'go'; i: number }
  | { t: 'abort' }
  | { t: 'extract' }
  // friend → leader
  | { t: 'card'; card: HeroCard }
  /** In a run together: geared up and in (and later, health/food updates between rooms). */
  | { t: 'ready'; card: HeroCard }
  | { t: 'cant'; why: string }
  | { t: 'in'; i: Input }
  | { t: 'sk'; i: number }
  | { t: 'eat' }
  | { t: 'bar'; bar: (string | null)[] }
  // either
  | { t: 'bye' };

/** While testing on a computer the server can be a local copy (`npx wrangler dev` in push-server/). */
function server(): string {
  try { if (import.meta.env.DEV) { const s = localStorage.getItem('ui.partyServer'); if (s) return s; } } catch { /* fine */ }
  return PUSH_SERVER;
}

/** Ask the server for a fresh party code. */
export async function newPartyCode(): Promise<string> {
  const r = await fetch(`${server()}/party/new`);
  if (!r.ok) throw new Error('The party server did not answer');
  return ((await r.json()) as { code: string }).code;
}
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

export interface PartyLink { send(m: PartyMsg): void; close(): void; open(): boolean }
/** Connect to a party. `on.state` hears 'open', 'closed' (with a reason) or 'error'. */
export function joinParty(code: string, role: PartyRole, on: { msg(m: PartyMsg): void; state(s: 'open' | 'closed', why?: string): void }): PartyLink {
  const url = `${server().replace(/^http/, 'ws')}/party/${encodeURIComponent(code)}?as=${role}`;
  const ws = new WebSocket(url);
  let closedByUs = false;
  let why: string | undefined;
  ws.onopen = () => on.state('open');
  ws.onmessage = (e) => {
    let m: PartyMsg;
    try { m = JSON.parse(typeof e.data === 'string' ? e.data : ''); } catch { return; }
    if (m.t === 'nope') why = m.why;
    on.msg(m);
  };
  ws.onclose = () => { if (!closedByUs) on.state('closed', why ?? 'The connection was lost'); };
  ws.onerror = () => { why ??= "Couldn't reach the party server"; };
  return {
    send: (m) => { if (ws.readyState === WebSocket.OPEN) ws.send(pack(m)); },
    close: () => { closedByUs = true; try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'bye' })); ws.close(1000, 'bye'); } catch { /* gone */ } },
    open: () => ws.readyState === WebSocket.OPEN,
  };
}

/** Numbers to 2 decimals and no per-shot hit lists — keeps a room picture to a few KB. */
const pack = (m: unknown) => JSON.stringify(m, (k, v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : k === 'hit' && Array.isArray(v) ? undefined : v));

/** What changes in a room from moment to moment (the rest — ledges, looks, damage tables — comes once with 'start'). */
const LIVE = ['hero', 'ally', 'mobs', 'shots', 'pops', 'fx', 'phase', 't', 'shake', 'combo', 'comboT', 'banner', 'golds', 'chests', 'treats', 'falls', 'wave', 'gust', 'traps', 'cd', 'snacks', 'kills', 'bossSeen', 'bx', 'dark'] as const;
export function roomPicture(d: Dungeon): Partial<Dungeon> {
  const o: Record<string, unknown> = {};
  for (const k of LIVE) o[k] = (d as unknown as Record<string, unknown>)[k];
  return o as Partial<Dungeon>;
}

/** On the friend's phone: the room as the friend sees it — the friend is `hero` (so the camera and the
 * controls follow them) and the leader is the `ally`. Positions are blended between the last two pictures so the
 * monsters glide instead of jumping. */
export function friendView(base: Dungeon, prev: Partial<Dungeon> | null, cur: Partial<Dungeon>, k: number): Dungeon {
  const v = { ...base, ...cur, seat: 0 } as Dungeon;
  if (v.ally) v.ally = { ...v.ally };
  if (prev && k < 1) {
    const lerp = (a: number, b: number) => a + (b - a) * k;
    if (prev.hero && cur.hero) v.hero = { ...cur.hero, x: lerp(prev.hero.x, cur.hero.x), y: lerp(prev.hero.y, cur.hero.y) };
    if (prev.ally && cur.ally && v.ally) v.ally.hero = { ...cur.ally.hero, x: lerp(prev.ally.hero.x, cur.ally.hero.x), y: lerp(prev.ally.hero.y, cur.ally.hero.y) };
    if (prev.mobs && cur.mobs) {
      const was = new Map(prev.mobs.map((m) => [m.id, m]));
      v.mobs = cur.mobs.map((m) => { const p = was.get(m.id); return p ? { ...m, x: lerp(p.x, m.x), y: lerp(p.y, m.y) } : m; });
    }
  }
  swapSeats(v);
  return v;
}

/** The name you go by in a party (your guild name if you have one). */
export function partyName(guildName?: string): string {
  try { const n = localStorage.getItem('ui.partyName'); if (n) return n; } catch { /* fine */ }
  return guildName || 'Adventurer';
}
export function savePartyName(n: string) { try { localStorage.setItem('ui.partyName', n.slice(0, 16)); } catch { /* full */ } }
