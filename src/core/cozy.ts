// Cozy daily things: a daily gift with a streak, and three small Town Requests each day.
// All rewards go through the central loot system (giveLoot).
import { getItem, type SkillId } from '../data/items';
import { ACTION_LIST, SKILL_ORDER, SKILLS, type ActionDef } from '../data/skills';
import { REGIONS, regionOpen, tierRegion } from '../data/tiers';
import { LORE, LORE_FIND_CHANCE, type LoreNote } from '../data/lore';
import type { ProgressReport } from './idle';
import { giveLoot } from './loot';
import type { ItemStack, PlayerState } from './player';
import { levelForXp, xpToNext } from './xp';

/** Today's date in the player's own time zone, e.g. "2026-10-24". */
export function today(now = Date.now()): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function yesterday(now = Date.now()) {
  return today(now - 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Daily gift
// ---------------------------------------------------------------------------

export function giftReady(p: PlayerState, now = Date.now()) {
  return p.daily.lastDay !== today(now);
}

/** What tomorrow's (or today's) gift will be for a given streak day (1–7, then stays at 7). */
export function giftFor(streak: number): ItemStack[] {
  const d = Math.min(7, Math.max(1, streak));
  const gift: ItemStack[] = [{ id: 'coins', qty: 100 * d }];
  gift.push({ id: d >= 4 ? 'great_shrimp' : 'cooked_shrimp', qty: 5 + d });
  if (d >= 2) gift.push({ id: 'pine_logs', qty: 10 * d });
  if (d >= 3) gift.push({ id: 'rune_essence', qty: 10 * d });
  if (d >= 5) gift.push({ id: 'bronze_bar', qty: 5 * d });
  if (d >= 7) gift.push({ id: 'coins', qty: 500 });
  return gift;
}

export function claimGift(p: PlayerState, now = Date.now()): { streak: number; gift: ItemStack[] } | null {
  if (!giftReady(p, now)) return null;
  const streak = p.daily.lastDay === yesterday(now) ? p.daily.streak + 1 : 1;
  const gift = giftFor(streak);
  giveLoot(p, gift);
  p.daily = { lastDay: today(now), streak };
  return { streak, gift };
}

// ---------------------------------------------------------------------------
// Town Requests: 3 small goals a day
// ---------------------------------------------------------------------------

export type RequestKind = 'item' | 'xp' | 'kills' | 'minigames';
export interface TownRequest {
  kind: RequestKind;
  /** Item id (item), skill id (xp). */
  target?: string;
  goal: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

/** Gathering/processing actions the player can actually do right now (for "collect" requests). */
function doableItemActions(p: PlayerState): ActionDef[] {
  return ACTION_LIST.filter((a) =>
    a.output && !a.kind && !a.requires && (a.skill === 'mining' || a.skill === 'woodcutting' || a.skill === 'fishing' || a.skill === 'smithing' || a.skill === 'cooking')
    && (!a.region || (regionOpen(a.region) && p.regions.includes(a.region)))
    && levelForXp(p.skills[a.skill].xp) >= a.level
    && getItem(a.output.item).stackable,
  );
}

function pick<T>(list: T[], rng: () => number): T {
  return list[Math.floor(rng() * list.length)];
}

export function makeRequests(p: PlayerState, rng: () => number = Math.random): TownRequest[] {
  const out: TownRequest[] = [];
  const items = doableItemActions(p);
  if (items.length) {
    const a = pick(items, rng);
    const tier = a.region ? Math.max(0, REGIONS.indexOf(a.region)) : 0;
    out.push({ kind: 'item', target: a.output!.item, goal: 25 + Math.floor(rng() * 4) * 10, progress: 0, reward: 150 + 150 * tier, claimed: false });
  }
  const skill = pick(SKILL_ORDER.filter((s) => s !== out[0]?.target), rng) as SkillId;
  const lvl = levelForXp(p.skills[skill].xp);
  out.push({ kind: 'xp', target: skill, goal: Math.max(200, Math.round(xpToNext(lvl) * 0.6 / 50) * 50), progress: 0, reward: 200 + Math.min(800, lvl * 4), claimed: false });
  const fought = p.skills.melee.xp + p.skills.ranged.xp + p.skills.magic.xp > 0;
  out.push(fought && rng() < 0.6
    ? { kind: 'kills', goal: 15 + Math.floor(rng() * 3) * 5, progress: 0, reward: 250, claimed: false }
    : { kind: 'minigames', goal: 10, progress: 0, reward: 200, claimed: false });
  return out;
}

/** Makes sure today's requests exist (new ones each day). */
export function ensureRequests(p: PlayerState, now = Date.now()) {
  if (p.requests.day !== today(now)) p.requests = { day: today(now), tasks: makeRequests(p), bonusClaimed: false };
}

export function requestLabel(r: TownRequest): string {
  switch (r.kind) {
    case 'item': return `Collect ${r.goal} ${getItem(r.target!).name}`;
    case 'xp': return `Earn ${r.goal.toLocaleString()} ${SKILLS[r.target as SkillId].name} XP`;
    case 'kills': return `Defeat ${r.goal} monsters`;
    case 'minigames': return `Play ${r.goal} minigame rounds`;
  }
}

/** Counts progress from anything that happened (idle, minigames, fights). */
export function trackRequests(p: PlayerState, report: ProgressReport | null, minigameRounds = 0) {
  ensureRequests(p);
  for (const r of p.requests.tasks) {
    if (r.claimed || r.progress >= r.goal) continue;
    let add = 0;
    if (report) {
      if (r.kind === 'item') add = report.gained[r.target!] ?? 0;
      if (r.kind === 'xp') add = report.xp[r.target as SkillId] ?? 0;
      if (r.kind === 'kills') add = report.combat?.kills ?? 0;
    }
    if (r.kind === 'minigames') add += minigameRounds;
    r.progress = Math.min(r.goal, r.progress + add);
  }
}

export function claimRequest(p: PlayerState, i: number): number | null {
  const r = p.requests.tasks[i];
  if (!r || r.claimed || r.progress < r.goal) return null;
  r.claimed = true;
  giveLoot(p, [{ id: 'coins', qty: r.reward }]);
  return r.reward;
}

/** Finish all three for a bonus bundle. */
export const REQUEST_BONUS: ItemStack[] = [{ id: 'coins', qty: 500 }, { id: 'great_shrimp', qty: 10 }, { id: 'rune_essence', qty: 30 }];
export function claimRequestBonus(p: PlayerState): boolean {
  if (p.requests.bonusClaimed || !p.requests.tasks.every((r) => r.claimed)) return false;
  p.requests.bonusClaimed = true;
  giveLoot(p, REQUEST_BONUS);
  return true;
}

/** Anything waiting to be claimed? (shows a little dot) */
export function cozyBadge(p: PlayerState, now = Date.now()): boolean {
  if (giftReady(p, now)) return true;
  if (p.requests.day !== today(now)) return true;
  return p.requests.tasks.some((r) => !r.claimed && r.progress >= r.goal) || (!p.requests.bonusClaimed && p.requests.tasks.every((r) => r.claimed));
}

// ---------------------------------------------------------------------------
// Lucky Stars: every so often a star drifts across the screen — tap it for a small surprise.
// ---------------------------------------------------------------------------

/** Minutes between stars (random in this range) and how long one stays on screen. */
export const STAR = { minGapMs: 6 * 60_000, maxGapMs: 12 * 60_000, visibleMs: 14_000 };

export function nextStarDelay(rng: () => number = Math.random) {
  return STAR.minGapMs + rng() * (STAR.maxGapMs - STAR.minGapMs);
}

/** The surprise: coins that grow with your total level, and often a handful of your best gatherable resource. */
export function luckyStarLoot(p: PlayerState, rng: () => number = Math.random): ItemStack[] {
  const total = Object.values(p.skills).reduce((s, sk) => s + levelForXp(sk.xp), 0);
  const loot: ItemStack[] = [{ id: 'coins', qty: Math.round(40 + total * 0.5 + rng() * 60) }];
  if (rng() < 0.6) {
    const gather = ACTION_LIST.filter((a) => a.output && !a.kind && !a.inputs.length
      && (a.skill === 'mining' || a.skill === 'woodcutting' || a.skill === 'fishing')
      && (!a.region || (regionOpen(a.region) && p.regions.includes(a.region)))
      && levelForXp(p.skills[a.skill].xp) >= a.level);
    if (gather.length) {
      const best = [...gather].sort((a, b) => b.level - a.level).slice(0, 3);
      const a = pick(best, rng);
      loot.push({ id: a.output!.item, qty: 5 + Math.floor(rng() * 8) });
    }
  }
  return loot;
}

export function catchStar(p: PlayerState): ItemStack[] {
  const loot = luckyStarLoot(p);
  giveLoot(p, loot);
  p.starsCaught += 1;
  return loot;
}

// ---------------------------------------------------------------------------
// Skill goals (🎯)
// ---------------------------------------------------------------------------

/** Handy targets to pick from: next 10, next tier (every 90), next 100, and 999. */
export function goalChoices(level: number): number[] {
  const opts = new Set<number>();
  if (level < 999) opts.add(Math.min(999, Math.floor(level / 10) * 10 + 10));
  if (level < 900) opts.add(Math.floor(level / 90) * 90 + 90);
  if (level < 900) opts.add(Math.floor(level / 100) * 100 + 100);
  if (level < 999) opts.add(999);
  return [...opts].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Lore notes (📜 Tales in the Journal)
// ---------------------------------------------------------------------------

function learn(p: PlayerState, note: LoreNote, out: LoreNote[]) {
  if (p.lore.includes(note.id)) return;
  p.lore.push(note.id);
  out.push(note);
}

/** Gives notes you've earned: arriving in a town, and having beaten its mini boss. */
export function syncLore(p: PlayerState): LoreNote[] {
  const found: LoreNote[] = [];
  for (const n of LORE) {
    if (n.trigger === 'arrive' && p.regions.includes(n.region)) learn(p, n, found);
    if (n.trigger === 'boss' && n.boss && p.bossReadyAt[n.boss] !== undefined) learn(p, n, found);
  }
  return found;
}

/** A chance to find the current town's hidden note, once per finished action there. */
export function rollLoreFind(p: PlayerState, actions: number, rng: () => number = Math.random): LoreNote | null {
  if (actions <= 0 || p.travel) return null;
  const note = LORE.find((n) => n.trigger === 'find' && n.region === p.location && !p.lore.includes(n.id));
  if (!note) return null;
  const chance = 1 - Math.pow(1 - LORE_FIND_CHANCE, Math.min(actions, 2000));
  if (rng() >= chance) return null;
  const out: LoreNote[] = [];
  learn(p, note, out);
  return note;
}

export { tierRegion };
