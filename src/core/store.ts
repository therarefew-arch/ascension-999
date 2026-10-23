// The game store: holds the current game, runs the clock, saves, and tells the screens to update.
// Screens never change player data directly — they call the functions in `game` below.
import { useSyncExternalStore } from 'react';
import { sound } from '../audio/sound';
import type { SoundKey } from '../audio/soundList';
import { getItem, type EquipSlot } from '../data/items';
import { ACTIONS, SKILLS } from '../data/skills';
import { equip, unequip } from './equipment';
import { advanceIdle, completeAction, emptyReport, startIdle, stopIdle, whyCantDo, type ProgressReport } from './idle';
import { deposit, depositAll, withdraw } from './inventory';
import { validateLootTables } from './loot';
import { clampReward } from './minigames';
import { newPlayer, OFFLINE_CAP_MS, type PlayerState } from './player';
import {
  deleteSave, loadGame, loadSettings, requestPersistentStorage, saveGame, saveSettings, type SlotId,
} from './save';
import type { Settings } from './settings';

/** Gaps longer than this count as "away" and show the summary card. */
const AWAY_THRESHOLD_MS = 60 * 1000;
const AUTOSAVE_MS = 5000;
const TICK_MS = 200;

export interface AwayReport {
  awayMs: number;
  countedMs: number;
  report: ProgressReport;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'good' | 'bad' | 'level';
}

export interface GameSnapshot {
  /** Which save slot is being played. null = on the title screen. */
  slot: SlotId | null;
  player: PlayerState;
  settings: Settings;
  away: AwayReport | null;
  toasts: Toast[];
  lastSavedAt: number;
}

export interface MinigameResult {
  ok: boolean;
  reason?: string;
  gained: Record<string, number>;
  xp: number;
  levelUp?: number;
}

let snap: GameSnapshot;
const listeners = new Set<() => void>();
let toastId = 1;

function emit() {
  // New wrapper objects so React notices the change.
  snap = { ...snap, player: { ...snap.player } };
  listeners.forEach((l) => l());
}

function toast(text: string, kind: Toast['kind'] = 'info') {
  const t = { id: toastId++, text, kind };
  snap.toasts = [...snap.toasts, t].slice(-3);
  setTimeout(() => {
    snap = { ...snap, toasts: snap.toasts.filter((x) => x.id !== t.id) };
    listeners.forEach((l) => l());
  }, kind === 'level' ? 3500 : 2600);
}

function play(key: SoundKey) {
  sound.play(key);
}

function save() {
  if (snap.slot === null) return;
  if (saveGame(snap.slot, snap.player)) snap.lastSavedAt = Date.now();
}

function announceLevels(report: ProgressReport) {
  for (const lv of report.levelUps) {
    play('levelup');
    toast(`${SKILLS[lv.skill].name} level ${lv.to}!`, 'level');
  }
}

/** Moves the game clock forward to `now`. */
function tick(now = Date.now()) {
  if (snap.slot === null) return;
  const p = snap.player;
  const gap = now - p.lastActiveAt;
  if (gap <= 0) return;

  if (gap > AWAY_THRESHOLD_MS) {
    const counted = Math.min(gap, OFFLINE_CAP_MS);
    const hadIdle = !!p.idle;
    const report = advanceIdle(p, counted, now);
    p.lastActiveAt = now;
    if (hadIdle) {
      snap.away = { awayMs: gap, countedMs: counted, report };
      play('welcome');
    }
    save();
    emit();
    return;
  }

  p.lastActiveAt = now;
  if (!p.idle) return;
  const action = ACTIONS[p.idle.actionId];
  const report = advanceIdle(p, gap, now);
  if (report.actions > 0 && action) play(action.sound);
  announceLevels(report);
  if (report.stopped) {
    play('error');
    toast(`Idle stopped: ${report.stopped.reason}`, 'bad');
  }
  emit();
}

let started = false;

/** Starts the app on the title screen, with the clock and auto-save ready. */
export function startGame() {
  if (started) return;
  started = true;
  validateLootTables();
  const settings = loadSettings();
  snap = { slot: null, player: newPlayer(), settings, away: null, toasts: [], lastSavedAt: 0 };
  sound.setVolumes(settings);
  requestPersistentStorage();

  setInterval(() => { if (!document.hidden) tick(); }, TICK_MS);
  setInterval(() => { if (!document.hidden) save(); }, AUTOSAVE_MS);

  // Save the moment the app is hidden or closed, and catch up when it comes back.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { tick(); save(); sound.suspend(); }
    else { tick(); }
  });
  window.addEventListener('pagehide', () => { tick(); save(); });

  // Test helper, only in development builds: pocketvaleDebug.skipTime(hours)
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).pocketvaleDebug = {
      skipTime(hours: number) { snap.player.lastActiveAt -= hours * 3_600_000; tick(); },
      player: () => snap.player,
    };
  }
}

export function useGame(): GameSnapshot {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => snap,
  );
}

function fail(reason: string) {
  play('error');
  toast(reason, 'bad');
}

/** Everything the screens are allowed to do. */
export const game = {
  // ----- Save slots -----
  /** Opens a save slot. Catches up any offline time straight away. */
  playSlot(slot: SlotId) {
    snap.slot = slot;
    snap.player = loadGame(slot) ?? newPlayer();
    snap.away = null;
    play('click');
    tick();
    save();
    emit();
  },
  /** Starts a brand-new game in a slot (replaces what was there). */
  newGameInSlot(slot: SlotId) {
    deleteSave(slot);
    snap.slot = slot;
    snap.player = newPlayer();
    snap.away = null;
    save();
    toast('Welcome to Pocketvale!', 'good');
    emit();
  },
  deleteSlot(slot: SlotId) {
    deleteSave(slot);
    emit();
  },
  /** Saves and goes back to the title screen. */
  backToTitle() {
    tick();
    save();
    snap.slot = null;
    snap.away = null;
    emit();
  },

  // ----- Idle -----
  startAction(actionId: string) {
    tick();
    const why = startIdle(snap.player, actionId);
    if (why) return fail(why);
    toast(`Idling: ${ACTIONS[actionId].name}`, 'good');
    save();
    emit();
  },
  stopAction() {
    stopIdle(snap.player);
    save();
    emit();
  },

  // ----- Minigames -----
  /** Finishes one action from a minigame, with its bonus. */
  minigameReward(actionId: string, reward: { xpMult: number; bonusRolls: number }): MinigameResult {
    const action = ACTIONS[actionId];
    const empty: MinigameResult = { ok: false, gained: {}, xp: 0 };
    if (!action) return { ...empty, reason: 'Unknown activity' };
    const why = whyCantDo(snap.player, action);
    if (why) { fail(why); return { ...empty, reason: why }; }
    const report = emptyReport(actionId);
    completeAction(snap.player, action, report, clampReward(reward));
    play(action.sound);
    announceLevels(report);
    emit();
    return {
      ok: true,
      gained: report.gained,
      xp: report.xp[action.skill] ?? 0,
      levelUp: report.levelUps[0]?.to,
    };
  },

  // ----- Bag & bank -----
  deposit(id: string, qty: number) {
    if (deposit(snap.player, id, qty) > 0) play('deposit');
    emit();
  },
  depositAll() {
    if (depositAll(snap.player) > 0) {
      play('deposit');
      toast('Bag deposited into the bank', 'good');
    }
    save();
    emit();
  },
  withdraw(id: string, qty: number) {
    const n = withdraw(snap.player, id, qty);
    if (n === 0) return fail('Your bag is full');
    emit();
  },

  // ----- Gear -----
  equip(id: string) {
    const why = equip(snap.player, id);
    if (why) return fail(why);
    play('equip');
    toast(`Equipped ${getItem(id).name}`, 'good');
    save();
    emit();
  },
  unequip(slot: EquipSlot) {
    unequip(snap.player, slot);
    play('equip');
    save();
    emit();
  },

  // ----- Other -----
  dismissAway() {
    snap.away = null;
    emit();
  },
  setSettings(next: Settings) {
    snap.settings = next;
    sound.setVolumes(next);
    saveSettings(next);
    emit();
  },
  clearLastStop() {
    snap.player.lastStop = null;
    emit();
  },
};
