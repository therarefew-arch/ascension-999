// Pixel-art backdrops drawn in code at low resolution, then scaled up with crisp pixels.
// Our own art — no image files needed. Each scene is the same every time (seeded).
import { useEffect, useRef, useState } from 'react';

export type SceneName = 'forest' | 'town' | 'mine' | 'forge' | 'river' | 'camp' | 'kitchen' | 'workshop' | 'tower' | 'altar' | 'ironmoor' | 'coalhaven' | 'bluecliff';

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

export const DRAW: Record<SceneName, (px: Px, r: () => number) => void> = {
  forest: drawForest, town: drawTown, mine: drawMine, forge: drawForge,
  river: drawRiver, camp: drawCamp, kitchen: drawKitchen, workshop: drawWorkshop, tower: drawTower, altar: drawAltar, ironmoor: drawIronmoor, coalhaven: drawCoalhaven, bluecliff: drawBluecliff,
};

/** Where the interesting part of each scene is (0% = top, 100% = bottom), for short banners. */
const FOCUS: Partial<Record<SceneName, number>> = { bluecliff: 22, coalhaven: 46, ironmoor: 50, town: 50 };

/** Outdoor scenes follow the real clock on your phone. Indoor ones stay cosy all day. */
const OUTDOOR: SceneName[] = ['forest', 'town', 'river', 'ironmoor', 'coalhaven', 'bluecliff'];

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
