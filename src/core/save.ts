// Saving and loading. Saves live in the browser's storage on the device.
// Every save has a version number; old saves are upgraded by MIGRATIONS so they never break.
import { ITEMS, type SkillId } from '../data/items';
import { ACTIONS } from '../data/skills';
import { INVENTORY_SLOTS, SAVE_VERSION, newPlayer, type ItemStack, type PlayerState } from './player';
import { DEFAULT_SETTINGS, type Settings } from './settings';

const SAVE_KEY = 'pocketvale.save';
const BACKUP_KEY = 'pocketvale.save.backup';
const SETTINGS_KEY = 'pocketvale.settings';

interface SaveFile {
  version: number;
  savedAt: number;
  player: PlayerState;
}

/** MIGRATIONS[n] upgrades a save from version n to n + 1. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MIGRATIONS: Record<number, (player: any) => any> = {};

export function saveGame(player: PlayerState): boolean {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: Date.now(), player };
  try {
    const previous = localStorage.getItem(SAVE_KEY);
    if (previous) localStorage.setItem(BACKUP_KEY, previous);
    localStorage.setItem(SAVE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): PlayerState | null {
  for (const key of [SAVE_KEY, BACKUP_KEY]) {
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

export function deleteSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
  } catch { /* ignore */ }
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
