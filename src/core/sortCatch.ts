// 🧺 Sort the Catch (Fishing) — v3 (v0.0.1.63, owner's picture: a tile-stack game).
// A big pile of catch tiles, all face-up, stacked in overlapping layers. A tile can be picked when no
// other tile lies on top of it (covered tiles look darker).
// - Picked tiles go into the basket: 4 slots. Two alike clear (v0.0.1.64, owner: "it should clear in 2") for
//   Fishing XP. Picking a 5th different fish overflows the basket — the round ends, you keep the XP
//   (and ↩️ Undo can still save it). Misses never cost anything.
// - Every pair fills the combo bar (7); a full bar adds +0.5× to the XP multiplier (max 3×).
// - Helpers per crate: 🔀 Shuffle (the fish on the board swap around, still solvable), 🔍 Hint, ↩️ Undo.
// Boards are built so they can always be cleared (fish are dealt in pairs in a pick-able order).

/** A tile: x, y in half-tile steps (so tiles can sit half over each other), z = layer. */
export interface Tile { id: number; x: number; y: number; z: number; face: number }
export interface Slot { face: number; ids: number[] }

export const FACES = ['🐟', '🦐', '🦀', '🐚', '⭐', '🐙', '🐠', '⚓', '🐡', '🦑', '🐢', '🪸'];
export const BASKET = 4;
/** How many alike clear. */
export const MATCH = 2;
export const COMBO_BAR = 7;
export const HELPERS = { shuffle: 2, hint: 3, undo: 3 } as const;
/** Board size in tiles (base layer). */
export const COLS = 6;
export const ROWS = 7;
/** How many kinds of fish a crate uses. */
const BOARD_FACES = 10;

/** Does tile b lie on (part of) tile a? */
const covers = (b: Tile, a: Tile) => b.z > a.z && Math.abs(b.x - a.x) < 2 && Math.abs(b.y - a.y) < 2;
export const isFree = (t: Tile, tiles: Tile[]) => !tiles.some((o) => o.id !== t.id && covers(o, t));

function shuffled<T>(a: T[], rng: () => number): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/** The pile's shape: a full base, a half-shifted second layer, and a few tiles on top. */
function layout(rng: () => number): { x: number; y: number; z: number }[] {
  const s: { x: number; y: number; z: number }[] = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) s.push({ x: x * 2, y: y * 2, z: 0 });
  const mid: typeof s = [];
  for (let y = 0; y < ROWS - 1; y++) for (let x = 0; x < COLS - 1; x++) mid.push({ x: x * 2 + 1, y: y * 2 + 1, z: 1 });
  const top: typeof s = [];
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) top.push({ x: x * 2, y: y * 2, z: 2 });
  // Leave some holes in the upper layers so every crate looks different.
  s.push(...shuffled(mid, rng).slice(0, 22), ...shuffled(top, rng).slice(0, 8));
  while (s.length % MATCH) s.pop();
  return s;
}

let nextId = 1;
export function newBoard(rng: () => number = Math.random): Tile[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const tiles = layout(rng).map((p) => ({ id: nextId++, ...p, face: 0 }));
    const kinds = shuffled(FACES.map((_, i) => i), rng).slice(0, BOARD_FACES);
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
