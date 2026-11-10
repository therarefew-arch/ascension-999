// ⛏️ Deep Delve (v0.0.2.38): Mining's dig-down game. Rules in core/delve.ts; the pixel art in ui/delveArt.ts.
// A dive in progress is kept on this device per save slot (`ui.delve.<slot>`). Also holds MiningGames: the tabs
// ⛏️ STRIKE THE VEIN / 🕳️ DEEP DELVE. v0.0.2.42: the shaft is a pixel-art canvas with a flickering lantern.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActionDef } from '../data/skills';
import {
  blockAt, COLS, haul, haulValue, hitsFor, MAX_UPGRADE, newDive, NEW_KIT, oilMax, ORES, ropeCost, ropeUp, sackMax, tap, upgradeCost,
  type Cell, type DelveKit, type Dive, type Ore,
} from '../core/delve';
import { lockedReason } from '../core/idle';
import { game, useGame } from '../core/store';
import { sound } from '../audio/sound';
import { StrikeVein } from './Minigames';
import { bandOf, drawShaft, oreIcon, PAL, shade, T, type MinerPose, type Part } from './delveArt';

type MnMode = 'vein' | 'delve';
let lastMode: MnMode = 'vein';

export function MiningGames({ action }: { action: ActionDef }) {
  const [mode, setModeState] = useState<MnMode>(lastMode);
  const setMode = (m: MnMode) => { lastMode = m; setModeState(m); sound.play('click', { volume: 0.4 }); };
  return (
    <>
      <div className="tab-row small-tabs">
        <button className={`tab-pill ${mode === 'vein' ? 'on' : ''}`} onClick={() => setMode('vein')}>⛏️ STRIKE THE VEIN</button>
        <button className={`tab-pill ${mode === 'delve' ? 'on' : ''}`} onClick={() => setMode('delve')}>🕳️ DEEP DELVE</button>
      </div>
      {mode === 'vein' ? <StrikeVein action={action} /> : <DeepDelve action={action} />}
    </>
  );
}

const keyFor = (slot: number | null) => `ui.delve.${slot ?? 0}`;
function readDive(slot: number | null): Dive | null {
  try { const d = JSON.parse(localStorage.getItem(keyFor(slot)) ?? 'null') as Dive | null; return d && Array.isArray(d.rows) && !d.over ? d : null; } catch { return null; }
}
function writeDive(slot: number | null, d: Dive | null) {
  try { if (d && !d.over) localStorage.setItem(keyFor(slot), JSON.stringify(d)); else localStorage.removeItem(keyFor(slot)); } catch { /* no storage */ }
}

/** Something that just happened, for the canvas to show (chunks flying, a glint, a "+8"). */
type Fx = { k: 'hit' | 'break' | 'ore' | 'full'; x: number; y: number; cell?: Cell; ore?: Ore };
const S = 4; // canvas pixels per art pixel

/** Blocks next to you that a tap would do something with. */
function targetsOf(d: Dive): [number, number][] {
  const out: [number, number][] = [];
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
    const x = d.x + dx, y = d.y + dy, b = blockAt(d, x, y);
    if (b && (b.cell === 'open' || dy >= 0)) out.push([x, y]);
  }
  return out;
}

function DelveCanvas({ dive, light, up, down, onTap, fx, still }: {
  dive: Dive; light: number; up: number; down: number; onTap?: (x: number, y: number) => void; fx?: React.MutableRefObject<Fx[]>; still?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rows = up + down + 1;
  const W = COLS * T, H = rows * T;
  const live = useRef({ dive, light, onTap });
  live.current = { dive, light, onTap };
  const st = useRef({ cam: dive.y - up, mx: dive.x, my: dive.y, face: 1 as 1 | -1, swingAt: -9999, down: false, shakeUntil: 0, parts: [] as Part[], pops: [] as { x: number; y: number; text: string; c: string; t0: number }[] });

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const g = cv.getContext('2d')!;
    const art = document.createElement('canvas'); art.width = W; art.height = (rows + 1) * T;
    const ag = art.getContext('2d')!;
    const dark = document.createElement('canvas'); dark.width = cv.width; dark.height = cv.height;
    const dg = dark.getContext('2d')!;
    let raf = 0, last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const s = st.current, { dive: d, light } = live.current;
      // what just happened
      for (const e of fx?.current.splice(0) ?? []) {
        const cx = e.x * T + T / 2, cy = e.y * T + T / 2;
        if (e.k === 'hit' || e.k === 'break') {
          s.swingAt = now; s.down = e.y > s.my + 0.5;
          if (e.x !== Math.round(s.mx)) s.face = e.x > s.mx ? 1 : -1;
        }
        const base = PAL[e.cell ?? 'dirt'][bandOf(e.y)];
        if (e.k === 'hit') {
          s.shakeUntil = now + 90;
          for (let i = 0; i < 6; i++) s.parts.push({ x: cx + (Math.random() - 0.5) * 8, y: cy + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 60, life: 0.4, max: 0.4, c: i % 2 ? shade(base, 0.35) : '#fde68a', s: 1, g: 220 });
        }
        if (e.k === 'break') {
          s.shakeUntil = now + 140;
          for (let i = 0; i < 14; i++) s.parts.push({ x: cx + (Math.random() - 0.5) * 12, y: cy + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 110, vy: -40 - Math.random() * 90, life: 0.7, max: 0.7, c: shade(base, (Math.random() - 0.5) * 0.5), s: Math.random() < 0.4 ? 2 : 1, g: 320 });
          for (let i = 0; i < 6; i++) s.parts.push({ x: cx + (Math.random() - 0.5) * 14, y: cy + 4, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 15, life: 0.8, max: 0.8, c: 'rgba(214,200,180,0.5)', s: 2, g: -10 });
        }
        if (e.k === 'ore' && e.ore) {
          const c = ORES[e.ore].color;
          for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; s.parts.push({ x: cx, y: cy, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 20, life: 0.6, max: 0.6, c: i % 3 ? c : '#ffffff', s: 1, g: 60 }); }
          s.pops.push({ x: cx, y: cy - 4, text: `+${ORES[e.ore].value} ${ORES[e.ore].name}`, c: c, t0: now });
        }
        if (e.k === 'full') s.pops.push({ x: cx, y: cy - 4, text: 'Sack full!', c: '#fca5a5', t0: now });
      }
      // glide the camera and the miner
      const k = Math.min(1, dt * 12);
      s.cam += (d.y - up - s.cam) * Math.min(1, dt * 8);
      s.mx += (d.x - s.mx) * k; s.my += (d.y - s.my) * k;
      if (Math.abs(d.x - s.mx) < 0.01) s.mx = d.x;
      if (Math.abs(d.y - s.my) < 0.01) s.my = d.y;
      if (Math.abs(d.y - up - s.cam) < 0.002) s.cam = d.y - up;
      if (still) { s.face = 1; }
      s.parts = s.parts.filter((p) => { p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.life > 0; });
      s.pops = s.pops.filter((p) => now - p.t0 < 1100);

      const topRow = Math.floor(s.cam), frac = s.cam - topRow;
      const swing = (now - s.swingAt) / 230;
      const pose: MinerPose = { x: s.mx, y: s.my, face: s.face, swing: swing >= 0 && swing <= 1 ? swing : 0, down: s.down };
      drawShaft(ag, d, topRow, rows + 1, now, pose, still || d.over ? [] : targetsOf(d), s.parts);

      g.imageSmoothingEnabled = false;
      g.fillStyle = '#0c0a09'; g.fillRect(0, 0, cv.width, cv.height);
      const shake = now < s.shakeUntil ? Math.round((Math.random() - 0.5) * 2) * S : 0;
      g.drawImage(art, shake, Math.round(-frac * T * S), W * S, (rows + 1) * T * S);

      // the lantern: darkness grows below the surface, a warm circle of light around the miner
      const sy = (py: number) => (py / T - s.cam) * T * S;
      const lx = (s.mx * T + T / 2 + s.face * 3) * S, ly = sy(s.my * T + 5);
      const flick = 1 + Math.sin(now / 90) * 0.015 + Math.sin(now / 37) * 0.012 + (light < 2 ? (Math.random() - 0.5) * 0.06 : 0);
      const r0 = light * flick * T * S, r1 = (light + 2.2) * flick * T * S;
      dg.globalCompositeOperation = 'source-over';
      dg.clearRect(0, 0, dark.width, dark.height);
      const vg = dg.createLinearGradient(0, sy(T), 0, sy(T * 4));
      vg.addColorStop(0, 'rgba(8,5,3,0)'); vg.addColorStop(1, 'rgba(8,5,3,0.94)');
      dg.fillStyle = vg; dg.fillRect(0, 0, dark.width, dark.height);
      dg.globalCompositeOperation = 'destination-out';
      const hole = dg.createRadialGradient(lx, ly, 0, lx, ly, r1);
      hole.addColorStop(0, 'rgba(0,0,0,1)'); hole.addColorStop(r0 / r1, 'rgba(0,0,0,0.92)'); hole.addColorStop(1, 'rgba(0,0,0,0)');
      dg.fillStyle = hole; dg.fillRect(0, 0, dark.width, dark.height);
      g.drawImage(dark, 0, 0);
      g.globalCompositeOperation = 'lighter';
      const warm = g.createRadialGradient(lx, ly, 0, lx, ly, r0 * 1.1);
      warm.addColorStop(0, 'rgba(255,170,70,0.2)'); warm.addColorStop(1, 'rgba(255,140,40,0)');
      g.fillStyle = warm; g.fillRect(0, 0, cv.width, cv.height);
      g.globalCompositeOperation = 'source-over';

      // floating "+8 Silver"
      g.textAlign = 'center'; g.font = `bold ${6 * S}px ui-monospace, Menlo, monospace`; g.lineWidth = 5; g.strokeStyle = '#1c1008';
      for (const p of s.pops) {
        const a = (now - p.t0) / 1100;
        const x = Math.max(70, Math.min(cv.width - 70, p.x * S)), y = sy(p.y) - a * 14 * S;
        g.globalAlpha = a < 0.75 ? 1 : (1 - a) / 0.25;
        g.strokeText(p.text, x, y); g.fillStyle = p.c; g.fillText(p.text, x, y);
      }
      g.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [W, H, rows, up, fx, still]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (still) return;
    const key = (e: KeyboardEvent) => {
      const d = live.current.dive;
      const m: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
      const v = m[e.key]; if (!v) return;
      e.preventDefault(); live.current.onTap?.(d.x + v[0], d.y + v[1]);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [still]);

  const down_ = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (still || !live.current.onTap) return;
    const r = e.currentTarget.getBoundingClientRect();
    const lx = ((e.clientX - r.left) / r.width) * W, ly = ((e.clientY - r.top) / r.height) * H;
    live.current.onTap(Math.floor(lx / T), Math.floor(st.current.cam + ly / T));
  };
  return <canvas ref={ref} className={`dd-canvas ${still ? 'still' : ''}`} width={W * S} height={H * S} onPointerDown={down_} aria-label="Mine shaft" />;
}

function OreImg({ ore, size = 18 }: { ore: Ore; size?: number }) {
  return <img className="dd-oreimg" src={oreIcon(ore)} width={size} height={size} alt={ORES[ore].name} title={ORES[ore].name} />;
}

function DeepDelve({ action }: { action: ActionDef }) {
  const { player, slot } = useGame();
  const kit: DelveKit = player.delve ?? NEW_KIT;
  const [dive, setDive] = useState<Dive | null>(() => readDive(slot));
  const [, force] = useState(0);
  const [end, setEnd] = useState<{ xp: number; value: number; ores: Ore[]; how: string; depth: number } | null>(null);
  const fx = useRef<Fx[]>([]);
  const camp = useMemo(() => newDive(NEW_KIT, 4242), []);
  const blocked = lockedReason(player, action);

  const commit = (d: Dive | null) => { writeDive(slot, d); setDive(d ? { ...d } : null); force((n) => n + 1); };

  const finish = (d: Dive) => {
    const xp = game.delveEnd(action.id, d);
    const home = haul(d);
    setEnd({ xp, value: haulValue(home), ores: home, how: d.how ?? 'rope', depth: d.y });
    writeDive(slot, null);
    setDive(null);
  };

  const onTap = (x: number, y: number) => {
    if (!dive || dive.over) return;
    const b = blockAt(dive, x, y);
    const cell = b?.cell;
    const res = tap(dive, kit, x, y);
    if (res === 'no') return;
    for (const e of dive.events) {
      if (e === 'hit') { sound.play('pickaxe', { volume: 0.5, rate: 0.85 + Math.random() * 0.2 }); game.vibrate(6); fx.current.push({ k: 'hit', x, y, cell }); }
      if (e === 'break') { sound.play('mine', { volume: 0.45, rate: 1 + Math.random() * 0.2 }); fx.current.push({ k: 'break', x, y, cell }); }
      if (e.startsWith('ore:')) {
        const o = e.slice(4) as Ore;
        sound.play('mine', { volume: 0.4 }); sound.play(o === 'chest' || o === 'fossil' ? 'enchant' : 'ding', { rate: 1 + ORES[o].value / 30, volume: 0.4 }); game.vibrate(12);
        fx.current.push({ k: 'break', x, y, cell }, { k: 'ore', x, y, ore: o });
      }
      if (e === 'full') { sound.play('thud', { volume: 0.35 }); fx.current.push({ k: 'break', x, y, cell }, { k: 'full', x, y }); }
      if (e === 'dark') { sound.play('fail', { volume: 0.5 }); }
    }
    if (res === 'move' && dive.events.length === 0) sound.play('tick', { volume: 0.18 });
    dive.events = [];
    commit(dive);
    if (dive.over) finish(dive);
  };

  const rope = () => {
    if (!dive || !ropeUp(dive)) { sound.play('error', { volume: 0.3 }); return; }
    sound.play('whoosh', { volume: 0.5 });
    window.setTimeout(() => sound.play('levelup', { volume: 0.5 }), 250);
    finish(dive);
  };

  // ----- Camp (between dives) -----
  if (!dive) {
    const ups: { kind: 'pick' | 'lantern' | 'sack'; emoji: string; name: string; now: string }[] = [
      { kind: 'pick', emoji: '⛏️', name: 'Pick', now: `stone ${hitsFor('stone', kit)} hits · deep rock ${hitsFor('rock', kit)}` },
      { kind: 'lantern', emoji: '🏮', name: 'Lantern', now: `${oilMax(kit)} oil` },
      { kind: 'sack', emoji: '👝', name: 'Ore sack', now: `holds ${sackMax(kit)} chunks` },
    ];
    return (
      <div className="dd-root">
        <div className="dd-frame"><DelveCanvas dive={camp} light={5} up={3} down={1} still /></div>
        {end && (
          <div className={`dd-end ${end.how}`}>
            <b>{end.how === 'rope' ? '🪢 Back up with everything!' : '🐤 Your lantern went out — the canary led you home with half the haul.'}</b>
            <div className="dd-end-ores">{end.ores.length ? end.ores.map((o, i) => <OreImg key={i} ore={o} size={22} />) : <span className="small muted">No ore this time.</span>}</div>
            <div className="small">Depth <b className="mono">{end.depth}m</b> · worth <b className="mono gold">{end.value}</b> delve coins{end.xp ? <> · <b className="mono gold">+{end.xp.toLocaleString()}</b> Mining XP</> : null}</div>
          </div>
        )}
        <div className="dd-camp">
          <div className="dd-camp-head">
            <b>🏕️ Mine camp</b>
            <span className="dd-chip gold"><span>COINS</span><b>🪙 {kit.coins.toLocaleString()}</b></span>
            <span className="dd-chip"><span>DEEPEST</span><b>{kit.best}m</b></span>
          </div>
          <div className="dd-ups">
            {ups.map((u) => {
              const lv = kit[u.kind];
              const cost = upgradeCost(u.kind, lv);
              return (
                <div key={u.kind} className="dd-up">
                  <span className="dd-up-emoji">{u.emoji}</span>
                  <div className="grow">
                    <b className="small">{u.name}</b>
                    <div className="dd-pips">{Array.from({ length: MAX_UPGRADE }, (_, i) => <i key={i} className={i < lv ? 'on' : ''} />)}</div>
                    <div className="tiny muted">{u.now}</div>
                  </div>
                  {lv >= MAX_UPGRADE ? <span className="tiny gold">MAX</span>
                    : <button className="btn btn-sm" disabled={kit.coins < cost} onClick={() => game.delveUpgrade(u.kind)}>🪙 {cost.toLocaleString()}</button>}
                </div>
              );
            })}
          </div>
          <p className="tiny muted">Tap a block next to you to dig (left, right or down). Every step burns lantern oil. 🪢 Rope up any time to keep the whole haul — climbing costs oil, more the deeper you are. If the lantern goes out, the canary leads you home with half.</p>
          {blocked && <p className="tiny red">{blocked} — you can still dig, but it won't give XP.</p>}
          <button className="btn btn-hero" onClick={() => { sound.play('mine', { volume: 0.5 }); setEnd(null); commit(newDive(kit)); }}>🕳️ DESCEND</button>
        </div>
      </div>
    );
  }

  // ----- The shaft -----
  const d = dive;
  const oilPct = Math.max(0, d.oil / oilMax(kit));
  const light = 1.4 + oilPct * 2.6; // how many blocks the lantern lights
  const canRope = d.oil >= ropeCost(d.y);
  return (
    <div className="dd-root">
      <div className="dd-hud">
        <span className="dd-chip"><span>DEPTH</span><b>{d.y}m</b></span>
        <span className="dd-chip"><span>SACK</span><b>{d.sack.length}/{sackMax(kit)}</b></span>
        <span className="dd-chip gold"><span>HAUL</span><b>🪙 {haulValue(d.sack)}</b></span>
      </div>
      <div className={`dd-oil ${oilPct < 0.25 ? 'low' : ''}`}>
        <span className="dd-oil-icon">🏮</span>
        <div className="dd-oil-bar"><div style={{ width: `${oilPct * 100}%` }} /></div>
        <span className="tiny mono">{d.oil}/{oilMax(kit)}</span>
      </div>
      <div className="dd-frame"><DelveCanvas dive={d} light={light} up={2} down={7} onTap={onTap} fx={fx} /></div>
      <div className="dd-sack">{d.sack.length ? d.sack.map((o, i) => <OreImg key={i} ore={o} />) : <span className="tiny muted">Your sack is empty — ore glints in the rock.</span>}</div>
      <button className="btn btn-wide dd-rope" disabled={!canRope} onClick={rope}>
        🪢 Rope up {d.y > 0 ? `(costs ${ropeCost(d.y)} oil)` : '(free)'}{!canRope ? ' — not enough oil' : ''}
      </button>
    </div>
  );
}
