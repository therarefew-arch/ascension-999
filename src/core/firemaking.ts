// Firemaking extras: bonfires (a big burn with a cozy XP buff) and the Wildfire mini boss.
import { getItem } from '../data/items';
import { ACTIONS } from '../data/skills';
import { addXp, emptyReport, skillLevel, type ProgressReport } from './idle';
import { countInBag, removeFromBag } from './inventory';
import { giveLoot, rollLoot } from './loot';
import type { PlayerState } from './player';
import { regionOpen, tierLevel, tierRegion, WOODS, type Region } from '../data/tiers';

// ----- Bonfires -----

export const BONFIRE_LOGS = 20;
/** XP buff for all skills while a bonfire burns. */
export const BONFIRE_XP_BONUS = 0.05;
/** Every wood tier can fuel a bonfire; better logs burn longer (up to an hour). */
export const BONFIRES: Record<string, { minutes: number; burnAction: string; level: number; region: Region }> = Object.fromEntries(
  WOODS.map((w, t) => [`${w.key}_logs`, { minutes: Math.min(60, 10 * (t + 1)), burnAction: `burn_${w.key}`, level: tierLevel(t) + 5, region: tierRegion(t) }]),
);

export function bonfireActive(p: PlayerState, now = Date.now()): boolean {
  return !!p.bonfire && p.bonfire.until > now;
}

/** Burns 20 logs at once: Firemaking XP (×1.2) and +5% XP to all skills for a while. */
export function lightBonfire(p: PlayerState, log: string, report: ProgressReport, now = Date.now()): string | null {
  const b = BONFIRES[log];
  if (!b) return "That can't fuel a bonfire";
  if (!regionOpen(b.region)) return `Found in ${b.region} — coming in a future update`;
  if (!p.regions.includes(b.region)) return `Travel to ${b.region} to unlock this`;
  if (skillLevel(p, 'firemaking') < b.level) return `Needs Firemaking level ${b.level}`;
  if (countInBag(p.inventory, log) < BONFIRE_LOGS) return `Needs ${BONFIRE_LOGS} ${getItem(log).name} in your bag`;
  removeFromBag(p.inventory, log, BONFIRE_LOGS);
  report.used[log] = (report.used[log] ?? 0) + BONFIRE_LOGS;
  addXp(p, { skill: 'firemaking' }, report, ACTIONS[b.burnAction].xp * BONFIRE_LOGS * 1.2);
  const start = bonfireActive(p, now) ? p.bonfire!.until : now;
  p.bonfire = { until: start + b.minutes * 60_000, log };
  return null;
}

// ----- Wildfire mini boss (rhythm game) -----

export const WILDFIRE = {
  level: 20,
  respawnMs: 15 * 60 * 1000,
  /** Share of flames you must douse to tame it. */
  winShare: 0.6,
  durationMs: 40_000,
};

export function wildfireReady(p: PlayerState, now = Date.now()): number {
  return Math.max(0, (p.bossReadyAt.wildfire ?? 0) - now);
}

/** Finishes a Wildfire run. Win = loot (through the loot system, can include gems) + big XP; else a little XP. */
export function finishWildfire(p: PlayerState, hits: number, total: number, now = Date.now()) {
  const report = emptyReport(null);
  const share = total ? hits / total : 0;
  const won = share >= WILDFIRE.winShare;
  addXp(p, { skill: 'firemaking' }, report, Math.round((won ? 400 : 60) + hits * 6 + skillLevel(p, 'firemaking') * (won ? 4 : 0)));
  if (won) {
    const loot = rollLoot('boss_wildfire');
    giveLoot(p, loot);
    for (const st of loot) report.gained[st.id] = (report.gained[st.id] ?? 0) + st.qty;
    p.bossReadyAt.wildfire = now + WILDFIRE.respawnMs;
  }
  return { won, share, report };
}
