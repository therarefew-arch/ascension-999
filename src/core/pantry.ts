// Pantry Prep (Cooking): a calm sliding puzzle on a cutting board (4×4) or the big banquet table (5×5).
// Slide everything one way; two of the same ingredient that bump together combine into the next step up.
// No timer and nothing to lose — when the board is full, the kitchen is simply "tidy" and you start fresh
// (or use a kitchen tool to make room). Kitchen orders give bonus XP and Chef's Tips to spend on tools.

/** The classic board size (kept for old code and saves). */
export const SIZE = 4;
export const SIZES = [4, 5] as const;
export type BoardSize = (typeof SIZES)[number];
export const BOARD_NAMES: Record<BoardSize, string> = { 4: 'Cutting board', 5: 'Banquet table' };

/** The ingredient ladder: level 1 (index 0) up to level 12. */
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
  { emoji: '🎂', name: 'Festival Cake' },
  { emoji: '🏰', name: 'King’s Banquet' },
] as const;
export const MAX_DISH = DISHES.length;

/** Reaching this dish (or better) cooks one of your fish for real. */
export const COOK_AT = 7;
/** Reaching this dish (or better) makes that fish "Great". */
export const GREAT_AT = 8;

/** A board: size×size cells, 0 = empty, otherwise the dish level. Row by row, top-left first. */
export type Board = number[];
export type Dir = 'up' | 'down' | 'left' | 'right';

export const sizeOf = (board: Board) => Math.round(Math.sqrt(board.length));

export function emptyBoard(size: number = SIZE): Board {
  return Array(size * size).fill(0);
}

/** Puts a new ingredient in a random empty spot: usually Herbs, sometimes Garlic. */
export function spawn(board: Board, rng: () => number = Math.random): Board {
  const empty = board.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  if (!empty.length) return board;
  const next = [...board];
  next[empty[Math.floor(rng() * empty.length)]] = rng() < 0.9 ? 1 : 2;
  return next;
}

export function newBoard(rng: () => number = Math.random, size: number = SIZE): Board {
  return spawn(spawn(emptyBoard(size), rng), rng);
}

/** The cell indexes of each line, ordered in the direction things slide towards. */
function lines(dir: Dir, n: number): number[][] {
  const out: number[][] = [];
  for (let a = 0; a < n; a++) {
    const line: number[] = [];
    for (let b = 0; b < n; b++) {
      if (dir === 'left') line.push(a * n + b);
      if (dir === 'right') line.push(a * n + (n - 1 - b));
      if (dir === 'up') line.push(b * n + a);
      if (dir === 'down') line.push((n - 1 - b) * n + a);
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

/** Slides everything one way. A dish only combines once per slide; the top dish doesn't combine further. */
export function slide(board: Board, dir: Dir): SlideResult {
  const next = [...board];
  const merges: number[] = [];
  const merged: number[] = [];
  for (const line of lines(dir, sizeOf(board))) {
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

/** Is any slide possible? (false = the board is full and tidy — time for a fresh one, or a tool) */
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

/** Score for a combine (like the classic sliding-number game: doubles each step). */
export const mergeScore = (level: number) => 2 ** level;

// ---------- Kitchen orders ----------
/** Three order tickets on the rail. Each asks for one dish; making it pays Chef's Tips and bonus XP. */
export const ORDER_SLOTS = 3;
/** A new order: a dish around the best you've reached on this board (a little above, or a quick easy one). */
export function newOrderDish(best: number, size: number, rng: () => number = Math.random, avoid: number[] = []): number {
  const cap = size >= 5 ? MAX_DISH : MAX_DISH - 2;
  const lo = Math.max(3, best - 3);
  const hi = Math.min(cap, Math.max(5, best + 1));
  // Try for a dish that isn't already on the rail, so the orders stay varied.
  let pick = lo;
  for (let tries = 0; tries < 8; tries++) {
    pick = lo + Math.floor(rng() * (hi - lo + 1));
    if (!avoid.includes(pick)) break;
  }
  return pick;
}
/** Chef's Tips for filling an order for this dish. */
export const orderTips = (level: number) => (level >= 9 ? 3 : level >= 7 ? 2 : 1);
/** Bonus Cooking XP for filling an order, from the recipe's base XP. */
export const orderXp = (level: number, baseXp: number) => Math.max(1, Math.round(baseXp * (0.5 + 0.35 * level)));

/** Which orders a slide's combines fill (each combine fills at most one order). Returns the order indexes. */
export function fillOrders(orders: number[], merges: number[]): number[] {
  const filled: number[] = [];
  for (const lv of merges) {
    const i = orders.findIndex((o, k) => o === lv && !filled.includes(k));
    if (i >= 0) filled.push(i);
  }
  return filled;
}

// ---------- Kitchen tools (paid with Chef's Tips) ----------
export type Tool = 'chop' | 'stir' | 'season';
export const TOOLS: Record<Tool, { emoji: string; name: string; text: string; cost: number; picks: number }> = {
  // Priced so a board earns about 2–3 tool uses (tuned with a bot: ~25 tips per 4×4 board).
  chop: { emoji: '🔪', name: 'Chop', text: 'Clear away one ingredient', cost: 8, picks: 1 },
  stir: { emoji: '🥄', name: 'Stir', text: 'Swap two ingredients', cost: 10, picks: 2 },
  season: { emoji: '🧂', name: 'Season', text: 'Raise one ingredient a step', cost: 15, picks: 1 },
};

/** Uses a tool on the picked cells. Returns the new board, or a reason it can't be used. */
export function applyTool(board: Board, tool: Tool, cells: number[]): Board | string {
  const next = [...board];
  if (cells.some((c) => !next[c])) return 'Pick an ingredient, not an empty spot';
  if (tool === 'chop') next[cells[0]] = 0;
  if (tool === 'stir') {
    if (cells.length !== 2 || cells[0] === cells[1]) return 'Pick two ingredients';
    [next[cells[0]], next[cells[1]]] = [next[cells[1]], next[cells[0]]];
  }
  if (tool === 'season') {
    if (next[cells[0]] >= MAX_DISH) return 'That’s already the finest dish';
    next[cells[0]] += 1;
  }
  return next;
}
