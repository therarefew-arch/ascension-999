// The player's own data — everything that gets saved. Kept apart from game data,
// the market and the loot rules so it can later live on a server for multiplayer.
import type { EquipSlot, SkillId } from '../data/items';
import type { FightState } from './combat';
import type { Region } from '../data/tiers';
import type { FamilyLink, FamilyWeek, GiftOut } from './family';
import type { HallState } from './guildHall';
import type { TownRequest } from './cozy';
import type { Bounty } from './bounties';
import type { ActiveBuff } from './buffs';
import type { Plot } from './farming';
import type { RelicKey } from '../data/relics';

/**
 * v2: added 6 skills; the old "tool" gear slot became "pickaxe".
 * v3: pickaxes moved from Smithing to Crafting; tool tiers renamed (pine→stone, oak→bronze); cooking fire.
 * v4: combat — 5 combat skills, hit points, coins, gem sockets, fights, mini boss timers.
 * v5: Runecrafting — minor/major runes → air/earth runes, old staffs → air staffs (blank staffs are new).
 * v6: economy — up to 3 idle slots, bigger bags, rotating-shop purchases.
 * v7: quality of life — XP tracker, collection log, pets, gear loadouts, idle presets.
 * v8: weekly boss, Wildfire, bonfires.
 * v9: regions — where you are, which regions you've discovered, travelling.
 * v10: cozy — daily gift streak, Town Requests.
 * v11: skill goals, Lucky Stars caught.
 * v12: lore notes found (Coalhaven update).
 * v13: new XP pacing (towns every 75 levels). XP is kept as-is; levels are worked out from it, so they only go up.
 * v14: towns front-loaded (1, 50, 110, 175 …). Levels don't change; towns just open sooner.
 * v15: Lunaria's mystery (lanterns relit, town restored).
 * v16: the Satchel, rare finds, "Settling In" starter questline.
 * v17: Bounty Board, seasoned tools.
 * v18: Herblore and Farming skills, garden plots, meal/brew buffs.
 * v19: the Cottage (furniture built).
 * v20: Cinderpeak — the Traveller's gifts picked up.
 * v21: Fishing Journal (rare fish caught), seasonal festivals seen.
 * v22: the bank keeps your own order (drag & drop, sort); 📌 items kept in the bag.
 */
export const SAVE_VERSION = 22;
/** Starting bag size. Can be upgraded with coins up to MAX_BAG_SLOTS. */
export const INVENTORY_SLOTS = 30;
export const MAX_BAG_SLOTS = 70;
export const MAX_IDLE_SLOTS = 4;
/** Max of one stackable item in a single bag slot. */
export const STACK_LIMIT = 999;
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
  /** Daily gift: last day claimed and the current streak. */
  daily: { lastDay: string | null; streak: number };
  /** Today's three Town Requests. */
  requests: { day: string; tasks: TownRequest[]; bonusClaimed: boolean };
  /** Target level the player picked for each skill (🎯). */
  goals: Partial<Record<SkillId, number>>;
  /** Lucky Stars caught (just for fun / the Journal). */
  starsCaught: number;
  /** Lore notes found (ids from data/lore.ts). */
  lore: string[];
  /** 🔍 Lunaria's mystery: Moonlanterns relit, and whether the town is home again. */
  lunaria: { lanterns: number; restored: boolean };
  /** 🎒 The Satchel: when on, anything that doesn't fit in the bag goes to the bank. */
  satchel: { owned: boolean; on: boolean };
  /** 📖 "Settling In" starter questline. */
  tutorial: { step: number; progress: number; done: boolean };
  /** 📋 Today's three combat bounties. */
  bounties: { day: string; list: Bounty[]; rerolled: boolean };
  /** 🪓 Seasoned tools: actions done per skill (tools get a little faster with use). */
  toolUses: Partial<Record<SkillId, number>>;
  /** 🧰 Helpers you paused (item ids) — they stay in your bag/bank instead of being used. */
  helpersOff: string[];
  /** 🍲 Active meal and brew bonuses, keyed by kind + skill. */
  buffs: Record<string, ActiveBuff>;
  /** 📚 Skill tutors bought at the Trading Post: +1% XP per level in that skill (market/upgrades.ts). */
  tutors: Partial<Record<SkillId, number>>;
  /** 🌱 Your garden plots (Farming). */
  farm: { plots: (Plot | null)[] };
  /** 🏡 Cottage furniture you've built (ids from core/cottage.ts). */
  cottage: string[];
  /** 🏠 Where each built piece sits in the room (0 = put away in storage), and the wallpaper + floor (v0.0.2.2). */
  cottageLayout?: Record<string, import('./cottage').Spot | 0>;
  /** 🛍️ Decorations you've bought (each copy's id, e.g. `rug_cream.2`) — v0.0.2.5. */
  cottageDecor?: string[];
  cottageStyle?: { wall: import('./cottage').WallId; floor: import('./cottage').FloorId };
  /** 🎒 Towns where you've picked up the Traveller's gift at the well. */
  travellerGifts: string[];
  /** 📖 Fishing Journal: rare fish caught (how many, biggest in cm). */
  fishJournal: Record<string, { n: number; best: number }>;
  /** 🎪 Seasonal festivals you've been welcomed to (e.g. "harvest-2026"). */
  festivalsSeen: string[];
  /** 📌 Items "Deposit all" leaves in the bag. */
  keep: string[];
  /** ✨ Relics found: the strongest tier of each (one of each per save). */
  relics: Partial<Record<RelicKey, number>>;
  /** 🧺 The Wandering Pedlar: Pedlar's Favour (empty crates in a row) and crates opened. */
  pedlar: { favour: number; opened: number };
  /** 🌟 Starlight (the Ascension's crafting currency, levels 750+). */
  starlight: number;
  /** 👪 Your family (v0.0.1.55): member id + secret token for the family board. Not set = not in a family. */
  family?: FamilyLink;
  /** 🏆 Your counts toward this week's family goal + steps claimed (v0.0.1.56). */
  familyWeek?: FamilyWeek;
  /** 🔥 Hearth Together: the local day someone else in your family played (+5% XP that day). */
  hearth?: string;
  /** 🏰 Guild Hall (v0.0.2.22): rooms finished + your donations to the one being built, for guild `f`. */
  hall?: HallState;
  /** 🤝 Thank-you gifts sent to guildmates' heroes today (max 3 a day). */
  heroThanks?: { day: string; n: number };
  /** 📖 Lost recipes learned on expeditions (action ids). */
  recipes?: string[];
  /** 🧭 Expedition bosses beaten, per town. */
  expeditionWins?: Partial<Record<Region, number>>;
  /** 🏰 Dungeon (v0.0.1.76): when each town's dungeon boss has its treasure again (ms). */
  dungeonBossAt?: Partial<Record<Region, number>>;
  /** 🎪 Today's town happening: how far you've joined in, and whether the prize is collected. */
  happening?: import('./happenings').HappeningState;
  /** 🧺 Sort the Catch: the level you're on (1–999, v0.0.2.13). */
  sortLevel?: number;
  /** 🧶 The Loom: the level you're on (1–999, v0.0.2.16). */
  loomLevel?: number;
  /** 🌲 Forester's Grove level (v0.0.2.35, 1–999). */
  groveLevel?: number;
  /** 🔥 Forge Rush level (v0.0.2.37, 1–999). */
  forgeLevel?: number;
  /** 🧪 The Apothecary level (v0.0.2.39, 1–999). */
  apoLevel?: number;
  /** 🏡 Little Homestead (v0.0.2.40). */
  homestead?: import('./homestead').Homestead;
  /** ⛏️ Deep Delve upgrades, delve coins and deepest dive (v0.0.2.38). */
  delve?: import('./delve').DelveKit;
  /** 🗝️ The extraction run you're on (your worn gear is inside it while you're in the dungeon). */
  dungeonRun?: import('./dungeonRun').DungeonRun;
  /** 🎁 Gifts you sent that the server hasn't confirmed yet (already taken out of your save). */
  giftsOut?: GiftOut[];
  /** 🎁 Ids of gifts you've unwrapped (so one is never unwrapped twice). */
  giftsGot?: string[];
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
    herblore: { xp: 0 }, farming: { xp: 0 },
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
    slots: [null, null, null, null],
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
    daily: { lastDay: null, streak: 0 },
    requests: { day: '', tasks: [], bonusClaimed: false },
    goals: {},
    starsCaught: 0,
    lore: [],
    lunaria: { lanterns: 0, restored: false },
    satchel: { owned: false, on: false },
    tutorial: { step: 0, progress: 0, done: false },
    bounties: { day: '', list: [], rerolled: false },
    toolUses: {},
    helpersOff: [],
    buffs: {},
    tutors: {},
    farm: { plots: [null, null, null, null] },
    cottage: [],
    travellerGifts: [],
    fishJournal: {},
    festivalsSeen: [],
    keep: [],
    relics: {},
    pedlar: { favour: 0, opened: 0 },
    starlight: 0,
  };
}

export function clonePlayer(p: PlayerState): PlayerState {
  return structuredClone(p);
}
