// ⛏️ Deep Delve (v0.0.2.38): Mining's dig-down game. Rules in core/delve.ts; this file draws it.
// A dive in progress is kept on this device per save slot (`ui.delve.<slot>`). Also holds MiningGames: the tabs
// ⛏️ STRIKE THE VEIN / 🕳️ DEEP DELVE.
import { useEffect, useState } from 'react';
import type { ActionDef } from '../data/skills';
import {
  blockAt, COLS, haul, haulValue, hitsFor, MAX_UPGRADE, newDive, NEW_KIT, oilMax, ORES, ropeCost, ropeUp, sackMax, tap, upgradeCost,
  type DelveKit, type Dive,
} from '../core/delve';
import { lockedReason } from '../core/idle';
import { game, useGame } from '../core/store';
import { sound } from '../audio/sound';
import { StrikeVein } from './Minigames';

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

const VIEW_UP = 2, VIEW_DOWN = 7;

function DeepDelve({ action }: { action: ActionDef }) {
  const { player, slot } = useGame();
  const kit: DelveKit = player.delve ?? NEW_KIT;
  const [dive, setDive] = useState<Dive | null>(() => readDive(slot));
  const [, force] = useState(0);
  const [end, setEnd] = useState<{ xp: number; value: number; ores: string[]; how: string; depth: number } | null>(null);
  const [shake, setShake] = useState(0);
  const blocked = lockedReason(player, action);
  useEffect(() => () => { /* a dive in progress stays saved */ }, []);

  const commit = (d: Dive | null) => { writeDive(slot, d); setDive(d ? { ...d } : null); force((n) => n + 1); };

  const finish = (d: Dive) => {
    const xp = game.delveEnd(action.id, d);
    const home = haul(d);
    setEnd({ xp, value: haulValue(home), ores: home.map((o) => ORES[o].emoji), how: d.how ?? 'rope', depth: d.y });
    writeDive(slot, null);
    setDive(null);
  };

  const onTap = (x: number, y: number) => {
    if (!dive || dive.over) return;
    const res = tap(dive, kit, x, y);
    if (res === 'no') { return; }
    for (const e of dive.events) {
      if (e === 'hit') { sound.play('pickaxe', { volume: 0.5, rate: 0.85 + Math.random() * 0.2 }); setShake((s) => s + 1); game.vibrate(6); }
      if (e === 'break') sound.play('mine', { volume: 0.45, rate: 1 + Math.random() * 0.2 });
      if (e.startsWith('ore:')) { const o = e.slice(4) as keyof typeof ORES; sound.play('mine', { volume: 0.4 }); sound.play(o === 'chest' || o === 'fossil' ? 'enchant' : 'ding', { rate: 1 + ORES[o].value / 30, volume: 0.4 }); game.vibrate(12); }
      if (e === 'full') sound.play('thud', { volume: 0.35 });
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
      { kind: 'sack', emoji: '👝', name: 'Ore sack', now: `${sackMax(kit)} chunks` },
    ];
    return (
      <div className="dd-root">
        {end && (
          <div className={`dd-end ${end.how}`}>
            <b>{end.how === 'rope' ? '🪢 Back up with everything!' : '🐤 Your lantern went out — the canary led you home with half the haul.'}</b>
            <div className="dd-end-ores">{end.ores.length ? end.ores.join(' ') : 'No ore this time.'}</div>
            <div className="small">Depth <b className="mono">{end.depth}m</b> · haul worth <b className="mono gold">{end.value}</b> delve coins{end.xp ? <> · <b className="mono gold">+{end.xp.toLocaleString()}</b> Mining XP</> : null}</div>
          </div>
        )}
        <div className="dd-camp">
          <div className="row-between small"><b>🏕️ Mine camp</b><span>🪙 <b className="mono">{kit.coins.toLocaleString()}</b> delve coins · deepest <b className="mono">{kit.best}m</b></span></div>
          <div className="dd-ups">
            {ups.map((u) => {
              const lv = kit[u.kind];
              const cost = upgradeCost(u.kind, lv);
              return (
                <div key={u.kind} className="dd-up">
                  <span className="dd-up-emoji">{u.emoji}</span>
                  <div className="grow"><b className="small">{u.name} · Lv {lv}</b><div className="tiny muted">{u.now}</div></div>
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
  const light = 1.4 + oilPct * 2.6; // how many cells the lantern lights
  const rows: number[] = [];
  for (let y = d.y - VIEW_UP; y <= d.y + VIEW_DOWN; y++) rows.push(y);
  const canRope = d.oil >= ropeCost(d.y);
  return (
    <div className="dd-root">
      <div className="dd-head">
        <span className="small">⬇️ <b className="mono">{d.y}m</b></span>
        <span className="small">👝 <b className="mono">{d.sack.length}/{sackMax(kit)}</b></span>
        <span className="small">🪙 <b className="mono">{haulValue(d.sack)}</b></span>
      </div>
      <div className="dd-oil"><div className={oilPct < 0.25 ? 'low' : ''} style={{ width: `${oilPct * 100}%` }} /><span className="tiny mono">🏮 {d.oil}/{oilMax(kit)}</span></div>
      <div key={shake} className="dd-shaft" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {rows.map((y) => Array.from({ length: COLS }, (_, x) => {
          if (y < 0) return <div key={`${x},${y}`} className="dd-cell sky" />;
          const b = blockAt(d, x, y);
          const me = x === d.x && y === d.y;
          const dist = Math.hypot(x - d.x, y - d.y);
          const dark = Math.min(0.92, Math.max(0, (dist - light) / 2.2));
          const near = Math.abs(x - d.x) + Math.abs(y - d.y) === 1 && b && (b.cell === 'open' || y >= d.y);
          const cracks = b && b.cell !== 'open' ? Math.min(3, b.hits) : 0;
          return (
            <button key={`${x},${y}`} className={`dd-cell ${b ? b.cell : 'rock'} ${y === 0 ? 'surface' : ''} ${near ? 'near' : ''} ${cracks ? `crack${cracks}` : ''}`}
              style={{ ['--dark' as string]: String(dark) }} onClick={() => onTap(x, y)} disabled={!near}>
              {me ? <span className="dd-me">🧑‍🏭</span> : b?.ore && b.cell !== 'open' && dark < 0.6 ? <span className="dd-ore">{ORES[b.ore].emoji}</span> : null}
            </button>
          );
        }))}
      </div>
      <button className="btn btn-wide dd-rope" disabled={!canRope} onClick={rope}>
        🪢 Rope up {d.y > 0 ? `(costs ${ropeCost(d.y)} oil)` : '(free)'}{!canRope ? ' — not enough oil' : ''}
      </button>
    </div>
  );
}
