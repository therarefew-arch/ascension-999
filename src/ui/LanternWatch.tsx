// 🏮 Lantern Watch — the survivor mode's screen. The rules live in core/lanternWatch.ts; this file only
// draws the night on a canvas, reads your thumb (a floating joystick), plays the sounds, and keeps a
// saved night on this device (`ui.lantern.<slot>`) so you can leave and come back.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import { weaponStyle } from '../core/combat';
import { skillLevel } from '../core/idle';
import {
  buyOffer, canEvolve, choose, closeShop, keepWatching, loadRun, NIGHT_SECONDS, newRun, nightMonsters, nightXp, PASSIVES, rerollChoices,
  rerollShop, runXp, saveRun, startWeapon, step, stats, STUB_COINS, WEAPONS, type Choice, type Run, type ShopOffer, type Style, type WeaponId,
} from '../core/lanternWatch';
import { game, useGame } from '../core/store';
import { getItem } from '../data/items';
import { PET_MAP } from '../data/pets';
import { useNoScroll } from './useNoScroll';

type Result = ReturnType<typeof game.lanternWatchEnd>;
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const STYLE_NAME: Record<Style, string> = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic' };

// ----- The saved night (per save slot, on this device) -----
const saveKey = (slot: number | null) => `ui.lantern.${slot ?? 0}`;
function readSaved(slot: number | null): Run | null { try { return loadRun(localStorage.getItem(saveKey(slot))); } catch { return null; } }
function writeSaved(slot: number | null, r: Run) { try { localStorage.setItem(saveKey(slot), saveRun(r)); } catch { /* storage full or blocked */ } }
/** Is there a saved night waiting? (cheap check for the Combat screen button) */
export function hasSavedNight(slot: number | null) { try { return localStorage.getItem(saveKey(slot)) !== null; } catch { return false; } }
function clearSaved(slot: number | null) { try { localStorage.removeItem(saveKey(slot)); } catch { /* ignore */ } }

/** Emoji drawn once into a little canvas, then stamped many times (much faster than text every frame). */
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

/** Ground colours for each town's night. */
const GROUND: Record<string, [string, string]> = {
  Pocketvale: ['#1c2b1a', '#24361f'], Ironmoor: ['#26221f', '#302a25'], Coalhaven: ['#1d2024', '#262a2f'],
  Bluecliff: ['#1a2630', '#203140'], Lunaria: ['#1f2233', '#272a40'], Cinderpeak: ['#2b1c17', '#38231b'],
};

const wEmoji = (w: { id: WeaponId; evo?: boolean }) => (w.evo ? WEAPONS[w.id].evo.emoji : WEAPONS[w.id].emoji);
const wName = (w: { id: WeaponId; evo?: boolean }) => (w.evo ? WEAPONS[w.id].evo.name : WEAPONS[w.id].name);

/** A little arrow at the edge of the screen pointing at something off-screen. */
function edgeArrow(ctx: CanvasRenderingContext2D, w: number, h: number, dx: number, dy: number, emoji: string, color: string) {
  if (Math.abs(dx) < w / 2 - 20 && Math.abs(dy) < h / 2 - 20) return;
  const a = Math.atan2(dy, dx);
  const k = Math.min((w / 2 - 34) / Math.abs(Math.cos(a) || 1e-6), (h / 2 - 34) / Math.abs(Math.sin(a) || 1e-6));
  const x = w / 2 + Math.cos(a) * k, y = h / 2 + Math.sin(a) * k;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(4, -9); ctx.lineTo(4, 9); ctx.closePath(); ctx.fill();
  ctx.restore();
  const s = sprite(emoji, 18);
  ctx.drawImage(s, x - Math.cos(a) * 14 - s.width / 2, y - Math.sin(a) * 14 - s.height / 2);
}

function draw(ctx: CanvasRenderingContext2D, r: Run, w: number, h: number, joy: { ox: number; oy: number; x: number; y: number } | null) {
  ctx.save();
  if (r.shake > 0) ctx.translate((Math.random() - 0.5) * r.shake * 18, (Math.random() - 0.5) * r.shake * 18);
  const cx = w / 2 - r.px, cy = h / 2 - r.py;
  const [g1, g2] = GROUND[r.region] ?? GROUND.Pocketvale;
  ctx.fillStyle = g1;
  ctx.fillRect(-20, -20, w + 40, h + 40);
  // A checker of soft ground patches, plus a few tufts, so you can feel yourself moving.
  const T = 96;
  const x0 = Math.floor((r.px - w / 2) / T) - 1, y0 = Math.floor((r.py - h / 2) / T) - 1;
  for (let i = x0; i < x0 + w / T + 3; i++) for (let j = y0; j < y0 + h / T + 3; j++) {
    const hsh = ((i * 73856093) ^ (j * 19349663)) >>> 0;
    if ((i + j) % 2 === 0) { ctx.fillStyle = g2; ctx.fillRect(i * T + cx, j * T + cy, T, T); }
    if (hsh % 5 === 0) ctx.drawImage(sprite(hsh % 3 === 0 ? '🌾' : hsh % 3 === 1 ? '🌿' : '🪨', 14), i * T + cx + (hsh % 60), j * T + cy + ((hsh >> 8) % 60));
  }
  // Fire puddles
  for (const p of r.pools) {
    const x = p.x + cx, y = p.y + cy;
    const grd = ctx.createRadialGradient(x, y, p.r * 0.1, x, y, p.r);
    const a = Math.min(1, p.life);
    grd.addColorStop(0, `rgba(251,146,60,${0.55 * a})`); grd.addColorStop(0.7, `rgba(239,68,68,${0.3 * a})`); grd.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  // The Night Pedlar's cart
  if (r.cart) {
    const x = r.cart.x + cx, y = r.cart.y + cy;
    const grd = ctx.createRadialGradient(x, y, 4, x, y, 60);
    grd.addColorStop(0, 'rgba(253,224,71,0.35)'); grd.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, 60, 0, Math.PI * 2); ctx.fill();
    const s = sprite('🛒', 34);
    ctx.drawImage(s, x - s.width / 2, y - s.height / 2 + Math.sin(r.t * 3) * 2);
    const left = Math.max(0, r.cart.until - r.t);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 22, y + 24, 44, 4);
    ctx.fillStyle = '#fde047'; ctx.fillRect(x - 22, y + 24, 44 * Math.min(1, left / 75), 4);
  }
  // Pickups
  for (const p of r.pickups) {
    const x = p.x + cx, y = p.y + cy;
    if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
    if (p.kind === 'light') {
      ctx.fillStyle = p.v >= 10 ? '#fde047' : p.v >= 3 ? '#fcd34d' : '#fef3c7';
      ctx.beginPath(); ctx.arc(x, y, p.v >= 10 ? 6 : p.v >= 3 ? 4.5 : 3.2, 0, Math.PI * 2); ctx.fill();
    } else {
      const em = { meal: '🍗', magnet: '🧲', chest: '🎁', stub: '🕯️', hourglass: '⏳', keg: '🧨' }[p.kind];
      const s = sprite(em, p.kind === 'stub' ? 16 : 22);
      ctx.drawImage(s, x - s.width / 2, y - s.height / 2 + Math.sin(r.t * 4 + x) * 2);
    }
  }
  // Lantern glow weapon (a warm circle on the ground)
  const st = stats(r);
  const glow = r.weapons.find((x) => x.id === 'glow');
  if (glow) {
    const rad = (58 + 12 * (glow.evo ? 7 : glow.level)) * st.area;
    const grd = ctx.createRadialGradient(w / 2, h / 2, rad * 0.2, w / 2, h / 2, rad);
    grd.addColorStop(0, glow.evo ? 'rgba(253,224,71,0.3)' : 'rgba(251,191,36,0.22)'); grd.addColorStop(1, 'rgba(251,146,60,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(w / 2, h / 2, rad, 0, Math.PI * 2); ctx.fill();
  }
  // Monsters
  const frozen = r.freezeUntil > r.t;
  for (const e of r.enemies) {
    let x = e.x + cx, y = e.y + cy;
    if (x < -60 || y < -60 || x > w + 60 || y > h + 60) continue;
    const winding = (e.windUntil ?? 0) > r.t;
    if (winding) { x += (Math.random() - 0.5) * 4; y += (Math.random() - 0.5) * 4; }
    const emoji = e.boss ? r.boss.emoji : r.kinds[e.k]?.emoji ?? '👾';
    const s = sprite(emoji, Math.round(e.r * 1.9));
    if (e.flash > 0) ctx.globalAlpha = 0.55;
    if (e.slowUntil > r.t || frozen) { ctx.fillStyle = 'rgba(147,197,253,0.35)'; ctx.beginPath(); ctx.arc(x, y, e.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.drawImage(s, x - s.width / 2, y - s.height / 2);
    ctx.globalAlpha = 1;
    if (winding) { ctx.fillStyle = '#f87171'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', x, y - e.r - 6); }
    if (e.elite || e.boss) {
      const bw = e.r * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2, y - e.r - 10, bw, 4);
      ctx.fillStyle = e.boss ? '#f43f5e' : '#f59e0b'; ctx.fillRect(x - bw / 2, y - e.r - 10, bw * Math.max(0, e.hp / e.max), 4);
    }
  }
  // Monster spit
  for (const f of r.foes) {
    const x = f.x + cx, y = f.y + cy;
    ctx.fillStyle = 'rgba(192,132,252,0.35)'; ctx.beginPath(); ctx.arc(x, y, f.r * 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9d5ff'; ctx.beginPath(); ctx.arc(x, y, f.r * 0.8, 0, Math.PI * 2); ctx.fill();
  }
  // Shots
  for (const sh of r.shots) {
    const x = sh.x + cx, y = sh.y + cy;
    if (sh.kind === 'arrow') {
      const a = Math.atan2(sh.vy, sh.vx);
      ctx.strokeStyle = '#e7d3a8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 12, y - Math.sin(a) * 12); ctx.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); ctx.stroke();
    } else if (sh.kind === 'bolt') {
      ctx.fillStyle = 'rgba(167,139,250,0.35)'; ctx.beginPath(); ctx.arc(x, y, sh.r * 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ede9fe'; ctx.beginPath(); ctx.arc(x, y, sh.r * 0.8, 0, Math.PI * 2); ctx.fill();
    } else if (sh.kind === 'wisp') {
      ctx.fillStyle = 'rgba(103,232,249,0.3)'; ctx.beginPath(); ctx.arc(x, y, sh.r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cffafe'; ctx.beginPath(); ctx.arc(x, y, sh.r * 0.7, 0, Math.PI * 2); ctx.fill();
    } else {
      const s = sprite(sh.kind === 'boomer' ? (r.weapons.find((q) => q.id === 'boomer')?.evo ? '🌙' : '🪃') : '🪓', 22);
      ctx.save(); ctx.translate(x, y); ctx.rotate(r.t * 12); ctx.drawImage(s, -s.width / 2, -s.height / 2); ctx.restore();
    }
  }
  // Ember ring
  const ring = r.weapons.find((x) => x.id === 'ring');
  if (ring) {
    const L = ring.evo ? 7 : ring.level;
    const n = 1 + L + (ring.evo ? 2 : 0), rad = (62 + 4 * L) * st.area;
    const s = sprite(ring.evo ? '☀️' : '🔥', ring.evo ? 22 : 18);
    for (let j = 0; j < n; j++) {
      const a = r.t * (ring.evo ? 4 : 3) + (j / n) * Math.PI * 2;
      ctx.drawImage(s, w / 2 + Math.cos(a) * rad - s.width / 2, h / 2 + Math.sin(a) * rad - s.height / 2);
    }
  }
  // Effects
  for (const f of r.fx) {
    const k = f.t / f.life, x = f.x + cx, y = f.y + cy;
    ctx.globalAlpha = Math.max(0, 1 - k);
    if (f.kind === 'slash') {
      ctx.strokeStyle = r.weapons.find((q) => q.id === 'sword')?.evo ? '#fde047' : '#f8fafc'; ctx.lineWidth = 5 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(x, y, f.r * (0.7 + 0.3 * k), f.a - 1.1, f.a + 1.1); ctx.stroke();
    } else if (f.kind === 'strike') {
      ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 6, y - 120); ctx.lineTo(x + 5, y - 60); ctx.lineTo(x - 4, y - 30); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = 'rgba(253,230,138,0.3)'; ctx.beginPath(); ctx.arc(x, y, f.r, 0, Math.PI * 2); ctx.fill();
    } else if (f.kind === 'nova') {
      ctx.strokeStyle = '#bae6fd'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, f.r * k, 0, Math.PI * 2); ctx.stroke();
    } else if (f.kind === 'pounce') {
      ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.arc(x, y, f.r * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
    } else if (f.kind === 'gust') {
      ctx.strokeStyle = 'rgba(226,232,240,0.8)'; ctx.lineWidth = 2;
      for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(x, y, f.r * (0.4 + 0.6 * k) - j * 14, f.a - 0.6, f.a + 0.6); ctx.stroke(); }
    } else if (f.kind === 'thrust') {
      ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 8 * (1 - k) + 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(f.a) * f.r, y + Math.sin(f.a) * f.r); ctx.stroke();
    } else if (f.kind === 'num') {
      ctx.fillStyle = '#fde047'; ctx.font = 'bold 13px ui-monospace,monospace'; ctx.textAlign = 'center';
      ctx.fillText(String(f.v ?? ''), x, y - k * 22);
    } else if (f.kind === 'revive') {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x, y, f.r * k, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(x, y, f.r * k, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Companion and you (with your lantern)
  const pet = r.weapons.find((x) => x.id === 'pet');
  if (pet) {
    const s = sprite(pet.evo ? '🐺' : r.pet.emoji, pet.evo ? 26 : 22);
    ctx.drawImage(s, r.pet.x + cx - s.width / 2, r.pet.y + cy - s.height / 2);
  }
  const first = r.weapons[0]?.id;
  const me = sprite(first === 'arrows' ? '🧝' : first === 'bolt' ? '🧙' : '🤺', 28);
  const bob = r.moving ? Math.sin(r.t * 14) * 1.5 : 0;
  if (r.touchFlash > 0) ctx.globalAlpha = 0.5;
  ctx.drawImage(me, w / 2 - me.width / 2, h / 2 - me.height / 2 + bob);
  ctx.globalAlpha = 1;
  const lantern = sprite('🏮', 16);
  ctx.drawImage(lantern, w / 2 + 8, h / 2 - 2 + bob);
  ctx.restore();
  // The night: dark everywhere except the lantern's circle (a flicker keeps it alive).
  const lr = Math.min(w, h) * 0.46 + Math.sin(r.t * 7) * 3 + Math.sin(r.t * 2.3) * 4;
  const dark = ctx.createRadialGradient(w / 2, h / 2, lr * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  const deep = r.endless ? 0.96 : 0.93;
  dark.addColorStop(0, 'rgba(6,8,22,0.05)');
  dark.addColorStop(0.4, 'rgba(6,8,22,0.55)');
  dark.addColorStop(1, `rgba(6,8,22,${deep})`);
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, w, h);
  if (frozen) { ctx.fillStyle = 'rgba(147,197,253,0.12)'; ctx.fillRect(0, 0, w, h); }
  // Low health: a slow red heartbeat at the edges.
  if (r.hp < r.maxHp * 0.3) {
    const beat = 0.18 + Math.sin(r.t * 6) * 0.08;
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
    v.addColorStop(0, 'rgba(239,68,68,0)'); v.addColorStop(1, `rgba(239,68,68,${beat})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }
  // Getting hurt: a soft red edge.
  if (r.touchFlash > 0) { ctx.fillStyle = `rgba(239,68,68,${r.touchFlash * 0.5})`; ctx.fillRect(0, 0, w, h); }
  // Dawn creeping in near the end of the first night.
  if (!r.endless && r.t > NIGHT_SECONDS - 60) { ctx.fillStyle = `rgba(253,186,116,${Math.min(0.18, (r.t - (NIGHT_SECONDS - 60)) / 330)})`; ctx.fillRect(0, 0, w, h); }
  // Arrows to the cart and the great beast when they're off-screen.
  if (r.cart) edgeArrow(ctx, w, h, r.cart.x - r.px, r.cart.y - r.py, '🛒', '#fde047');
  const boss = r.enemies.find((e) => e.boss);
  if (boss) edgeArrow(ctx, w, h, boss.x - r.px, boss.y - r.py, r.boss.emoji, '#f43f5e');
  // The joystick (where your thumb is)
  if (joy) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 46, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(joy.x, joy.y, 20, 0, Math.PI * 2); ctx.fill();
  }
}

function choiceInfo(r: Run, c: Choice) {
  if (c.kind === 'weapon') {
    const d = WEAPONS[c.id];
    const p = PASSIVES[d.partner];
    const hint = c.level === 1 ? ` · evolves with ${p.emoji} ${p.name}` : c.level === 5 ? ` · then evolve it with ${p.emoji} + a chest` : '';
    return { emoji: d.emoji, name: d.name, tag: c.level === 1 ? 'NEW WEAPON' : c.level === 5 ? 'MAX' : `LEVEL ${c.level}`, text: (c.level === 1 ? d.text : d.up) + hint };
  }
  if (c.kind === 'passive') {
    const d = PASSIVES[c.id];
    const partnerOf = r.weapons.find((w) => WEAPONS[w.id].partner === c.id && !w.evo);
    return {
      emoji: d.emoji, name: d.name, tag: c.level === 1 ? 'NEW' : `LEVEL ${c.level}`,
      text: d.text + (partnerOf ? ` · evolves your ${WEAPONS[partnerOf.id].emoji}` : ''), partner: !!partnerOf,
    };
  }
  if (c.kind === 'meal') return { emoji: '🍗', name: 'Hot meal', tag: 'HEAL', text: 'Heal 30% of your health' };
  return { emoji: '💰', name: 'Pouch of coins', tag: 'COINS', text: `+${25 + r.level * 5} coins at dawn` };
}

function offerInfo(r: Run, o: ShopOffer) {
  if (o.kind === 'heal') return { emoji: '🍲', name: "Pedlar's stew", tag: 'HEAL', text: 'Back to full health' };
  return choiceInfo(r, o.c);
}

export function LanternWatch({ onClose }: { onClose: () => void }) {
  const { player, slot } = useGame();
  const style = weaponStyle(player) as Style;
  const styleLevel = skillLevel(player, style);
  const region = player.location;
  const night = nightMonsters(region);
  const [saved, setSaved] = useState<Run | null>(() => readSaved(slot));
  const [run, setRun] = useState<Run | null>(null);
  const [, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<Run | null>(null);
  const pausedRef = useRef(false);
  const paid = useRef(false);
  const joy = useRef<{ id: number; ox: number; oy: number; x: number; y: number } | null>(null);
  const keys = useRef(new Set<string>());
  useNoScroll(wrapRef);
  pausedRef.current = paused;

  // Night music while you watch; the town's song comes back after.
  useEffect(() => {
    sound.playMusic('music_lunaria');
    return () => sound.playMusic(musicFor(region));
  }, [region]);

  /** Ends the night and hands out the rewards (once). */
  const finish = (r: Run) => {
    if (paid.current) return null;
    paid.current = true;
    clearSaved(slot);
    return game.lanternWatchEnd({
      seconds: r.t, kills: r.kills, won: r.dawnWon, coins: r.coins, region: r.region,
      endlessSecs: r.endless ? r.t - r.endlessFrom : 0, stubs: r.stubs,
    });
  };
  /** Keeps the night on this device so it can be picked up later. */
  const keep = (r: Run) => { if (!paid.current && (r.phase === 'play' || r.phase === 'dawn')) writeSaved(slot, r); };
  // Leaving mid-night (or the app closing) saves it — you can carry on from the Lantern Watch button.
  useEffect(() => () => { const r = runRef.current; if (r) keep(r); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = (r: Run) => {
    runRef.current = r;
    // Test hook for local development only (never in the live game).
    if (import.meta.env.DEV) {
      const w = window as unknown as { __lw?: Run; __lwStep?: (s: number) => void };
      w.__lw = r;
      w.__lwStep = (secs: number) => {
        for (let i = 0; i < secs * 30 && r.phase === 'play'; i++) {
          if (r.choices) choose(r, r.choices[0]);
          if (r.shop) closeShop(r);
          step(r, 1 / 30, { dx: Math.cos(i / 90), dy: Math.sin(i / 90) });
        }
      };
    }
    paid.current = false;
    setResult(null);
    setPaused(false);
    setSaved(null);
    setRun(r);
  };
  const start = () => {
    clearSaved(slot);
    begin(newRun({ region, style, styleLevel, healthLevel: skillLevel(player, 'health'), petEmoji: player.activePet ? PET_MAP[player.activePet]?.emoji : undefined }));
    sound.play('enchant', { volume: 0.7 });
    sound.play('ignite', { volume: 0.6 });
  };
  const resume = () => {
    if (!saved) return;
    begin(saved);
    setPaused(true);
    sound.play('ignite', { volume: 0.6 });
  };
  /** A saved night you don't want to carry on: collect what it earned. */
  const endSaved = () => {
    if (!saved) return;
    runRef.current = saved;
    paid.current = false;
    if (saved.phase === 'play') saved.phase = 'lost';
    if (saved.phase === 'dawn') saved.phase = 'won';
    const res = finish(saved);
    setSaved(null);
    setRun(saved);
    if (res) setResult(res);
  };

  // ----- The game loop -----
  useEffect(() => {
    if (!run) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let hudAt = 0;
    let savedAt = performance.now();
    const lastSound: Record<string, number> = {};
    let lightCombo = 0;
    const throttle = (key: string, ms: number) => { const now = performance.now(); if ((lastSound[key] ?? 0) + ms > now) return false; lastSound[key] = now; return true; };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      run.view = { w: canvas.clientWidth, h: canvas.clientHeight };
    };
    resize();
    window.addEventListener('resize', resize);
    const FIRE: Partial<Record<WeaponId, [Parameters<typeof sound.play>[0], number]>> = {
      sword: ['shing', 1.4], arrows: ['whoosh', 1.6], bolt: ['rune', 1.3], storm: ['anvil', 1.6], nova: ['douse', 1.2], hatchet: ['whoosh', 0.9],
      boomer: ['whoosh', 1.2], flask: ['sizzle', 1.1], gust: ['whoosh', 0.7], spear: ['shing', 0.9], wisp: ['rune', 1.7],
    };
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && run.phase === 'play' && !run.choices && !run.shop) {
        let dx = 0, dy = 0;
        const j = joy.current;
        if (j) { dx = (j.x - j.ox) / 46; dy = (j.y - j.oy) / 46; }
        const k = keys.current;
        if (k.has('ArrowLeft') || k.has('a')) dx -= 1;
        if (k.has('ArrowRight') || k.has('d')) dx += 1;
        if (k.has('ArrowUp') || k.has('w')) dy -= 1;
        if (k.has('ArrowDown') || k.has('s')) dy += 1;
        // Small fixed steps keep the game fair on slow phones.
        let left = dt;
        while (left > 0 && run.phase === 'play' && !run.choices && !run.shop) { const s = Math.min(1 / 60, left); step(run, s, { dx, dy }); left -= s; }
      }
      // Sounds for what just happened (kept gentle — never a wall of noise).
      for (const ev of run.events) {
        if (ev.type === 'hit' && throttle(ev.boss ? 'bhit' : 'hit', ev.boss ? 120 : 70)) sound.play('hit', { rate: ev.boss ? 0.7 : 0.95 + Math.random() * 0.2, volume: 0.35 });
        if (ev.type === 'kill' && throttle('kill', 60)) sound.play(ev.elite ? 'boom' : 'chop', { rate: ev.elite ? 1 : 1.3 + Math.random() * 0.3, volume: ev.elite ? 0.7 : 0.25 });
        if (ev.type === 'light') { if (throttle('light', 45)) { lightCombo = Math.min(14, lightCombo + 1); sound.play('tick', { rate: 1 + lightCombo * 0.05, volume: 0.35 }); } }
        if (ev.type === 'hurt' && throttle('hurt', 250)) { sound.play('hurt', { volume: 0.55 }); game.vibrate(30); }
        if (ev.type === 'dodge' && throttle('dodge', 200)) sound.play('whoosh', { rate: 1.9, volume: 0.35 });
        if (ev.type === 'level') sound.play('levelup', { volume: 0.7 });
        if (ev.type === 'chest') { sound.play('coin', { volume: 0.8 }); sound.play('enchant', { rate: 1.2, volume: 0.6 }); }
        if (ev.type === 'evolve') { sound.play('levelup', { rate: 1.1, volume: 0.9 }); sound.play('enchant', { rate: 0.8, volume: 0.8 }); game.vibrate(80); }
        if (ev.type === 'stub' && throttle('stub', 80)) sound.play('coin', { rate: 1.6, volume: 0.4 });
        if (ev.type === 'meal') sound.play('eat', { volume: 0.7 });
        if (ev.type === 'cart') { sound.play('coin', { rate: 0.8, volume: 0.7 }); sound.play('welcome', { volume: 0.5 }); }
        if (ev.type === 'shop') sound.play('deposit', { volume: 0.7 });
        if (ev.type === 'revive') { sound.play('ignite', { volume: 0.9 }); sound.play('enchant', { rate: 0.7, volume: 0.8 }); game.vibrate(120); }
        if (ev.type === 'spit' && throttle('spit', 220)) sound.play('splash', { rate: 1.7, volume: 0.2 });
        if (ev.type === 'dash' && throttle('dash', 300)) sound.play('whoosh', { rate: 0.6, volume: 0.25 });
        if (ev.type === 'freeze') sound.play('douse', { rate: 0.8, volume: 0.8 });
        if (ev.type === 'keg') { sound.play('boom', { rate: 0.7, volume: 1 }); game.vibrate(100); }
        if (ev.type === 'boss') { sound.play('boom', { rate: 0.6, volume: 0.9 }); sound.play('block', { rate: 0.6, volume: 0.8 }); }
        if (ev.type === 'won') { sound.play('levelup', { volume: 0.9 }); game.vibrate(120); }
        if (ev.type === 'fire' && throttle(`f${ev.w}`, 120)) {
          const f = FIRE[ev.w];
          if (f) sound.play(f[0], { rate: f[1], volume: 0.22 });
        }
      }
      if (!run.events.some((e) => e.type === 'light')) lightCombo = Math.max(0, lightCombo - 0.05);
      run.events.length = 0;
      draw(ctx, run, canvas.clientWidth, canvas.clientHeight, joy.current);
      // The bars above the canvas update a few times a second.
      if (now - hudAt > 120 || run.choices || run.shop || run.phase !== 'play') { hudAt = now; setTick((t) => t + 1); }
      // Keep a copy on the device every 15 seconds, in case the app is closed.
      if (now - savedAt > 15000) { savedAt = now; keep(run); }
      if (run.phase === 'won' || run.phase === 'lost') {
        const res = finish(run);
        if (res) {
          setResult(res);
          if (res.won) sound.play('levelup', { volume: 0.9 });
          else sound.play('fail', { volume: 0.7 });
        }
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Switching apps pauses (and saves) the night.
    const vis = () => { if (document.hidden) { setPaused(true); keep(run); } };
    document.addEventListener('visibilitychange', vis);
    const kd = (e: KeyboardEvent) => { keys.current.add(e.key.length === 1 ? e.key.toLowerCase() : e.key); if (e.key === 'Escape') setPaused((p) => !p); };
    const ku = (e: KeyboardEvent) => keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Thumb joystick: touch anywhere, drag to walk -----
  const onDown = (e: React.PointerEvent) => {
    if (joy.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    joy.current = { id: e.pointerId, ox: x, oy: y, x, y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const j = joy.current;
    if (!j || j.id !== e.pointerId) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    let x = e.clientX - rect.left - j.ox, y = e.clientY - rect.top - j.oy;
    const d = Math.hypot(x, y);
    if (d > 46) { x = (x / d) * 46; y = (y / d) * 46; }
    j.x = j.ox + x; j.y = j.oy + y;
  };
  const onUp = (e: React.PointerEvent) => { if (joy.current?.id === e.pointerId) joy.current = null; };

  const refresh = () => setTick((t) => t + 1);
  const pick = (c: Choice) => {
    const r = runRef.current;
    if (!r) return;
    choose(r, c);
    sound.play('match', { volume: 0.7 });
    sound.play('enchant', { rate: 1.1, volume: 0.5 });
    refresh();
  };
  const reroll = () => {
    const r = runRef.current;
    if (!r) return;
    if (rerollChoices(r)) { sound.play('card', { volume: 0.8 }); sound.play('coin', { rate: 1.3, volume: 0.5 }); } else sound.play('whoosh', { volume: 0.4 });
    refresh();
  };
  const buy = (i: number) => {
    const r = runRef.current;
    if (!r) return;
    if (buyOffer(r, i)) { sound.play('coin', { volume: 0.8 }); sound.play('match', { rate: 1.2, volume: 0.5 }); } else sound.play('whoosh', { volume: 0.4 });
    refresh();
  };
  const shopReroll = () => {
    const r = runRef.current;
    if (!r) return;
    if (rerollShop(r)) { sound.play('card', { volume: 0.8 }); sound.play('card', { rate: 1.2, volume: 0.6 }); } else sound.play('whoosh', { volume: 0.4 });
    refresh();
  };
  const leaveShop = () => { const r = runRef.current; if (r) { closeShop(r); sound.play('click', { volume: 0.5 }); refresh(); } };
  const goEndless = () => {
    const r = runRef.current;
    if (!r) return;
    keepWatching(r);
    sound.play('ignite', { volume: 0.7 }); sound.play('boom', { rate: 0.5, volume: 0.6 });
    refresh();
  };

  const headHome = () => {
    const r = runRef.current;
    if (!r) return;
    if (r.phase === 'play') r.phase = 'lost';
    if (r.phase === 'dawn') r.phase = 'won';
    const res = finish(r);
    if (res) setResult(res);
    setPaused(false);
  };
  const saveAndLeave = () => {
    const r = runRef.current;
    if (r) keep(r);
    sound.play('deposit', { volume: 0.6 });
    runRef.current = null; // already saved: don't save again on close
    onClose();
  };

  const r = run;
  const intro = !r;
  const xpPreview = nightXp(styleLevel, NIGHT_SECONDS, 1500, true);
  const liveXp = r ? runXp(styleLevel, r) : null;
  const best = r ? (Object.entries(r.dmgBy) as [WeaponId, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3) : [];
  return createPortal(
    <div className="lw-root" ref={wrapRef}>
      {intro && (
        <div className="lw-intro">
          <div className="lw-title">🏮 LANTERN WATCH</div>
          {saved ? (
            <>
              <p className="lw-sub">You have a night waiting in <b>{saved.region}</b>.</p>
              <p className="small muted center">{fmtTime(saved.t)} held · level {saved.level} · {saved.kills.toLocaleString()} monsters · 🕯️ {saved.stubs}{saved.endless ? ' · endless watch' : ''}</p>
              <div className="lw-btns col">
                <button className="btn btn-hero btn-lg btn-wide" onClick={resume}>▶ Carry on the night</button>
                <button className="btn btn-lg btn-wide" onClick={endSaved}>🏠 End it & collect the rewards</button>
                <button className="btn btn-lg btn-wide" onClick={onClose}>Back</button>
              </div>
            </>
          ) : (
            <>
              <p className="lw-sub">Night falls on <b>{region}</b>. Hold the lantern until dawn.</p>
              <div className="lw-mobs">
                {night.kinds.map((k) => <span key={k.name} title={k.name}>{k.emoji}</span>)}
                <span className="lw-boss" title={night.boss.name}>{night.boss.emoji}</span>
              </div>
              <ul className="lw-rules small">
                <li>👆 Touch anywhere and drag to walk. Your attacks fire by themselves.</li>
                <li>✨ Gather light. <b>Every level-up, pick 1 of 3 power-ups</b>. Max a weapon, own its partner, then open a 🎁 chest to <b>evolve</b> it.</li>
                <li>🕯️ Collect candle stubs — spend them at the <b>Night Pedlar’s cart</b> (5:00) or to reroll your choices.</li>
                <li>❗ Watch out: some monsters wind up and <b>charge</b>, some <b>spit</b>.</li>
                <li>🌅 At 10:00 the great <b>{night.boss.name}</b> comes. Beat it — then head home or <b>keep watching</b> for more XP.</li>
                <li>💾 Pause to save and come back later. Knocked out? You keep everything you earned.</li>
              </ul>
              <p className="small muted">You start with <b>{WEAPONS[startWeapon(style)].name}</b> ({STYLE_NAME[style]}). A full night at your level is worth about <b>{xpPreview.style.toLocaleString()} {STYLE_NAME[style]} XP</b>, plus Health & Defense XP, coins and loot from {region}'s monsters.</p>
              <div className="lw-btns">
                <button className="btn btn-lg" onClick={onClose}>Back</button>
                <button className="btn btn-hero btn-lg" onClick={start}>🏮 Light the lantern</button>
              </div>
            </>
          )}
        </div>
      )}

      {r && (
        <>
          <canvas ref={canvasRef} className="lw-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
          <div className="lw-hud">
            <div className="lw-hud-row">
              <span className="lw-time mono">
                {r.endless ? `🌙 +${fmtTime(r.t - r.endlessFrom)}` : r.bossSpawned ? '🌅 DAWN' : `🌙 ${fmtTime(Math.max(0, NIGHT_SECONDS - r.t))}`}
              </span>
              <span className="lw-kills mono">💀 {r.kills.toLocaleString()}</span>
              <span className="lw-kills mono">🕯️ {r.stubs}</span>
              <button className="lw-pause" onClick={() => setPaused(true)} aria-label="Pause">⏸</button>
            </div>
            <div className="lw-bar hp"><div style={{ width: `${(r.hp / r.maxHp) * 100}%` }} /><span className="mono">❤️ {Math.ceil(r.hp)}/{r.maxHp}</span></div>
            <div className="lw-bar xp"><div style={{ width: `${(r.xp / r.need) * 100}%` }} /><span className="mono">Lv {r.level} · +{liveXp!.style.toLocaleString()} XP</span></div>
            <div className="lw-kit">
              {r.weapons.map((w) => <span key={w.id} className={`${w.evo ? 'evo' : ''} ${canEvolve(r, w) ? 'ready' : ''}`} title={`${wName(w)} ${w.level}`}>{wEmoji(w)}<sub>{w.evo ? '★' : w.level}</sub></span>)}
              {r.passives.map((p) => <span key={p.id} className="pas" title={`${PASSIVES[p.id].name} ${p.level}`}>{PASSIVES[p.id].emoji}<sub>{p.level}</sub></span>)}
            </div>
            {r.banner && <div className="lw-banner">{r.banner.text}</div>}
          </div>

          {r.choices && r.phase === 'play' && (
            <div className="lw-overlay">
              <div className="lw-panel">
                <div className="lw-level">⬆️ LEVEL {r.level}{r.pending > 1 ? ` · ${r.pending} picks` : ''}</div>
                <p className="small muted center">Choose a power-up</p>
                {r.choices.map((c, i) => {
                  const info = choiceInfo(r, c);
                  return (
                    <button key={i} className={`lw-choice ${'partner' in info && info.partner ? 'partner' : ''}`} onClick={() => pick(c)}>
                      <span className="lw-choice-emoji">{info.emoji}</span>
                      <span className="grow"><b>{info.name}</b> <span className="lw-tag">{info.tag}</span><span className="small muted">{info.text}</span></span>
                    </button>
                  );
                })}
                <button className="btn btn-wide" disabled={r.stubs < r.rerollCost} onClick={reroll}>🎲 New choices · {r.rerollCost} 🕯️ <span className="dim">(you have {r.stubs})</span></button>
              </div>
            </div>
          )}

          {r.shop && r.phase === 'play' && (
            <div className="lw-overlay">
              <div className="lw-panel">
                <div className="lw-level">🛒 THE NIGHT PEDLAR</div>
                <p className="small muted center">“Candle stubs, friend? I’ve wares for the dark.” · You have <b className="gold">🕯️ {r.stubs}</b></p>
                {r.shop.offers.map((o, i) => {
                  const info = offerInfo(r, o);
                  return (
                    <button key={i} className={`lw-choice ${o.sold ? 'sold' : ''}`} disabled={o.sold || r.stubs < o.cost} onClick={() => buy(i)}>
                      <span className="lw-choice-emoji">{info.emoji}</span>
                      <span className="grow"><b>{info.name}</b> <span className="lw-tag">{o.sold ? 'BOUGHT' : info.tag}</span><span className="small muted">{info.text}</span></span>
                      <span className="lw-price mono">{o.sold ? '✓' : `${o.cost} 🕯️`}</span>
                    </button>
                  );
                })}
                <button className="btn btn-wide" disabled={r.stubs < r.shop.reroll} onClick={shopReroll}>🎲 New wares · {r.shop.reroll} 🕯️</button>
                <button className="btn btn-hero btn-lg btn-wide" onClick={leaveShop}>🏮 Back into the night</button>
              </div>
            </div>
          )}

          {r.phase === 'dawn' && !result && (
            <div className="lw-overlay">
              <div className="lw-panel">
                <div className="lw-level">🌅 DAWN BREAKS!</div>
                <p className="small center">You beat the {night.boss.name}! Head home with your rewards — or keep the lantern lit through an <b>endless night</b>: harder every minute, a stronger great beast every 5 minutes, and <b>more XP for every minute</b> you last.</p>
                <p className="small muted center">So far: +{liveXp!.style.toLocaleString()} {STYLE_NAME[style]} XP · {r.kills.toLocaleString()} monsters · 🕯️ {r.stubs}</p>
                <button className="btn btn-hero btn-lg btn-wide" onClick={headHome}>🏠 Head home (collect rewards)</button>
                <button className="btn btn-lg btn-wide" onClick={goEndless}>🌙 Keep watching (endless)</button>
              </div>
            </div>
          )}

          {paused && r.phase === 'play' && !result && !r.choices && !r.shop && (
            <div className="lw-overlay">
              <div className="lw-panel">
                <div className="lw-level">⏸ PAUSED</div>
                <p className="small muted center">{fmtTime(r.t)} held · {r.kills.toLocaleString()} monsters · level {r.level} · +{liveXp!.style.toLocaleString()} XP so far</p>
                <button className="btn btn-hero btn-lg btn-wide" onClick={() => setPaused(false)}>▶ Keep watch</button>
                <button className="btn btn-lg btn-wide" onClick={saveAndLeave}>💾 Save & leave (carry on later)</button>
                <button className="btn btn-lg btn-wide" onClick={headHome}>🏠 Head home (collect rewards now)</button>
              </div>
            </div>
          )}

          {result && (
            <div className="lw-overlay">
              <div className="lw-panel">
                <div className="lw-level">{result.won ? (r.endless ? '🌙 What a watch!' : '🌅 DAWN BREAKS!') : '🌙 The night is over'}</div>
                <p className="small center">
                  {result.won ? (r.endless ? `You beat ${r.bossCount} great beast${r.bossCount > 1 ? 's' : ''} and held out ${fmtTime(r.t - r.endlessFrom)} into the endless night.` : `You beat the ${night.boss.name} and held the lantern until morning.`) : `You held out for ${fmtTime(r.t)}.`} {r.kills.toLocaleString()} monsters · level {r.level}.
                </p>
                <div className="lw-rewards">
                  <div><b className="gold">+{result.xp.style.toLocaleString()}</b> {STYLE_NAME[style]} XP</div>
                  <div><b className="gold">+{result.xp.health.toLocaleString()}</b> Health · <b className="gold">+{result.xp.defense.toLocaleString()}</b> Defense XP</div>
                  {result.coins > 0 && <div>🪙 <b className="gold">{result.coins.toLocaleString()}</b> coins{r.stubs > 0 ? <span className="small muted"> (incl. {r.stubs} 🕯️ × {STUB_COINS})</span> : null}</div>}
                  {result.items.length > 0 && <div className="small">{result.items.map((s) => `${s.qty > 1 ? `${s.qty.toLocaleString()}× ` : ''}${getItem(s.id).name}`).join(', ')}</div>}
                  {result.leftover > 0 && <div className="small red">Your bag was full — {result.leftover} item{result.leftover > 1 ? 's' : ''} left behind.</div>}
                  {result.pet && <div className="lw-pet">🦋 <b>Lumen</b> the lantern moth followed your light home!</div>}
                  {best.length > 0 && (
                    <div className="lw-best small">
                      {best.map(([id, d]) => {
                        const w = r.weapons.find((x) => x.id === id) ?? { id, evo: false };
                        return <span key={id}>{wEmoji(w)} {wName(w)} <b className="mono">{Math.round(d).toLocaleString()}</b></span>;
                      })}
                    </div>
                  )}
                </div>
                <button className="btn btn-hero btn-lg btn-wide" onClick={start}>🏮 Another night</button>
                <button className="btn btn-lg btn-wide" onClick={onClose}>Back to Combat</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
