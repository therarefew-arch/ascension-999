// 🎨 Each town's own dungeon scenery (v0.0.1.82, owner: "the backgrounds don't sync with the town … read the town
// descriptions and make it closer, like if a town is misty let's make it misty"). Built from each town's blurb and vibe
// (REGION_INFO in data/tiers.ts, TOWN_VIBE in data/lore.ts): a sky (sun, moon, aurora, the Rift's crack…), a far-off
// view (the volcano, the lighthouse, the spires…), the props along the path (willows, mine beams, frostpines, ferns…)
// and an atmosphere in front (Lunaria's mist, Ironmoor's soot, Cinderpeak's heat). Drawing only — no game rules.
import { GROUND } from '../core/dungeon';

export const U = 3;
export const hash = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
/** A chunky pixel circle (rows of 3-pixel steps). */
export function pixCircle(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: string) {
  g.fillStyle = c;
  for (let dy = -r; dy <= r; dy += U) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) / U) * U;
    g.fillRect(Math.round(cx / U) * U - half, Math.round((cy + dy) / U) * U, half * 2, U);
  }
}
const artCache = new Map<string, HTMLCanvasElement>();
export function art(key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  let c = artCache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d')!); artCache.set(key, c); }
  return c;
}
export { artCache };

/** The colours a prop may borrow from the town's theme. */
interface Pal { leaf: [string, string, string]; trunk: string; sky: [string, string] }

type Sky = 'sun' | 'moon' | 'stars' | 'aurora' | 'smoke' | 'rift' | 'shooting' | 'gulls' | 'fish' | 'haze';
type Prop = 'oak' | 'bush' | 'beam' | 'cart' | 'willow' | 'lamp' | 'maple' | 'rocks' | 'deadlamp' | 'deadtree' | 'ember' | 'steam'
  | 'pine' | 'drift' | 'ribbons' | 'voidtree' | 'sheaf' | 'startree' | 'pillar' | 'chime' | 'fern' | 'root';
type Atmos = 'mist' | 'harbourfog' | 'soot' | 'heat' | 'chill' | 'none';
interface Scenery {
  sky: Sky[];
  /** The near/far rolling hills behind the path: draw the far row? */
  farHills: boolean;
  /** Big prop + small prop, alternating along the path. */
  props: [Prop, Prop];
  atmos: Atmos;
}

export const SCENERY: Record<string, Scenery> = {
  // "A quiet town at the edge of the hills" — sleepy hills, warm bread, a wishing well.
  Pocketvale: { sky: ['sun'], farHills: true, props: ['oak', 'bush'], atmos: 'none' },
  // "A smoky mountain town built around the deep iron mines" — soot, brass bells, songs underground.
  Ironmoor: { sky: ['haze', 'smoke'], farHills: false, props: ['beam', 'cart'], atmos: 'soot' },
  // "A sooty harbour where coal barges dock under weeping willows" — foghorns, lantern-light on black water.
  Coalhaven: { sky: ['smoke'], farHills: false, props: ['willow', 'lamp'], atmos: 'harbourfog' },
  // "Windswept sea cliffs, red maples and a lighthouse that never sleeps".
  Bluecliff: { sky: ['sun', 'gulls'], farHills: false, props: ['maple', 'rocks'], atmos: 'none' },
  // "A misty island town where every lantern went dark at once" — fog, silver moonlight, a bell tower.
  Lunaria: { sky: ['moon', 'stars'], farHills: false, props: ['deadtree', 'deadlamp'], atmos: 'mist' },
  // "A warm village on a sleepy volcano — hot springs, glowing goats and the Ash Market".
  Cinderpeak: { sky: ['haze'], farHills: false, props: ['ember', 'steam'], atmos: 'heat' },
  // "A snowed-in mountain hamlet where everyone sings to keep warm".
  Frosthold: { sky: ['aurora'], farHills: false, props: ['pine', 'drift'], atmos: 'chill' },
  // "A rope-bridge town on the rim of a chasm full of stars".
  Voidreach: { sky: ['stars'], farHills: false, props: ['voidtree', 'ribbons'], atmos: 'none' },
  // "A farming village inside the crater where a star fell. It hums."
  'Starfall Crater': { sky: ['stars', 'shooting'], farHills: false, props: ['startree', 'sheaf'], atmos: 'none' },
  // "Towers above the clouds, joined by little bridges. Fish swim through the air and the wind plays chimes".
  'Celestine Spires': { sky: ['sun', 'fish'], farHills: false, props: ['pillar', 'chime'], atmos: 'none' },
  // "Where the world began — giant ferns, the Worldtree, and a crack in the sky that hums the first song".
  'Primordial Rift': { sky: ['rift'], farHills: false, props: ['fern', 'root'], atmos: 'none' },
};
export const sceneryOf = (region: string) => SCENERY[region] ?? SCENERY.Pocketvale;

// ----- Sky extras (screen space, behind everything) -----
export function drawSky(g: CanvasRenderingContext2D, region: string, t: number, cam: number, top: number, side: number, viewW: number) {
  const s = sceneryOf(region);
  const skyTop = -top, skyBot = GROUND - 200;
  for (const k of s.sky) {
    if (k === 'stars') {
      for (let i = 0; i < 60; i++) {
        const x = -side + hash(i * 3.3) * (viewW + 2 * side) - cam * 0.02;
        const xx = ((x + side) % (viewW + 2 * side) + (viewW + 2 * side)) % (viewW + 2 * side) - side;
        const y = skyTop + hash(i * 7.1) * (skyBot - skyTop);
        g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t / 700 + i * 1.3));
        g.fillStyle = i % 5 === 0 ? '#fde68a' : '#eef2ff';
        g.fillRect(Math.round(xx), Math.round(y), i % 7 === 0 ? 3 : 2, i % 7 === 0 ? 3 : 2);
      }
      g.globalAlpha = 1;
    } else if (k === 'sun' || k === 'moon') {
      const x = viewW * 0.76 - cam * 0.01, y = skyTop * 0.55 + 40;
      const moon = k === 'moon';
      g.globalAlpha = moon ? 0.18 : 0.22; pixCircle(g, x, y, moon ? 66 : 54, moon ? '#c7d2fe' : '#fff7d6');
      g.globalAlpha = moon ? 0.25 : 0.3; pixCircle(g, x, y, moon ? 48 : 40, moon ? '#e0e7ff' : '#fffbe8');
      g.globalAlpha = 1; pixCircle(g, x, y, moon ? 36 : 27, moon ? '#eef2ff' : '#fffbe0');
      if (moon) { pixCircle(g, x - 9, y - 6, 7, '#c7d2fe'); pixCircle(g, x + 12, y + 9, 5, '#c7d2fe'); pixCircle(g, x + 3, y - 15, 3, '#d4dbfb'); }
    } else if (k === 'aurora') {
      for (let band = 0; band < 3; band++) for (let x = -side; x < viewW + side; x += U) {
        const wx = x + cam * 0.05;
        const y = skyTop * 0.4 + 30 + band * 26 + Math.sin(wx / 70 + t / 2400 + band) * 22 + Math.sin(wx / 23 + t / 1300) * 6;
        g.globalAlpha = 0.18 + 0.12 * Math.sin(wx / 40 + t / 900 + band * 2);
        g.fillStyle = band === 1 ? '#f472b6' : '#86efac';
        g.fillRect(x, Math.round(y / U) * U, U, 24 + band * 6);
      }
      g.globalAlpha = 1;
    } else if (k === 'smoke') {
      for (let i = 0; i < 7; i++) {
        const span = viewW + 2 * side + 300;
        const x = ((hash(i) * span + t * 0.008 - cam * 0.06) % span + span) % span - side - 150;
        const y = skyTop + 20 + hash(i * 5) * (skyBot - skyTop - 40);
        g.globalAlpha = 0.16; g.fillStyle = '#2b2b30';
        g.fillRect(Math.round(x / U) * U, Math.round(y / U) * U, 120 + hash(i * 2) * 120, 9);
        g.fillRect(Math.round((x + 24) / U) * U, Math.round((y - 6) / U) * U, 70 + hash(i * 3) * 60, 6);
      }
      g.globalAlpha = 1;
    } else if (k === 'haze') {
      const gr = g.createLinearGradient(0, skyTop, 0, GROUND);
      const c = region === 'Cinderpeak' ? '251,146,60' : '120,113,108';
      gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(1, `rgba(${c},0.28)`);
      g.fillStyle = gr; g.fillRect(-side, skyTop, viewW + 2 * side, GROUND - skyTop);
    } else if (k === 'rift') {
      const crack = art('riftcrack', 720, 90, (c) => {
        let y = 45;
        for (let x = 0; x < 720; x += U) {
          y = Math.max(15, Math.min(75, y + (hash(x * 0.7) < 0.5 ? -U : U) * (hash(x * 1.3) < 0.3 ? 2 : 1)));
          c.fillStyle = 'rgba(190,242,100,0.25)'; c.fillRect(x, y - 9, U, 21);
          c.fillStyle = '#d9f99d'; c.fillRect(x, y - 3, U, 9);
          c.fillStyle = '#ffffff'; c.fillRect(x, y, U, 3);
        }
      });
      g.globalAlpha = 0.75 + 0.25 * Math.sin(t / 500);
      const x0 = ((-cam * 0.03) % 720 + 720) % 720 - 720 - side;
      for (let x = x0; x < viewW + side; x += 720) g.drawImage(crack, Math.round(x), Math.round(skyTop * 0.5 + 10));
      g.globalAlpha = 1;
    } else if (k === 'shooting') {
      const k2 = (t % 5200) / 900;
      if (k2 < 1) {
        const n = Math.floor(t / 5200);
        const x = viewW * (0.2 + hash(n) * 0.7) - k2 * 140, y = skyTop * 0.5 + 20 + hash(n * 3) * 80 + k2 * 70;
        for (let i = 0; i < 10; i++) { g.globalAlpha = (1 - i / 10) * (1 - k2); g.fillStyle = '#fff7d6'; g.fillRect(Math.round(x + i * 9), Math.round(y - i * 4.5), 3, 3); }
        g.globalAlpha = 1;
      }
    } else if (k === 'gulls' || k === 'fish') {
      for (let i = 0; i < (k === 'fish' ? 4 : 3); i++) {
        const span = viewW + 2 * side + 120;
        const x = ((hash(i * 4) * span + t * (0.02 + hash(i) * 0.02) * (k === 'fish' ? -1 : 1) - cam * 0.1) % span + span) % span - side - 60;
        const y = skyTop * 0.3 + 60 + hash(i * 9) * 140 + Math.sin(t / 600 + i * 2) * 6;
        if (k === 'gulls') {
          const flap = Math.sin(t / 160 + i * 3) > 0 ? 0 : U;
          g.fillStyle = '#f8fafc';
          g.fillRect(x, y + flap, 6, U); g.fillRect(x + 6, y, 3, U); g.fillRect(x + 9, y + flap, 6, U);
        } else {
          g.fillStyle = '#f59e0b'; g.fillRect(x, y, 12, 6); g.fillStyle = '#fbbf24'; g.fillRect(x + 12, y - 3, 6, 12);
          g.fillStyle = '#fde68a'; g.fillRect(x + 3, y, 6, 3); g.fillStyle = '#1f2937'; g.fillRect(x + 2, y + 1, 2, 2);
        }
      }
    }
  }
}

// ----- The far-off view: a 540-wide tile, bottom 60 px above the path, drifting slowly behind the near hills -----
const FW = 540, FH = 340;
type Px = (x: number, y: number, w: number, h: number, c: string) => void;
const pxOn = (g: CanvasRenderingContext2D): Px => (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x / U) * U, Math.round(y / U) * U, Math.max(U, Math.round(w / U) * U), Math.max(U, Math.round(h / U) * U)); };
/** A gabled house: walls, roof steps, windows lit or dark, optional chimney. */
function house(px: Px, x: number, y: number, w: number, wall: string, roof: string, win: string, chimney = true) {
  px(x, y, w, 27, wall);
  for (let i = 0; i < Math.ceil(w / 6) + 1; i++) px(x - 3 + i * 3, y - 3 - i * 3, w + 6 - i * 6, 3, roof);
  px(x + 6, y + 9, 6, 6, win); px(x + w - 12, y + 9, 6, 6, win);
  if (chimney) px(x + w - 9, y - 21, 6, 15, '#3f3a33');
}

const FAR: Record<string, (px: Px, g: CanvasRenderingContext2D) => void> = {
  Pocketvale: (px) => {
    for (let x = 0; x < FW; x += U) { const top = 250 + Math.sin(x / 70) * 14 + Math.sin(x / 23) * 4; px(x, top, U, FH - top, '#6aa88c'); }
    for (const [x, y] of [[70, 238], [110, 244], [300, 232], [345, 240]] as const) house(px, x, y, 27, '#f3e8d0', '#b4442c', '#fbbf24', false);
    // a windmill on the hill
    px(450, 196, 15, 54, '#e7dcc4'); for (let i = 0; i < 4; i++) px(447 + i * 3, 190 - i * 3, 21 - i * 6, 3, '#8a4a2a');
    for (let i = 0; i < 9; i++) { px(457 + i * 4, 196 - i * 4, 4, 4, '#d6cbb0'); px(457 - i * 4, 196 - i * 4, 4, 4, '#d6cbb0'); px(457 + i * 4, 196 + i * 4, 4, 4, '#d6cbb0'); px(457 - i * 4, 196 + i * 4, 4, 4, '#d6cbb0'); }
  },
  Ironmoor: (px) => {
    for (let x = 0; x < FW; x += U) {
      const h = 60 + Math.abs(Math.sin(x / 60)) * 90 + Math.sin(x / 13) * 9;
      px(x, h, U, FH - h, '#4b4a52');
      if (Math.abs(Math.sin(x / 60)) < 0.18) px(x, h, U, 12, '#e5e7eb');
      const h2 = 170 + Math.abs(Math.sin(x / 41 + 1)) * 50;
      px(x, h2, U, FH - h2, '#3b3a40');
    }
    // the mine mouth with timber beams and a lamp
    px(330, 228, 66, 60, '#141317'); px(321, 219, 84, 12, '#6b4a2c'); px(321, 219, 12, 69, '#6b4a2c'); px(393, 219, 12, 69, '#6b4a2c');
    px(360, 234, 6, 9, '#fbbf24');
    for (let x = 300; x < 430; x += 12) px(x, 288, 6, 3, '#6b4a2c');
    px(290, 285, 150, 3, '#8b949c'); px(290, 291, 150, 3, '#8b949c');
    house(px, 70, 258, 36, '#6b6458', '#57534e', '#fbbf24'); house(px, 140, 266, 30, '#5f584d', '#4a4540', '#fbbf24'); house(px, 470, 262, 33, '#6b6458', '#57534e', '#fbbf24');
    px(0, 290, FW, 50, '#2e2a26');
  },
  Coalhaven: (px) => {
    for (let x = 0; x < 240; x += U) { const h = 170 + x * 0.35 + Math.sin(x / 15) * 6; px(x, h, U, FH - h, '#3d4035'); }
    house(px, 40, 184, 30, '#5b524a', '#7f1d1d', '#fbbf24'); house(px, 100, 206, 36, '#5b524a', '#334155', '#fbbf24'); house(px, 170, 222, 27, '#544a42', '#7f1d1d', '#fbbf24');
    // the quay and the black water
    px(0, 258, FW, 18, '#4b4640');
    for (let x = 0; x < FW; x += 18) px(x, 258, 15, 3, '#5c564e');
    for (let y = 276; y < FH; y += U) px(0, y, FW, U, y % 12 === 0 ? '#2c4a57' : '#1b3440');
    // a coal barge
    px(300, 276, 120, 18, '#3b2a1c'); px(294, 273, 132, 6, '#5e4329'); for (let i = 0; i < 9; i++) px(306 + i * 12, 264 - (i % 3) * 3, 12, 9, '#18181b');
    px(400, 228, 3, 48, '#3b2a1c'); px(403, 231, 21, 24, 'rgba(229,222,207,0.5)');
    // lantern posts and their reflections
    for (const x of [230, 470]) {
      px(x, 222, 3, 36, '#1f1d1b'); px(x - 3, 213, 9, 9, '#fcd34d'); px(x - 12, 204, 27, 27, 'rgba(252,211,77,0.15)');
      for (let y = 282; y < 330; y += 9) px(x - 3 + (y % 2) * 3, y, 9, 3, 'rgba(252,211,77,0.35)');
    }
  },
  Bluecliff: (px, g) => {
    for (let y = 190; y < FH; y += U) px(0, y, FW, U, y % 15 === 0 ? '#2b7aa6' : '#22688f');
    for (let i = 0; i < 50; i++) px(hash(i) * FW, 195 + hash(i * 3) * 140, 6 + hash(i * 5) * 9, U, '#d6f0fb');
    // the dark island nobody visits (Lunaria), no lights
    px(60, 178, 78, 12, '#2c3440'); px(78, 169, 42, 9, '#2c3440'); px(93, 157, 6, 12, '#2c3440');
    // the cliff on the right with grass and white cottages
    for (let x = 330; x < FW; x += U) { const top = 150 + Math.max(0, 400 - x) * 0.9 + Math.sin(x / 12) * 4; px(x, top, U, FH - top, (x / U) % 7 === 0 ? '#3b5878' : '#46607e'); px(x, top - 3, U, 6, '#6f9a4a'); }
    for (const x of [420, 444]) { px(x, 132, 18, 15, '#f1f5f9'); px(x - 3, 126, 24, 6, '#1d4ed8'); px(x + 6, 138, 6, 9, '#7c4a24'); }
    // the lighthouse that never sleeps, its beam toward the island
    px(486, 54, 18, 96, '#f8fafc'); for (let y = 60; y < 150; y += 18) px(486, y, 18, 9, '#dc2626');
    px(483, 45, 24, 9, '#1e293b'); px(486, 36, 18, 9, '#fde68a'); px(489, 27, 12, 9, '#1e293b');
    g.fillStyle = 'rgba(253,230,138,0.2)'; g.beginPath(); g.moveTo(486, 40); g.lineTo(110, 150); g.lineTo(110, 176); g.closePath(); g.fill();
  },
  Lunaria: (px) => {
    for (let x = 0; x < FW; x += U) { const top = 236 + Math.sin(x / 50) * 6; px(x, top, U, FH - top, '#2a2f45'); }
    // dark houses — every lantern out
    for (const [x, y, w] of [[30, 214, 33], [90, 208, 39], [150, 218, 30], [300, 210, 36], [360, 216, 30]] as const) house(px, x, y, w, '#3a3f5c', '#262a40', '#14172a');
    // the bell tower, its bell silent
    px(220, 70, 36, 170, '#2b2f45'); px(214, 64, 48, 9, '#1e2135'); px(226, 40, 24, 24, '#2b2f45'); px(235, 22, 6, 18, '#1e2135');
    px(229, 88, 18, 21, '#565b78'); px(226, 106, 24, 3, '#6b7090');
    for (let y = 130; y < 230; y += 24) px(232, y, 12, 12, '#14172a');
    // the still silver sea with the moon's path
    for (let y = 266; y < FH; y += U) px(0, y, FW, U, y % 12 === 0 ? '#3d4a70' : '#33405f');
    for (let i = 0; i < 6; i++) px(390 + i * 6, 272 + i * 12, 60 - i * 9, U, '#c7d2fe');
    // the seven dark Moonlanterns on the shore
    for (let k = 0; k < 7; k++) { const x = 20 + k * 76; px(x, 234, 3, 30, '#1e2135'); px(x - 3, 228, 9, 9, '#4b5070'); }
  },
  Cinderpeak: (px) => {
    for (let y = 40; y < FH; y += U) { const half = (y - 40) * 0.95 + 15; px(270 - half, y, half * 2, U, (y / U) % 5 === 0 ? '#3b2a26' : '#4a332d'); }
    px(252, 36, 36, 9, '#f97316'); px(258, 33, 24, 6, '#fde047'); px(246, 45, 48, 3, '#7c2d12');
    for (let y = 48; y < 260; y += U) { px(262 - (y - 48) * 0.32, y, U, U, '#c2410c'); if (y > 80) px(284 + (y - 80) * 0.4, y, U, U, '#ea580c'); }
    // Ash Market stalls and stone houses with glowing windows
    for (let x = 0; x < FW; x += U) { const top = 268 + Math.sin(x / 30) * 5; px(x, top, U, FH - top, '#5b4038'); }
    for (const [x, c] of [[40, '#b45309'], [100, '#9a3412'], [430, '#b45309']] as const) {
      px(x, 250, 33, 18, '#8a6a52'); px(x - 3, 241, 39, 9, c); for (let i = 0; i < 39; i += 6) px(x - 3 + i, 241, 3, 9, '#f5e6d3');
    }
    for (const x of [170, 360, 490]) { px(x, 246, 24, 24, '#7c6a5e'); px(x - 3, 240, 30, 6, '#3f2f2a'); px(x + 6, 252, 6, 6, '#fdba74'); }
    // hot spring steam
    for (let i = 0; i < 6; i++) px(330 + i * 12, 220 - (i % 3) * 9, 6, 12, 'rgba(245,245,244,0.3)');
  },
  Frosthold: (px) => {
    const peak = (cx: number, top: number, w: number) => {
      for (let y = top; y < FH; y += U) { const half = (y - top) * w; px(cx - half, y, half * 2 + U, U, y - top < 30 ? '#f8fafc' : (y / U) % 4 === 0 ? '#64748b' : '#7c8ba1'); }
    };
    peak(90, 70, 0.95); peak(400, 40, 0.85); peak(250, 110, 1.05);
    for (let x = 0; x < FW; x += U) { const top = 250 + Math.sin(x / 40) * 8; px(x, top, U, FH - top, '#e8eef5'); }
    // round huts with snowy roofs, warm windows, the Stew Hall glowing
    for (const [x, y] of [[50, 232], [140, 238], [430, 230]] as const) {
      px(x, y, 33, 24, '#8b5e3c'); for (let i = 0; i < 4; i++) px(x - 3 + i * 3, y - 3 - i * 3, 39 - i * 6, 3, '#f8fafc');
      px(x + 6, y + 6, 6, 6, '#fde68a'); px(x + 24, y - 15, 6, 9, '#57534e');
    }
    px(250, 226, 84, 30, '#6b4226'); for (let i = 0; i < 6; i++) px(247 + i * 3, 223 - i * 3, 90 - i * 6, 3, '#f8fafc');
    px(285, 238, 15, 18, '#fbbf24'); px(259, 235, 9, 9, '#fde68a'); px(316, 235, 9, 9, '#fde68a');
    for (const x of [20, 210, 360, 510]) for (let k = 0; k < 6; k++) { px(x - k * 3, 200 + k * 6, k * 6 + 3, 6, k % 2 ? '#1e4d4a' : '#2a5f5a'); if (k % 2 === 0) px(x - k * 3, 200 + k * 6, k * 6 + 3, 3, '#f1f5f9'); }
  },
  Voidreach: (px) => {
    // two cliff edges and the chasm full of stars between them
    for (let y = 150; y < FH; y += U) {
      const left = 170 + Math.sin(y / 15) * 6 - Math.max(0, (y - 280) * 0.5), right = 370 - Math.sin(y / 18) * 6 + Math.max(0, (y - 280) * 0.5);
      px(0, y, left, U, (y / U) % 5 === 0 ? '#3f3a52' : '#4a4560'); px(right, y, FW - right, U, (y / U) % 5 === 0 ? '#3f3a52' : '#4a4560');
      px(left, y, right - left, U, '#0b0820');
    }
    for (let i = 0; i < 90; i++) px(180 + hash(i) * 180, 160 + hash(i * 2) * 180, U, U, ['#f5f3ff', '#c4b5fd', '#fde68a', '#a5b4fc'][i % 4]);
    // rope bridges with ribbons
    for (const y of [186, 246]) {
      for (let x = 165; x < 376; x += U) px(x, y + Math.sin(((x - 165) / 211) * Math.PI) * 12, U, U, '#a16207');
      for (let x = 171; x < 370; x += 12) px(x, y - 9 + Math.sin(((x - 165) / 211) * Math.PI) * 12, U, 9, '#713f12');
      for (let x = 180; x < 366; x += 21) px(x, y - 12 + Math.sin(((x - 165) / 211) * Math.PI) * 12, U, 9, ['#f472b6', '#fde047', '#38bdf8', '#4ade80'][Math.floor(x / 21) % 4]);
    }
    // little houses on stilts at the edges
    for (const [x, y, c] of [[30, 130, '#5b4a7a'], [100, 136, '#4c3d6b'], [420, 132, '#5b4a7a'], [490, 138, '#4c3d6b']] as const) {
      px(x, y, 30, 21, c); for (let i = 0; i < 4; i++) px(x - 3 + i * 3, y - 3 - i * 3, 36 - i * 6, 3, '#312e81');
      px(x + 9, y + 6, 6, 6, '#fde68a'); px(x + 3, y + 21, 3, 15, '#3b2a1c'); px(x + 24, y + 21, 3, 15, '#3b2a1c');
    }
  },
  'Starfall Crater': (px, g) => {
    for (let x = 0; x < FW; x += U) { const top = 200 + Math.abs(x - 270) * -0.12 + 30 + Math.sin(x / 33) * 4; px(x, top, U, FH - top, '#8a6a3e'); }
    for (let y = 250; y < FH; y += U) { const half = Math.min(270, 120 + (y - 250) * 2.4); px(270 - half, y, half * 2, U, '#a8853f'); }
    for (let ring = 0; ring < 4; ring++) for (let a = 0; a < 120; a++) {
      const t = (a / 120) * Math.PI * 2, rx = 70 + ring * 45;
      px(270 + Math.cos(t) * rx, 300 + Math.sin(t) * rx * 0.18, U, U, ring % 2 ? '#e2b84a' : '#c99a2e');
    }
    // the Stargrown Elder with the star glowing in its roots
    px(258, 170, 24, 120, '#5b3a22'); px(240, 282, 60, 9, '#5b3a22');
    for (const [x, y, r] of [[270, 140, 48], [222, 160, 33], [318, 160, 33], [246, 112, 30], [294, 112, 30]]) pixCircle(g, x, y + 6, r, '#3f6212');
    for (const [x, y, r] of [[270, 140, 48], [222, 160, 33], [318, 160, 33], [246, 112, 30], [294, 112, 30]]) pixCircle(g, x - 3, y, r - 6, '#65a30d');
    for (let k = 0; k < 20; k++) px(196 + hash(k * 5) * 150, 104 + hash(k * 7) * 74, U, U, '#fef08a');
    px(258, 276, 24, 15, '#fde047'); px(246, 264, 48, 36, 'rgba(253,224,71,0.25)'); px(232, 252, 78, 60, 'rgba(253,224,71,0.1)');
    px(30, 210, 39, 27, '#b45309'); for (let i = 0; i < 5; i++) px(27 + i * 3, 207 - i * 3, 45 - i * 6, 3, '#7c2d12');
    px(470, 206, 36, 27, '#e7e5e4'); for (let i = 0; i < 5; i++) px(467 + i * 3, 203 - i * 3, 42 - i * 6, 3, '#57534e');
  },
  'Celestine Spires': (px) => {
    const tower = (x: number, top: number, w: number) => {
      px(x, top, w, FH - top, '#e7e2d6'); for (let y = top; y < FH; y += 12) px(x, y, w, U, '#d6cfbf');
      for (let i = 0; i < Math.ceil(w / 6) + 3; i++) px(x + w / 2 - i * 3, top - 27 + i * 3, i * 6 + U, U, '#14b8a6');
      for (let y = top + 18; y < FH - 40; y += 36) px(x + w / 2 - 3, y, 6, 9, '#fde68a');
    };
    tower(40, 110, 24); tower(150, 50, 30); tower(330, 90, 27); tower(460, 140, 24);
    for (let x = 64; x < 150; x += U) px(x, 170 + Math.sin(((x - 64) / 86) * Math.PI) * 6, U, U, '#92400e');
    for (let x = 180; x < 330; x += U) px(x, 200 + Math.sin(((x - 180) / 150) * Math.PI) * 9, U, U, '#92400e');
    for (const x of [106, 255]) { px(x, 178, U, 9, '#a8a29e'); for (let k = 0; k < 3; k++) px(x - 3 + k * 3, 188, U, 6 + k * 3, '#5eead4'); }
    // the sea of clouds below
    for (let i = 0; i < 30; i++) { const x = hash(i) * FW - 20, y = 270 + hash(i * 2) * 50; px(x, y, 50 + hash(i * 3) * 40, 15, i % 3 ? '#ffffff' : '#e0f2fe'); }
    px(0, 310, FW, 30, '#f8fafc');
  },
  'Primordial Rift': (px, g) => {
    const haze = ['#3f6e45', '#3a6640', '#345d3a', '#2f5434', '#2a4b2f'];
    for (let y = 180; y < FH; y += U) px(0, y, FW, U, haze[Math.min(4, Math.floor((y - 180) / 32))]);
    for (let i = 0; i < 40; i++) { const x = hash(i) * FW, h = 20 + hash(i * 2) * 40; px(x, 230 + hash(i * 3) * 60 - h, 9, h, ['#24442a', '#2b4f30', '#1f3d25'][i % 3]); }
    // the Worldtree: an enormous trunk holding up the sky
    px(230, 0, 78, FH, '#3f2a1a');
    for (let y = 6; y < FH; y += 18) px(240 + (y % 36 ? 9 : 30), y, 9, 12, '#2a1c12');
    const crown = [[270, 30, 60], [180, 50, 45], [360, 50, 45], [110, 70, 33], [430, 70, 33], [225, 10, 40], [315, 10, 40]];
    for (const [x, y, r] of crown) pixCircle(g, x, y + 9, r, '#14532d');
    for (const [x, y, r] of crown) pixCircle(g, x - 3, y, r - 9, '#15803d');
    for (let k = 0; k < 24; k++) pixCircle(g, 100 + hash(k) * 340, hash(k * 2) * 80, 6, '#4d7c0f');
    for (const [dx, len] of [[-1, 60], [1, 66], [-1, 30], [1, 36]] as const) for (let i = 0; i < len; i += 2) px(269 + dx * (39 + i * 2), 300 + i * 0.6, 6, 6, '#3f2a1a');
  },
};

export function drawFar(g: CanvasRenderingContext2D, region: string, t: number, cam: number, side: number, viewW: number) {
  const paint = FAR[region] ?? FAR.Pocketvale;
  const tile = art(`far:${region}`, FW, FH, (c) => paint(pxOn(c), c));
  const y = GROUND - 60 - FH;
  const x0 = ((-cam * 0.3) % FW + FW) % FW - FW - side;
  for (let x = x0; x < viewW + side; x += FW) {
    g.drawImage(tile, Math.round(x), y);
    // little animations on top of the far view
    if (region === 'Cinderpeak') for (let i = 0; i < 7; i++) {
      const k = ((t / 2600) + i / 7) % 1;
      g.globalAlpha = 0.5 * (1 - k); g.fillStyle = i % 3 === 0 ? '#fdba74' : '#a8a29e';
      pixCircle(g, x + 270 + Math.sin(k * 5 + i) * 12 + k * 40, y + 30 - k * 140, 9 + k * 24, g.fillStyle as string);
    }
    if (region === 'Bluecliff') {
      const on = 0.5 + 0.5 * Math.sin(t / 900);
      g.globalAlpha = 0.35 * on; pixCircle(g, x + 495, y + 40, 18, '#fde68a');
    }
    if (region === 'Ironmoor' || region === 'Coalhaven' || region === 'Frosthold') {
      const chim = region === 'Ironmoor' ? [[94, 237], [158, 245], [497, 241]] : region === 'Coalhaven' ? [[61, 163], [127, 185], [188, 201]] : [[77, 217], [167, 223], [457, 215]];
      for (const [cx, cy] of chim) for (let i = 0; i < 4; i++) {
        const k = ((t / 1800) + i / 4 + cx * 0.01) % 1;
        g.globalAlpha = 0.45 * (1 - k); pixCircle(g, x + cx + k * 15, y + cy - k * 50, 4 + k * 8, region === 'Frosthold' ? '#f1f5f9' : '#57534e');
      }
    }
    g.globalAlpha = 1;
  }
}

// ----- Props along the path -----
function leafyTree(t: Pal, v: number, leaf: [string, string, string], trunk: string, key: string) {
  return art(`tree:${key}:${v}`, 132, 150, (g) => {
    const cx = 66;
    g.fillStyle = trunk; g.fillRect(cx - 12, 84, 24, 66);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx + 3, 84, 9, 66); g.fillRect(cx - 9, 105, 3, 21);
    g.fillStyle = trunk; g.fillRect(cx - 21, 141, 9, 9); g.fillRect(cx + 12, 141, 9, 9);
    const blobs = v === 0 ? [[66, 54, 40], [34, 66, 26], [98, 66, 26], [50, 34, 24], [84, 34, 24]] : [[66, 60, 34], [40, 72, 22], [92, 72, 22], [66, 32, 24]];
    for (const [x, y, r] of blobs) pixCircle(g, x, y + 6, r, leaf[0]);
    for (const [x, y, r] of blobs) pixCircle(g, x - 3, y, r - 6, leaf[1]);
    for (let i = 0; i < 14; i++) pixCircle(g, 24 + hash(i + v * 30) * 84, 18 + hash(i * 3 + v) * 60, 6, leaf[2]);
    void t;
  });
}
/** A prop's picture (cached); drawn standing on the path. */
export function propArt(kind: Prop, t: Pal, v: number): HTMLCanvasElement {
  const P = (w: number, h: number, paint: (px: Px, g: CanvasRenderingContext2D) => void) => art(`prop:${kind}:${t.sky[0]}:${v}`, w, h, (g) => paint(pxOn(g), g));
  switch (kind) {
    case 'oak': case 'voidtree': return leafyTree(t, v, t.leaf, t.trunk, `${kind}${t.sky[0]}`);
    case 'maple': return leafyTree(t, v, ['#9a1f1f', '#dc2626', '#f59e0b'], '#5b3d22', 'maple');
    case 'ember': return leafyTree(t, v, ['#7c2d12', '#c2410c', '#fb923c'], '#3b2a1c', 'ember');
    case 'startree': return leafyTree(t, v, ['#4d7c0f', '#65a30d', '#fef08a'], '#5b3a22', 'star');
    case 'bush': return P(54, 30, (_px, g) => {
      for (const [x, y, r] of [[15, 21, 12], [30, 15, 15], [42, 21, 10]]) pixCircle(g, x, y + 3, r, t.leaf[0]);
      for (const [x, y, r] of [[15, 18, 9], [30, 12, 12], [42, 18, 7]]) pixCircle(g, x, y, r, t.leaf[1]);
      pixCircle(g, 27, 9, 4, t.leaf[2]);
    });
    case 'beam': return P(108, 138, (px) => {
      // a mine's timber frame with a hanging lamp
      px(9, 18, 15, 120, '#6b4a2c'); px(84, 18, 15, 120, '#6b4a2c'); px(0, 9, 108, 15, '#7a5634');
      px(12, 18, 3, 120, '#8a6440'); px(87, 18, 3, 120, '#8a6440'); px(0, 21, 108, 3, '#4a3220');
      px(51, 24, 3, 18, '#27272a'); px(45, 42, 15, 15, '#3f3f46'); px(48, 45, 9, 9, '#fbbf24');
      px(27, 27, 54, 54, 'rgba(251,191,36,0.07)');
    });
    case 'cart': return P(66, 45, (px) => {
      px(0, 39, 66, 3, '#8b949c'); px(6, 12, 54, 21, '#4b5563'); px(3, 9, 60, 6, '#6b7280');
      for (let i = 0; i < 6; i++) px(9 + i * 8, 3 + (i % 2) * 3, 9, 9, i % 3 ? '#78716c' : '#a8a29e');
      px(12, 33, 9, 9, '#1f2937'); px(45, 33, 9, 9, '#1f2937');
    });
    case 'willow': return P(132, 156, (px) => {
      px(57, 66, 18, 90, '#4a3b2a'); px(69, 66, 6, 90, '#3a2e20');
      for (let k = -60; k <= 60; k += U) {
        const top = 30 + Math.abs(k) * 0.4, len = 50 + hash(k + v * 9) * 60;
        px(66 + k, top, U, len, ['#6f8f3a', '#5c7a30', '#83a24a'][Math.floor(hash(k * 3 + v) * 3)]);
      }
      for (let k = -45; k <= 45; k += U) px(66 + k, 24 + Math.abs(k) * 0.3, U, 12, '#83a24a');
    });
    case 'lamp': return P(36, 120, (px) => {
      px(15, 21, 6, 99, '#1f1d1b'); px(9, 114, 18, 6, '#1f1d1b'); px(9, 9, 18, 15, '#292524'); px(12, 12, 12, 9, '#fcd34d');
      px(0, 0, 36, 36, 'rgba(252,211,77,0.15)');
    });
    case 'deadlamp': return P(36, 120, (px) => {
      px(15, 21, 6, 99, '#1e2135'); px(9, 114, 18, 6, '#1e2135'); px(9, 9, 18, 15, '#262a40'); px(12, 12, 12, 9, '#4b5070');
    });
    case 'deadtree': return P(120, 150, (px) => {
      px(54, 54, 15, 96, '#2e2a3a'); px(63, 54, 6, 96, '#24202e');
      for (const [x, y, dx, n] of [[60, 60, -1, 14], [63, 75, 1, 16], [60, 96, -1, 10], [63, 48, 1, 9], [60, 40, -1, 6]] as const)
        for (let i = 0; i < n; i++) px(x + dx * i * 3, y - i * 2.2, U, U, '#2e2a3a');
    });
    case 'rocks': return P(66, 36, (_px, g) => {
      pixCircle(g, 21, 24, 15, '#57616e'); pixCircle(g, 45, 27, 12, '#4b5563'); pixCircle(g, 18, 21, 9, '#6b7686'); pixCircle(g, 21, 15, 4, '#6f9a4a');
    });
    case 'steam': return P(60, 96, (px, g) => {
      for (let i = 0; i < 6; i++) pixCircle(g, 30 + Math.sin(i) * 6, 66 - i * 12, 6 + i, `rgba(245,245,244,${0.3 - i * 0.04})`);
      px(6, 78, 48, 18, '#6b5a50'); px(12, 81, 36, 9, '#4fb3b0'); px(15, 81, 30, 3, '#7dd3cf');
    });
    case 'pine': return P(96, 150, (px) => {
      for (let k = 0; k < 12; k++) {
        px(48 - k * 3.6, 6 + k * 10.5, k * 7.2 + 3, 12, k % 2 ? '#1e4d4a' : '#2a5f5a');
        if (k % 2 === 0) px(48 - k * 3.6, 6 + k * 10.5, k * 7.2 + 3, 3, '#f1f5f9');
      }
      px(42, 132, 12, 18, '#3b2a1c');
    });
    case 'drift': return P(72, 30, (_px, g) => {
      pixCircle(g, 21, 27, 18, '#cbd5e1'); pixCircle(g, 45, 27, 21, '#e2e8f0'); pixCircle(g, 30, 24, 15, '#f8fafc');
    });
    case 'ribbons': return P(48, 120, (px) => {
      px(21, 12, 6, 108, '#713f12'); px(15, 6, 18, 9, '#a16207');
      for (let i = 0; i < 4; i++) px(27, 18 + i * 12, 15 + (i % 2) * 6, 6, ['#f472b6', '#fde047', '#38bdf8', '#4ade80'][i]);
    });
    case 'sheaf': return P(60, 66, (px) => {
      for (let i = 0; i < 9; i++) { const x = 9 + i * 5; px(x, 18 + (i % 3) * 3, U, 48, '#c99a2e'); px(x - 3, 9 + (i % 3) * 3, 9, 15, '#e2b84a'); }
      px(6, 42, 48, 6, '#a16207');
    });
    case 'pillar': return P(60, 150, (px) => {
      px(15, 21, 30, 129, '#e7e2d6'); for (let y = 27; y < 150; y += 12) px(15, y, 30, U, '#d6cfbf');
      px(9, 12, 42, 12, '#f5f1e6'); px(6, 3, 48, 9, '#14b8a6'); px(24, 54, 12, 12, '#fde68a');
    });
    case 'chime': return P(42, 96, (px) => {
      px(18, 0, 6, 96, '#a8a29e'); px(3, 9, 36, 6, '#78716c');
      for (let k = 0; k < 4; k++) px(6 + k * 9, 15, U, 21 + k * 6, '#5eead4');
    });
    case 'fern': return P(120, 160, (px) => {
      for (const [x0, flip, h] of [[60, 1, 52], [54, -1, 44], [66, 1, 36]] as const)
        for (let i = 0; i < h; i++) {
          const cx = x0 + Math.sin((i / h) * 1.6) * 30 * flip, y = 156 - i * 3;
          px(cx, y, U, U, '#365314');
          if (i % 2 === 0) { px(cx - 15, y + 3, 15, U, '#4d7c0f'); px(cx + 3, y + 3, 15, U, '#65a30d'); }
        }
    });
    case 'root': return P(90, 42, (px) => {
      for (let i = 0; i < 30; i++) { px(i * 3, 30 - Math.sin(i / 30 * Math.PI) * 24, 9, 9, '#3f2a1a'); }
      px(27, 9, 6, 6, '#bef264');
    });
  }
}

/** 🌫️ The atmosphere in front of the scene (world space: x already includes the camera). */
export function drawAtmos(g: CanvasRenderingContext2D, region: string, t: number, cam: number, top: number, side: number, bottom: number, viewW: number) {
  const a = sceneryOf(region).atmos;
  if (a === 'none') return;
  const left = cam - side - 60, width = viewW + 2 * side + 120;
  if (a === 'mist' || a === 'harbourfog' || a === 'chill') {
    const thick = a === 'mist' ? 1 : 0.55;
    const col = a === 'chill' ? '241,245,249' : a === 'harbourfog' ? '186,196,204' : '203,213,225';
    // rolling banks of mist, drifting slowly across (Lunaria's are thick all the way up)
    const rows = a === 'mist' ? 9 : 4;
    for (let i = 0; i < rows; i++) {
      const y = a === 'mist' ? -top + 40 + (i / rows) * (GROUND + top - 10) : GROUND - 120 + i * 30;
      for (let j = 0; j < 4; j++) {
        const span = width + 400;
        const x = left - 200 + ((hash(i * 7 + j) * span + t * (0.01 + hash(i) * 0.012) * (i % 2 ? 1 : -1) - cam * 0.15) % span + span) % span;
        g.globalAlpha = (0.10 + 0.08 * Math.sin(t / 1500 + i + j)) * thick;
        g.fillStyle = `rgb(${col})`;
        g.fillRect(Math.round(x), Math.round(y), 200 + hash(i + j * 3) * 160, 18 + hash(j + i * 5) * 18);
        g.fillRect(Math.round(x + 30), Math.round(y - 9), 120, 12);
      }
    }
    const gr = g.createLinearGradient(0, GROUND - 90, 0, GROUND + 10);
    gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},${0.32 * thick})`);
    g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(left, GROUND - 90, width, 100);
  } else if (a === 'soot') {
    const gr = g.createLinearGradient(0, -top, 0, GROUND - 160);
    gr.addColorStop(0, 'rgba(28,25,23,0.45)'); gr.addColorStop(1, 'rgba(28,25,23,0)');
    g.fillStyle = gr; g.fillRect(left, -top, width, GROUND - 160 + top);
  } else if (a === 'heat') {
    const gr = g.createLinearGradient(0, GROUND - 140, 0, Math.max(GROUND + 20, bottom));
    gr.addColorStop(0, 'rgba(251,146,60,0)'); gr.addColorStop(1, `rgba(234,88,12,${0.16 + 0.05 * Math.sin(t / 700)})`);
    g.fillStyle = gr; g.fillRect(left, GROUND - 140, width, Math.max(160, bottom - GROUND + 140));
  }
  g.globalAlpha = 1;
}
