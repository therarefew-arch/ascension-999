// Pixel-art backdrops drawn in code at low resolution, then scaled up with crisp pixels.
// Our own art — no image files needed. Each scene is the same every time (seeded).
import { useEffect, useRef } from 'react';

export type SceneName = 'forest' | 'town' | 'mine' | 'forge' | 'river' | 'camp' | 'kitchen' | 'workshop' | 'tower';

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

const DRAW: Record<SceneName, (px: Px, r: () => number) => void> = {
  forest: drawForest, town: drawTown, mine: drawMine, forge: drawForge,
  river: drawRiver, camp: drawCamp, kitchen: drawKitchen, workshop: drawWorkshop, tower: drawTower,
};

export function PixelScene({ scene, dim = 0.55, className = '' }: { scene: SceneName; dim?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const px: Px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    DRAW[scene](px, rng(scene.length * 7919 + 17));
  }, [scene]);
  return (
    <div className={`pixel-scene ${className}`} aria-hidden="true">
      <canvas ref={ref} width={W} height={H} />
      <div className="pixel-dim" style={{ opacity: dim }} />
    </div>
  );
}
