// 🏮 Lantern Watch — the survivor mode's screen. The rules live in core/lanternWatch.ts; this file only
// draws the night on a canvas, reads your thumb (a floating joystick) and plays the sounds.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import { weaponStyle } from '../core/combat';
import { skillLevel } from '../core/idle';
import {
  choose, NIGHT_SECONDS, newRun, nightMonsters, nightXp, PASSIVES, step, stats, WEAPONS, type Choice, type Run, type Style,
} from '../core/lanternWatch';
import { game, useGame } from '../core/store';
import { getItem } from '../data/items';
import { PET_MAP } from '../data/pets';
import { useNoScroll } from './useNoScroll';

type Result = ReturnType<typeof game.lanternWatchEnd>;
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const STYLE_NAME: Record<Style, string> = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic' };

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

function draw(ctx: CanvasRenderingContext2D, r: Run, w: number, h: number, joy: { ox: number; oy: number; x: number; y: number } | null) {
  const cx = w / 2 - r.px, cy = h / 2 - r.py;
  const [g1, g2] = GROUND[r.region] ?? GROUND.Pocketvale;
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);
  // A checker of soft ground patches, plus a few tufts, so you can feel yourself moving.
  const T = 96;
  const x0 = Math.floor((r.px - w / 2) / T) - 1, y0 = Math.floor((r.py - h / 2) / T) - 1;
  for (let i = x0; i < x0 + w / T + 3; i++) for (let j = y0; j < y0 + h / T + 3; j++) {
    const hsh = ((i * 73856093) ^ (j * 19349663)) >>> 0;
    if ((i + j) % 2 === 0) { ctx.fillStyle = g2; ctx.fillRect(i * T + cx, j * T + cy, T, T); }
    if (hsh % 5 === 0) ctx.drawImage(sprite(hsh % 3 === 0 ? '🌾' : hsh % 3 === 1 ? '🌿' : '🪨', 14), i * T + cx + (hsh % 60), j * T + cy + ((hsh >> 8) % 60));
  }
  // Pickups
  for (const p of r.pickups) {
    const x = p.x + cx, y = p.y + cy;
    if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
    if (p.kind === 'light') {
      ctx.fillStyle = p.v >= 10 ? '#fde047' : p.v >= 3 ? '#fcd34d' : '#fef3c7';
      ctx.beginPath(); ctx.arc(x, y, p.v >= 10 ? 6 : p.v >= 3 ? 4.5 : 3.2, 0, Math.PI * 2); ctx.fill();
    } else {
      const s = sprite(p.kind === 'meal' ? '🍗' : p.kind === 'magnet' ? '🧲' : '🎁', 22);
      ctx.drawImage(s, x - s.width / 2, y - s.height / 2 + Math.sin(r.t * 4) * 2);
    }
  }
  // Lantern glow weapon (a warm circle on the ground)
  const st = stats(r);
  const glow = r.weapons.find((x) => x.id === 'glow');
  if (glow) {
    const rad = (58 + 12 * glow.level) * st.area;
    const grd = ctx.createRadialGradient(w / 2, h / 2, rad * 0.2, w / 2, h / 2, rad);
    grd.addColorStop(0, 'rgba(251,191,36,0.22)'); grd.addColorStop(1, 'rgba(251,146,60,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(w / 2, h / 2, rad, 0, Math.PI * 2); ctx.fill();
  }
  // Monsters
  for (const e of r.enemies) {
    const x = e.x + cx, y = e.y + cy;
    if (x < -60 || y < -60 || x > w + 60 || y > h + 60) continue;
    const emoji = e.boss ? r.boss.emoji : r.kinds[e.k]?.emoji ?? '👾';
    const s = sprite(emoji, Math.round(e.r * 1.9));
    if (e.flash > 0) ctx.globalAlpha = 0.55;
    if (e.slowUntil > r.t) { ctx.fillStyle = 'rgba(147,197,253,0.35)'; ctx.beginPath(); ctx.arc(x, y, e.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.drawImage(s, x - s.width / 2, y - s.height / 2);
    ctx.globalAlpha = 1;
    if (e.elite || e.boss) {
      const bw = e.r * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2, y - e.r - 10, bw, 4);
      ctx.fillStyle = e.boss ? '#f43f5e' : '#f59e0b'; ctx.fillRect(x - bw / 2, y - e.r - 10, bw * Math.max(0, e.hp / e.max), 4);
    }
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
    } else {
      const s = sprite('🪓', 22);
      ctx.save(); ctx.translate(x, y); ctx.rotate(r.t * 12); ctx.drawImage(s, -s.width / 2, -s.height / 2); ctx.restore();
    }
  }
  // Ember ring
  const ring = r.weapons.find((x) => x.id === 'ring');
  if (ring) {
    const n = 1 + ring.level, rad = (62 + 4 * ring.level) * st.area;
    const s = sprite('🔥', 18);
    for (let j = 0; j < n; j++) {
      const a = r.t * 3 + (j / n) * Math.PI * 2;
      ctx.drawImage(s, w / 2 + Math.cos(a) * rad - s.width / 2, h / 2 + Math.sin(a) * rad - s.height / 2);
    }
  }
  // Effects
  for (const f of r.fx) {
    const k = f.t / f.life, x = f.x + cx, y = f.y + cy;
    ctx.globalAlpha = Math.max(0, 1 - k);
    if (f.kind === 'slash') {
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 5 * (1 - k) + 1;
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
    } else {
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(x, y, f.r * k, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Companion and you (with your lantern)
  if (r.weapons.some((x) => x.id === 'pet')) {
    const s = sprite(r.pet.emoji, 22);
    ctx.drawImage(s, r.pet.x + cx - s.width / 2, r.pet.y + cy - s.height / 2);
  }
  const me = sprite(r.weapons[0]?.id === 'arrows' ? '🧝' : r.weapons[0]?.id === 'bolt' ? '🧙' : '🤺', 28);
  const bob = r.moving ? Math.sin(r.t * 14) * 1.5 : 0;
  if (r.touchFlash > 0) ctx.globalAlpha = 0.5;
  ctx.drawImage(me, w / 2 - me.width / 2, h / 2 - me.height / 2 + bob);
  ctx.globalAlpha = 1;
  const lantern = sprite('🏮', 16);
  ctx.drawImage(lantern, w / 2 + 8, h / 2 - 2 + bob);
  // The night: dark everywhere except the lantern's circle (a flicker keeps it alive).
  const lr = Math.min(w, h) * 0.46 + Math.sin(r.t * 7) * 3 + Math.sin(r.t * 2.3) * 4;
  const dark = ctx.createRadialGradient(w / 2, h / 2, lr * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  dark.addColorStop(0, 'rgba(6,8,22,0.05)');
  dark.addColorStop(0.4, 'rgba(6,8,22,0.55)');
  dark.addColorStop(1, 'rgba(6,8,22,0.93)');
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, w, h);
  // Getting hurt: a soft red edge.
  if (r.touchFlash > 0) { ctx.fillStyle = `rgba(239,68,68,${r.touchFlash * 0.5})`; ctx.fillRect(0, 0, w, h); }
  // Dawn creeping in near the end.
  if (r.t > NIGHT_SECONDS - 60) { ctx.fillStyle = `rgba(253,186,116,${Math.min(0.18, (r.t - (NIGHT_SECONDS - 60)) / 330)})`; ctx.fillRect(0, 0, w, h); }
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
    return { emoji: d.emoji, name: d.name, tag: c.level === 1 ? 'NEW WEAPON' : `LEVEL ${c.level}`, text: c.level === 1 ? d.text : d.up };
  }
  if (c.kind === 'passive') {
    const d = PASSIVES[c.id];
    return { emoji: d.emoji, name: d.name, tag: c.level === 1 ? 'NEW' : `LEVEL ${c.level}`, text: d.text };
  }
  if (c.kind === 'meal') return { emoji: '🍗', name: 'Hot meal', tag: 'HEAL', text: 'Heal 30% of your health' };
  return { emoji: '💰', name: 'Pouch of coins', tag: 'COINS', text: `+${25 + r.level * 5} coins at dawn` };
}

export function LanternWatch({ onClose }: { onClose: () => void }) {
  const { player } = useGame();
  const style = weaponStyle(player) as Style;
  const styleLevel = skillLevel(player, style);
  const region = player.location;
  const night = nightMonsters(region);
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
    return game.lanternWatchEnd({ seconds: r.t, kills: r.kills, won: r.phase === 'won', coins: r.coins });
  };
  // Leaving mid-night still pays for the time you held out.
  useEffect(() => () => { const r = runRef.current; if (r && !paid.current) finish(r); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    const r = newRun({ region, style, styleLevel, healthLevel: skillLevel(player, 'health'), petEmoji: player.activePet ? PET_MAP[player.activePet]?.emoji : undefined });
    runRef.current = r;
    // Test hook for local development only (never in the live game).
    if (import.meta.env.DEV) {
      const w = window as unknown as { __lw?: Run; __lwStep?: (s: number) => void };
      w.__lw = r;
      w.__lwStep = (secs: number) => { for (let i = 0; i < secs * 30 && r.phase === 'play'; i++) { if (r.choices) choose(r, r.choices[0]); step(r, 1 / 30, { dx: Math.cos(i / 90), dy: Math.sin(i / 90) }); } };
    }
    paid.current = false;
    setResult(null);
    setPaused(false);
    setRun(r);
    sound.play('enchant', { volume: 0.7 });
    sound.play('ignite', { volume: 0.6 });
  };

  // ----- The game loop -----
  useEffect(() => {
    if (!run) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let hudAt = 0;
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
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!pausedRef.current && run.phase === 'play' && !run.choices) {
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
        while (left > 0 && run.phase === 'play' && !run.choices) { const s = Math.min(1 / 60, left); step(run, s, { dx, dy }); left -= s; }
      }
      // Sounds for what just happened (kept gentle — never a wall of noise).
      for (const ev of run.events) {
        if (ev.type === 'hit' && throttle(ev.boss ? 'bhit' : 'hit', ev.boss ? 120 : 70)) sound.play('hit', { rate: ev.boss ? 0.7 : 0.95 + Math.random() * 0.2, volume: 0.35 });
        if (ev.type === 'kill' && throttle('kill', 60)) sound.play(ev.elite ? 'boom' : 'chop', { rate: ev.elite ? 1 : 1.3 + Math.random() * 0.3, volume: ev.elite ? 0.7 : 0.25 });
        if (ev.type === 'light') { if (throttle('light', 45)) { lightCombo = Math.min(14, lightCombo + 1); sound.play('tick', { rate: 1 + lightCombo * 0.05, volume: 0.35 }); } }
        if (ev.type === 'hurt' && throttle('hurt', 250)) { sound.play('hurt', { volume: 0.55 }); game.vibrate(30); }
        if (ev.type === 'level') sound.play('levelup', { volume: 0.7 });
        if (ev.type === 'chest') { sound.play('coin', { volume: 0.8 }); sound.play('enchant', { rate: 1.2, volume: 0.6 }); }
        if (ev.type === 'meal') sound.play('eat', { volume: 0.7 });
        if (ev.type === 'boss') { sound.play('boom', { rate: 0.6, volume: 0.9 }); sound.play('block', { rate: 0.6, volume: 0.8 }); }
        if (ev.type === 'fire' && throttle(`f${ev.w}`, 120)) {
          const fx: Record<string, [Parameters<typeof sound.play>[0], number]> = { sword: ['shing', 1.4], arrows: ['whoosh', 1.6], bolt: ['rune', 1.3], storm: ['anvil', 1.6], nova: ['douse', 1.2], hatchet: ['whoosh', 0.9] };
          const f = fx[ev.w];
          if (f) sound.play(f[0], { rate: f[1], volume: 0.22 });
        }
      }
      if (!run.events.some((e) => e.type === 'light')) lightCombo = Math.max(0, lightCombo - 0.05);
      run.events.length = 0;
      draw(ctx, run, canvas.clientWidth, canvas.clientHeight, joy.current);
      // The bars above the canvas update a few times a second.
      if (now - hudAt > 120 || run.choices || run.phase !== 'play') { hudAt = now; setTick((t) => t + 1); }
      if (run.phase !== 'play') {
        const res = finish(run);
        if (res) {
          setResult(res);
          if (run.phase === 'won') sound.play('levelup', { volume: 0.9 });
          else sound.play('fail', { volume: 0.7 });
        }
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // Switching apps pauses the night.
    const vis = () => { if (document.hidden) setPaused(true); };
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
  }, [run]);

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

  const pick = (c: Choice) => {
    const r = runRef.current;
    if (!r) return;
    choose(r, c);
    sound.play('match', { volume: 0.7 });
    sound.play('enchant', { rate: 1.1, volume: 0.5 });
    setTick((t) => t + 1);
  };

  const headHome = () => {
    const r = runRef.current;
    if (!r) return;
    r.phase = 'lost';
    const res = finish(r);
    if (res) setResult(res);
    setPaused(false);
  };

  const r = run;
  const intro = !r;
  const xpPreview = nightXp(styleLevel, NIGHT_SECONDS, 1500, true);
  return createPortal(
    <div className="lw-root" ref={wrapRef}>
      {intro && (
        <div className="lw-intro">
          <div className="lw-title">🏮 LANTERN WATCH</div>
          <p className="lw-sub">Night falls on <b>{region}</b>. Hold the lantern until dawn.</p>
          <div className="lw-mobs">
            {night.kinds.map((k) => <span key={k.name} title={k.name}>{k.emoji}</span>)}
            <span className="lw-boss" title={night.boss.name}>{night.boss.emoji}</span>
          </div>
          <ul className="lw-rules small">
            <li>👆 Touch anywhere and drag to walk. Your attacks fire by themselves.</li>
            <li>✨ Gather the light monsters drop. <b>Every level-up, pick 1 of 3 power-ups</b> — new weapons or upgrades.</li>
            <li>🌅 At 10:00 the great <b>{night.boss.name}</b> comes. Beat it to see the dawn.</li>
            <li>💤 Knocked out? The night just ends — you keep everything you earned.</li>
          </ul>
          <p className="small muted">You start with <b>{WEAPONS[style === 'melee' ? 'sword' : style === 'ranged' ? 'arrows' : 'bolt'].name}</b> ({STYLE_NAME[style]}). A full night at your level is worth about <b>{xpPreview.style.toLocaleString()} {STYLE_NAME[style]} XP</b>, plus Health & Defense XP, coins and loot from {region}'s monsters.</p>
          <div className="lw-btns">
            <button className="btn btn-lg" onClick={onClose}>Back</button>
            <button className="btn btn-hero btn-lg" onClick={start}>🏮 Light the lantern</button>
          </div>
        </div>
      )}

      {r && (
        <>
          <canvas ref={canvasRef} className="lw-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
          <div className="lw-hud">
            <div className="lw-hud-row">
              <span className="lw-time mono">{r.bossSpawned ? '🌅 DAWN' : `🌙 ${fmtTime(Math.max(0, NIGHT_SECONDS - r.t))}`}</span>
              <span className="lw-kills mono">💀 {r.kills.toLocaleString()}</span>
              <button className="lw-pause" onClick={() => setPaused(true)} aria-label="Pause">⏸</button>
            </div>
            <div className="lw-bar hp"><div style={{ width: `${(r.hp / r.maxHp) * 100}%` }} /><span className="mono">❤️ {Math.ceil(r.hp)}/{r.maxHp}</span></div>
            <div className="lw-bar xp"><div style={{ width: `${(r.xp / r.need) * 100}%` }} /><span className="mono">Lv {r.level}</span></div>
            <div className="lw-kit">
              {r.weapons.map((w) => <span key={w.id} title={`${WEAPONS[w.id].name} ${w.level}`}>{WEAPONS[w.id].emoji}<sub>{w.level}</sub></span>)}
              {r.passives.map((p) => <span key={p.id} className="pas" title={`${PASSIVES[p.id].name} ${p.level}`}>{PASSIVES[p.id].emoji}<sub>{p.level}</sub></span>)}
            </div>
          </div>

          {r.choices && r.phase === 'play' && (
            <div className="lw-overlay">
              <div className="lw-panel">
                <div className="lw-level">⬆️ LEVEL {r.level}{r.pending > 1 ? ` · ${r.pending} picks` : ''}</div>
                <p className="small muted center">Choose a power-up</p>
                {r.choices.map((c, i) => {
                  const info = choiceInfo(r, c);
                  return (
                    <button key={i} className="lw-choice" onClick={() => pick(c)}>
                      <span className="lw-choice-emoji">{info.emoji}</span>
                      <span className="grow"><b>{info.name}</b> <span className="lw-tag">{info.tag}</span><span className="small muted">{info.text}</span></span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {paused && r.phase === 'play' && !result && (
            <div className="lw-overlay">
              <div className="lw-panel">
                <div className="lw-level">⏸ PAUSED</div>
                <p className="small muted center">{fmtTime(r.t)} held · {r.kills.toLocaleString()} monsters · level {r.level}</p>
                <button className="btn btn-hero btn-lg btn-wide" onClick={() => setPaused(false)}>▶ Keep watch</button>
                <button className="btn btn-lg btn-wide" onClick={headHome}>🏠 Head home (keep your rewards)</button>
              </div>
            </div>
          )}

          {result && (
            <div className="lw-overlay">
              <div className="lw-panel">
                <div className="lw-level">{result.won ? '🌅 DAWN BREAKS!' : '🌙 The night is over'}</div>
                <p className="small center">{result.won ? `You beat the ${night.boss.name} and held the lantern until morning.` : `You held out for ${fmtTime(r.t)}.`} {r.kills.toLocaleString()} monsters · level {r.level}.</p>
                <div className="lw-rewards">
                  <div><b className="gold">+{result.xp.style.toLocaleString()}</b> {STYLE_NAME[style]} XP</div>
                  <div><b className="gold">+{result.xp.health.toLocaleString()}</b> Health · <b className="gold">+{result.xp.defense.toLocaleString()}</b> Defense XP</div>
                  {result.coins > 0 && <div>🪙 <b className="gold">{result.coins.toLocaleString()}</b> coins</div>}
                  {result.items.length > 0 && <div className="small">{result.items.map((s) => `${s.qty > 1 ? `${s.qty.toLocaleString()}× ` : ''}${getItem(s.id).name}`).join(', ')}</div>}
                  {result.leftover > 0 && <div className="small red">Your bag was full — {result.leftover} item{result.leftover > 1 ? 's' : ''} left behind.</div>}
                  {result.pet && <div className="lw-pet">🦋 <b>Lumen</b> the lantern moth followed your light home!</div>}
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
