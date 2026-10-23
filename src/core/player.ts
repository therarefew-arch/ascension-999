// The player's own data — everything that gets saved. Kept apart from game data,
// the market and the loot rules so it can later live on a server for multiplayer.
import type { EquipSlot, SkillId } from '../data/items';

export const SAVE_VERSION = 1;
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
  /** One idle slot for now. More slots can be added later as a coin sink. */
  idle: IdleSlot | null;
  /** Why idling last stopped by itself (shown to the player). */
  lastStop: { actionId: string; reason: string; at: number } | null;
}

export function newPlayer(now = Date.now()): PlayerState {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastActiveAt: now,
    skills: { mining: { xp: 0 }, smithing: { xp: 0 } },
    inventory: Array.from({ length: INVENTORY_SLOTS }, () => null),
    bank: [],
    equipment: {},
    idle: null,
    lastStop: null,
  };
}

export function clonePlayer(p: PlayerState): PlayerState {
  return structuredClone(p);
}
