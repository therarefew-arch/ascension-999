// 🧵 Tinker's Tray (Crafting): a cozy match-3. Swap two neighbouring scraps on the workbench tray
// to line up 3 or more of a kind. Match 4 → a Mallet (clears its row or column), an L/T shape →
// a Toolbox (clears around it), 5 in a row → Master's Touch (clears every scrap of one kind).
// Each round is a customer's order (collect so many of two scraps) in a set number of moves.
// Running out of moves never costs anything — you still get XP for what you gathered.

export const SIZE = 7;
export const MOVES = 20;

export interface Scrap { name: string; emoji: string; color: string }
export const SCRAPS: Scrap[] = [
  { name: 'Wood', emoji: '🪵', color: '#92400e' },
  { name: 'Thread', emoji: '🧵', color: '#be123c' },
  { name: 'Buttons', emoji: '🔘', color: '#475569' },
  { name: 'Feathers', emoji: '🪶', color: '#0f766e' },
  { name: 'Rivets', emoji: '🔩', color: '#4338ca' },
  { name: 'Yarn', emoji: '🧶', color: '#a16207' },
];

export type Special = 'row' | 'col' | 'box' | 'star';
export const SPECIAL_INFO: Record<Special, { name: string; emoji: string; text: string }> = {
  row: { name: 'Mallet', emoji: '🔨', text: 'clears its row' },
  col: { name: 'Mallet', emoji: '🔨', text: 'clears its column' },
  box: { name: 'Toolbox', emoji: '🧰', text: 'clears the scraps around it' },
  star: { name: "Master's Touch", emoji: '✨', text: 'swap it to clear every scrap of that kind' },
};

/** One scrap on the tray. `k` = kind (index into SCRAPS), or -1 for Master's Touch. */
export interface Tile { id: number; k: number; sp?: Special }
export type Board = (Tile | null)[];

type Rng = () => number;
let nextId = 1;
const newTile = (rng: Rng): Tile => ({ id: nextId++, k: Math.floor(rng() * SCRAPS.length) });
/** After loading a saved tray: make sure new scraps get ids that aren't already used. */
export function syncIds(b: Board) { for (const t of b) if (t && t.id >= nextId) nextId = t.id + 1; }
export const idx = (r: number, c: number) => r * SIZE + c;
export const rowOf = (i: number) => Math.floor(i / SIZE);
export const colOf = (i: number) => i % SIZE;
export const adjacent = (a: number, b: number) => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)) === 1;

/** A fresh tray with no ready-made matches and at least one move. */
export function newBoard(rng: Rng = Math.random): Board {
  for (;;) {
    const b: Board = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      let t = newTile(rng);
      const r = rowOf(i), c = colOf(i);
      while ((c >= 2 && b[i - 1]!.k === t.k && b[i - 2]!.k === t.k) || (r >= 2 && b[i - SIZE]!.k === t.k && b[i - 2 * SIZE]!.k === t.k)) t = newTile(rng);
      b.push(t);
    }
    if (hasMove(b)) return b;
  }
}

interface Run { cells: number[]; dir: 'h' | 'v' }
function runs(b: Board): Run[] {
  const out: Run[] = [];
  for (const dir of ['h', 'v'] as const) {
    for (let a = 0; a < SIZE; a++) {
      let start = 0;
      for (let k = 1; k <= SIZE; k++) {
        const at = (n: number) => (dir === 'h' ? idx(a, n) : idx(n, a));
        const prev = b[at(k - 1)];
        const cur = k < SIZE ? b[at(k)] : null;
        if (cur && prev && cur.k === prev.k && cur.k >= 0) continue;
        if (k - start >= 3 && prev && prev.k >= 0) out.push({ cells: Array.from({ length: k - start }, (_, n) => at(start + n)), dir });
        start = k;
      }
    }
  }
  return out;
}

export interface Group { cells: number[]; make?: Special; at?: number }
/** Matches on the board, joined into groups (so an L or T is one group). `prefer` = cells the player just moved. */
export function findGroups(b: Board, prefer: number[] = []): Group[] {
  const rs = runs(b);
  const groups: { runs: Run[]; cells: Set<number> }[] = [];
  for (const r of rs) {
    const hit = groups.filter((g) => r.cells.some((c) => g.cells.has(c)));
    const merged = { runs: [r, ...hit.flatMap((g) => g.runs)], cells: new Set([...r.cells, ...hit.flatMap((g) => [...g.cells])]) };
    for (const g of hit) groups.splice(groups.indexOf(g), 1);
    groups.push(merged);
  }
  return groups.map((g) => {
    const cells = [...g.cells];
    const longest = Math.max(...g.runs.map((r) => r.cells.length));
    const both = g.runs.some((r) => r.dir === 'h') && g.runs.some((r) => r.dir === 'v');
    const make: Special | undefined = longest >= 5 ? 'star' : both ? 'box' : longest === 4 ? (g.runs[0].dir === 'h' ? 'row' : 'col') : undefined;
    const at = make ? (cells.find((c) => prefer.includes(c)) ?? g.runs.find((r) => r.cells.length === longest)!.cells[Math.floor(longest / 2)]) : undefined;
    return { cells, make, at };
  });
}

/** Cells a special clears when it goes off (not counting the special itself). */
function blast(b: Board, i: number, sp: Special): number[] {
  const r = rowOf(i), c = colOf(i);
  if (sp === 'row') return Array.from({ length: SIZE }, (_, n) => idx(r, n));
  if (sp === 'col') return Array.from({ length: SIZE }, (_, n) => idx(n, c));
  if (sp === 'box') {
    const out: number[] = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) out.push(idx(rr, cc));
    }
    return out;
  }
  // A Master's Touch going off on its own takes the most common scrap.
  return kindCells(b, mostCommon(b));
}
function kindCells(b: Board, k: number) { return b.map((t, i) => (t && t.k === k ? i : -1)).filter((i) => i >= 0); }
function mostCommon(b: Board): number {
  const n = SCRAPS.map((_, k) => b.filter((t) => t?.k === k).length);
  return n.indexOf(Math.max(...n));
}

export interface Clear {
  /** Cells emptied this step. */
  cleared: number[];
  /** How many of each scrap kind were gathered. */
  got: number[];
  /** Specials that went off (for sounds). */
  fired: Special[];
  /** Specials made (cell → special). */
  made: { at: number; sp: Special }[];
}

/** Clears the given cells, setting off any specials caught in them (and those they hit), and makes new specials. */
export function clearCells(b: Board, cells: number[], make: { at: number; sp: Special; k: number }[] = []): Clear {
  const got = SCRAPS.map(() => 0);
  const fired: Special[] = [];
  const keep = new Set(make.map((m) => m.at));
  const done = new Set<number>();
  const queue = [...cells];
  while (queue.length) {
    const i = queue.shift()!;
    if (done.has(i) || keep.has(i)) continue;
    const t = b[i];
    if (!t) continue;
    done.add(i);
    if (t.k >= 0) got[t.k] += 1;
    if (t.sp) { fired.push(t.sp); queue.push(...blast(b, i, t.sp)); }
  }
  for (const i of done) b[i] = null;
  for (const m of make) {
    const t = b[m.at];
    if (t) { if (t.k >= 0) got[t.k] += 1; }
    b[m.at] = { id: nextId++, k: m.sp === 'star' ? -1 : m.k, sp: m.sp };
  }
  return { cleared: [...done], got, fired, made: make.map(({ at, sp }) => ({ at, sp })) };
}

/** Clears every current match. `prefer` = where new specials should appear (the swapped cells). */
export function clearMatches(b: Board, prefer: number[] = []): Clear | null {
  const groups = findGroups(b, prefer);
  if (!groups.length) return null;
  const make = groups.filter((g) => g.make && g.at != null).map((g) => ({ at: g.at!, sp: g.make!, k: b[g.at!]!.k }));
  return clearCells(b, groups.flatMap((g) => g.cells), make);
}

/** Scraps fall down to fill gaps; new ones drop in from the top. Returns the new tiles' ids. */
export function collapse(b: Board, rng: Rng = Math.random): Set<number> {
  const fresh = new Set<number>();
  for (let c = 0; c < SIZE; c++) {
    const col: Tile[] = [];
    for (let r = SIZE - 1; r >= 0; r--) { const t = b[idx(r, c)]; if (t) col.push(t); }
    for (let r = SIZE - 1, n = 0; r >= 0; r--, n++) {
      let t = col[n];
      if (!t) { t = newTile(rng); fresh.add(t.id); }
      b[idx(r, c)] = t;
    }
  }
  return fresh;
}

const swapIn = (b: Board, a: number, c: number) => { const t = b[a]; b[a] = b[c]; b[c] = t; };

/** Would swapping these two make something happen? */
export function swapWorks(b: Board, a: number, c: number): boolean {
  if (!adjacent(a, c) || !b[a] || !b[c]) return false;
  if (b[a]!.sp === 'star' || b[c]!.sp === 'star') return true;
  if (b[a]!.sp && b[c]!.sp) return true;
  const copy = [...b];
  swapIn(copy, a, c);
  return findGroups(copy).length > 0;
}

export function hasMove(b: Board): boolean {
  for (let i = 0; i < b.length; i++) {
    if (colOf(i) < SIZE - 1 && swapWorks(b, i, i + 1)) return true;
    if (rowOf(i) < SIZE - 1 && swapWorks(b, i, i + SIZE)) return true;
  }
  return false;
}

/** Swaps two scraps. Returns the first clear (later cascades come from `clearMatches`), or null if the swap does nothing. */
export function swap(b: Board, a: number, c: number): Clear | null {
  if (!swapWorks(b, a, c)) return null;
  swapIn(b, a, c);
  const A = b[c]!, C = b[a]!; // after the swap: A now sits at c, C at a
  // Master's Touch: clears every scrap of the kind it was swapped with (two together clear the whole tray).
  if (A.sp === 'star' || C.sp === 'star') {
    const starAt = A.sp === 'star' ? c : a;
    const other = b[starAt === c ? a : c]!;
    const cells = other.sp === 'star' ? b.map((_, i) => i) : [starAt, ...kindCells(b, other.k)];
    b[starAt] = { ...b[starAt]!, sp: undefined }; // the star is used up, not fired again
    const res = clearCells(b, cells.filter((i) => i !== starAt));
    b[starAt] = null;
    res.cleared.push(starAt);
    res.fired.unshift('star');
    return res;
  }
  // Two tools swapped together both go off.
  if (A.sp && C.sp) return clearCells(b, [a, c]);
  return clearMatches(b, [a, c]);
}

/** Mixes the tray up when no move is left (free, no moves used). */
export function shuffleBoard(b: Board, rng: Rng = Math.random): Board {
  for (let tries = 0; tries < 50; tries++) {
    const tiles = b.filter(Boolean) as Tile[];
    for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
    const next: Board = tiles;
    if (!findGroups(next).length && hasMove(next)) return next;
  }
  return newBoard(rng);
}

// ---------- Orders ----------
const CUSTOMERS = [
  'The cobbler', 'A travelling bard', 'The innkeeper', 'A young squire', 'The miller’s daughter', 'An old fisherman',
  'The hatmaker', 'A wandering knight', 'The village weaver', 'A busy shopkeeper', 'The town crier', 'A shy apprentice',
];
export interface Order { who: string; want: { k: number; n: number }[]; moves: number; number: number }
export function newOrder(number: number, rng: Rng = Math.random): Order {
  const a = Math.floor(rng() * SCRAPS.length);
  let b = Math.floor(rng() * (SCRAPS.length - 1));
  if (b >= a) b += 1;
  const n = 10 + Math.min(14, number * 2);
  return { who: CUSTOMERS[Math.floor(rng() * CUSTOMERS.length)], want: [{ k: a, n }, { k: b, n: n - 2 }], moves: MOVES, number };
}

/** How far along an order is (0–1). */
export function orderProgress(o: Order, got: number[]): number {
  const need = o.want.reduce((s, w) => s + w.n, 0);
  return o.want.reduce((s, w) => s + Math.min(w.n, got[w.k]), 0) / need;
}

/** Crafting XP for an order, from the selected recipe's base XP. Partial orders still give some. */
export function orderXp(baseXp: number, progress: number, complete: boolean, number: number): number {
  return Math.max(1, Math.round(baseXp * (8 + 20 * progress + (complete ? 10 + Math.min(10, number) : 0))));
}
