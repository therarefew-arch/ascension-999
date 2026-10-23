// Saving and loading. Saves live in the browser's storage on the device.
// Every save has a version number; old saves are upgraded by MIGRATIONS so they never break.
import { ITEMS, type SkillId } from '../data/items';
import { ACTIONS } from '../data/skills';
import { INVENTORY_SLOTS, SAVE_VERSION, newPlayer, type ItemStack, type PlayerState } from './player';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { levelForXp } from './xp';
import { MONSTER_MAP } from '../data/monsters';
import { isFightId, maxHp } from './combat';

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
const MIGRATIONS: Record<number, (player: any) => any> = {
  // v1 → v2: the single "tool" slot became the "pickaxe" slot. New skills are filled in by repair().
  1: (player) => {
    if (player?.equipment?.tool) {
      player.equipment.pickaxe = player.equipment.tool;
      delete player.equipment.tool;
    }
    return player;
  },
  // v2 → v3: pickaxes moved from Smithing to Crafting, tool tiers renamed. Nothing is lost:
  // old Bronze pickaxe → Stone pickaxe, old Iron pickaxe → Bronze pickaxe, Pine/Oak tools → Stone/Bronze tools.
  2: (player) => {
    const renameItem = (id: string): string => {
      const m = /^(bronze|iron|pine|oak)_(pickaxe|axe|rod|tinderbox|skillet)(_p\d+)?$/.exec(id);
      if (!m) return id;
      if (m[2] === 'pickaxe' && (m[1] === 'pine' || m[1] === 'oak')) return id;
      if (m[2] !== 'pickaxe' && (m[1] === 'bronze' || m[1] === 'iron')) return id;
      const tier = m[1] === 'bronze' || m[1] === 'pine' ? 'stone' : 'bronze';
      return `${tier}_${m[2]}${m[3] ?? ''}`;
    };
    const renameAction = (id: string): string => {
      const m = /^(craft|upgrade)_(pine|oak)_(.*)$/.exec(id);
      return m ? `${m[1]}_${m[2] === 'pine' ? 'stone' : 'bronze'}_${m[3]}` : id;
    };
    const fixStack = (s: { id: string; qty: number } | null) => (s ? { ...s, id: renameItem(s.id) } : s);
    if (Array.isArray(player?.inventory)) player.inventory = player.inventory.map(fixStack);
    if (Array.isArray(player?.bank)) {
      const merged: Record<string, number> = {};
      for (const s of player.bank) if (s?.id) merged[renameItem(s.id)] = (merged[renameItem(s.id)] ?? 0) + s.qty;
      player.bank = Object.entries(merged).map(([id, qty]) => ({ id, qty }));
    }
    if (player?.equipment) for (const k of Object.keys(player.equipment)) player.equipment[k] = renameItem(player.equipment[k]);
    if (player?.idle?.actionId) player.idle.actionId = renameAction(player.idle.actionId);
    if (player?.lastStop?.actionId) player.lastStop.actionId = renameAction(player.lastStop.actionId);
    return player;
  },
  // v4 → v5: runes moved to Runecrafting. Minor runes → Air runes, Major runes → Earth runes.
  // Staffs you already had keep working: they become Air staffs (with their +level). New staffs start blank.
  4: (player) => {
    const renameItem = (id: string): string => {
      if (id === 'minor_rune') return 'air_rune';
      if (id === 'major_rune') return 'earth_rune';
      const m = /^(pine|oak)_staff(_p\d+)?$/.exec(id);
      return m ? `${m[1]}_air_staff${m[2] ?? ''}` : id;
    };
    const renameAction = (id: string): string => {
      const m = /^enhance_(pine|oak)_staff_(\d+)$/.exec(id);
      return m ? `enhance_${m[1]}_air_staff_${m[2]}` : id;
    };
    const fixStack = (s: { id: string; qty: number } | null) => (s ? { ...s, id: renameItem(s.id) } : s);
    if (Array.isArray(player?.inventory)) player.inventory = player.inventory.map(fixStack);
    if (Array.isArray(player?.bank)) {
      const merged: Record<string, number> = {};
      for (const s of player.bank) if (s?.id) merged[renameItem(s.id)] = (merged[renameItem(s.id)] ?? 0) + s.qty;
      player.bank = Object.entries(merged).map(([id, qty]) => ({ id, qty }));
    }
    if (player?.equipment) for (const k of Object.keys(player.equipment)) player.equipment[k] = renameItem(player.equipment[k]);
    if (player?.idle?.actionId) player.idle.actionId = renameAction(player.idle.actionId);
    return player;
  },
};

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
    activity: p.idle
      ? (isFightId(p.idle.actionId) ? `Fighting ${MONSTER_MAP[p.idle.actionId.slice(6)]?.name ?? ''}` : ACTIONS[p.idle.actionId]?.name ?? null)
      : null,
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
  const fightOk = raw?.fight && MONSTER_MAP[raw.fight.monsterId] && isFightId(raw?.idle?.actionId);
  if (raw?.idle && (ACTIONS[raw.idle.actionId] || fightOk)) {
    p.idle = { actionId: raw.idle.actionId, progressMs: Number(raw.idle.progressMs) || 0 };
  }
  if (fightOk) {
    const f = raw.fight;
    p.fight = {
      monsterId: f.monsterId, monsterHp: Number(f.monsterHp) || MONSTER_MAP[f.monsterId].hp,
      playerTimer: Number(f.playerTimer) || 2400, monsterTimer: Number(f.monsterTimer) || 3000, respawn: Number(f.respawn) || 0,
      critReady: false, blockUntil: 0, kills: Number(f.kills) || 0, log: [],
    };
  }
  if (raw?.lastStop && (ACTIONS[raw.lastStop.actionId] || isFightId(raw.lastStop.actionId))) p.lastStop = raw.lastStop;
  if (raw?.fire && typeof raw.fire.heatMs === 'number') {
    p.fire = { heatMs: Math.max(0, raw.fire.heatMs), log: ITEMS[raw.fire.log] ? raw.fire.log : null };
  }
  if (typeof raw?.coins === 'number' && raw.coins >= 0) p.coins = Math.floor(raw.coins);
  if (raw?.sockets && typeof raw.sockets === 'object') {
    for (const [slot, id] of Object.entries(raw.sockets)) {
      if (typeof id === 'string' && ITEMS[id]?.gem) p.sockets[slot as keyof PlayerState['sockets']] = id;
    }
  }
  if (raw?.bossReadyAt && typeof raw.bossReadyAt === 'object') {
    for (const [id, at] of Object.entries(raw.bossReadyAt)) if (MONSTER_MAP[id] && typeof at === 'number') p.bossReadyAt[id] = at;
  }
  p.hp = typeof raw?.hp === 'number' && raw.hp > 0 ? raw.hp : maxHp(p);
  p.hp = Math.min(p.hp, maxHp(p));
  p.regenMs = Number(raw?.regenMs) || 0;
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
