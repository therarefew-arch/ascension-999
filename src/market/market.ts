// The NPC Trading Post, the rotating shop, and coin unlocks.
// Kept separate from player data and loot rules so it can later move to a server for multiplayer.
// Rules: gems can never be bought (they only drop from bosses). Bought items go through the central loot system.
import { getItem, ITEM_LIST, ITEMS, type ItemDef } from '../data/items';
import { countInBag, countInBank, removeFromBag, removeFromBank, spaceFor } from '../core/inventory';
import { giveLoot } from '../core/loot';
import type { PlayerState } from '../core/player';
import type { Region } from '../data/tiers';

// ---------------------------------------------------------------------------
// Coin unlocks
// ---------------------------------------------------------------------------

/** SLOT_UNLOCKS[n] = how to unlock slot n+1 when you have n slots. Total level unlocks it for free. */
export const SLOT_UNLOCKS: Record<number, { level: number; coins: number }> = {
  1: { level: 500, coins: 50_000 },
  2: { level: 1_500, coins: 250_000 },
};

/** Cost of the next +5 bag slots (null = already at the maximum of 50). */
export function bagUpgradeCost(currentSize: number): number | null {
  const costs: Record<number, number> = { 30: 2_000, 35: 6_000, 40: 15_000, 45: 40_000 };
  return costs[currentSize] ?? null;
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

/** Prices drift every 30 minutes. */
export const PRICE_WINDOW_MS = 30 * 60 * 1000;

const BASE: Record<string, number> = {
  copper_ore: 3, tin_ore: 3, iron_ore: 8, stone: 2, rune_essence: 4,
  bronze_bar: 9, iron_bar: 22,
  pine_logs: 3, oak_logs: 9,
  raw_shrimp: 4, raw_trout: 10, cooked_shrimp: 7, great_shrimp: 12, cooked_trout: 16, great_trout: 26,
  bronze_arrows: 1, iron_arrows: 3, air_rune: 2, water_rune: 3, earth_rune: 4, fire_rune: 5,
};
const GEM_VALUE: Record<string, number> = { common: 60, uncommon: 150, rare: 400, epic: 1_000, legendary: 3_000, mythic: 9_000 };

/** A fair base value for every item. */
export function baseValue(item: ItemDef): number {
  if (BASE[item.id] !== undefined) return BASE[item.id];
  // Higher tiers are worth more (about ×1.35 per tier, like their XP).
  if (item.tierNum !== undefined && item.tierNum >= 2 && ['ore', 'bar', 'log', 'fish', 'food', 'ammo'].includes(item.category)) {
    const base = { ore: 3, bar: 9, log: 3, fish: 4, food: 7, ammo: 1 }[item.category as 'ore'] ?? 5;
    return Math.round(base * Math.pow(1.35, item.tierNum) * (item.id.startsWith('great_') ? 1.6 : 1));
  }
  if (item.gem) return GEM_VALUE[item.gem.rarity] + item.gem.value * 10;
  if (item.id.endsWith('_talisman')) return 40;
  const plus = item.upgrade?.level ?? 0;
  if (item.category === 'weapon' || item.category === 'armour' || item.category === 'tool') {
    const tierMult = item.tierNum !== undefined ? Math.pow(1.35, item.tierNum) * (item.tierNum >= 1 ? 2.2 : 1) : 1;
    return Math.round(30 * tierMult * (1 + 0.35 * plus));
  }
  if (item.category === 'material') return 20;
  return 5;
}

/** Small repeatable "random" number from a seed (same everywhere, so prices are the same for everyone). */
function hash(n: number): number {
  let x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
function idSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100_000;
  return h;
}

/** Sell price right now: base value × 0.75–1.25, drifting every 30 minutes. */
export function sellPrice(id: string, now = Date.now()): number {
  const w = Math.floor(now / PRICE_WINDOW_MS);
  const mult = 0.75 + 0.5 * hash(idSeed(id) + w * 7.31);
  return Math.max(1, Math.round(baseValue(getItem(id)) * mult));
}

/** Price direction compared with the previous 30 minutes. */
export function priceTrend(id: string, now = Date.now()): -1 | 0 | 1 {
  const a = sellPrice(id, now - PRICE_WINDOW_MS);
  const b = sellPrice(id, now);
  return b > a ? 1 : b < a ? -1 : 0;
}

/** What each town's Trading Post sells: local basic materials and food. Never gems or gear. */
export const BUY_LISTS: Partial<Record<Region, string[]>> = {
  Pocketvale: ['copper_ore', 'tin_ore', 'stone', 'rune_essence', 'pine_logs', 'raw_shrimp', 'bronze_bar', 'bronze_arrows', 'cooked_shrimp'],
  Ironmoor: ['iron_ore', 'oak_logs', 'raw_trout', 'iron_bar', 'iron_arrows', 'cooked_trout', 'stone', 'rune_essence'],
};
export const buyListFor = (where: Region) => BUY_LISTS[where] ?? [];
/** Everything sold anywhere (kept for older code). */
export const BUY_LIST = Array.from(new Set(Object.values(BUY_LISTS).flat()));
export const buyPrice = (id: string, now = Date.now()) => Math.max(2, Math.round(sellPrice(id, now) * 1.6));

export function msUntilNextPrices(now = Date.now()) {
  return PRICE_WINDOW_MS - (now % PRICE_WINDOW_MS);
}

/** Everything you own that can be sold (bag + bank, not worn gear). Coins can't be sold. */
export function sellable(p: PlayerState): { id: string; qty: number }[] {
  const ids = new Set<string>();
  for (const s of p.inventory) if (s) ids.add(s.id);
  for (const s of p.bank) ids.add(s.id);
  return ITEM_LIST.filter((it) => ids.has(it.id) && it.id !== 'coins')
    .map((it) => ({ id: it.id, qty: countInBag(p.inventory, it.id) + countInBank(p, it.id) }));
}

/** Sells from the bag first, then the bank. Returns coins earned. */
export function sell(p: PlayerState, id: string, qty: number, now = Date.now()): number {
  let left = qty;
  left -= removeFromBag(p.inventory, id, left);
  if (left > 0) left -= removeFromBank(p, id, left);
  const sold = qty - left;
  const coins = sold * sellPrice(id, now);
  p.coins += coins;
  return coins;
}

/** Buys into the bag (through the central loot system). Returns a reason if it can't. */
export function buy(p: PlayerState, id: string, qty: number, now = Date.now()): string | null {
  if (!buyListFor(p.location).includes(id) || ITEMS[id]?.gem) return `The ${p.location} Trading Post doesn't sell that`;
  const cost = buyPrice(id, now) * qty;
  if (p.coins < cost) return `Needs ${cost.toLocaleString()} coins`;
  if (spaceFor(p.inventory, id) < qty) return 'Not enough room in your bag';
  p.coins -= cost;
  giveLoot(p, [{ id, qty }]);
  return null;
}

// ---------------------------------------------------------------------------
// Rotating shop: 4 deals that change every 6 hours, each can be bought once
// ---------------------------------------------------------------------------

export const SHOP_ROTATION_MS = 6 * 60 * 60 * 1000;
const SHOP_POOL: { id: string; qty: number }[] = [
  { id: 'rune_essence', qty: 50 }, { id: 'bronze_arrows', qty: 100 }, { id: 'great_shrimp', qty: 20 },
  { id: 'pine_logs', qty: 100 }, { id: 'stone', qty: 100 }, { id: 'iron_ore', qty: 50 },
  { id: 'oak_logs', qty: 50 }, { id: 'cooked_trout', qty: 20 }, { id: 'air_rune', qty: 100 },
  { id: 'bronze_bar', qty: 30 }, { id: 'iron_bar', qty: 15 }, { id: 'great_trout', qty: 10 },
  { id: 'fire_rune', qty: 40 }, { id: 'iron_arrows', qty: 60 },
];

export interface ShopDeal { index: number; id: string; qty: number; price: number; normal: number }

export function shopRotation(now = Date.now()) {
  return Math.floor(now / SHOP_ROTATION_MS);
}

export function shopDeals(now = Date.now()): ShopDeal[] {
  const r = shopRotation(now);
  const picked: number[] = [];
  for (let k = 0; picked.length < 4 && k < 50; k++) {
    const i = Math.floor(hash(r * 3.7 + k * 11.3) * SHOP_POOL.length);
    if (!picked.includes(i)) picked.push(i);
  }
  return picked.map((poolIndex, index) => {
    const d = SHOP_POOL[poolIndex];
    const normal = Math.round(baseValue(getItem(d.id)) * 1.6) * d.qty;
    const discount = 0.45 + 0.2 * hash(r * 5.1 + index);
    return { index, id: d.id, qty: d.qty, normal, price: Math.max(10, Math.round(normal * discount)) };
  });
}

export function buyDeal(p: PlayerState, index: number, now = Date.now()): string | null {
  const r = shopRotation(now);
  if (p.shop.rotation !== r) p.shop = { rotation: r, bought: [] };
  if (p.shop.bought.includes(index)) return 'Already bought — new deals soon';
  const deal = shopDeals(now)[index];
  if (!deal) return 'That deal is gone';
  if (p.coins < deal.price) return `Needs ${deal.price.toLocaleString()} coins`;
  if (spaceFor(p.inventory, deal.id) < deal.qty) return 'Not enough room in your bag';
  p.coins -= deal.price;
  giveLoot(p, [{ id: deal.id, qty: deal.qty }]);
  p.shop.bought.push(index);
  return null;
}
