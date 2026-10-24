// The player's own data — everything that gets saved. Kept apart from game data,
// the market and the loot rules so it can later live on a server for multiplayer.
import type { EquipSlot, SkillId } from '../data/items';
import type { FightState } from './combat';
import type { Region } from '../data/tiers';

/**
 * v2: added 6 skills; the old "tool" gear slot became "pickaxe".
 * v3: pickaxes moved from Smithing to Crafting; tool tiers renamed (pine→stone, oak→bronze); cooking fire.
 * v4: combat — 5 combat skills, hit points, coins, gem sockets, fights, mini boss timers.
 * v5: Runecrafting — minor/major runes → air/earth runes, old staffs → air staffs (blank staffs are new).
 * v6: economy — up to 3 idle slots, bigger bags, rotating-shop purchases.
 * v7: quality of life — XP tracker, collection log, pets, gear loadouts, idle presets.
 * v8: weekly boss, Wildfire, bonfires.
 * v9: regions — where you are, which regions you've discovered, travelling.
 */
export const SAVE_VERSION = 9;
/** Starting bag size. Can be upgraded with coins up to MAX_BAG_SLOTS. */
export const INVENTORY_SLOTS = 30;
export const MAX_BAG_SLOTS = 50;
export const MAX_IDLE_SLOTS = 3;
/** Max of one stackable item in a single bag slot. */
export const STACK_LIMIT = 500;
/** Offline progress counts up to this long. */
export const OFFLINE_CAP_MS = 24 * 60 * 60 * 1000;

export interface ItemStack {
  id: string;
  qty: number;
}

export interface IdleSlot {
  /** An action id, or "fight:<monster>" while fighting. */
  actionId: string;
  /** Time already spent on the current action, in ms. */
  progressMs: number;
}

export interface PlayerState {
  version: number;
  createdAt: number;
  /** Last moment the game was running and counted progress. */
  lastActiveAt: number;
  skills: Record<SkillId, { xp: number }>;
  inventory: (ItemStack | null)[];
  bank: ItemStack[];
  equipment: Partial<Record<EquipSlot, string>>;
  /** Gems socketed into gear slots. The gem stays in the slot when you swap gear. */
  sockets: Partial<Record<EquipSlot, string>>;
  /** Idle slots (always 3 entries; only the first `unlockedSlots` can be used). */
  slots: (IdleSlot | null)[];
  unlockedSlots: number;
  /** Rotating shop: which deals were bought in the current rotation. */
  shop: { rotation: number; bought: number[] };
  /** Why idling last stopped by itself (shown to the player). */
  lastStop: { actionId: string; reason: string; at: number } | null;
  /** The cooking fire: how much heat is left and which log is burning (sets the flame colour). */
  fire: { heatMs: number; log: string | null };
  coins: number;
  hp: number;
  /** Time collected towards the next regenerated hit point. */
  regenMs: number;
  fight: FightState | null;
  /** When each mini boss can be fought again. */
  bossReadyAt: Record<string, number>;
  /** XP tracker: XP of every skill when the tracker was (re)started. */
  tracker: { since: number; xp: Partial<Record<SkillId, number>> };
  /** Collection log: how many of each item you've ever received. */
  collection: Record<string, number>;
  pets: string[];
  activePet: string | null;
  /** Saved gear setups (3). */
  loadouts: (Loadout | null)[];
  /** Saved idle-slot setups (3). */
  presets: (IdlePreset | null)[];
  /** A lit bonfire: +5% XP to all skills until `until`. */
  bonfire: { until: number; log: string } | null;
  /** The town you're in. */
  location: Region;
  /** Regions you've visited (their tier is unlocked for you). */
  regions: Region[];
  /** Walking to another town. */
  travel: { to: Region; arriveAt: number; startedAt: number } | null;
}

export interface Loadout {
  name: string;
  equipment: Partial<Record<EquipSlot, string>>;
}

export interface IdlePreset {
  name: string;
  actions: (string | null)[];
}

export function newSkills(): Record<SkillId, { xp: number }> {
  return {
    mining: { xp: 0 }, smithing: { xp: 0 }, woodcutting: { xp: 0 }, firemaking: { xp: 0 },
    fishing: { xp: 0 }, cooking: { xp: 0 }, crafting: { xp: 0 }, enhancing: { xp: 0 }, runecrafting: { xp: 0 },
    melee: { xp: 0 }, ranged: { xp: 0 }, magic: { xp: 0 }, defense: { xp: 0 }, health: { xp: 0 },
  };
}

export function newPlayer(now = Date.now()): PlayerState {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastActiveAt: now,
    skills: newSkills(),
    inventory: Array.from({ length: INVENTORY_SLOTS }, () => null),
    bank: [],
    equipment: {},
    sockets: {},
    slots: [null, null, null],
    unlockedSlots: 1,
    shop: { rotation: -1, bought: [] },
    lastStop: null,
    fire: { heatMs: 0, log: null },
    coins: 0,
    hp: 24,
    regenMs: 0,
    fight: null,
    bossReadyAt: {},
    tracker: { since: now, xp: {} },
    collection: {},
    pets: [],
    activePet: null,
    loadouts: [null, null, null],
    presets: [null, null, null],
    bonfire: null,
    location: 'Pocketvale',
    regions: ['Pocketvale'],
    travel: null,
  };
}

export function clonePlayer(p: PlayerState): PlayerState {
  return structuredClone(p);
}
