// 🧺 Sort the Catch (Fishing) — v2, Mahjong-Blast style (owner's design).
// Crates of catch tiles, stacked in layers. Most tiles start face-down. A tile can be tapped when it's
// free (nothing on top, and its left or right side open).
// - Face-up tile: one tap drops it into your basket.
// - Face-down tile: tap to flip it. Flip a second: if they match, both drop into the basket; if not,
//   both flip back over after a moment (remember them!). A lone flipped tile can be tapped again to take it.
// - The basket holds 7. Three of the same fish clear for Fishing XP. A full basket with no three alike
//   busts the round — you keep the XP you earned (misses never cost anything).
// Boards are built so every tile can be cleared in threes (fair, always finishable with good play).

export interface Tile { id: number; x: number; y: number; z: number; face: number; up: boolean }

export const FACES = ['🐟', '🦐', '🦀', '🐚', '⭐', '🐙', '🐠', '⚓', '🐡', '🦑', '🐢', '🪸'];
export const HAND_SIZE = 7;
/** How many different fish a board uses (fewer = easier to make threes). */
const BOARD_FACES = 9;

/** Board shape: a 6×4 base, a 4×2 second layer and a 2×2 top — 36 tiles = 12 threes. Fits a phone. */
const LAYOUT: [number, number, number][] = (() => {
  const s: [number, number, number][] = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) s.push([x, y, 0]);
  for (let y = 1; y < 3; y++) for (let x = 1; x < 5; x++) s.push([x, y, 1]);
  for (let y = 1; y < 3; y++) for (let x = 2; x < 4; x++) s.push([x, y, 2]);
  return s;
})();

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** Free = nothing on top and its left or right side is open. */
export function isFree(t: { x: number; y: number; z: number }, tiles: { x: number; y: number; z: number }[]): boolean {
  const occ = new Set(tiles.map((o) => key(o.x, o.y, o.z)));
  if (occ.has(key(t.x, t.y, t.z + 1))) return false;
  return !occ.has(key(t.x - 1, t.y, t.z)) || !occ.has(key(t.x + 1, t.y, t.z));
}

/** Fish faces given three at a time to tiles that are free in removal order — so it can always be cleared. */
function assignFaces(spots: [number, number, number][], rng: () => number): number[] | null {
  const faces = new Array<number>(spots.length).fill(-1);
  const remaining = spots.map((s, i) => ({ x: s[0], y: s[1], z: s[2], i }));
  const pool = shuffled(FACES.map((_, i) => i), rng).slice(0, BOARD_FACES);
  while (remaining.length) {
    const free = remaining.filter((t) => isFree(t, remaining));
    if (free.length < 3) return null;
    const face = pool[Math.floor(rng() * pool.length)];
    for (let k = 0; k < 3; k++) {
      const t = free.splice(Math.floor(rng() * free.length), 1)[0];
      faces[t.i] = face;
      remaining.splice(remaining.indexOf(t), 1);
    }
  }
  return faces;
}
function shuffled<T>(a: T[], rng: () => number): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

let nextId = 1;
/** A fresh board. The top layer and about 1 in 5 other tiles start face-up; the rest face-down. */
export function newBoard(rng: () => number = Math.random): Tile[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const faces = assignFaces(LAYOUT, rng);
    if (faces) return LAYOUT.map(([x, y, z], i) => ({ id: nextId++, x, y, z, face: faces[i], up: z === 2 || rng() < 0.2 }));
  }
  throw new Error('Could not build a board');
}

/** Puts tiles into the basket (kept grouped by fish). Returns the faces that made a three (and were cleared). */
export function addToHand(hand: { id: number; face: number }[], add: { id: number; face: number }[]): { hand: { id: number; face: number }[]; cleared: number[] } {
  let h = [...hand];
  const cleared: number[] = [];
  for (const t of add) {
    // Slot it in next to the same fish (like tidying a basket).
    const at = h.map((x) => x.face).lastIndexOf(t.face);
    if (at >= 0) h.splice(at + 1, 0, t); else h.push(t);
    if (h.filter((x) => x.face === t.face).length >= 3) {
      let n = 0;
      h = h.filter((x) => !(x.face === t.face && n++ < 3));
      cleared.push(t.face);
    }
  }
  return { hand: h, cleared };
}

/** A basket of 7 with no three alike is a bust. */
export const isBust = (hand: { face: number }[]) => hand.length >= HAND_SIZE;

/** Fishing XP for clearing a three, from the recipe's XP. */
export const tripleXp = (baseXp: number) => Math.max(1, Math.round(baseXp * 1.5));
