// ⛏️ Deep Delve (v0.0.2.38, Mining's second game — owner picked it: "dig your way down a mine shaft"). Engine only.
//  • A shaft COLS wide going down forever (rows made as you go, seeded). You start on the surface (row 0).
//  • Tap a block next to you (left, right, below, or above if open) to hit it; dirt takes 1 hit, stone 2, deep rock
//    3 (a better pick takes fewer). When it breaks you step into it — and any ore in it goes in your sack.
//  • Every step burns lantern oil. 🪢 Rope up whenever you like: it costs oil to climb (by depth), and you keep the
//    whole haul. If the lantern goes out, the canary leads you home and you keep half. Cozy: nothing else is lost.
//  • Hauls pay Mining XP (game) and delve coins (saved) for upgrades: pick, lantern, sack.
export const COLS = 7;

export type Cell = 'open' | 'dirt' | 'stone' | 'rock';
export type Ore = 'copper' | 'iron' | 'silver' | 'gold' | 'mythril' | 'fossil' | 'chest';
export const ORES: Record<Ore, { emoji: string; name: string; value: number; color: string }> = {
  copper: { emoji: '🟠', name: 'Copper', value: 2, color: '#c2410c' },
  iron: { emoji: '⚪', name: 'Iron', value: 4, color: '#d1d5db' },
  silver: { emoji: '🔘', name: 'Silver', value: 8, color: '#e5e7eb' },
  gold: { emoji: '🟡', name: 'Gold', value: 15, color: '#facc15' },
  mythril: { emoji: '🔵', name: 'Mythril', value: 28, color: '#60a5fa' },
  fossil: { emoji: '🦴', name: 'Fossil', value: 20, color: '#f5f5f4' },
  chest: { emoji: '🧰', name: 'Old chest', value: 60, color: '#b45309' },
};

export interface Block { cell: Cell; ore: Ore | null; hits: number }
/** Upgrades kept between dives (saved per save as `player.delve`). */
export interface DelveKit { pick: number; lantern: number; sack: number; coins: number; best: number }
export const NEW_KIT: DelveKit = { pick: 0, lantern: 0, sack: 0, coins: 0, best: 0 };
export const MAX_UPGRADE = 8;

export const oilMax = (k: DelveKit) => 40 + 15 * k.lantern;
export const sackMax = (k: DelveKit) => 12 + 4 * k.sack;
/** Hits a block needs with your pick. */
export function hitsFor(cell: Cell, k: DelveKit): number {
  const base = cell === 'dirt' ? 1 : cell === 'stone' ? 2 : cell === 'rock' ? 3 : 0;
  return Math.max(1, base - Math.floor(k.pick / 3));
}
/** Pick upgrades also give a chance to break a block in one fewer hit. */
export const pickBonus = (k: DelveKit) => (k.pick % 3) * 0.25;
export function upgradeCost(kind: 'pick' | 'lantern' | 'sack', level: number): number {
  const base = kind === 'pick' ? 60 : kind === 'lantern' ? 45 : 35;
  return Math.round(base * Math.pow(1.7, level));
}
/** Climbing back up costs oil: a third of your depth, rounded up. */
export const ropeCost = (depth: number) => Math.ceil(depth / 3);

export interface Dive {
  seed: number;
  rows: Block[][];
  x: number; y: number;
  oil: number;
  sack: Ore[];
  /** Blocks broken this dive (for XP). */
  broken: number;
  over: boolean;
  /** 'rope' = climbed out with everything, 'dark' = lantern went out (half kept). */
  how: 'rope' | 'dark' | null;
  events: string[];
}

function hashRow(seed: number, y: number) {
  let s = (seed ^ Math.imul(y + 1, 0x9e3779b1)) >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Which ores turn up at a depth (deeper = better), and how often a block holds one. */
function oreAt(y: number, r: () => number): Ore | null {
  const chance = 0.16 + Math.min(0.12, y / 400);
  if (r() >= chance) return null;
  const roll = r();
  if (y > 20 && roll < 0.02) return 'chest';
  if (y > 10 && roll < 0.06) return 'fossil';
  const pool: Ore[] = y < 12 ? ['copper', 'copper', 'iron'] : y < 30 ? ['copper', 'iron', 'iron', 'silver'] : y < 55 ? ['iron', 'silver', 'silver', 'gold']
    : y < 90 ? ['silver', 'gold', 'gold', 'mythril'] : ['gold', 'mythril', 'mythril'];
  return pool[Math.floor(r() * pool.length)];
}

function makeRow(seed: number, y: number): Block[] {
  if (y === 0) return Array.from({ length: COLS }, () => ({ cell: 'open', ore: null, hits: 0 }));
  const r = hashRow(seed, y);
  return Array.from({ length: COLS }, () => {
    const roll = r();
    const deep = Math.min(1, y / 70);
    const cell: Cell = roll < 0.55 - 0.4 * deep ? 'dirt' : roll < 0.9 - 0.25 * deep ? 'stone' : 'rock';
    return { cell, ore: oreAt(y, r), hits: 0 };
  });
}

export function newDive(kit: DelveKit, seed = (Math.random() * 2 ** 32) >>> 0): Dive {
  const d: Dive = { seed, rows: [], x: Math.floor(COLS / 2), y: 0, oil: oilMax(kit), sack: [], broken: 0, over: false, how: null, events: [] };
  for (let y = 0; y < 14; y++) d.rows.push(makeRow(seed, y));
  return d;
}

export const blockAt = (d: Dive, x: number, y: number): Block | null => (x < 0 || x >= COLS || y < 0 ? null : d.rows[y]?.[x] ?? null);

/** Tap the block at (x, y): hit it, or step into it if it's open. Only next to you (no diagonals). */
export function tap(d: Dive, kit: DelveKit, x: number, y: number, rng = Math.random): 'hit' | 'broke' | 'move' | 'no' {
  if (d.over) return 'no';
  if (Math.abs(x - d.x) + Math.abs(y - d.y) !== 1) return 'no';
  const b = blockAt(d, x, y);
  if (!b) return 'no';
  if (b.cell === 'open') {
    if (y < d.y && y === 0) { /* back on the surface: rope is free from here */ }
    return move(d, x, y) ? 'move' : 'no';
  }
  if (y < d.y) return 'no'; // can't dig upward into solid rock
  b.hits++;
  const need = hitsFor(b.cell, kit) - (rng() < pickBonus(kit) ? 1 : 0);
  if (b.hits < Math.max(1, need)) { d.events.push('hit'); return 'hit'; }
  b.cell = 'open';
  d.broken++;
  if (b.ore) {
    if (d.sack.length < sackMax(kit)) { d.sack.push(b.ore); d.events.push(`ore:${b.ore}`); }
    else d.events.push('full');
    b.ore = null;
  } else d.events.push('break');
  move(d, x, y);
  return 'broke';
}

function move(d: Dive, x: number, y: number): boolean {
  d.x = x; d.y = y;
  if (y > 0) d.oil -= 1;
  while (d.rows.length < y + 12) d.rows.push(makeRow(d.seed, d.rows.length));
  if (d.oil <= 0 && d.y > 0) { d.over = true; d.how = 'dark'; d.events.push('dark'); }
  return true;
}

/** 🪢 Climb out with everything (if there's oil enough for the climb). */
export function ropeUp(d: Dive): boolean {
  if (d.over || d.oil < ropeCost(d.y)) return false;
  d.oil -= ropeCost(d.y);
  d.over = true;
  d.how = 'rope';
  d.events.push('rope');
  return true;
}

/** What you bring home: the whole sack after a rope-up, half (the best half) if the lantern went out. */
export function haul(d: Dive): Ore[] {
  if (d.how === 'rope') return d.sack;
  return [...d.sack].sort((a, b) => ORES[b].value - ORES[a].value).slice(0, Math.floor(d.sack.length / 2));
}
export const haulValue = (ores: Ore[]) => ores.reduce((s, o) => s + ORES[o].value, 0);

/** Mining XP for a dive: per block broken and per ore value brought home, × the chosen rock's XP, a little more deeper. */
export function delveXp(d: Dive, baseXp: number): number {
  const v = haulValue(haul(d));
  return Math.max(1, Math.round(baseXp * (d.broken * 0.6 + v * 0.5) * (1 + Math.min(1, d.y / 150) * 0.3)));
}
