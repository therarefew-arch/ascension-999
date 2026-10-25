// Pantry Prep (Cooking): a calm sliding puzzle on a 4×4 cutting board.
// Slide everything one way; two of the same ingredient that bump together combine into the next step up.
// No timer and nothing to lose — when the board is full, the kitchen is simply "tidy" and you start fresh.

export const SIZE = 4;

/** The ingredient ladder: level 1 (index 0) up to level 10. */
export const DISHES = [
  { emoji: '🌿', name: 'Herbs' },
  { emoji: '🧄', name: 'Garlic' },
  { emoji: '🧅', name: 'Onion' },
  { emoji: '🥕', name: 'Carrots' },
  { emoji: '🍄', name: 'Mushrooms' },
  { emoji: '🐟', name: 'Fillet' },
  { emoji: '🍲', name: 'Fish Stew' },
  { emoji: '🥧', name: 'Fish Pie' },
  { emoji: '🍱', name: 'Harvest Platter' },
  { emoji: '👑', name: 'Royal Feast' },
] as const;
export const MAX_DISH = DISHES.length;

/** Reaching this dish (or better) cooks one of your fish for real. */
export const COOK_AT = 7;
/** Reaching this dish (or better) makes that fish "Great". */
export const GREAT_AT = 8;

/** A board: 16 cells, 0 = empty, otherwise the dish level (1–10). Row by row, top-left first. */
export type Board = number[];
export type Dir = 'up' | 'down' | 'left' | 'right';

export function emptyBoard(): Board {
  return Array(SIZE * SIZE).fill(0);
}

/** Puts a new ingredient in a random empty spot: usually Herbs, sometimes Garlic. */
export function spawn(board: Board, rng: () => number = Math.random): Board {
  const empty = board.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  if (!empty.length) return board;
  const next = [...board];
  next[empty[Math.floor(rng() * empty.length)]] = rng() < 0.9 ? 1 : 2;
  return next;
}

export function newBoard(rng: () => number = Math.random): Board {
  return spawn(spawn(emptyBoard(), rng), rng);
}

/** The cell indexes of each line, ordered in the direction things slide towards. */
function lines(dir: Dir): number[][] {
  const out: number[][] = [];
  for (let a = 0; a < SIZE; a++) {
    const line: number[] = [];
    for (let b = 0; b < SIZE; b++) {
      if (dir === 'left') line.push(a * SIZE + b);
      if (dir === 'right') line.push(a * SIZE + (SIZE - 1 - b));
      if (dir === 'up') line.push(b * SIZE + a);
      if (dir === 'down') line.push((SIZE - 1 - b) * SIZE + a);
    }
    out.push(line);
  }
  return out;
}

export interface SlideResult {
  board: Board;
  moved: boolean;
  /** The levels of the dishes created by combining (one entry per combine). */
  merges: number[];
  /** Cells that just got a combined dish (for a little "pop"). */
  merged: number[];
}

/** Slides everything one way. A dish only combines once per slide; Royal Feasts don't combine further. */
export function slide(board: Board, dir: Dir): SlideResult {
  const next = [...board];
  const merges: number[] = [];
  const merged: number[] = [];
  for (const line of lines(dir)) {
    const vals = line.map((i) => board[i]).filter((v) => v > 0);
    const out: number[] = [];
    for (let k = 0; k < vals.length; k++) {
      if (k + 1 < vals.length && vals[k] === vals[k + 1] && vals[k] < MAX_DISH) {
        out.push(vals[k] + 1);
        merges.push(vals[k] + 1);
        merged.push(line[out.length - 1]);
        k++;
      } else {
        out.push(vals[k]);
      }
    }
    line.forEach((cell, k) => { next[cell] = out[k] ?? 0; });
  }
  const moved = next.some((v, i) => v !== board[i]);
  return { board: next, moved, merges, merged };
}

/** Is any slide possible? (false = the board is full and tidy — time for a fresh one) */
export function canMove(board: Board): boolean {
  return (['up', 'down', 'left', 'right'] as Dir[]).some((d) => slide(board, d).moved);
}

export function bestDish(board: Board): number {
  return Math.max(0, ...board);
}

/** Cooking XP for creating a dish of this level, from the recipe's base XP. Bigger dishes give more. */
export function mergeXp(level: number, baseXp: number): number {
  return Math.max(1, Math.round(baseXp * (0.15 + 0.12 * level)));
}
