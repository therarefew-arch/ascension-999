// Travelling between towns. Walking is free (idle slots keep working); fast travel is instant for coins.
import { ALL_SKILLS } from '../data/skills';
import { OPEN_REGIONS, REGION_INFO, type Region } from '../data/tiers';
import type { PlayerState } from './player';
import { levelForXp } from './xp';

export function highestSkill(p: PlayerState): number {
  return Math.max(...ALL_SKILLS.map((s) => levelForXp(p.skills[s].xp)));
}

/** Why you can't go to a region right now (null = you can). */
export function whyCantTravel(p: PlayerState, to: Region, fast: boolean): string | null {
  const info = REGION_INFO[to];
  if (!OPEN_REGIONS.includes(to) || !info) return `${to} is coming in a future update`;
  if (p.location === to && !p.travel) return `You're already in ${to}`;
  if (p.travel) return `You're already on the road to ${p.travel.to}`;
  if (highestSkill(p) < info.unlockLevel) return `The road opens when any skill reaches level ${info.unlockLevel}`;
  if (fast) {
    if (!p.regions.includes(to)) return 'Walk there once first — you can only fast travel to places you know';
    if (p.coins < info.fastTravelCoins) return `Fast travel costs ${info.fastTravelCoins} coins`;
  }
  return null;
}

export function startWalk(p: PlayerState, to: Region, now = Date.now()): string | null {
  const why = whyCantTravel(p, to, false);
  if (why) return why;
  p.travel = { to, startedAt: now, arriveAt: now + REGION_INFO[to]!.walkMs };
  return null;
}

export function fastTravel(p: PlayerState, to: Region): string | null {
  const why = whyCantTravel(p, to, true);
  if (why) return why;
  p.coins -= REGION_INFO[to]!.fastTravelCoins;
  arrive(p, to);
  return null;
}

/** Returns the region if you just arrived somewhere new (first visit), else null. */
export function arrive(p: PlayerState, to: Region): Region | null {
  const firstVisit = !p.regions.includes(to);
  p.location = to;
  p.travel = null;
  if (firstVisit) p.regions.push(to);
  return firstVisit ? to : null;
}

/** Called by the game clock: finishes a walk when its time is up. */
export function checkArrival(p: PlayerState, now = Date.now()): { arrived: Region; firstVisit: boolean } | null {
  if (!p.travel || now < p.travel.arriveAt) return null;
  const to = p.travel.to;
  const first = arrive(p, to);
  return { arrived: to, firstVisit: !!first };
}
