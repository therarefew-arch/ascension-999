// 🌋 Cinderpeak: the volcano village.
// - "The Mountain Stirs": every 3 hours (on the phone's clock) the volcano rumbles for 15 minutes.
//   Mining Emberite in Cinderpeak then gives double XP, and ember geodes turn up far more often.
// - ♨️ Hot springs: resting in Cinderpeak (not fighting) heals you much faster.
// - 🎒 The Traveller: someone always one town ahead of you, who leaves a small gift at each Frontier town's well.
import type { ActionDef } from '../data/skills';
import { REGIONS } from '../data/tiers';
import { giveLoot, rollLoot } from './loot';
import type { ItemStack, PlayerState } from './player';

export const STIR_EVERY_MS = 3 * 60 * 60_000;
export const STIR_LENGTH_MS = 15 * 60_000;
/** Each window starts at 1:30, 4:30, 7:30 … (local time). */
const STIR_OFFSET_MS = 90 * 60_000;

/** Is the mountain stirring right now? And when does it end / start next? */
export function mountainStirs(now = Date.now()): { active: boolean; endsAt: number; nextAt: number } {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const midnight = d.getTime();
  const since = now - midnight - STIR_OFFSET_MS;
  const k = Math.floor(since / STIR_EVERY_MS);
  const start = midnight + STIR_OFFSET_MS + k * STIR_EVERY_MS;
  const active = since >= 0 && now < start + STIR_LENGTH_MS;
  // (Just after midnight, before 1:30, the last window was yesterday's 22:30 — long over.)
  const nextAt = since < 0 ? midnight + STIR_OFFSET_MS : start + STIR_EVERY_MS;
  return { active, endsAt: active ? start + STIR_LENGTH_MS : 0, nextAt };
}

/** Does the eruption boost this action? (Mining Emberite while in Cinderpeak.) */
export function stirBoosts(p: PlayerState, action: ActionDef, at = Date.now()): boolean {
  return action.id === 'mine_emberite' && p.location === 'Cinderpeak' && mountainStirs(at).active;
}
export const STIR_XP_MULT = 2;
/** Chance per Emberite ore of an ember geode while the mountain stirs (normally the plain 1-in-250 find). */
export const EMBER_GEODE_CHANCE = 1 / 40;

/** ♨️ Hot springs: out of a fight in Cinderpeak, you heal this many times faster. */
export const HOT_SPRING_MULT = 10;
export const inHotSprings = (p: PlayerState) => p.location === 'Cinderpeak' && !p.fight;

// ----- 🎒 The Traveller's gifts -----
/** One small gift waits at the well of each Frontier town (from Cinderpeak on). */
/** (Each town's card from the Traveller is a 'gift' lore note in data/lore.ts.) */
export const TRAVELLER_GIFTS: Record<string, { table: string }> = {
  Cinderpeak: { table: 'gift_cinderpeak' },
  Frosthold: { table: 'gift_frosthold' },
  Voidreach: { table: 'gift_voidreach' },
  'Starfall Crater': { table: 'gift_starfall_crater' },
  'Celestine Spires': { table: 'gift_celestine_spires' },
  // At the end of every road, the Traveller herself is waiting.
  'Primordial Rift': { table: 'gift_primordial_rift' },
};

/**
 * Where the Traveller is now: the first town (in road order) whose well gift you haven't taken yet —
 * `gift: true` means a parcel waits there. Once every gift is taken, they've moved on: `town` is the
 * next town down the road after the last gift (it may not be built yet), with `gift: false`.
 */
export function travellerWhereabouts(p: PlayerState): { town: (typeof REGIONS)[number]; gift: boolean } | null {
  const towns = REGIONS.filter((r) => TRAVELLER_GIFTS[r]);
  const waiting = towns.find((t) => !p.travellerGifts.includes(t));
  if (waiting) return { town: waiting, gift: true };
  const last = towns[towns.length - 1];
  const next = last ? REGIONS[REGIONS.indexOf(last) + 1] : undefined;
  return next ? { town: next, gift: false } : null;
}

export function travellerGiftWaiting(p: PlayerState, where = p.location): boolean {
  return !!TRAVELLER_GIFTS[where] && p.regions.includes(where) && !p.travellerGifts.includes(where);
}

/** Pick up the Traveller's gift at this town's well (once per town). Loot goes through the loot system. */
export function takeTravellerGift(p: PlayerState): ItemStack[] | string {
  const gift = TRAVELLER_GIFTS[p.location];
  if (!gift) return 'There is nothing at this well';
  if (p.travellerGifts.includes(p.location)) return 'You already took the gift here';
  const loot = rollLoot(gift.table);
  giveLoot(p, loot);
  p.travellerGifts.push(p.location);
  return loot;
}
