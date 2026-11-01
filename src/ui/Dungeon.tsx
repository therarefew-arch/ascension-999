// 🧪 The Dungeon (preview) — a real-time side-scroller (rules in core/dungeon.ts). This file draws the town's
// wild place on a canvas, your hero from the gear you're wearing (pixel art), the monsters, the damage numbers,
// and the phone controls, plus the 📖 skill book where you drag 3 skills onto your skill bubbles.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sound } from '../audio/sound';
import { musicFor, type SoundKey } from '../audio/soundList';
import {
  BAR_SIZE, FALL_WARN, HARVEST_MS, VENT, HERO_H, NODE_KINDS, type NodeKind, bossDef, bossOf, defaultBar, eatSnack, GROUND, newDungeon, pathProgress, SKILL_MAP, SKILLS, step, castSkill, VIEW_H, VIEW_W, BUFF_EMOJI, type Buff,
  whyCantUseSkill, type Dungeon as Run, type Input,
} from '../core/dungeon';
import { AREAS, townBoss, type Run as ExRun } from '../core/expedition';
import { DUNGEON_TOWNS } from '../data/dungeonTowns';
import { draughtPrice, DRAUGHT_HEAL, foodPrice, trailFood, wickPays } from '../market/dungeonShop';
import { addStacks, bagGold, canExtract, foodCount, FOOD_MAX, nextChoices, ROOM_INFO, roomOf, whyCantHarvest, type DungeonRun } from '../core/dungeonRun';
import { maxHp } from '../core/combat';
import { art, artCache, drawAtmos, drawFar, drawSky, hash, pixCircle, propArt, sceneryOf, U } from './dungeonScenery';
import { countInBag, countInBank } from '../core/inventory';
import { FURNITURE_MAP } from '../core/cottage';
import { PET_MAP } from '../data/pets';
import { SKILLS as SKILL_INFO } from '../data/skills';
import { ItemIcon } from './icons';
import { game, useGame } from '../core/store';
import { ITEMS, type CombatStyle, type EquipSlot } from '../data/items';
import { MONSTER_MAP } from '../data/monsters';
import { METALS, WOODS } from '../data/tiers';
import { useNoScroll } from './useNoScroll';
import type { ItemStack, PlayerState } from '../core/player';

// ----- Saving the skill bar on this device -----
const barKey = (slot: number | null) => `ui.skillbar.${slot ?? 0}`;
function readBar(slot: number | null, p: PlayerState): (string | null)[] {
  try {
    const raw = JSON.parse(localStorage.getItem(barKey(slot)) ?? 'null');
    if (Array.isArray(raw)) {
      const bar = Array.from({ length: BAR_SIZE }, (_, i) => (typeof raw[i] === 'string' && !whyCantUseSkill(p, raw[i]) ? raw[i] : null));
      // A bar saved before the 4th bubble (v0.0.1.84): fill the new bubble with your best unused skill.
      if (raw.length < BAR_SIZE) for (let i = raw.length; i < BAR_SIZE; i++) bar[i] = defaultBar(p).concat(SKILLS.filter((s) => !whyCantUseSkill(p, s.id)).reverse().map((s) => s.id)).find((id) => !bar.includes(id)) ?? null;
      return bar;
    }
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
  if (o.atk > 0) g.translate(Math.round(Math.sin((1 - o.atk) * Math.PI) * 4), 0);
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
  // p goes 0 → 1 through the attack (short and snappy)
  const p = o.atk > 0 ? 1 - o.atk : -1;
  const ease = (v: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);
  const q = (cx: number, cy: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(cx * S, cy * S, w * S, h * S); };
  const wt = look.wpn ?? tone(30, 10, 60);
  if (look.weapon === 'sword' || look.weapon === 'fists') {
    // Wind up behind, then a fast swing down and forward, leaving afterimages
    const angleAt = (v: number) => (v < 0 ? -0.35 : v < 0.22 ? -1.9 - v * 1.4 : -2.2 + ease((v - 0.22) / 0.78) * 3.4);
    const blade = (a: number, alpha: number, ghost: boolean) => {
      g.save(); g.rotate(a); g.globalAlpha *= alpha;
      if (look.weapon === 'sword') {
        if (ghost) q(-0.5, -12, 1.5, 10, '#fff7e0');
        else { q(-1, -1, 2, 2, '#5b4636'); q(-2, -2, 4, 1, wt.dark); q(-0.5, -12, 1, 10, wt.light); q(0.5, -12, 0.5, 10, wt.base); }
      } else if (!ghost) q(-1, -2, 2, 2, SKIN);
      g.restore();
    };
    if (p > 0.25 && p < 0.95) { blade(angleAt(p - 0.16), 0.22, true); blade(angleAt(p - 0.08), 0.4, true); }
    blade(angleAt(p), 1, false);
  } else if (look.weapon === 'bow') {
    // Draw the string back with an arrow nocked, then release (the string snaps forward)
    const drawn = p >= 0 && p < 0.55;
    g.translate(p >= 0 ? S : 0, 0);
    q(1, -8, 1, 2, wt.base); q(2, -6, 1, 12, wt.base); q(1, 6, 1, 2, wt.base);
    const pull = drawn ? -1 - ease(p / 0.55) * 3 : 1;
    q(pull, -6, 0.5, 6, '#e7e5e4'); q(pull, 0, 0.5, 6, '#e7e5e4');
    if (drawn) { q(pull, -0.5, 6 - pull, 0.5, '#d6d3d1'); q(5, -1, 1, 1.5, '#a8a29e'); }
  } else if (look.weapon === 'staff') {
    // Thrust the staff forward; the orb flares as the spell leaves it
    const thrust = p >= 0 ? Math.sin(p * Math.PI) : 0;
    g.translate(thrust * 6, -thrust * 2);
    g.rotate(p >= 0 ? 0.25 - thrust * 0.5 : 0);
    q(0, -13, 1, 22, wt.base); q(-1, -16, 3, 3, look.orb);
    const flare = p > 0.2 && p < 0.7 ? 1 : o.t % 600 < 300 ? 0.5 : 0;
    if (flare) { const a = g.globalAlpha; g.globalAlpha *= 0.6 * flare; q(-2.5, -17.5, 6, 6, look.orb); g.globalAlpha = a; }
  }
  g.restore();
  px(11, 10 + bob, 2, 3, body.base); px(12, 13 + bob, 1, 2, SKIN);
  g.restore();
}

// ----- Monsters (emoji sprites, flipped to face where they walk) -----
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

/** Damage number look: fill, outline, size. Crits are bigger with a bright gold edge. */
const POP_STYLE = {
  hit: ['#ffb347', '#3b1d0b', 19], crit: ['#ff4d6d', '#fff1a8', 25], hurt: ['#c084fc', '#2e1065', 18], heal: ['#4ade80', '#052e16', 18], info: ['#fde68a', '#1c1917', 15],
} as const;
const SOUND_OF: Record<string, [SoundKey, number]> = {
  jump: ['whoosh', 1.4], hit: ['hit', 1], whoosh: ['whoosh', 1], boom: ['boom', 1], shing: ['shing', 1], rune: ['rune', 1], ignite: ['ignite', 1],
  enchant: ['enchant', 1], block: ['block', 1], levelup: ['levelup', 1], tick: ['tick', 1.2], hurt: ['hurt', 1], creak: ['creak', 0.8], eat: ['eat', 1.1], coin: ['coin', 1], mine: ['mine', 1], chop: ['chop', 1], splash: ['splash', 1], carve: ['carve', 1],
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
  'Starfall Crater': { sky: ['#7a5ea8', '#efb88f'], cloud: ['#fff6dc', '#f0d49c'], hills: ['#b88a3a', '#9a7030'], grass: ['#c6ae48', '#e8d070'], dirt: ['#8a6a3a', '#6a5030', '#4a3a26'], leaf: ['#86963a', '#a6b64a', '#d8d870'], trunk: '#6a4a2a' },
  'Celestine Spires': { sky: ['#a4d6f8', '#f0f8ff'], cloud: ['#ffffff', '#d4e8f6'], hills: ['#c6deef', '#acc6e6'], grass: ['#d6ecf8', '#ffffff'], dirt: ['#a8c0d4', '#8aa4bc', '#6a849c'], leaf: ['#86bcd6', '#a6d2e6', '#e0f0f8'], trunk: '#8a7a6a' },
  'Primordial Rift': { sky: ['#286a4a', '#8ad2a2'], cloud: ['#daf2da', '#a8d8b0'], hills: ['#2a5a3a', '#1e4a2e'], grass: ['#489a38', '#78c858'], dirt: ['#5a3a26', '#45291c', '#301c16'], leaf: ['#1e5a26', '#2e7a34', '#5aa84a'], trunk: '#4a3020' },
};
const mix = (a: string, b: string, t: number) => {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a.toLowerCase()), p(b.toLowerCase())];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
};
/** A puffy cloud (3 shapes). */
const cloudArt = (t: Theme, v: number) => art(`cloud${t.sky[0]}${v}`, 150, 60, (g) => {
  const blobs = [[40, 36, 18], [66, 28, 22], [94, 34, 18], [116, 40, 12], [24, 42, 10]].map(([x, y, r]) => [x + v * 6, y - (v % 2) * 3, r]);
  for (const [x, y, r] of blobs) pixCircle(g, x, y + 6, r, t.cloud[1]);
  for (const [x, y, r] of blobs) pixCircle(g, x, y, r, t.cloud[0]);
});
function drawBackdrop(g: CanvasRenderingContext2D, t: Theme, region: string, now: number, cam: number, top: number, side: number) {
  const sc = sceneryOf(region);
  // Sky in soft pixel bands
  const bands = 10;
  const y0 = -top, y1 = GROUND - 60;
  for (let i = 0; i < bands; i++) {
    g.fillStyle = mix(t.sky[0], t.sky[1], i / (bands - 1));
    g.fillRect(-side, Math.floor(y0 + (y1 - y0) * i / bands), VIEW_W + 2 * side, Math.ceil((y1 - y0) / bands) + 1);
  }
  g.fillStyle = t.sky[1]; g.fillRect(-side, y1, VIEW_W + 2 * side, GROUND - y1);
  drawSky(g, region, now, cam, top, side, VIEW_W);
  // Clouds drifting slowly
  const nClouds = Math.max(8, Math.ceil((VIEW_W + 2 * side) / 60));
  for (let i = 0; i < nClouds; i++) {
    const c = cloudArt(t, i % 3);
    const span = VIEW_W + 2 * side + 300;
    const x = ((i * 173 - cam * 0.12) % span + span) % span - 150 - side;
    g.drawImage(c, Math.round(x / U) * U, Math.round((-top * 0.6 + 40 + hash(i) * 200) / U) * U);
  }
  // Two rows of hills
  for (const [k, speed, base, amp] of [[0, 0.25, 150, 34], [1, 0.45, 90, 22]] as const) {
    if (k === 0 && !sc.farHills) continue;
    if (k === 1) drawFar(g, region, now, cam, side, VIEW_W);
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

// ----- 👾 Pixel-art monsters (v0.0.1.69): drawn from little pixel maps in each monster's own colours,
// with a dark outline, a 2-step walk, and a white flash when hit. b = body, d = dark, a = accent, e = eye, w = white.
const MOB_PIX: Record<string, string[][]> = {
  rat: [[
    '...........dd...', '..........dbbd..', '.ddddddddddbbbd.', 'dbbbbbbbbbbbebbd', 'dbbbbbbbbbbbbbaa', 'adbbbbbbbbbbbdd.', 'a.dddddddddddd..', '..d.d......d.d..',
  ], ['...........dd...', '..........dbbd..', '.ddddddddddbbbd.', 'dbbbbbbbbbbbebbd', 'dbbbbbbbbbbbbbaa', 'adbbbbbbbbbbbdd.', 'a.dddddddddddd..', '...d.d....d.d...']],
  sprite: [[
    'ww........ww', 'www.aaaa.www', '.wwabbbbaww.', '..abebbeba..', '..abbbbbba..', '..abbddbba..', '...abbbba...', '....dbbd....', '.....dd.....',
  ], ['.w........w.', 'www.aaaa.www', 'wwwabbbbawww', '..abebbeba..', '..abbbbbba..', '..abbddbba..', '...abbbba...', '....dbbd....', '.....dd.....']],
  bandit: [[
    '....dddd....', '...dbbbbd...', '...dbbewd...', '...dbbbbd...', '....dddd....', '..dbbbbbbd..', '.dbbbaabbbd.', '.dbbbbbbbbd.', '..dbbbbbbd..', '..ddbbbbdd..', '...db..bd...', '...db..bd...', '...dd..dd...',
  ], ['....dddd....', '...dbbbbd...', '...dbbewd...', '...dbbbbd...', '....dddd....', '..dbbbbbbd..', '.dbbbaabbbd.', '.dbbbbbbbbd.', '..dbbbbbbd..', '..ddbbbbdd..', '..db....bd..', '..db....bd..', '..dd....dd..']],
  boar: [[
    '..dd.......d....', '.dbbdddddddbd...', 'dbbbbbbbbbbbbd..', 'dbbbbbbbbbbebbd.', 'dbbbbbbbbbbbbbaa', 'dbbbbbbbbbbbbbad', '.dbbbbbbbbbbbdd.', '..dddddddddddd..', '..dd.dd...dd.dd.', '..dd.dd...dd.dd.',
  ], ['..dd.......d....', '.dbbdddddddbd...', 'dbbbbbbbbbbbbd..', 'dbbbbbbbbbbebbd.', 'dbbbbbbbbbbbbbaa', 'dbbbbbbbbbbbbbad', '.dbbbbbbbbbbbdd.', '..dddddddddddd..', '.dd..dd..dd..dd.', '.d...d....d...d.']],
  bear: [[
    '..........dd....', '.........dbbd.d.', '...dddddddbbbdbd', '..dbbbbbbbbbbbed', '.dbbbbbbbbbbbbaa', 'dbbbbbbbbbbbbbad', 'dbbbbbbbbbbbbdd.', 'dbbbbbbbbbbbbd..', '.dbbbbbbbbbbd...', '..ddd.dd.ddd....', '..dd..dd..dd....',
  ], ['..........dd....', '.........dbbd.d.', '...dddddddbbbdbd', '..dbbbbbbbbbbbed', '.dbbbbbbbbbbbbaa', 'dbbbbbbbbbbbbbad', 'dbbbbbbbbbbbbdd.', 'dbbbbbbbbbbbbd..', '.dbbbbbbbbbbd...', '.ddd..dd..ddd...', '.dd...dd...dd...']],
  treant: [[
    '...aaa..aaa...', '..aabaaaabaa..', '.aabbbaabbbaa.', 'aabbbbbbbbbbaa', '.aabbbbbbbbaa.', '...dddddddd...', '...dbbbbbbd...', '...dbebbebd...', '...dbbbbbbd...', '...dbbddbbd...', '...dbbbbbbd...', '..ddbbbbbbdd..', '.dd.dbbbbd.dd.', '....dd..dd....',
  ], ['...aaa..aaa...', '..aabaaaabaa..', '.aabbbaabbbaa.', 'aabbbbbbbbbbaa', '.aabbbbbbbbaa.', '...dddddddd...', '...dbbbbbbd...', '...dbebbebd...', '...dbbbbbbd...', '...dbbddbbd...', '...dbbbbbbd...', '..ddbbbbbbdd..', '..dddbbbbddd..', '...dd....dd...']],
  crab: [[
    '.dd..........dd.', 'daad........daad', '.dd..........dd.', '..d..dddddd..d..', '...ddbbbbbbdd...', '..dbbebbbbebbd..', '..dbbbbbbbbbbd..', '...dbbbbbbbbd...', '..d.d.d..d.d.d..', '.d..d.d..d.d..d.',
  ], ['dd............dd', 'aad..........daa', 'dd............dd', '..d..dddddd..d..', '...ddbbbbbbdd...', '..dbbebbbbebbd..', '..dbbbbbbbbbbd..', '...dbbbbbbbbd...', '.d.d.d....d.d.d.', 'd..d.d....d.d..d']],
  bird: [[
    '......ddd.....', '.....dbbbd....', '....dbbbebaa..', '....dbbbbbd...', 'dddddbbbbbd...', '.dbbbbbbbbd...', '..dbbbbbbd....', '...ddbbbd.....', '.....a..a.....', '....aa.aa.....',
  ], ['d.....ddd.....', 'dd...dbbbd....', '.dd.dbbbebaa..', '..ddbbbbbbd...', '...dbbbbbbd...', '...dbbbbbbd...', '...dbbbbbd....', '...ddbbbd.....', '.....a..a.....', '....aa.aa.....']],
  ghost: [[
    '...dddddd...', '..dbbbbbbd..', '.dbbbbbbbbd.', '.dbbebbebbd.', '.dbbbbbbbbd.', '.dbbbaabbbd.', '.dbbbbbbbbd.', '.dbbbbbbbbd.', '.dbdbbdbbdb.', '.d.d.dd.d.d.',
  ], ['...dddddd...', '..dbbbbbbd..', '.dbbbbbbbbd.', '.dbbebbebbd.', '.dbbbbbbbbd.', '.dbbbaabbbd.', '.dbbbbbbbbd.', '.dbbbbbbbbd.', '.bdbbdbbdbd.', '..d.dd.d.d..']],
  goat: [[
    '..........a.a.', '..........aa..', '........dbbd..', '........dbebd.', '..ddddddbbbbbd', '.dbbbbbbbbbdd.', 'dbbbbbbbbbbd..', 'dbbbbbbbbbbd..', '.dbbbbbbbbd...', '..dd.dd.dd.dd.', '..dd.dd.dd.dd.', '..aa.aa.aa.aa.',
  ], ['..........a.a.', '..........aa..', '........dbbd..', '........dbebd.', '..ddddddbbbbbd', '.dbbbbbbbbbdd.', 'dbbbbbbbbbbd..', 'dbbbbbbbbbbd..', '.dbbbbbbbbd...', '.dd..dd.dd..dd', '.dd..dd.dd..dd', '.aa..aa.aa..aa']],
  lizard: [[
    '..............ddd.', 'aa..dddddddddbbebd', '.adbbbbbbbbbbbbbbd', '..ddbbbbbbbbbbbdd.', '....dd.dd...dd.dd.', '....d...d...d...d.',
  ], ['..............ddd.', 'aa..dddddddddbbebd', '.adbbbbbbbbbbbbbbd', '..ddbbbbbbbbbbbdd.', '...dd.dd.....dd.dd', '...d...d.....d...d']],
  tortoise: [[
    '....aaaaaaa.....', '..aadaadaadaa...', '.aaaaaaaaaaaa.dd', 'aaaaaaaaaaaaadbe', 'ddddddddddddddbb', '.dbb..dbb.dbb.dd', '.dbb..dbb.dbb...',
  ], ['....aaaaaaa.....', '..aadaadaadaa...', '.aaaaaaaaaaaa.dd', 'aaaaaaaaaaaaadbe', 'ddddddddddddddbb', 'dbb..dbb..dbb.dd', 'dbb..dbb..dbb...']],
  wyrm: [[
    '................dd..', '...............dbbd.', '..aa.aa.......dbbebd', '.abbaabba....dbbbbaa', 'abbbbbbbbaa.dbbbbd..', 'dbbbbbbbbbbbbbbbd...', '.dbbbbbbbbbbbbbd....', '..ddbbbbbbbbbdd.....', '....dd.dd.dd.dd.....', '....d..d..d..d......',
  ], ['................dd..', '...............dbbd.', '.aa..aa.......dbbebd', 'abbaabbba....dbbbbaa', 'abbbbbbbbaa.dbbbbd..', 'dbbbbbbbbbbbbbbbd...', '.dbbbbbbbbbbbbbd....', '..ddbbbbbbbbbdd.....', '...dd.dd...dd.dd....', '...d..d.....d..d....']],
};
const FLOATS = new Set(['sprite', 'ghost', 'bird']);
const OUTLINE = '#1b1424';
function pixMob(art: string, colors: { body: string; dark: string; accent: string }, frame: number, flash: boolean): HTMLCanvasElement {
  const key = `${art}|${colors.body}|${colors.dark}|${colors.accent}|${frame}|${flash}`;
  let c = artCache.get(key);
  if (c) return c;
  const rows = (MOB_PIX[art] ?? MOB_PIX.rat)[frame % 2];
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  c = document.createElement('canvas');
  c.width = w + 2; c.height = h + 2;
  const g = c.getContext('2d')!;
  const col = (ch: string) => (ch === '.' ? null : flash ? (ch === 'e' ? '#fde68a' : '#ffffff') : ch === 'b' ? colors.body : ch === 'd' ? colors.dark : ch === 'a' ? colors.accent : ch === 'e' ? '#111111' : ch === 'w' ? '#e0f2fe' : null);
  // Outline first: every filled pixel's neighbours in dark
  g.fillStyle = OUTLINE;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') { g.fillRect(x, y + 1, 3, 1); g.fillRect(x + 1, y, 1, 3); } }));
  rows.forEach((r, y) => [...r].forEach((ch, x) => { const cc = col(ch); if (cc) { g.fillStyle = cc; g.fillRect(x + 1, y + 1, 1, 1); } }));
  if (!flash) {
    // Light from the top-left: a highlight where nothing is above, a shade where nothing is below.
    const at = (x: number, y: number) => (rows[y]?.[x] ?? '.');
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (ch !== 'b' && ch !== 'a') return;
      if (at(x, y - 1) === '.' || at(x - 1, y) === '.') { g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(x + 1, y + 1, 1, 1); }
      else if (at(x, y + 1) === '.' || at(x, y + 1) === 'd' || at(x + 1, y) === '.') { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 1, y + 1, 1, 1); }
    }));
    // Glowing eyes
    rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'e') { g.fillStyle = 'rgba(253,224,71,0.9)'; g.fillRect(x + 1, y + 1, 1, 1); } }));
  }
  artCache.set(key, c);
  return c;
}

// ----- 🌦️ Ambient weather per town -----
const WEATHER: Record<string, { n: number; c: string[]; vx: number; vy: number; s: number; glow?: boolean; sway?: number }> = {
  Pocketvale: { n: 14, c: ['#86cc5c', '#c6e86a', '#e8a84c'], vx: -0.012, vy: 0.022, s: 3, sway: 18 },
  Ironmoor: { n: 18, c: ['#d6d3d1', '#a8a29e'], vx: 0.004, vy: -0.006, s: 2 },
  Coalhaven: { n: 26, c: ['#78716c', '#a8a29e', '#57534e'], vx: 0.01, vy: 0.012, s: 2 },
  Bluecliff: { n: 12, c: ['#ffffff', '#e0f2fe'], vx: -0.03, vy: 0.004, s: 2, sway: 6 },
  Lunaria: { n: 14, c: ['#fde68a', '#bef264'], vx: 0.004, vy: -0.004, s: 3, glow: true, sway: 14 },
  Cinderpeak: { n: 22, c: ['#fb923c', '#fbbf24', '#ef4444'], vx: 0.006, vy: -0.03, s: 2, glow: true, sway: 8 },
  Frosthold: { n: 34, c: ['#ffffff', '#e0f2fe'], vx: -0.006, vy: 0.03, s: 3, sway: 10 },
  Voidreach: { n: 20, c: ['#c4b5fd', '#f0abfc', '#ffffff'], vx: 0, vy: -0.008, s: 2, glow: true, sway: 6 },
  'Starfall Crater': { n: 20, c: ['#fde68a', '#ffffff', '#fbbf24'], vx: -0.004, vy: 0.01, s: 2, glow: true, sway: 6 },
  'Celestine Spires': { n: 12, c: ['#ffffff', '#f0f9ff'], vx: -0.02, vy: 0.008, s: 3, sway: 16 },
  'Primordial Rift': { n: 18, c: ['#bef264', '#86efac', '#fef9c3'], vx: 0.004, vy: -0.01, s: 3, glow: true, sway: 12 },
};
function drawWeather(g: CanvasRenderingContext2D, region: string, t: number, cam: number, top: number, side: number, bottom = VIEW_H) {
  const W = WEATHER[region];
  if (!W) return;
  const spanX = VIEW_W + 2 * side + 40, spanY = bottom + top;
  for (let i = 0; i < W.n; i++) {
    const sp = 0.6 + hash(i * 9.1) * 0.8;
    let x = hash(i) * spanX + t * W.vx * sp - cam * (0.3 + hash(i * 2.3) * 0.5) + Math.sin(t / 900 + i) * (W.sway ?? 0);
    let y = hash(i * 4.7) * spanY + t * W.vy * sp;
    x = ((x % spanX) + spanX) % spanX - side - 20;
    y = ((y % spanY) + spanY) % spanY - top;
    const c = W.c[i % W.c.length];
    if (W.glow) { g.globalAlpha = 0.25 + 0.25 * Math.sin(t / 300 + i * 1.7); g.fillStyle = c; g.fillRect(x - W.s, y - W.s, W.s * 3, W.s * 3); }
    g.globalAlpha = W.glow ? 0.6 + 0.4 * Math.sin(t / 300 + i * 1.7) : 0.85;
    g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), W.s, W.s);
  }
  g.globalAlpha = 1;
}

// ----- Hero with a pixel outline (drawn on a small canvas first) -----
let heroCan: HTMLCanvasElement | null = null, heroTint: HTMLCanvasElement | null = null;
function drawHeroOutlined(g: CanvasRenderingContext2D, look: Look, x: number, y: number, face: 1 | -1, o: { walk: number; atk: number; air: boolean; blink: boolean; iron: boolean; t: number }) {
  const W = 140, H = 140, fx = 70, fy = 120;
  if (!heroCan) { heroCan = document.createElement('canvas'); heroCan.width = W; heroCan.height = H; heroTint = document.createElement('canvas'); heroTint.width = W; heroTint.height = H; }
  const hg = heroCan.getContext('2d')!, tg = heroTint!.getContext('2d')!;
  hg.clearRect(0, 0, W, H);
  drawHero(hg, look, fx, fy, face, { ...o, blink: false });
  tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, W, H); tg.drawImage(heroCan, 0, 0);
  tg.globalCompositeOperation = 'source-in'; tg.fillStyle = OUTLINE; tg.fillRect(0, 0, W, H);
  const ox = Math.round(x) - fx, oy = Math.round(y) - fy;
  const a = g.globalAlpha;
  if (o.blink) g.globalAlpha = 0.45;
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) g.drawImage(heroTint!, ox + dx, oy + dy);
  g.drawImage(heroCan, ox, oy);
  g.globalAlpha = a;
}

// ----- 🗺️ Town hazards (v0.0.1.80) -----
function drawTrap(g: CanvasRenderingContext2D, t: Run['traps'][number], now: number) {
  const x = t.x, y = GROUND;
  const q = (cx: number, cy: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(Math.round(x + cx), Math.round(y + cy), w, h); };
  if (t.kind === 'spring') {
    // 🍄 A big bouncy mushroom (squashes when you bounce)
    const sq = t.t > 0 ? 4 : 0;
    q(-4, -14 + sq, 8, 14 - sq, '#f5f5f4');
    q(-15, -24 + sq, 30, 10, '#dc2626'); q(-11, -28 + sq, 22, 4, '#ef4444');
    q(-9, -22 + sq, 4, 3, '#ffffff'); q(4, -25 + sq, 4, 3, '#ffffff'); q(-1, -19 + sq, 3, 3, '#ffffff');
  } else if (t.kind === 'bog') {
    // 🟫 A bog pool with slow bubbles
    g.fillStyle = '#3f3a1e'; g.beginPath(); g.ellipse(x, y + 2, t.w / 2, 7, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#57532a'; g.beginPath(); g.ellipse(x, y + 1, t.w / 2 - 6, 4, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 3; i++) { const k = ((now / 1400) + i / 3) % 1; g.globalAlpha = 1 - k; g.fillStyle = '#84804a'; g.beginPath(); g.arc(x - t.w / 3 + i * (t.w / 3), y - k * 8, 2 + k * 2, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
  } else if (t.kind === 'vent') {
    // 🌋 A crack in the ground: it glows (the warning), then bursts into a column of fire
    q(-12, -4, 24, 4, '#1c1917'); q(-6, -6, 12, 2, '#292524');
    const glowAt = VENT.quiet, burstAt = VENT.quiet + VENT.glow;
    if (t.t > glowAt && t.t <= burstAt) {
      const k = (t.t - glowAt) / VENT.glow;
      g.globalAlpha = 0.3 + 0.6 * k; g.fillStyle = '#fb923c'; g.beginPath(); g.ellipse(x, y - 2, 10 + k * 10, 4 + k * 3, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    } else if (t.t > burstAt) {
      const k = (t.t - burstAt) / VENT.burst;
      const h = 130 * Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5) * (1 - Math.max(0, k - 0.75) * 4);
      for (let i = 0; i < 5; i++) { g.fillStyle = ['#7c2d12', '#ea580c', '#f97316', '#fbbf24', '#fef3c7'][i]; const w = 22 - i * 4; g.fillRect(x - w / 2 + Math.sin(now / 40 + i) * 2, y - h * (1 - i * 0.12), w, h * (1 - i * 0.12)); }
    }
  } else {
    // 🌿 Thorn vines: low spiky coils
    q(-t.w / 2, -5, t.w, 5, '#14532d');
    for (let i = 0; i < t.w / 8; i++) { const sx = -t.w / 2 + 4 + i * 8; q(sx, -11, 2, 6, '#166534'); q(sx - 2, -13, 2, 3, '#a3e635'); q(sx + 2, -9, 2, 2, '#fecaca'); }
  }
}

// ----- ⛏️ Rare resource spots (v0.0.1.78) -----
const NODE_TOOL: Record<NodeKind, string> = { ore: '⛏️', tree: '🪓', herb: '🌿', fish: '🎣' };
function drawNode(g: CanvasRenderingContext2D, T: Theme, kind: NodeKind, x: number, y: number, done: boolean, t: number) {
  const q = (cx: number, cy: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(Math.round(x + cx), Math.round(y + cy), w, h); };
  if (kind === 'ore') {
    // A craggy rock with glinting ore (just rubble once mined)
    if (done) { q(-14, -6, 28, 6, '#57534e'); q(-8, -10, 12, 4, '#78716c'); return; }
    q(-18, -24, 36, 24, '#57534e'); q(-14, -30, 26, 8, '#78716c'); q(-18, -6, 36, 6, '#44403c');
    const glint = 0.5 + 0.5 * Math.sin(t / 220 + x);
    g.globalAlpha = 0.6 + 0.4 * glint;
    q(-10, -20, 5, 5, '#fde68a'); q(4, -14, 4, 4, '#fbbf24'); q(-2, -26, 4, 4, '#fef3c7'); q(9, -24, 3, 3, '#fde68a');
    g.globalAlpha = 1;
  } else if (kind === 'tree') {
    // An old, gnarled tree with a faint golden glow
    if (done) { q(-8, -10, 16, 10, '#5b3a1e'); q(-10, -2, 20, 2, '#3f2914'); return; }
    g.globalAlpha = 0.18 + 0.1 * Math.sin(t / 400 + x); g.fillStyle = '#fde68a'; g.beginPath(); g.arc(x, y - 48, 36, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    q(-7, -40, 14, 40, '#5b3a1e'); q(-3, -40, 4, 40, '#7a4e2a');
    pixCircle(g, x - 12, y - 50, 14, T.leaf[0]); pixCircle(g, x + 12, y - 52, 14, T.leaf[0]); pixCircle(g, x, y - 64, 16, T.leaf[1]); pixCircle(g, x - 4, y - 68, 6, T.leaf[2]);
  } else if (kind === 'herb') {
    // A patch of shimmering herbs
    if (done) { q(-12, -3, 24, 3, '#3f6212'); return; }
    for (let i = -2; i <= 2; i++) { const hgt = 10 + ((i + 3) * 7) % 9; q(i * 5 - 1, -hgt, 3, hgt, '#4d7c0f'); q(i * 5 - 3, -hgt - 2, 7, 4, '#84cc16'); }
    g.globalAlpha = 0.5 + 0.5 * Math.sin(t / 260 + x); q(-6, -20, 3, 3, '#f0abfc'); q(5, -16, 3, 3, '#fef08a'); g.globalAlpha = 1;
  } else {
    // A little pool with rings spreading out (still once fished)
    g.fillStyle = '#1e3a5f'; g.beginPath(); g.ellipse(x, y + 2, 34, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2563eb'; g.beginPath(); g.ellipse(x, y + 1, 30, 6, 0, 0, Math.PI * 2); g.fill();
    if (done) return;
    for (let i = 0; i < 2; i++) {
      const k = ((t / 1200) + i * 0.5) % 1;
      g.globalAlpha = 1 - k; g.strokeStyle = '#bfdbfe'; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(x, y + 1, 6 + k * 22, 1.5 + k * 4, 0, 0, Math.PI * 2); g.stroke();
    }
    g.globalAlpha = 1;
  }
}

// ----- Drawing the world -----
export function drawWorld(g: CanvasRenderingContext2D, d: Run, look: Look, cam: number, top = 0, side = 0, bottom = VIEW_H) {
  const T = THEME[d.region] ?? THEME.Pocketvale;
  drawBackdrop(g, T, d.region, d.t, cam, top, side);
  const props = sceneryOf(d.region).props;
  g.save();
  const sx = d.shake > 0.2 ? (Math.random() - 0.5) * d.shake * 2 : 0, sy = d.shake > 0.2 ? (Math.random() - 0.5) * d.shake * 2 : 0;
  g.translate(-Math.round(cam) + Math.round(sx), Math.round(sy));
  // Big trees and bushes along the path (world-attached, like the reference)
  for (let i = 0; i < 18; i++) {
    const wx = 120 + i * 190 + Math.floor(hash(i * 7) * 80);
    if (wx < cam - side - 160 || wx > cam + VIEW_W + side + 160) continue;
    const tr = propArt(props[0], T, i % 2);
    g.drawImage(tr, Math.round((wx - tr.width / 2) / U) * U, GROUND - tr.height + 6);
    const bu = propArt(props[1], T, i % 2);
    g.drawImage(bu, Math.round((wx + 70) / U) * U, GROUND - bu.height + 3);
  }
  // The boss's clearing: a banner pole marks the way in
  if (!d.room || d.room.kind === 'boss') {
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(d.arenaX, -top, d.worldW - d.arenaX, GROUND + top);
    g.fillStyle = '#e7e5e4'; g.fillRect(d.arenaX - 2, GROUND - 120, 4, 120);
    g.fillStyle = '#b91c1c'; g.fillRect(d.arenaX + 2, GROUND - 117, 30, 9); g.fillRect(d.arenaX + 2, GROUND - 108, 21, 6);
    pixCircle(g, d.arenaX, GROUND - 123, 4, '#fde68a');
  }
  // Ground and ledges
  for (const pl of d.plats) {
    if (pl.y >= GROUND) { drawGround(g, T, cam - 12 - side, cam + VIEW_W + 12 + side, GROUND, Math.max(VIEW_H, bottom + 4)); continue; }
    if (pl.x2 < cam - side - 20 || pl.x1 > cam + VIEW_W + side + 20) continue;
    drawLedge(g, T, pl.x1, pl.x2, pl.y);
  }
  // 🚪 The room's door: locked (red) while monsters remain, warm light once open; a green portal in a way-out room
  if (d.room && d.room.kind !== 'boss') {
    const x = d.room.door, open = !d.mobs.some((m) => m.hp > 0), exit = d.room.kind === 'exit';
    g.fillStyle = '#44403c'; g.fillRect(x - 30, GROUND - 92, 60, 92);
    g.fillStyle = '#292524'; g.fillRect(x - 24, GROUND - 86, 48, 86);
    if (open) {
      const pulse = 0.6 + 0.4 * Math.sin(d.t / 260);
      g.fillStyle = exit ? `rgba(74,222,128,${0.55 + 0.3 * pulse})` : `rgba(253,230,138,${0.5 + 0.3 * pulse})`;
      g.fillRect(x - 22, GROUND - 84, 44, 84);
      g.globalAlpha = 0.25 * pulse; g.fillStyle = exit ? '#4ade80' : '#fde68a';
      g.beginPath(); g.arc(x, GROUND - 44, 60, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    } else {
      g.fillStyle = '#7c2d12'; g.fillRect(x - 22, GROUND - 84, 44, 84);
      g.fillStyle = '#b91c1c'; for (let i = 0; i < 3; i++) g.fillRect(x - 22, GROUND - 70 + i * 24, 44, 4);
      g.fillStyle = '#fbbf24'; g.fillRect(x - 4, GROUND - 46, 8, 10);
    }
    const s = sprite(exit ? '🚪' : open ? '✨' : '🔒', 16);
    g.drawImage(s, x - s.width / 2, GROUND - 112 + Math.sin(d.t / 400) * 2);
  }
  // 🗺️ Town hazards on the ground
  for (const t of d.traps) {
    if (t.x < cam - side - 80 || t.x > cam + VIEW_W + side + 80) continue;
    drawTrap(g, t, d.t);
  }
  // 🪨🌠 Where something is about to land: a pulsing mark, then it drops in
  for (const f of d.falls) {
    if (f.t <= 0) continue;
    const star = d.hz.includes('stars');
    const k = 1 - f.t / FALL_WARN;
    g.globalAlpha = 0.35 + 0.35 * Math.sin(d.t / 70);
    g.fillStyle = star ? '#fde68a' : '#57534e';
    g.beginPath(); g.ellipse(f.x, f.y + 1, 14 + k * 12, 4, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    if (!star) for (let i = 0; i < 3; i++) { g.fillStyle = '#a8a29e'; g.fillRect(f.x - 8 + i * 8, f.y - 200 + ((d.t / 3 + i * 37) % 180), 2, 4); }
    if (f.t < 350) {
      const fy = f.y - 320 * (f.t / 350);
      if (star) { g.fillStyle = '#fef3c7'; g.beginPath(); g.arc(f.x, fy - 8, 7, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(253,230,138,0.6)'; g.lineWidth = 4; g.beginPath(); g.moveTo(f.x, fy - 8); g.lineTo(f.x + 18, fy - 50); g.stroke(); }
      else { g.fillStyle = '#78716c'; g.fillRect(f.x - 9, fy - 18, 18, 16); g.fillStyle = '#a8a29e'; g.fillRect(f.x - 6, fy - 18, 8, 5); }
    }
  }
  // 🌊 A wave rolling in
  if (d.wave) {
    const x = d.wave.x;
    g.fillStyle = 'rgba(37,99,235,0.85)'; g.beginPath(); g.moveTo(x - 30, GROUND); g.quadraticCurveTo(x - 6, GROUND - 34, x + 14, GROUND - 22); g.quadraticCurveTo(x + 30, GROUND - 10, x + 60, GROUND); g.fill();
    g.fillStyle = '#e0f2fe'; g.beginPath(); g.arc(x - 4, GROUND - 26, 6, 0, Math.PI * 2); g.arc(x + 6, GROUND - 24, 5, 0, Math.PI * 2); g.fill();
  }
  // ⛏️ Rare resource spots, with the tool they need floating above (dimmed + 🔒 when you didn't bring it)
  for (const n of d.nodes) {
    if (n.x < cam - side - 40 || n.x > cam + VIEW_W + side + 40) continue;
    drawNode(g, T, n.kind, n.x, n.y, n.done, d.t);
    if (n.done) continue;
    const locked = !!d.why[n.kind];
    const bob = Math.sin(d.t / 380 + n.x) * 2;
    g.globalAlpha = locked ? 0.55 : 1;
    const icon = sprite(NODE_TOOL[n.kind], 16);
    g.drawImage(icon, n.x - icon.width / 2, n.y - 66 + bob);
    if (locked) { const lk = sprite('🔒', 11); g.drawImage(lk, n.x + 4, n.y - 58 + bob); }
    g.globalAlpha = 1;
    if (n.prog > 0) {
      // The harvest ring fills while you stand still
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 5; g.beginPath(); g.arc(n.x, n.y - 82, 10, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#fde68a'; g.lineWidth = 3; g.beginPath(); g.arc(n.x, n.y - 82, 10, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * n.prog) / HARVEST_MS); g.stroke();
    }
  }
  // 💰 Gold piles, glinting
  for (const gp of d.golds) {
    if (gp.got || gp.x < cam - side - 20 || gp.x > cam + VIEW_W + side + 20) continue;
    const tw = 0.5 + 0.5 * Math.sin(d.t / 200 + gp.x);
    g.fillStyle = '#b45309'; g.fillRect(gp.x - 9, gp.y - 4, 18, 4);
    g.fillStyle = '#f59e0b'; g.fillRect(gp.x - 7, gp.y - 8, 14, 4); g.fillRect(gp.x - 4, gp.y - 11, 8, 3);
    g.fillStyle = '#fde68a'; g.fillRect(gp.x - 5, gp.y - 8, 3, 2); g.fillRect(gp.x + 2, gp.y - 5, 3, 2);
    g.globalAlpha = tw; g.fillStyle = '#ffffff'; g.fillRect(gp.x + 3, gp.y - 13, 2, 2); g.globalAlpha = 1;
  }
  // 💰 Treasure chests
  for (const c of d.chests) {
    g.fillStyle = '#78350f'; g.fillRect(c.x - 16, c.y - 20, 32, 20);
    g.fillStyle = '#fbbf24'; g.fillRect(c.x - 16, c.y - 12, 32, 3); g.fillRect(c.x - 3, c.y - 14, 6, 7);
    if (c.open) { g.fillStyle = '#92400e'; g.fillRect(c.x - 16, c.y - 30, 32, 6); }
    else {
      g.fillStyle = '#92400e'; g.fillRect(c.x - 17, c.y - 26, 34, 8);
      g.globalAlpha = 0.35 + 0.25 * Math.sin(d.t / 300); g.fillStyle = '#fde68a'; g.beginPath(); g.arc(c.x, c.y - 14, 26, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    }
  }
  // 🍓 Berry patches on the high ledges (a bush with berries; bare once eaten)
  for (const b of d.treats) {
    if (b.x < cam - side - 30 || b.x > cam + VIEW_W + side + 30) continue;
    const bu = propArt('bush', T, 0);
    g.drawImage(bu, Math.round((b.x - bu.width / 2) / U) * U, b.y - bu.height + 3);
    if (!b.got) {
      const bob = Math.round(Math.sin(d.t / 350 + b.x) * 2);
      g.globalAlpha = 0.35 + 0.2 * Math.sin(d.t / 260);
      g.fillStyle = '#fde68a'; g.beginPath(); g.arc(b.x, b.y - 24 + bob, 13, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      const s = sprite('🍓', 18);
      g.drawImage(s, b.x - s.width / 2, b.y - 24 + bob - s.height / 2);
    }
  }
  // Monsters
  for (const m of d.mobs) {
    if (m.hp <= 0 && m.dead <= 0) continue;
    const def = MONSTER_MAP[m.m];
    const living = m.hp > 0;
    const frame = Math.floor((d.t + m.id * 137) / (m.boss ? 320 : 200)) % 2;
    const s = pixMob(def.art, def.colors, frame, m.hitT > 90 && living);
    const k = Math.max(3, Math.round((m.boss ? m.w * 1.25 : m.w * 1.35) / (s.width - 2)));
    const float = FLOATS.has(def.art) ? Math.sin(d.t / 260 + m.id) * 4 - 8 : 0;
    if (m.boss && living) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(m.x, m.y + 2, 44, 8, 0, 0, Math.PI * 2); g.fill();
    }
    if (!m.boss && living && !FLOATS.has(def.art)) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(m.x, m.y + 1, m.w * 0.42, 3, 0, 0, Math.PI * 2); g.fill(); }
    g.save();
    g.translate(Math.round(m.x), Math.round(m.y + float - (m.hop ? Math.sin((m.hop / 120) * Math.PI) * 5 : 0)));
    if (m.dir < 0) g.scale(-1, 1);
    if (!living) { const q = 1 - m.dead / 500; g.globalAlpha = Math.max(0, m.dead / 500); g.scale(1 + q * 0.5, 1 - q * 0.4); }
    g.drawImage(s, Math.round(-s.width * k / 2), -s.height * k, s.width * k, s.height * k);
    g.restore();
    if (living && (m.frozeT ?? 0) > 0) { g.fillStyle = 'rgba(186,230,253,0.45)'; g.fillRect(m.x - m.w / 2 - 3, m.y - m.h - 3 + float, m.w + 6, m.h + 6); g.strokeStyle = '#e0f2fe'; g.lineWidth = 2; g.strokeRect(m.x - m.w / 2 - 3, m.y - m.h - 3 + float, m.w + 6, m.h + 6); }
    else if (living && (m.slowT ?? 0) > 0) { const sn = sprite('🐌', 11); g.drawImage(sn, m.x - sn.width / 2, m.y - m.h - 26 + float); }
    if (m.boss && living) { const crown = sprite('👑', 22); g.drawImage(crown, m.x - crown.width / 2, m.y + float - s.height * k - 26 + Math.sin(d.t / 300) * 3); }
    if (living && (m.windT ?? 0) > 0) {
      // About to spit: a green glow swells at its mouth so you can see it coming
      const q = 1 - (m.windT ?? 0) / 550;
      g.fillStyle = `rgba(190,242,100,${0.25 + 0.45 * q})`;
      g.beginPath(); g.arc(m.x + m.dir * m.w * 0.3, Math.min(m.y - 14, d.hero.y - 29) + float, 3 + q * 6, 0, Math.PI * 2); g.fill();
    }
    if (m.boss && (m.slamT ?? 0) > 0) {
      g.strokeStyle = `rgba(248,113,113,${0.4 + 0.4 * Math.sin(d.t / 60)})`; g.lineWidth = 3;
      g.beginPath(); g.ellipse(m.x, GROUND + 2, 170, 14, 0, 0, Math.PI * 2); g.stroke();
    }
    if (!m.boss && living && m.hp < m.maxHp) {
      g.fillStyle = '#1c1917'; g.fillRect(m.x - 18, m.y - m.h - 10, 36, 5);
      g.fillStyle = '#ef4444'; g.fillRect(m.x - 18, m.y - m.h - 10, 36 * Math.max(0, m.hp / m.maxHp), 5);
    }
  }
  // Shots
  for (const s of d.shots) {
    if (s.kind === 'arrow') { const sp = Math.hypot(s.vx, s.vy) || 1; g.strokeStyle = '#e7e5e4'; g.lineWidth = 2; g.beginPath(); g.moveTo(s.x - (s.vx / sp) * 14, s.y - (s.vy / sp) * 14); g.lineTo(s.x, s.y); g.stroke(); g.fillStyle = '#a8a29e'; g.fillRect(s.x - 2, s.y - 2, 4, 4); }
    else if (s.kind === 'wave') {
      const dir = Math.sign(s.vx) || 1;
      g.globalAlpha = Math.min(1, s.ttl / 200);
      for (let i = 0; i < 3; i++) { g.strokeStyle = i ? '#fde68a' : '#fff7e0'; g.lineWidth = 6 - i * 2; g.beginPath(); g.arc(s.x - dir * (10 + i * 10), s.y, 22 - i * 3, dir > 0 ? -1.2 : Math.PI - 1.2 + 0.0, dir > 0 ? 1.2 : Math.PI + 1.2); g.stroke(); }
      g.globalAlpha = 1;
    }
    else { g.fillStyle = s.kind === 'fire' ? '#f97316' : s.kind === 'spit' ? '#a3e635' : look.orb; g.beginPath(); g.arc(s.x, s.y, s.kind === 'fire' ? 8 : 5, 0, Math.PI * 2); g.fill(); }
  }
  // Hero (with a little shadow at its feet)
  const h = d.hero;
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(h.x, (h.onGround ? h.y : Math.min(GROUND, h.y + 60)) + 1, 14, 4, 0, 0, Math.PI * 2); g.fill();
  drawHeroOutlined(g, look, h.x, h.y, h.face, { walk: h.walkT, atk: h.atkT / 240, air: !h.onGround, blink: h.invT > 0 && Math.floor(d.t / 90) % 2 === 0, iron: h.ironT > 0, t: d.t });
  // ✨ Active skill buffs float over your head
  const buffs = (Object.keys(h.bf ?? {}) as Buff[]).filter((b) => (h.bf[b] ?? 0) > 0);
  buffs.forEach((b, i) => {
    const ic = sprite(BUFF_EMOJI[b], 13);
    const left = (h.bf[b] ?? 0) < 1500 && Math.floor(d.t / 150) % 2 === 0;
    g.globalAlpha = left ? 0.35 : 1;
    g.drawImage(ic, Math.round(h.x - (buffs.length * 17) / 2 + i * 17), Math.round(h.y - HERO_H - 34 + Math.sin(d.t / 300 + i) * 1.5));
  });
  g.globalAlpha = 1;
  // Effects
  for (const f of d.fx) {
    const k = Math.max(0, f.t) / 400;
    g.globalAlpha = 1 - k;
    if (f.kind === 'slash' && f.t >= 0) {
      // A cream swoosh that tapers off (like the reference's sword trails)
      const r = (f.w ?? 50) * 0.75, cx = f.x - h.face * (f.w ?? 50) / 2;
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = i < 2 ? '#fff7e0' : '#f2e2bc'; g.lineWidth = 7 - i; g.beginPath();
        const a0 = h.face > 0 ? -1.1 + i * 0.12 : Math.PI + 1.1 - i * 0.12; const a1 = h.face > 0 ? 0.7 - i * 0.05 : Math.PI - 0.7 + i * 0.05;
        g.arc(cx, f.y, r - i * 2, Math.min(a0, a1), Math.max(a0, a1)); g.stroke();
      }
    }
    else if (f.kind === 'claw' && f.t >= 0) {
      g.strokeStyle = '#e9d5ff'; g.lineWidth = 3;
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(f.x - 14 + i * 8, f.y - 16); g.lineTo(f.x + 10 + i * 8, f.y + 14); g.stroke(); }
      g.strokeStyle = '#c084fc'; g.lineWidth = 1.5;
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(f.x - 12 + i * 8, f.y - 14); g.lineTo(f.x + 8 + i * 8, f.y + 12); g.stroke(); }
    }
    else if (f.kind === 'spin') { g.strokeStyle = '#e0f2fe'; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, (f.w ?? 70) * (0.6 + k * 0.4), 0, Math.PI * 2); g.stroke(); }
    else if (f.kind === 'boom') { g.fillStyle = '#fb923c'; g.beginPath(); g.arc(f.x, f.y, (f.w ?? 80) * (0.3 + k * 0.7), 0, Math.PI * 2); g.fill(); }
    else if (f.kind === 'nova') {
      const r = (f.w ?? 120) * (0.25 + k * 0.75);
      g.strokeStyle = f.c ?? '#e0f2fe'; g.lineWidth = 6 * (1 - k) + 2; g.beginPath(); g.arc(f.x, f.y, r, 0, Math.PI * 2); g.stroke();
      g.globalAlpha = (1 - k) * 0.18; g.fillStyle = f.c ?? '#e0f2fe'; g.beginPath(); g.arc(f.x, f.y, r, 0, Math.PI * 2); g.fill();
    }
    else if (f.kind === 'meteor') {
      if (f.t < 0) {
        const p = Math.max(0, 1 + f.t / 600);
        const mx = f.x + 140 * (1 - p), my = f.y - 30 - 340 * (1 - p);
        g.fillStyle = 'rgba(251,146,60,0.35)'; g.beginPath(); g.arc(f.x, f.y, 14 + p * 40, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(253,230,138,0.7)'; g.lineWidth = 8; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + 40, my - 70); g.stroke();
        g.fillStyle = '#7c2d12'; g.beginPath(); g.arc(mx, my, 15, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fb923c'; g.beginPath(); g.arc(mx - 3, my - 3, 9, 0, Math.PI * 2); g.fill();
      } else { g.fillStyle = '#fb923c'; g.beginPath(); g.arc(f.x, f.y - 20, (f.w ?? 130) * 0.6 * (0.3 + k * 0.7), 0, Math.PI * 2); g.fill(); }
    }
    else if (f.kind === 'zap' && f.t < 0) { /* not yet */ }
    else if (f.kind === 'zap') { g.strokeStyle = f.c ?? '#fef08a'; g.lineWidth = 3; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo((f.x + f.x2!) / 2 + 8, (f.y + f.y2!) / 2 - 10); g.lineTo(f.x2!, f.y2!); g.stroke(); }
    else if (f.kind === 'rain' && f.t >= 0) { g.strokeStyle = f.c ?? '#e7e5e4'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { const ax = f.x - (f.w ?? 150) / 2 + i * 18; g.beginPath(); g.moveTo(ax, GROUND - 90 + k * 80); g.lineTo(ax - 4, GROUND - 74 + k * 80); g.stroke(); } }
    else if (f.kind === 'slam') { g.strokeStyle = '#f87171'; g.lineWidth = 5; g.beginPath(); g.ellipse(f.x, f.y, (f.w ?? 300) / 2 * (0.4 + k * 0.6), 16, 0, 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1;
  }
  // Sparks, dust and poofs
  for (const p of d.parts) {
    g.globalAlpha = Math.max(0, 1 - p.t / p.life);
    g.fillStyle = p.c;
    const sz = Math.max(1, Math.round(p.s * (1 - p.t / p.life * 0.5)));
    g.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
  }
  g.globalAlpha = 1;
  // 💨 Wind: faint streaks while the chimes warn, strong ones while it pushes
  if (d.gust) {
    const strong = d.gust.warn <= 0;
    g.strokeStyle = strong ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)'; g.lineWidth = 2;
    for (let i = 0; i < (strong ? 14 : 6); i++) {
      const y = -top + 40 + hash(i * 3.7) * (GROUND + top - 60);
      const span = VIEW_W + 2 * side + 200;
      const x = cam - side - 100 + ((hash(i) * span + d.t * 0.6 * d.gust.dir) % span + span) % span;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - d.gust.dir * (strong ? 40 : 20), y); g.stroke();
    }
    if (!strong) { const c = sprite('🎐', 18); g.drawImage(c, d.hero.x - 9, d.hero.y - HERO_H - 40 + Math.sin(d.t / 60) * 2); }
  }
  drawAtmos(g, d.region, d.t, cam, top, side, bottom, VIEW_W);
  // 🌫️ Fog: you only see what's close (Lunaria)
  if (d.hz.includes('fog')) {
    const hx = d.hero.x, hy = d.hero.y - HERO_H / 2;
    const fog = g.createRadialGradient(hx, hy, 90, hx, hy, 300);
    fog.addColorStop(0, 'rgba(110,124,160,0)'); fog.addColorStop(0.55, 'rgba(110,124,160,0.6)'); fog.addColorStop(1, 'rgba(82,94,128,0.92)');
    g.fillStyle = fog; g.fillRect(cam - side - 60, -top - 60, VIEW_W + 2 * side + 120, bottom + top + 120);
  }
  // Damage numbers (MapleStory-style)
  g.textAlign = 'center'; g.lineJoin = 'round';
  for (const p of d.pops) {
    const [c, edge, size] = POP_STYLE[p.kind];
    const lift = p.t * 0.018;
    const y = p.y - (p.stack ?? 0) * (size - 1) - lift;
    const pop = p.t < 110 ? 1.75 - 0.75 * (p.t / 110) : 1;
    g.globalAlpha = p.t < 620 ? 1 : Math.max(0, 1 - (p.t - 620) / 280);
    g.save();
    g.translate(p.x, y);
    g.scale(pop, pop);
    g.font = `900 ${size}px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif`;
    if (p.kind === 'crit') { g.lineWidth = 7; g.strokeStyle = '#7f1d1d'; g.strokeText(p.text, 0, 0); }
    g.lineWidth = p.kind === 'crit' ? 4 : 5; g.strokeStyle = edge; g.strokeText(p.text, 0, 0);
    g.fillStyle = c; g.fillText(p.text, 0, 0);
    g.restore();
  }
  g.globalAlpha = 1;
  g.restore();
  drawWeather(g, d.region, d.t, cam, top, side, bottom);
}

// ----- The screen -----
/** 🗝️ Combat-screen card: gear up for a new extraction run, or carry on the one you're on. */
export function DungeonLaunch() {
  const [open, setOpen] = useState(false);
  const { player } = useGame();
  const region = player.location;
  const run = player.dungeonRun;
  const bossAt = game.dungeonBossReadyAt(run?.region ?? region);
  const found = run ? run.bag.reduce((n, x) => n + x.qty, 0) : 0;
  return (
    <>
      <button className={`lw-launch dg-launch ${run ? 'on' : ''}`} onClick={() => { sound.play('click'); setOpen(true); }}>
        <span className="lw-launch-emoji">🗝️</span>
        <span className="grow"><b>Dungeon</b>
          {run
            ? <span className="small muted">You're inside {AREAS[run.region].name} — room {run.row + 1} of {run.rows.length}, {found.toLocaleString()} thing{found === 1 ? '' : 's'} found. Your gear is in there with you. Tap to carry on.</span>
            : <span className="small muted">An extraction run through {AREAS[region].name}: gear up, choose your path room by room, and get out through a 🚪 way out or past the boss. Knocked out? Everything you brought and found is lost.</span>}
          <span className="tiny dg-launch-boss">{bossAt ? `👑 Boss treasure back in ${Math.max(1, Math.ceil((bossAt - Date.now()) / 60_000))} min` : '👑 Boss treasure ready'}</span></span>
        <span className="lw-launch-go">▶</span>
      </button>
      {open && (run ? <DungeonShell onClose={() => setOpen(false)} /> : <GearUp region={region} onClose={() => setOpen(false)} />)}
    </>
  );
}

// ----- 🎒 Gear up (owner: "bring anything in, or unpack what you don't want to bring… all the buttons needed in the
// menu (bank, bag, equipment)… quick select pre-builds") -----
const COMBAT_SLOTS: EquipSlot[] = ['weapon', 'shield', 'head', 'body', 'legs'];
const TOOL_SLOTS: EquipSlot[] = ['pickaxe', 'axe', 'rod', 'hammer', 'knife', 'tinderbox', 'skillet', 'sickle', 'trowel'];
const SLOT_NAME: Record<EquipSlot, string> = {
  weapon: 'Weapon', shield: 'Shield', head: 'Helmet', body: 'Body', legs: 'Legs', pickaxe: 'Pickaxe', axe: 'Axe', rod: 'Fishing rod',
  hammer: 'Hammer', knife: 'Knife', tinderbox: 'Tinderbox', skillet: 'Skillet', sickle: 'Sickle', trowel: 'Trowel',
};
function GearUp({ region, onClose }: { region: Run['region']; onClose: () => void }) {
  const { player } = useGame();
  const [openSlot, setOpenSlot] = useState<EquipSlot | null>(null);
  const [food, setFood] = useState<Record<string, number>>({});
  const [sure, setSure] = useState(false);
  const owned = (id: string) => countInBag(player.inventory, id) + countInBank(player, id);
  const ids = [...new Set([...player.inventory.filter(Boolean).map((s) => s!.id), ...player.bank.map((s) => s.id)])];
  const foods = ids.filter((id) => ITEMS[id]?.heals).sort((a, b) => (ITEMS[b].heals ?? 0) - (ITEMS[a].heals ?? 0));
  const packed = Object.values(food).reduce((n, k) => n + k, 0);
  const worn = (Object.keys(player.equipment) as EquipSlot[]).filter((s) => player.equipment[s]);
  const gems = (Object.keys(player.sockets) as EquipSlot[]).filter((s) => player.sockets[s]);
  const add = (id: string, k: number) => {
    const now = food[id] ?? 0;
    const next = Math.max(0, Math.min(now + k, owned(id), now + (FOOD_MAX - packed)));
    if (next === now) { sound.play('error', { volume: 0.4 }); return; }
    sound.play('tick', { rate: k > 0 ? 1.3 : 0.9, volume: 0.5 });
    setFood({ ...food, [id]: next });
    setSure(false);
  };
  const slotRow = (slot: EquipSlot) => {
    const id = player.equipment[slot];
    const gem = player.sockets[slot];
    const list = ids.filter((c) => c !== id && ITEMS[c]?.equip?.slot === slot);
    return (
      <div key={slot} className={`gu-slot-wrap ${openSlot === slot ? 'open' : ''}`}>
        <button className={`gu-slot ${id ? 'on' : ''}`} onClick={() => { sound.play('click'); setOpenSlot(openSlot === slot ? null : slot); }}>
          <span className="gu-slot-name tiny">{SLOT_NAME[slot]}</span>
          {id ? <><ItemIcon id={id} size={24} /><span className="small grow gu-name">{ITEMS[id].name}</span></> : <span className="small muted grow">— stays home</span>}
          {gem && <span className="gu-gem" title={ITEMS[gem]?.name}><ItemIcon id={gem} size={18} /></span>}
          <span className="muted">{openSlot === slot ? '▴' : '▾'}</span>
        </button>
        {openSlot === slot && (
          <div className="gu-pick">
            {id && <button className="btn small" onClick={() => { game.unequip(slot); setSure(false); }}>🏠 Leave it at home</button>}
            {gem && <button className="btn small" onClick={() => { game.unsocketGem(slot); setSure(false); }}>💎 Pop the gem out (keep it safe)</button>}
            {list.map((c) => (
              <button key={c} className="gu-cand" onClick={() => { game.equip(c); setSure(false); }}>
                <ItemIcon id={c} size={22} /><span className="small grow">{ITEMS[c].name}</span><span className="tiny muted mono">×{owned(c)}</span>
              </button>
            ))}
            {!list.length && <p className="tiny muted">{id ? 'Nothing else for this slot in your bag or bank.' : 'Nothing for this slot in your bag or bank.'}</p>}
          </div>
        )}
      </div>
    );
  };
  const enter = () => {
    if (!sure) { setSure(true); sound.play('creak'); return; }
    const list = Object.entries(food).filter(([, k]) => k > 0).map(([id, qty]) => ({ id, qty }));
    if (game.dungeonEnter(region, list)) sound.play('levelup');
  };
  return createPortal(
    <div className="gu-root">
      <div className="gu-page">
        <div className="row-between"><b className="gold">🗝️ Gear up — {AREAS[region].name}</b><button className="dg-icon" onClick={() => { sound.play('click'); onClose(); }} aria-label="Close">✕</button></div>
        <div className="gu-warn small">
          <b>⚠️ Everything you take in can be lost.</b> Knocked out = the gear you wear (and the gems in its slots), your packed food and everything you found stay in the dungeon. Get out through a 🚪 way out or past the boss to keep it all. XP you earn is always kept.
        </div>
        <h4 className="gu-h">👕 Saved outfits</h4>
        <div className="gu-outfits">
          {player.loadouts.map((l, i) => l && <button key={i} className="btn small" onClick={() => { game.applyLoadout(i); setSure(false); }}>{l.name}</button>)}
          <button className="btn small" onClick={() => { for (const s of [...COMBAT_SLOTS, ...TOOL_SLOTS]) if (player.equipment[s]) game.unequip(s); sound.play('equip'); setSure(false); }}>🏠 Take everything off</button>
        </div>
        {!player.loadouts.some(Boolean) && <p className="tiny muted">Save outfits on the Gear screen to swap them on here in one tap.</p>}
        <h4 className="gu-h">⚔️ Fighting gear</h4>
        {COMBAT_SLOTS.map(slotRow)}
        <h4 className="gu-h">⛏️ Tools <span className="tiny muted">(rich spots inside need them: ⛏️ ore veins, 🪓 old trees, 🌿 herb patches, 🎣 fishing pools — tools you bring are away from your idle work)</span></h4>
        {TOOL_SLOTS.map(slotRow)}
        <h4 className="gu-h">🍖 Food <span className="tiny muted">{packed}/{FOOD_MAX} packed · each heals 30%</span></h4>
        {foods.length ? foods.map((id) => (
          <div key={id} className="gu-food">
            <ItemIcon id={id} size={22} /><span className="small grow">{ITEMS[id].name} <span className="tiny muted">(have {owned(id)})</span></span>
            <button className="btn small" onClick={() => add(id, -1)} aria-label="One less">−</button>
            <b className="mono gu-n">{food[id] ?? 0}</b>
            <button className="btn small" onClick={() => add(id, 1)} aria-label="One more">+</button>
          </div>
        )) : <p className="tiny muted">No food in your bag or bank — cook some first, or go in hungry.</p>}
        <div className="gu-risk small">At risk: {worn.length} piece{worn.length === 1 ? '' : 's'} of gear{gems.length ? `, ${gems.length} gem${gems.length === 1 ? '' : 's'}` : ''}{packed ? `, ${packed} food` : ''}.</div>
        <button className={`btn btn-hero gu-go ${sure ? 'sure' : ''}`} onClick={enter}>{sure ? 'TAP AGAIN TO GO IN — RISK IT ALL' : 'ENTER THE DUNGEON'}</button>
      </div>
    </div>,
    document.body,
  );
}

// ----- The run: the turned screen holding the map, the rooms and the end -----
type RunEnd = { kind: 'won' | 'out' | 'dead'; region: Run['region']; bag: ItemStack[]; found?: ExRun['found']; rested?: boolean; lost?: DungeonRun };
function DungeonShell({ onClose }: { onClose: () => void }) {
  const { player } = useGame();
  const run = player.dungeonRun;
  const [playing, setPlaying] = useState(false);
  const [shop, setShop] = useState(false);
  const [end, setEnd] = useState<RunEnd | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useNoScroll(root);
  // ↔️ Sideways: turned with CSS on a phone held upright; wide windows are already landscape.
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight, turn: wantsTurn() }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight, turn: wantsTurn() });
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    const t = window.setInterval(on, 700); // some browsers miss the resize
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); clearInterval(t); };
  }, []);
  const land = size.turn || size.w > size.h;
  view.rot = size.turn;
  view.root = root.current;
  const region = run?.region ?? end?.region ?? player.location;
  useEffect(() => { sound.playMusic(musicFor(region)); }, [region]);
  useEffect(() => { if (!run && !end) onClose(); }, [run, end]); // eslint-disable-line react-hooks/exhaustive-deps

  let body: React.ReactNode = null;
  if (end) body = <RunEndPanel end={end} onClose={onClose} />;
  else if (run && playing) body = <RoomPlay key={`${run.row}-${run.at}`} run={run} land={land} onEnd={(e) => { setPlaying(false); if (e) setEnd(e); }} />;
  else if (run && shop) body = <WickStall run={run} onClose={() => { sound.play('click'); setShop(false); }} />;
  else if (run) body = <RunMap run={run} onEnter={() => { sound.play('creak'); setPlaying(true); }} onClose={onClose} onShop={() => { sound.play('coin'); setShop(true); }}
    onExtract={() => { const r = run.region; const bag = game.dungeonExtract(false); setEnd({ kind: 'out', region: r, bag }); }} />;
  return createPortal(
    <div className={`dg-root ${land ? 'land' : ''} ${size.turn ? 'rot' : ''}`} ref={root}
      style={size.turn ? { inset: 'auto', left: 0, top: 0, width: size.h, height: size.w, transformOrigin: '0 0', transform: `translate(${size.w}px, 0) rotate(90deg)` } : undefined}>
      {body}
    </div>,
    document.body,
  );
}

/** 🗺️ The map: rooms from the entrance (left) to the boss (right). Clear a room, then pick one of the next two. */
function RunMap({ run, onEnter, onExtract, onClose, onShop }: { run: DungeonRun; onEnter: () => void; onExtract: () => void; onClose: () => void; onShop: () => void }) {
  const hero = game.dungeonHero();
  const max = hero ? maxHp(hero) : run.hp;
  const choices = nextChoices(run);
  const here = roomOf(run);
  const items = run.bag.filter((x) => x.qty > 0 && x.id !== 'coins');
  return (
    <div className="dg-map">
      <div className="dg-map-top">
        <b className="gold">{AREAS[run.region].emoji} {AREAS[run.region].name[0].toUpperCase() + AREAS[run.region].name.slice(1)}</b>
        <div className="dg-hp"><div style={{ width: `${(100 * run.hp) / max}%` }} /><span className="mono">{Math.round(run.hp).toLocaleString()} / {max.toLocaleString()}</span></div>
        <span className="small mono dg-gold">💰 {bagGold(run).toLocaleString()}</span>
        <span className="small">🍖 {foodCount(run)}</span>
        <button className="dg-icon" onClick={() => { sound.play('click'); onClose(); }} aria-label="Pause (your run is saved)">⏸</button>
      </div>
      <p className="tiny muted dg-map-hint">{DUNGEON_TOWNS[run.region].hint}</p>
      <div className="dg-map-rows">
        {run.rows.map((row, r) => (
          <div key={r} className="dg-map-col">
            {row.map((room, i) => {
              const isHere = r === run.row && i === run.at;
              const can = r === run.row + 1 && run.cleared;
              const past = r < run.row || (r === run.row && !isHere);
              const info = ROOM_INFO[room.kind];
              const label = DUNGEON_TOWNS[run.region].rooms[room.kind];
              return (
                <button key={i} className={`dg-room ${isHere ? 'here' : ''} ${can ? 'can' : ''} ${past ? 'past' : ''} ${isHere && run.cleared ? 'done' : ''}`}
                  disabled={!can} onClick={() => { game.dungeonGo(i); if (room.kind === 'shop') onShop(); else if (room.kind !== 'camp') onEnter(); }} aria-label={`${label}: ${info.text}`}>
                  <span className="dg-room-emoji">{info.emoji}</span>
                  <span className="tiny">{label}</span>
                  {isHere && <span className="dg-room-you">YOU</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="dg-map-bottom">
        <div className="dg-map-bag">
          <span className="tiny muted">Run bag</span>
          {items.length ? items.slice(0, 14).map((x) => <span key={x.id} className="ex-found-item"><ItemIcon id={x.id} size={20} /><span className="tiny mono">{x.qty.toLocaleString()}</span></span>) : <span className="tiny muted">empty</span>}
          {items.length > 14 && <span className="tiny muted">+{items.length - 14} more</span>}
        </div>
        <div className="dg-map-act">
          {!run.cleared && <button className="btn btn-hero" onClick={onEnter}>{here.kind === 'boss' ? '👑 FACE THE BOSS' : `ENTER ${ROOM_INFO[here.kind].emoji} ${DUNGEON_TOWNS[run.region].rooms[here.kind].toUpperCase()}`}</button>}
          {run.cleared && choices.length > 0 && <span className="small">Choose your next room ▶</span>}
          {run.cleared && here.kind === 'shop' && <button className="btn dg-shopbtn" onClick={onShop}>🧺 WICK'S STALL</button>}
          {canExtract(run) && <button className="btn dg-out" onClick={() => { sound.play('levelup'); onExtract(); }}>🚪 LEAVE WITH YOUR LOOT</button>}
        </div>
      </div>
    </div>
  );
}

/** 🧺 Wick's stall: sell run-bag finds for gold, buy trail food or a healing draught. All in run-bag gold. */
function WickStall({ run, onClose }: { run: DungeonRun; onClose: () => void }) {
  useGame(); // redraw as gold changes
  const hero = game.dungeonHero();
  const max = hero ? maxHp(hero) : run.hp;
  const gold = bagGold(run);
  const items = run.bag.filter((x) => x.qty > 0 && wickPays(x.id) > 0);
  const food = trailFood(run.region), fp = foodPrice(run.region), dp = draughtPrice(run.region);
  const total = items.reduce((n, x) => n + wickPays(x.id) * x.qty, 0);
  return (
    <div className="dg-map dg-stall">
      <div className="dg-map-top">
        <b className="gold">🧺 Wick's stall</b>
        <div className="dg-hp"><div style={{ width: `${(100 * run.hp) / max}%` }} /><span className="mono">{Math.round(run.hp).toLocaleString()} / {max.toLocaleString()}</span></div>
        <span className="small mono dg-gold">💰 {gold.toLocaleString()}</span>
        <span className="small">🍖 {foodCount(run)}/{FOOD_MAX}</span>
        <button className="dg-icon" onClick={onClose} aria-label="Back to the map">🗺️</button>
      </div>
      <p className="tiny muted dg-wick">“Gold's no good to you if you don't make it out, friend. I pay a touch over the Trading Post — it's dark down here.”</p>
      <div className="dg-stall-cols">
        <div className="dg-stall-buy">
          <b className="small">Buy</b>
          <button className="dg-ware" disabled={gold < fp || foodCount(run) >= FOOD_MAX} onClick={() => game.dungeonBuy('food')}>
            <ItemIcon id={food} size={26} /><span className="grow small">{ITEMS[food]?.name ?? 'Trail food'}<span className="tiny muted dg-ware-text">+1 food (heals 30%)</span></span><b className="mono small">💰 {fp.toLocaleString()}</b>
          </button>
          <button className="dg-ware" disabled={gold < dp || run.hp >= max} onClick={() => game.dungeonBuy('draught')}>
            <span className="dg-ware-emoji">🧪</span><span className="grow small">Healing draught<span className="tiny muted dg-ware-text">heals {Math.round(DRAUGHT_HEAL * 100)}% now</span></span><b className="mono small">💰 {dp.toLocaleString()}</b>
          </button>
        </div>
        <div className="dg-stall-sell">
          <div className="row-between"><b className="small">Sell <span className="tiny muted">(tap to sell all of one)</span></b>
            {items.length > 0 && <button className="btn small" onClick={() => { for (const x of items) game.dungeonSell(x.id); }}>SELL ALL · 💰 {total.toLocaleString()}</button>}</div>
          <div className="dg-sell-grid">
            {items.length ? items.map((x) => (
              <button key={x.id} className="dg-sell" onClick={() => game.dungeonSell(x.id)} aria-label={`Sell ${x.qty} ${ITEMS[x.id]?.name} for ${wickPays(x.id) * x.qty}`}>
                <ItemIcon id={x.id} size={24} /><span className="tiny mono">×{x.qty.toLocaleString()}</span><span className="tiny mono gold">{(wickPays(x.id) * x.qty).toLocaleString()}</span>
              </button>
            )) : <span className="tiny muted">Nothing to sell yet — your run bag only has gold.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The end of a run: out with your loot, the boss beaten, or knocked out and everything lost. */
function RunEndPanel({ end, onClose }: { end: RunEnd; onClose: () => void }) {
  const lost = end.lost;
  const lostItems: ItemStack[] = [];
  if (lost) { for (const id of Object.values(lost.gear)) if (id) addStacks(lostItems, [{ id, qty: 1 }]); for (const id of Object.values(lost.sockets)) if (id) addStacks(lostItems, [{ id, qty: 1 }]); addStacks(lostItems, lost.food); addStacks(lostItems, lost.bag); }
  const list = (xs: ItemStack[]) => <div className="ex-found static">{xs.map((it) => <span key={it.id} className="ex-found-item"><ItemIcon id={it.id} size={24} /><span className="tiny mono">{it.qty.toLocaleString()}</span></span>)}</div>;
  return (
    <div className="dg-over">
      <div className="dg-panel">
        <div className="dg-big">{end.kind === 'won' ? '🏆' : end.kind === 'out' ? '🚪' : '💀'}</div>
        <b className="gold">{end.kind === 'won' ? `You beat ${townBoss(end.region)?.name ?? 'the boss'} and got out!` : end.kind === 'out' ? 'You got out with your loot!' : 'Knocked out — it all stays in the dungeon'}</b>
        {end.kind === 'dead'
          ? <><p className="small muted center">Lost: your gear, gems, food and finds. XP you earned on the way is kept.</p>{lostItems.length > 0 && list(lostItems)}</>
          : <>{end.found && <DungeonFound found={end.found} rested={!!end.rested} region={end.region} />}
              <p className="small">🎒 Brought home{end.bag.length ? ':' : ' — nothing this time.'}</p>{end.bag.length > 0 && list(end.bag)}
              <p className="tiny muted center">Your gear is back on.</p></>}
        <div className="dg-panel-btns"><button className="btn btn-hero" onClick={() => { sound.play('click'); onClose(); }}>BACK TO TOWN</button></div>
      </div>
    </div>
  );
}

/** One room, played in real time. */
function RoomPlay({ run: dRun, land, onEnd }: { run: DungeonRun; land: boolean; onEnd: (e: RunEnd | null) => void }) {
  const { slot } = useGame();
  const [hero] = useState(() => game.dungeonHero()!);
  const region = dRun.region;
  const room = roomOf(dRun);
  const [startSnacks] = useState(() => foodCount(dRun));
  const [bar, setBar] = useState<(string | null)[]>(() => readBar(slot, hero));
  const [run] = useState<Run>(() => {
    const why: Partial<Record<NodeKind, string>> = {};
    for (const k of NODE_KINDS) { const w = whyCantHarvest(hero, region, k); if (w) why[k] = w; }
    return newDungeon(hero, region, readBar(slot, hero), room.seed, { kind: room.kind, depth: dRun.row, hp: dRun.hp, snacks: startSnacks, why });
  });
  const [book, setBook] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [, setTick] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<Input>({ left: false, right: false, jump: false, attack: false, down: false });
  const look = useRef(lookOf(hero));
  const controls = useRef<HTMLDivElement>(null);
  // What this room has turned up (it joins the run bag only when the room is cleared) and what the boss gave.
  const pending = useRef<ItemStack[]>([]);
  const found = useRef<ExRun['found']>({ items: [], xp: {}, kills: 0 });
  const ended = useRef(false);
  const rested = useRef(false);
  const camY = useRef<number | null>(null);
  const landRef = useRef(land);
  landRef.current = land;
  const paused = book || confirm;

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
      // Frozen while the game is in the background (a phone in a pocket must never get you knocked out).
      if (!paused && !ended.current && !document.hidden) {
        const before = run.phase;
        for (const s of step(run, dt, input.current)) playSound(s);
        if (run.fallen.length) pay();
        while (run.opened > 0) { run.opened--; game.dungeonChest(pending.current); }
        while (run.harvested.length) game.dungeonHarvest(run.harvested.shift()!, pending.current);
        if (run.goldGot) { game.dungeonGold(pending.current, run.goldGot); run.goldGot = 0; }
        if (run.phase !== before) finish(run.phase === 'won');
      }
      const c = canvas.current;
      if (c) {
        const g = c.getContext('2d')!;
        // Fill the whole screen: fit the 360-wide world to the width. v0.0.1.73: the ground sits on top of the
        // controls strip (so buttons sit on the dirt, not over the fight), and the camera rises when you climb.
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const cw = c.clientWidth, ch = c.clientHeight;
        if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); }
        // Sideways (v0.0.1.74): fit the height instead, so you see much further left and right; the buttons
        // sit over the corners and the ground runs along the bottom.
        const land = landRef.current;
        const sc = Math.min(cw / VIEW_W, ch / (land ? 430 : 520)) * dpr;
        const side = (c.width / sc - VIEW_W) / 2;
        const visW = c.width / sc;
        const cam = Math.max(side - 10 - (land ? visW * 0.3 : 0), Math.min(run.worldW - VIEW_W - side + 10, run.hero.x - visW * 0.38 + side));
        const band = land ? 64 : controls.current?.offsetHeight ?? 240;
        const groundAt = ((ch - band) * dpr) / sc; // logical px from the top of the screen to the ground
        const restY = GROUND - groundAt;
        const want = Math.min(restY, run.hero.y - HERO_H - ((land ? 70 : 150) * dpr) / sc);
        camY.current = camY.current === null ? want : camY.current + (want - camY.current) * Math.min(1, dt * 0.006);
        const ox = (c.width - VIEW_W * sc) / 2, oy = -camY.current * sc;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = '#0f172a'; g.fillRect(0, 0, c.width, c.height);
        g.setTransform(sc, 0, 0, sc, ox, oy);
        g.imageSmoothingEnabled = false;
        drawWorld(g, run, look.current, cam, oy / sc, ox / sc, camY.current + c.height / sc);
      }
      if (now - hudAt > 120) { hudAt = now; setTick((n) => n + 1); }
      schedule();
    };
    schedule();
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [run, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard (for testing on a computer)
  useEffect(() => {
    const set = (e: KeyboardEvent, on: boolean) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') input.current.left = on;
      else if (k === 'arrowright' || k === 'd') input.current.right = on;
      else if (k === 'arrowup' || k === 'w' || k === ' ') input.current.jump = on;
      else if (k === 'arrowdown' || k === 's') input.current.down = on;
      else if (k === 'j' || k === 'z') input.current.attack = on;
      else if (on && ['1', '2', '3', '4'].includes(k)) skill(Number(k) - 1);
      else return;
      e.preventDefault();
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  });

  const hold = (k: 'left' | 'right' | 'jump' | 'attack' | 'down', tapSound?: SoundKey) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); input.current[k] = true; if (tapSound) sound.play(tapSound, { volume: 0.35, rate: 1.3 }); },
    onPointerUp: () => { input.current[k] = false; },
    onPointerCancel: () => { input.current[k] = false; },
    onLostPointerCapture: () => { input.current[k] = false; },
  });
  const skill = (i: number) => {
    const s = castSkill(run, i);
    if (s) playSound(s); else sound.play('tick', { rate: 0.7, volume: 0.4 });
  };
  // 🏰 Beaten monsters: XP right away (always kept); their loot goes into this room's finds.
  const pay = () => {
    if (!run.fallen.length) return;
    const kills = run.fallen.splice(0);
    if (kills.some((k) => k.boss)) rested.current = game.dungeonBossReadyAt(region) > 0;
    game.dungeonReward(found.current, region, run.style, kills, pending.current);
  };
  const finish = (won: boolean) => {
    pay();
    if (ended.current) return;
    ended.current = true;
    if (won) {
      sound.play('levelup', { rate: 1.25 });
      const boss = room.kind === 'boss';
      const bag = dRun.bag.map((x) => ({ ...x }));
      addStacks(bag, pending.current);
      game.dungeonRoomCleared(run.hero.hp, startSnacks - run.snacks, pending.current, run.kills);
      onEnd(boss ? { kind: 'won', region, bag, found: found.current, rested: rested.current } : null);
    } else {
      sound.play('fail');
      const lost = game.dungeonDie();
      onEnd({ kind: 'dead', region, bag: [], lost: lost ?? undefined });
    }
  };
  const saveBar = (b: (string | null)[]) => { setBar(b); writeBar(slot, b); run.bar = b; };

  const h = run.hero;
  const boss = bossOf(run);
  const bossOn = boss && h.x > run.arenaX - 40;
  const leftMobs = run.mobs.filter((m) => m.hp > 0);
  const left = leftMobs.length;
  // Point the way to monsters you walked past (the door stays locked until they're beaten).
  const where = left && leftMobs.every((m) => m.x < h.x - 150) ? ' ◀' : left && leftMobs.every((m) => m.x > h.x + 150) ? ' ▶' : left && leftMobs.every((m) => m.y < h.y - 40) ? ' ▲' : '';
  const info = { ...ROOM_INFO[room.kind], name: DUNGEON_TOWNS[region].rooms[room.kind] };

  return (
    <>
      <canvas ref={canvas} className="dg-canvas" />
      <div className="dg-hud">
        <div className="dg-hp"><div style={{ width: `${(100 * h.hp) / h.maxHp}%` }} /><span className="mono">{Math.max(0, Math.round(h.hp)).toLocaleString()} / {h.maxHp.toLocaleString()}</span></div>
        <button className="dg-icon" onClick={() => { sound.play('click'); setBook(true); }} aria-label="Skill book">📖</button>
        <button className="dg-icon" onClick={() => { sound.play('click'); setConfirm(true); }} aria-label="Back to the map">🗺️</button>
      </div>
      <div className="dg-sub">
        <span className="small">{info.emoji} {info.name}{room.kind !== 'boss' && left > 0 ? ` · 👾 ${left} left${where}` : room.kind !== 'boss' ? ' · 🚪 the door is open' : ''}</span>
        {bossOn && boss ? (
          <div className="dg-boss"><b className="tiny">👑 {bossDef(run).name}</b><div className="dg-bar"><div style={{ width: `${(100 * Math.max(0, boss.hp)) / boss.maxHp}%` }} /></div></div>
        ) : <div className="dg-bar path"><div style={{ width: `${pathProgress(run) * 100}%` }} /></div>}
      </div>

      {run.banner && (() => {
        const b = run.banner!;
        const op = Math.min(1, b.t / 300, (2600 - b.t) / 600);
        return (
          <div className="dg-banner" style={{ opacity: Math.max(0, op) }}>
            <span className="dg-banner-sub">{b.sub || `${AREAS[region].emoji} Room ${dRun.row + 1} of ${dRun.rows.length}`}</span>
            {!b.sub && <span className="dg-banner-hint">{DUNGEON_TOWNS[region].hint}</span>}
            <span className="dg-banner-text">{b.text || `${info.emoji} ${info.name}`}</span>
          </div>
        );
      })()}
      {run.combo >= 3 && <div key={run.combo} className="dg-combo"><b>{run.combo}</b><span>HITS</span></div>}
      {/* v0.0.1.73 (owner: "the controls are too close together"): a strip of its own along the bottom — the stick
          answers anywhere on the left, and the skill bubbles sit in a curve around Attack with room between them. */}
      <div className="dg-controls" ref={controls}>
        <Thumbstick input={input} />
        {/* 🍖 Back by your thumb (v0.0.1.74, owner: "I liked the food nearby my fingers") — packed food now */}
        <button className="dg-btn dg-snack" disabled={run.snacks <= 0} onClick={() => { if (eatSnack(run)) sound.play('eat'); else sound.play('error', { volume: 0.5 }); }} aria-label={`Snack (${run.snacks} left)`}>🍖<span className="dg-n">{run.snacks}</span></button>
        <div className="dg-act">
          {bar.map((id, i) => {
            const s = id ? SKILL_MAP[id] : null;
            const cd = id ? (run.cd[id] ?? 0) : 0;
            return (
              <button key={i} className={`dg-skill s${i} ${s ? '' : 'empty'}`} onPointerDown={(e) => { e.preventDefault(); if (s) skill(i); else { sound.play('click'); setBook(true); } }} aria-label={s ? s.name : 'Empty skill bubble'}
                style={{ ['--cd' as string]: s && cd > 0 ? `${(cd / s.cdMs) * 360}deg` : '0deg' }}>
                <span>{s ? s.emoji : '+'}</span>
              </button>
            );
          })}
          <button className="dg-btn jump" {...hold('jump', 'whoosh')} aria-label="Jump">⤒</button>
          <button className="dg-btn attack" {...hold('attack')} aria-label="Attack">{run.style === 'ranged' ? '🏹' : run.style === 'magic' ? '🪄' : '⚔️'}</button>
        </div>
      </div>
      {confirm && (
        <div className="dg-over">
          <div className="dg-panel">
            <b className="gold">Back to the map?</b>
            <p className="small muted center">This room starts over, and whatever it turned up is lost. XP you earned stays.</p>
            <div className="dg-panel-btns">
              <button className="btn btn-hero" onClick={() => { sound.play('click'); setConfirm(false); }}>KEEP FIGHTING</button>
              <button className="btn" onClick={() => { sound.play('click'); ended.current = true; onEnd(null); }}>Back to the map</button>
            </div>
          </div>
        </div>
      )}
      {book && <SkillBook player={hero} bar={bar} onBar={saveBar} style={run.style} onClose={() => { sound.play('click'); setBook(false); }} />}
    </>
  );
}

/** 🏰 What a run earned: XP, loot, and the boss's treasure (pet, Cottage piece, lore note). */
function DungeonFound({ found, rested, region }: { found: ExRun['found']; rested: boolean; region: string }) {
  const xp = Object.entries(found.xp).filter(([, n]) => (n ?? 0) > 0);
  const at = game.dungeonBossReadyAt(region as Run['region']);
  return (
    <div className="dg-found">
      <p className="small">⚔️ {found.kills} monster{found.kills === 1 ? '' : 's'} beaten</p>
      {rested && <p className="tiny muted center">👑 Its treasure was resting{at ? ` — back in ${Math.max(1, Math.ceil((at - Date.now()) / 60_000))} min` : ''}. You still got its XP and some loot.</p>}
      {found.pet && <p className="small gold">🐾 {PET_MAP[found.pet]?.emoji} {PET_MAP[found.pet]?.name} came home with you!</p>}
      {found.cottage && <p className="small gold">🏡 {FURNITURE_MAP[found.cottage]?.emoji} {FURNITURE_MAP[found.cottage]?.name} — it's waiting in your Cottage!</p>}
      {found.lore && <p className="small">📜 New note in your Journal: <b>{found.lore}</b></p>}
      {xp.length > 0 && <div className="ex-xp">{xp.map(([s, n]) => <span key={s} className="tiny"><b>{SKILL_INFO[s as keyof typeof SKILL_INFO].name}</b> +{Math.round(n!).toLocaleString()} XP</span>)}</div>}
      {found.items.length > 0 && <div className="ex-found static">{found.items.map((it) => <span key={it.id} className="ex-found-item"><ItemIcon id={it.id} size={24} /><span className="tiny mono">{it.qty.toLocaleString()}</span></span>)}</div>}
    </div>
  );
}

// ----- ↔️ Sideways (v0.0.1.74, owner: "can we make the dungeon landscape… instead of portrait") -----
// The installed app is locked to portrait, so on a phone held upright the dungeon screen is turned a quarter
// turn with CSS and you turn the phone to the left. Touches arrive in screen coordinates, so they are turned
// back into the screen's own (local) coordinates here.
const view = { rot: false, root: null as HTMLElement | null };
function toLocal(cx: number, cy: number): { x: number; y: number } {
  const r = view.root?.getBoundingClientRect();
  if (!r) return { x: cx, y: cy };
  return view.rot ? { x: cy - r.top, y: r.right - cx } : { x: cx - r.left, y: cy - r.top };
}
function localRect(el: HTMLElement) {
  const b = el.getBoundingClientRect();
  const a = toLocal(view.rot ? b.right : b.left, b.top);
  return { left: a.x, top: a.y, width: view.rot ? b.height : b.width, height: view.rot ? b.width : b.height };
}
/** A phone held upright: turn the dungeon sideways. (On a computer, just show it as it is.) */
const wantsTurn = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches && window.innerHeight > window.innerWidth;

// ----- 🕹️ Thumbstick (owner's wish, v0.0.1.71): drag sideways to walk (a small tilt walks slowly),
// pull down to drop through a ledge with Jump. It follows your thumb wherever you first touch inside it.
const STICK_R = 46;
// v0.0.1.73: the whole left part of the controls strip is the stick's touch area — the stick appears where your
// thumb lands, so you can't miss it.
function Thumbstick({ input }: { input: React.MutableRefObject<Input> }) {
  const zone = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const centre = useRef({ x: 0, y: 0 });
  const down = useRef(false);
  const set = (dx: number, dy: number) => {
    const len = Math.hypot(dx, dy);
    const k = len > STICK_R ? STICK_R / len : 1;
    const x = dx * k, y = dy * k;
    setKnob({ x, y });
    // A little dead zone in the middle, then the tilt sets the speed.
    const nx = x / STICK_R;
    const mx = Math.abs(nx) < 0.18 ? 0 : Math.sign(nx) * Math.min(1, 0.35 + (Math.abs(nx) - 0.18) * 1.1);
    input.current.moveX = mx;
    input.current.left = mx < 0;
    input.current.right = mx > 0;
    input.current.down = y / STICK_R > 0.55;
  };
  const end = () => { down.current = false; setKnob(null); setAt(null); input.current.moveX = 0; input.current.left = false; input.current.right = false; input.current.down = false; };
  return (
    <div ref={zone} className="dg-stickzone" role="slider" aria-label="Move: drag left or right, down to drop through a ledge" aria-valuenow={Math.round((knob?.x ?? 0) / STICK_R * 100)}
      onPointerDown={(e) => {
        e.preventDefault();
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* keep going without capture */ }
        const r = localRect(zone.current!);
        const p = toLocal(e.clientX, e.clientY);
        // Keep the ring fully on screen, even if the touch lands near an edge.
        const pad = STICK_R + 14;
        const x = Math.max(pad, Math.min(r.width - pad, p.x - r.left));
        const y = Math.max(pad, Math.min(r.height - pad, p.y - r.top));
        centre.current = { x: r.left + x, y: r.top + y };
        setAt({ x, y });
        down.current = true;
        sound.play('tick', { volume: 0.35, rate: 1.3 });
        set(p.x - centre.current.x, p.y - centre.current.y);
      }}
      onPointerMove={(e) => { if (down.current) { const p = toLocal(e.clientX, e.clientY); set(p.x - centre.current.x, p.y - centre.current.y); } }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <div className={`dg-stick ${knob ? 'on' : ''}`} style={at ? { left: at.x, top: at.y, bottom: 'auto' } : undefined}>
        <span className="dg-stick-arrows" aria-hidden>‹ ›</span>
        <span className="dg-stick-knob" style={{ transform: `translate(${knob?.x ?? 0}px, ${knob?.y ?? 0}px)` }} />
      </div>
    </div>
  );
}

// ----- 📖 The skill book: drag 3 skills onto your bubbles -----
export function SkillBook({ player, bar, onBar, style, onClose }: { player: PlayerState; bar: (string | null)[]; onBar: (b: (string | null)[]) => void; style: CombatStyle; onClose: () => void }) {
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; sx: number; sy: number } | null>(null);
  const moved = !!drag && Math.hypot(drag.x - drag.sx, drag.y - drag.sy) > 8;
  const [picked, setPicked] = useState<string | null>(null);
  const [tab, setTab] = useState<CombatStyle | 'defense'>(style);
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
        {/* Sideways the cards are compact (no text), so the chosen skill's text shows here instead. */}
        <p className="tiny dg-book-info">{picked ? <><b>{SKILL_MAP[picked].emoji} {SKILL_MAP[picked].name}:</b> {SKILL_MAP[picked].text} Now tap a bubble.</> : 'Tap a skill to read it, then tap a bubble (or drag it onto one).'}</p>
        <div className="dg-book-tabs">
          {groups.map(([g, label]) => {
            const open = SKILLS.filter((s) => s.style === g && !whyCantUseSkill(player, s.id)).length;
            return <button key={g} className={`dg-book-tab ${tab === g ? 'on' : ''}`} onClick={() => { setTab(g); sound.play('card', { volume: 0.4 }); }}>{label} <span className="mono tiny muted">{open}/{SKILLS.filter((s) => s.style === g).length}</span></button>;
          })}
        </div>
        <div className="dg-book-list">
          {groups.filter(([g]) => g === tab).map(([g]) => (
            <div key={g} className="dg-book-grid">
              {SKILLS.filter((s) => s.style === g).map((s) => {
                const why = whyCantUseSkill(player, s.id);
                return (
                  <div key={s.id} className={`dg-card ${why ? 'locked' : ''} ${picked === s.id ? 'picked' : ''} ${bar.includes(s.id) ? 'on' : ''}`}
                    onPointerDown={(e) => { if (why) { sound.play('error', { volume: 0.4 }); return; } e.preventDefault(); sound.play('card', { volume: 0.5 }); setDrag({ id: s.id, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY }); }}
                    onClick={() => { if (!why) setPicked(picked === s.id ? null : s.id); }}>
                    <span className="dg-card-emoji">{why ? '🔒' : s.emoji}</span>{why && <span className="dg-card-lv mono">{s.level}</span>}
                    <span className="grow"><b className="small">{s.name}</b><span className="tiny muted dg-card-text">{why ?? s.text}</span></span>
                    <span className="tiny mono muted">{(s.cdMs / 1000).toFixed(s.cdMs % 1000 ? 1 : 0)}s</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {drag && moved && <div className="dg-ghost" style={{ left: toLocal(drag.x, drag.y).x, top: toLocal(drag.x, drag.y).y }}>{SKILL_MAP[drag.id].emoji}</div>}
    </div>
  );
}
