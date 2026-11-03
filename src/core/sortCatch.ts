// 🧺 Sort the Catch (Fishing) — v3 (v0.0.1.63, owner's picture: a tile-stack game).
// A big pile of catch tiles, all face-up, stacked in overlapping layers. A tile can be picked when no
// other tile lies on top of it (covered tiles look darker).
// - Picked tiles go into the basket: 4 slots. Two alike clear (v0.0.1.64, owner: "it should clear in 2") for
//   Fishing XP. Picking a 5th different fish overflows the basket — the round ends, you keep the XP
//   (and ↩️ Undo can still save it). Misses never cost anything.
// - Every pair fills the combo bar (7); a full bar adds +0.5× to the XP multiplier (max 3×).
// - Helpers per crate: 🔀 Shuffle (the fish on the board swap around, still solvable), 🔍 Hint, ↩️ Undo.
// Boards are built so they can always be cleared (fish are dealt in pairs in a pick-able order).
// - 🪜 Levels 1–999 (v0.0.2.13, owner: "levels that go to 999, progressively harder"): `levelSpec` grows the pile
//   (more tiles, more layers, upper layers fuller), adds kinds of fish and hands out fewer helpers. Fast early on,
//   slower later (a square-root-ish curve). Clearing a crate moves you up a level (`player.sortLevel`).

/** A tile: x, y in half-tile steps (so tiles can sit half over each other), z = layer. */
export interface Tile { id: number; x: number; y: number; z: number; face: number }
export interface Slot { face: number; ids: number[] }

export const FACES = ['🐟', '🦐', '🦀', '🐚', '⭐', '🐙', '🐠', '⚓', '🐡', '🦑', '🐢', '🪸', '🦞', '🐬', '🦈', '🐋'];
export const MAX_SORT_LEVEL = 999;
export const BASKET = 4;
/** How many alike clear. */
export const MATCH = 2;
export const COMBO_BAR = 7;
export const HELPERS = { shuffle: 2, hint: 3, undo: 3 } as const;
/** Widest board in tiles (base layer) — the screen sizes tiles for this. */
export const COLS = 6;
export const ROWS = 8;

export interface LevelSpec { cols: number; rows: number; layers: number; fill: number; kinds: number; helpers: Record<keyof typeof HELPERS, number> }
/** How a level's crate is built. Level 1 is a small, gentle pile; level 999 a tall heap of 16 kinds with one of each helper. */
export function levelSpec(level: number): LevelSpec {
  const L = Math.max(1, Math.min(MAX_SORT_LEVEL, Math.floor(level)));
  const e = Math.pow((L - 1) / (MAX_SORT_LEVEL - 1), 0.35); // 0 → 1, quick at first
  const cols = L < 4 ? 4 : L < 12 ? 5 : 6;
  const rows = L < 4 ? 4 : L < 12 ? 5 : L < 30 ? 6 : L < 120 ? 7 : 8;
  return {
    cols, rows,
    layers: L < 8 ? 2 : L < 40 ? 3 : L < 150 ? 4 : L < 600 ? 5 : 6,
    fill: Math.min(0.95, 0.45 + 0.5 * e),
    kinds: Math.min(FACES.length, Math.round(5 + e * (FACES.length - 5))),
    helpers: {
      shuffle: L < 50 ? 3 : 2,
      hint: L < 30 ? 4 : L < 120 ? 3 : L < 350 ? 2 : 1,
      undo: L < 30 ? 4 : L < 120 ? 3 : L < 350 ? 2 : 1,
    },
  };
}

/** Does tile b lie on (part of) tile a? */
const covers = (b: Tile, a: Tile) => b.z > a.z && Math.abs(b.x - a.x) < 2 && Math.abs(b.y - a.y) < 2;
export const isFree = (t: Tile, tiles: Tile[]) => !tiles.some((o) => o.id !== t.id && covers(o, t));

function shuffled<T>(a: T[], rng: () => number): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/** The pile's shape: a full base, then layers that alternate half-shifted and straight, each a little smaller,
 * with holes so every crate looks different. Higher levels stack more layers and fill them more. */
function layout(spec: LevelSpec, rng: () => number): { x: number; y: number; z: number }[] {
  const { cols, rows } = spec;
  const s: { x: number; y: number; z: number }[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) s.push({ x: x * 2, y: y * 2, z: 0 });
  for (let z = 1; z < spec.layers; z++) {
    const half = z % 2 === 1;
    const inset = Math.floor((z - 1) / 2); // straight layers shrink by one tile each side
    const spots: typeof s = [];
    if (half) { for (let y = inset; y < rows - 1 - inset; y++) for (let x = inset; x < cols - 1 - inset; x++) spots.push({ x: x * 2 + 1, y: y * 2 + 1, z }); }
    else { for (let y = inset + 1; y < rows - 1 - inset; y++) for (let x = inset + 1; x < cols - 1 - inset; x++) spots.push({ x: x * 2, y: y * 2, z }); }
    const share = spec.fill * (1 - 0.12 * (z - 1));
    s.push(...shuffled(spots, rng).slice(0, Math.round(spots.length * share)));
  }
  while (s.length % MATCH) s.pop();
  return s;
}

let nextId = 1;
export function newBoard(level = 1, rng: () => number = Math.random): Tile[] {
  const spec = levelSpec(level);
  for (let attempt = 0; attempt < 200; attempt++) {
    const tiles = layout(spec, rng).map((p) => ({ id: nextId++, ...p, face: 0 }));
    const kinds = shuffled(FACES.map((_, i) => i), rng).slice(0, spec.kinds);
    const triples = Array.from({ length: tiles.length / MATCH }, (_, i) => kinds[i % kinds.length]);
    if (dealExact(tiles, [], triples, rng)) return tiles;
  }
  throw new Error('Could not build a board');
}

/** 🔀 Shuffle: the same fish on the board swap places — and it still works out. */
export function shuffleBoard(tiles: Tile[], basket: Slot[], rng: () => number = Math.random): Tile[] {
  const copy = tiles.map((t) => ({ ...t }));
  // Fish still on the board (besides those finishing the basket's stacks), as whole pairs.
  const counts = new Map<number, number>();
  for (const t of tiles) counts.set(t.face, (counts.get(t.face) ?? 0) + 1);
  for (const s of basket) counts.set(s.face, (counts.get(s.face) ?? 0) - (MATCH - s.ids.length));
  const kinds: number[] = [];
  for (const [f, n] of counts) for (let i = 0; i < Math.floor(n / MATCH); i++) kinds.push(f);
  for (let a = 0; a < 50; a++) {
    const tryTiles = copy.map((t) => ({ ...t }));
    if (dealExact(tryTiles, basket, kinds, rng)) return tryTiles;
  }
  return tiles;
}
/**
 * Gives out fish so the pile can always be cleared: tiles are taken in a random order that only ever
 * picks free tiles, and fish are dealt along that order — first whatever finishes the basket's stacks,
 * then a pair at a time.
 */
function dealExact(spots: Tile[], basket: Slot[], triples: number[], rng: () => number): boolean {
  const order: Tile[] = [];
  const left = [...spots];
  while (left.length) {
    const free = left.filter((t) => isFree(t, left));
    if (!free.length) return false;
    const t = free[Math.floor(rng() * free.length)];
    order.push(t);
    left.splice(left.indexOf(t), 1);
  }
  const seq: number[] = [];
  for (const s of basket) for (let i = s.ids.length; i < MATCH; i++) seq.push(s.face);
  for (const f of shuffled(triples, rng)) for (let k = 0; k < MATCH; k++) seq.push(f);
  if (seq.length !== order.length) return false;
  order.forEach((t, i) => { t.face = seq[i]; });
  return true;
}

/** Puts a tile in the basket. Returns the new basket and the fish that made a pair (cleared). */
export function addToBasket(basket: Slot[], t: { id: number; face: number }): { basket: Slot[]; cleared: number | null } {
  const b = basket.map((s) => ({ face: s.face, ids: [...s.ids] }));
  const slot = b.find((s) => s.face === t.face);
  if (slot) slot.ids.push(t.id); else b.push({ face: t.face, ids: [t.id] });
  const full = b.find((s) => s.ids.length >= MATCH);
  if (full) return { basket: b.filter((s) => s !== full), cleared: full.face };
  return { basket: b, cleared: null };
}
/** More different fish than slots = the basket overflows. */
export const isBust = (basket: Slot[]) => basket.length > BASKET;

/** 🔍 A good tile to pick next: one that finishes a pair, else one of two free alike, else a free one of a fish in the basket. */
export function hintTile(tiles: Tile[], basket: Slot[]): Tile | null {
  const free = tiles.filter((t) => isFree(t, tiles));
  const byFace = (f: number) => free.filter((t) => t.face === f);
  for (const s of basket) if (byFace(s.face).length >= MATCH - s.ids.length) return byFace(s.face)[0];
  if (basket.length < BASKET) {
    for (const t of free) if (byFace(t.face).length >= 2) return t;
  }
  return free.find((t) => basket.some((s) => s.face === t.face)) ?? (basket.length < BASKET ? free[0] ?? null : null);
}

/** Fishing XP for clearing a pair, from the recipe's XP (pairs come 1.5× as often as threes did). */
export const matchXp = (baseXp: number) => Math.max(1, Math.round(baseXp));
/** XP multiplier from full combo bars (+0.5× each, up to 3×). */
export const comboMult = (bars: number) => Math.min(3, 1 + 0.5 * bars);
/** Clearing a whole crate: a bigger bonus the higher the level (like the old ×2 XP + 2 bonus rolls at level 1). */
export const clearReward = (level: number) => ({ xpMult: 2 + Math.min(3, (level - 1) / 300), bonusRolls: 2 + Math.floor(level / 250) });
/** Board size in tiles (for drawing). */
export function boardSize(tiles: Tile[]): { cols: number; rows: number } {
  let w = 0, h = 0;
  for (const t of tiles) { w = Math.max(w, t.x / 2 + 1); h = Math.max(h, t.y / 2 + 1); }
  return { cols: Math.max(1, Math.ceil(w)), rows: Math.max(1, Math.ceil(h)) };
}
