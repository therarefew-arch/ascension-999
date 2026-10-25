// 📋 The Bounty Board (Combat): three bounties a day on monsters from towns you've discovered.
// Each pays coins plus a rare find (nest, geode or bottle). One free reroll a day.
// Rewards go through the central loot system.
import { MONSTERS, type MonsterDef } from '../data/monsters';
import { LOOT_TABLES } from '../data/lootTables';
import { today } from './cozy';
import { giveLoot } from './loot';
import type { ItemStack, PlayerState } from './player';
import type { ProgressReport } from './idle';
import { levelForXp } from './xp';

export interface Bounty {
  monster: string;
  goal: number;
  progress: number;
  coins: number;
  /** The rare find that comes with it. */
  find: string;
  claimed: boolean;
}

const FINDS = ['bird_nest', 'geode', 'message_bottle'];

/** Your combat level for bounties: your best attack style, or Defense/Health if higher. */
export function combatLevel(p: PlayerState): number {
  return Math.max(...(['melee', 'ranged', 'magic', 'defense', 'health'] as const).map((s) => levelForXp(p.skills[s].xp)));
}

/** Monsters you could reasonably hunt: regular monsters in discovered towns, up to a little above your level. */
export function bountyMonsters(p: PlayerState): MonsterDef[] {
  const lvl = combatLevel(p);
  const ok = MONSTERS.filter((m) => !m.miniboss && !m.weekly && p.regions.includes(m.region as never) && m.level <= lvl + 10);
  return ok.length ? ok : MONSTERS.filter((m) => m.region === 'Pocketvale' && !m.miniboss).slice(0, 1);
}

function avgCoins(m: MonsterDef): number {
  const coins = LOOT_TABLES[m.lootTable]?.entries.find((e) => e.item === 'coins');
  return coins ? (coins.min + coins.max) / 2 : 5;
}

function makeBounty(m: MonsterDef, rng: () => number): Bounty {
  const goal = 15 + Math.floor(rng() * 4) * 5;
  return {
    monster: m.id,
    goal,
    progress: 0,
    coins: Math.round(avgCoins(m) * goal * 0.6 + m.level * 10),
    find: FINDS[Math.floor(rng() * FINDS.length)],
    claimed: false,
  };
}

/** Three bounties, favouring the strongest monsters you can handle (and no repeats when possible). */
export function makeBounties(p: PlayerState, rng: () => number = Math.random): Bounty[] {
  const pool = [...bountyMonsters(p)].sort((a, b) => b.level - a.level).slice(0, 6);
  const out: Bounty[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const options = pool.filter((m) => !used.has(m.id));
    const m = (options.length ? options : pool)[Math.floor(rng() * (options.length || pool.length))];
    used.add(m.id);
    out.push(makeBounty(m, rng));
  }
  return out;
}

/** Makes sure today's bounties exist. */
export function ensureBounties(p: PlayerState, now = Date.now()) {
  if (p.bounties.day !== today(now)) p.bounties = { day: today(now), list: makeBounties(p), rerolled: false };
}

/** Counts kills of a bounty's monster. */
export function trackBounties(p: PlayerState, report: ProgressReport | null, monsterId: string | undefined) {
  if (!report?.combat?.kills || !monsterId) return;
  for (const b of p.bounties.list) {
    if (!b.claimed && b.monster === monsterId) b.progress = Math.min(b.goal, b.progress + report.combat.kills);
  }
}

export function claimBounty(p: PlayerState, i: number): ItemStack[] | null {
  const b = p.bounties.list[i];
  if (!b || b.claimed || b.progress < b.goal) return null;
  b.claimed = true;
  const reward: ItemStack[] = [{ id: 'coins', qty: b.coins }, { id: b.find, qty: 1 }];
  giveLoot(p, reward);
  return reward;
}

/** Swap one unfinished bounty for a new one (once a day, free). */
export function rerollBounty(p: PlayerState, i: number, rng: () => number = Math.random): boolean {
  const b = p.bounties.list[i];
  if (!b || b.claimed || p.bounties.rerolled) return false;
  const pool = bountyMonsters(p).filter((m) => !p.bounties.list.some((x) => x.monster === m.id));
  const choices = pool.length ? pool : bountyMonsters(p);
  p.bounties.list[i] = makeBounty(choices[Math.floor(rng() * choices.length)], rng);
  p.bounties.rerolled = true;
  return true;
}
