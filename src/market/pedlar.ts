// 🧺 The Wandering Pedlar: a hooded trader who visits one of your towns each day and sells sealed crates
// for gold. Pry one open: sometimes nothing but straw, often good local goods, now and then a treasure,
// and very rarely a ✨ Relic (data/relics.ts) — one-of-a-kind gear you can't get any other way.
// Farther towns' crates cost more and hold better things. Every empty crate fills the 🍀 Pedlar's Favour;
// when it's full, the next crate is guaranteed to be a good one.
// Rules kept: everything goes through the loot system (giveLoot), never gems, gold only (no real money).
import { getItem, ITEMS } from '../data/items';
import { RELICS, relicItemId, type RelicKey } from '../data/relics';
import { CROPS, FISH, HERBS, METALS, REGIONS, WOODS, type Region } from '../data/tiers';
import { canFitAll } from '../core/inventory';
import { giveLoot, satchelOn } from '../core/loot';
import type { ItemStack, PlayerState } from '../core/player';
import { findRelic, RELIC, relicOn, replaceRelic } from '../core/relics';
import { baseValue } from './market';

export type CrateKey = 'rough' | 'ironbound' | 'gilded';
export interface CrateDef {
  key: CrateKey; name: string; emoji: string;
  /** Price in Pocketvale; farther towns cost ×1.75 per town. */
  base: number;
  /** Chances of an empty crate, a treasure and a Relic (the rest is good local goods). */
  dud: number; treasure: number; relic: number;
  /** A treasure is worth about this many times the price (treasures + a purse). */
  jackpot: number;
  blurb: string;
}

export const CRATES: CrateDef[] = [
  { key: 'rough', name: 'Rough Crate', emoji: '📦', base: 500, dud: 0.4, treasure: 0.07, relic: 0.004, jackpot: 3.2,
    blurb: 'Splintery planks and a lot of straw. Cheap, and often just that.' },
  { key: 'ironbound', name: 'Iron-bound Crate', emoji: '🗃️', base: 5_000, dud: 0.3, treasure: 0.1, relic: 0.015, jackpot: 2.8,
    blurb: 'Heavy, with a rusty lock. Something solid rattles inside.' },
  { key: 'gilded', name: 'Gilded Coffer', emoji: '🎁', base: 50_000, dud: 0.2, treasure: 0.14, relic: 0.05, jackpot: 2.2,
    blurb: 'Gold leaf, a wax seal, and the Pedlar won\'t say where it\'s from.' },
];
export const CRATE_MAP = Object.fromEntries(CRATES.map((c) => [c.key, c])) as Record<CrateKey, CrateDef>;

/** Prices grow this much per town further out. */
export const TOWN_PRICE_MULT = 1.75;
/** Empty crates in a row that fill the Pedlar's Favour. */
export const FAVOUR_MAX = 5;
/** With full Favour, Relics are this much more likely. */
export const FAVOUR_RELIC_MULT = 3;

export const townTier = (r: Region) => Math.max(0, REGIONS.indexOf(r));

/** Day number in the player's own time zone (changes at local midnight). */
export function localDay(now = Date.now()): number {
  const d = new Date(now);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Where the Pedlar is on a given day: he walks a loop through the towns you've found, a different one each day. */
export function pedlarTown(p: PlayerState, now = Date.now()): Region {
  const towns = [...p.regions].sort((a, b) => hashStr(`pedlar-${a}`) - hashStr(`pedlar-${b}`));
  return towns[localDay(now) % towns.length] ?? 'Pocketvale';
}
export const pedlarTomorrow = (p: PlayerState, now = Date.now()) => pedlarTown(p, now + 86_400_000);
export const pedlarHere = (p: PlayerState, now = Date.now()) => !p.travel && pedlarTown(p, now) === p.location;

/** Price of a crate in a town (rounded to a tidy number; the Patchwork Coat takes 10% off). */
export function cratePrice(p: PlayerState, key: CrateKey, town: Region = p.location): number {
  const raw = CRATE_MAP[key].base * Math.pow(TOWN_PRICE_MULT, townTier(town)) * (relicOn(p, 'patchwork_coat') ? RELIC.coatDiscount : 1);
  const step = raw >= 100_000 ? 1000 : raw >= 10_000 ? 100 : 10;
  return Math.round(raw / step) * step;
}

export function whyCantOpen(p: PlayerState, key: CrateKey, now = Date.now()): string | null {
  if (p.travel) return 'The Pedlar only trades with folk who are standing still';
  if (!pedlarHere(p, now)) return `The Pedlar is in ${pedlarTown(p, now)} today`;
  const price = cratePrice(p, key);
  if (p.coins < price) return `Needs ${price.toLocaleString()} coins`;
  return null;
}

/** Good local goods a crate can hold in a town of tier t (only items that exist). */
function goodsFor(t: number): string[] {
  const ore = t === 0 ? 'copper_ore' : t === 1 ? 'iron_ore' : t === 2 ? 'coal' : `${METALS[t].key}_ore`;
  return [
    ore, `${METALS[t].key}_bar`, `${WOODS[t].key}_logs`, `raw_${FISH[t].key}`, `cooked_${FISH[t].key}`, `great_${FISH[t].key}`,
    `${METALS[t].key}_arrows`, HERBS[t].key, `dried_${HERBS[t].key}`, `${CROPS[t].key}_seed`, 'rune_essence',
  ].filter((id) => ITEMS[id]);
}
/** Treasures (sell high). The volcano's heartfire ember only turns up from Cinderpeak on. */
function treasuresFor(t: number): string[] {
  return ['golden_egg', 'starlit_crystal', 'sea_pearl', ...(t >= 5 ? ['heartfire_ember'] : [])];
}

const DUD_LINES = [
  'Just straw… and a very surprised mouse. 🐭',
  'An old boot. The other one is probably in another crate. 🥾',
  'A note: "IOU one treasure. — P." 📝',
  'Sawdust, and the smell of somewhere far away.',
  'A single, perfectly ordinary pebble. 🪨',
  'A sock with a hole in it. Not even a pair. 🧦',
  'Packing straw, all the way down.',
  'A tiny painted horse. Lovely, but worthless. 🐴',
];

export type CrateOutcome = 'dud' | 'goods' | 'treasure' | 'relic';
export interface CrateResult {
  outcome: CrateOutcome;
  crate: CrateKey;
  price: number;
  loot: ItemStack[];
  /** A line of flavour for the reveal. */
  line: string;
  relic?: { key: RelicKey; tier: number; awakened: boolean; itemId: string };
  /** The Pedlar's Favour was full and made this crate a good one. */
  favourUsed: boolean;
  /** Something didn't fit in the bag and went to the bank. */
  toBank: boolean;
}

/** Relics this crate could hold: ones you don't have yet, or have from a nearer town (they awaken). */
export function relicsAvailable(p: PlayerState, tier: number): RelicKey[] {
  return RELICS.filter((r) => (p.relics[r.key] ?? -1) < tier).map((r) => r.key);
}

/** Buys and pries open a crate. Returns what was inside, or a reason it can't be opened. */
export function openCrate(p: PlayerState, key: CrateKey, rng: () => number = Math.random, now = Date.now()): CrateResult | string {
  const why = whyCantOpen(p, key, now);
  if (why) return why;
  const crate = CRATE_MAP[key];
  const t = townTier(p.location);
  const price = cratePrice(p, key);
  p.coins -= price;
  p.pedlar.opened++;

  const favourUsed = p.pedlar.favour >= FAVOUR_MAX;
  const relicChance = crate.relic * (favourUsed ? FAVOUR_RELIC_MULT : 1);
  const dudChance = favourUsed ? 0 : crate.dud;
  const pickOne = <T,>(list: T[]): T => list[Math.floor(rng() * list.length) % list.length];

  let outcome: CrateOutcome;
  const r = rng();
  if (r < relicChance) outcome = 'relic';
  else if (r < relicChance + dudChance) outcome = 'dud';
  else if (r < relicChance + dudChance + crate.treasure) outcome = 'treasure';
  else outcome = 'goods';
  // No Relic left to find at this strength? Then it's a treasure instead.
  const relicPool = relicsAvailable(p, t);
  if (outcome === 'relic' && relicPool.length === 0) outcome = 'treasure';

  const loot: ItemStack[] = [];
  let line = '';
  let relic: CrateResult['relic'];
  if (outcome === 'dud') {
    line = pickOne(DUD_LINES);
  } else if (outcome === 'goods') {
    // Local goods worth 50%–120% of the price: one or two kinds, with a purse for the rest.
    let value = price * (0.5 + rng() * 0.7);
    const kinds = rng() < 0.5 ? 1 : 2;
    const pool = goodsFor(t);
    const goodsShare = 0.65;
    const chosen = new Set<string>();
    for (let k = 0; k < kinds; k++) chosen.add(pickOne(pool));
    for (const id of chosen) {
      const share = (value * goodsShare) / chosen.size;
      const qty = Math.max(1, Math.min(400, Math.round(share / Math.max(1, baseValue(getItem(id))))));
      loot.push({ id, qty });
      value -= qty * baseValue(getItem(id));
    }
    if (value > 0) loot.push({ id: 'coins', qty: Math.round(value) });
    line = 'Packed tight with good things from the town.';
  } else if (outcome === 'treasure') {
    const n = 1 + CRATES.indexOf(crate);
    const pool = treasuresFor(t);
    for (let k = 0; k < n; k++) {
      const id = pickOne(pool);
      const have = loot.find((s) => s.id === id);
      if (have) have.qty++; else loot.push({ id, qty: 1 });
    }
    const itemsValue = loot.reduce((a, s) => a + baseValue(getItem(s.id)) * s.qty, 0);
    loot.push({ id: 'coins', qty: Math.round(Math.max(price * 0.5, price * crate.jackpot - itemsValue)) });
    line = 'Under the straw: a glint of treasure and a heavy purse!';
  } else {
    const k = pickOne(relicPool);
    const itemId = relicItemId(k, t);
    const had = findRelic(p, k);
    const awakened = !!had && replaceRelic(p, had.id, itemId);
    if (!awakened) loot.push({ id: itemId, qty: 1 });
    p.relics[k] = t;
    relic = { key: k, tier: t, awakened, itemId };
    line = awakened ? 'Your Relic hums… and grows stronger!' : 'Wrapped in old silk, something one of a kind.';
  }

  // Never gems — they only come from bosses.
  if (loot.some((s) => getItem(s.id).category === 'gem')) throw new Error('Loot rule broken: a gem in a crate');
  const toBank = !satchelOn(p) && !canFitAll(p.inventory, loot.filter((s) => s.id !== 'coins'));
  giveLoot(p, loot, { overflowToBank: true });

  p.pedlar.favour = favourUsed ? 0 : outcome === 'dud' ? Math.min(FAVOUR_MAX, p.pedlar.favour + 1) : p.pedlar.favour;
  return { outcome, crate: key, price, loot, line, relic, favourUsed, toBank };
}
