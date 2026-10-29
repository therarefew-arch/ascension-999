// The game store: holds the current game, runs the clock, saves, and tells the screens to update.
// Screens never change player data directly — they call the functions in `game` below.
import { useSyncExternalStore } from 'react';
import { sound } from '../audio/sound';
import type { SoundKey } from '../audio/soundList';
import { getItem, type EquipSlot } from '../data/items';
import { ACTIONS, SKILLS } from '../data/skills';
import { equip, unequip } from './equipment';
import {
  addXp, advanceIdle, chooseSlot, completeAction, drainFire, emptyReport, runningSlots, skillLevel, slotOf, startIdle, stokeFire, stopIdle,
  whyCantDo, type ProgressReport,
} from './idle';
import { ALL_SKILLS } from '../data/skills';
import { PET_MAP } from '../data/pets';
import { applyLoadout, applyPreset, resetTracker, saveLoadout, savePreset } from './qol';
import { finishWildfire, lightBonfire } from './firemaking';
import { checkArrival, fastTravel, startWalk } from './travel';
import { catchStar, claimGift, claimRequest, claimRequestBonus, ensureRequests, nextStarDelay, rollLoreFind, STAR, syncLore, trackRequests } from './cozy';
import type { LoreNote } from '../data/lore';
import { LANTERNS, lightLantern, ringBell, whyCantLight, whyCantRing } from './lunaria';
import { takeTravellerGift } from './cinderpeak';
import { openCrate, type CrateKey, type CrateResult } from '../market/pedlar';
import { disablePush, enablePush, hasPushSubscription, refreshPush, sendNotes } from './push';
import { predictNotes } from './notifySchedule';
import { MAX_LENGTH, MIN_LENGTH, runesongXp } from './runesong';
import { wardXp } from './spellcards';
import { activeFestival, buyAtStall, welcomeFestival, type StallItem } from './festivals';
import { RARE_FISH_MAP } from '../data/rareFish';
import { openFinds } from './finds';
import { claimStep, trackTutorial, TUTORIAL } from './tutorial';
import { claimBounty, ensureBounties, rerollBounty, trackBounties } from './bounties';
import { harvest, plant, tend } from './farming';
import { buffText, consumeBuff } from './buffs';
import { build, cottageStarPct, FURNITURE_MAP, perkText } from './cottage';
import { CROPS } from '../data/tiers';
import { FIND_ITEM } from '../data/lootTables';
import type { Region } from '../data/tiers';
import type { SkillId } from '../data/items';
import { levelForXp } from './xp';
import { bagUpgradeCost, baseValue, buy as marketBuy, buyDeal, buySatchel, sell as marketSell, SLOT_UNLOCKS } from '../market/market';
import { deposit, depositAll, moveBagSlot, moveBankItem, restoreBagLayout, restoreBankOrder, sortBag, sortBank, toggleKeep, withdraw, type BankSort } from './inventory';
import type { ItemStack } from './player';

/** What the bag/bank looked like before the last sort (for ↶ Undo). Not saved. */
let lastBagLayout: (ItemStack | null)[] | null = null;
let lastBankOrder: string[] | null = null;
import { giveLoot, grantPet, lootFits, rollGemReroll, rollLoot, satchelOn, validateLootTables } from './loot';
import { BLOCK_WINDOW_MS, eatFood, endFight, fightSlot, maxHp, regenHp, startFight, weaponStyle } from './combat';
import { lootRolls, nightXp, STUB_COINS } from './lanternWatch';
import { paradeCoins, WINS_NEEDED as PARADE_WINS } from './petParade';
import { wallXp } from './holdWall';
import { REROLL_COST, socketGem, unsocketGem } from './equipment';
import { countInBag, removeFromBag } from './inventory';
import { MONSTER_MAP, MONSTERS } from '../data/monsters';
import { clampReward } from './minigames';
import { newPlayer, type PlayerState } from './player';
import { ascBonus } from './ascBonus';
import { offlineCapMs } from './ascension';
import {
  deleteSave, exportSave, importSave, loadedFromVersion, loadGame, loadSettings, markBackedUp, requestPersistentStorage, saveGame, saveSettings, type SlotId,
} from './save';
import type { Settings } from './settings';
import { ascendRelic, breakDown, breakDownAllFine, craftAscended, reforge, whyCantAscendRelic, whyCantCraft, whyCantReforge, type ForgePlace } from './starforge';
import type { RelicKey } from '../data/relics';
import { masteryReached } from './mastery';
import type { BonusKey } from '../data/ascended';

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
  /** Goes up by one each time there's something to celebrate (shows confetti). */
  celebrate: number;
  /** A Lucky Star drifting across the screen right now (not saved). */
  star: { id: number; until: number } | null;
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

/** A gentle buzz on phones that support it (Android). Can be turned off in Settings. */
function buzz(pattern: number | number[]) {
  if (!snap.settings.vibrate) return;
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}

/** Confetti! (every 10th level, discovering a town, daily gift streaks) */
function celebrate() {
  snap.celebrate = (snap.celebrate ?? 0) + 1;
  buzz([20, 40, 20]);
}

function announceLevels(report: ProgressReport) {
  for (const lv of report.levelUps) {
    play('levelup');
    buzz(30);
    const milestone = Math.floor(lv.to / 10) > Math.floor(lv.from / 10);
    toast(milestone && lv.to % 10 === 0 ? `🎉 ${SKILLS[lv.skill].name} level ${lv.to}!` : `${SKILLS[lv.skill].name} level ${lv.to}!`, 'level');
    if (milestone) celebrate();
    // ✦ A mastery step (800 / 900 / 999).
    const m = masteryReached(lv.from, lv.to);
    if (m) toast(`✦ ${SKILLS[lv.skill].name} ${m.name}: ${m.text(SKILLS[lv.skill].name)}`, 'level');
  }
}

/** 🌟 An Ascended item dropped. These are rare, so each one gets its moment. */
function announceAscended(report: ProgressReport) {
  for (const id of report.ascended ?? []) {
    const a = getItem(id).ascended!;
    play(a.grade.key === 'g' || a.grade.key === 'd' ? 'levelup' : 'rune');
    toast(`🌟 Ascended find: ${getItem(id).name}!`, a.grade.key === 'f' ? 'good' : 'level');
    if (a.grade.key === 'g' || a.grade.key === 'd') celebrate();
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
  if (satchelOn(p)) return; // the Satchel sends the overflow to the bank
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

  // Finished walking to another town?
  const arrival = checkArrival(p, now);
  if (arrival) {
    play(arrival.firstVisit ? 'levelup' : 'welcome');
    toast(arrival.firstVisit ? `🗺️ You discovered ${arrival.arrived}! Its resources are unlocked.` : `Welcome to ${arrival.arrived}`, arrival.firstVisit ? 'level' : 'good');
    if (arrival.firstVisit) celebrate();
    announceLore(syncLore(p));
    save();
    emit();
  }

  if (gap > AWAY_THRESHOLD_MS) {
    const counted = Math.min(gap, offlineCapMs(p));
    // Mini boss fights are by hand only — they pause (end safely) while you're away.
    if (p.fight && MONSTER_MAP[p.fight.monsterId]?.miniboss) {
      const name = MONSTER_MAP[p.fight.monsterId].name;
      p.lastStop = { actionId: p.slots[fightSlot(p)]?.actionId ?? '', reason: `${name} waits for you — mini boss fights pause while you're away`, at: now - gap };
      endFight(p);
    }
    const hadIdle = runningSlots(p).length > 0;
    const awayFight = p.fight?.monsterId;
    const report = advanceIdle(p, counted, now);
    trackRequests(p, report);
    trackTutorial(p, report);
    trackBounties(p, report, awayFight);
    if (!p.fight) regenHp(p, counted);
    p.lastActiveAt = now;
    if (hadIdle) {
      snap.away = { awayMs: gap, countedMs: counted, report };
      play('welcome');
    }
    checkGoals();
    save();
    emit();
    return;
  }

  p.lastActiveAt = now;
  checkGarden(p, now);
  // 🎪 A festival just started (or this is the first visit during one)? Say hello once.
  const fest = welcomeFestival(p, now);
  if (fest) setTimeout(() => { play('levelup'); celebrate(); toast(`${fest.emoji} The ${fest.name} has begun! Festival stall in town · ${SKILLS[fest.skill].name} +10% XP`, 'level'); emit(); }, 1200);
  // Lucky Stars: appear every few minutes while you're playing, and drift away if not caught.
  if (snap.star && now > snap.star.until) { snap.star = null; emit(); }
  // (The Cottage telescope makes them come more often.)
  // 🏮 Lantern-lit (Lunaria town bonus) too.
  const starGap = () => nextStarDelay() / (1 + (cottageStarPct(p) + ascBonus(p, 'ln')) / 100);
  if (!nextStarAt) nextStarAt = now + starGap();
  if (!snap.star && now >= nextStarAt) {
    snap.star = { id: now, until: now + STAR.visibleMs };
    nextStarAt = now + STAR.visibleMs + starGap();
    play('rune');
    emit();
  }
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
  const fightingNow = p.fight?.monsterId;
  const report = advanceIdle(p, gap, now);
  trackBounties(p, report, fightingNow);
  if (report.actions > 0 && action) play(report.failed > 0 ? 'fail' : action.sound);
  if (report.failed > 0) toast('Enhance didn’t take this time — item kept safe', 'info');
  // Combat sounds
  if (report.combat) {
    const newest = p.fight?.log[p.fight.log.length - 1];
    if (newest && (newest !== lastLog || p.fight!.log.length !== fightLogBefore)) {
      play(newest.kind === 'you' ? 'hit' : newest.kind === 'them' ? 'hurt' : newest.kind === 'loot' ? 'deposit' : 'click');
    }
    // (Drops show on the fight screen — no toast for every kill, to keep things calm.)
  }
  trackRequests(p, report);
  trackTutorial(p, report);
  announceLevels(report);
  if (report.levelUps.length) checkGoals();
  announcePets(report);
  announceAscended(report);
  bagWarnings(p);
  if (report.stops.some((s) => s.reason.endsWith('defeated!'))) announceLore(syncLore(p));
  // 🎁 Found something while gathering?
  for (const id of [...Object.values(FIND_ITEM), 'ember_geode']) {
    if (report.gained[id]) { play('rune'); toast(`${getItem(id).emoji} You found a ${getItem(id).name}! Open it from your bag.`, 'good'); }
  }
  // 🐟 Rare fish!
  for (const c of report.rareFish ?? []) {
    const f = RARE_FISH_MAP[c.id];
    play('match');
    toast(c.first ? `${f.emoji} New in your Fishing Journal: ${f.name}! (${c.cm} cm)` : c.record ? `${f.emoji} A record ${f.name.toLowerCase()}: ${c.cm} cm!` : `${f.emoji} You caught a ${f.name.toLowerCase()} (${c.cm} cm)`, c.first || c.record ? 'level' : 'good');
  }
  const found = rollLoreFind(p, report.actions);
  if (found) announceLore([found]);
  for (const s of report.stops) {
    const won = s.reason.endsWith('defeated!');
    play(won ? 'levelup' : 'error');
    toast(won ? `🏆 ${s.reason}` : `Stopped: ${s.reason}`, won ? 'level' : 'bad');
  }
  emit();
}

let started = false;
let cookingOpen = false;
let nextStarAt = 0;

function afterHarvest(report: ProgressReport) {
  trackRequests(snap.player, report, 0);
  trackTutorial(snap.player, report);
  announceLevels(report);
  announcePets(report);
  checkGoals();
  save();
  emit();
}

/** 🌱 Tell the player (once) when a crop becomes ready while they're playing. */
const announcedCrops = new Set<number>();
function checkGarden(p: PlayerState, now: number) {
  for (const pl of p.farm.plots) {
    if (pl && now >= pl.readyAt && !announcedCrops.has(pl.readyAt)) {
      announcedCrops.add(pl.readyAt);
      if (now - pl.readyAt < 10_000) { play('match'); toast(`🌱 Your ${CROPS[pl.crop].name.toLowerCase()} is ready to harvest!`, 'good'); }
    }
  }
}

/** 📜 Found a tale (lore note). */
function announceLore(notes: LoreNote[]) {
  for (const n of notes) {
    play('rune');
    toast(`📜 Tale found: "${n.title}" — read it in the Journal`, 'level');
  }
}

/** 🎯 Any skill goals reached? Celebrate and clear them. */
function checkGoals() {
  const p = snap.player;
  for (const [skill, goal] of Object.entries(p.goals) as [SkillId, number][]) {
    if (levelForXp(p.skills[skill].xp) >= goal) {
      delete p.goals[skill];
      play('levelup');
      toast(`🎯 Goal reached: ${SKILLS[skill].name} ${goal}!`, 'level');
      celebrate();
    }
  }
}

/** 🔔 Leaving the game: tell the notification server what's coming up (idle stopping, crops ready). */
function scheduleNotes() {
  const n = snap.settings.notify;
  if (!n.on || snap.slot === null || !hasPushSubscription()) return;
  try { sendNotes(predictNotes(snap.player, Date.now(), { idle: n.idle, farm: n.farm })); } catch { /* never block closing the game */ }
}
/** Back in the game: nothing needs sending any more. */
function cancelNotes() {
  if (snap.settings.notify.on && hasPushSubscription()) sendNotes([]);
}

/** Starts the app on the title screen, with the clock and auto-save ready. */
export function startGame() {
  if (started) return;
  started = true;
  validateLootTables();
  const settings = loadSettings();
  snap = { slot: null, player: newPlayer(), settings, away: null, toasts: [], lastSavedAt: 0, celebrate: 0, star: null };
  sound.setVolumes(settings);
  requestPersistentStorage();
  if (settings.notify.on) void refreshPush();

  setInterval(() => { if (!document.hidden) tick(); }, TICK_MS);
  setInterval(() => { if (!document.hidden) save(); }, AUTOSAVE_MS);

  // Save the moment the app is hidden or closed, and catch up when it comes back.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { tick(); save(); sound.suspend(); scheduleNotes(); }
    else { tick(); cancelNotes(); }
  });
  window.addEventListener('pagehide', () => { tick(); save(); scheduleNotes(); });

  // Test helper, only in development builds: pocketvaleDebug.skipTime(hours)
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).pocketvaleDebug = {
      skipTime(hours: number) { snap.player.lastActiveAt -= hours * 3_600_000; tick(); },
      player: () => snap.player,
      game: () => game,
      /** Make a Lucky Star appear right away (testing only). */
      star: () => { nextStarAt = Date.now() - 1; },
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
    // Older saves: hand out the tales already earned (towns visited, mini bosses beaten).
    const earned = syncLore(snap.player);
    if (earned.length) setTimeout(() => { play('rune'); toast(`📜 ${earned.length} tale${earned.length > 1 ? 's' : ''} waiting in your Journal`, 'good'); emit(); }, 1500);
    // The big pacing update (v13): XP is kept, the level table changed — so levels jumped up. Say so once.
    if (loadedFromVersion < 13) {
      setTimeout(() => { play('levelup'); celebrate(); toast('📈 New pacing! Towns open much sooner and your skills jumped up. Check your levels!', 'level'); emit(); }, 900);
    } else if (loadedFromVersion < 14) {
      setTimeout(() => { play('levelup'); toast('🗺️ The Heartland towns moved closer: Ironmoor 50 · Coalhaven 110 · Bluecliff 175', 'level'); emit(); }, 900);
    }
    checkGoals();
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
    toast('Welcome to Ascension 999! Your journey starts in Pocketvale.', 'good');
    emit();
  },
  deleteSlot(slot: SlotId) {
    deleteSave(slot);
    emit();
  },
  /** 🛟 Makes a backup code of the game being played. */
  async backupCode(): Promise<string> {
    tick();
    save();
    const code = await exportSave(snap.player);
    if (snap.slot !== null) markBackedUp(snap.slot);
    emit();
    return code;
  },
  /** 🛟 Restores a backup code into a save slot (replacing what's there). Returns an error message, or null when it worked. */
  async restoreBackup(slot: SlotId, code: string): Promise<string | null> {
    let player: PlayerState;
    try { player = await importSave(code); } catch (e) { play('error'); return (e as Error).message; }
    if (!saveGame(slot, player)) { play('error'); return "Couldn't save on this device — is storage full?"; }
    markBackedUp(slot);
    play('levelup');
    if (snap.slot === slot) { snap.player = player; snap.away = null; }
    toast(`🛟 Backup restored into save slot ${slot}`, 'level');
    emit();
    return null;
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
  // ----- Cozy -----
  claimGift() {
    const r = claimGift(snap.player);
    if (!r) return;
    play('welcome');
    toast(`🎁 Day ${r.streak} gift: ${r.gift.map((g) => (g.id === 'coins' ? `${g.qty} coins` : `${g.qty} ${getItem(g.id).name}`)).join(' · ')}`, 'level');
    if (r.streak % 7 === 0) celebrate();
    save();
    emit();
  },
  claimRequest(i: number) {
    const coins = claimRequest(snap.player, i);
    if (coins === null) return;
    play('coin');
    buzz(20);
    toast(`📜 Request done! +${coins} coins`, 'good');
    if (snap.player.requests.tasks.every((t) => t.claimed)) toast('All three done — claim your bonus!', 'level');
    save();
    emit();
  },
  claimRequestBonus() {
    if (!claimRequestBonus(snap.player)) return;
    play('levelup');
    celebrate();
    toast('🎉 Daily bonus claimed!', 'level');
    save();
    emit();
  },
  /** Tap a Lucky Star before it drifts away. */
  catchStar() {
    if (!snap.star || Date.now() > snap.star.until) return;
    snap.star = null;
    const loot = catchStar(snap.player);
    play('match');
    play('coin');
    buzz([15, 30, 15]);
    toast(`🌟 Lucky Star! ${loot.map((g) => (g.id === 'coins' ? `+${g.qty} coins` : `+${g.qty} ${getItem(g.id).name}`)).join(' · ')}`, 'level');
    save();
    emit();
  },
  /** 🎯 Set (or clear, with null) a target level for a skill. */
  setGoal(skill: SkillId, level: number | null) {
    if (level === null) delete snap.player.goals[skill];
    else snap.player.goals[skill] = level;
    save();
    emit();
  },
  /** Pet your pet. Hearts, a happy sound — nothing else needed. */
  /** 🕯️ Relight one of Lunaria's Moonlanterns. */
  lightLantern() {
    const why = whyCantLight(snap.player);
    if (why) return fail(why);
    const report = emptyReport(null);
    lightLantern(snap.player, report);
    play('ignite');
    buzz(20);
    const n = snap.player.lunaria.lanterns;
    toast(n >= LANTERNS ? '🕯️ All seven Moonlanterns burn! The bell tower waits…' : `🕯️ Moonlantern ${n}/${LANTERNS} relit`, n >= LANTERNS ? 'level' : 'good');
    if (n >= LANTERNS) celebrate();
    announceLevels(report);
    save();
    emit();
  },
  /** 🔔 Ring Lunaria's bell — only once every lantern is lit. */
  ringBell() {
    const why = whyCantRing(snap.player);
    if (why) return fail(why);
    ringBell(snap.player);
    play('welcome');
    setTimeout(() => play('levelup'), 600);
    celebrate();
    buzz([40, 60, 40, 60, 80]);
    toast('🔔 The bell rings out across the water… Lunaria is home!', 'level');
    announceLore(syncLore(snap.player));
    toast('🕯️ Wick the lantern spirit joined you · the market reopens', 'good');
    save();
    emit();
  },
  /** 🎪 Trade festival tokens at the stall. */
  buyAtStall(what: StallItem) {
    const why = buyAtStall(snap.player, what);
    if (why) return fail(why);
    const f = activeFestival()!;
    play('coin');
    buzz(20);
    if (what === 'treat') toast(`${f.treat.emoji} ${f.treat.name} — eat it from your bag for +5% XP`, 'good');
    if (what === 'decoration') { celebrate(); toast(`${f.decoration.emoji} ${f.decoration.name} added to your Cottage!`, 'level'); }
    if (what === 'pet') { celebrate(); play('levelup'); toast(`🎉 ${f.pet.emoji} ${f.pet.name} joined you!`, 'level'); }
    save();
    emit();
  },
  /** 🎁 Pick up the Traveller's gift at this town's well. */
  takeTravellerGift() {
    const got = takeTravellerGift(snap.player);
    if (typeof got === 'string') return fail(got);
    play('welcome');
    buzz([20, 40, 20]);
    const what = got.map((s) => `${s.qty > 1 ? `${s.qty.toLocaleString()} ` : ''}${getItem(s.id).name}`).join(', ');
    if (snap.player.location === 'Primordial Rift') {
      // The end of the Traveller's road: you finally meet her (her story is in the Journal's Tales).
      celebrate();
      play('levelup');
      toast(`🎒 You caught up with the Traveller! Read "The Traveller" in your Journal. She gave you: ${what}`, 'level');
    } else {
      toast(`🎁 The Traveller left you: ${what}`, 'level');
    }
    announceLore(syncLore(snap.player));
    save();
    emit();
  },
  /** 🧺 Buy and pry open one of the Wandering Pedlar's sealed crates. Returns what was inside (null if it couldn't). */
  openCrate(key: CrateKey): CrateResult | null {
    const got = openCrate(snap.player, key);
    if (typeof got === 'string') { fail(got); return null; }
    if (got.outcome === 'relic') { celebrate(); buzz([30, 60, 30, 60, 90]); }
    else if (got.outcome === 'treasure') buzz([20, 40, 20]);
    save();
    emit();
    return got;
  },
  petPet() {
    play('match');
    buzz([10, 30, 10]);
    emit();
  },
  ensureRequests() {
    const before = snap.player.requests.day;
    ensureRequests(snap.player);
    if (before !== snap.player.requests.day) { save(); emit(); }
  },

  // ----- Travel -----
  walkTo(to: Region) {
    const why = startWalk(snap.player, to);
    if (why) return fail(why);
    play('click');
    toast(`On the road to ${to}… your idle slots keep working`, 'info');
    save();
    emit();
  },
  fastTravel(to: Region) {
    const why = fastTravel(snap.player, to);
    if (why) return fail(why);
    play('enchant');
    toast(`✨ Fast travelled to ${to}`, 'good');
    save();
    emit();
  },
  cancelTravel() {
    snap.player.travel = null;
    save();
    emit();
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
    trackRequests(snap.player, r.report, 1);
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
    if (coins > 0) { play('coin'); toast(`Sold for ${coins.toLocaleString()} coins`, 'good'); }
    save();
    emit();
  },
  buy(id: string, qty: number) {
    const why = marketBuy(snap.player, id, qty);
    if (why) return fail(why);
    play('coin');
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
  /** 🎒 Buy the Satchel (overflow goes to the bank). */
  buySatchel() {
    const why = buySatchel(snap.player);
    if (why) return fail(why);
    play('coin');
    celebrate();
    toast('🎒 Satchel bought! Anything that won\'t fit in your bag now goes to the bank — idling never stops for a full bag.', 'level');
    save();
    emit();
  },
  toggleSatchel() {
    if (!snap.player.satchel.owned) return;
    snap.player.satchel.on = !snap.player.satchel.on;
    play('equip');
    toast(snap.player.satchel.on ? '🎒 Satchel on: overflow goes to the bank' : '🎒 Satchel off: a full bag stops idling', 'info');
    save();
    emit();
  },
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
    buzz(12);
    trackRequests(snap.player, report, 1);
    trackTutorial(snap.player, report);
    announceLevels(report);
    announcePets(report);
    const found = rollLoreFind(snap.player, 1);
    if (found) announceLore([found]);
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
  /** XP-only minigames (Sort the Catch, Pantry Prep, Joinery). Capped at `maxMult` × the recipe's XP. */
  minigameXp(actionId: string, xp: number, maxMult = 3) {
    const action = ACTIONS[actionId];
    if (!action || xp <= 0) return;
    const report = emptyReport(actionId);
    addXp(snap.player, action, report, Math.round(Math.min(xp, action.xp * maxMult)));
    trackRequests(snap.player, report, 1);
    trackTutorial(snap.player, report);
    announceLevels(report);
    emit();
  },

  /** 🎶 Runesong: an echoed spell gives Enhancing XP and some Magic XP. Returns what was given. */
  runesongCast(length: number): { enhancing: number; magic: number } {
    const len = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.floor(length)));
    const xp = runesongXp(skillLevel(snap.player, 'enhancing'), len);
    const report = emptyReport(null);
    addXp(snap.player, { skill: 'enhancing' }, report, xp.enhancing);
    addXp(snap.player, { skill: 'magic' }, report, xp.magic);
    trackRequests(snap.player, report, 1);
    trackTutorial(snap.player, report);
    announceLevels(report);
    emit();
    return xp;
  },

  /** 🃏 Spellcards: beating ward `w` (0–5) gives Enhancing XP and half as much Magic XP. */
  spellcardsWard(w: number): { enhancing: number; magic: number } {
    const xp = wardXp(skillLevel(snap.player, 'enhancing'), Math.max(0, Math.min(40, Math.floor(w))));
    // Breaking ward 6, and every Deep Ward after it, gets confetti.
    if (w >= 5) celebrate();
    const report = emptyReport(null);
    addXp(snap.player, { skill: 'enhancing' }, report, xp.enhancing);
    addXp(snap.player, { skill: 'magic' }, report, xp.magic);
    trackRequests(snap.player, report, 1);
    trackTutorial(snap.player, report);
    announceLevels(report);
    save();
    emit();
    return xp;
  },

  /** A short buzz (respects the vibration setting). */
  vibrate(ms: number) { buzz(ms); },
  /** Shows a gentle "can't do that" note (with the error sound). */
  cant(reason: string) { fail(reason); },

  /**
   * 🏮 Lantern Watch: the night is over. Combat XP for the time held and monsters beaten, coins, a few
   * rolls of the town's monster loot (through the loot system — never gems), and Lumen on your first dawn.
   */
  lanternWatchEnd(r: { seconds: number; kills: number; won: boolean; coins: number; region?: string; stubs?: number }) {
    const p = snap.player;
    const style = weaponStyle(p);
    const xp = nightXp(skillLevel(p, style), r.seconds, r.kills, r.won);
    const report = emptyReport(null);
    addXp(p, { skill: style }, report, xp.style);
    addXp(p, { skill: 'health' }, report, xp.health);
    addXp(p, { skill: 'defense' }, report, xp.defense);
    // Loot from the town the night was in (a saved night can be finished from anywhere).
    const region = r.region ?? p.location;
    const mobs = MONSTERS.filter((m) => m.region === region && !m.miniboss && !m.weekly);
    const loot: ItemStack[] = [];
    const rolls = lootRolls(r.kills) +(r.won ? 3 : 0);
    for (let i = 0; i < rolls && mobs.length; i++) loot.push(...rollLoot(mobs[Math.floor(Math.random() * mobs.length)].lootTable));
    // Leftover candle stubs are worth a few coins each.
    const stubCoins = Math.max(0, Math.min(2000, Math.floor(r.stubs ?? 0))) * STUB_COINS;
    const coins = Math.max(0, Math.min(15000, Math.floor(r.coins))) + stubCoins;
    if (coins) loot.push({ id: 'coins', qty: coins });
    // Merge the same items together for a tidy summary.
    const merged: ItemStack[] = [];
    for (const s of loot) { const m = merged.find((x) => x.id === s.id); if (m) m.qty += s.qty; else merged.push({ ...s }); }
    const leftover = giveLoot(p, merged);
    const pet = r.won && grantPet(p, 'pet_lumen');
    if (r.won) celebrate();
    trackRequests(p, report, 1);
    trackTutorial(p, report);
    announceLevels(report);
    save();
    emit();
    return {
      won: r.won, xp, coins: merged.find((s) => s.id === 'coins')?.qty ?? 0,
      items: merged.filter((s) => s.id !== 'coins'), leftover: leftover.reduce((s, x) => s + x.qty, 0), pet,
    };
  },

  /**
   * 🎪 Pet Parade is over: coins for each win (a bonus for all 10), plus a rare find and — the first
   * time — Confetti the parade poodle for a full parade. Everything goes through the loot system.
   */
  petParadeEnd(r: { wins: number }) {
    const p = snap.player;
    const best = Math.max(...ALL_SKILLS.map((s) => skillLevel(p, s)));
    const full = r.wins >= PARADE_WINS;
    const loot: ItemStack[] = [];
    const coins = paradeCoins(r.wins, best);
    if (coins) loot.push({ id: 'coins', qty: coins });
    if (full) loot.push({ id: ['bird_nest', 'geode', 'message_bottle'][Math.floor(Math.random() * 3)], qty: 1 });
    const leftover = giveLoot(p, loot);
    const pet = full && grantPet(p, 'pet_confetti');
    if (full) celebrate();
    const report = emptyReport(null);
    if (r.wins > 0) trackRequests(p, report, 1);
    trackTutorial(p, report);
    save();
    emit();
    return { coins, items: loot.filter((s) => s.id !== 'coins'), leftover: leftover.reduce((s, x) => s + x.qty, 0), pet };
  },

  /**
   * 🛡️ Hold the Wall is over: combat XP shared out by what your towers did (archers → Ranged,
   * mages → Magic, soldiers & captain → Melee) plus Defense, coins, the town's monster loot, and
   * Lookout the watch-hawk the first time the wall holds.
   */
  holdWallEnd(r: { waves: number; won: boolean; kills: number; region?: string; dmg: { melee: number; ranged: number; magic: number } }) {
    const p = snap.player;
    const style = weaponStyle(p);
    const xp = wallXp(skillLevel(p, style), r.waves, r.won);
    const report = emptyReport(null);
    const total = r.dmg.melee + r.dmg.ranged + r.dmg.magic;
    const share = (k: 'melee' | 'ranged' | 'magic') => (total > 0 ? r.dmg[k] / total : k === style ? 1 : 0);
    const gained = { melee: 0, ranged: 0, magic: 0, defense: xp.defense };
    for (const k of ['melee', 'ranged', 'magic'] as const) {
      gained[k] = Math.round(xp.combat * share(k));
      if (gained[k] > 0) addXp(p, { skill: k }, report, gained[k]);
    }
    addXp(p, { skill: 'defense' }, report, xp.defense);
    const region = r.region ?? p.location;
    const mobs = MONSTERS.filter((m) => m.region === region && !m.miniboss && !m.weekly);
    const loot: ItemStack[] = [];
    const rolls = Math.min(15, Math.floor(r.waves * 0.8)) + (r.won ? 3 : 0);
    for (let i = 0; i < rolls && mobs.length; i++) loot.push(...rollLoot(mobs[Math.floor(Math.random() * mobs.length)].lootTable));
    const merged: ItemStack[] = [];
    for (const s of loot) { const m = merged.find((x) => x.id === s.id); if (m) m.qty += s.qty; else merged.push({ ...s }); }
    const leftover = giveLoot(p, merged);
    const pet = r.won && grantPet(p, 'pet_lookout');
    if (r.won) celebrate();
    trackRequests(p, report, 1);
    trackTutorial(p, report);
    announceLevels(report);
    save();
    emit();
    return {
      won: r.won, xp: gained, coins: merged.find((s) => s.id === 'coins')?.qty ?? 0,
      items: merged.filter((s) => s.id !== 'coins'), leftover: leftover.reduce((s, x) => s + x.qty, 0), pet,
    };
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
    play('shing');
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
    play('block');
    emit();
    return 'blocked';
  },
  /** 🏡 Build a piece of Cottage furniture. */
  buildFurniture(id: string) {
    const report = emptyReport(null);
    const why = build(snap.player, id, report);
    if (why) return fail(why);
    const f = FURNITURE_MAP[id];
    play('craft');
    play('levelup');
    celebrate();
    buzz([20, 40, 20]);
    toast(`🏡 ${f.emoji} ${f.name} built! ${perkText(f.perk)}`, 'level');
    announceLevels(report);
    trackRequests(snap.player, report, 0);
    save();
    emit();
  },
  // ----- 🌱 Farming -----
  plantSeed(i: number, seedId: string) {
    const report = emptyReport(null);
    const why = plant(snap.player, i, seedId, report);
    if (why) return fail(why);
    play('carve');
    announceLevels(report);
    trackRequests(snap.player, report, 0);
    save();
    emit();
  },
  harvestPlot(i: number) {
    const report = emptyReport(null);
    if (!harvest(snap.player, i, report)) return;
    play('chop');
    play('coin');
    buzz(15);
    const what = Object.entries(report.gained).map(([id, n]) => `+${n} ${getItem(id).name}`).join(' · ');
    toast(`🧺 ${what}`, 'good');
    afterHarvest(report);
  },
  harvestAll() {
    const report = emptyReport(null);
    let n = 0;
    snap.player.farm.plots.forEach((_, i) => { if (harvest(snap.player, i, report)) n++; });
    if (!n) return;
    play('chop');
    play('coin');
    buzz(20);
    toast(`🧺 Harvested ${n} plot${n > 1 ? 's' : ''}: ${Object.entries(report.gained).map(([id, q]) => `+${q} ${getItem(id).name}`).join(' · ')}`, 'good');
    afterHarvest(report);
  },
  tendPlot(i: number) {
    const report = emptyReport(null);
    if (!tend(snap.player, i, report)) return;
    announceLevels(report);
    trackRequests(snap.player, report, 0);
    emit();
  },
  /** 🍲 Eat a meal or drink a brew for its bonus. */
  consumeBuff(id: string) {
    const why = consumeBuff(snap.player, id);
    if (why) return fail(why);
    const item = getItem(id);
    play(item.id.includes('tea') || item.id.includes('tonic') || item.id.includes('brew') ? 'splash' : 'eat');
    toast(`${item.emoji} ${item.name}: ${buffText(item.buff!)} for ${item.buff!.minutes} minutes`, 'good');
    save();
    emit();
  },
  /** 📋 Bounty Board */
  ensureBounties() {
    const before = snap.player.bounties.day;
    ensureBounties(snap.player);
    if (before !== snap.player.bounties.day) { save(); emit(); }
  },
  claimBounty(i: number) {
    const reward = claimBounty(snap.player, i);
    if (!reward) return;
    play('coin');
    buzz(20);
    toast(`📋 Bounty done! +${reward[0].qty.toLocaleString()} coins · ${getItem(reward[1].id).emoji} ${getItem(reward[1].id).name}`, 'good');
    if (snap.player.bounties.list.every((b) => b.claimed)) { celebrate(); toast('📋 All three bounties done today — nice hunting!', 'level'); }
    save();
    emit();
  },
  rerollBounty(i: number) {
    if (!rerollBounty(snap.player, i)) return fail('You can swap one bounty a day');
    play('click');
    save();
    emit();
  },
  /** 📖 Claim the current "Settling In" step. */
  claimTutorialStep() {
    const step = claimStep(snap.player);
    if (!step) return;
    play('levelup');
    buzz(20);
    const reward = step.reward.map((g) => (g.id === 'coins' ? `+${g.qty} coins` : `+${g.qty} ${getItem(g.id).name}`)).join(' · ');
    if (snap.player.tutorial.done) {
      celebrate();
      toast(`📖 Settling In complete! ${reward} · The road to Ironmoor is open — see Travel in Town.`, 'level');
    } else {
      toast(`📖 "${step.title}" done! ${reward} · Next: ${TUTORIAL[snap.player.tutorial.step].title}`, 'good');
    }
    save();
    emit();
  },
  /** 🎁 Open a bird's nest, geode or bottle (or all of them). */
  openFind(id: string, all = false) {
    const r = openFinds(snap.player, id, all ? 9999 : 1);
    if (typeof r === 'string') return fail(r);
    play('match');
    play('coin');
    buzz([10, 30, 10]);
    const what = r.loot.map((g) => (g.id === 'coins' ? `+${g.qty.toLocaleString()} coins` : `+${g.qty} ${getItem(g.id).name}`)).join(' · ');
    const treasure = r.loot.find((g) => getItem(g.id).value !== undefined);
    toast(`${getItem(id).emoji ?? '🎁'} ${r.opened > 1 ? `Opened ${r.opened}: ` : ''}${what}`, treasure ? 'level' : 'good');
    if (treasure) { celebrate(); toast(`✨ A treasure! ${getItem(treasure.id).emoji} ${getItem(treasure.id).name}`, 'level'); }
    announceLore(r.tales);
    save();
    emit();
  },
  eat(id: string) {
    const why = eatFood(snap.player, id);
    if (why) return fail(why);
    play('eat');
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
  /** A little buzz + pop when you pick an item up to drag it. */
  pickUp() {
    buzz(12);
    sound.play('tile', { rate: 1.45, volume: 0.5 });
  },
  /** 🧹 Tidy the bag: join stacks, kept items first, sorted by type. */
  sortBag() {
    lastBagLayout = snap.player.inventory.map((s) => (s ? { ...s } : null));
    sortBag(snap.player);
    sound.play('tile', { rate: 1.1 });
    buzz(15);
    save();
    emit();
  },
  sortBank(mode: BankSort) {
    lastBankOrder = snap.player.bank.map((s) => s.id);
    sortBank(snap.player, mode, (id) => baseValue(getItem(id)));
    sound.play('tile', { rate: 0.95 });
    buzz(15);
    save();
    emit();
  },
  /** ↶ Undo the last sort of the bag or bank. */
  undoSort(where: 'bag' | 'bank') {
    if (where === 'bank' && lastBankOrder) restoreBankOrder(snap.player, lastBankOrder);
    else if (where === 'bag' && lastBagLayout) { if (!restoreBagLayout(snap.player, lastBagLayout)) return fail('Your bag changed since — too late to undo'); }
    else return;
    if (where === 'bank') lastBankOrder = null; else lastBagLayout = null;
    sound.play('tile', { rate: 0.85 });
    save();
    emit();
  },
  /** Drag and drop in the bag (swap, or join matching stacks). */
  moveBagSlot(from: number, to: number) {
    moveBagSlot(snap.player, from, to);
    sound.play('tile', { rate: 1.2, volume: 0.7 });
    save();
    emit();
  },
  /** Drag and drop in the bank. */
  moveBankItem(fromId: string, toId: string) {
    moveBankItem(snap.player, fromId, toId);
    sound.play('tile', { rate: 1.2, volume: 0.7 });
    save();
    emit();
  },
  /** 📌 Keep an item in the bag when depositing everything. */
  toggleKeep(id: string) {
    const on = toggleKeep(snap.player, id);
    play('click');
    toast(on ? `📌 ${getItem(id).name} stays in your bag on "Deposit all"` : `${getItem(id).name} will be deposited with everything else`, 'info');
    save();
    emit();
  },

  // ----- ✨ The Starforge (Ascended items, levels 750+) -----
  breakDown(id: string, from: 'bag' | 'bank') {
    const name = getItem(id).name;
    const gain = breakDown(snap.player, id, from);
    if (!gain) return fail("Couldn't break that down");
    play('rune');
    toast(`✨ Broke down ${name}: +${gain} Starlight`, 'good');
    save();
    emit();
  },
  breakDownAllFine() {
    const r = breakDownAllFine(snap.player);
    if (!r.items) return fail('No spare Fine items');
    play('rune');
    toast(`✨ Broke down ${r.items} Fine item${r.items === 1 ? '' : 's'}: +${r.starlight} Starlight`, 'good');
    save();
    emit();
  },
  craftAscended(baseKey: string): string | null {
    const why = whyCantCraft(snap.player, baseKey);
    if (why) { fail(why); return null; }
    const id = craftAscended(snap.player, baseKey);
    if (!id) return null;
    const g = getItem(id).ascended!.grade;
    play(g.key === 'd' || g.key === 'g' ? 'levelup' : 'enchant');
    toast(`✨ The Starforge made a ${getItem(id).name}!`, g.key === 'f' ? 'good' : 'level');
    if (g.key === 'd' || g.key === 'g') celebrate();
    save();
    emit();
    return id;
  },
  reforge(id: string, from: ForgePlace, locked: BonusKey[]): string | null {
    const why = whyCantReforge(snap.player, id, from, locked);
    if (why) { fail(why); return null; }
    const next = reforge(snap.player, id, from, locked);
    if (!next) return null;
    play('enchant');
    save();
    emit();
    return next;
  },
  ascendRelic(key: RelicKey): string | null {
    const why = whyCantAscendRelic(snap.player, key);
    if (why) { fail(why); return null; }
    const id = ascendRelic(snap.player, key);
    if (!id) return null;
    play('levelup');
    play('enchant');
    toast(`🌟 ${getItem(id).name}! Its power grows.`, 'level');
    celebrate();
    save();
    emit();
    return id;
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
  /** 🔔 Turn notifications on/off on this device. Returns a message if it couldn't be turned on. */
  async setNotifications(on: boolean): Promise<string | null> {
    if (on) {
      const why = await enablePush();
      if (why) { play('error'); return why; }
      play('levelup');
      toast('🔔 Notifications on — we’ll let you know when idling stops or crops are ready', 'good');
    } else {
      await disablePush();
    }
    game.setSettings({ ...snap.settings, notify: { ...snap.settings.notify, on } });
    return null;
  },
  clearLastStop() {
    snap.player.lastStop = null;
    emit();
  },
};
