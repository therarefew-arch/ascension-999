// 🧪 The Dungeon (preview) — a real-time side-scroller (rules in core/dungeon.ts). This file draws the town's
// wild place on a canvas, your hero from the gear you're wearing (pixel art), the monsters, the damage numbers,
// and the phone controls, plus the 📖 skill book where you drag 3 skills onto your skill bubbles.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sound } from '../audio/sound';
import { musicFor, type SoundKey } from '../audio/soundList';
import {
  BAR_SIZE, bossDef, bossOf, defaultBar, eatSnack, GROUND, newDungeon, pathProgress, SKILL_MAP, SKILLS, step, castSkill, VIEW_H, VIEW_W,
  whyCantUseSkill, type Dungeon as Run, type Input,
} from '../core/dungeon';
import { AREAS } from '../core/expedition';
import { game, useGame } from '../core/store';
import { ITEMS, type CombatStyle } from '../data/items';
import { MONSTER_MAP } from '../data/monsters';
import { METALS, WOODS } from '../data/tiers';
import { useNoScroll } from './useNoScroll';
import type { PlayerState } from '../core/player';

// ----- Saving the skill bar on this device -----
const barKey = (slot: number | null) => `ui.skillbar.${slot ?? 0}`;
function readBar(slot: number | null, p: PlayerState): (string | null)[] {
  try {
    const raw = JSON.parse(localStorage.getItem(barKey(slot)) ?? 'null');
    if (Array.isArray(raw)) return Array.from({ length: BAR_SIZE }, (_, i) => (typeof raw[i] === 'string' && !whyCantUseSkill(p, raw[i]) ? raw[i] : null));
  } catch { /* fresh */ }
  const d = defaultBar(p);
  return Array.from({ length: BAR_SIZE }, (_, i) => d[i] ?? null);
}
function writeBar(slot: number | null, bar: (string | null)[]) { try { localStorage.setItem(barKey(slot), JSON.stringify(bar)); } catch { /* full */ } }

// ----- Your hero, drawn from your gear -----
interface Look { head?: Tone; body?: Tone; legs?: Tone; shield?: Tone; weapon: 'sword' | 'bow' | 'staff' | 'fists'; wpn?: Tone; orb: string; glow: boolean }
interface Tone { base: string; light: string; dark: string }
const tone = (h: number, s: number, l: number): Tone => ({ base: `hsl(${h} ${s}% ${l}%)`, light: `hsl(${h} ${s}% ${Math.min(92, l + 16)}%)`, dark: `hsl(${h} ${s}% ${Math.max(10, l - 20)}%)` });
const GOLD: Tone = { base: '#f5c542', light: '#fff1a8', dark: '#a16207' };
const ORB: Record<string, string> = { air: '#e5e7eb', water: '#38bdf8', earth: '#a3e635', fire: '#f97316', nature: '#4ade80', frost: '#a5f3fc', shadow: '#a855f7', light: '#fde68a' };
function toneOf(id: string | undefined): Tone | undefined {
  if (!id) return undefined;
  const it = ITEMS[id];
  if (!it) return undefined;
  if (it.ascended || it.relic?.ascended) return GOLD;
  const metal = METALS.find((m) => m.key === it.tier);
  if (metal) return tone(metal.hue, metal.sat, metal.light);
  const wood = WOODS.find((w) => w.key === it.tier);
  if (wood) return tone(wood.hue, 40, wood.light);
  return tone(30, 10, 55);
}
export function lookOf(p: PlayerState): Look {
  const eq = p.equipment;
  const w = eq.weapon ? ITEMS[eq.weapon] : undefined;
  const style = w?.equip?.style;
  const weapon = !w ? 'fists' : style === 'ranged' ? 'bow' : style === 'magic' ? 'staff' : 'sword';
  return {
    head: toneOf(eq.head), body: toneOf(eq.body), legs: toneOf(eq.legs), shield: weapon === 'bow' ? undefined : toneOf(eq.shield),
    weapon, wpn: toneOf(eq.weapon), orb: ORB[w?.equip?.element ?? ''] ?? '#c4b5fd',
    glow: ['head', 'body', 'legs', 'weapon', 'shield'].some((s) => { const it = ITEMS[(eq as Record<string, string>)[s] ?? '']; return !!(it?.relic || it?.ascended); }),
  };
}
const S = 3; // one sprite pixel = 3 logical pixels (the hero is 16×24 sprite pixels)
const SKIN = '#f2c79a', SKIN_D = '#d9a07a', HAIR = '#6b3f1f', EYE = '#1f1a17', TUNIC = tone(212, 45, 45), TROUSERS = tone(25, 25, 32), BOOTS = '#3a2a1c';
/** Draws the hero with feet at (x, y). `atk` 0..1 = attack swing, `walk` = walk timer. */
export function drawHero(g: CanvasRenderingContext2D, look: Look, x: number, y: number, face: 1 | -1, o: { walk: number; atk: number; air: boolean; blink: boolean; iron: boolean; t: number }) {
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (face < 0) g.scale(-1, 1);
  if (look.glow || o.iron) {
    const r = g.createRadialGradient(0, -36, 4, 0, -36, 46);
    r.addColorStop(0, o.iron ? 'rgba(148,163,184,0.45)' : 'rgba(253,230,138,0.35)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(-48, -84, 96, 96);
  }
  if (o.blink) g.globalAlpha = 0.45;
  const px = (cx: number, cy: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect((cx - 8) * S, (cy - 24) * S, w * S, h * S); };
  const frame = Math.floor(o.walk / 110) % 4;
  const step = o.air ? 0 : [0, 1, 0, -1][frame];
  const bob = o.walk && (frame === 1 || frame === 3) ? -0 : 0;
  // Shield on the back arm
  if (look.shield) { px(2, 10 + bob, 3, 7, look.shield.base); px(2, 10 + bob, 3, 1, look.shield.light); px(3, 12 + bob, 1, 3, look.shield.dark); }
  // Back arm
  px(4, 10 + bob, 1, 5, look.body?.dark ?? TUNIC.dark); px(4, 15 + bob, 1, 1, SKIN_D);
  // Legs
  const leg = look.legs ?? TROUSERS;
  const back = o.air ? -2 : step, front = o.air ? -1 : -step;
  px(5, 16 + Math.min(0, back), 3, 6 - Math.abs(Math.min(0, back)), leg.dark);
  px(8, 16 + Math.min(0, front), 3, 6 - Math.abs(Math.min(0, front)), leg.base);
  px(5 + Math.max(0, back) * 0, 22 + Math.min(0, back), 3, 2, look.legs ? leg.dark : BOOTS);
  px(8, 22 + Math.min(0, front), 3, 2, look.legs ? leg.dark : BOOTS);
  // Body
  const body = look.body ?? TUNIC;
  px(5, 9 + bob, 6, 7, body.base); px(5, 9 + bob, 6, 1, body.light); px(5, 15 + bob, 6, 1, body.dark);
  if (look.body) { px(4, 9 + bob, 1, 2, body.light); px(11, 9 + bob, 1, 2, body.light); px(7, 11 + bob, 2, 2, body.dark); }
  else px(5, 14 + bob, 6, 1, '#4a3424');
  // Head
  px(5, 3 + bob, 6, 6, SKIN); px(5, 8 + bob, 6, 1, SKIN_D); px(9, 5 + bob, 1, 1, EYE); px(10, 7 + bob, 1, 1, '#e8a0a0');
  if (look.head) {
    px(4, 1 + bob, 8, 3, look.head.base); px(5, 1 + bob, 6, 1, look.head.light); px(4, 3 + bob, 8, 1, look.head.dark); px(4, 4 + bob, 2, 3, look.head.base);
  } else { px(5, 2 + bob, 6, 2, HAIR); px(4, 3 + bob, 2, 4, HAIR); px(10, 3 + bob, 1, 1, HAIR); }
  // Front arm + weapon (swings with the attack)
  const hand = { x: (12 - 8) * S, y: (14 + bob - 24) * S };
  g.save();
  g.translate(hand.x, hand.y);
  const swing = o.atk > 0 ? (look.weapon === 'sword' || look.weapon === 'fists' ? -1.9 + (1 - o.atk) * 2.9 : -0.2) : -0.35;
  g.rotate(look.weapon === 'staff' || look.weapon === 'bow' ? (o.atk > 0 ? -0.25 : 0) : swing);
  const q = (cx: number, cy: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(cx * S, cy * S, w * S, h * S); };
  const wt = look.wpn ?? tone(30, 10, 60);
  if (look.weapon === 'sword') { q(-1, -1, 2, 2, '#5b4636'); q(-2, -2, 4, 1, wt.dark); q(-0.5, -12, 1, 10, wt.light); q(0.5, -12, 0.5, 10, wt.base); }
  else if (look.weapon === 'bow') { q(1, -8, 1, 2, wt.base); q(2, -6, 1, 12, wt.base); q(1, 6, 1, 2, wt.base); q(o.atk > 0 ? -1 : 1, -6, 0.5, 12, '#e7e5e4'); }
  else if (look.weapon === 'staff') {
    q(0, -13, 1, 22, wt.base); q(-1, -16, 3, 3, look.orb);
    if (o.t % 600 < 300) { g.globalAlpha *= 0.6; q(-1.5, -16.5, 4, 4, look.orb); g.globalAlpha = o.blink ? 0.45 : 1; }
  }
  g.restore();
  px(11, 10 + bob, 2, 3, body.base); px(12, 13 + bob, 1, 2, SKIN);
  g.restore();
}

// ----- Monsters (emoji sprites, flipped to face where they walk) -----
const MOB_EMOJI: Record<string, string> = { rat: '🐀', sprite: '🧚', bandit: '🥷', boar: '🐗', bear: '🐻', treant: '🌳', crab: '🦀', bird: '🦅', ghost: '👻', goat: '🐐', lizard: '🦎', tortoise: '🐢', wyrm: '🐉' };
const spriteCache = new Map<string, HTMLCanvasElement>();
function sprite(emoji: string, size: number): HTMLCanvasElement {
  const key = `${emoji}@${size}`;
  let c = spriteCache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    const px = Math.ceil(size * 1.3);
    c.width = px; c.height = px;
    const g = c.getContext('2d')!;
    g.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, px / 2, px / 2 + size * 0.06);
    spriteCache.set(key, c);
  }
  return c;
}

const POP_STYLE = { hit: ['#fb923c', 15], crit: ['#f43f5e', 19], hurt: ['#c084fc', 16], heal: ['#4ade80', 16], info: ['#fde68a', 14] } as const;
const SOUND_OF: Record<string, [SoundKey, number]> = {
  jump: ['whoosh', 1.4], hit: ['hit', 1], whoosh: ['whoosh', 1], boom: ['boom', 1], shing: ['shing', 1], rune: ['rune', 1], ignite: ['ignite', 1],
  enchant: ['enchant', 1], block: ['block', 1], levelup: ['levelup', 1], tick: ['tick', 1.2], hurt: ['hurt', 1], creak: ['creak', 0.8],
};
const playSound = (k: string) => { const s = SOUND_OF[k]; if (s) sound.play(s[0], { rate: s[1] * (0.95 + Math.random() * 0.1), volume: 0.7 }); };

// ----- 🎨 Art direction (owner's reference pictures): bright chunky pixel art — teal sky, puffy clouds,
// layered hills, big leafy trees, tufted grass on layered dirt with pebbles. Each town has its own colours.
interface Theme { sky: [string, string]; cloud: [string, string]; hills: [string, string]; grass: [string, string]; dirt: [string, string, string]; leaf: [string, string, string]; trunk: string }
const THEME: Record<string, Theme> = {
  Pocketvale: { sky: ['#4fa9b0', '#a9e2d2'], cloud: ['#f0faee', '#b9e3d6'], hills: ['#5a9c84', '#3f8150'], grass: ['#69bd47', '#a7e169'], dirt: ['#8e5530', '#6c3c28', '#4b2b3c'], leaf: ['#2f7d38', '#4fa244', '#86cc5c'], trunk: '#7a4a2a' },
  Ironmoor: { sky: ['#62788f', '#b6c3cc'], cloud: ['#e4e8ec', '#b4bec8'], hills: ['#5a6672', '#46505c'], grass: ['#669a48', '#98c068'], dirt: ['#6c5a4c', '#504238', '#3a2f2a'], leaf: ['#355f36', '#4c8448', '#78a85e'], trunk: '#5a4030' },
  Coalhaven: { sky: ['#47535e', '#8d979c'], cloud: ['#b8bec2', '#8e979c'], hills: ['#3e4648', '#2f3638'], grass: ['#58784a', '#7a9a5a'], dirt: ['#4a4038', '#3a322c', '#2a2422'], leaf: ['#344f36', '#486644', '#688658'], trunk: '#3e3026' },
  Bluecliff: { sky: ['#3d9cd6', '#aadcf0'], cloud: ['#ffffff', '#c4e4f4'], hills: ['#4a9a8a', '#368566'], grass: ['#62c472', '#a6e698'], dirt: ['#c4a068', '#a4804a', '#7a5a3a'], leaf: ['#2a845a', '#46a46a', '#78c88a'], trunk: '#8a5a3a' },
  Lunaria: { sky: ['#1c2842', '#4a5a7a'], cloud: ['#8e9cb4', '#66748e'], hills: ['#2e3a52', '#253046'], grass: ['#4c6c7c', '#6e8e9e'], dirt: ['#3e4458', '#30364a', '#24283a'], leaf: ['#283e4e', '#385264', '#587286'], trunk: '#3a3440' },
  Cinderpeak: { sky: ['#7e3a28', '#e6964c'], cloud: ['#f2c494', '#d08a5a'], hills: ['#5c2e24', '#48231c'], grass: ['#8a8a3a', '#b4ae52'], dirt: ['#6a3a24', '#4f2a1c', '#3a1e16'], leaf: ['#565a28', '#787a34', '#a2a248'], trunk: '#4a2a1c' },
  Frosthold: { sky: ['#86b6e0', '#e2f2fa'], cloud: ['#ffffff', '#cfe2f2'], hills: ['#b6cee2', '#98b6d2'], grass: ['#e6f2fa', '#ffffff'], dirt: ['#8aa0b6', '#6a8098', '#4a5a70'], leaf: ['#2c5848', '#3e6e5e', '#e6f2fa'], trunk: '#5a4030' },
  Voidreach: { sky: ['#191330', '#4a3a7a'], cloud: ['#7c6caa', '#584a86'], hills: ['#2a2048', '#20183a'], grass: ['#6a4a9a', '#9a7ac8'], dirt: ['#3a2a5a', '#2a1e46', '#1e1434'], leaf: ['#463876', '#6656a0', '#a08ad0'], trunk: '#3a2a4a' },
  'Starfall Crater': { sky: ['#dc9c3e', '#f8e2a2'], cloud: ['#fff6dc', '#f0d49c'], hills: ['#b88a3a', '#9a7030'], grass: ['#c6ae48', '#e8d070'], dirt: ['#8a6a3a', '#6a5030', '#4a3a26'], leaf: ['#86963a', '#a6b64a', '#d8d870'], trunk: '#6a4a2a' },
  'Celestine Spires': { sky: ['#a4d6f8', '#f0f8ff'], cloud: ['#ffffff', '#d4e8f6'], hills: ['#c6deef', '#acc6e6'], grass: ['#d6ecf8', '#ffffff'], dirt: ['#a8c0d4', '#8aa4bc', '#6a849c'], leaf: ['#86bcd6', '#a6d2e6', '#e0f0f8'], trunk: '#8a7a6a' },
  'Primordial Rift': { sky: ['#286a4a', '#8ad2a2'], cloud: ['#daf2da', '#a8d8b0'], hills: ['#2a5a3a', '#1e4a2e'], grass: ['#489a38', '#78c858'], dirt: ['#5a3a26', '#45291c', '#301c16'], leaf: ['#1e5a26', '#2e7a34', '#5aa84a'], trunk: '#4a3020' },
};
const U = 3;
const hash = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const mix = (a: string, b: string, t: number) => {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a.toLowerCase()), p(b.toLowerCase())];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
};
/** A chunky pixel circle (rows of 3-pixel steps). */
function pixCircle(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: string) {
  g.fillStyle = c;
  for (let dy = -r; dy <= r; dy += U) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) / U) * U;
    g.fillRect(Math.round(cx / U) * U - half, Math.round((cy + dy) / U) * U, half * 2, U);
  }
}
const artCache = new Map<string, HTMLCanvasElement>();
function art(key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  let c = artCache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d')!); artCache.set(key, c); }
  return c;
}
/** A puffy cloud (3 shapes). */
const cloudArt = (t: Theme, v: number) => art(`cloud${t.sky[0]}${v}`, 150, 60, (g) => {
  const blobs = [[40, 36, 18], [66, 28, 22], [94, 34, 18], [116, 40, 12], [24, 42, 10]].map(([x, y, r]) => [x + v * 6, y - (v % 2) * 3, r]);
  for (const [x, y, r] of blobs) pixCircle(g, x, y + 6, r, t.cloud[1]);
  for (const [x, y, r] of blobs) pixCircle(g, x, y, r, t.cloud[0]);
});
/** A big leafy tree (like the reference's oak). */
const treeArt = (t: Theme, v: number) => art(`tree${t.sky[0]}${v}`, 132, 150, (g) => {
  const cx = 66;
  g.fillStyle = t.trunk; g.fillRect(cx - 12, 84, 24, 66);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(cx + 3, 84, 9, 66); g.fillRect(cx - 9, 105, 3, 21); g.fillRect(cx - 3, 126, 3, 12);
  g.fillStyle = t.trunk; g.fillRect(cx - 21, 141, 9, 9); g.fillRect(cx + 12, 141, 9, 9);
  const blobs = v === 0 ? [[66, 54, 40], [34, 66, 26], [98, 66, 26], [50, 34, 24], [84, 34, 24]] : [[66, 60, 34], [40, 72, 22], [92, 72, 22], [66, 32, 24]];
  for (const [x, y, r] of blobs) pixCircle(g, x, y + 6, r, t.leaf[0]);
  for (const [x, y, r] of blobs) pixCircle(g, x - 3, y, r - 6, t.leaf[1]);
  for (let i = 0; i < 14; i++) pixCircle(g, 24 + hash(i + v * 30) * 84, 18 + hash(i * 3 + v) * 60, 6, t.leaf[2]);
});
const bushArt = (t: Theme) => art(`bush${t.sky[0]}`, 54, 30, (g) => {
  for (const [x, y, r] of [[15, 21, 12], [30, 15, 15], [42, 21, 10]]) pixCircle(g, x, y + 3, r, t.leaf[0]);
  for (const [x, y, r] of [[15, 18, 9], [30, 12, 12], [42, 18, 7]]) pixCircle(g, x, y, r, t.leaf[1]);
  pixCircle(g, 27, 9, 4, t.leaf[2]);
});

function drawBackdrop(g: CanvasRenderingContext2D, t: Theme, cam: number, top: number, side: number) {
  // Sky in soft pixel bands
  const bands = 10;
  const y0 = -top, y1 = GROUND - 60;
  for (let i = 0; i < bands; i++) {
    g.fillStyle = mix(t.sky[0], t.sky[1], i / (bands - 1));
    g.fillRect(-side, Math.floor(y0 + (y1 - y0) * i / bands), VIEW_W + 2 * side, Math.ceil((y1 - y0) / bands) + 1);
  }
  g.fillStyle = t.sky[1]; g.fillRect(-side, y1, VIEW_W + 2 * side, GROUND - y1);
  // Clouds drifting slowly
  for (let i = 0; i < 8; i++) {
    const c = cloudArt(t, i % 3);
    const span = VIEW_W + 300;
    const x = ((i * 173 - cam * 0.12) % span + span) % span - 150;
    g.drawImage(c, Math.round(x / U) * U, Math.round((-top * 0.6 + 40 + hash(i) * 200) / U) * U);
  }
  // Two rows of hills
  for (const [k, speed, base, amp] of [[0, 0.25, 150, 34], [1, 0.45, 90, 22]] as const) {
    g.fillStyle = t.hills[k];
    for (let x = -side - (side % U); x < VIEW_W + side; x += U) {
      const wx = x + cam * speed;
      const hh = base + Math.sin(wx / 90 + k * 2) * amp + Math.sin(wx / 37) * amp * 0.35;
      const y = Math.round((GROUND - hh) / U) * U;
      g.fillRect(x, y, U + 0.7, GROUND - y);
    }
  }
}
/** Tufted grass on layered dirt with pebbles, from x1 to x2 (world x), top at y, down to `bottom`. */
function drawGround(g: CanvasRenderingContext2D, t: Theme, x1: number, x2: number, y: number, bottom: number) {
  const a = Math.floor(x1 / U) * U, b = Math.ceil(x2 / U) * U;
  g.fillStyle = t.dirt[0]; g.fillRect(a, y, b - a, bottom - y);
  for (let x = a; x < b; x += U) {
    const n = x / U;
    const d1 = y + 27 + Math.round(Math.sin(n / 5) * 2 + hash(n) * 2) * U;
    const d2 = y + 60 + Math.round(Math.sin(n / 7 + 1) * 3) * U;
    g.fillStyle = t.dirt[1]; g.fillRect(x, d1, U + 0.7, Math.max(0, bottom - d1));
    g.fillStyle = t.dirt[2]; if (d2 < bottom) g.fillRect(x, d2, U + 0.7, bottom - d2);
    // Grass with tufts
    const tuft = hash(n * 1.7) > 0.6 ? U * (1 + Math.floor(hash(n * 3.1) * 2)) : 0;
    g.fillStyle = t.grass[0]; g.fillRect(x, y - tuft, U + 0.7, 15 + tuft + (hash(n) > 0.5 ? U : 0));
    g.fillStyle = t.grass[1]; g.fillRect(x, y - tuft, U, U);
    // Pebbles
    if (hash(n * 5.3) > 0.93 && d1 + 9 < bottom) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x, d1 + 6 + Math.floor(hash(n) * 6) * U, U * 2, U); }
  }
}
/** A floating ledge: grass top, a chunk of dirt, a shadow underneath. */
function drawLedge(g: CanvasRenderingContext2D, t: Theme, x1: number, x2: number, y: number) {
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x1 + 6, y + 24, x2 - x1 - 12, 6);
  drawGround(g, t, x1, x2, y, y + 24);
  g.fillStyle = t.dirt[2]; g.fillRect(x1, y + 21, x2 - x1, 3);
}

// ----- Drawing the world -----
function drawWorld(g: CanvasRenderingContext2D, d: Run, look: Look, cam: number, top = 0, side = 0) {
  const T = THEME[d.region] ?? THEME.Pocketvale;
  drawBackdrop(g, T, cam, top, side);
  g.save();
  g.translate(-Math.round(cam), 0);
  // Big trees and bushes along the path (world-attached, like the reference)
  for (let i = 0; i < 18; i++) {
    const wx = 120 + i * 190 + Math.floor(hash(i * 7) * 80);
    if (wx < cam - 160 || wx > cam + VIEW_W + 160) continue;
    const tr = treeArt(T, i % 2);
    g.drawImage(tr, Math.round((wx - tr.width / 2) / U) * U, GROUND - tr.height + 6);
    const bu = bushArt(T);
    g.drawImage(bu, Math.round((wx + 70) / U) * U, GROUND - bu.height + 3);
  }
  // The boss's clearing: a banner pole marks the way in
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(d.arenaX, -top, d.worldW - d.arenaX, GROUND + top);
  g.fillStyle = '#e7e5e4'; g.fillRect(d.arenaX - 2, GROUND - 120, 4, 120);
  g.fillStyle = '#b91c1c'; g.fillRect(d.arenaX + 2, GROUND - 117, 30, 9); g.fillRect(d.arenaX + 2, GROUND - 108, 21, 6);
  pixCircle(g, d.arenaX, GROUND - 123, 4, '#fde68a');
  // Ground and ledges
  for (const pl of d.plats) {
    if (pl.y >= GROUND) { drawGround(g, T, cam - 12 - side, cam + VIEW_W + 12 + side, GROUND, VIEW_H); continue; }
    if (pl.x2 < cam - 20 || pl.x1 > cam + VIEW_W + 20) continue;
    drawLedge(g, T, pl.x1, pl.x2, pl.y);
  }
  // Monsters
  for (const m of d.mobs) {
    if (m.dead === 0 && m.hp <= 0) continue;
    const def = MONSTER_MAP[m.m];
    const s = sprite(MOB_EMOJI[def.art] ?? '👾', m.boss ? 84 : Math.max(m.w, m.h));
    if (m.boss && !m.dead) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(m.x, m.y + 2, 44, 8, 0, 0, Math.PI * 2); g.fill();
      const crown = sprite('👑', 22); g.drawImage(crown, m.x - crown.width / 2, m.y - m.h - 30 + Math.sin(d.t / 300) * 3);
    }
    g.save();
    g.translate(m.x, m.y - m.h / 2 + (m.hitT > 0 ? -2 : 0));
    if (m.dir > 0) g.scale(-1, 1);
    if (m.dead) g.globalAlpha = m.dead / 450;
    else if (m.hitT > 0) g.globalAlpha = 0.6;
    g.drawImage(s, -s.width / 2, -s.height / 2);
    g.restore();
    if (m.boss && (m.slamT ?? 0) > 0) {
      g.strokeStyle = `rgba(248,113,113,${0.4 + 0.4 * Math.sin(d.t / 60)})`; g.lineWidth = 3;
      g.beginPath(); g.ellipse(m.x, GROUND + 2, 170, 14, 0, 0, Math.PI * 2); g.stroke();
    }
    if (!m.boss && !m.dead && m.hp < m.maxHp) {
      g.fillStyle = '#1c1917'; g.fillRect(m.x - 18, m.y - m.h - 10, 36, 5);
      g.fillStyle = '#ef4444'; g.fillRect(m.x - 18, m.y - m.h - 10, 36 * Math.max(0, m.hp / m.maxHp), 5);
    }
  }
  // Shots
  for (const s of d.shots) {
    if (s.kind === 'arrow') { g.strokeStyle = '#e7e5e4'; g.lineWidth = 2; g.beginPath(); g.moveTo(s.x - Math.sign(s.vx) * 14, s.y); g.lineTo(s.x, s.y); g.stroke(); g.fillStyle = '#a8a29e'; g.fillRect(s.x - 2, s.y - 2, 4, 4); }
    else { g.fillStyle = s.kind === 'fire' ? '#f97316' : s.kind === 'spit' ? '#a3e635' : look.orb; g.beginPath(); g.arc(s.x, s.y, s.kind === 'fire' ? 8 : 5, 0, Math.PI * 2); g.fill(); }
  }
  // Hero (with a little shadow at its feet)
  const h = d.hero;
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(h.x, (h.onGround ? h.y : Math.min(GROUND, h.y + 60)) + 1, 14, 4, 0, 0, Math.PI * 2); g.fill();
  drawHero(g, look, h.x, h.y, h.face, { walk: h.walkT, atk: h.atkT / 240, air: !h.onGround, blink: h.invT > 0 && Math.floor(d.t / 90) % 2 === 0, iron: h.ironT > 0, t: d.t });
  // Effects
  for (const f of d.fx) {
    const k = Math.max(0, f.t) / 400;
    g.globalAlpha = 1 - k;
    if (f.kind === 'slash') {
      // A cream swoosh that tapers off (like the reference's sword trails)
      const r = (f.w ?? 50) * 0.75, cx = f.x - h.face * (f.w ?? 50) / 2;
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = i < 2 ? '#fff7e0' : '#f2e2bc'; g.lineWidth = 7 - i; g.beginPath();
        const a0 = h.face > 0 ? -1.1 + i * 0.12 : Math.PI + 1.1 - i * 0.12; const a1 = h.face > 0 ? 0.7 - i * 0.05 : Math.PI - 0.7 + i * 0.05;
        g.arc(cx, f.y, r - i * 2, Math.min(a0, a1), Math.max(a0, a1)); g.stroke();
      }
    }
    else if (f.kind === 'spin') { g.strokeStyle = '#e0f2fe'; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, (f.w ?? 70) * (0.6 + k * 0.4), 0, Math.PI * 2); g.stroke(); }
    else if (f.kind === 'boom') { g.fillStyle = '#fb923c'; g.beginPath(); g.arc(f.x, f.y, (f.w ?? 80) * (0.3 + k * 0.7), 0, Math.PI * 2); g.fill(); }
    else if (f.kind === 'zap') { g.strokeStyle = '#fef08a'; g.lineWidth = 3; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo((f.x + f.x2!) / 2 + 8, (f.y + f.y2!) / 2 - 10); g.lineTo(f.x2!, f.y2!); g.stroke(); }
    else if (f.kind === 'rain' && f.t >= 0) { g.strokeStyle = '#e7e5e4'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { const ax = f.x - (f.w ?? 150) / 2 + i * 18; g.beginPath(); g.moveTo(ax, GROUND - 90 + k * 80); g.lineTo(ax - 4, GROUND - 74 + k * 80); g.stroke(); } }
    else if (f.kind === 'slam') { g.strokeStyle = '#f87171'; g.lineWidth = 5; g.beginPath(); g.ellipse(f.x, f.y, (f.w ?? 300) / 2 * (0.4 + k * 0.6), 16, 0, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1;
  }
  // Damage numbers (MapleStory-style)
  g.textAlign = 'center'; g.lineJoin = 'round';
  for (const p of d.pops) {
    const [c, size] = POP_STYLE[p.kind];
    const lift = p.t * 0.04;
    g.globalAlpha = Math.min(1, 2 - p.t / 450);
    g.font = `900 ${size}px ui-rounded, system-ui, sans-serif`;
    g.lineWidth = 4; g.strokeStyle = '#1c1917'; g.strokeText(p.text, p.x, p.y - lift);
    g.fillStyle = c; g.fillText(p.text, p.x, p.y - lift);
  }
  g.globalAlpha = 1;
  g.restore();
}

// ----- The screen -----
export function DungeonLaunch() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="lw-launch dg-launch" onClick={() => { sound.play('click'); setOpen(true); }}>
        <span className="lw-launch-emoji">🧪</span>
        <span className="grow"><b>Dungeon <span className="dg-tag">preview</span></b><span className="small muted">Try the side-scrolling dungeon: your hero in your gear, real-time fights, and a skill book. (No rewards yet.)</span></span>
        <span className="lw-launch-go">▶</span>
      </button>
      {open && <DungeonScreen onClose={() => setOpen(false)} />}
    </>
  );
}

export function DungeonScreen({ onClose }: { onClose: () => void }) {
  const { player, slot } = useGame();
  const region = player.location;
  const [bar, setBar] = useState<(string | null)[]>(() => readBar(slot, player));
  const [run, setRun] = useState<Run>(() => newDungeon(player, region, readBar(slot, player)));
  const [book, setBook] = useState(false);
  const [, setTick] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<Input>({ left: false, right: false, jump: false, attack: false, down: false });
  const look = useRef(lookOf(player));
  const root = useRef<HTMLDivElement>(null);
  useNoScroll(root);

  useEffect(() => {
    sound.playMusic(musicFor(region));
  }, [region]);

  // The game loop
  useEffect(() => {
    let raf = 0;
    let timer = 0;
    // Animation frames, with a slow backup timer in case the browser holds frames back.
    const schedule = () => { raf = requestAnimationFrame(loop); timer = window.setTimeout(() => { cancelAnimationFrame(raf); loop(performance.now()); }, 50); };
    let last = performance.now();
    let hudAt = 0;
    const loop = (now: number) => {
      clearTimeout(timer);
      const dt = now - last;
      last = now;
      if (!book) {
        const before = run.phase;
        for (const s of step(run, dt, input.current)) playSound(s);
        if (run.phase !== before) { playSound(run.phase === 'won' ? 'levelup' : 'hurt'); if (run.phase === 'won') sound.play('levelup', { rate: 1.25 }); else sound.play('fail'); }
      }
      const c = canvas.current;
      if (c) {
        const g = c.getContext('2d')!;
        const cam = Math.max(0, Math.min(run.worldW - VIEW_W, run.hero.x - VIEW_W * 0.4));
        // Fill the whole screen: fit the 360-wide world to the width, ground near the bottom, extra sky on top.
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const cw = c.clientWidth, ch = c.clientHeight;
        if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); }
        const sc = Math.min(cw / VIEW_W, ch / VIEW_H) * dpr;
        const ox = (c.width - VIEW_W * sc) / 2, oy = c.height - VIEW_H * sc;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = '#0f172a'; g.fillRect(0, 0, c.width, c.height);
        g.setTransform(sc, 0, 0, sc, ox, oy);
        g.imageSmoothingEnabled = false;
        drawWorld(g, run, look.current, cam, oy / sc, ox / sc);
      }
      if (now - hudAt > 120) { hudAt = now; setTick((n) => n + 1); }
      schedule();
    };
    schedule();
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [run, book]);

  // Keyboard (for testing on a computer)
  useEffect(() => {
    const set = (e: KeyboardEvent, on: boolean) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') input.current.left = on;
      else if (k === 'arrowright' || k === 'd') input.current.right = on;
      else if (k === 'arrowup' || k === 'w' || k === ' ') input.current.jump = on;
      else if (k === 'arrowdown' || k === 's') input.current.down = on;
      else if (k === 'j' || k === 'z') input.current.attack = on;
      else if (on && ['1', '2', '3'].includes(k)) skill(Number(k) - 1);
      else return;
      e.preventDefault();
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  });

  const hold = (k: keyof Input, tapSound?: SoundKey) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); input.current[k] = true; if (tapSound) sound.play(tapSound, { volume: 0.35, rate: 1.3 }); },
    onPointerUp: () => { input.current[k] = false; },
    onPointerCancel: () => { input.current[k] = false; },
    onLostPointerCapture: () => { input.current[k] = false; },
  });
  const skill = (i: number) => {
    const s = castSkill(run, i);
    if (s) playSound(s); else sound.play('tick', { rate: 0.7, volume: 0.4 });
  };
  const again = () => { sound.play('click'); look.current = lookOf(game.player()); setRun(newDungeon(game.player(), region, bar)); };
  const saveBar = (b: (string | null)[]) => { setBar(b); writeBar(slot, b); run.bar = b; };

  const h = run.hero;
  const boss = bossOf(run);
  const bossOn = boss && h.x > run.arenaX - 40;

  return createPortal(
    <div className="dg-root" ref={root}>
      <canvas ref={canvas} className="dg-canvas" />
      <div className="dg-hud">
        <div className="dg-hp"><div style={{ width: `${(100 * h.hp) / h.maxHp}%` }} /><span className="mono">{Math.max(0, Math.round(h.hp)).toLocaleString()} / {h.maxHp.toLocaleString()}</span></div>
        <button className="dg-icon" onClick={() => { sound.play('click'); setBook(true); }} aria-label="Skill book">📖</button>
        <button className="dg-icon" onClick={() => { sound.play('click'); onClose(); }} aria-label="Leave">✕</button>
      </div>
      <div className="dg-sub">
        <span className="small">{AREAS[region].emoji} {AREAS[region].name[0].toUpperCase() + AREAS[region].name.slice(1)}</span>
        {bossOn && boss ? (
          <div className="dg-boss"><b className="tiny">👑 {bossDef(run).name}</b><div className="dg-bar"><div style={{ width: `${(100 * Math.max(0, boss.hp)) / boss.maxHp}%` }} /></div></div>
        ) : <div className="dg-bar path"><div style={{ width: `${pathProgress(run) * 100}%` }} /></div>}
      </div>

      <div className="dg-controls">
        <div className="dg-pad">
          <button className="dg-btn dir" {...hold('left', 'tick')} aria-label="Left">◀</button>
          <button className="dg-btn dir" {...hold('right', 'tick')} aria-label="Right">▶</button>
          <button className="dg-btn small" {...hold('down', 'tick')} aria-label="Down (hold with Jump to drop down)">▼</button>
          <button className="dg-btn small snack" disabled={run.snacks <= 0} onClick={() => { if (eatSnack(run)) sound.play('eat'); else sound.play('error', { volume: 0.5 }); }} aria-label={`Snack (${run.snacks} left)`}>🍖<span className="dg-n">{run.snacks}</span></button>
        </div>
        <div className="dg-act">
          <div className="dg-skills">
            {bar.map((id, i) => {
              const s = id ? SKILL_MAP[id] : null;
              const cd = id ? (run.cd[id] ?? 0) : 0;
              return (
                <button key={i} className={`dg-skill ${s ? '' : 'empty'}`} onPointerDown={(e) => { e.preventDefault(); if (s) skill(i); else { sound.play('click'); setBook(true); } }} aria-label={s ? s.name : 'Empty skill bubble'}
                  style={{ ['--cd' as string]: s && cd > 0 ? `${(cd / s.cdMs) * 360}deg` : '0deg' }}>
                  <span>{s ? s.emoji : '+'}</span>
                </button>
              );
            })}
          </div>
          <div className="dg-main">
            <button className="dg-btn jump" {...hold('jump', 'whoosh')} aria-label="Jump">⤒</button>
            <button className="dg-btn attack" {...hold('attack')} aria-label="Attack">{run.style === 'ranged' ? '🏹' : run.style === 'magic' ? '🪄' : '⚔️'}</button>
          </div>
        </div>
      </div>

      {run.phase !== 'play' && (
        <div className="dg-over">
          <div className="dg-panel">
            <div className="dg-big">{run.phase === 'won' ? '🏆' : '😵‍💫'}</div>
            <b className="gold">{run.phase === 'won' ? `You beat ${bossDef(run).name}!` : 'Knocked out!'}</b>
            <p className="small muted center">{run.kills} monsters beaten. This is a preview to try the controls and looks — no rewards yet.</p>
            <button className="btn btn-hero" onClick={again}>PLAY AGAIN</button>
            <button className="btn" onClick={() => { sound.play('click'); onClose(); }}>Leave</button>
          </div>
        </div>
      )}
      {book && <SkillBook player={player} bar={bar} onBar={saveBar} style={run.style} onClose={() => { sound.play('click'); setBook(false); }} />}
    </div>,
    document.body,
  );
}

// ----- 📖 The skill book: drag 3 skills onto your bubbles -----
function SkillBook({ player, bar, onBar, style, onClose }: { player: PlayerState; bar: (string | null)[]; onBar: (b: (string | null)[]) => void; style: CombatStyle; onClose: () => void }) {
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; sx: number; sy: number } | null>(null);
  const moved = !!drag && Math.hypot(drag.x - drag.sx, drag.y - drag.sy) > 8;
  const [picked, setPicked] = useState<string | null>(null);
  const place = (i: number, id: string) => {
    const b = bar.map((x) => (x === id ? null : x));
    b[i] = id;
    onBar(b);
    sound.play('match', { volume: 0.6, rate: 1.1 + i * 0.1 });
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    const up = (e: PointerEvent) => {
      const far = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8;
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-bubble]') as HTMLElement | null;
      if (far && el) { place(Number(el.dataset.bubble), drag.id); setPicked(null); }
      else if (far) sound.play('whoosh', { volume: 0.4 });
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const groups: [CombatStyle | 'defense', string][] = [[style, style === 'melee' ? '⚔️ Melee' : style === 'ranged' ? '🏹 Ranged' : '🪄 Magic'], ['defense', '🛡️ Defence'],
    ...(['melee', 'ranged', 'magic'] as CombatStyle[]).filter((s) => s !== style).map((s): [CombatStyle, string] => [s, s === 'melee' ? '⚔️ Melee' : s === 'ranged' ? '🏹 Ranged' : '🪄 Magic'])];
  return (
    <div className="dg-over book">
      <div className="dg-book">
        <div className="row-between"><b className="gold">📖 Skill book</b><button className="dg-icon" onClick={onClose} aria-label="Close">✕</button></div>
        <p className="tiny muted">Drag a skill onto a bubble (or tap a skill, then a bubble). Skills unlock as your combat levels grow; style skills need that style's weapon.</p>
        <div className="dg-book-bar">
          {bar.map((id, i) => (
            <button key={i} data-bubble={i} className={`dg-skill big ${id ? '' : 'empty'} ${picked ? 'ready' : ''}`}
              onClick={() => { if (picked) { place(i, picked); setPicked(null); } else if (id) { const b = [...bar]; b[i] = null; onBar(b); sound.play('whoosh', { volume: 0.5 }); } }}
              aria-label={id ? `${SKILL_MAP[id].name} (tap to remove)` : `Empty bubble ${i + 1}`}>
              <span>{id ? SKILL_MAP[id].emoji : i + 1}</span>
            </button>
          ))}
        </div>
        <div className="dg-book-list">
          {groups.map(([g, label]) => (
            <div key={g}>
              <h4 className="dg-book-h">{label}</h4>
              {SKILLS.filter((s) => s.style === g).map((s) => {
                const why = whyCantUseSkill(player, s.id);
                return (
                  <div key={s.id} className={`dg-card ${why ? 'locked' : ''} ${picked === s.id ? 'picked' : ''} ${bar.includes(s.id) ? 'on' : ''}`}
                    onPointerDown={(e) => { if (why) { sound.play('error', { volume: 0.4 }); return; } e.preventDefault(); sound.play('card', { volume: 0.5 }); setDrag({ id: s.id, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }); }}
                    onClick={() => { if (!why) setPicked(picked === s.id ? null : s.id); }}>
                    <span className="dg-card-emoji">{why ? '🔒' : s.emoji}</span>
                    <span className="grow"><b className="small">{s.name}</b><span className="tiny muted dg-card-text">{why ?? s.text}</span></span>
                    <span className="tiny mono muted">{(s.cdMs / 1000).toFixed(s.cdMs % 1000 ? 1 : 0)}s</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {drag && moved && <div className="dg-ghost" style={{ left: drag.x, top: drag.y }}>{SKILL_MAP[drag.id].emoji}</div>}
    </div>
  );
}
