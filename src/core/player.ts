// The player's own data — everything that gets saved. Kept apart from game data,
// the market and the loot rules so it can later live on a server for multiplayer.
import type { EquipSlot, SkillId } from '../data/items';
import type { FightState } from './combat';

/**
 * v2: added 6 skills; the old "tool" gear slot became "pickaxe".
 * v3: pickaxes moved from Smithing to Crafting; tool tiers renamed (pine→stone, oak→bronze); cooking fire.
 * v4: combat — 5 combat skills, hit points, coins, gem sockets, fights, mini boss timers.
 */
export const SAVE_VERSION = 4;
export const INVENTORY_SLOTS = 30;
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
  /** One idle slot for now. More slots can be added later as a coin sink. */
  idle: IdleSlot | null;
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
}

export function newSkills(): Record<SkillId, { xp: number }> {
  return {
    mining: { xp: 0 }, smithing: { xp: 0 }, woodcutting: { xp: 0 }, firemaking: { xp: 0 },
    fishing: { xp: 0 }, cooking: { xp: 0 }, crafting: { xp: 0 }, enhancing: { xp: 0 },
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
    idle: null,
    lastStop: null,
    fire: { heatMs: 0, log: null },
    coins: 0,
    hp: 24,
    regenMs: 0,
    fight: null,
    bossReadyAt: {},
  };
}

export function clonePlayer(p: PlayerState): PlayerState {
  return structuredClone(p);
}
