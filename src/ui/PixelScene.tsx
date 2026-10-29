// Pixel-art backdrops drawn in code at low resolution, then scaled up with crisp pixels.
// Our own art — no image files needed. Each scene is the same every time (seeded).
import { useEffect, useRef, useState } from 'react';

export type SceneName = 'forest' | 'town' | 'mine' | 'forge' | 'river' | 'camp' | 'kitchen' | 'workshop' | 'tower' | 'altar' | 'ironmoor' | 'coalhaven' | 'bluecliff'
  | 'lunaria' | 'lunaria_restored' | 'cinderpeak' | 'cinderpeak_stirring' | 'frosthold' | 'voidreach' | 'starfall' | 'celestine' | 'rift' | 'title';

const W = 72;
const H = 128;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Px = (x: number, y: number, w: number, h: number, c: string) => void;

function drawForest(px: Px, r: () => number) {
  px(0, 0, W, H, '#1d2b1e');
  for (let y = 0; y < 40; y += 2) px(0, y, W, 2, y < 20 ? '#2a3d2a' : '#24361f');
  // path
  for (let y = 70; y < H; y++) {
    const w = 8 + (y - 70) * 0.5;
    px(Math.round(W / 2 - w / 2), y, Math.round(w), 1, (y % 6 < 3) ? '#5c4a35' : '#544330');
  }
  // brick wall in the distance
  for (let y = 44; y < 70; y += 3) for (let x = (y % 6 ? 0 : 2); x < W; x += 5) px(x, y, 4, 2, r() > 0.5 ? '#4a3a32' : '#43342c');
  // trees
  for (let i = 0; i < 26; i++) {
    const cx = Math.floor(r() * W);
    const cy = Math.floor(r() < 0.5 ? r() * 40 : 90 + r() * 38);
    const size = 5 + Math.floor(r() * 7);
    const greens = ['#2f5a2a', '#3b6d31', '#264a23', '#4a7d3a'];
    for (let k = 0; k < 10; k++) {
      px(cx + Math.floor((r() - 0.5) * size * 1.6), cy + Math.floor((r() - 0.5) * size), 1 + Math.floor(r() * 4), 1 + Math.floor(r() * 3), greens[Math.floor(r() * greens.length)]);
    }
  }
}

function drawTown(px: Px, r: () => number) {
  // sky
  const sky = ['#e9b97a', '#efc68b', '#f3d39c', '#f5ddb0'];
  for (let y = 0; y < 60; y++) px(0, y, W, 1, sky[Math.min(3, Math.floor(y / 15))]);
  px(52, 10, 8, 8, '#fff1d0');
  px(51, 11, 10, 6, '#fff1d0');
  // hills
  for (let x = 0; x < W; x++) {
    const h1 = 48 + Math.round(Math.sin(x / 9) * 4);
    px(x, h1, 1, H - h1, '#7d9a5a');
    const h2 = 62 + Math.round(Math.sin(x / 6 + 2) * 3);
    px(x, h2, 1, H - h2, '#62803f');
  }
  // houses
  const house = (x: number, y: number, w: number, roof: string) => {
    px(x, y, w, 9, '#e3cfa6');
    px(x, y, w, 1, '#6b4a2b');
    for (let i = 0; i < Math.ceil(w / 2) + 1; i++) px(x - 1 + i, y - 1 - i, w + 2 - i * 2, 1, roof);
    px(x + Math.floor(w / 2) - 1, y + 5, 3, 4, '#5b3d22');
    px(x + 1, y + 2, 2, 2, '#f5c45e');
  };
  house(8, 60, 10, '#a8493a');
  house(28, 56, 14, '#8c5a3c');
  house(52, 61, 10, '#a8493a');
  // path & trees
  for (let y = 70; y < H; y++) px(33 - Math.floor((y - 70) / 6), y, 6 + Math.floor((y - 70) / 3), 1, '#c9ae7d');
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(r() * W);
    const y = 75 + Math.floor(r() * 50);
    if (Math.abs(x - 36) < 10) continue;
    px(x, y, 4, 3, '#3f6a32');
    px(x + 1, y - 1, 2, 1, '#4f7d3c');
    px(x + 1, y + 3, 1, 2, '#5b3d22');
  }
}

function drawMine(px: Px, r: () => number) {
  px(0, 0, W, H, '#1a1612');
  for (let i = 0; i < 500; i++) {
    const c = ['#2a231c', '#30281f', '#241e18', '#3a3026'][Math.floor(r() * 4)];
    px(Math.floor(r() * W), Math.floor(r() * H), 2 + Math.floor(r() * 3), 1 + Math.floor(r() * 2), c);
  }
  // support beams
  for (const x of [6, 64]) { px(x, 0, 3, H, '#4a3420'); px(x + 1, 0, 1, H, '#5e4329'); }
  px(0, 18, W, 3, '#4a3420');
  px(0, 19, W, 1, '#5e4329');
  // ore flecks
  const ores = ['#c8773f', '#aab6bd', '#8b949c', '#e9a46f'];
  for (let i = 0; i < 40; i++) px(Math.floor(r() * W), 22 + Math.floor(r() * (H - 22)), 1, 1, ores[Math.floor(r() * ores.length)]);
  // lanterns
  for (const x of [14, 56]) { px(x, 22, 3, 4, '#f2b84b'); px(x - 2, 21, 7, 7, 'rgba(242,184,75,0.12)'); }
  // rail tracks
  for (let y = 100; y < H; y += 4) px(20, y, 32, 1, '#5e4329');
  px(24, 100, 1, H - 100, '#7a7f84');
  px(47, 100, 1, H - 100, '#7a7f84');
}

function drawForge(px: Px, r: () => number) {
  px(0, 0, W, H, '#1c1512');
  // brick walls
  for (let y = 0; y < 90; y += 3) for (let x = (y % 6 ? -2 : 0); x < W; x += 6) px(x, y, 5, 2, r() > 0.5 ? '#3d2a22' : '#35241d');
  // furnace
  px(22, 30, 28, 34, '#2a1d17');
  px(24, 32, 24, 30, '#4a2a1c');
  px(28, 44, 16, 14, '#e8742c');
  px(30, 46, 12, 10, '#f5a742');
  px(33, 48, 6, 6, '#ffd77a');
  px(16, 20, 40, 60, 'rgba(245,140,60,0.06)');
  // shelves with tools
  px(2, 22, 14, 1, '#5e4329');
  px(56, 26, 14, 1, '#5e4329');
  for (let i = 0; i < 4; i++) px(3 + i * 3, 18, 2, 4, ['#8b949c', '#c99248', '#aab6bd', '#c8773f'][i]);
  // floor
  for (let y = 90; y < H; y += 3) for (let x = (y % 6 ? 0 : 3); x < W; x += 7) px(x, y, 6, 2, r() > 0.5 ? '#2c221c' : '#261d18');
  // anvil
  px(26, 96, 20, 4, '#4a5157');
  px(30, 100, 12, 4, '#3a4045');
  px(27, 104, 18, 3, '#4a5157');
}

function drawRiver(px: Px, r: () => number) {
  const sky = ['#c98b5a', '#d9a06a', '#e5b884'];
  for (let y = 0; y < 30; y++) px(0, y, W, 1, sky[Math.min(2, Math.floor(y / 10))]);
  px(0, 30, W, 18, '#4f6b3a');
  for (let i = 0; i < 30; i++) px(Math.floor(r() * W), 30 + Math.floor(r() * 16), 3, 2, ['#5d7f45', '#3f5a2e'][Math.floor(r() * 2)]);
  for (let y = 48; y < 104; y++) px(0, y, W, 1, y % 5 === 0 ? '#3d6f86' : '#2f5a70');
  for (let i = 0; i < 60; i++) px(Math.floor(r() * W), 48 + Math.floor(r() * 56), 3 + Math.floor(r() * 4), 1, '#6aa2b8');
  px(0, 104, W, H - 104, '#6b5a3f');
  for (let i = 0; i < 40; i++) px(Math.floor(r() * W), 104 + Math.floor(r() * 24), 2, 1, '#57472f');
  // reeds & a dock
  for (let i = 0; i < 12; i++) { const x = Math.floor(r() * W); px(x, 96, 1, 10, '#6d8f3c'); px(x, 95, 1, 2, '#8a5a2b'); }
  px(44, 92, 28, 4, '#7a5a3a');
  for (const x of [46, 56, 66]) px(x, 96, 2, 10, '#5e4329');
}

function drawCamp(px: Px, r: () => number) {
  px(0, 0, W, H, '#10131f');
  for (let i = 0; i < 40; i++) px(Math.floor(r() * W), Math.floor(r() * 60), 1, 1, r() > 0.7 ? '#fff7d6' : '#8b93b8');
  px(56, 10, 6, 6, '#f1ead2');
  for (let x = 0; x < W; x++) { const h = 62 + Math.round(Math.sin(x / 7) * 3); px(x, h, 1, H - h, '#1c2a1e'); }
  for (let i = 0; i < 10; i++) { const x = Math.floor(r() * W); px(x, 50, 3, 14, '#142017'); px(x - 2, 46, 7, 6, '#18261b'); }
  px(0, 96, W, H - 96, '#2a2119');
  // glow & fire ring
  px(16, 80, 40, 40, 'rgba(249,115,22,0.10)');
  px(24, 88, 24, 24, 'rgba(249,115,22,0.12)');
  for (let i = 0; i < 8; i++) px(22 + i * 4, 108, 3, 2, '#6b645a');
}

function drawKitchen(px: Px, r: () => number) {
  px(0, 0, W, H, '#1f1712');
  for (let y = 0; y < 70; y += 4) for (let x = (y % 8 ? 0 : 4); x < W; x += 8) px(x, y, 7, 3, r() > 0.5 ? '#3b2a20' : '#34251c');
  // shelves with jars
  for (const y of [18, 36]) {
    px(4, y, 64, 2, '#6b4a2b');
    for (let x = 6; x < 66; x += 7) px(x, y - 5, 4, 5, ['#8fb37a', '#c9a24a', '#a8493a', '#7aa6b8'][Math.floor(r() * 4)]);
  }
  // stove
  px(18, 70, 36, 30, '#2b2622');
  px(22, 74, 28, 6, '#3d3631');
  px(24, 86, 24, 10, '#e8742c');
  px(26, 88, 20, 6, '#f5a742');
  px(0, 100, W, H - 100, '#2a201a');
  for (let y = 100; y < H; y += 4) for (let x = (y % 8 ? 0 : 5); x < W; x += 10) px(x, y, 9, 3, '#33271f');
}

function drawWorkshop(px: Px, r: () => number) {
  px(0, 0, W, H, '#1d1813');
  for (let x = 0; x < W; x += 6) px(x, 0, 5, 90, r() > 0.5 ? '#3a2b1f' : '#33261b');
  // pegboard tools
  px(8, 14, 56, 30, '#4a3826');
  for (let i = 0; i < 6; i++) { const x = 12 + i * 9; px(x, 18, 2, 14, '#8a8278'); px(x - 1, 18, 4, 3, '#a8743f'); }
  // window
  px(26, 50, 20, 16, '#6aa2b8');
  px(35, 50, 2, 16, '#3a2b1f');
  px(26, 57, 20, 2, '#3a2b1f');
  // workbench
  px(6, 88, 60, 6, '#7d5a36');
  px(8, 94, 4, 20, '#5e4329');
  px(60, 94, 4, 20, '#5e4329');
  for (let i = 0; i < 10; i++) px(10 + Math.floor(r() * 50), 86, 2, 2, '#d6a66b');
  px(0, 114, W, H - 114, '#2a2119');
}

function drawTower(px: Px, r: () => number) {
  px(0, 0, W, H, '#130f1f');
  for (let y = 0; y < H; y += 4) for (let x = (y % 8 ? 0 : 4); x < W; x += 8) px(x, y, 7, 3, r() > 0.5 ? '#221a35' : '#1c162d');
  // glowing runes
  const runes = ['#a78bfa', '#818cf8', '#c4b5fd'];
  for (let i = 0; i < 18; i++) { const x = Math.floor(r() * W); const y = Math.floor(r() * 90); px(x, y, 2, 2, runes[Math.floor(r() * 3)]); px(x - 1, y - 1, 4, 4, 'rgba(167,139,250,0.12)'); }
  // magic circle on the floor
  px(12, 100, 48, 2, '#6d5bd0');
  px(18, 96, 36, 2, '#6d5bd0');
  px(18, 106, 36, 2, '#6d5bd0');
  px(10, 92, 52, 20, 'rgba(129,140,248,0.08)');
  px(0, 112, W, H - 112, '#1a1428');
}

function drawAltar(px: Px, r: () => number) {
  px(0, 0, W, H, '#0f1320');
  for (let i = 0; i < 50; i++) px(Math.floor(r() * W), Math.floor(r() * 70), 1, 1, r() > 0.6 ? '#e0e7ff' : '#6366f1');
  // standing stones
  for (const x of [6, 20, 46, 60]) { px(x, 50, 7, 40, '#4b5563'); px(x + 1, 50, 5, 2, '#6b7280'); px(x + 2, 60, 3, 3, ['#7dd3fc', '#3b82f6', '#84cc16', '#f97316'][Math.floor(r() * 4)]); }
  px(0, 90, W, H - 90, '#1f2937');
  for (let y = 90; y < H; y += 4) for (let x = (y % 8 ? 0 : 4); x < W; x += 9) px(x, y, 8, 3, '#273244');
  // altar & glow
  px(22, 96, 28, 10, '#6b7280');
  px(24, 94, 24, 3, '#9ca3af');
  px(14, 80, 44, 30, 'rgba(129,140,248,0.10)');
  px(30, 86, 12, 8, 'rgba(199,210,254,0.35)');
}

function drawIronmoor(px: Px, r: () => number) {
  // dusky sky
  const sky = ['#6b6f80', '#7d7f8c', '#958f8f', '#b39a86'];
  for (let y = 0; y < 60; y++) px(0, y, W, 1, sky[Math.min(3, Math.floor(y / 15))]);
  // mountains
  for (let x = 0; x < W; x++) {
    const h = 26 + Math.round(Math.abs(Math.sin(x / 11)) * 18 + Math.sin(x / 4) * 2);
    px(x, h, 1, H - h, '#4b4a52');
    const h2 = 44 + Math.round(Math.abs(Math.sin(x / 7 + 1)) * 10);
    px(x, h2, 1, H - h2, '#3b3a40');
  }
  for (let x = 0; x < W; x++) { const h = 26 + Math.round(Math.abs(Math.sin(x / 11)) * 18); if (h < 32) px(x, h, 1, 2, '#e5e7eb'); }
  // mine entrance with beams
  px(48, 58, 16, 14, '#1c1b1f'); px(46, 56, 20, 3, '#5e4329'); px(46, 56, 3, 16, '#5e4329'); px(63, 56, 3, 16, '#5e4329');
  // stone houses with smoking chimneys
  const house = (x: number, y: number, w: number) => {
    px(x, y, w, 10, '#6b6458'); px(x, y, w, 1, '#3f3a33');
    for (let i = 0; i < Math.ceil(w / 2) + 1; i++) px(x - 1 + i, y - 1 - i, w + 2 - i * 2, 1, '#57534e');
    px(x + 2, y + 3, 2, 2, '#fbbf24'); px(x + w - 4, y + 3, 2, 2, '#fbbf24');
    px(x + w - 3, y - 7, 2, 5, '#3f3a33');
    for (let k = 0; k < 4; k++) px(x + w - 3 + k, y - 9 - k * 3, 2, 2, `rgba(220,220,220,${0.5 - k * 0.1})`);
  };
  house(6, 72, 12); house(24, 76, 10);
  px(0, 86, W, H - 86, '#3a3530');
  // cart rails & ore cart
  for (let x = 0; x < W; x += 4) px(x, 100, 2, 1, '#5e4329');
  px(0, 98, W, 1, '#8b949c'); px(0, 102, W, 1, '#8b949c');
  px(40, 92, 12, 6, '#4b5563'); px(41, 90, 10, 2, '#8b949c'); px(42, 98, 2, 2, '#1f2937'); px(48, 98, 2, 2, '#1f2937');
  for (let i = 0; i < 30; i++) px(Math.floor(r() * W), 104 + Math.floor(r() * 24), 2, 1, ['#4a443d', '#2e2a26'][Math.floor(r() * 2)]);
}

function drawCoalhaven(px: Px, r: () => number) {
  // smoky teal-grey harbour sky
  const sky = ['#5b6b74', '#6e7c82', '#87908f', '#a59a88'];
  for (let y = 0; y < 52; y++) px(0, y, W, 1, sky[Math.min(3, Math.floor(y / 13))]);
  // drifting smoke bands
  for (let i = 0; i < 6; i++) px(Math.floor(r() * W) - 10, 6 + i * 6, 18 + Math.floor(r() * 14), 2, 'rgba(60,60,64,0.35)');
  // cliff on the left with weeping willows
  for (let x = 0; x < 26; x++) { const h = 30 + Math.round(x * 0.9 + Math.sin(x / 3) * 2); px(x, h, 1, 70 - h, '#3d4035'); }
  const willow = (cx: number, cy: number) => {
    px(cx, cy, 2, 10, '#4a3b2a');
    for (let k = -5; k <= 6; k += 1) {
      const len = 6 + Math.floor(r() * 7);
      px(cx + k, cy - 2 + Math.abs(k) / 2, 1, len, ['#6f8f3a', '#5c7a30', '#83a24a'][Math.floor(r() * 3)]);
    }
    px(cx - 5, cy - 3, 12, 3, '#6f8f3a');
  };
  willow(6, 34); willow(17, 40);
  // houses up the hill with smoking chimneys and warm windows
  const house = (x: number, y: number, w: number, roof: string) => {
    px(x, y, w, 9, '#5b524a'); px(x, y, w, 1, '#2f2a25');
    for (let i = 0; i < Math.ceil(w / 2) + 1; i++) px(x - 1 + i, y - 1 - i, w + 2 - i * 2, 1, roof);
    px(x + 2, y + 3, 2, 2, '#fbbf24');
    px(x + w - 3, y - 6, 2, 4, '#2f2a25');
    for (let k = 0; k < 4; k++) px(x + w - 3 + k, y - 8 - k * 3, 2, 2, `rgba(40,40,44,${0.55 - k * 0.12})`);
  };
  house(30, 50, 10, '#7f1d1d'); house(44, 46, 12, '#334155'); house(60, 51, 9, '#7f1d1d');
  // quay
  px(0, 62, W, 8, '#4b4640');
  for (let x = 0; x < W; x += 6) px(x, 62, 5, 1, '#5c564e');
  // coal heaps on the quay
  for (const [x, w] of [[4, 10], [16, 7]] as const) for (let i = 0; i < w / 2; i++) px(x + i, 61 - i, w - i * 2, 1, i % 2 ? '#1c1917' : '#27272a');
  // lantern posts
  for (const x of [30, 52]) { px(x, 52, 1, 10, '#1f1d1b'); px(x - 1, 50, 3, 3, '#fcd34d'); px(x - 3, 48, 7, 7, 'rgba(252,211,77,0.15)'); }
  // harbour water
  for (let y = 70; y < 108; y++) px(0, y, W, 1, y % 4 === 0 ? '#2c4a57' : '#223d48');
  for (let i = 0; i < 45; i++) px(Math.floor(r() * W), 70 + Math.floor(r() * 38), 2 + Math.floor(r() * 4), 1, '#4f7887');
  // lantern reflections
  for (const x of [30, 52]) for (let y = 72; y < 90; y += 3) px(x - 1 + (y % 2), y, 2, 1, 'rgba(252,211,77,0.35)');
  // wooden pier and a coal barge
  px(40, 68, 32, 3, '#6b4f33');
  for (const x of [42, 52, 62, 70]) px(x, 71, 2, 14, '#4a3624');
  px(6, 84, 30, 7, '#3b2a1c'); px(4, 83, 34, 2, '#5e4329'); px(8, 80, 26, 4, '#18181b');
  for (let i = 0; i < 8; i++) px(9 + i * 3, 79 - (i % 3), 3, 2, '#27272a');
  px(30, 70, 1, 13, '#3b2a1c'); px(31, 71, 6, 6, 'rgba(229,222,207,0.55)');
  // shingle beach
  px(0, 108, W, H - 108, '#57514a');
  for (let i = 0; i < 50; i++) px(Math.floor(r() * W), 108 + Math.floor(r() * 20), 2, 1, ['#6b645b', '#3f3a35', '#1c1917'][Math.floor(r() * 3)]);
}

function drawBluecliff(px: Px, r: () => number) {
  // bright, airy sea sky
  const sky = ['#7cc4e8', '#93d0ec', '#aedcf0', '#c9e8f4'];
  for (let y = 0; y < 50; y++) px(0, y, W, 1, sky[Math.min(3, Math.floor(y / 13))]);
  // soft clouds
  for (const [x, y, w] of [[6, 8, 14], [40, 5, 18], [58, 16, 10]] as const) { px(x, y, w, 2, '#f8fafc'); px(x + 2, y - 1, w - 4, 1, '#f8fafc'); }
  // the sea, and far on the horizon a small dark island with no lights (Lunaria)
  for (let y = 50; y < 128; y++) px(0, y, W, 1, y % 5 === 0 ? '#2b7aa6' : '#22688f');
  px(8, 46, 14, 4, '#2c3440'); px(11, 44, 8, 2, '#2c3440'); px(14, 41, 2, 3, '#2c3440');
  // whitecaps
  for (let i = 0; i < 40; i++) px(Math.floor(r() * W), 52 + Math.floor(r() * 70), 2 + Math.floor(r() * 3), 1, '#d6f0fb');
  // cobalt-grey cliffs on the right, stepping down to the sea
  for (let x = 30; x < W; x++) {
    const top = 44 + Math.round(Math.max(0, 50 - x) * 0.9 + Math.sin(x / 4) * 1.5);
    for (let y = top; y < H; y++) px(x, y, 1, 1, (y + x) % 7 === 0 ? '#3b5878' : y - top < 3 ? '#5a7a52' : '#46607e');
  }
  // clifftop grass and red maples
  for (let x = 30; x < W; x++) { const top = 44 + Math.round(Math.max(0, 50 - x) * 0.9 + Math.sin(x / 4) * 1.5); px(x, top - 1, 1, 2, '#6f9a4a'); }
  const maple = (x: number, y: number) => {
    px(x + 2, y + 4, 1, 5, '#5b3d22');
    for (let k = 0; k < 9; k++) px(x + Math.floor(r() * 6) - 1, y + Math.floor(r() * 5), 2, 2, ['#dc2626', '#ea580c', '#f59e0b'][Math.floor(r() * 3)]);
  };
  maple(34, 52); maple(40, 46);
  // little white cottages
  for (const [x, y] of [[46, 40], [53, 41]] as const) { px(x, y, 6, 5, '#f1f5f9'); px(x - 1, y - 2, 8, 2, '#1d4ed8'); px(x + 2, y + 2, 2, 3, '#7c4a24'); px(x + 4, y + 1, 1, 1, '#fde68a'); }
  // the lighthouse on the point, with a light beam towards the dark island
  px(62, 16, 6, 26, '#f8fafc');
  for (let y = 18; y < 42; y += 6) px(62, y, 6, 3, '#dc2626');
  px(61, 13, 8, 3, '#1e293b'); px(62, 11, 6, 2, '#fde68a'); px(63, 9, 4, 2, '#1e293b');
  for (let i = 0; i < 40; i++) px(61 - i, 12 - Math.floor(i / 12), 1, 1 + Math.floor(i / 10), 'rgba(253,230,138,0.25)');
  // gulls
  for (const [x, y] of [[24, 18], [30, 24], [18, 28]] as const) { px(x, y, 2, 1, '#f8fafc'); px(x + 2, y - 1, 2, 1, '#f8fafc'); px(x + 4, y, 2, 1, '#f8fafc'); }
  // lobster pots bobbing
  for (const x of [8, 16, 24]) { px(x, 70 + (x % 3), 3, 2, '#b45309'); px(x + 1, 69 + (x % 3), 1, 1, '#f59e0b'); }
}

/** Lunaria: a misty island town. Dark and ghostly — or, once the bell rings, warm and lit. */
function drawLunaria(px: Px, r: () => number, restored: boolean) {
  // night-blue sky with a huge low moon
  const sky = restored ? ['#3b4a7a', '#4d5c8c', '#66709c', '#8a86a8'] : ['#1c2238', '#252c46', '#323a56', '#454b66'];
  for (let y = 0; y < 60; y++) px(0, y, W, 1, sky[Math.min(3, Math.floor(y / 15))]);
  for (let i = 0; i < 26; i++) px(Math.floor(r() * W), Math.floor(r() * 36), 1, 1, '#e0e7ff');
  px(46, 10, 16, 16, '#eef2ff'); px(44, 12, 20, 12, '#eef2ff'); px(48, 8, 12, 20, '#eef2ff');
  px(50, 14, 3, 3, '#c7d2fe'); px(56, 19, 2, 2, '#c7d2fe');
  // the bell tower
  px(8, 22, 10, 40, '#2b2f45'); px(7, 20, 12, 3, '#1e2135'); px(10, 14, 6, 6, '#2b2f45'); px(12, 10, 2, 4, '#1e2135');
  px(11, 26, 4, 5, restored ? '#fbbf24' : '#565b78'); // the bell
  // houses, windows dark or warm
  const house = (x: number, y: number, w: number) => {
    px(x, y, w, 10, '#3a3f5c'); px(x, y, w, 1, '#1e2135');
    for (let i = 0; i < Math.ceil(w / 2) + 1; i++) px(x - 1 + i, y - 1 - i, w + 2 - i * 2, 1, '#262a40');
    px(x + 2, y + 3, 2, 2, restored ? '#fcd34d' : '#14172a'); px(x + w - 4, y + 3, 2, 2, restored ? '#fcd34d' : '#14172a');
    px(x + Math.floor(w / 2) - 1, y + 6, 2, 4, restored ? '#7c4a24' : '#14172a');
  };
  house(22, 50, 10); house(36, 47, 12); house(52, 51, 11);
  // the shore and the still silver sea
  px(0, 62, W, 6, '#4a4e66');
  for (let y = 68; y < 104; y++) px(0, y, W, 1, y % 4 === 0 ? '#3d4a70' : '#33405f');
  for (let i = 0; i < 30; i++) px(Math.floor(r() * W), 70 + Math.floor(r() * 32), 3 + Math.floor(r() * 4), 1, '#8b94c9');
  px(44, 72, 22, 1, '#c7d2fe'); px(47, 76, 16, 1, '#a5b4fc'); px(50, 80, 10, 1, '#8b94c9'); // moon path
  // the seven Moonlanterns along the shore
  for (let k = 0; k < 7; k++) {
    const x = 4 + k * 10;
    px(x, 54, 1, 8, '#1e2135'); px(x - 1, 52, 3, 3, restored ? '#fde68a' : '#4b5070');
    if (restored) { px(x - 3, 50, 7, 7, 'rgba(253,230,138,0.18)'); for (let y = 70; y < 84; y += 3) px(x - 1, y, 2, 1, 'rgba(253,230,138,0.35)'); }
  }
  // the townsfolk on the shore: pale and see-through, or warm and solid
  for (const x of [14, 28, 41, 58, 66]) {
    const c = restored ? ['#b45309', '#1d4ed8', '#be123c', '#15803d', '#7c3aed'][x % 5] : 'rgba(224,231,255,0.45)';
    px(x, 57, 2, 2, restored ? '#f5d0a9' : 'rgba(224,231,255,0.55)'); px(x - 1, 59, 4, 4, c);
  }
  // a little boat with a silver sail (the Silver Willow, once she's home)
  if (restored) { px(30, 86, 14, 3, '#5b3d22'); px(36, 76, 1, 10, '#3b2a1c'); px(37, 77, 5, 8, '#e2e8f0'); }
  // fog: thick before, thin after
  const fog = restored ? 0.08 : 0.32;
  for (let i = 0; i < 9; i++) px(Math.floor(r() * W) - 12, 40 + Math.floor(r() * 60), 26 + Math.floor(r() * 20), 3, `rgba(203,213,225,${fog})`);
  px(0, 104, W, H - 104, '#3a3d52');
  for (let i = 0; i < 40; i++) px(Math.floor(r() * W), 104 + Math.floor(r() * 24), 2, 1, ['#4b4f66', '#2e3145'][Math.floor(r() * 2)]);
}

/** Cinderpeak: a warm village on the slopes of a sleepy volcano, with hot springs. When the mountain stirs, it glows. */
function drawCinderpeak(px: Px, r: () => number, stirring: boolean) {
  // warm, hazy amber sky
  const sky = ['#7c3a2a', '#a14f30', '#c96a3a', '#e09a5a'];
  for (let y = 0; y < 56; y++) px(0, y, W, 1, sky[Math.min(3, Math.floor(y / 14))]);
  // the volcano: a big dark cone with a glowing crater
  for (let y = 14; y < 70; y++) {
    const half = Math.round((y - 14) * 0.75) + 4;
    px(36 - half, y, half * 2, 1, (y % 5 === 0) ? '#3b2a26' : '#4a332d');
  }
  px(32, 13, 8, 2, stirring ? '#fde047' : '#f97316'); px(30, 15, 12, 1, '#7c2d12');
  // lava streams down the sides (brighter when stirring)
  const lava = stirring ? '#fb923c' : '#c2410c';
  for (let y = 16; y < 60; y++) { px(34 - Math.floor((y - 16) * 0.35), y, 1, 1, lava); if (y > 24) px(39 + Math.floor((y - 24) * 0.4), y, 1, 1, lava); }
  // smoke plume — tall and glowing when the mountain stirs
  const puffs = stirring ? 9 : 5;
  for (let i = 0; i < puffs; i++) {
    const s = 3 + i;
    px(34 + Math.round(Math.sin(i * 1.3) * 3) - Math.floor(s / 2) + i, 11 - i * 2, s, 2, stirring && i < 3 ? 'rgba(253,186,116,0.7)' : 'rgba(168,162,158,0.6)');
  }
  if (stirring) for (let i = 0; i < 12; i++) px(28 + Math.floor(r() * 18), 2 + Math.floor(r() * 12), 1, 1, '#fde047');
  // terraced slope
  for (let x = 0; x < W; x++) { const top = 60 + Math.round(Math.sin(x / 7) * 2); px(x, top, 1, H - top, '#5b4038'); }
  for (let y = 70; y < 104; y += 8) px(0, y, W, 1, '#6e4f43');
  // Ash Market stalls with striped awnings
  const stall = (x: number, y: number, c: string) => {
    px(x, y, 9, 5, '#8a6a52'); px(x - 1, y - 3, 11, 3, c);
    for (let i = 0; i < 11; i += 2) px(x - 1 + i, y - 3, 1, 3, '#f5e6d3');
    px(x + 2, y + 1, 2, 2, '#ef4444'); px(x + 5, y + 1, 2, 2, '#f59e0b');
  };
  stall(6, 66, '#b45309'); stall(24, 67, '#9a3412');
  // stone houses with glowing windows
  for (const [x, y] of [[44, 62], [56, 64], [64, 60]] as const) {
    px(x, y, 7, 7, '#7c6a5e'); px(x - 1, y - 2, 9, 2, '#3f2f2a'); px(x + 2, y + 2, 2, 2, '#fdba74'); px(x + 3, y + 4, 2, 3, '#3f2f2a');
  }
  // emberbark trees
  for (const x of [2, 16, 60]) { px(x + 2, 78, 1, 6, '#3b2a1c'); for (let k = 0; k < 7; k++) px(x + Math.floor(r() * 5), 73 + Math.floor(r() * 5), 2, 2, ['#9a3412', '#c2410c', '#ea580c'][Math.floor(r() * 3)]); }
  // glowing-horned goats on the slope
  for (const [x, y] of [[38, 82], [50, 80]] as const) {
    px(x, y, 5, 3, '#d6d3d1'); px(x - 2, y - 1, 3, 3, '#d6d3d1'); px(x - 2, y - 3, 1, 2, '#fb923c'); px(x, y - 3, 1, 2, '#fb923c');
    px(x, y + 3, 1, 2, '#57534e'); px(x + 4, y + 3, 1, 2, '#57534e');
  }
  // the hot springs: a turquoise pool ringed with stones, with steam
  px(8, 98, 40, 12, '#6b5a50');
  px(10, 100, 36, 8, '#4fb3b0'); px(12, 101, 32, 2, '#7dd3cf');
  for (let i = 0; i < 14; i++) px(8 + Math.floor(r() * 40), 97 + (i % 2) * 12, 2, 1, '#8a7a6e');
  for (let i = 0; i < 8; i++) px(12 + i * 4, 92 - (i % 3) * 2, 2, 3, 'rgba(245,245,244,0.35)');
  // warm ground
  px(0, 112, W, H - 112, '#4a3530');
  for (let i = 0; i < 40; i++) px(Math.floor(r() * W), 112 + Math.floor(r() * 16), 2, 1, ['#5b4038', '#3b2a26', stirring ? '#f97316' : '#7c2d12'][Math.floor(r() * 3)]);
}

/** Frosthold: a snowed-in mountain hamlet. Snowy peaks, frostpines, round huts with smoking chimneys, the Stew Hall. */
function drawFrosthold(px: Px, r: () => number) {
  const sky = ['#5b7ea6', '#7896ba', '#98b1cd', '#bccfe2'];
  for (let y = 0; y < 58; y++) px(0, y, W, 1, sky[Math.min(3, Math.floor(y / 15))]);
  // a faint aurora ribbon
  for (let x = 0; x < W; x++) px(x, 10 + Math.round(Math.sin(x / 6) * 3), 1, 2, x % 3 ? 'rgba(134,239,172,0.35)' : 'rgba(244,114,182,0.3)');
  // snowy peaks
  const peak = (cx: number, top: number, w: number) => {
    for (let y = top; y < 60; y++) {
      const half = Math.round((y - top) * w);
      px(cx - half, y, half * 2 + 1, 1, y - top < 7 ? '#f8fafc' : y % 4 === 0 ? '#64748b' : '#7c8ba1');
    }
  };
  peak(14, 18, 0.9); peak(52, 12, 0.8); peak(34, 26, 1.0);
  // deep snow ground
  for (let x = 0; x < W; x++) { const top = 60 + Math.round(Math.sin(x / 9) * 2); px(x, top, 1, H - top, '#e8eef5'); }
  for (let y = 70; y < H; y += 6) for (let i = 0; i < 6; i++) px(Math.floor(r() * W), y + Math.floor(r() * 4), 3, 1, '#cbd5e1');
  // frostpines
  const pine = (x: number, y: number, s: number) => {
    for (let k = 0; k < s; k++) px(x - k, y + k * 2, k * 2 + 1, 2, k % 2 ? '#1e4d4a' : '#2a5f5a');
    for (let k = 0; k < s; k += 2) px(x - k, y + k * 2, k * 2 + 1, 1, '#f1f5f9');
    px(x, y + s * 2, 1, 3, '#3b2a1c');
  };
  for (const [x, y, s] of [[4, 58, 6], [64, 56, 7], [20, 76, 5], [68, 80, 5], [6, 92, 6]] as const) pine(x, y, s);
  // round huts with snowy roofs and warm windows
  const hut = (x: number, y: number, w: number) => {
    px(x, y, w, 8, '#8b5e3c'); px(x, y + 7, w, 1, '#5b3a22');
    for (let i = 0; i < 4; i++) px(x - 1 + i, y - 1 - i, w + 2 - i * 2, 1, '#f8fafc');
    px(x + 2, y + 2, 2, 2, '#fde68a'); px(x + w - 4, y + 3, 2, 4, '#3b2a1c');
    px(x + w - 3, y - 6, 2, 3, '#57534e');
    for (let i = 0; i < 4; i++) px(x + w - 3 + (i % 2), y - 8 - i * 2, 2, 2, 'rgba(241,245,249,0.6)');
  };
  hut(30, 66, 11); hut(46, 70, 9); hut(10, 72, 8);
  // the Stew Hall: a long log hall with a big glowing door
  px(26, 88, 26, 12, '#6b4226'); for (let i = 0; i < 6; i++) px(25 + i, 87 - i, 28 - i * 2, 1, '#f8fafc');
  px(37, 92, 5, 8, '#fbbf24'); px(29, 91, 3, 3, '#fde68a'); px(46, 91, 3, 3, '#fde68a');
  // gentle snowfall
  for (let i = 0; i < 40; i++) px(Math.floor(r() * W), Math.floor(r() * 110), 1, 1, '#ffffff');
}

/** Voidreach: rope bridges and little houses on posts over a chasm full of stars. */
function drawVoidreach(px: Px, r: () => number) {
  const sky = ['#1e1b4b', '#2e1065', '#3b1a6e', '#4c2a80'];
  for (let y = 0; y < 50; y++) px(0, y, W, 1, sky[Math.min(3, Math.floor(y / 13))]);
  for (let i = 0; i < 30; i++) px(Math.floor(r() * W), Math.floor(r() * 45), 1, 1, '#e9d5ff');
  // two cliff edges with the chasm between them
  for (let y = 46; y < H; y++) {
    const left = 18 + Math.round(Math.sin(y / 5) * 2) - Math.max(0, Math.floor((y - 90) / 3));
    const right = 54 - Math.round(Math.sin(y / 6) * 2) + Math.max(0, Math.floor((y - 90) / 3));
    px(0, y, Math.max(0, left), 1, y % 5 === 0 ? '#3f3a52' : '#4a4560');
    px(right, y, W - right, 1, y % 5 === 0 ? '#3f3a52' : '#4a4560');
    px(left, y, Math.max(0, right - left), 1, '#0b0820');
  }
  // the stars below — the chasm is full of them
  for (let i = 0; i < 70; i++) {
    const y = 50 + Math.floor(r() * 78);
    px(22 + Math.floor(r() * 28), y, 1, 1, ['#f5f3ff', '#c4b5fd', '#fde68a', '#a5b4fc'][Math.floor(r() * 4)]);
  }
  px(34, 104, 3, 3, 'rgba(196,181,253,0.5)'); px(35, 105, 1, 1, '#ffffff');
  // rope bridges with ribbons
  const bridge = (y: number) => {
    for (let x = 16; x < 57; x++) px(x, y + Math.round(Math.sin((x - 16) / 41 * Math.PI) * 3), 1, 1, '#a16207');
    for (let x = 18; x < 56; x += 3) px(x, y - 3 + Math.round(Math.sin((x - 16) / 41 * Math.PI) * 3), 1, 3, '#713f12');
    for (let x = 20; x < 54; x += 6) px(x, y - 4 + Math.round(Math.sin((x - 16) / 41 * Math.PI) * 3), 1, 2, ['#f472b6', '#fde047', '#38bdf8', '#4ade80'][(x / 6) % 4 | 0]);
  };
  bridge(62); bridge(84);
  // little houses on stilts at the cliff edges
  const house = (x: number, y: number, c: string) => {
    px(x, y, 8, 6, c); for (let i = 0; i < 4; i++) px(x - 1 + i, y - 1 - i, 10 - i * 2, 1, '#312e81');
    px(x + 2, y + 2, 2, 2, '#fde68a'); px(x + 1, y + 6, 1, 4, '#3b2a1c'); px(x + 6, y + 6, 1, 4, '#3b2a1c');
  };
  house(4, 52, '#5b4a7a'); house(58, 54, '#4c3d6b'); house(8, 74, '#4c3d6b'); house(60, 78, '#5b4a7a');
  // voidwood trees and floating lanterns
  for (const x of [2, 66]) { px(x + 1, 100, 1, 6, '#1c1230'); for (let k = 0; k < 6; k++) px(x + Math.floor(r() * 4), 95 + Math.floor(r() * 5), 2, 2, ['#581c87', '#6b21a8', '#3b0764'][Math.floor(r() * 3)]); }
  for (let i = 0; i < 6; i++) { const x = 20 + Math.floor(r() * 32), y = 20 + Math.floor(r() * 30); px(x, y, 2, 2, '#fde68a'); px(x - 1, y - 1, 4, 4, 'rgba(253,230,138,0.2)'); }
}

/** Starfall Crater: golden crop rings inside a crater, a glowing tree over the fallen star, calm cows. */
function drawStarfall(px: Px, r: () => number) {
  const sky = ['#7a5ea8', '#9a74b8', '#c58fb8', '#efb88f'];
  for (let y = 0; y < 44; y++) px(0, y, W, 1, sky[Math.min(3, Math.floor(y / 11))]);
  for (let i = 0; i < 14; i++) px(Math.floor(r() * W), Math.floor(r() * 22), 1, 1, '#fff7d6');
  // a shooting star
  for (let i = 0; i < 8; i++) px(48 + i, 6 + Math.floor(i / 2), 1, 1, i === 7 ? '#ffffff' : 'rgba(255,247,214,0.6)');
  // the crater rim, then the bowl
  for (let x = 0; x < W; x++) { const top = 40 + Math.round(Math.abs(x - 36) / 6); px(x, top, 1, H - top, '#8a6a3e'); }
  for (let y = 50; y < H; y++) { const half = Math.min(36, 10 + (y - 50) * 1.2); px(Math.round(36 - half), y, Math.round(half * 2), 1, '#a8853f'); }
  // rings of golden crops around the middle
  for (let ring = 0; ring < 4; ring++) {
    const ry = 86 + ring * 9, rx = 18 + ring * 9;
    for (let a = 0; a < 60; a++) {
      const t = (a / 60) * Math.PI * 2;
      px(Math.round(36 + Math.cos(t) * rx), Math.round(ry - 10 + Math.sin(t) * (rx * 0.32)), 1, 1, ring % 2 ? '#e2b84a' : '#c99a2e');
    }
  }
  // the Stargrown Elder: a big tree with glowing blossoms, the star glowing in its roots
  px(34, 60, 4, 22, '#5b3a22'); px(30, 80, 12, 3, '#5b3a22');
  for (let k = 0; k < 40; k++) px(22 + Math.floor(r() * 28), 44 + Math.floor(r() * 18), 3, 2, ['#4d7c0f', '#65a30d', '#3f6212'][Math.floor(r() * 3)]);
  for (let k = 0; k < 12; k++) px(24 + Math.floor(r() * 24), 45 + Math.floor(r() * 16), 1, 1, '#fef08a');
  px(33, 79, 6, 4, '#fde047'); px(31, 77, 10, 8, 'rgba(253,224,71,0.25)'); px(29, 75, 14, 12, 'rgba(253,224,71,0.1)');
  // farmhouse and barn on the rim
  px(4, 46, 10, 7, '#b45309'); for (let i = 0; i < 4; i++) px(3 + i, 45 - i, 12 - i * 2, 1, '#7c2d12'); px(7, 49, 3, 4, '#3b2a1c');
  px(58, 44, 9, 7, '#e7e5e4'); for (let i = 0; i < 4; i++) px(57 + i, 43 - i, 11 - i * 2, 1, '#57534e'); px(61, 47, 2, 2, '#fde68a');
  // calm cows lying in the grass
  for (const [x, y] of [[10, 104], [54, 100], [24, 116]] as const) {
    px(x, y, 7, 3, '#f5f5f4'); px(x + 1, y, 2, 1, '#292524'); px(x + 4, y + 1, 2, 2, '#292524'); px(x + 6, y - 1, 3, 3, '#f5f5f4'); px(x + 8, y, 1, 1, '#fda4af');
  }
}

/** Celestine Spires: slender towers above a sea of clouds, little bridges, chimes, a fish in the air. */
function drawCelestine(px: Px, r: () => number) {
  const sky = ['#5aa7d6', '#7cbde2', '#a2d2ec', '#cbe6f5'];
  for (let y = 0; y < H; y++) px(0, y, W, 1, sky[Math.min(3, Math.floor(y / 26))]);
  // the sun, high and bright
  px(56, 8, 8, 8, '#fef9c3'); px(54, 10, 12, 4, '#fef9c3'); px(58, 6, 4, 12, '#fef9c3');
  // towers: tall and slim with pointed teal roofs
  const tower = (x: number, top: number, w: number) => {
    px(x, top, w, 110 - top, '#e7e2d6'); for (let y = top; y < 110; y += 4) px(x, y, w, 1, '#d6cfbf');
    for (let i = 0; i < Math.ceil(w / 2) + 3; i++) px(x + Math.floor(w / 2) - i, top - 8 + i, i * 2 + (w % 2), 1, '#14b8a6');
    for (let y = top + 6; y < 104; y += 12) px(x + Math.floor(w / 2) - 1, y, 2, 3, '#fde68a');
  };
  tower(6, 30, 7); tower(30, 16, 9); tower(54, 36, 8);
  // little bridges between the towers
  for (let x = 13; x < 30; x++) px(x, 52 + Math.round(Math.sin((x - 13) / 17 * Math.PI) * 2), 1, 1, '#92400e');
  for (let x = 39; x < 54; x++) px(x, 62 + Math.round(Math.sin((x - 39) / 15 * Math.PI) * 2), 1, 1, '#92400e');
  // wind chimes hanging off the bridges
  for (const x of [20, 46]) { px(x, 55, 1, 3, '#a8a29e'); for (let k = 0; k < 3; k++) px(x - 1 + k, 58, 1, 2 + k, '#5eead4'); }
  // a sea of clouds below
  for (let i = 0; i < 26; i++) { const x = Math.floor(r() * W) - 6, y = 100 + Math.floor(r() * 24); px(x, y, 14 + Math.floor(r() * 10), 4, i % 3 ? '#ffffff' : '#e0f2fe'); }
  px(0, 112, W, H - 112, '#f8fafc');
  // fish swimming through the air
  for (const [x, y] of [[20, 76], [44, 84], [60, 72]] as const) { px(x, y, 4, 2, '#f59e0b'); px(x + 4, y - 1, 2, 4, '#fbbf24'); px(x, y, 1, 1, '#1f2937'); }
  // drifting little clouds
  for (let i = 0; i < 5; i++) px(Math.floor(r() * W), 20 + Math.floor(r() * 40), 8, 2, 'rgba(255,255,255,0.8)');
}

/** The Primordial Rift: giant ferns, the Worldtree, and a glowing crack in the sky. */
function drawRift(px: Px, r: () => number) {
  const sky = ['#1a2e1f', '#21402a', '#2d5636', '#3f6e45'];
  for (let y = 0; y < 60; y++) px(0, y, W, 1, sky[Math.min(3, Math.floor(y / 15))]);
  // the Rift: a jagged glowing crack across the sky
  let cy = 10;
  for (let x = 0; x < W; x++) {
    cy = Math.max(4, Math.min(18, cy + (r() < 0.5 ? -1 : 1)));
    px(x, cy - 2, 1, 5, 'rgba(190,242,100,0.25)'); px(x, cy - 1, 1, 3, '#d9f99d'); px(x, cy, 1, 1, '#ffffff');
  }
  for (let i = 0; i < 18; i++) px(Math.floor(r() * W), 20 + Math.floor(r() * 30), 1, 1, '#bef264');
  // misty far-off forest filling the valley behind the tree
  const haze = ['#3f6e45', '#3a6640', '#345d3a', '#2f5434', '#2a4b2f'];
  for (let y = 60; y < 104; y++) px(0, y, W, 1, haze[Math.min(4, Math.floor((y - 60) / 9))]);
  for (let i = 0; i < 26; i++) { const x = Math.floor(r() * W), h = 6 + Math.floor(r() * 10); px(x, 70 + Math.floor(r() * 24) - h, 3, h, ['#24442a', '#2b4f30', '#1f3d25'][Math.floor(r() * 3)]); }
  for (let i = 0; i < 6; i++) px(Math.floor(r() * W) - 10, 66 + Math.floor(r() * 30), 22, 2, 'rgba(217,249,157,0.12)');
  // the Worldtree: an enormous trunk holding up the sky
  px(30, 24, 12, 80, '#3f2a1a'); px(28, 96, 16, 8, '#3f2a1a');
  for (let y = 26; y < 100; y += 5) px(31 + (y % 3), y, 2, 3, '#2a1c12');
  for (let k = 0; k < 70; k++) px(8 + Math.floor(r() * 56), 18 + Math.floor(r() * 24), 4, 3, ['#166534', '#15803d', '#14532d', '#4d7c0f'][Math.floor(r() * 4)]);
  // roots spreading out
  for (const [dx, len] of [[-1, 18], [1, 20], [-1, 10], [1, 12]] as const) for (let i = 0; i < len; i++) px(36 + dx * (6 + i), 100 + Math.floor(i / 4), 2, 1, '#3f2a1a');
  // valley floor
  for (let x = 0; x < W; x++) { const top = 102 + Math.round(Math.sin(x / 5) * 1.5); px(x, top, 1, H - top, '#2f4a24'); }
  // giant ferns
  const fern = (x: number, y: number, h: number, flip: number) => {
    for (let i = 0; i < h; i++) {
      const cx = x + Math.round(Math.sin(i / h * 1.6) * 4 * flip);
      px(cx, y - i, 1, 1, '#365314');
      if (i % 2 === 0) { px(cx - 3, y - i, 3, 1, '#4d7c0f'); px(cx + 1, y - i, 3, 1, '#65a30d'); }
    }
  };
  fern(6, 104, 34, 1); fern(14, 106, 26, -1); fern(60, 104, 36, -1); fern(66, 108, 22, 1); fern(48, 110, 18, 1); fern(22, 112, 16, -1);
  // the old well (where the Traveller waits) and a tiny figure
  px(44, 112, 8, 5, '#78716c'); px(43, 111, 10, 1, '#57534e'); px(44, 106, 1, 5, '#57534e'); px(51, 106, 1, 5, '#57534e'); px(43, 105, 10, 1, '#7c2d12');
  px(54, 109, 2, 2, '#e7c9a9'); px(53, 111, 4, 5, '#7c6a4c');
  // drifting spores of light
  for (let i = 0; i < 20; i++) px(Math.floor(r() * W), 40 + Math.floor(r() * 80), 1, 1, 'rgba(217,249,157,0.8)');
}

// 🌄 The title screen: the whole game in one picture. Twilight over the Heartland, a great mountain
// with a lantern-lit road winding up it, and the summit star waiting at the top (the Ascension).
// Pocketvale's cottages glow at the foot, where every saga starts.
function drawTitle(px: Px, r: () => number) {
  // twilight sky: deep night at the top, a warm glow along the far hills
  const sky = ['#0c0d24', '#11122e', '#171638', '#1e1a44', '#271e4f', '#33235a', '#432a61', '#573265', '#6d3a63', '#86465d', '#9f5653', '#b86a4a'];
  for (let y = 0; y < 84; y++) px(0, y, W, 1, sky[Math.min(sky.length - 1, Math.floor(y / 7))]);
  // stars (a few warm ones)
  for (let i = 0; i < 70; i++) {
    const y = Math.floor(r() * r() * 62);
    px(Math.floor(r() * W), y, 1, 1, r() > 0.85 ? '#fde68a' : r() > 0.5 ? '#e0e7ff' : '#a5b4fc');
  }
  // far ridges, faded into the dusk
  for (let x = 0; x < W; x++) {
    const top = 66 + Math.round(Math.sin(x / 6) * 3 + Math.sin(x / 2.3) * 1.2);
    px(x, top, 1, 84 - top, '#3a2a5e');
    const top2 = 74 + Math.round(Math.sin(x / 4 + 2) * 2.5);
    px(x, top2, 1, 90 - top2, '#2c2350');
  }
  // the great mountain
  const PEAK = 30;
  const half = (y: number) => (y - PEAK) * 0.62 + Math.sin(y / 3) * 0.8;
  for (let y = PEAK; y < 108; y++) {
    const w = half(y);
    const x0 = Math.round(36 - w), x1 = Math.round(36 + w);
    px(x0, y, x1 - x0 + 1, 1, '#1e1838');
    // starlit left face, shadowed right face
    px(x0, y, Math.max(1, Math.round(w * 0.55)), 1, '#2a2350');
    px(x0, y, 1, 1, '#4c3f80');
    // snow on the upper slopes
    if (y < PEAK + 12) {
      const sw = Math.max(1, Math.round(w * (1 - (y - PEAK) / 13)));
      px(Math.round(36 - w), y, sw + 1, 1, '#d9d4f2');
      if (r() < 0.5) px(Math.round(36 + w - sw * 0.6), y, Math.max(1, Math.round(sw * 0.6)), 1, '#9d97c4');
    }
  }
  // the summit star: a soft halo, then a bright four-point star
  for (const [rad, c] of [[11, 'rgba(251,191,36,0.06)'], [8, 'rgba(251,191,36,0.1)'], [5, 'rgba(253,230,138,0.18)'], [3, 'rgba(255,247,214,0.35)']] as const) {
    for (let dy = -rad; dy <= rad; dy++) {
      const dx = Math.round(Math.sqrt(rad * rad - dy * dy));
      px(36 - dx, 22 + dy, dx * 2 + 1, 1, c);
    }
  }
  px(36, 15, 1, 15, '#fde68a'); px(29, 22, 15, 1, '#fde68a');
  px(35, 19, 3, 7, '#fff7d6'); px(33, 21, 7, 3, '#fff7d6'); px(36, 22, 1, 1, '#ffffff');
  // the road up: switchbacks from the valley to the summit, a lantern at every bend
  const pts: [number, number][] = [[38, 120], [30, 108], [46, 98], [28, 88], [44, 78], [31, 68], [42, 58], [33, 49], [39, 41], [36, 33]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(ax + ((bx - ax) * s) / steps), y = Math.round(ay + ((by - ay) * s) / steps);
      px(x, y, 1, 1, y > 100 ? '#8a6a45' : '#6b5a8a');
    }
  }
  for (const [x, y] of pts.slice(1, -1)) {
    px(x - 1, y - 1, 3, 1, 'rgba(251,191,36,0.3)'); px(x, y - 2, 1, 3, 'rgba(251,191,36,0.3)');
    px(x, y - 1, 1, 1, '#fde047');
  }
  // mist drifting across the mountain
  for (const [y, a] of [[64, 0.1], [72, 0.08], [86, 0.07]] as const) {
    for (let i = 0; i < 4; i++) px(Math.floor(r() * W) - 12, y + Math.floor(r() * 4), 18 + Math.floor(r() * 14), 1, `rgba(196,181,253,${a})`);
  }
  // the Heartland valley at the foot
  for (let x = 0; x < W; x++) {
    const top = 106 + Math.round(Math.sin(x / 7) * 2 + Math.sin(x / 3) * 0.7);
    px(x, top, 1, H - top, '#161a2c');
    px(x, top, 1, 1, '#24304a');
  }
  // pine silhouettes
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(r() * W), base = 108 + Math.floor(r() * 14), h = 5 + Math.floor(r() * 6);
    for (let k = 0; k < h; k++) px(x - Math.floor((h - k) / 3), base - k, 1 + 2 * Math.floor((h - k) / 3), 1, '#0f1424');
  }
  // Pocketvale: little cottages with warm windows and a thread of chimney smoke
  const cottage = (x: number, y: number, w: number) => {
    px(x, y, w, 4, '#3b2f2a');
    for (let k = 0; k < 3; k++) px(x - 1 + k, y - 1 - k, w + 2 - k * 2, 1, '#5b2f28');
    px(x + 1, y + 1, 1, 1, '#fbbf24'); if (w > 4) px(x + w - 2, y + 1, 1, 1, '#f59e0b');
    px(x + w - 2, y - 5, 1, 2, '#3b2f2a');
    for (let k = 0; k < 4; k++) px(x + w - 2 + (k % 2), y - 7 - k * 2, 1, 1, 'rgba(203,213,225,0.25)');
  };
  cottage(8, 116, 6); cottage(17, 119, 5); cottage(52, 117, 6); cottage(61, 120, 5); cottage(27, 122, 4);
  // fireflies over the meadow
  for (let i = 0; i < 14; i++) px(Math.floor(r() * W), 104 + Math.floor(r() * 22), 1, 1, 'rgba(253,224,71,0.85)');
}

export const DRAW: Record<SceneName, (px: Px, r: () => number) => void> = {
  cinderpeak: (px, r) => drawCinderpeak(px, r, false), cinderpeak_stirring: (px, r) => drawCinderpeak(px, r, true),
  forest: drawForest, town: drawTown, mine: drawMine, forge: drawForge,
  river: drawRiver, camp: drawCamp, kitchen: drawKitchen, workshop: drawWorkshop, tower: drawTower, altar: drawAltar, ironmoor: drawIronmoor, coalhaven: drawCoalhaven, bluecliff: drawBluecliff,
  lunaria: (px, r) => drawLunaria(px, r, false), lunaria_restored: (px, r) => drawLunaria(px, r, true),
  frosthold: drawFrosthold, voidreach: drawVoidreach, starfall: drawStarfall, celestine: drawCelestine, rift: drawRift, title: drawTitle,
};

/** Where the interesting part of each scene is (0% = top, 100% = bottom), for short banners. */
const FOCUS: Partial<Record<SceneName, number>> = { bluecliff: 22, coalhaven: 46, ironmoor: 50, town: 50, lunaria: 40, lunaria_restored: 40, cinderpeak: 40, cinderpeak_stirring: 40, frosthold: 55, voidreach: 45, starfall: 55, celestine: 35, rift: 20, title: 35 };

/** Outdoor scenes follow the real clock on your phone. Indoor ones stay cosy all day. */
// (Lunaria is always under its own moon, so it skips the day/night tint.)
const OUTDOOR: SceneName[] = ['forest', 'town', 'river', 'ironmoor', 'coalhaven', 'bluecliff', 'cinderpeak', 'cinderpeak_stirring', 'frosthold', 'starfall', 'celestine'];

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export function dayPhase(hour = new Date().getHours()): DayPhase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

/** Re-checks the clock every minute so the sky changes while you play. */
export function useDayPhase(): DayPhase {
  const [phase, setPhase] = useState(dayPhase);
  useEffect(() => {
    const t = setInterval(() => setPhase(dayPhase()), 60_000);
    return () => clearInterval(t);
  }, []);
  return phase;
}

function drawNight(px: Px, r: () => number) {
  // twinkly stars in the top of the sky and warm window lights
  for (let i = 0; i < 34; i++) px(Math.floor(r() * W), Math.floor(r() * 34), 1, 1, r() > 0.7 ? '#fff7d6' : '#b8c0e0');
  px(10, 8, 5, 5, '#f1ead2');
  px(11, 7, 3, 7, '#f1ead2');
}

export function PixelScene({ scene, dim = 0.55, className = '' }: { scene: SceneName; dim?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const clock = useDayPhase();
  const phase: DayPhase = OUTDOOR.includes(scene) ? clock : 'day';
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const px: Px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    DRAW[scene](px, rng(scene.length * 7919 + 17));
    if (phase === 'night') {
      ctx.fillStyle = 'rgba(16,22,52,0.55)';
      ctx.fillRect(0, 0, W, H);
      drawNight(px, rng(424242));
    }
  }, [scene, phase]);
  return (
    <div className={`pixel-scene ${className} sky-${phase}`} aria-hidden="true">
      <canvas ref={ref} width={W} height={H} style={{ objectPosition: `center ${FOCUS[scene] ?? 50}%` }} />
      <div className="pixel-sky" />
      <div className="pixel-dim" style={{ opacity: dim }} />
    </div>
  );
}
