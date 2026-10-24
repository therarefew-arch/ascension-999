// The game store: holds the current game, runs the clock, saves, and tells the screens to update.
// Screens never change player data directly — they call the functions in `game` below.
import { useSyncExternalStore } from 'react';
import { sound } from '../audio/sound';
import type { SoundKey } from '../audio/soundList';
import { getItem, type EquipSlot } from '../data/items';
import { ACTIONS, SKILLS } from '../data/skills';
import { equip, unequip } from './equipment';
import {
  addXp, advanceIdle, chooseSlot, completeAction, drainFire, emptyReport, runningSlots, slotOf, startIdle, stokeFire, stopIdle,
  whyCantDo, type ProgressReport,
} from './idle';
import { ALL_SKILLS } from '../data/skills';
import { PET_MAP } from '../data/pets';
import { applyLoadout, applyPreset, resetTracker, saveLoadout, savePreset } from './qol';
import { finishWildfire, lightBonfire } from './firemaking';
import { levelForXp } from './xp';
import { bagUpgradeCost, buy as marketBuy, buyDeal, sell as marketSell, SLOT_UNLOCKS } from '../market/market';
import { deposit, depositAll, withdraw } from './inventory';
import { giveLoot, lootFits, rollGemReroll, validateLootTables } from './loot';
import { BLOCK_WINDOW_MS, eatFood, endFight, fightSlot, maxHp, regenHp, startFight } from './combat';
import { REROLL_COST, socketGem, unsocketGem } from './equipment';
import { countInBag, removeFromBag } from './inventory';
import { MONSTER_MAP } from '../data/monsters';
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
  /** false when an Enhancing try didn't work (item kept). */
  succeeded?: boolean;
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

function announcePets(report: ProgressReport) {
  for (const id of report.pets) {
    play('levelup');
    toast(`🎉 New pet: ${PET_MAP[id].emoji} ${PET_MAP[id].name}!`, 'level');
  }
}

/** Warn once when the bag is nearly full, and again when it's full. */
let bagWarned = 0;
function bagWarnings(p: PlayerState) {
  const used = p.inventory.filter(Boolean).length;
  const size = p.inventory.length;
  if (used >= size && bagWarned < 2) {
    bagWarned = 2;
    play('error');
    toast(`Bag is full (${used}/${size}) — idling that needs space will stop`, 'bad');
  } else if (used >= size - 3 && used < size && bagWarned < 1) {
    bagWarned = 1;
    toast(`Bag almost full (${used}/${size})`, 'info');
  } else if (used < size - 3) {
    bagWarned = 0;
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
    // Mini boss fights are by hand only — they pause (end safely) while you're away.
    if (p.fight && MONSTER_MAP[p.fight.monsterId]?.miniboss) {
      const name = MONSTER_MAP[p.fight.monsterId].name;
      p.lastStop = { actionId: p.slots[fightSlot(p)]?.actionId ?? '', reason: `${name} waits for you — mini boss fights pause while you're away`, at: now - gap };
      endFight(p);
    }
    const hadIdle = runningSlots(p).length > 0;
    const report = advanceIdle(p, counted, now);
    if (!p.fight) regenHp(p, counted);
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
  // The cooking fire burns down while you're at the Kitchen (idle cooking burns it per dish instead).
  const running = runningSlots(p);
  const idleCooking = running.some((r) => ACTIONS[r.slot.actionId]?.skill === 'cooking');
  if (cookingOpen && !idleCooking && p.fire.heatMs > 0) {
    drainFire(p, gap);
    if (!running.length) emit();
  }
  if (!p.fight && p.hp < maxHp(p)) {
    const before = p.hp;
    regenHp(p, gap);
    if (p.hp !== before && !running.length) emit();
  }
  if (!running.length) return;
  const action = running.map((r) => ACTIONS[r.slot.actionId]).find(Boolean);
  const fightLogBefore = p.fight?.log.length ?? 0;
  const lastLog = p.fight?.log[p.fight.log.length - 1];
  const report = advanceIdle(p, gap, now);
  if (report.actions > 0 && action) play(report.failed > 0 ? 'fail' : action.sound);
  if (report.failed > 0) toast('Enhance didn’t take this time — item kept safe', 'info');
  // Combat sounds
  if (report.combat) {
    const newest = p.fight?.log[p.fight.log.length - 1];
    if (newest && (newest !== lastLog || p.fight!.log.length !== fightLogBefore)) {
      play(newest.kind === 'you' ? 'hit' : newest.kind === 'them' ? 'hurt' : newest.kind === 'loot' ? 'deposit' : 'click');
    }
    if (report.combat.kills > 0 && Object.keys(report.gained).length) {
      toast(Object.entries(report.gained).map(([id, n]) => id === 'coins' ? `+${n} coins` : `+${n} ${getItem(id).name}`).join(' · '), 'good');
    }
  }
  announceLevels(report);
  announcePets(report);
  bagWarnings(p);
  for (const s of report.stops) {
    const won = s.reason.endsWith('defeated!');
    play(won ? 'levelup' : 'error');
    toast(won ? `🏆 ${s.reason}` : `Stopped: ${s.reason}`, won ? 'level' : 'bad');
  }
  emit();
}

let started = false;
let cookingOpen = false;

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
      game: () => game,
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
  /** Starts idling an action (in a free slot, or the slot already doing that skill, or the given slot). */
  startAction(actionId: string, slot?: number) {
    tick();
    const p = snap.player;
    const i = slot ?? chooseSlot(p, actionId);
    const replacing = p.slots[i];
    const why = startIdle(p, actionId, i);
    if (why) return fail(why);
    const name = ACTIONS[actionId].name;
    toast(replacing && replacing.actionId !== actionId ? `Slot ${i + 1}: now idling ${name}` : `Idling: ${name} (slot ${i + 1})`, 'good');
    save();
    emit();
  },
  /** Stops one slot, or the slot doing `actionId`, or every slot. */
  stopAction(target?: number | string) {
    const p = snap.player;
    if (typeof target === 'string') {
      const i = slotOf(p, target);
      if (i < 0) return;
      stopIdle(p, i);
    } else {
      stopIdle(p, target);
    }
    save();
    emit();
  },
  /** Unlocks the next idle slot with total level (free) or coins. */
  unlockSlot(): boolean {
    const p = snap.player;
    const next = SLOT_UNLOCKS[p.unlockedSlots];
    if (!next) return false;
    const total = ALL_SKILLS.reduce((sum, s) => sum + levelForXp(p.skills[s].xp), 0);
    if (total < next.level) {
      if (p.coins < next.coins) { fail(`Needs total level ${next.level} or ${next.coins.toLocaleString()} coins`); return false; }
      p.coins -= next.coins;
    }
    p.unlockedSlots++;
    play('levelup');
    toast(`Idle slot ${p.unlockedSlots} unlocked!`, 'level');
    save();
    emit();
    return true;
  },
  // ----- Firemaking extras -----
  lightBonfire(log: string) {
    tick();
    const report = emptyReport(null);
    const why = lightBonfire(snap.player, log, report);
    if (why) return fail(why);
    play('crackle');
    toast('🔥 Bonfire lit! +5% XP to all skills', 'level');
    announceLevels(report);
    save();
    emit();
  },
  finishWildfire(hits: number, total: number) {
    const r = finishWildfire(snap.player, hits, total);
    play(r.won ? 'levelup' : 'fail');
    announceLevels(r.report);
    save();
    emit();
    return r;
  },

  // ----- Quality of life -----
  resetTracker() {
    resetTracker(snap.player);
    toast('XP tracker reset', 'info');
    save();
    emit();
  },
  setActivePet(id: string | null) {
    const p = snap.player;
    if (id && !p.pets.includes(id)) return;
    p.activePet = id;
    save();
    emit();
  },
  saveLoadout(i: number, name: string) {
    saveLoadout(snap.player, i, name);
    toast(`Loadout "${snap.player.loadouts[i]!.name}" saved`, 'good');
    save();
    emit();
  },
  applyLoadout(i: number) {
    const missing = applyLoadout(snap.player, i);
    play('equip');
    toast(missing.length ? `Equipped — missing: ${missing.join(', ')}` : `Loadout "${snap.player.loadouts[i]?.name}" equipped`, missing.length ? 'info' : 'good');
    save();
    emit();
  },
  deleteLoadout(i: number) {
    snap.player.loadouts[i] = null;
    save();
    emit();
  },
  savePreset(i: number, name: string) {
    savePreset(snap.player, i, name);
    toast(`Preset "${snap.player.presets[i]!.name}" saved`, 'good');
    save();
    emit();
  },
  applyPreset(i: number) {
    tick();
    const problems = applyPreset(snap.player, i);
    play('click');
    toast(problems.length ? `Started — ${problems.join('; ')}` : `Preset "${snap.player.presets[i]?.name}" started`, problems.length ? 'info' : 'good');
    save();
    emit();
  },
  deletePreset(i: number) {
    snap.player.presets[i] = null;
    save();
    emit();
  },

  // ----- Trading Post -----
  sell(id: string, qty: number) {
    const coins = marketSell(snap.player, id, qty);
    if (coins > 0) { play('deposit'); toast(`Sold for ${coins.toLocaleString()} coins`, 'good'); }
    save();
    emit();
  },
  buy(id: string, qty: number) {
    const why = marketBuy(snap.player, id, qty);
    if (why) return fail(why);
    play('deposit');
    save();
    emit();
  },
  buyDeal(index: number) {
    const why = buyDeal(snap.player, index);
    if (why) return fail(why);
    play('levelup');
    toast('Deal bought!', 'good');
    save();
    emit();
  },
  /** Buys 5 more bag slots. */
  upgradeBag(): boolean {
    const p = snap.player;
    const cost = bagUpgradeCost(p.inventory.length);
    if (cost === null) return false;
    if (p.coins < cost) { fail(`Needs ${cost.toLocaleString()} coins`); return false; }
    p.coins -= cost;
    for (let k = 0; k < 5; k++) p.inventory.push(null);
    play('levelup');
    toast(`Bag upgraded to ${p.inventory.length} slots!`, 'level');
    save();
    emit();
    return true;
  },

  // ----- Minigames -----
  /** Finishes one action from a minigame, with its bonus. */
  minigameReward(
    actionId: string,
    reward: { xpMult: number; bonusRolls: number; great?: boolean; chanceBonus?: number },
  ): MinigameResult {
    const action = ACTIONS[actionId];
    const empty: MinigameResult = { ok: false, gained: {}, xp: 0 };
    if (!action) return { ...empty, reason: 'Unknown activity' };
    const why = whyCantDo(snap.player, action, { manual: true });
    if (why) { fail(why); return { ...empty, reason: why }; }
    // "Great" food uses its own loot table — only if there's room for it.
    let lootTable: string | undefined;
    if (reward.great && action.greatLootTable && lootFits(snap.player, action.greatLootTable)) lootTable = action.greatLootTable;
    const report = emptyReport(actionId);
    const safe = clampReward(reward);
    // Bonus copies only for gathering/smithing/cooking — never free tools or free upgrades.
    if (action.kind || action.skill === 'crafting' || !action.output || !getItem(action.output.item).stackable) safe.bonusRolls = 0;
    const succeeded = completeAction(snap.player, action, report, {
      ...safe,
      lootTable,
      chanceBonus: Math.min(0.15, Math.max(0, reward.chanceBonus ?? 0)),
    });
    play(succeeded ? action.sound : 'fail');
    announceLevels(report);
    announcePets(report);
    emit();
    return {
      ok: true,
      succeeded,
      gained: report.gained,
      xp: report.xp[action.skill] ?? 0,
      levelUp: report.levelUps[0]?.to,
    };
  },

  /** XP-only reward (the fishing tile game). */
  minigameXp(actionId: string, xp: number) {
    const action = ACTIONS[actionId];
    if (!action || xp <= 0) return;
    const report = emptyReport(actionId);
    addXp(snap.player, action, report, Math.round(Math.min(xp, action.xp * 3)));
    announceLevels(report);
    emit();
  },

  // ----- Combat -----
  startFight(monsterId: string) {
    tick();
    const why = startFight(snap.player, monsterId);
    if (why) return fail(why);
    play('click');
    save();
    emit();
  },
  stopFight() {
    endFight(snap.player);
    save();
    emit();
  },
  /** Minigame: a strike in the gold zone makes your next attack a critical hit. */
  combatCharge(): boolean {
    const f = snap.player.fight;
    if (!f || f.critReady || f.respawn > 0) return false;
    f.critReady = true;
    f.playerTimer = 0; // strike right away — no waiting for the next swing
    play('enchant');
    tick();
    emit();
    return true;
  },
  /** Minigame: BLOCK just before the monster attacks to halve its damage. */
  combatBlock(): 'blocked' | 'early' | 'none' {
    tick();
    const f = snap.player.fight;
    if (!f || f.respawn > 0) return 'none';
    if (f.monsterTimer > BLOCK_WINDOW_MS) return 'early';
    f.blockUntil = Date.now() + f.monsterTimer + 60;
    play('equip');
    emit();
    return 'blocked';
  },
  eat(id: string) {
    const why = eatFood(snap.player, id);
    if (why) return fail(why);
    play('sizzle');
    emit();
  },

  // ----- Gems -----
  socketGem(slot: EquipSlot, gemId: string) {
    const why = socketGem(snap.player, slot, gemId);
    if (why) return fail(why);
    play('enchant');
    toast(`${getItem(gemId).name} socketed`, 'good');
    save();
    emit();
  },
  unsocketGem(slot: EquipSlot) {
    unsocketGem(snap.player, slot);
    play('click');
    save();
    emit();
  },
  /** Pays coins to reroll a gem's stat (same type and rarity). Returns the new gem id. */
  rerollGem(gemId: string): string | null {
    const gem = getItem(gemId).gem;
    if (!gem) return null;
    const cost = REROLL_COST[gem.rarity];
    const p = snap.player;
    if (p.coins < cost) { fail(`Needs ${cost} coins`); return null; }
    if (countInBag(p.inventory, gemId) < 1) { fail('The gem must be in your bag'); return null; }
    p.coins -= cost;
    removeFromBag(p.inventory, gemId, 1);
    const next = rollGemReroll(gem.type, gem.rarity);
    giveLoot(p, [{ id: next, qty: 1 }]);
    play('enchant');
    toast(`Rerolled: ${getItem(next).description.split(' when')[0]}`, 'good');
    save();
    emit();
    return next;
  },

  // ----- Cooking fire -----
  setCookingOpen(open: boolean) {
    cookingOpen = open;
  },
  stokeFire(log?: string): boolean {
    tick();
    const report = emptyReport(null);
    const why = stokeFire(snap.player, report, log);
    if (why) { fail(why); return false; }
    play('crackle');
    announceLevels(report);
    emit();
    return true;
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
