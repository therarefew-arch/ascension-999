// 🔥 Forge Rush (v0.0.2.37): Smithing's cozy blacksmith shift. Rules in core/forgeRush.ts; this file draws it.
// Also holds SmithingGames: the tabs 🔨 ANVIL RHYTHM / 🔥 FORGE RUSH.
import { useEffect, useRef, useState } from 'react';
import type { ActionDef } from '../data/skills';
import {
  chooseShape, deliver, FORGE_SLOTS, forgeSpec, hammer, KINDS, MAX_FORGE_LEVEL, newShift, orderXp, quench, scrap, shaped, SHIFT_MS, stars,
  step, takeBar, toAnvil, type Kind, type Shift,
} from '../core/forgeRush';
import { lockedReason } from '../core/idle';
import { minigameXpScale } from '../core/rates';
import { game, useGame } from '../core/store';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import { AnvilRhythm } from './Minigames';

type SmMode = 'anvil' | 'rush';
let lastMode: SmMode = 'anvil';

export function SmithingGames({ action }: { action: ActionDef }) {
  const [mode, setModeState] = useState<SmMode>(lastMode);
  const setMode = (m: SmMode) => { lastMode = m; setModeState(m); sound.play('click', { volume: 0.4 }); };
  return (
    <>
      <div className="tab-row small-tabs">
        <button className={`tab-pill ${mode === 'anvil' ? 'on' : ''}`} onClick={() => setMode('anvil')}>🔨 ANVIL RHYTHM</button>
        <button className={`tab-pill ${mode === 'rush' ? 'on' : ''}`} onClick={() => setMode('rush')}>🔥 FORGE RUSH</button>
      </div>
      {mode === 'anvil' ? <AnvilRhythm action={action} /> : <ForgeRush action={action} />}
    </>
  );
}

interface Pop { key: number; text: string; seat: number }

function ForgeRush({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const level = Math.min(MAX_FORGE_LEVEL, player.forgeLevel ?? 1);
  const [shift, setShift] = useState<Shift | null>(null);
  const [, force] = useState(0);
  const [xpGot, setXpGot] = useState(0);
  const [pop, setPop] = useState<Pop | null>(null);
  const [spark, setSpark] = useState(0);
  const [result, setResult] = useState<{ stars: number; up: boolean } | null>(null);
  const live = useRef<Shift | null>(null);
  live.current = shift;
  const blocked = lockedReason(player, action);

  // A lively kitchen-style tune while the forge is busy; the town's song comes back when you leave.
  const town = player.location;
  useEffect(() => { if (!shift) return; sound.playMusic('music_kitchen'); return () => sound.playMusic(musicFor(town)); }, [!!shift, town]); // eslint-disable-line react-hooks/exhaustive-deps

  // The clock: 10 steps a second, paused while the game is hidden.
  useEffect(() => {
    if (!shift || shift.over) return;
    const id = window.setInterval(() => {
      const s = live.current;
      if (!s || s.over || document.hidden) return;
      step(s, 100);
      for (const e of s.events) {
        if (e === 'hot') sound.play('kindle', { volume: 0.35 });
        if (e === 'done') sound.play('ding', { rate: 1.3, volume: 0.35 });
        if (e === 'arrive') sound.play('ding', { rate: 2, volume: 0.3 });
        if (e === 'leave') sound.play('whoosh', { volume: 0.35 });
        if (e === 'over') finish(s);
      }
      s.events = [];
      force((n) => n + 1);
    }, 100);
    return () => clearInterval(id);
  }, [shift]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (s: Shift) => {
    const st = stars(s);
    const up = st >= 2 && s.level >= level;
    if (up && !blocked) game.forgeLevelUp();
    sound.play(st >= 2 ? 'levelup' : 'fail', { volume: 0.6 });
    game.vibrate(st >= 2 ? 40 : 20);
    setResult({ stars: st, up: up && !blocked });
  };

  const start = () => {
    sound.play('anvil', { volume: 0.5 });
    setXpGot(0); setResult(null);
    setShift(newShift(level));
  };

  const act = (ok: boolean, snd: string, opts?: { rate?: number; volume?: number }) => {
    if (ok) sound.play(snd as never, opts); else sound.play('error', { volume: 0.3 });
    force((n) => n + 1);
  };

  if (!shift) {
    const spec = forgeSpec(level);
    return (
      <div className="fr-root">
        <div className="fr-intro">
          <div className="fr-intro-emoji">🔥</div>
          <h3>Forge Rush · Day {level}</h3>
          <p className="small muted">Customers come to your counter wanting {spec.kinds.map((k) => KINDS[k].emoji).join(' ')}. Heat a bar in the forge, put the glowing bar on the anvil, pick the shape, hammer it out, quench it in the barrel, then hand it over. Quicker service = a bigger tip.</p>
          <p className="small muted">A {Math.round(SHIFT_MS / 60000)}-minute shift. Serve <b>{spec.goal}</b> for ⭐⭐⭐ (and let no more than 2 wander off) — 2 stars or more opens the next day. Nobody minds if you're slow; they just wander off.</p>
          {blocked && <p className="tiny red">{blocked} — you can still play, but it won't give XP.</p>}
          <button className="btn btn-hero" onClick={start}>OPEN THE FORGE</button>
        </div>
      </div>
    );
  }

  const s = shift;
  const spec = forgeSpec(s.level);
  const left = Math.max(0, SHIFT_MS - s.t);

  if (s.over && result) {
    return (
      <div className="fr-root">
        <div className="fr-intro">
          <div className="fr-stars">{[0, 1, 2].map((i) => <span key={i} className={i < result.stars ? 'on' : ''}>★</span>)}</div>
          <h3>Shift over!</h3>
          <div className="fr-end small">
            <span>Served <b className="mono">{s.served}</b> / {spec.goal}</span>
            <span>Wandered off <b className="mono">{s.missed}</b></span>
            {xpGot > 0 && <span>Smithing XP <b className="mono gold">+{xpGot.toLocaleString()}</b></span>}
          </div>
          <p className="small muted">{result.up ? `🎉 Day ${Math.min(MAX_FORGE_LEVEL, s.level + 1)} is open — busier counter, keener customers.` : result.stars >= 2 ? 'Nicely done!' : 'Two stars opens the next day — have another go.'}</p>
          <button className="btn btn-hero" onClick={start}>NEXT SHIFT · DAY {Math.min(MAX_FORGE_LEVEL, player.forgeLevel ?? 1)}</button>
        </div>
      </div>
    );
  }

  const onDeliver = (i: number) => {
    const r = deliver(s, i);
    if (!r) { act(false, ''); return; }
    const xp = orderXp(s.level, r.tip, action.xp);
    if (!blocked) { game.minigameXp(action.id, xp, 10); setXpGot((x) => x + Math.round(xp * minigameXpScale(player, action))); }
    sound.play('coin', { volume: 0.55 });
    sound.play('ding', { rate: 1.4 + r.tip * 0.6, volume: 0.4 });
    game.vibrate(15);
    setPop({ key: Date.now(), seat: r.seat, text: r.tip > 0.66 ? 'Wonderful! ✨' : r.tip > 0.33 ? 'Thank you!' : 'Finally!' });
    force((n) => n + 1);
  };
  const wanted = (k: Kind) => s.seats.some((c) => c && c.kind === k);
  const a = s.anvil;

  return (
    <div className="fr-root">
      <div className="fr-head">
        <b className="small">🔥 Day {s.level}</b>
        <span className="small mono">⏱ {Math.ceil(left / 1000)}s</span>
        <span className="small">✅ <b className="mono">{s.served}</b>/{spec.goal}</span>
      </div>
      <div className="fr-time"><div style={{ width: `${(left / SHIFT_MS) * 100}%` }} /></div>

      {/* The counter */}
      <div className="fr-counter" style={{ gridTemplateColumns: `repeat(${s.seats.length}, 1fr)` }}>
        {s.seats.map((c, i) => (
          <div key={i} className={`fr-seat ${c ? 'on' : ''}`}>
            {c ? <>
              <span className="fr-want" style={{ ['--p' as string]: `${(c.patience / c.max) * 100}%` }}><span>{KINDS[c.kind].emoji}</span></span>
              <span className="fr-face">{c.face}</span>
            </> : <span className="fr-empty tiny muted">…</span>}
            {pop && pop.seat === i && <span key={pop.key} className="fr-pop">{pop.text}</span>}
          </div>
        ))}
      </div>

      {/* The workshop */}
      <div className="fr-shop">
        <div className="fr-forge">
          <span className="tiny muted">FORGE</span>
          <div className="fr-slots">
            {s.forge.map((p, i) => (
              <button key={i} className={`fr-bar ${p ? (p.heat >= 1 ? 'hot' : 'warm') : 'none'}`} style={p ? { ['--h' as string]: String(p.heat) } : undefined}
                onClick={() => (p ? act(toAnvil(s, i), 'smith', { volume: 0.5 }) : act(takeBar(s), 'kindle', { volume: 0.4 }))}>
                {p ? (p.heat >= 1 ? 'HOT' : `${Math.round(p.heat * 100)}%`) : '+ bar'}
              </button>
            ))}
          </div>
          {s.forge.filter(Boolean).length < FORGE_SLOTS && <span className="tiny muted">tap + to heat a bar</span>}
        </div>

        <div className="fr-anvil-wrap">
          <span className="tiny muted">ANVIL</span>
          <button key={spark} className={`fr-anvil ${a ? (a.kind ? (shaped(s) ? 'ready' : 'work') : 'pick') : ''}`} onClick={() => {
            if (!a) { sound.play('error', { volume: 0.25 }); return; }
            if (!a.kind) return;
            if (shaped(s)) { act(quench(s), 'sizzle', { volume: 0.6 }); return; }
            const doneNow = hammer(s);
            sound.play('anvil', { rate: 0.9 + (a.taps / KINDS[a.kind].taps) * 0.5, volume: 0.55 });
            game.vibrate(8);
            setSpark((x) => x + 1);
            if (doneNow) sound.play('ding', { rate: 1.6, volume: 0.35 });
            force((n) => n + 1);
          }}>
            {a ? (a.kind
              ? <><span className="fr-piece">{KINDS[a.kind].emoji}</span>
                  <span className="fr-taps">{Array.from({ length: KINDS[a.kind].taps }, (_, k) => <i key={k} className={k < a.taps ? 'on' : ''} />)}</span>
                  <span className="tiny">{shaped(s) ? (s.barrel ? 'barrel busy…' : 'tap to quench 💧') : 'tap to hammer!'}</span></>
              : <span className="fr-hotbar">▬</span>)
              : <span className="tiny muted">bring a hot bar</span>}
          </button>
          {a && !a.kind && (
            <div className="fr-shapes">
              {spec.kinds.map((k) => (
                <button key={k} className={`fr-shape ${wanted(k) ? 'want' : ''}`} onClick={() => act(chooseShape(s, k), 'click', { volume: 0.5 })}>{KINDS[k].emoji}<span className="tiny">{KINDS[k].taps}</span></button>
              ))}
            </div>
          )}
          {a && <button className="fr-scrap tiny" onClick={() => act(scrap(s), 'whoosh', { volume: 0.3 })}>↩︎ back to forge</button>}
        </div>

        <div className="fr-barrel">
          <span className="tiny muted">QUENCH</span>
          <div className={`fr-water ${s.barrel ? 'steam' : ''}`}>{s.barrel ? KINDS[s.barrel.kind].emoji : '💧'}</div>
        </div>
      </div>

      {/* Finished work */}
      <div className="fr-rack">
        <span className="tiny muted">READY — tap to hand over</span>
        <div className="fr-rack-slots">
          {s.rack.map((k, i) => (
            <button key={i} className={`fr-item ${k ? (wanted(k) ? 'want' : 'idle') : ''}`} disabled={!k} onClick={() => onDeliver(i)}>{k ? KINDS[k].emoji : ''}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
