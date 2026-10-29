// 🌱 Farming: plant seeds in your garden plots; they grow over real time (even while you're away).
// Harvest for crops and Farming XP. The "Garden Helpers" minigame lets you tend growing plots a little.
// Crops come from the central loot system (harvest_* tables).
import { CROPS, regionOpen, tierLevel, tierRegion, tierXp } from '../data/tiers';
import { getItem } from '../data/items';
import type { ProgressReport } from './idle';
import { addXp, equippedToolTier, skillLevel, toolSpeedMult } from './idle';
import { equipmentStats } from './equipment';
import { TOOL_TIERS } from '../data/items';
import { rollFestivalToken } from './festivals';
import { countInBag, removeFromBag } from './inventory';
import { giveLoot, rollLoot, rollPet } from './loot';
import type { PlayerState } from './player';

export const PLOTS = 4;

export interface Plot {
  /** Crop tier (index into CROPS). */
  crop: number;
  plantedAt: number;
  readyAt: number;
  /** Minutes saved by tending (Garden Helpers). */
  tendedMs: number;
}

const baseXp = (t: number) => (t === 0 ? 8 : t === 1 ? 12 : tierXp(t));
/** XP for planting a seed (small) and harvesting a plot (big). */
export const plantXp = (t: number) => Math.round(baseXp(t) * 4);
export const harvestXp = (t: number) => Math.round(baseXp(t) * 80);
/** Tending can cut at most this share of a crop's growing time. */
export const MAX_TEND_SHARE = 0.25;
/** Each tend saves this share of the growing time. */
export const TEND_SHARE = 0.02;

export function growMs(t: number) {
  return CROPS[t].growMinutes * 60_000;
}

export function plotReady(plot: Plot | null, now = Date.now()): boolean {
  return !!plot && now >= plot.readyAt;
}

export function whyCantPlant(p: PlayerState, i: number, seedId: string): string | null {
  const seed = getItem(seedId);
  if (seed.seedOf === undefined) return "That isn't a seed";
  if (i < 0 || i >= PLOTS) return 'No such plot';
  if (p.farm.plots[i]) return 'That plot is already growing something';
  const t = seed.seedOf;
  const region = tierRegion(t);
  if (!regionOpen(region) || !p.regions.includes(region)) return `Discover ${region} to grow ${CROPS[t].name.toLowerCase()}`;
  if (skillLevel(p, 'farming') < tierLevel(t)) return `Needs Farming ${tierLevel(t)}`;
  if (t > 0 && equippedToolTier(p, 'farming') < t) return `Equip a ${TOOL_TIERS[t].name} trowel (or better) to plant this`;
  if (countInBag(p.inventory, seedId) < 1) return `No ${seed.name} in your bag`;
  return null;
}

export function plant(p: PlayerState, i: number, seedId: string, report: ProgressReport, now = Date.now()): string | null {
  const why = whyCantPlant(p, i, seedId);
  if (why) return why;
  const t = getItem(seedId).seedOf!;
  removeFromBag(p.inventory, seedId, 1);
  // A better trowel makes crops grow a little faster.
  const speed = equipmentStats(p).farmingSpeed ?? 0;
  p.farm.plots[i] = { crop: t, plantedAt: now, readyAt: now + Math.round(growMs(t) * toolSpeedMult(speed)), tendedMs: 0 };
  addXp(p, { skill: 'farming' }, report, plantXp(t));
  return null;
}

/** Harvest one ready plot: crops (and sometimes seeds back) through the loot system, plus Farming XP. */
export function harvest(p: PlayerState, i: number, report: ProgressReport, now = Date.now()): boolean {
  const plot = p.farm.plots[i];
  if (!plot || !plotReady(plot, now)) return false;
  const loot = rollLoot(`harvest_${CROPS[plot.crop].key}`);
  giveLoot(p, loot);
  for (const st of loot) report.gained[st.id] = (report.gained[st.id] ?? 0) + st.qty;
  addXp(p, { skill: 'farming' }, report, harvestXp(plot.crop));
  // 🎪 Harvesting is worth a few festival rolls (it's a big, slow action).
  for (let k = 0; k < 5; k++) rollFestivalToken(p, report, now);
  report.actions++;
  const pet = rollPet(p, 'farming');
  if (pet) report.pets.push(pet);
  p.farm.plots[i] = null;
  return true;
}

/** 🐛 Garden Helpers: shoo a pest or pull a weed on a growing plot — a little XP, and it grows a bit faster. */
export function tend(p: PlayerState, i: number, report: ProgressReport, now = Date.now()): boolean {
  const plot = p.farm.plots[i];
  if (!plot || plotReady(plot, now)) return false;
  const total = growMs(plot.crop);
  const save = Math.min(total * TEND_SHARE, total * MAX_TEND_SHARE - plot.tendedMs);
  if (save > 0) { plot.readyAt -= save; plot.tendedMs += save; }
  addXp(p, { skill: 'farming' }, report, Math.max(1, Math.round(baseXp(plot.crop) * 1.5)));
  return true;
}

/** Seeds in the bag that can be planted right now. */
export function plantableSeeds(p: PlayerState): string[] {
  return CROPS.map((c) => `${c.key}_seed`).filter((id) => countInBag(p.inventory, id) > 0 && !whyCantPlant({ ...p, farm: { plots: [null, null, null, null] } }, 0, id));
}
