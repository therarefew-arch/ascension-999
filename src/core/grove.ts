// 🌲 Forester's Grove (v0.0.2.35, Woodcutting's second game — owner: "add the sudoku like puzzle in woodcutting since
// it doesn't have an alt yet"). Plant saplings so every row, every column and every grove patch (the boxes) holds
// one of each tree. Engine only: no drawing.
//  • Puzzles always have exactly ONE answer (made from a full grid, clues removed only while it stays unique).
//  • Levels 1 → 999 (`groveSpec`): always 9×9 (v0.0.2.36), with fewer starting trees as you go (50 → 25).
//  • Cozy: a wrong sapling is only shown in red, never punished; hints fill a square for you.
export const MAX_GROVE_LEVEL = 999;

/** The trees (the first n are used on an n×n grove). */
export const TREES = [
  { emoji: '🌲', name: 'Pine' }, { emoji: '🌳', name: 'Oak' }, { emoji: '🍁', name: 'Maple' }, { emoji: '🌸', name: 'Cherry' },
  { emoji: '🌴', name: 'Palm' }, { emoji: '🎄', name: 'Fir' }, { emoji: '🍂', name: 'Birch' }, { emoji: '🌵', name: 'Cactus' }, { emoji: '🍄', name: 'Mushroom' },
];

export interface GroveSpec { n: number; bw: number; bh: number; clues: number; hints: number }

/** How many trees start planted, by level. Always 9×9 (owner, v0.0.2.36: "only 9x9") — it gets harder as fewer
 *  trees start planted: 50 at level 1 → 25 at level 999. */
export function groveSpec(level: number): GroveSpec {
  const L = Math.max(1, Math.min(MAX_GROVE_LEVEL, Math.floor(level)));
  const e = Math.pow((L - 1) / (MAX_GROVE_LEVEL - 1), 0.6);
  return { n: 9, bw: 3, bh: 3, clues: Math.round(50 - 25 * e), hints: L < 300 ? 3 : L < 700 ? 2 : 1 };
}

export interface Grove {
  level: number; n: number; bw: number; bh: number;
  /** The answer (tree index 0..n-1 per square), and what starts planted (-1 = empty). */
  solution: number[];
  given: number[];
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = <T,>(a: T[], r: () => number) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/** Row, column and patch of each square. */
export function units(n: number, bw: number, bh: number) {
  const row = (i: number) => Math.floor(i / n), col = (i: number) => i % n;
  const box = (i: number) => Math.floor(row(i) / bh) * (n / bw) + Math.floor(col(i) / bw);
  return { row, col, box };
}

/** Counts answers up to `cap` (a quick solver: always fills the square with the fewest choices). */
function countSolutions(grid: number[], n: number, bw: number, bh: number, cap: number): number {
  const { row, col, box } = units(n, bw, bh);
  const rows = Array(n).fill(0), cols = Array(n).fill(0), boxes = Array(n).fill(0);
  for (let i = 0; i < n * n; i++) if (grid[i] >= 0) { const b = 1 << grid[i]; rows[row(i)] |= b; cols[col(i)] |= b; boxes[box(i)] |= b; }
  const full = (1 << n) - 1;
  let found = 0;
  const g = [...grid];
  const go = (): void => {
    if (found >= cap) return;
    let best = -1, bestMask = 0, bestCount = 99;
    for (let i = 0; i < n * n; i++) {
      if (g[i] >= 0) continue;
      const m = full & ~(rows[row(i)] | cols[col(i)] | boxes[box(i)]);
      let c = 0; for (let x = m; x; x &= x - 1) c++;
      if (c < bestCount) { best = i; bestMask = m; bestCount = c; if (c <= 1) break; }
    }
    if (best < 0) { found++; return; }
    for (let v = 0; v < n; v++) {
      if (!(bestMask & (1 << v))) continue;
      const b = 1 << v;
      g[best] = v; rows[row(best)] |= b; cols[col(best)] |= b; boxes[box(best)] |= b;
      go();
      g[best] = -1; rows[row(best)] &= ~b; cols[col(best)] &= ~b; boxes[box(best)] &= ~b;
      if (found >= cap) return;
    }
  };
  go();
  return found;
}

/** A full, random, valid grove. */
function fullGrid(n: number, bw: number, bh: number, r: () => number): number[] {
  const { row, col, box } = units(n, bw, bh);
  const g = Array(n * n).fill(-1);
  const ok = (i: number, v: number) => {
    for (let j = 0; j < n * n; j++) if (g[j] === v && (row(j) === row(i) || col(j) === col(i) || box(j) === box(i))) return false;
    return true;
  };
  const go = (i: number): boolean => {
    if (i === n * n) return true;
    for (const v of shuffle([...Array(n).keys()], r)) { if (ok(i, v)) { g[i] = v; if (go(i + 1)) return true; g[i] = -1; } }
    return false;
  };
  go(0);
  return g;
}

export function newGrove(level: number, seed = (Math.random() * 2 ** 32) >>> 0): Grove {
  const spec = groveSpec(level);
  const r = rng(seed);
  const { n, bw, bh } = spec;
  const solution = fullGrid(n, bw, bh, r);
  const given = [...solution];
  // Take trees away (in a random order) while the grove still has only one answer.
  let left = n * n;
  for (const i of shuffle([...Array(n * n).keys()], r)) {
    if (left <= spec.clues) break;
    const keep = given[i];
    given[i] = -1;
    if (countSolutions(given, n, bw, bh, 2) !== 1) given[i] = keep; else left--;
  }
  return { level: Math.max(1, Math.floor(level)), n, bw, bh, solution, given };
}

/** Squares that clash with another square in their row, column or patch. */
export function clashes(gv: Grove, board: number[]): Set<number> {
  const { row, col, box } = units(gv.n, gv.bw, gv.bh);
  const out = new Set<number>();
  for (let i = 0; i < board.length; i++) {
    if (board[i] < 0) continue;
    for (let j = i + 1; j < board.length; j++) {
      if (board[j] === board[i] && (row(i) === row(j) || col(i) === col(j) || box(i) === box(j))) { out.add(i); out.add(j); }
    }
  }
  return out;
}

/** Every square planted and nothing clashing (any such board is the one answer). */
export const groveDone = (gv: Grove, board: number[]) => board.every((v) => v >= 0) && clashes(gv, board).size === 0;

/** Rows / columns / patches that are complete and clash-free (for a little chime + glow). */
export function finishedUnits(gv: Grove, board: number[]): string[] {
  const { row, col, box } = units(gv.n, gv.bw, gv.bh);
  const bad = clashes(gv, board);
  const out: string[] = [];
  for (const [k, f] of [['r', row], ['c', col], ['b', box]] as const) {
    for (let u = 0; u < gv.n; u++) {
      const cells = board.map((_, i) => i).filter((i) => f(i) === u);
      if (cells.every((i) => board[i] >= 0 && !bad.has(i))) out.push(`${k}${u}`);
    }
  }
  return out;
}

/** Woodcutting XP for finishing a grove: ×10 of the chosen log's XP at level 1, up to ×40 (then scaled to your level). */
export function groveXp(level: number, baseXp: number): number {
  const e = Math.pow((Math.max(1, level) - 1) / (MAX_GROVE_LEVEL - 1), 0.4);
  return Math.max(1, Math.round(baseXp * (10 + 30 * e)));
}
