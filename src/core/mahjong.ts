// Mahjong solitaire boards that are always solvable.
// How: start with every spot filled, then repeatedly remove two currently-free spots and give
// them the same face. Played forwards, that removal order is a guaranteed solution.

export interface Tile {
  id: number;
  x: number;
  y: number;
  z: number;
  face: number;
}

/** Board shape: a 6×4 base, a 4×2 second layer and a 2×1 top (34 tiles = 17 pairs). Fits a phone screen. */
const LAYOUT: [number, number, number][] = (() => {
  const spots: [number, number, number][] = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) spots.push([x, y, 0]);
  for (let y = 1; y < 3; y++) for (let x = 1; x < 5; x++) spots.push([x, y, 1]);
  for (let x = 2; x < 4; x++) spots.push([x, 1, 2]);
  return spots;
})();

export const FACE_COUNT = 12;

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** A tile is free if nothing sits on top of it and its left or right side is open. */
export function isFree(t: { x: number; y: number; z: number }, tiles: { x: number; y: number; z: number }[]): boolean {
  const occupied = new Set(tiles.map((o) => key(o.x, o.y, o.z)));
  if (occupied.has(key(t.x, t.y, t.z + 1))) return false;
  return !occupied.has(key(t.x - 1, t.y, t.z)) || !occupied.has(key(t.x + 1, t.y, t.z));
}

/** Gives faces to the given spots so they can always be cleared. Returns null if it got stuck (caller retries). */
function assignFaces(spots: [number, number, number][]): number[] | null {
  const faces = new Array<number>(spots.length).fill(-1);
  const remaining = spots.map((s, i) => ({ x: s[0], y: s[1], z: s[2], i }));
  while (remaining.length) {
    const free = remaining.filter((t) => isFree(t, remaining));
    if (free.length < 2) return null;
    const a = free.splice(Math.floor(Math.random() * free.length), 1)[0];
    const b = free[Math.floor(Math.random() * free.length)];
    const face = Math.floor(Math.random() * FACE_COUNT);
    faces[a.i] = face;
    faces[b.i] = face;
    remaining.splice(remaining.indexOf(a), 1);
    remaining.splice(remaining.indexOf(b), 1);
  }
  return faces;
}

let nextId = 1;

export function newBoard(): Tile[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const faces = assignFaces(LAYOUT);
    if (faces) return LAYOUT.map(([x, y, z], i) => ({ id: nextId++, x, y, z, face: faces[i] }));
  }
  throw new Error('Could not build a board');
}

/** Re-deals the faces of the tiles still on the board so it can be finished again (free, any time). */
export function shuffle(tiles: Tile[]): Tile[] {
  const spots = tiles.map((t) => [t.x, t.y, t.z] as [number, number, number]);
  for (let attempt = 0; attempt < 500; attempt++) {
    const faces = assignFaces(spots);
    if (faces) return tiles.map((t, i) => ({ ...t, face: faces[i] }));
  }
  return tiles;
}

/** Is there at least one matching pair you can pick right now? */
export function hasMove(tiles: Tile[]): boolean {
  const seen = new Set<number>();
  for (const t of tiles) {
    if (!isFree(t, tiles)) continue;
    if (seen.has(t.face)) return true;
    seen.add(t.face);
  }
  return false;
}
