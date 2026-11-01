// 🗝️ The Dungeon as an extraction run (v0.0.1.77, owner's design — see docs/design.md "The Dungeon — an extraction run").
// Rules only (no drawing): the room map, the run kept in the save, and what's lost when you're knocked out.
//
// You gear up, then go in with everything you wear (and its socketed gems) plus packed food. Rooms are laid out in
// rows; after clearing a room you choose 1 of the 2 rooms in the next row. 🚪 Exit rooms and beating the 👑 boss get you
// out with your run bag. Knocked out = everything you brought and found is gone (XP earned is kept).
import { CRAFTED_TOOLS, TOOL_TIERS, toolName, type EquipSlot } from '../data/items';
import { ACTIONS, SKILLS, type ActionDef } from '../data/skills';
import type { NodeKind } from './dungeon';
import { equippedToolTier } from './idle';
import { levelForXp } from './xp';
import type { PlayerState } from './player';
import { REGIONS, type Region } from '../data/tiers';
import type { ItemStack } from './player';

export type RoomKind = 'fight' | 'elite' | 'treasure' | 'camp' | 'exit' | 'shop' | 'boss';
export interface Room { kind: RoomKind; seed: number }
export interface DungeonRun {
  region: Region;
  /** rows[0] is the entrance (one room); the last row is the boss (one room); rows in between have 2 rooms. */
  rows: Room[][];
  /** Where you are: row and room index. `cleared` = that room is done and you're on the map choosing. */
  row: number; at: number; cleared: boolean;
  hp: number;
  /** Everything you wore when you went in (taken out of your equipment while you're inside). */
  gear: Partial<Record<EquipSlot, string>>;
  sockets: Partial<Record<EquipSlot, string>>;
  /** Packed food (eaten as 🍖 snacks). */
  food: ItemStack[];
  /** What you've found and kept so far (it only becomes yours when you get out). */
  bag: ItemStack[];
  kills: number;
  startedAt: number;
}

export const ROOM_INFO: Record<RoomKind, { emoji: string; name: string; text: string }> = {
  fight: { emoji: '⚔️', name: 'Monster den', text: 'A handful of monsters.' },
  elite: { emoji: '💀', name: 'Lair', text: 'Tougher monsters, double loot.' },
  treasure: { emoji: '💰', name: 'Treasure room', text: 'A few guards and a chest.' },
  camp: { emoji: '🔥', name: 'Campfire', text: 'Rest: heal half your health.' },
  shop: { emoji: '🧺', name: "Wick's stall", text: 'A tunnel trader: sell your finds for gold, buy food and healing draughts.' },
  exit: { emoji: '🚪', name: 'Way out', text: 'A few monsters, then you can leave with your loot — or press on.' },
  boss: { emoji: '👑', name: "The boss's hall", text: 'Beat it to get out with everything.' },
};
/** Most food you can pack. */
export const FOOD_MAX = 10;
/** A campfire heals this share of your health. */
export const CAMP_HEAL = 0.5;
/** Rows of rooms, entrance and boss included. */
export const ROWS = 7;
/** Rows that always offer a 🚪 way out as one of their two rooms. */
const EXIT_ROWS = [2, 4];

/** Lays out a fresh map. */
export function newMap(rand: () => number = Math.random): Room[][] {
  const seed = () => Math.floor(rand() * 2 ** 31);
  const pick = (): RoomKind => { const r = rand(); return r < 0.4 ? 'fight' : r < 0.58 ? 'elite' : r < 0.75 ? 'treasure' : r < 0.87 ? 'camp' : 'shop'; };
  const rows: Room[][] = [[{ kind: 'fight', seed: seed() }]];
  for (let r = 1; r < ROWS - 1; r++) {
    let a = pick(), b = pick();
    if (a === b && (a === 'camp' || a === 'shop')) b = 'fight';
    if (EXIT_ROWS.includes(r)) { if (rand() < 0.5) a = 'exit'; else b = 'exit'; }
    rows.push([{ kind: a, seed: seed() }, { kind: b, seed: seed() }]);
  }
  // 🧺 Wick sets up somewhere in the middle rows at least once a run.
  if (!rows.some((row) => row.some((x) => x.kind === 'shop'))) {
    const r = 2 + Math.floor(rand() * 3);
    const i = rows[r].findIndex((x) => x.kind !== 'exit');
    rows[r][i < 0 ? 0 : i].kind = 'shop';
  }
  rows.push([{ kind: 'boss', seed: seed() }]);
  return rows;
}

export const roomOf = (run: DungeonRun): Room => run.rows[run.row][run.at];
/** The rooms you can walk into next (empty while in a room, or at the end). */
export const nextChoices = (run: DungeonRun): Room[] => (run.cleared && run.row < run.rows.length - 1 ? run.rows[run.row + 1] : []);
/** You can leave with your loot: you're standing in a cleared 🚪 room. */
export const canExtract = (run: DungeonRun) => run.cleared && roomOf(run).kind === 'exit';
export const foodCount = (run: DungeonRun) => run.food.reduce((n, x) => n + x.qty, 0);
/** 💰 Gold in the run bag. */
export const bagGold = (run: DungeonRun) => run.bag.find((x) => x.id === 'coins')?.qty ?? 0;

/** Adds stacks into a list, merging the same item. */
export function addStacks(into: ItemStack[], add: ItemStack[]) {
  for (const x of add) {
    if (!x || x.qty <= 0) continue;
    const m = into.find((y) => y.id === x.id);
    if (m) m.qty += x.qty; else into.push({ id: x.id, qty: x.qty });
  }
}
/** Takes `n` food off the top of the packed food (eaten snacks). */
export function eatFood(run: DungeonRun, n: number) {
  for (const x of run.food) {
    if (n <= 0) break;
    const k = Math.min(n, x.qty);
    x.qty -= k;
    n -= k;
  }
  run.food = run.food.filter((x) => x.qty > 0);
}

// ----- ⛏️ Rare resources (v0.0.1.78, owner: "rare resources but if you didn't bring the right tool you won't be able to harvest it") -----
const NODE_SKILL_ = { ore: 'mining', tree: 'woodcutting', herb: 'herblore', fish: 'fishing' } as const;
/** A rich spot is worth this many normal gathering actions (items and XP). */
export const HARVEST_YIELD = 6;
/** Chance a rich spot also gives that skill's rare find (geode, bird's nest, corked bottle). */
export const HARVEST_FIND = 0.25;
/** The town's own gathering action for that kind of spot (its best one). */
export function gatherActionFor(region: Region, kind: NodeKind): ActionDef | undefined {
  const skill = NODE_SKILL_[kind];
  return Object.values(ACTIONS).filter((a) => a.skill === skill && a.region === region && !a.inputs.length && a.output && !a.lost && a.output.item !== 'rune_essence')
    .sort((a, b) => (b.needsTool ?? 0) - (a.needsTool ?? 0) || b.level - a.level)[0];
}
/** Why you can't harvest this kind of spot (null = you can): you need that skill's tool, good enough, and the level. */
export function whyCantHarvest(hero: PlayerState, region: Region, kind: NodeKind): string | null {
  const a = gatherActionFor(region, kind);
  if (!a) return 'Nothing to gather here';
  const tier = Math.max(0, a.needsTool ?? 0);
  if (equippedToolTier(hero, a.skill) < tier) {
    const tool = CRAFTED_TOOLS.find((t) => t.skill === a.skill);
    const name = tool ? toolName(TOOL_TIERS[Math.min(tier, TOOL_TIERS.length - 1)], tool) : '';
    return tool ? `Needs ${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}` : 'Needs a tool';
  }
  if (levelForXp(hero.skills[a.skill].xp) < a.level) return `Needs ${SKILLS[a.skill].name} ${a.level}`;
  return null;
}

// ----- Kept in the save: the save loader keeps only what it recognises, so check everything. -----
const isStacks = (v: unknown): v is ItemStack[] => Array.isArray(v) && v.every((x) => x && typeof x.id === 'string' && Number.isInteger(x.qty) && x.qty > 0);
const isSlotMap = (v: unknown): v is Partial<Record<EquipSlot, string>> => !!v && typeof v === 'object' && Object.values(v as object).every((x) => typeof x === 'string');
const KINDS: RoomKind[] = ['fight', 'elite', 'treasure', 'camp', 'exit', 'shop', 'boss'];
export function loadDungeonRun(raw: unknown): DungeonRun | undefined {
  const r = raw as DungeonRun | null;
  if (!r || typeof r !== 'object') return undefined;
  if (!(REGIONS as readonly string[]).includes(r.region)) return undefined;
  if (!Array.isArray(r.rows) || !r.rows.length || !r.rows.every((row) => Array.isArray(row) && row.length && row.every((x) => x && KINDS.includes(x.kind) && Number.isFinite(x.seed)))) return undefined;
  if (!Number.isInteger(r.row) || !Number.isInteger(r.at) || !r.rows[r.row]?.[r.at]) return undefined;
  if (!isSlotMap(r.gear) || !isSlotMap(r.sockets) || !isStacks(r.food) || !isStacks(r.bag)) return undefined;
  return {
    region: r.region, rows: r.rows.map((row) => row.map((x) => ({ kind: x.kind, seed: x.seed }))), row: r.row, at: r.at, cleared: !!r.cleared,
    hp: Number.isFinite(r.hp) && r.hp > 0 ? r.hp : 1, gear: { ...r.gear }, sockets: { ...r.sockets },
    food: r.food.map((x) => ({ ...x })), bag: r.bag.map((x) => ({ ...x })), kills: Number.isInteger(r.kills) ? r.kills : 0,
    startedAt: Number.isFinite(r.startedAt) ? r.startedAt : Date.now(),
  };
}
