// 🛡️ Hold the Wall — the tower defence screen. Rules live in core/holdWall.ts; this file draws the road
// on a canvas, turns taps into building / moving the Captain / casting spells, plays the sounds, and keeps
// the defence on this device (`ui.wall.<slot>`) so you can leave and come back.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sound } from '../audio/sound';
import { weaponStyle } from '../core/combat';
import {
  build, buildCost, castMilitia, castRock, CHARTERS, H, loadRun, MILITIA_COOLDOWN, moveHero, nearestOnPath, newRun, padsOf,
  pickCharter, roadOf, rockCooldown, ROLE_TEXT, saveRun, sell, sellValue, specCost, SPECS, specialise, startWave, step, towerStats, TOWERS,
  upgrade, upgradeCost, W, WAVES, wavesHeld, type Act, type CharterId, type Run, type SpecId, type Style, type TowerId,
} from '../core/holdWall';
import { game, useGame } from '../core/store';
import { getItem } from '../data/items';
import { useNoScroll } from './useNoScroll';

type Result = ReturnType<typeof game.holdWallEnd>;
const STYLE_NAME: Record<Style, string> = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic' };
const HERO_EMOJI: Record<Style, string> = { melee: '🤺', ranged: '🧝', magic: '🧙' };

const saveKey = (slot: number | null) => `ui.wall.${slot ?? 0}`;
function readSaved(slot: number | null): Run | null { try { return loadRun(localStorage.getItem(saveKey(slot))); } catch { return null; } }
function writeSaved(slot: number | null, r: Run) { try { localStorage.setItem(saveKey(slot), saveRun(r)); } catch { /* storage full */ } }
function clearSaved(slot: number | null) { try { localStorage.removeItem(saveKey(slot)); } catch { /* ignore */ } }
export function hasSavedWall(slot: number | null) { try { return localStorage.getItem(saveKey(slot)) !== null; } catch { return false; } }

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
const stamp = (ctx: CanvasRenderingContext2D, emoji: string, size: number, x: number, y: number, rot = 0, flip = false) => {
  const s = sprite(emoji, size);
  if (!rot && !flip) { ctx.drawImage(s, x - s.width / 2, y - s.height / 2); return; }
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); if (rot) ctx.rotate(rot); ctx.drawImage(s, -s.width / 2, -s.height / 2); ctx.restore();
};

/** Each town's colours: grass, grass patch, road edge, road, trees. */
const LOOK: Record<string, { g1: string; g2: string; edge: string; road: string; deco: string[]; gate: string }> = {
  Pocketvale: { g1: '#4d7c3a', g2: '#558a40', edge: '#7a5a34', road: '#b08a58', deco: ['🌳', '🌷', '🌾', '🌲'], gate: '🏰' },
  Ironmoor: { g1: '#5b6b4a', g2: '#64744f', edge: '#5a4a3c', road: '#8d7a66', deco: ['🪨', '🌲', '⛏️', '🪨'], gate: '🏯' },
  Coalhaven: { g1: '#4a5248', g2: '#525a50', edge: '#3a3632', road: '#6e6560', deco: ['🪨', '🌲', '🏚️', '🪨'], gate: '🏰' },
  Bluecliff: { g1: '#4f8a6a', g2: '#579373', edge: '#7c6a4c', road: '#c9b48a', deco: ['🌴', '🐚', '🌾', '⛵'], gate: '🏰' },
  Lunaria: { g1: '#3d5568', g2: '#445d71', edge: '#3b4a5a', road: '#8a93a3', deco: ['🌫️', '🌲', '🕯️', '🪦'], gate: '🏯' },
  Cinderpeak: { g1: '#6b5338', g2: '#755b3d', edge: '#4a2f22', road: '#9c6b4a', deco: ['🌋', '🪨', '🔥', '🌵'], gate: '🏯' },
};

interface View { s: number; ox: number; oy: number; w: number; h: number }
function draw(ctx: CanvasRenderingContext2D, r: Run, v: View, ui: { pad: number | null; flag: { x: number; y: number; t: number } | null; aim: 'rock' | 'militia' | null }) {
  const look = LOOK[r.region] ?? LOOK.Pocketvale;
  const road = roadOf(r.region), pads = padsOf(r.region);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = look.g1;
  ctx.fillRect(0, 0, v.w * 3, v.h * 3);
  const dpr = ctx.canvas.width / v.w;
  ctx.setTransform(v.s * dpr, 0, 0, v.s * dpr, v.ox * dpr, v.oy * dpr);
  // Grass patches and little decorations (the same every time: hashed from the grid).
  for (let i = -1; i < 10; i++) for (let j = -1; j < 18; j++) {
    const hsh = ((i * 73856093) ^ (j * 19349663)) >>> 0;
    if ((i + j) % 2 === 0) { ctx.fillStyle = look.g2; ctx.fillRect(i * 40, j * 40, 40, 40); }
    const x = i * 40 + (hsh % 30) + 5, y = j * 40 + ((hsh >> 7) % 30) + 5;
    if (hsh % 7 === 0 && nearestOnPath(road, x, y).dist > 34 && !pads.some(([a, b]) => Math.hypot(a - x, b - y) < 30)) stamp(ctx, look.deco[hsh % look.deco.length], 16, x, y);
  }
  // The road
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); road.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = look.edge; ctx.lineWidth = 40; ctx.stroke();
  ctx.strokeStyle = look.road; ctx.lineWidth = 32; ctx.stroke();
  ctx.setLineDash([6, 14]); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  // The gate at the end of the road
  const [gx] = road.pts[road.pts.length - 1];
  stamp(ctx, look.gate, 40, gx, H - 18);
  // Burning ground
  for (const p of r.pools) {
    const grd = ctx.createRadialGradient(p.x, p.y, p.r * 0.1, p.x, p.y, p.r);
    const a = Math.min(1, (p.until - r.t) / 0.6);
    if (p.slow) { grd.addColorStop(0, `rgba(203,213,225,${0.5 * a})`); grd.addColorStop(1, 'rgba(148,163,184,0)'); }
    else { grd.addColorStop(0, `rgba(251,146,60,${0.6 * a})`); grd.addColorStop(0.7, `rgba(239,68,68,${0.3 * a})`); grd.addColorStop(1, 'rgba(239,68,68,0)'); }
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  // Pads and towers
  pads.forEach(([x, y], i) => {
    const t = r.towers[i];
    if (ui.pad === i) {
      const range = t && t.id !== 'barracks' ? (towerStats(r, t) as { range: number }).range : t ? 70 : 0;
      if (range) { ctx.fillStyle = 'rgba(253,224,71,0.1)'; ctx.strokeStyle = 'rgba(253,224,71,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, range, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 8, 22, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t ? '#8b7d6b' : '#a39684'; ctx.strokeStyle = ui.pad === i ? '#fde047' : '#5c5144'; ctx.lineWidth = ui.pad === i ? 3 : 2;
    ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (!t) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+', x, y + 1); return; }
    const em = t.spec ? SPECS[t.spec].emoji : TOWERS[t.id].emoji;
    const kick = t.cd > (t.id === 'archer' ? 0.6 : 1.2) ? -2 : 0;
    stamp(ctx, em, 26, x, y - 6 + kick);
    ctx.fillStyle = '#fde047'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(t.spec ? '★★★★' : '★'.repeat(t.level), x, y + 16);
  });
  // Monsters
  for (const m of r.monsters) {
    const fly = m.role === 'flier';
    const bob = fly ? Math.sin(r.t * 6 + m.uid) * 3 - 8 : 0;
    if (fly) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(m.x, m.y + 6, m.r * 0.7, m.r * 0.3, 0, 0, Math.PI * 2); ctx.fill(); }
    if (m.armour >= 0.5) { ctx.strokeStyle = 'rgba(203,213,225,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(m.x, m.y + bob, m.r + 2, 0, Math.PI * 2); ctx.stroke(); }
    if (m.slowUntil > r.t) { ctx.fillStyle = 'rgba(147,197,253,0.35)'; ctx.beginPath(); ctx.arc(m.x, m.y + bob, m.r, 0, Math.PI * 2); ctx.fill(); }
    if (m.hitFlash > 0) ctx.globalAlpha = 0.6;
    const walk = m.blockedBy === null ? Math.sin(r.t * 10 + m.uid) * 1.5 : 0;
    stamp(ctx, m.emoji, Math.round(m.r * 1.9), m.x, m.y + bob + walk);
    ctx.globalAlpha = 1;
    if (m.hp < m.max || m.boss || m.elite) {
      const bw = Math.max(18, m.r * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.x - bw / 2, m.y + bob - m.r - 8, bw, 3.5);
      ctx.fillStyle = m.boss ? '#f43f5e' : m.elite ? '#f59e0b' : '#4ade80'; ctx.fillRect(m.x - bw / 2, m.y + bob - m.r - 8, bw * Math.max(0, m.hp / m.max), 3.5);
    }
  }
  // Soldiers and militia
  for (const s of r.soldiers) {
    if (s.deadUntil > r.t) continue;
    stamp(ctx, s.emoji, 17, s.x, s.y - 4, 0, s.target !== null && (r.monsters.find((m) => m.uid === s.target)?.x ?? s.x) < s.x);
    if (s.hp < s.max) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(s.x - 8, s.y - 17, 16, 2.5); ctx.fillStyle = '#60a5fa'; ctx.fillRect(s.x - 8, s.y - 17, 16 * Math.max(0, s.hp / s.max), 2.5); }
  }
  // Your Captain
  const h = r.hero;
  if (ui.flag && dist2(h.x, h.y, h.tx, h.ty) > 9) stamp(ctx, '🚩', 16, h.tx + 4, h.ty - 8);
  if (h.deadUntil > r.t) {
    stamp(ctx, '🪦', 18, h.x, h.y - 4);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(Math.ceil(h.deadUntil - r.t)), h.x, h.y - 18);
  } else {
    ctx.fillStyle = 'rgba(253,224,71,0.25)'; ctx.beginPath(); ctx.ellipse(h.x, h.y + 6, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
    stamp(ctx, HERO_EMOJI[h.style], 24, h.x, h.y - 6, 0, h.tx < h.x - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(h.x - 12, h.y - 24, 24, 3.5);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(h.x - 12, h.y - 24, 24 * Math.max(0, h.hp / h.max), 3.5);
  }
  // Shots
  for (const s of r.shots) {
    if (s.kind === 'arrow') {
      const a = Math.atan2(s.ty - s.y, s.tx - s.x);
      ctx.strokeStyle = '#f5e6c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x - Math.cos(a) * 9, s.y - Math.sin(a) * 9); ctx.lineTo(s.x + Math.cos(a) * 4, s.y + Math.sin(a) * 4); ctx.stroke();
    } else if (s.kind === 'orb' || s.kind === 'hero') {
      ctx.fillStyle = s.slow ? 'rgba(186,230,253,0.45)' : 'rgba(167,139,250,0.45)'; ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.slow ? '#e0f2fe' : '#ede9fe'; ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (s.kind === 'pot') stamp(ctx, '🔥', 14, s.x, s.y, r.t * 8);
    else stamp(ctx, '🪓', 14, s.x, s.y, r.t * 14);
  }
  // Effects
  for (const f of r.fx) {
    const k = f.t / f.life;
    if (f.kind === 'rock') {
      const land = f.at ?? 0.5;
      if (f.t < land) {
        const fall = f.t / land;
        ctx.fillStyle = `rgba(0,0,0,${0.15 + 0.25 * fall})`; ctx.beginPath(); ctx.ellipse(f.x, f.y, 14 * fall + 4, 6 * fall + 2, 0, 0, Math.PI * 2); ctx.fill();
        stamp(ctx, '🪨', 22, f.x, f.y - (1 - fall) * 220, f.t * 6);
      } else {
        ctx.globalAlpha = Math.max(0, 1 - (f.t - land) / Math.max(0.01, f.life - land));
        ctx.fillStyle = 'rgba(120,90,60,0.5)'; ctx.beginPath(); ctx.arc(f.x, f.y, (f.r ?? 40) * 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      continue;
    }
    ctx.globalAlpha = Math.max(0, 1 - k);
    if (f.kind === 'zap') {
      ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(f.x, f.y);
      const x2 = f.x2 ?? f.x, y2 = f.y2 ?? f.y;
      for (let j = 1; j < 5; j++) ctx.lineTo(f.x + (x2 - f.x) * (j / 5) + (Math.random() - 0.5) * 10, f.y + (y2 - f.y) * (j / 5) + (Math.random() - 0.5) * 10);
      ctx.lineTo(x2, y2); ctx.stroke();
    } else if (f.kind === 'num') {
      ctx.fillStyle = f.v?.startsWith('+') ? '#fde047' : '#fca5a5'; ctx.font = 'bold 10px ui-monospace,monospace'; ctx.textAlign = 'center';
      ctx.fillText(f.v ?? '', f.x, f.y - k * 16);
    } else {
      ctx.strokeStyle = f.kind === 'frost' ? '#bae6fd' : '#fdba74'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x, f.y, (f.r ?? 20) * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // Aiming a spell: a soft ring follows nothing (tap to place) — show a hint over the road.
  if (ui.aim) { ctx.fillStyle = ui.aim === 'rock' ? 'rgba(120,90,60,0.12)' : 'rgba(96,165,250,0.12)'; ctx.fillRect(0, 0, W, H); }
}
const dist2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;

export function HoldWall({ onClose }: { onClose: () => void }) {
  const { player, slot } = useGame();
  const style = weaponStyle(player) as Style;
  const region = player.location;
  const [saved, setSaved] = useState<Run | null>(() => readSaved(slot));
  const [run, setRun] = useState<Run | null>(null);
  const [, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fast, setFast] = useState(false);
  const [pad, setPad] = useState<number | null>(null);
  const [aim, setAim] = useState<'rock' | 'militia' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<Run | null>(null);
  const viewRef = useRef<View>({ s: 1, ox: 0, oy: 0, w: W, h: H });
  const ui = useRef<{ pad: number | null; flag: { x: number; y: number; t: number } | null; aim: 'rock' | 'militia' | null; paused: boolean; fast: boolean }>({ pad: null, flag: null, aim: null, paused: false, fast: false });
  const paid = useRef(false);
  useNoScroll(wrapRef);
  ui.current.pad = pad; ui.current.aim = aim; ui.current.paused = paused; ui.current.fast = fast;
  const preview = newRun({ region, style, seed: 1 });

  const finish = (r: Run) => {
    if (paid.current) return null;
    paid.current = true;
    clearSaved(slot);
    return game.holdWallEnd({ waves: wavesHeld(r), won: r.phase === 'won', kills: r.kills, region: r.region, dmg: r.dmg });
  };
  const keep = (r: Run) => { if (!paid.current && (r.phase === 'build' || r.phase === 'wave')) writeSaved(slot, r); };
  useEffect(() => () => { const r = runRef.current; if (r) keep(r); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = (r: Run) => {
    runRef.current = r;
    if (import.meta.env.DEV) {
      const w = window as unknown as { __hw?: Run; __hwStep?: (s: number) => void };
      w.__hw = r;
      w.__hwStep = (secs: number) => { for (let i = 0; i < secs * 30 && (r.phase === 'build' || r.phase === 'wave'); i++) { if (r.choices) pickCharter(r, r.choices[0]); step(r, 1 / 30); } };
    }
    paid.current = false;
    setResult(null); setPaused(false); setSaved(null); setPad(null); setAim(null);
    setRun(r);
  };
  const start = () => {
    clearSaved(slot);
    begin(newRun({ region, style }));
    sound.play('block', { rate: 0.7, volume: 0.7 });
    sound.play('welcome', { volume: 0.5 });
  };
  const resume = () => { if (saved) { begin(saved); setPaused(true); sound.play('welcome', { volume: 0.6 }); } };
  const endSaved = () => {
    if (!saved) return;
    runRef.current = saved;
    paid.current = false;
    saved.phase = 'lost';
    const res = finish(saved);
    setSaved(null); setRun(saved);
    if (res) setResult(res);
  };

  // ----- The game loop -----
  useEffect(() => {
    if (!run) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0, last = performance.now(), hudAt = 0, savedAt = performance.now();
    const lastSound: Record<string, number> = {};
    const throttle = (key: string, ms: number) => { const now = performance.now(); if ((lastSound[key] ?? 0) + ms > now) return false; lastSound[key] = now; return true; };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      const top = 50, bottom = 74;
      const s = Math.min(w / W, (h - top - bottom) / H);
      viewRef.current = { s, ox: (w - W * s) / 2, oy: top + (h - top - bottom - H * s) / 2, w, h };
    };
    resize();
    window.addEventListener('resize', resize);
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!ui.current.paused && !run.choices && (run.phase === 'build' || run.phase === 'wave')) {
        let left = dt * (ui.current.fast ? 2 : 1);
        while (left > 0 && !run.choices && (run.phase === 'build' || run.phase === 'wave')) { const s = Math.min(1 / 30, left); step(run, s); left -= s; }
      }
      for (const ev of run.events) {
        if (ev.type === 'shoot') {
          if (ev.tower === 'archer' && throttle('sa', 110)) sound.play('whoosh', { rate: 1.8, volume: 0.14 });
          if (ev.tower === 'mage' && throttle('sm', 160)) sound.play('rune', { rate: 1.5, volume: 0.16 });
          if (ev.tower === 'fire' && throttle('sf', 200)) sound.play('ignite', { rate: 1.3, volume: 0.16 });
        }
        if (ev.type === 'zap' && throttle('zap', 150)) sound.play('sizzle', { rate: 1.6, volume: 0.22 });
        if (ev.type === 'hit' && throttle('hit', 90)) sound.play('hit', { rate: 1 + Math.random() * 0.3, volume: 0.18 });
        if (ev.type === 'kill' && throttle('kill', 70)) sound.play(ev.boss ? 'boom' : 'coin', { rate: ev.boss ? 0.7 : 1.3 + Math.random() * 0.3, volume: ev.boss ? 0.9 : 0.22 });
        if (ev.type === 'leak') { sound.play('hurt', { volume: 0.6 }); game.vibrate(40); }
        if (ev.type === 'wave') { sound.play('block', { rate: 0.55, volume: 0.7 }); if (ev.n === WAVES) sound.play('boom', { rate: 0.6, volume: 0.8 }); }
        if (ev.type === 'clear') sound.play('tick', { rate: 1.2, volume: 0.5 });
        if (ev.type === 'rock') sound.play('mine', { rate: 0.7, volume: 0.6 });
        if (ev.type === 'militia') { sound.play('welcome', { rate: 1.2, volume: 0.6 }); sound.play('shing', { volume: 0.4 }); }
        if (ev.type === 'charter') sound.play('card', { volume: 0.8 });
      }
      // Rocks landing get their own thud.
      for (const f of run.fx) if (f.kind === 'rock' && f.at !== undefined && f.t >= f.at && f.t - f.at < 0.04 && throttle('rl', 60)) { sound.play('boom', { rate: 1.1, volume: 0.5 }); game.vibrate(20); }
      run.events.length = 0;
      draw(ctx, run, viewRef.current, ui.current);
      if (now - hudAt > 150 || run.choices || run.phase === 'won' || run.phase === 'lost') { hudAt = now; setTick((t) => t + 1); }
      if (now - savedAt > 10000) { savedAt = now; keep(run); }
      if (run.phase === 'won' || run.phase === 'lost') {
        const res = finish(run);
        if (res) { setResult(res); sound.play(res.won ? 'levelup' : 'fail', { volume: 0.8 }); if (res.won) game.vibrate(120); }
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const vis = () => { if (document.hidden) { setPaused(true); keep(run); } };
    document.addEventListener('visibilitychange', vis);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis); };
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => setTick((t) => t + 1);
  const said = (a: Act, good: () => void) => { if (a.ok) { setMsg(null); good(); } else { setMsg(a.why); sound.play('whoosh', { volume: 0.4 }); } refresh(); };

  // ----- Taps on the map -----
  const onTap = (e: React.PointerEvent) => {
    const r = runRef.current;
    if (!r || paused || r.choices) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    const x = (e.clientX - rect.left - v.ox) / v.s, y = (e.clientY - rect.top - v.oy) / v.s;
    if (aim) {
      const a = aim === 'rock' ? castRock(r, x, y) : castMilitia(r, x, y);
      said(a, () => {});
      setAim(null);
      return;
    }
    const pads = padsOf(r.region);
    const hit = pads.findIndex(([a, b]) => Math.hypot(a - x, b - y) < 26);
    if (hit >= 0) { sound.play('tile', { rate: 1.1, volume: 0.6 }); setMsg(null); setPad(pad === hit ? null : hit); return; }
    if (nearestOnPath(roadOf(r.region), x, y).dist < 40) {
      moveHero(r, x, y);
      ui.current.flag = { x, y, t: r.t };
      sound.play('click', { rate: 1.2, volume: 0.5 });
      setPad(null);
      return;
    }
    sound.play('click', { rate: 0.8, volume: 0.3 });
    setPad(null);
  };

  const r = run;
  const t = r && pad !== null ? r.towers[pad] : null;
  const padLow = r && pad !== null ? padsOf(r.region)[pad][1] > H / 2 : false;
  const doBuild = (id: TowerId) => { if (r && pad !== null) said(build(r, pad, id), () => { sound.play('craft', { volume: 0.7 }); sound.play('anvil', { rate: 1.3, volume: 0.4 }); }); };
  const doUpgrade = () => { if (r && pad !== null) said(upgrade(r, pad), () => { sound.play('smith', { volume: 0.7 }); sound.play('enchant', { rate: 1.4, volume: 0.4 }); }); };
  const doSpec = (s: SpecId) => { if (r && pad !== null) said(specialise(r, pad, s), () => { sound.play('levelup', { rate: 1.2, volume: 0.6 }); game.vibrate(40); }); };
  const doSell = () => { if (r && pad !== null) said(sell(r, pad), () => { sound.play('deposit', { volume: 0.7 }); setPad(null); }); };
  const callWave = () => { if (r) { startWave(r); sound.play('click', { volume: 0.5 }); refresh(); } };
  const charter = (c: CharterId) => { if (r) { pickCharter(r, c); sound.play('match', { volume: 0.7 }); refresh(); } };
  const spell = (k: 'rock' | 'militia') => {
    if (!r) return;
    if (r.t < r.spells[k]) { sound.play('whoosh', { volume: 0.3 }); setMsg(k === 'rock' ? 'Rockfall is recharging.' : 'The militia are resting.'); return; }
    sound.play('rune', { volume: 0.6 });
    setPad(null);
    setAim(aim === k ? null : k);
  };
  const headHome = () => {
    const rr = runRef.current;
    if (!rr) return;
    if (rr.phase === 'build' || rr.phase === 'wave') rr.phase = 'lost';
    const res = finish(rr);
    if (res) setResult(res);
    setPaused(false);
  };
  const saveAndLeave = () => { const rr = runRef.current; if (rr) keep(rr); sound.play('deposit', { volume: 0.6 }); runRef.current = null; onClose(); };

  const canCall = r && ((r.phase === 'build' && r.wave === 0) || (r.phase === 'wave' && !r.queue.length && r.nextWaveAt !== null)) && r.wave < WAVES;
  const callIn = r?.nextWaveAt != null ? Math.max(0, Math.ceil(r.nextWaveAt - r.t)) : null;
  const cd = (k: 'rock' | 'militia') => (r ? Math.max(0, r.spells[k] - r.t) : 0);
  const cdMax = (k: 'rock' | 'militia') => (r ? (k === 'rock' ? rockCooldown(r) : MILITIA_COOLDOWN) : 1);

  return createPortal(
    <div className="lw-root hw-root" ref={wrapRef}>
      {!r && (
        <div className="lw-intro hw-intro">
          <div className="lw-title hw-title">🛡️ HOLD THE WALL</div>
          {saved ? (
            <>
              <p className="lw-sub">Your wall in <b>{saved.region}</b> is waiting · wave {saved.wave}/{WAVES} · ❤️ {saved.lives}</p>
              <div className="lw-btns col">
                <button className="btn btn-hero btn-lg btn-wide" onClick={resume}>▶ Back to the wall</button>
                <button className="btn btn-lg btn-wide" onClick={endSaved}>🏠 End it & collect the rewards</button>
                <button className="btn btn-lg btn-wide" onClick={onClose}>Back</button>
              </div>
            </>
          ) : (
            <>
              <p className="lw-sub">{region}'s monsters are marching on the gate. Hold for {WAVES} waves!</p>
              <div className="lw-mobs">
                {preview.kinds.map((k, i) => <span key={i} title={`${k.name}${ROLE_TEXT[(['walk', 'fast', 'armour', 'flier', 'brute'] as const)[i]] ? ' — ' + ROLE_TEXT[(['walk', 'fast', 'armour', 'flier', 'brute'] as const)[i]] : ''}`}>{k.emoji}</span>)}
                <span className="lw-boss" title={preview.boss.name}>{preview.boss.emoji}</span>
              </div>
              <ul className="lw-rules small">
                <li>🪨 Tap a stone pad to build: 🏹 archers, 🔮 mages, 🛡️ soldiers who block the road, 🔥 fire pits.</li>
                <li>⭐ Upgrade towers to level 3, then pick a <b>specialisation</b>.</li>
                <li>{HERO_EMOJI[style]} Tap the road to move <b>your Captain</b> ({STYLE_NAME[style]}). Spells: 🪨 Rockfall and 📯 Militia.</li>
                <li>🛡️ Grey-ringed monsters are armoured (mages & fire melt them). Fliers skip soldiers. Every 3 waves, pick a <b>town charter</b>.</li>
                <li>💾 Leave any time — your wall waits. Rewards: combat XP for what your towers did, coins and {region}'s loot.</li>
              </ul>
              <div className="lw-btns">
                <button className="btn btn-lg" onClick={onClose}>Back</button>
                <button className="btn btn-hero btn-lg" onClick={start}>🛡️ Man the wall</button>
              </div>
            </>
          )}
        </div>
      )}

      {r && (
        <>
          <canvas ref={canvasRef} className="lw-canvas" onPointerDown={onTap} />
          <div className="lw-hud hw-hud">
            <div className="lw-hud-row">
              <span className="pp-chip mono">❤️ {r.lives}</span>
              <span className="pp-chip gold mono">🪙 {r.gold}</span>
              <span className="pp-chip mono">🌊 {Math.max(1, r.wave)}/{WAVES}</span>
              <span className="grow" />
              <button className="lw-pause" onClick={() => { setFast(!fast); sound.play('click', { volume: 0.5 }); }} aria-label="Speed">{fast ? '⏩' : '▶'}</button>
              <button className="lw-pause" onClick={() => { setPaused(true); sound.play('click', { volume: 0.5 }); }} aria-label="Pause">⏸</button>
            </div>
            {r.banner && <div className="lw-banner">{r.banner.text}</div>}
            {aim && <div className="lw-banner">{aim === 'rock' ? '🪨 Tap where the rocks should fall' : '📯 Tap the road to call the militia'}</div>}
            {msg && !aim && pad === null && <div className="lw-banner red">{msg}</div>}
          </div>

          {pad !== null && !paused && !r.choices && !result && (
            <div className={`hw-menu ${padLow ? 'top' : ''}`}>
              {!t ? (
                <div className="hw-build">
                  {(Object.keys(TOWERS) as TowerId[]).map((id) => {
                    const c = buildCost(r, id);
                    return (
                      <button key={id} className="hw-opt" disabled={r.gold < c} onClick={() => doBuild(id)}>
                        <span className="hw-opt-emoji">{TOWERS[id].emoji}</span>
                        <b>{TOWERS[id].name}</b>
                        <span className="tiny muted">{TOWERS[id].text}</span>
                        <span className="hw-cost mono">🪙 {c}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="hw-tower">
                  <div className="hw-tower-head">
                    <span className="hw-opt-emoji">{t.spec ? SPECS[t.spec].emoji : TOWERS[t.id].emoji}</span>
                    <span className="grow"><b>{t.spec ? SPECS[t.spec].name : `${TOWERS[t.id].name} · level ${t.level}`}</b><span className="tiny muted">{t.spec ? SPECS[t.spec].text : TOWERS[t.id].text}</span></span>
                    <button className="btn btn-sm" onClick={doSell}>Sell +{sellValue(r, t)}</button>
                  </div>
                  {upgradeCost(r, t) !== null && (
                    <button className="btn btn-hero btn-wide" disabled={r.gold < upgradeCost(r, t)!} onClick={doUpgrade}>⬆ Upgrade to level {t.level + 1} · 🪙 {upgradeCost(r, t)}</button>
                  )}
                  {specCost(r, t) !== null && (
                    <div className="hw-specs">
                      {TOWERS[t.id].specs.map((s) => (
                        <button key={s} className="hw-opt" disabled={r.gold < specCost(r, t)!} onClick={() => doSpec(s)}>
                          <span className="hw-opt-emoji">{SPECS[s].emoji}</span><b>{SPECS[s].name}</b><span className="tiny muted">{SPECS[s].text}</span>
                          <span className="hw-cost mono">🪙 {specCost(r, t)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {msg && <div className="small red center">{msg}</div>}
            </div>
          )}

          <div className="hw-bar">
            {(['rock', 'militia'] as const).map((k) => (
              <button key={k} className={`hw-spell ${aim === k ? 'on' : ''}`} onClick={() => spell(k)} aria-label={k}>
                <span>{k === 'rock' ? '🪨' : '📯'}</span>
                {cd(k) > 0 && <span className="hw-cd" style={{ height: `${(cd(k) / cdMax(k)) * 100}%` }} />}
                {cd(k) > 0 && <span className="hw-cd-n mono">{Math.ceil(cd(k))}</span>}
              </button>
            ))}
            <button className="btn btn-hero btn-lg grow" disabled={!canCall} onClick={callWave}>
              {r.wave === 0 ? '🌊 Start wave 1' : r.wave >= WAVES ? `👹 The ${r.boss.name}!` : canCall ? `🌊 Wave ${r.wave + 1} now${callIn ? ` (+${callIn * 3} 🪙)` : ''}` : `🌊 Wave ${r.wave} coming…`}
              {canCall && r.wave > 0 && callIn !== null && <span className="hw-count mono">{callIn}s</span>}
            </button>
          </div>

          {r.choices && !result && (
            <div className="lw-overlay">
              <div className="lw-panel">
                <div className="lw-level">📜 A TOWN CHARTER</div>
                <p className="small muted center">The council thanks you for holding wave {r.wave}. Choose one:</p>
                {r.choices.map((c) => (
                  <button key={c} className="lw-choice" onClick={() => charter(c)}>
                    <span className="lw-choice-emoji">{CHARTERS[c].emoji}</span>
                    <span className="grow"><b>{CHARTERS[c].name}</b><span className="small muted">{CHARTERS[c].text}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {paused && !result && (
            <div className="lw-overlay">
              <div className="lw-panel">
                <div className="lw-level">⏸ PAUSED</div>
                <p className="small muted center">Wave {r.wave}/{WAVES} · ❤️ {r.lives} · {r.kills} monsters beaten{r.charters.length ? ` · ${r.charters.map((c) => CHARTERS[c].emoji).join(' ')}` : ''}</p>
                <button className="btn btn-hero btn-lg btn-wide" onClick={() => { setPaused(false); sound.play('click', { volume: 0.5 }); }}>▶ Back to the wall</button>
                <button className="btn btn-lg btn-wide" onClick={saveAndLeave}>💾 Save & leave (carry on later)</button>
                <button className="btn btn-lg btn-wide" onClick={headHome}>🏠 Give up & collect the rewards</button>
              </div>
            </div>
          )}

          {result && (
            <div className="lw-overlay">
              <div className="lw-panel">
                <div className="lw-level">{result.won ? '🏰 THE WALL HOLDS!' : '🛡️ The gate gave way'}</div>
                <p className="small center">{result.won ? `You beat the ${r.boss.name} and kept ${r.region} safe.` : `You held ${wavesHeld(r)} of ${WAVES} waves.`} {r.kills} monsters beaten.</p>
                <div className="lw-rewards">
                  {(['melee', 'ranged', 'magic'] as const).filter((k) => result.xp[k] > 0).map((k) => <div key={k}><b className="gold">+{result.xp[k].toLocaleString()}</b> {STYLE_NAME[k]} XP</div>)}
                  {result.xp.defense > 0 && <div><b className="gold">+{result.xp.defense.toLocaleString()}</b> Defense XP</div>}
                  {result.coins > 0 && <div>🪙 <b className="gold">{result.coins.toLocaleString()}</b> coins</div>}
                  {result.items.length > 0 && <div className="small">{result.items.map((s) => `${s.qty > 1 ? `${s.qty.toLocaleString()}× ` : ''}${getItem(s.id).name}`).join(', ')}</div>}
                  {result.leftover > 0 && <div className="small red">Your bag was full — {result.leftover} item{result.leftover > 1 ? 's' : ''} left behind.</div>}
                  {result.pet && <div className="lw-pet">🦅 <b>Lookout</b> the watch-hawk follows you home!</div>}
                </div>
                <div className="lw-btns">
                  <button className="btn btn-lg" onClick={onClose}>Done</button>
                  <button className="btn btn-hero btn-lg" onClick={start}>🛡️ Again</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}

