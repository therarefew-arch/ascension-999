// Saving and loading. Saves live in the browser's storage on the device.
// Every save has a version number; old saves are upgraded by MIGRATIONS so they never break.
import { ITEMS, type SkillId } from '../data/items';
import { ACTIONS } from '../data/skills';
import { INVENTORY_SLOTS, SAVE_VERSION, newPlayer, type ItemStack, type PlayerState } from './player';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { levelForXp } from './xp';

export const SAVE_SLOTS = [1, 2, 3] as const;
export type SlotId = (typeof SAVE_SLOTS)[number];

const saveKey = (slot: SlotId) => `pocketvale.slot${slot}`;
const backupKey = (slot: SlotId) => `pocketvale.slot${slot}.backup`;
const SETTINGS_KEY = 'pocketvale.settings';
/** Before save slots existed, the game used one save. It becomes slot 1. */
const OLD_SAVE_KEY = 'pocketvale.save';

function moveOldSave() {
  try {
    const old = localStorage.getItem(OLD_SAVE_KEY);
    if (old && !localStorage.getItem(saveKey(1))) localStorage.setItem(saveKey(1), old);
    if (old) {
      localStorage.removeItem(OLD_SAVE_KEY);
      localStorage.removeItem(`${OLD_SAVE_KEY}.backup`);
    }
  } catch { /* ignore */ }
}

interface SaveFile {
  version: number;
  savedAt: number;
  player: PlayerState;
}

/** MIGRATIONS[n] upgrades a save from version n to n + 1. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MIGRATIONS: Record<number, (player: any) => any> = {};

export function saveGame(slot: SlotId, player: PlayerState): boolean {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: Date.now(), player };
  try {
    const previous = localStorage.getItem(saveKey(slot));
    if (previous) localStorage.setItem(backupKey(slot), previous);
    localStorage.setItem(saveKey(slot), JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot: SlotId): PlayerState | null {
  moveOldSave();
  for (const key of [saveKey(slot), backupKey(slot)]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const file = JSON.parse(raw) as SaveFile;
      return repair(migrate(file.player, file.version ?? 1));
    } catch {
      // try the backup next
    }
  }
  return null;
}

export function deleteSave(slot: SlotId): void {
  try {
    localStorage.removeItem(saveKey(slot));
    localStorage.removeItem(backupKey(slot));
  } catch { /* ignore */ }
}

export interface SlotSummary {
  slot: SlotId;
  totalLevel: number;
  levels: Record<SkillId, number>;
  lastActiveAt: number;
  activity: string | null;
}

/** A quick look at a save slot for the title screen (null = empty). */
export function slotSummary(slot: SlotId): SlotSummary | null {
  const p = loadGame(slot);
  if (!p) return null;
  const levels = Object.fromEntries(
    (Object.keys(p.skills) as SkillId[]).map((s) => [s, levelForXp(p.skills[s].xp)]),
  ) as Record<SkillId, number>;
  return {
    slot,
    totalLevel: Object.values(levels).reduce((a, b) => a + b, 0),
    levels,
    lastActiveAt: p.lastActiveAt,
    activity: p.idle ? ACTIONS[p.idle.actionId]?.name ?? null : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrate(player: any, version: number): any {
  let v = version;
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (step) player = step(player);
    v++;
  }
  player.version = SAVE_VERSION;
  return player;
}

/** Fills in anything missing and drops anything unknown, so a damaged save still loads. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function repair(raw: any): PlayerState {
  const p = newPlayer();
  if (typeof raw?.createdAt === 'number') p.createdAt = raw.createdAt;
  if (typeof raw?.lastActiveAt === 'number') p.lastActiveAt = raw.lastActiveAt;
  for (const skill of Object.keys(p.skills) as SkillId[]) {
    const xp = raw?.skills?.[skill]?.xp;
    if (typeof xp === 'number' && xp >= 0) p.skills[skill].xp = xp;
  }
  const validStack = (s: unknown): s is ItemStack =>
    !!s && typeof (s as ItemStack).id === 'string' && !!ITEMS[(s as ItemStack).id] && (s as ItemStack).qty > 0;
  if (Array.isArray(raw?.inventory)) {
    for (let i = 0; i < INVENTORY_SLOTS; i++) {
      const s = raw.inventory[i];
      p.inventory[i] = validStack(s) ? { id: s.id, qty: Math.floor(s.qty) } : null;
    }
  }
  if (Array.isArray(raw?.bank)) p.bank = raw.bank.filter(validStack).map((s: ItemStack) => ({ id: s.id, qty: Math.floor(s.qty) }));
  if (raw?.equipment && typeof raw.equipment === 'object') {
    for (const [slot, id] of Object.entries(raw.equipment)) {
      if (typeof id === 'string' && ITEMS[id]?.equip?.slot === slot) p.equipment[slot as keyof PlayerState['equipment']] = id;
    }
  }
  if (raw?.idle && ACTIONS[raw.idle.actionId]) {
    p.idle = { actionId: raw.idle.actionId, progressMs: Number(raw.idle.progressMs) || 0 };
  }
  if (raw?.lastStop && ACTIONS[raw.lastStop.actionId]) p.lastStop = raw.lastStop;
  return p;
}

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null');
    if (raw) return { ...DEFAULT_SETTINGS, ...raw };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

/** Asks the browser not to clear our save when the phone is low on space. */
export function requestPersistentStorage(): void {
  try { navigator.storage?.persist?.(); } catch { /* ignore */ }
}
