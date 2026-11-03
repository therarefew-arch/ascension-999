// 🧶 The Loom (v0.0.2.16) — Crafting's thread puzzle; it replaced Joinery (owner: "joinery would be the game I play the
// least if not at all" → chose The Loom). A square loom has pairs of coloured spools. Draw a thread from each spool to
// its partner, moving cell to cell (no diagonals). Threads can't cross or share a cell, and the loom is finished when
// every pair is joined AND every cell is covered.
// Puzzles are always solvable: one long winding path is laid through every cell (shuffled with "backbite" moves),
// then cut into threads — so a full solution exists before the spools are even placed.
// Levels 1–999 (like Sort the Catch): bigger looms with longer, fewer threads per cell as you climb.

export const MAX_LOOM_LEVEL = 999;
/** Yarn colours (index = thread colour). */
export const YARN = ['#e0524a', '#3b82f6', '#f5c542', '#4caf50', '#f08a24', '#9b59d0', '#f06aa6', '#2ec4c9', '#a0673a', '#ece7da', '#a6d23b', '#3f55a8'];
export const YARN_NAMES = ['Red', 'Blue', 'Yellow', 'Green', 'Orange', 'Purple', 'Pink', 'Teal', 'Brown', 'White', 'Lime', 'Navy'];

export interface LoomSpec { n: number; threads: number; hints: number }
/** How a level's loom is built: 5×5 with 4 threads at level 1, up to 10×10 with long threads at 999. */
export function loomSpec(level: number): LoomSpec {
  const L = Math.max(1, Math.min(MAX_LOOM_LEVEL, Math.floor(level)));
  const e = Math.pow((L - 1) / (MAX_LOOM_LEVEL - 1), 0.4);
  const n = Math.min(10, 5 + Math.floor(e * 5.6));
  const perThread = 5.5 + 5 * e; // cells per thread: longer threads = harder
  const threads = Math.max(4, Math.min(YARN.length, Math.round((n * n) / perThread)));
  return { n, threads, hints: L < 50 ? 3 : L < 300 ? 2 : 1 };
}

export interface Loom {
  n: number;
  /** For each thread colour: its two spools (cell indexes). */
  pegs: [number, number][];
  /** One way to finish it (cells in order for each thread) — used for hints. */
  solution: number[][];
}

const neighbours = (n: number, c: number): number[] => {
  const r = Math.floor(c / n), k = c % n;
  const out: number[] = [];
  if (r > 0) out.push(c - n);
  if (r < n - 1) out.push(c + n);
  if (k > 0) out.push(c - 1);
  if (k < n - 1) out.push(c + 1);
  return out;
};
export const adjacent = (n: number, a: number, b: number) => neighbours(n, a).includes(b);

/** A random path through every cell: start from a snake, then shuffle it with many backbite moves. */
function windingPath(n: number, rng: () => number): number[] {
  let path: number[] = [];
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) path.push(r * n + (r % 2 ? n - 1 - k : k));
  const steps = n * n * 30;
  for (let s = 0; s < steps; s++) {
    if (rng() < 0.5) path.reverse(); // work on either end
    const end = path[0];
    const opts = neighbours(n, end).filter((v) => v !== path[1]);
    const v = opts[Math.floor(rng() * opts.length)];
    const i = path.indexOf(v);
    // reverse the part before v: the old end now sits right next to v, and path[i-1] becomes the new end
    path = [...path.slice(0, i).reverse(), ...path.slice(i)];
  }
  return path;
}

export function newLoom(level = 1, rng: () => number = Math.random): Loom {
  const { n, threads } = loomSpec(level);
  for (let attempt = 0; attempt < 50; attempt++) {
    const path = windingPath(n, rng);
    // Cut it into `threads` pieces, each at least 3 cells long, with random lengths.
    const total = path.length;
    const min = 3;
    const spare = total - min * threads;
    if (spare < 0) continue;
    const weights = Array.from({ length: threads }, () => 0.4 + rng());
    const sum = weights.reduce((a, b) => a + b, 0);
    const lens = weights.map((w) => min + Math.floor((spare * w) / sum));
    let left = total - lens.reduce((a, b) => a + b, 0);
    for (let i = 0; left > 0; i = (i + 1) % threads, left--) lens[i]++;
    const solution: number[][] = [];
    let at = 0;
    for (const len of lens) { solution.push(path.slice(at, at + len)); at += len; }
    // A thread whose two spools sit side by side is too easy — re-cut if there are several.
    const lazy = solution.filter((s) => adjacent(n, s[0], s[s.length - 1])).length;
    if (lazy > Math.max(1, Math.floor(threads / 4)) && attempt < 40) continue;
    // Shuffle which colour each thread gets.
    const colours = Array.from({ length: threads }, (_, i) => i).sort(() => rng() - 0.5);
    const sol: number[][] = [];
    colours.forEach((c, i) => { sol[c] = solution[i]; });
    return { n, pegs: sol.map((s) => [s[0], s[s.length - 1]] as [number, number]), solution: sol };
  }
  throw new Error('Could not build a loom');
}

/** Which colour's spool sits on a cell (or -1). */
export const pegAt = (loom: Loom, cell: number) => loom.pegs.findIndex(([a, b]) => a === cell || b === cell);

/** Is this thread joined: from one spool to the other, step by step? */
export function joined(loom: Loom, colour: number, path: number[] | undefined): boolean {
  if (!path || path.length < 2) return false;
  const [a, b] = loom.pegs[colour];
  const ends = (path[0] === a && path[path.length - 1] === b) || (path[0] === b && path[path.length - 1] === a);
  return ends && path.every((c, i) => i === 0 || adjacent(loom.n, path[i - 1], c));
}

/** Finished: every thread joined, no cell used twice, every cell covered. */
export function loomDone(loom: Loom, paths: number[][]): boolean {
  if (!loom.pegs.every((_, c) => joined(loom, c, paths[c]))) return false;
  const seen = new Set<number>();
  for (const p of paths) for (const c of p ?? []) { if (seen.has(c)) return false; seen.add(c); }
  return seen.size === loom.n * loom.n;
}

/** Crafting XP for finishing a loom: grows with the level (×14 of the recipe's XP at level 1, up to ×44). */
export function loomXp(level: number, baseXp: number): number {
  const e = Math.pow((Math.max(1, level) - 1) / (MAX_LOOM_LEVEL - 1), 0.4);
  return Math.max(1, Math.round(baseXp * (14 + 30 * e)));
}
