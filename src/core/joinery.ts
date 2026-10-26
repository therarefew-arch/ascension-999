// 🧩 Joinery (Crafting): a calm wood-joining puzzle. Each square holds a wooden piece with joints
// on some sides. Tap to turn a piece; when every joint meets another joint, the board is one tidy
// piece of woodwork. No timer, no materials — just Crafting XP. Every board is solvable (it's
// built from a finished piece, then the pieces are turned at random).

/** Joint sides as bits: north 1, east 2, south 4, west 8. */
export const N = 1, E = 2, S = 4, W = 8;

export interface JoineryBoard {
  size: number;
  /** One number per square (row by row): which sides have a joint. */
  tiles: number[];
}

/** Turns a piece a quarter turn clockwise. */
export const rotate = (m: number) => ((m << 1) | (m >> 3)) & 15;

const OPP: Record<number, number> = { [N]: S, [E]: W, [S]: N, [W]: E };

function neighbour(size: number, i: number, dir: number): number {
  const r = Math.floor(i / size), c = i % size;
  if (dir === N) return r > 0 ? i - size : -1;
  if (dir === S) return r < size - 1 ? i + size : -1;
  if (dir === E) return c < size - 1 ? i + 1 : -1;
  return c > 0 ? i - 1 : -1;
}

/** Does this joint meet a matching joint next door? */
export function jointOk(b: JoineryBoard, i: number, dir: number): boolean {
  const n = neighbour(b.size, i, dir);
  return n >= 0 && (b.tiles[n] & OPP[dir]) !== 0;
}

/** Every joint on the board meets another joint. */
export function solved(b: JoineryBoard): boolean {
  for (let i = 0; i < b.tiles.length; i++) {
    for (const d of [N, E, S, W]) if ((b.tiles[i] & d) && !jointOk(b, i, d)) return false;
  }
  return true;
}

/** A finished piece: a random "tree" joining every square, so there are no loose ends. */
function finishedPiece(size: number, rng: () => number): number[] {
  const tiles = Array(size * size).fill(0);
  const seen = new Set<number>([Math.floor(rng() * size * size)]);
  const stack = [...seen];
  while (stack.length) {
    const i = stack[stack.length - 1];
    const options = [N, E, S, W].map((d) => [d, neighbour(size, i, d)] as const).filter(([, n]) => n >= 0 && !seen.has(n));
    if (!options.length) { stack.pop(); continue; }
    const [d, n] = options[Math.floor(rng() * options.length)];
    tiles[i] |= d;
    tiles[n] |= OPP[d];
    seen.add(n);
    stack.push(n);
  }
  return tiles;
}

export function newJoinery(size: number, rng: () => number = Math.random): JoineryBoard {
  const tiles = finishedPiece(size, rng);
  const board = { size, tiles: tiles.map((t) => { let m = t; const turns = Math.floor(rng() * 4); for (let k = 0; k < turns; k++) m = rotate(m); return m; }) };
  // Never hand out a board that's already finished.
  return solved(board) ? newJoinery(size, rng) : board;
}

export function turnPiece(b: JoineryBoard, i: number): JoineryBoard {
  const tiles = [...b.tiles];
  tiles[i] = rotate(tiles[i]);
  return { ...b, tiles };
}

/** Crafting XP for finishing a board, from the selected recipe's base XP (about idle crafting's pace). */
export function joineryXp(size: number, baseXp: number): number {
  return Math.round(baseXp * (size === 4 ? 16 : size === 5 ? 26 : 38));
}
