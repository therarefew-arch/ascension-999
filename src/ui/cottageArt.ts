// 🏠 The Cottage room, drawn as top-down pixel art (v0.0.2.2, owner's reference pictures: a cosy room seen from the
// front-top — striped wallpaper over a skirting board, a tiled or wooden floor, chunky furniture with dark outlines and
// soft highlights). Everything is drawn with code in the room's own pixels (core/cottage.ts ROOM / SHAPE).
import { ROOM, shapeOf, type FloorId, type WallId } from '../core/cottage';

type G = CanvasRenderingContext2D;
const O = '#3b2a1f'; // outline
const r = (g: G, x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
/** An outlined box with a light top edge and a darker bottom edge. */
function ob(g: G, x: number, y: number, w: number, h: number, fill: string, hi?: string, sh?: string) {
  r(g, x, y, w, h, O);
  r(g, x + 1, y + 1, w - 2, h - 2, fill);
  if (hi) r(g, x + 1, y + 1, w - 2, 1, hi);
  if (sh) r(g, x + 1, y + h - 2, w - 2, 1, sh);
}
function oval(g: G, cx: number, cy: number, rx: number, ry: number, c: string, outline = true) {
  if (outline) { g.fillStyle = O; g.beginPath(); g.ellipse(cx, cy, rx + 1, ry + 1, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
}
const W = {
  pine: ['#e6b075', '#c98d50', '#9a6131'], oak: ['#c08a55', '#9a6a3d', '#6e4627'], maple: ['#d98957', '#b0653a', '#7d4024'],
  dark: ['#8a5f3e', '#6b4529', '#4a2d19'], stone: ['#c4beb6', '#a39d95', '#78726b'], brass: ['#f3d27a', '#d4a63c', '#9c7220'],
  iron: ['#b8c0cc', '#8b95a3', '#5f6875'], copper: ['#f2a46a', '#d47a3e', '#9a4f22'],
};
const leaves = (g: G, cx: number, cy: number, rr: number, dark: string, mid: string, light: string) => {
  oval(g, cx, cy + 1, rr, rr * 0.9, dark);
  oval(g, cx - 1, cy - 1, rr - 2, rr * 0.75, mid, false);
  r(g, cx - rr / 2, cy - rr / 2, 2, 2, light); r(g, cx + 1, cy - 1, 2, 2, light);
};
/** Pieces that give off light (they glow at night). */
export const LIGHTS: Record<string, [number, number, number, string]> = {
  stone_hearth: [19, 36, 34, '255,170,80'], miners_lamp: [5, 10, 22, '253,224,140'], moon_chandelier: [13, 6, 34, '226,232,255'],
  ember_brazier: [8, 6, 22, '255,140,60'], singing_lantern: [6, 10, 22, '186,230,253'], glow_stone: [7, 6, 18, '253,230,138'],
  wisp_jar: [5, 8, 16, '167,243,208'], lamplighter_pole: [5, 4, 24, '253,224,140'], paper_lanterns: [18, 8, 26, '255,170,120'],
  floor_lamp: [7, 6, 30, '253,224,160'],
};
/** A piece's light (decorations by their kind). */
export const lightOf = (id: string) => { const L = LIGHTS[id.split('.')[0]]; return L && L[2] ? L : undefined; };

/** Draw one piece with its top-left at (0, 0). `t` animates fires, water and twinkles; `sky` is the window colour. */
export function drawPiece(g: G, id: string, t: number, sky: string) {
  const fl = Math.sin(t / 140) > 0 ? 1 : 0;
  // 🛍️ Decorations are copies (`rug_cream.2`): draw by their kind.
  if (id.includes('.')) { drawDecor(g, id.split('.')[0], t); return; }
  switch (id) {
    case 'pine_bed': {
      const [l, m, d] = W.pine;
      ob(g, 0, 0, 32, 12, m, l, d); r(g, 3, 3, 26, 6, l); r(g, 3, 8, 26, 1, d);
      ob(g, 0, 10, 32, 34, d);
      r(g, 2, 11, 28, 31, '#f4f1ea');
      ob(g, 5, 12, 22, 8, '#ffffff', '#ffffff', '#d6d3d1');
      r(g, 2, 21, 28, 21, '#8e8bbf'); r(g, 2, 21, 28, 3, '#aeabdb'); r(g, 2, 40, 28, 2, '#6c6a99');
      for (let i = 0; i < 4; i++) r(g, 5 + i * 7, 27 + (i % 2) * 5, 3, 1, '#a19ed0');
      ob(g, 0, 40, 32, 4, m, l); r(g, 1, 44, 3, 0, O);
      break;
    }
    case 'stone_hearth': {
      const [l, m, d] = W.stone;
      ob(g, 6, 0, 26, 18, m, l, d);
      for (let y = 3; y < 16; y += 5) for (let x = 8 + (y % 2) * 4; x < 30; x += 8) r(g, x, y, 5, 3, l);
      ob(g, 0, 16, 38, 6, W.oak[1], W.oak[0], W.oak[2]);
      ob(g, 2, 21, 34, 25, m, l, d);
      for (let y = 24; y < 44; y += 5) { r(g, 3, y, 5, 3, l); r(g, 30, y, 5, 3, l); }
      ob(g, 9, 26, 20, 20, '#2a1d17');
      r(g, 11, 41, 16, 3, '#5b3a22');
      r(g, 13, 35 - fl, 4, 7 + fl, '#f97316'); r(g, 18, 33 + fl, 4, 9 - fl, '#fb923c'); r(g, 23, 36, 3, 6, '#f97316');
      r(g, 15, 38, 2, 4, '#fde047'); r(g, 19, 37 - fl, 2, 5, '#fde047');
      break;
    }
    case 'shrimp_tank': {
      ob(g, 2, 18, 22, 12, W.oak[1], W.oak[0], W.oak[2]); r(g, 5, 21, 7, 6, W.oak[2]); r(g, 14, 21, 7, 6, W.oak[2]);
      ob(g, 0, 1, 26, 19, '#a6dbe8');
      r(g, 1, 6, 24, 13, '#56aacb'); r(g, 1, 15, 24, 4, '#e9d3a0');
      r(g, 4, 9, 1, 7, '#3f8f4a'); r(g, 5, 11, 1, 5, '#4fa85a'); r(g, 20, 10, 1, 6, '#3f8f4a');
      r(g, 9 + fl, 11, 3, 2, '#f97316'); r(g, 15 - fl, 13, 3, 2, '#fb923c');
      r(g, 18, 8 - (Math.floor(t / 300) % 3), 1, 1, '#e0f2fe'); r(g, 1, 1, 24, 2, '#d7e3ea');
      break;
    }
    case 'copper_kettle': {
      ob(g, 1, 11, 16, 11, W.pine[1], W.pine[0], W.pine[2]); r(g, 3, 16, 2, 5, W.pine[2]); r(g, 13, 16, 2, 5, W.pine[2]);
      ob(g, 4, 3, 10, 9, W.copper[1], W.copper[0], W.copper[2]); r(g, 13, 5, 4, 2, W.copper[1]); r(g, 16, 4, 1, 2, O);
      r(g, 6, 0, 6, 1, O); r(g, 6, 1, 1, 2, O); r(g, 11, 1, 1, 2, O); r(g, 6, 5, 2, 2, '#fde3c4');
      if (fl) r(g, 16, 1, 1, 1, '#f5f5f4');
      break;
    }
    case 'herb_rack': {
      ob(g, 0, 0, 30, 4, W.oak[1], W.oak[0]);
      [['#6b8f3a', '#c4b5fd'], ['#5c7f30', '#fde68a'], ['#6b8f3a', '#86efac'], ['#4d7128', '#fca5a5'], ['#6b8f3a', '#c4b5fd']].forEach(([c, tip], i) => {
        const x = 3 + i * 6; r(g, x, 4, 1, 3, O); ob(g, x - 2, 7, 5, 9, c); r(g, x - 1, 14, 3, 2, tip);
      });
      break;
    }
    case 'flower_box': {
      ob(g, 0, 0, 28, 20, '#f5ede0'); r(g, 2, 2, 11, 15, sky); r(g, 15, 2, 11, 15, sky); r(g, 13, 2, 2, 15, '#e7dccb');
      r(g, 2, 2, 11, 2, 'rgba(255,255,255,0.35)'); r(g, 15, 2, 11, 2, 'rgba(255,255,255,0.35)');
      for (let i = 0; i < 6; i++) { r(g, 4 + i * 4, 14, 1, 5, '#4f7a2e'); r(g, 3 + i * 4, 12, 3, 3, ['#f472b6', '#fde047', '#f87171'][i % 3]); }
      ob(g, 1, 18, 26, 8, W.maple[1], W.maple[0], W.maple[2]);
      break;
    }
    case 'oak_table': {
      const [l, m, d] = W.oak;
      ob(g, 0, 0, 34, 15, l, '#d6a676', m);
      r(g, 1, 14, 32, 4, d); r(g, 0, 14, 1, 4, O); r(g, 33, 14, 1, 4, O); r(g, 0, 18, 34, 1, O);
      ob(g, 2, 18, 4, 8, d); ob(g, 28, 18, 4, 8, d);
      oval(g, 17, 7, 6, 4, '#f5f5f4'); r(g, 14, 6, 3, 2, '#f59e0b'); r(g, 18, 7, 3, 2, '#ef4444');
      ob(g, 27, 2, 4, 6, '#f8fafc'); r(g, 28, 3, 2, 1, '#93c5fd');
      break;
    }
    case 'display_anvil': {
      ob(g, 4, 10, 14, 10, W.oak[1], W.oak[0], W.oak[2]); r(g, 7, 12, 8, 1, W.oak[2]); r(g, 7, 15, 8, 1, W.oak[2]);
      ob(g, 1, 3, 20, 7, W.iron[1], W.iron[0], W.iron[2]); r(g, 0, 5, 2, 3, O); r(g, 7, 9, 8, 2, W.iron[2]);
      break;
    }
    case 'miners_lamp': {
      r(g, 4, 0, 2, 4, O); ob(g, 1, 3, 8, 3, W.brass[1]);
      ob(g, 1, 5, 8, 11, '#7c4a1e'); r(g, 2, 6, 6, 9, fl ? '#fde68a' : '#fcd34d'); r(g, 4, 9, 2, 4, '#f97316');
      ob(g, 2, 15, 6, 3, W.brass[2]);
      break;
    }
    case 'rocking_chair': {
      ob(g, 3, 0, 18, 14, '#7ea25a', '#9cc078', '#5f8241');
      for (let i = 0; i < 3; i++) r(g, 7 + i * 5, 2, 1, 10, '#6b8f4a');
      ob(g, 2, 12, 20, 10, '#8db568', '#a8cc84', '#6b8f4a');
      ob(g, 0, 7, 5, 15, '#7ea25a', '#9cc078'); ob(g, 19, 7, 5, 15, '#7ea25a', '#9cc078');
      ob(g, 8, 5, 8, 8, '#e57a2e', '#f59e5b', '#b45309');
      r(g, 1, 24, 22, 2, W.oak[2]); r(g, 0, 23, 2, 2, W.oak[2]); r(g, 22, 23, 2, 2, W.oak[2]); r(g, 4, 21, 2, 3, O); r(g, 18, 21, 2, 3, O);
      break;
    }
    case 'telescope': {
      g.strokeStyle = O; g.lineWidth = 2;
      g.beginPath(); g.moveTo(10, 16); g.lineTo(3, 31); g.moveTo(10, 16); g.lineTo(17, 31); g.moveTo(10, 16); g.lineTo(10, 31); g.stroke();
      g.strokeStyle = W.oak[1]; g.lineWidth = 1;
      g.beginPath(); g.moveTo(10, 16); g.lineTo(3, 31); g.moveTo(10, 16); g.lineTo(17, 31); g.stroke();
      g.save(); g.translate(10, 14); g.rotate(-0.55);
      ob(g, -8, -3, 18, 6, W.brass[1], W.brass[0], W.brass[2]); ob(g, 9, -4, 4, 8, W.brass[2]); r(g, -2, -3, 1, 6, W.brass[2]);
      g.restore();
      break;
    }
    case 'weapon_rack': {
      ob(g, 0, 0, 28, 22, W.dark[1], W.dark[0], W.dark[2]);
      r(g, 3, 4, 22, 2, W.dark[2]); r(g, 3, 15, 22, 2, W.dark[2]);
      ob(g, 6, 2, 4, 14, '#e5e7eb'); r(g, 7, 3, 1, 12, '#ffffff'); ob(g, 4, 14, 8, 3, W.brass[1]); ob(g, 7, 16, 2, 5, '#6b3e1e');
      ob(g, 18, 3, 2, 18, '#7a4a24'); ob(g, 14, 3, 8, 7, W.iron[1], W.iron[0], W.iron[2]);
      break;
    }
    case 'maple_bookcase': {
      const [l, m, d] = W.maple;
      ob(g, 0, 0, 28, 44, m, l, d);
      const books = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f472b6', '#14b8a6', '#eab308'];
      for (let s = 0; s < 3; s++) {
        const y = 3 + s * 13;
        r(g, 2, y, 24, 11, '#5a2f17');
        let x = 3;
        for (let i = 0; x < 24; i++) { const bw = 2 + ((i * 7 + s) % 3); const bh = 7 + ((i + s) % 4); if (x + bw > 25) break; r(g, x, y + 11 - bh, bw, bh, books[(i * 3 + s) % books.length]); r(g, x, y + 11 - bh, bw, 1, 'rgba(255,255,255,0.35)'); x += bw + (i % 4 === 3 ? 2 : 0); }
        r(g, 1, y + 11, 26, 2, l);
      }
      ob(g, 18, 0, 8, 4, '#b45309'); leaves(g, 22, -1, 4, '#2f6b33', '#4a9a4a', '#86cc5c');
      break;
    }
    case 'rune_mirror': {
      oval(g, 9, 13, 8, 12, W.brass[1]);
      oval(g, 9, 13, 6, 10, '#bfe3f2', false);
      r(g, 5, 6, 2, 8, 'rgba(255,255,255,0.6)');
      g.globalAlpha = 0.5 + 0.4 * Math.sin(t / 500);
      r(g, 8, 9, 2, 1, '#a78bfa'); r(g, 9, 10, 1, 5, '#a78bfa'); r(g, 7, 14, 4, 1, '#a78bfa'); r(g, 10, 17, 2, 1, '#a78bfa');
      g.globalAlpha = 1;
      break;
    }
    case 'moon_chandelier': {
      r(g, 12, 0, 2, 6, O);
      ob(g, 2, 9, 22, 4, W.iron[0], '#f1f5f9', W.iron[1]);
      for (const x of [4, 10, 15, 21]) { ob(g, x - 1, 4, 3, 6, '#f8fafc'); r(g, x, 2 - (fl && x % 2 ? 1 : 0), 1, 2, '#fde68a'); }
      ob(g, 11, 12, 4, 6, W.iron[1]);
      break;
    }
    case 'kiln_vase': {
      ob(g, 4, 0, 4, 4, '#c2683a'); oval(g, 6, 10, 5, 7, '#c2683a');
      r(g, 2, 9, 8, 2, '#7c2d12'); r(g, 3, 6, 2, 3, '#e08a5a'); r(g, 3, 16, 6, 2, O);
      break;
    }
    case 'spice_shelf': {
      ob(g, 0, 11, 26, 5, W.oak[1], W.oak[0]);
      [['#dc2626', 4], ['#f59e0b', 6], ['#65a30d', 4], ['#7c2d12', 5], ['#fde68a', 4]].forEach(([c, h], i) => {
        const x = 2 + i * 5, hh = h as number; ob(g, x, 11 - hh - 1, 4, hh + 1, '#e0f2fe'); r(g, x + 1, 11 - hh + 1, 2, hh - 1, c as string); r(g, x, 11 - hh - 2, 4, 1, W.oak[2]);
      });
      break;
    }
    case 'ember_brazier': {
      r(g, 3, 12, 2, 8, O); r(g, 11, 12, 2, 8, O); r(g, 7, 13, 2, 7, O);
      ob(g, 1, 6, 14, 7, W.iron[2], W.iron[1]);
      r(g, 3, 6, 10, 2, '#7c2d12'); r(g, 4, 5, 2, 2, '#f97316'); r(g, 8, 4 - fl, 2, 3, '#fb923c'); r(g, 11, 5, 2, 2, '#ef4444'); r(g, 7, 3 - fl, 1, 2, '#fde047');
      break;
    }
    case 'frost_quilt': {
      r(g, 0, 0, 36, 26, O);
      const cs = ['#bfdbfe', '#f8fafc', '#5eead4', '#93c5fd', '#e0e7ff', '#99f6e4'];
      for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) r(g, 1 + x * 6 - (x === 5 ? 0 : 0), 1 + y * 6, 6 - (x === 5 ? 2 : 0), 6 - (y === 3 ? 0 : 0), cs[(x + y * 2) % cs.length]);
      for (let x = 0; x < 6; x++) r(g, 1 + x * 6, 1, 1, 24, 'rgba(59,42,31,0.25)');
      for (let y = 0; y < 4; y++) r(g, 1, 1 + y * 6, 34, 1, 'rgba(59,42,31,0.25)');
      r(g, 1, 25, 34, 0, O);
      break;
    }
    case 'singing_lantern': {
      ob(g, 3, 0, 6, 3, '#94a3b8'); r(g, 5, 0, 2, 0, O);
      ob(g, 2, 3, 8, 14, '#bae6fd', '#e0f2fe', '#7dd3fc');
      r(g, 4, 6, 4, 8, fl ? '#f0f9ff' : '#e0f2fe'); r(g, 3, 4, 1, 12, 'rgba(255,255,255,0.6)');
      ob(g, 2, 17, 8, 3, '#94a3b8');
      break;
    }
    case 'void_window': {
      ob(g, 0, 0, 26, 28, '#4c3a6e', '#6b5594');
      r(g, 2, 2, 22, 24, '#1e1440');
      for (let i = 0; i < 12; i++) r(g, 3 + ((i * 7) % 20), 3 + ((i * 11) % 21), 1, 1, i % 3 === Math.floor(t / 400) % 3 ? '#fde68a' : '#c4b5fd');
      r(g, 12, 2, 2, 24, '#4c3a6e'); r(g, 2, 13, 22, 2, '#4c3a6e');
      ob(g, -1, 26, 28, 3, '#4c3a6e');
      break;
    }
    case 'star_orrery': {
      ob(g, 5, 21, 10, 5, W.brass[1], W.brass[0], W.brass[2]); r(g, 9, 12, 2, 9, W.brass[2]);
      g.strokeStyle = W.brass[1]; g.lineWidth = 1;
      g.beginPath(); g.ellipse(10, 10, 9, 4, 0.3, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(10, 10, 6, 7, -0.4, 0, Math.PI * 2); g.stroke();
      oval(g, 10, 10, 3, 3, '#fde047');
      const a = t / 900; oval(g, 10 + Math.cos(a) * 9, 10 + Math.sin(a) * 4, 1.5, 1.5, '#60a5fa'); oval(g, 10 + Math.cos(-a * 1.4) * 5, 10 + Math.sin(-a * 1.4) * 6, 1.2, 1.2, '#f472b6');
      break;
    }
    case 'wind_chimes': {
      r(g, 5, 0, 2, 3, O); ob(g, 0, 2, 12, 3, W.oak[1]);
      const sw = Math.sin(t / 600);
      [[1, 12], [4, 16], [7, 10], [10, 14]].forEach(([x, h], i) => { const dx = Math.round(sw * (i % 2 ? 1 : -1)); r(g, x + dx, 5, 1, 2, O); ob(g, x - 1 + dx, 7, 3, h, '#99f6e4', '#ccfbf1'); });
      break;
    }
    case 'worldtree_sapling': case 'blossom_tree': {
      const pink = id === 'blossom_tree';
      ob(g, 4, 21, 12, 9, pink ? '#e2e8f0' : '#b45309', pink ? '#f8fafc' : '#d97706', pink ? '#cbd5e1' : '#7c2d12');
      r(g, 9, 10, 2, 12, '#5b3a22');
      if (pink) { leaves(g, 10, 8, 8, '#be185d', '#f472b6', '#fbcfe8'); r(g, 5, 6, 2, 2, '#fdf2f8'); r(g, 13, 10, 2, 2, '#fdf2f8'); }
      else { leaves(g, 10, 9, 8, '#166534', '#22a04a', '#86efac'); leaves(g, 6, 5, 4, '#14532d', '#2f8f4a', '#bbf7d0'); }
      break;
    }
    case 'paper_lanterns': {
      g.strokeStyle = O; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo(18, 8, 36, 2); g.stroke();
      ['#ef4444', '#f59e0b', '#ef4444', '#fb923c'].forEach((c, i) => { const x = 3 + i * 9, y = 3 + (i === 1 || i === 2 ? 2 : 0); ob(g, x, y, 6, 8, c); r(g, x + 1, y + 1, 4, 1, 'rgba(255,255,255,0.4)'); r(g, x + 2, y + 8, 2, 2, '#fde047'); });
      break;
    }
    case 'harvest_sheaf': {
      for (let i = 0; i < 6; i++) { r(g, 2 + i * 2, 6, 1, 15, '#c99a2e'); ob(g, 1 + i * 2, 1 + (i % 2) * 2, 3, 7, '#e2b84a'); }
      ob(g, 2, 12, 10, 3, '#a16207');
      break;
    }
    case 'winter_tree': {
      ob(g, 8, 30, 8, 6, '#b91c1c', '#ef4444');
      for (let k = 0; k < 4; k++) { const w = 8 + k * 5, y = 4 + k * 6; g.fillStyle = O; g.beginPath(); g.moveTo(12, y - 3); g.lineTo(12 - w / 2 - 1, y + 9); g.lineTo(12 + w / 2 + 1, y + 9); g.fill(); g.fillStyle = k % 2 ? '#166534' : '#15803d'; g.beginPath(); g.moveTo(12, y - 2); g.lineTo(12 - w / 2, y + 8); g.lineTo(12 + w / 2, y + 8); g.fill(); }
      [[9, 13, '#ef4444'], [15, 18, '#fde047'], [7, 24, '#60a5fa'], [16, 27, '#f472b6'], [11, 21, '#fde047']].forEach(([x, y, c]) => r(g, x as number, y as number, 2, 2, c as string));
      r(g, 11, 0, 2, 2, fl ? '#fef08a' : '#fde047');
      break;
    }
    case 'family_portrait': {
      ob(g, 0, 0, 24, 20, W.brass[1], W.brass[0], W.brass[2]); r(g, 2, 2, 20, 16, '#cfe8f3'); r(g, 2, 13, 20, 5, '#86c06c');
      [[5, '#2563eb'], [10, '#dc2626'], [15, '#16a34a'], [19, '#7c3aed']].forEach(([x, c]) => { r(g, x as number, 7, 3, 3, '#f2c79a'); r(g, (x as number) - 1, 10, 5, 6, c as string); });
      break;
    }
    case 'whisper_bough': {
      ob(g, 9, 4, 8, 7, W.dark[1]);
      g.strokeStyle = '#6b4226'; g.lineWidth = 2; g.beginPath(); g.moveTo(1, 9); g.quadraticCurveTo(13, 2, 25, 6); g.stroke();
      for (let i = 0; i < 7; i++) { const x = 2 + i * 3.4, y = 5 + Math.sin(i + t / 700) * 1.5; r(g, x, y, 3, 2, i % 2 ? '#4ade80' : '#22a04a'); }
      break;
    }
    case 'glow_stone': {
      ob(g, 1, 10, 12, 6, W.stone[1], W.stone[0], W.stone[2]);
      oval(g, 7, 6, 5, 5, fl ? '#fef08a' : '#fde68a'); r(g, 5, 3, 2, 2, '#fffbeb');
      break;
    }
    case 'wisp_jar': {
      ob(g, 2, 0, 6, 3, '#a16207'); ob(g, 1, 2, 8, 12, '#dbeafe'); r(g, 2, 3, 1, 9, 'rgba(255,255,255,0.7)');
      oval(g, 5, 8 + (fl ? -1 : 0), 2, 2, '#a7f3d0', false); r(g, 5, 7, 1, 1, '#ffffff');
      break;
    }
    case 'sea_chest': {
      ob(g, 0, 7, 24, 13, W.dark[1], W.dark[0], W.dark[2]);
      ob(g, 0, 0, 24, 9, W.dark[0], '#a77a55', W.dark[1]);
      r(g, 4, 1, 2, 18, W.brass[2]); r(g, 18, 1, 2, 18, W.brass[2]);
      ob(g, 10, 7, 4, 5, W.brass[1]);
      break;
    }
    case 'lamplighter_pole': {
      ob(g, 4, 8, 2, 30, '#292524'); ob(g, 2, 35, 6, 3, '#292524');
      ob(g, 1, 0, 8, 9, '#1e293b'); r(g, 2, 2, 6, 6, fl ? '#fde68a' : '#fcd34d'); r(g, 4, 3, 2, 3, '#f97316');
      break;
    }
    case 'ashhorn_horn': {
      ob(g, 0, 2, 24, 12, W.dark[1], W.dark[0], W.dark[2]);
      g.strokeStyle = O; g.lineWidth = 5; g.beginPath(); g.moveTo(3, 9); g.quadraticCurveTo(12, 0, 22, 6); g.stroke();
      g.strokeStyle = '#f5e6d3'; g.lineWidth = 3; g.beginPath(); g.moveTo(3, 9); g.quadraticCurveTo(12, 0, 22, 6); g.stroke();
      r(g, 18, 4, 3, 2, '#fb923c'); r(g, 9, 5, 2, 1, '#e7c9a0');
      break;
    }
    case 'yeti_rug': {
      oval(g, 19, 12, 18, 11, '#f1f5f9');
      oval(g, 19, 12, 13, 7, '#e2e8f0', false);
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; r(g, 19 + Math.cos(a) * 18 - 1, 12 + Math.sin(a) * 11 - 1, 2, 2, '#f8fafc'); }
      r(g, 12, 9, 3, 1, '#cbd5e1'); r(g, 22, 13, 4, 1, '#cbd5e1');
      break;
    }
    case 'heron_feather': {
      ob(g, 3, 24, 6, 8, '#3b5b9a', '#5b7bc0');
      r(g, 6, 2, 1, 23, '#e2e8f0');
      for (let y = 2; y < 22; y += 2) { r(g, 3, y + 1, 3, 2, y % 4 ? '#5eead4' : '#a78bfa'); r(g, 7, y, 3, 2, y % 4 ? '#a78bfa' : '#5eead4'); }
      r(g, 4 + (Math.floor(t / 300) % 4), 6 + (Math.floor(t / 300) % 3) * 5, 1, 1, '#ffffff');
      break;
    }
    case 'star_antler': {
      oval(g, 13, 13, 6, 4, W.dark[1]);
      g.strokeStyle = O; g.lineWidth = 3;
      const ant = (s: number) => { g.beginPath(); g.moveTo(13, 11); g.lineTo(13 + 5 * s, 4); g.lineTo(13 + 11 * s, 2); g.moveTo(13 + 5 * s, 4); g.lineTo(13 + 6 * s, 0); g.stroke(); };
      ant(1); ant(-1);
      g.strokeStyle = '#fef3c7'; g.lineWidth = 1; ant(1); ant(-1);
      r(g, 4, 1, 1, 1, '#fde047'); r(g, 22, 3, 1, 1, fl ? '#fde047' : '#ffffff'); r(g, 18, 0, 1, 1, '#ffffff');
      break;
    }
    case 'rain_cloud': {
      const bob = Math.sin(t / 700) * 1.5;
      g.save(); g.translate(0, bob);
      oval(g, 7, 6, 6, 5, '#e2e8f0'); oval(g, 14, 5, 7, 5, '#f1f5f9'); oval(g, 11, 8, 8, 3, '#e2e8f0', false);
      g.restore();
      for (let i = 0; i < 3; i++) { const k = ((t / 500) + i / 3) % 1; r(g, 6 + i * 5, 11 + k * 5 + bob, 1, 2, '#60a5fa'); }
      break;
    }
    case 'first_tusk': {
      ob(g, 3, 12, 26, 6, W.dark[1], W.dark[0], W.dark[2]); r(g, 8, 9, 2, 4, O); r(g, 22, 9, 2, 4, O);
      g.strokeStyle = O; g.lineWidth = 6; g.beginPath(); g.moveTo(2, 9); g.quadraticCurveTo(16, -2, 30, 6); g.stroke();
      g.strokeStyle = '#f5ecd7'; g.lineWidth = 4; g.beginPath(); g.moveTo(2, 9); g.quadraticCurveTo(16, -2, 30, 6); g.stroke();
      r(g, 12, 2, 1, 4, '#4d7c0f'); r(g, 10, 2, 2, 1, '#65a30d'); r(g, 13, 1, 2, 1, '#65a30d');
      break;
    }
    default: {
      const s = shapeOf(id);
      ob(g, 0, 0, s.w, s.h, '#d6c3a5');
    }
  }
}

/** 🛍️ The decorations (v0.0.2.5), in the same style as the furniture. */
function drawDecor(g: G, kind: string, t: number) {
  switch (kind) {
    case 'rug_cream': case 'rug_green': {
      const [a, b] = kind === 'rug_cream' ? ['#efe2bf', '#c9b27f'] : ['#9cbf6e', '#6f944a'];
      r(g, 0, 0, 40, 24, O); r(g, 1, 1, 38, 22, a);
      for (let x = 4; x < 36; x += 6) r(g, x, 1, 2, 22, b);
      r(g, 1, 1, 38, 1, 'rgba(255,255,255,0.3)');
      for (let x = 2; x < 39; x += 3) { r(g, x, 23, 1, 1, b); r(g, x, 0, 1, 1, b); }
      break;
    }
    case 'rug_red': {
      oval(g, 17, 11, 16, 10, '#b8443a'); oval(g, 17, 11, 11, 6, '#d9624f', false); oval(g, 17, 11, 5, 3, '#f2c06b', false);
      break;
    }
    case 'plant_fern': {
      ob(g, 3, 14, 10, 8, '#c2683a', '#e08a5a', '#8a4523');
      for (let i = 0; i < 7; i++) { const a = -1.4 + i * 0.45; g.strokeStyle = i % 2 ? '#3f8f4a' : '#2f7d38'; g.lineWidth = 2; g.beginPath(); g.moveTo(8, 15); g.lineTo(8 + Math.cos(a) * 8, 15 + Math.sin(a) * 12); g.stroke(); }
      break;
    }
    case 'plant_tall': {
      ob(g, 4, 22, 10, 10, '#f1f5f9', '#ffffff', '#cbd5e1');
      r(g, 8, 8, 2, 15, '#4d3a22');
      [[3, 8, -1], [12, 5, 1], [4, 14, -1], [13, 12, 1], [8, 1, 0]].forEach(([x, y, d]) => { oval(g, x + 1, y + 3, 4, 3, '#3f8f4a'); r(g, x + (d as number), y + 2, 3, 1, '#86cc5c'); });
      break;
    }
    case 'plant_cactus': {
      ob(g, 1, 9, 8, 5, '#c2683a', '#e08a5a');
      ob(g, 3, 1, 4, 9, '#4f9a5a', '#6fbf7a'); ob(g, 0, 4, 3, 4, '#4f9a5a'); ob(g, 7, 3, 3, 4, '#4f9a5a'); r(g, 4, 0, 2, 1, '#f472b6');
      break;
    }
    case 'floor_lamp': {
      ob(g, 3, 33, 8, 3, '#3f3a33'); r(g, 6, 10, 2, 24, '#3f3a33');
      g.fillStyle = O; g.beginPath(); g.moveTo(1, 11); g.lineTo(4, 1); g.lineTo(10, 1); g.lineTo(13, 11); g.fill();
      g.fillStyle = '#f5e6c8'; g.beginPath(); g.moveTo(2, 10); g.lineTo(5, 2); g.lineTo(9, 2); g.lineTo(12, 10); g.fill();
      r(g, 4, 10, 6, 1, '#fde68a');
      break;
    }
    case 'sofa': {
      ob(g, 2, 0, 40, 12, '#b5652e', '#d0824a', '#8a4a20');
      for (let i = 0; i < 3; i++) r(g, 4 + i * 13, 2, 1, 9, '#9a5426');
      ob(g, 2, 10, 40, 10, '#c4743a', '#de9058', '#8a4a20');
      ob(g, 0, 5, 6, 17, '#a85c2a', '#c4743a'); ob(g, 38, 5, 6, 17, '#a85c2a', '#c4743a');
      ob(g, 26, 4, 10, 8, '#7aa35a', '#9cc078');
      r(g, 3, 22, 3, 4, O); r(g, 38, 22, 3, 4, O);
      break;
    }
    case 'coffee_table': {
      ob(g, 0, 0, 26, 10, W.dark[0], '#a77a55', W.dark[1]); r(g, 1, 9, 24, 3, W.dark[2]);
      ob(g, 2, 12, 3, 4, W.dark[2]); ob(g, 21, 12, 3, 4, W.dark[2]);
      ob(g, 9, 2, 6, 5, '#f8fafc'); r(g, 15, 3, 2, 2, O); r(g, 10, 3, 4, 1, '#7c4a24');
      if (Math.floor(t / 600) % 2) r(g, 11, 0, 1, 1, '#e7e5e4'); else r(g, 12, 0, 1, 1, '#e7e5e4');
      break;
    }
    case 'side_table': {
      ob(g, 0, 0, 14, 8, W.oak[0], '#d6a676', W.oak[1]); r(g, 1, 7, 12, 3, W.oak[2]); ob(g, 2, 10, 3, 6, W.oak[2]); ob(g, 9, 10, 3, 6, W.oak[2]);
      ob(g, 5, 0, 4, 3, '#93c5fd');
      break;
    }
    case 'desk': {
      ob(g, 0, 0, 32, 14, '#e5e7eb', '#f8fafc', '#cbd5e1');
      ob(g, 2, 2, 9, 7, '#ffffff'); r(g, 3, 4, 6, 1, '#94a3b8'); r(g, 3, 6, 5, 1, '#94a3b8');
      ob(g, 21, 1, 9, 9, '#38bdf8'); r(g, 22, 2, 7, 4, '#4ade80'); r(g, 22, 6, 7, 3, '#facc15');
      r(g, 1, 13, 30, 2, '#b8bec6'); ob(g, 2, 15, 3, 11, W.oak[1]); ob(g, 27, 15, 3, 11, W.oak[1]); ob(g, 16, 15, 10, 6, W.oak[0]); r(g, 20, 17, 2, 1, O);
      break;
    }
    case 'wardrobe': {
      ob(g, 0, 0, 24, 42, W.oak[1], W.oak[0], W.oak[2]);
      r(g, 11, 2, 2, 38, W.oak[2]); r(g, 9, 18, 1, 4, W.brass[1]); r(g, 14, 18, 1, 4, W.brass[1]);
      r(g, 3, 4, 7, 12, W.oak[0]); r(g, 14, 4, 7, 12, W.oak[0]); ob(g, 15, 12, 7, 10, '#7aa35a'); r(g, 16, 14, 2, 2, '#f8fafc');
      break;
    }
    case 'dining_set': {
      ob(g, 9, 0, 12, 8, W.oak[1], W.oak[0]); r(g, 10, 7, 10, 2, W.oak[2]);
      ob(g, 3, 8, 24, 14, '#f8fafc', '#ffffff', '#e2e8f0');
      for (let x = 4; x < 26; x += 4) r(g, x, 9, 2, 2, '#fca5a5');
      oval(g, 15, 14, 4, 3, '#fef3c7'); r(g, 13, 13, 2, 1, '#f59e0b'); ob(g, 6, 10, 3, 6, '#dc2626'); r(g, 7, 9, 1, 1, O);
      r(g, 4, 22, 2, 3, O); r(g, 24, 22, 2, 3, O);
      ob(g, 9, 24, 12, 8, W.oak[1], W.oak[0]); r(g, 10, 30, 10, 2, W.oak[2]);
      break;
    }
    case 'book_stack': {
      ob(g, 0, 6, 12, 4, '#3b82f6'); ob(g, 1, 3, 10, 4, '#ef4444'); ob(g, 0, 0, 11, 4, '#10b981'); r(g, 1, 1, 9, 1, 'rgba(255,255,255,0.4)');
      break;
    }
    case 'crates': {
      ob(g, 0, 8, 14, 12, '#d6b07a', '#e8c894', '#a8834f'); r(g, 3, 8, 8, 2, '#a8834f');
      ob(g, 8, 0, 14, 12, '#e3c089', '#f0d4a6', '#b38f5b'); r(g, 11, 0, 8, 2, '#b38f5b'); ob(g, 13, 5, 5, 3, '#f8fafc');
      break;
    }
    case 'laundry_basket': {
      ob(g, 0, 3, 16, 9, '#c9a66b', '#e0c28c', '#9c7c46');
      for (let x = 2; x < 15; x += 3) r(g, x, 5, 1, 6, '#9c7c46');
      r(g, 2, 1, 5, 3, '#93c5fd'); r(g, 7, 0, 5, 3, '#f8fafc'); r(g, 11, 2, 3, 2, '#f472b6');
      break;
    }
    case 'pet_bed': {
      oval(g, 9, 5, 8, 4, '#b45309'); oval(g, 9, 5, 6, 2.5, '#fcd9b6', false); r(g, 5, 4, 3, 1, '#f5c79a');
      break;
    }
    case 'frame_land': {
      ob(g, 0, 0, 18, 14, W.dark[0], '#a77a55', W.dark[1]); r(g, 2, 2, 14, 10, '#9fd3ea'); r(g, 2, 8, 14, 4, '#6fa84a'); r(g, 4, 6, 6, 3, '#4f8a3a'); r(g, 12, 3, 2, 2, '#fde68a');
      break;
    }
    case 'frame_tall': {
      ob(g, 0, 0, 12, 16, W.brass[1], W.brass[0], W.brass[2]); r(g, 2, 2, 8, 12, '#5b4a7a'); r(g, 4, 4, 4, 4, '#f2c79a'); r(g, 3, 8, 6, 6, '#1e3a8a'); r(g, 4, 3, 4, 1, '#6b3f1f');
      break;
    }
    case 'wall_clock': {
      oval(g, 6, 6, 5, 5, W.dark[1]); oval(g, 6, 6, 4, 4, '#f8fafc', false);
      const a = (t / 4000) % (Math.PI * 2); g.strokeStyle = O; g.lineWidth = 1;
      g.beginPath(); g.moveTo(6, 6); g.lineTo(6 + Math.cos(a) * 3, 6 + Math.sin(a) * 3); g.moveTo(6, 6); g.lineTo(6, 3.5); g.stroke();
      break;
    }
    case 'wall_shelf': {
      ob(g, 0, 7, 22, 3, W.oak[1], W.oak[0]); r(g, 3, 10, 2, 2, O); r(g, 17, 10, 2, 2, O);
      ob(g, 3, 2, 6, 6, '#e08a5a'); for (let i = 0; i < 4; i++) r(g, 2 + i * 2, 4 + i * 2, 2, 2, '#3f8f4a');
      r(g, 3, 8, 1, 4, '#3f8f4a'); ob(g, 13, 3, 4, 5, '#bfdbfe'); r(g, 14, 2, 2, 1, W.oak[2]);
      break;
    }
  }
}

// ----- The room -----
const WALL_COL: Record<WallId, [string, string, string]> = {
  cream: ['#f6ebc9', '#ecdcb1', '#e2cf9e'], sage: ['#5f8a69', '#527b5c', '#466b4f'], amber: ['#eaa456', '#de9445', '#cf8538'],
  sky: ['#b7d8ec', '#a6cbe2', '#93bcd6'], rose: ['#efc2c3', '#e5b0b2', '#d99ea0'], plank: ['#a8763f', '#946535', '#7c532a'],
};
export const wallSwatch = (w: WallId) => WALL_COL[w][0];
export const FLOOR_SWATCH: Record<FloorId, string> = { tiles: '#cfd3d9', oak: '#b07a45', pine: '#dcae73', stone: '#9b958d', checker: '#e9dcc1', moss: '#7c9a52' };
export function drawRoom(g: G, wall: WallId, floor: FloorId) {
  const { w, h, side, wallTop, wallBottom, floorBottom } = ROOM;
  r(g, 0, 0, w, h, '#2b1f17');
  // Back wall
  const [a, b, c] = WALL_COL[wall];
  r(g, side, wallTop, w - side * 2, wallBottom - wallTop, a);
  if (wall === 'plank') for (let y = wallTop + 6; y < wallBottom; y += 8) { r(g, side, y, w - side * 2, 1, c); for (let x = side + ((y / 8) % 2) * 14; x < w - side; x += 28) r(g, x, y - 7, 1, 7, b); }
  else if (wall === 'cream' || wall === 'rose') for (let x = side + 4; x < w - side; x += 9) { r(g, x, wallTop, 3, wallBottom - wallTop, b); r(g, x + 1, wallTop + ((x * 7) % 23), 1, 6, c); }
  else { r(g, side, wallTop, w - side * 2, 3, b); for (let i = 0; i < 30; i++) r(g, side + ((i * 37) % (w - side * 2 - 4)), wallTop + 5 + ((i * 13) % (wallBottom - wallTop - 12)), 2, 2, b); }
  // Skirting board
  r(g, side, wallBottom - 5, w - side * 2, 5, '#8a6448'); r(g, side, wallBottom - 5, w - side * 2, 1, '#a98063'); r(g, side, wallBottom - 1, w - side * 2, 1, '#5d4130');
  // Floor
  const fw = w - side * 2, fy = wallBottom, fh = floorBottom - wallBottom;
  if (floor === 'tiles') {
    r(g, side, fy, fw, fh, '#cfd3d9');
    for (let y = 0; y < fh; y += 16) for (let x = 0; x < fw; x += 16) { r(g, side + x + 1, fy + y + 1, 14, 14, ((x + y) / 16) % 2 ? '#d7dbe0' : '#c9cdd4'); r(g, side + x + 2, fy + y + 2, 3, 1, '#e3e6ea'); }
    for (let y = 0; y < fh; y += 16) r(g, side, fy + y, fw, 1, '#b4b8bf');
    for (let x = 0; x < fw; x += 16) r(g, side + x, fy, 1, fh, '#b4b8bf');
  } else if (floor === 'oak' || floor === 'pine') {
    const [l, m, d] = floor === 'oak' ? ['#c08a55', '#b07a45', '#93633a'] : ['#e8bf88', '#dcae73', '#c4955c'];
    r(g, side, fy, fw, fh, m);
    for (let y = 0; y < fh; y += 7) {
      r(g, side, fy + y, fw, 1, d);
      for (let x = ((y / 7) % 3) * 13; x < fw; x += 38) r(g, side + x, fy + y, 1, 7, d);
      r(g, side + ((y * 17) % (fw - 10)), fy + y + 3, 8, 1, l);
    }
  } else if (floor === 'stone') {
    r(g, side, fy, fw, fh, '#7d776f');
    for (let y = 0; y < fh; y += 14) for (let x = -((y / 14) % 2) * 9; x < fw; x += 18) { const cx = Math.max(0, x); r(g, side + cx + 1, fy + y + 1, Math.min(16, fw - cx - 1), 12, ((x + y) % 3) ? '#a39d95' : '#9b958d'); r(g, side + cx + 2, fy + y + 2, 4, 1, '#b8b2aa'); }
  } else if (floor === 'checker') {
    for (let y = 0; y < fh; y += 12) for (let x = 0; x < fw; x += 12) r(g, side + x, fy + y, Math.min(12, fw - x), Math.min(12, fh - y), ((x + y) / 12) % 2 ? '#e9dcc1' : '#8a5a3a');
  } else {
    r(g, side, fy, fw, fh, '#6f8c4a');
    for (let i = 0; i < 160; i++) r(g, side + ((i * 53) % fw), fy + ((i * 29) % fh), 2, 1, i % 3 ? '#7c9a52' : '#5f7a3e');
  }
  r(g, side, fy, fw, 2, 'rgba(0,0,0,0.12)'); // shadow under the skirting board
  // Frame and the doorway at the bottom
  r(g, 0, 0, w, side, '#6b4f3a'); r(g, 0, 0, side, h, '#6b4f3a'); r(g, w - side, 0, side, h, '#6b4f3a'); r(g, 0, floorBottom, w, h - floorBottom, '#6b4f3a');
  r(g, side - 1, wallTop - 1, w - side * 2 + 2, 1, O); r(g, side - 1, wallTop, 1, floorBottom - wallTop, O); r(g, w - side, wallTop, 1, floorBottom - wallTop, O); r(g, side - 1, floorBottom, w - side * 2 + 2, 1, O);
  const dw = 34, dx = (w - dw) / 2;
  r(g, dx, floorBottom, dw, h - floorBottom, '#f6efe2'); r(g, dx, floorBottom, dw, 1, O);
}
