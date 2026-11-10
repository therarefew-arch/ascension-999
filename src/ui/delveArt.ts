// ⛏️ Deep Delve pixel art (v0.0.2.42, owner: "make the visuals cleaner and not so cheap looking").
// Everything is drawn with code on a small canvas (16 px a block) and scaled up crisp: chunky bevelled blocks whose
// colours cool and darken with depth, glinting ore nuggets, fossils and chests, cracks per hit, a little miner with a
// helmet lamp and a swinging pick, the surface with sky, hills and the mine's headframe. Lighting is added by the
// screen (DeepDelve.tsx) on top.
import { COLS, type Cell, type Dive, type Ore } from '../core/delve';

export const T = 16;
type G = CanvasRenderingContext2D;
const P = (g: G, x: number, y: number, c: string, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

function rgb(c: string): [number, number, number] { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
/** Mix a colour toward white (a > 0) or black (a < 0). */
export function shade(c: string, a: number): string {
  const [r, g, b] = rgb(c); const t = a < 0 ? 0 : 255, k = Math.abs(a);
  const f = (v: number) => Math.round(v + (t - v) * k);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
export function hash(a: number, b: number, c = 0): number {
  let h = (a * 374761393 + b * 668265263 + c * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Block colours per depth band (deeper = cooler and darker). */
export const PAL: Record<Cell, string[]> = {
  dirt: ['#8a5a34', '#7c4f31', '#6d4634', '#5e4038', '#503a3c'],
  stone: ['#8d877f', '#7f7b77', '#717176', '#63656f', '#575b6b'],
  rock: ['#4b505e', '#444a5b', '#3d4357', '#363c52', '#30354c'],
  open: ['#2a1d15', '#251b17', '#211a19', '#1d181c', '#19161e'],
};
export const bandOf = (y: number) => Math.min(4, Math.floor(y / 22));
const variantOf = (x: number, y: number) => Math.floor(hash(x, y, 3) * 4);

const tiles = new Map<string, HTMLCanvasElement>();
function tile(cell: Cell, v: number, band: number, grass: boolean): HTMLCanvasElement {
  const key = `${cell}.${v}.${band}.${grass ? 1 : 0}`;
  let c = tiles.get(key);
  if (!c) { c = makeTile(cell, v, band, grass); tiles.set(key, c); }
  return c;
}

function makeTile(cell: Cell, v: number, band: number, grass: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = T;
  const g = c.getContext('2d')!;
  const base = PAL[cell][band];
  const dk = shade(base, -0.16), lt = shade(base, 0.1);
  P(g, 0, 0, base, T, T);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const n = hash(x + v * 31, y + band * 17, cell.length);
    if (n < 0.1) P(g, x, y, dk); else if (n > 0.94) P(g, x, y, lt);
  }
  if (cell === 'open') {
    // The dug-out back wall: soft vertical tool marks, a little shadow under the ceiling.
    for (let x = 0; x < T; x++) if (hash(x, v, 5) < 0.22) for (let y = 2; y < T - 1; y++) if (hash(x, y, v + 9) < 0.55) P(g, x, y, shade(base, -0.22));
    for (let x = 0; x < T; x++) { P(g, x, 0, shade(base, -0.35)); if (hash(x, v, 6) < 0.5) P(g, x, 1, shade(base, -0.2)); }
    return c;
  }
  if (cell === 'dirt') {
    const n = 2 + (v % 2);
    for (let i = 0; i < n; i++) {
      const px = 2 + Math.floor(hash(v, i, band + 1) * 10), py = 3 + Math.floor(hash(i, v, band + 2) * 9);
      const w = hash(i, band, v) < 0.5 ? 3 : 2;
      P(g, px, py, '#9c8a74', w, 2); P(g, px, py, '#c4b49e'); P(g, px, py + 2, '#4a3524', w, 1);
    }
    // a root or worm-trail now and then
    if (v === 3) { for (let i = 0; i < 5; i++) P(g, 4 + i, 8 + (i % 2), shade(base, -0.3)); }
  }
  if (cell === 'stone') {
    const ys = [4 + (v % 3), 10 + ((v >> 1) % 3)];
    for (const y0 of ys) for (let x = 1; x < T - 1; x++) {
      const yy = y0 + (hash(x, v, y0) < 0.18 ? 1 : 0);
      P(g, x, yy, shade(base, -0.3)); P(g, x, yy + 1, shade(base, 0.08));
    }
    const cx = 3 + v * 2, cy = 7 - (v % 2);
    P(g, cx, cy, shade(base, 0.22), 2, 1); P(g, cx, cy + 1, shade(base, -0.2), 2, 1);
  }
  if (cell === 'rock') {
    const sx = 2 + v * 2;
    for (let i = 0; i < 6; i++) { P(g, sx + i, 3 + i, shade(base, -0.32)); P(g, sx + i + 1, 3 + i, shade(base, 0.12)); }
    for (let i = 0; i < 4; i++) P(g, 12 - i, 9 + i, shade(base, -0.3));
    for (let i = 0; i < 3; i++) {
      const px = 2 + Math.floor(hash(v, i, 40) * 12), py = 2 + Math.floor(hash(i, v, 41) * 12);
      P(g, px, py, '#a5b4fc');
    }
  }
  // Chunky bevel: light top/left, dark bottom/right.
  for (let i = 0; i < T; i++) {
    P(g, i, 0, shade(base, 0.24)); P(g, 0, i, shade(base, 0.12));
    P(g, i, T - 1, shade(base, -0.5)); P(g, T - 1, i, shade(base, -0.34));
  }
  P(g, 0, 0, shade(base, 0.34));
  if (grass) {
    for (let x = 0; x < T; x++) {
      P(g, x, 0, '#6cb83a'); P(g, x, 1, '#4f9a2a'); P(g, x, 2, '#3f7f22');
      if (hash(x, v, 77) < 0.55) P(g, x, 3, '#3f7f22');
      if (hash(x, v, 78) < 0.2) P(g, x, 4, '#356b1d');
    }
  }
  return c;
}

// ----- Pixel maps -----
function drawMap(g: G, map: string[], x: number, y: number, pal: Record<string, string>, flip = false) {
  const w = map[0].length;
  map.forEach((row, j) => {
    for (let i = 0; i < w; i++) {
      const ch = row[flip ? w - 1 - i : i];
      if (ch !== '.') P(g, x + i, y + j, pal[ch]);
    }
  });
}

const ORE_PAL: Record<Exclude<Ore, 'fossil' | 'chest'>, [string, string, string]> = {
  copper: ['#d9773a', '#ffc58a', '#6e2a0e'],
  iron: ['#b4aca2', '#efe9e1', '#45403a'],
  silver: ['#d6dee8', '#ffffff', '#56617a'],
  gold: ['#f5c518', '#fff3a8', '#8a5306'],
  mythril: ['#46a8ff', '#d2f0ff', '#1b3888'],
};
const BIG = ['.ddd.', 'dhmmd', 'dmmmd', '.ddd.'];
const SMALL = ['.dd.', 'dhmd', '.dd.'];
const BONE = [
  '.kk......kk.',
  'kwwk....kwwk',
  'kwwwkkkkwwwk',
  '.kwwwwwwwsk.',
  'kwwskkkkswwk',
  'kwsk....kswk',
  '.kk......kk.',
];
const CHEST = [
  '.kkkkkkkkkk.',
  'kbbbbbbbbbbk',
  'kgbbbbbbbbgk',
  'kggggyyggggk',
  'kgBBByyBBBgk',
  'kgBBBBBBBBgk',
  'kBBBBBBBBBBk',
  '.kkkkkkkkkk.',
];
const NUGGET_SPOTS = [[[2, 3], [9, 8], [5, 10]], [[8, 2], [3, 8], [10, 10]], [[3, 9], [9, 3], [7, 10]], [[2, 2], [10, 6], [4, 10]]];

/** An ore (or fossil / chest) drawn into a block at x0, y0. `t` makes the glints twinkle. */
export function drawOre(g: G, ore: Ore, x0: number, y0: number, v: number, t: number) {
  if (ore === 'fossil') { drawMap(g, BONE, x0 + 2, y0 + 5, { k: '#3b2a1f', w: '#f1e8d4', s: '#c8b994' }, v % 2 === 1); return; }
  if (ore === 'chest') {
    drawMap(g, CHEST, x0 + 2, y0 + 5, { k: '#2a1a10', b: '#a8682f', B: '#7a4620', g: '#d4a017', y: '#fff3b0' });
    if ((t / 900 + v) % 3 < 0.3) sparkle(g, x0 + 9, y0 + 5, '#fff3b0');
    return;
  }
  const [m, h, d] = ORE_PAL[ore];
  const pal = { m, h, d };
  const spots = NUGGET_SPOTS[v % 4];
  drawMap(g, BIG, x0 + spots[0][0], y0 + spots[0][1], pal);
  drawMap(g, BIG, x0 + spots[1][0], y0 + spots[1][1], pal);
  drawMap(g, SMALL, x0 + spots[2][0], y0 + spots[2][1], pal);
  // a glint that comes and goes
  const phase = (t / 1000 + v * 0.83 + x0 * 0.013) % 2.6;
  if (phase < 0.35) sparkle(g, x0 + spots[0][0] + 1, y0 + spots[0][1] + 1, h);
}
function sparkle(g: G, x: number, y: number, c: string) {
  P(g, x, y, '#ffffff'); P(g, x - 1, y, c); P(g, x + 1, y, c); P(g, x, y - 1, c); P(g, x, y + 1, c);
}

// Crack shapes per variant and hit count: random walks from the middle, made once.
const CRACKS: [number, number][][][] = [0, 1, 2, 3].map((v) => [0, 1, 2, 3].map((hits) => {
  const pts: [number, number][] = [];
  const arms = hits === 0 ? 0 : hits === 1 ? 2 : hits === 2 ? 4 : 6;
  for (let a = 0; a < arms; a++) {
    let x = 7 + (a % 2), y = 7 + ((a >> 1) % 2);
    const ang = (a / arms) * Math.PI * 2 + hash(v, a, 9) * 0.9;
    const len = 3 + Math.floor(hash(a, v, hits) * 3) + hits;
    for (let i = 0; i < len; i++) {
      x += Math.round(Math.cos(ang) + (hash(i, a, v) - 0.5) * 0.8);
      y += Math.round(Math.sin(ang) + (hash(a, i, v + 3) - 0.5) * 0.8);
      if (x > 0 && y > 0 && x < T - 1 && y < T - 1) pts.push([x, y]);
    }
  }
  return pts;
}));

// ----- The miner -----
const MINER = [
  '....kkkkk...',
  '...kyyyyyk..',
  '..kyyyyyyylk',
  '..kYYYYYYYk.',
  '...ksssesk..',
  '...ksSssSk..',
  '....kSssk...',
  '...krrrrrk..',
  '..kbrbbbrbk.',
  '..kgbbbbbgk.',
  '...kbBbbBk..',
  '...kbbkbbk..',
  '..kwwk.kwwk.',
  '..kkkk.kkkk.',
];
const MINER_PAL = { k: '#2a1a10', y: '#f6c23a', Y: '#c98a0c', l: '#fffbe0', s: '#f1c27d', S: '#d39b5c', e: '#1f2937', r: '#b4342a', b: '#2f6fd6', B: '#1f4fa8', g: '#8a4b1c', w: '#6b4422' };

/** Crisp pixel line (Bresenham). */
function line(g: G, x0: number, y0: number, x1: number, y1: number, c: string) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 64; i++) {
    P(g, x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

export interface MinerPose { x: number; y: number; face: 1 | -1; swing: number; down: boolean }

/** The miner standing in the block at pixel (px, py). `swing` 0..1 = how far through a pick swing. */
export function drawMiner(g: G, px: number, py: number, pose: MinerPose) {
  const flip = pose.face < 0;
  const x0 = px + 2, y0 = py + 2;
  // the pick: raised over the shoulder at rest, struck forward (or down) mid-swing
  const rest = -1.15, hit = pose.down ? 1.25 : 0.35;
  const k = pose.swing <= 0 ? 0 : pose.swing < 0.35 ? pose.swing / 0.35 : Math.max(0, 1 - (pose.swing - 0.35) / 0.65);
  let a = rest + (hit - rest) * k;
  if (flip) a = Math.PI - a;
  const hx = x0 + (flip ? 2 : 9), hy = y0 + 9;
  const ex = hx + Math.cos(a) * 8, ey = hy + Math.sin(a) * 8;
  line(g, hx, hy, ex, ey, '#8b5a2b');
  const px2 = -Math.sin(a), py2 = Math.cos(a);
  line(g, ex - px2 * 3, ey - py2 * 3, ex + px2 * 3, ey + py2 * 3, '#4b5563');
  line(g, ex - px2 * 3 + Math.cos(a) * -0.6, ey - py2 * 3 + Math.sin(a) * -0.6, ex + px2 * 2, ey + py2 * 2, '#cbd5e1');
  drawMap(g, MINER, x0, y0, MINER_PAL, flip);
}

// ----- The surface -----
function drawSurface(g: G, offY: number, w: number, t: number, row1Open: boolean[]) {
  // sky: world pixel rows up to 16 (the top of row 1)
  const top = -64;
  for (let y = top; y < T; y++) {
    const k = Math.max(0, Math.min(1, (y - top) / (T - top)));
    const r = Math.round(104 + k * 92), gg = Math.round(176 + k * 54), b = Math.round(232 + k * 10);
    P(g, 0, y - offY, `rgb(${r},${gg},${b})`, w, 1);
  }
  // sun + clouds
  P(g, 92, -42 - offY, '#fff6c8', 8, 8); P(g, 93, -43 - offY, '#fff6c8', 6, 1); P(g, 93, -34 - offY, '#ffe9a0', 6, 1);
  const cloud = (cx: number, cy: number) => {
    P(g, cx, cy - offY, '#ffffff', 14, 3); P(g, cx + 3, cy - 2 - offY, '#ffffff', 7, 2); P(g, cx + 2, cy + 3 - offY, '#dcebf5', 11, 1);
  };
  cloud(((t / 260) % (w + 30)) - 20, -40);
  cloud(((t / 380 + 60) % (w + 30)) - 20, -26);
  // far hills, near hills
  for (let x = 0; x < w; x++) {
    const h1 = Math.round(5 + Math.sin(x / 9) * 2 + Math.sin(x / 4.3) * 1);
    P(g, x, 10 - h1 - offY, '#8fb7a6', 1, h1 + 6);
    const h2 = Math.round(3 + Math.sin(x / 6 + 2) * 2);
    P(g, x, 14 - h2 - offY, '#6f9e63', 1, h2 + 2);
  }
  // the headframe over the shaft mouth
  const wood = '#7a4a24', woodD = '#4e2d14', woodL = '#a06a38';
  const l = 34, r = 76, beam = -22;
  for (const px of [l, r]) { P(g, px, beam - offY, wood, 3, T - beam); P(g, px, beam - offY, woodL, 1, T - beam); P(g, px + 2, beam - offY, woodD, 1, T - beam); }
  P(g, l - 3, beam - offY, wood, r - l + 9, 3); P(g, l - 3, beam - offY, woodL, r - l + 9, 1); P(g, l - 3, beam + 2 - offY, woodD, r - l + 9, 1);
  line(g, l + 3, beam + 3 - offY, l + 12, beam + 14 - offY, woodD); line(g, r - 1, beam + 3 - offY, r - 10, beam + 14 - offY, woodD);
  // rope wheel
  const cx = 56, cy = beam - 5;
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; P(g, Math.round(cx + Math.cos(a) * 4), Math.round(cy + Math.sin(a) * 4) - offY, '#3b2a1f'); }
  const spin = t / 500;
  for (let i = 0; i < 3; i++) { const a = spin + (i / 3) * Math.PI; line(g, cx - Math.cos(a) * 3, cy - Math.sin(a) * 3 - offY, cx + Math.cos(a) * 3, cy + Math.sin(a) * 3 - offY, '#6b4422'); }
  P(g, cx - 1, cy - 1 - offY, '#c9a227', 2, 2);
  line(g, cx + 4, cy - offY, cx + 4, beam + 12 - offY, '#d6c08a');
  P(g, cx + 3, beam + 12 - offY, '#8a8a8a', 3, 2);
  // grass tufts along the ground line
  for (let x = 0; x < w; x++) {
    if (row1Open[Math.floor(x / T)]) continue;
    const n = hash(x, 1, 51);
    if (n < 0.35) P(g, x, T - 2 - offY, '#6cb83a', 1, 2);
    else if (n < 0.45) P(g, x, T - 3 - offY, '#7cc94a', 1, 3);
    else if (n > 0.97) { P(g, x, T - 3 - offY, '#f9a8d4'); P(g, x, T - 2 - offY, '#4f9a2a'); }
  }
}

export interface Part { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; s: number; g: number }

/** Draw rows `top`..`top + rows - 1` of the shaft into g (a canvas COLS × T wide). */
export function drawShaft(g: G, d: Dive, top: number, rows: number, t: number, pose: MinerPose | null, targets: [number, number][], parts: Part[]) {
  const w = COLS * T, offY = top * T;
  g.clearRect(0, 0, w, rows * T);
  if (top < 1) drawSurface(g, offY, w, t, Array.from({ length: COLS }, (_, x) => d.rows[1]?.[x]?.cell === 'open'));
  for (let y = Math.max(1, top); y < top + rows; y++) {
    const band = bandOf(y);
    for (let x = 0; x < COLS; x++) {
      const b = d.rows[y]?.[x];
      const cell: Cell = b ? b.cell : 'dirt';
      const v = variantOf(x, y);
      const px = x * T, py = y * T - offY;
      g.drawImage(tile(cell, v, band, y === 1 && cell !== 'open'), px, py);
      if (cell === 'open') {
        // shadow from a solid block above, and a lip of the block to the side
        const above = y === 1 ? null : d.rows[y - 1]?.[x];
        if (above && above.cell !== 'open') P(g, px, py, 'rgba(0,0,0,0.35)', T, 2);
        continue;
      }
      if (b?.ore) drawOre(g, b.ore, px, py, v, t);
      if (b && b.hits > 0) {
        for (const [cx, cy] of CRACKS[v][Math.min(3, b.hits)]) { P(g, px + cx, py + cy, 'rgba(16,10,6,0.85)'); P(g, px + cx + 1, py + cy + 1, 'rgba(255,255,255,0.14)'); }
      }
    }
  }
  // blocks you can tap: soft gold corners that breathe
  if (targets.length) {
    g.globalAlpha = 0.55 + 0.35 * Math.sin(t / 260);
    for (const [x, y] of targets) {
      const px = x * T, py = y * T - offY, c = '#fde68a';
      P(g, px + 1, py + 1, c, 3, 1); P(g, px + 1, py + 1, c, 1, 3);
      P(g, px + T - 4, py + 1, c, 3, 1); P(g, px + T - 2, py + 1, c, 1, 3);
      P(g, px + 1, py + T - 2, c, 3, 1); P(g, px + 1, py + T - 4, c, 1, 3);
      P(g, px + T - 4, py + T - 2, c, 3, 1); P(g, px + T - 2, py + T - 4, c, 1, 3);
    }
    g.globalAlpha = 1;
  }
  if (pose) drawMiner(g, Math.round(pose.x * T), Math.round(pose.y * T - offY), pose);
  for (const p of parts) {
    g.globalAlpha = Math.max(0, Math.min(1, p.life / p.max * 1.5));
    P(g, Math.round(p.x), Math.round(p.y - offY), p.c, p.s, p.s);
  }
  g.globalAlpha = 1;
}

const CHUNK = [
  '..dddd...',
  '.dhhmmd..',
  'dhmmmmmdd',
  'dmmmmhmmd',
  'dmmmmmmmd',
  '.dmmmmmd.',
  '..ddddd..',
];
const icons = new Map<string, string>();
/** A small picture of an ore for the HUD / end panel (data URL, made once). */
export function oreIcon(ore: Ore): string {
  let u = icons.get(ore);
  if (!u) {
    const c = document.createElement('canvas'); c.width = c.height = 12;
    const g = c.getContext('2d')!;
    if (ore === 'fossil') drawMap(g, BONE, 0, 2, { k: '#3b2a1f', w: '#f1e8d4', s: '#c8b994' });
    else if (ore === 'chest') drawMap(g, CHEST, 0, 2, { k: '#2a1a10', b: '#a8682f', B: '#7a4620', g: '#d4a017', y: '#fff3b0' });
    else { const [m, h, d] = ORE_PAL[ore]; drawMap(g, CHUNK, 1, 2, { m, h, d }); P(g, 3, 3, '#ffffff'); }
    u = c.toDataURL(); icons.set(ore, u);
  }
  return u;
}
