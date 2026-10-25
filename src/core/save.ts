// Saving and loading. Saves live in the browser's storage on the device.
// Every save has a version number; old saves are upgraded by MIGRATIONS so they never break.
import { ITEMS, type SkillId } from '../data/items';
import { ACTIONS } from '../data/skills';
import { INVENTORY_SLOTS, MAX_BAG_SLOTS, MAX_IDLE_SLOTS, SAVE_VERSION, newPlayer, type ItemStack, type Loadout, type PlayerState } from './player';
import { PET_MAP } from '../data/pets';
import { OPEN_REGIONS, REGIONS } from '../data/tiers';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { levelForXp, MAX_LEVEL } from './xp';
import { MONSTER_MAP } from '../data/monsters';
import { LORE_MAP } from '../data/lore';
import { alreadySettled, TUTORIAL } from './tutorial';
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

// ---------------------------------------------------------------------------
// 🛟 Backups: a save can be turned into a code you keep somewhere safe (Notes, email…)
// and restored later — even if the phone wiped the browser's storage.
// Format: "A999z:" + base64(gzip(json))  (or "A999:" + base64(json) where gzip isn't available).
// ---------------------------------------------------------------------------

const B64_CHUNK = 0x8000;
function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += B64_CHUNK) s += String.fromCharCode(...bytes.subarray(i, i + B64_CHUNK));
  return btoa(s);
}
function base64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

/** Turns a game into a backup code. */
export async function exportSave(player: PlayerState): Promise<string> {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: Date.now(), player };
  const json = new TextEncoder().encode(JSON.stringify(file));
  if (typeof CompressionStream !== 'undefined') {
    try { return 'A999z:' + bytesToBase64(await pipe(json, new CompressionStream('gzip'))); } catch { /* fall through */ }
  }
  return 'A999:' + bytesToBase64(json);
}

/** Reads a backup code back into a game (old versions are upgraded). Throws a friendly message if the code is broken. */
export async function importSave(code: string): Promise<PlayerState> {
  const clean = code.trim().replace(/\s+/g, '');
  let json: string;
  try {
    if (clean.startsWith('A999z:')) {
      if (typeof DecompressionStream === 'undefined') throw new Error('old browser');
      json = new TextDecoder().decode(await pipe(base64ToBytes(clean.slice(6)), new DecompressionStream('gzip')));
    } else if (clean.startsWith('A999:')) {
      json = new TextDecoder().decode(base64ToBytes(clean.slice(5)));
    } else {
      throw new Error('not ours');
    }
  } catch {
    throw new Error("That doesn't look like an Ascension 999 backup code. Make sure you copied all of it.");
  }
  let file: SaveFile;
  try { file = JSON.parse(json) as SaveFile; } catch { throw new Error('The backup code is incomplete — try copying it again.'); }
  if (!file?.player?.skills) throw new Error('The backup code is incomplete — try copying it again.');
  return repair(migrate(file.player, file.version ?? 1));
}

const backupStampKey = (slot: SlotId) => `pocketvale.slot${slot}.lastBackup`;
export function lastBackupAt(slot: SlotId): number {
  try { return Number(localStorage.getItem(backupStampKey(slot))) || 0; } catch { return 0; }
}
export function markBackedUp(slot: SlotId) {
  try { localStorage.setItem(backupStampKey(slot), String(Date.now())); } catch { /* ignore */ }
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
  // v5 → v6: the single idle slot becomes slot 1 of 3.
  5: (player) => {
    player.slots = [player?.idle ?? null, null, null];
    player.unlockedSlots = 1;
    delete player.idle;
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

/** The save version of the game most recently loaded (to show "what changed" notes once). */
export let loadedFromVersion = SAVE_VERSION;

export function loadGame(slot: SlotId): PlayerState | null {
  moveOldSave();
  for (const key of [saveKey(slot), backupKey(slot)]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const file = JSON.parse(raw) as SaveFile;
      loadedFromVersion = file.version ?? 1;
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
    activity: p.slots.filter(Boolean).map((s) =>
      isFightId(s!.actionId) ? `Fighting ${MONSTER_MAP[s!.actionId.slice(6)]?.name ?? ''}` : ACTIONS[s!.actionId]?.name ?? '',
    ).join(', ') || null,
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
    // Bag size can be upgraded (30 → 50 in steps of 5).
    const size = Math.min(MAX_BAG_SLOTS, Math.max(INVENTORY_SLOTS, raw.inventory.length));
    p.inventory = Array.from({ length: size }, () => null);
    for (let i = 0; i < size; i++) {
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
  p.unlockedSlots = Math.min(MAX_IDLE_SLOTS, Math.max(1, Math.floor(Number(raw?.unlockedSlots) || 1)));
  const rawSlots: unknown[] = Array.isArray(raw?.slots) ? raw.slots : [];
  const fightOk = raw?.fight && MONSTER_MAP[raw.fight.monsterId] && rawSlots.some((s) => isFightId((s as { actionId?: string })?.actionId));
  for (let i = 0; i < MAX_IDLE_SLOTS; i++) {
    const s = rawSlots[i] as { actionId?: string; progressMs?: number } | null;
    if (i < p.unlockedSlots && s?.actionId && (ACTIONS[s.actionId] || (fightOk && isFightId(s.actionId)))) {
      p.slots[i] = { actionId: s.actionId, progressMs: Number(s.progressMs) || 0 };
    }
  }
  if (raw?.shop && typeof raw.shop.rotation === 'number' && Array.isArray(raw.shop.bought)) {
    p.shop = { rotation: raw.shop.rotation, bought: raw.shop.bought.filter((n: unknown) => typeof n === 'number') };
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
  // Cozy (v10)
  if (raw?.daily && typeof raw.daily.streak === 'number') p.daily = { lastDay: typeof raw.daily.lastDay === 'string' ? raw.daily.lastDay : null, streak: raw.daily.streak };
  if (raw?.requests && typeof raw.requests.day === 'string' && Array.isArray(raw.requests.tasks)) {
    p.requests = {
      day: raw.requests.day,
      bonusClaimed: !!raw.requests.bonusClaimed,
      tasks: raw.requests.tasks.filter((t: { kind?: string; goal?: number }) => t && ['item', 'xp', 'kills', 'minigames'].includes(t.kind ?? '') && typeof t.goal === 'number')
        .filter((t: { kind: string; target?: string }) => t.kind !== 'item' || !!ITEMS[t.target ?? '']),
    };
  }
  // Goals + Lucky Stars (v11)
  if (raw?.goals && typeof raw.goals === 'object') {
    for (const [s, lv] of Object.entries(raw.goals)) {
      if (s in p.skills && typeof lv === 'number' && lv > 1 && lv <= MAX_LEVEL) p.goals[s as SkillId] = Math.floor(lv);
    }
  }
  p.starsCaught = Math.max(0, Number(raw?.starsCaught) || 0);
  // Buffs + garden (v18)
  if (raw?.buffs && typeof raw.buffs === 'object') {
    for (const [k, b] of Object.entries(raw.buffs as Record<string, { item?: string; until?: number }>)) {
      if (b && ITEMS[b.item ?? '']?.buff && typeof b.until === 'number' && b.until > Date.now()) p.buffs[k] = { item: b.item!, until: b.until };
    }
  }
  if (Array.isArray(raw?.farm?.plots)) {
    p.farm.plots = [0, 1, 2, 3].map((i) => {
      const pl = raw.farm.plots[i];
      return pl && typeof pl.crop === 'number' && pl.crop >= 0 && pl.crop < 11 && typeof pl.readyAt === 'number'
        ? { crop: pl.crop, plantedAt: Number(pl.plantedAt) || Date.now(), readyAt: pl.readyAt, tendedMs: Number(pl.tendedMs) || 0 }
        : null;
    });
  }
  // Bounty Board + seasoned tools (v17)
  if (raw?.bounties && typeof raw.bounties.day === 'string' && Array.isArray(raw.bounties.list)) {
    p.bounties = {
      day: raw.bounties.day,
      rerolled: !!raw.bounties.rerolled,
      list: raw.bounties.list.filter((b: { monster?: string; goal?: number; find?: string }) => b && MONSTER_MAP[b.monster ?? ''] && typeof b.goal === 'number' && ITEMS[b.find ?? '']),
    };
  }
  if (raw?.toolUses && typeof raw.toolUses === 'object') {
    for (const [s, n] of Object.entries(raw.toolUses)) if (s in p.skills && typeof n === 'number' && n > 0) p.toolUses[s as SkillId] = Math.floor(n);
  }
  // Settling In (v16): older saves that are already past the start skip it.
  if (raw?.tutorial && typeof raw.tutorial === 'object') {
    p.tutorial = { step: Math.max(0, Math.floor(Number(raw.tutorial.step) || 0)), progress: Math.max(0, Number(raw.tutorial.progress) || 0), done: !!raw.tutorial.done };
  }
  // Satchel (v16)
  if (raw?.satchel && typeof raw.satchel === 'object') p.satchel = { owned: !!raw.satchel.owned, on: !!raw.satchel.owned && !!raw.satchel.on };
  // Lunaria's mystery (v15)
  if (raw?.lunaria && typeof raw.lunaria === 'object') {
    p.lunaria = { lanterns: Math.max(0, Math.min(7, Math.floor(Number(raw.lunaria.lanterns) || 0))), restored: !!raw.lunaria.restored };
  }
  // Lore (v12)
  if (Array.isArray(raw?.lore)) p.lore = Array.from(new Set(raw.lore.filter((id: unknown) => typeof id === 'string' && !!LORE_MAP[id as string])));
  // Regions (v9)
  if (Array.isArray(raw?.regions)) p.regions = raw.regions.filter((r: unknown) => typeof r === 'string' && (REGIONS as readonly string[]).includes(r as string));
  if (!p.regions.includes('Pocketvale')) p.regions.unshift('Pocketvale');
  if (typeof raw?.location === 'string' && p.regions.includes(raw.location)) p.location = raw.location;
  if (raw?.travel && typeof raw.travel.arriveAt === 'number' && OPEN_REGIONS.includes(raw.travel.to)) {
    p.travel = { to: raw.travel.to, arriveAt: raw.travel.arriveAt, startedAt: Number(raw.travel.startedAt) || Date.now() };
  }
  if (raw?.bonfire && typeof raw.bonfire.until === 'number' && ITEMS[raw.bonfire.log]) p.bonfire = { until: raw.bonfire.until, log: raw.bonfire.log };
  if (typeof raw?.bossReadyAt?.wildfire === 'number') p.bossReadyAt.wildfire = raw.bossReadyAt.wildfire;
  // Quality of life (v7)
  if (raw?.tracker && typeof raw.tracker.since === 'number') {
    p.tracker = { since: raw.tracker.since, xp: {} };
    for (const s of Object.keys(p.skills) as SkillId[]) {
      const v = raw.tracker.xp?.[s];
      if (typeof v === 'number') p.tracker.xp[s] = v;
    }
  } else {
    p.tracker = { since: Date.now(), xp: Object.fromEntries((Object.keys(p.skills) as SkillId[]).map((s) => [s, p.skills[s].xp])) };
  }
  if (raw?.collection && typeof raw.collection === 'object') {
    for (const [id, n] of Object.entries(raw.collection)) if (ITEMS[id] && typeof n === 'number') p.collection[id] = n;
  } else {
    // Start the collection log from what you already own.
    for (const s of [...p.inventory, ...p.bank]) if (s) p.collection[s.id] = (p.collection[s.id] ?? 0) + s.qty;
    for (const id of Object.values(p.equipment)) if (id) p.collection[id] = (p.collection[id] ?? 0) + 1;
  }
  if (Array.isArray(raw?.pets)) p.pets = raw.pets.filter((id: unknown) => typeof id === 'string' && PET_MAP[id as string]);
  p.activePet = typeof raw?.activePet === 'string' && p.pets.includes(raw.activePet) ? raw.activePet : null;
  if (Array.isArray(raw?.loadouts)) {
    p.loadouts = [0, 1, 2].map((i) => {
      const l = raw.loadouts[i];
      if (!l || typeof l.name !== 'string' || typeof l.equipment !== 'object') return null;
      const equipment: Loadout['equipment'] = {};
      for (const [slot, id] of Object.entries(l.equipment)) if (typeof id === 'string' && ITEMS[id]?.equip?.slot === slot) equipment[slot as keyof Loadout['equipment']] = id;
      return { name: l.name.slice(0, 20), equipment };
    });
  }
  if (Array.isArray(raw?.presets)) {
    p.presets = [0, 1, 2].map((i) => {
      const pr = raw.presets[i];
      if (!pr || typeof pr.name !== 'string' || !Array.isArray(pr.actions)) return null;
      return { name: pr.name.slice(0, 20), actions: [0, 1, 2].map((k) => (typeof pr.actions[k] === 'string' && ACTIONS[pr.actions[k]] ? pr.actions[k] : null)) };
    });
  }
  // Saves from before the starter questline that are already well underway skip it.
  if (!raw?.tutorial && alreadySettled(p)) p.tutorial.done = true;
  if (p.tutorial.step >= TUTORIAL.length) p.tutorial.done = true;
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
