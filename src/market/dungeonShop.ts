// 🧺 Wick's stall — the trader inside the extraction dungeon (v0.0.1.79, owner: "collect gold and stuff inside the
// dungeon, maybe one of the random paths you can choose from is a shop keeper where you can sell and stuff").
// Prices only (no player data here). Everything is paid in the gold of your run bag — gold you lose if you're
// knocked out, and keep if you get out.
import { getItem } from '../data/items';
import { FISH, REGIONS, type Region } from '../data/tiers';
import { getTable } from '../core/loot';
import { townMonsters } from '../core/expedition';
import { baseValue, sellPrice } from './market';

/** Wick pays a little better than the Trading Post — it's risky down there. */
export const SELL_BONUS = 1.25;
/** A healing draught heals this share of your health at once. */
export const DRAUGHT_HEAL = 0.5;

/** Coins one of the town's monsters drops on average (sets the dungeon's gold and prices). */
export function killValue(region: Region): number {
  const mobs = townMonsters(region);
  if (!mobs.length) return 50;
  let total = 0;
  for (const m of mobs) {
    const t = getTable(m.lootTable);
    for (const e of t.entries) if (e.item === 'coins') total += e.chance * ((e.min + e.max) / 2);
    for (const g of t.groups ?? []) {
      const w = g.items.reduce((n, x) => n + x.weight, 0) || 1;
      total += g.chance * g.items.reduce((n, x) => n + (x.item === 'coins' ? x.weight / w : 0), 0);
    }
  }
  return Math.max(5, Math.round(total / mobs.length));
}
/** A pile of gold lying about in a room. */
export const goldPile = (region: Region) => Math.max(3, Math.round(killValue(region) * 0.6));
/** The town's cooked fish, sold as trail food. */
export function trailFood(region: Region): string {
  const f = FISH[Math.max(0, REGIONS.indexOf(region))] ?? FISH[0];
  return `cooked_${f.key}`;
}
export const foodPrice = (region: Region) => Math.max(10, Math.round(Math.max(baseValue(getItem(trailFood(region))) * 3, killValue(region) * 1.2)));
export const draughtPrice = (region: Region) => Math.max(30, Math.round(killValue(region) * 4));
/** What Wick pays for one of something (gold can't be sold, and Relics never). */
export function wickPays(id: string): number {
  if (id === 'coins' || getItem(id).relic) return 0;
  return Math.max(1, Math.round(sellPrice(id) * SELL_BONUS));
}
