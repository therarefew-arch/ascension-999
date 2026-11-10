// 🧪 The Apothecary (v0.0.2.39): Herblore's cozy potion shop. Rules in core/apothecary.ts; this file draws it.
// Also holds HerbloreGames: the tabs 🌿 RIPE PICKING / 🧪 THE APOTHECARY.
import { useEffect, useState } from 'react';
import type { ActionDef } from '../data/skills';
import {
  addHerb, addWater, apoSpec, apoXp, brewStars, emptyCauldron, HERBS, MAX_APO_LEVEL, newBrew, REMEDIES, remedyOf, type Brew,
} from '../core/apothecary';
import { lockedReason } from '../core/idle';
import { minigameXpScale } from '../core/rates';
import { game, useGame } from '../core/store';
import { sound } from '../audio/sound';
import { RipePicking } from './HerbloreGame';

type HbMode = 'pick' | 'apo';
let lastMode: HbMode = 'pick';

export function HerbloreGames({ action }: { action: ActionDef }) {
  const [mode, setModeState] = useState<HbMode>(lastMode);
  const setMode = (m: HbMode) => { lastMode = m; setModeState(m); sound.play('click', { volume: 0.4 }); };
  return (
    <>
      <div className="tab-row small-tabs">
        <button className={`tab-pill ${mode === 'pick' ? 'on' : ''}`} onClick={() => setMode('pick')}>🌿 RIPE PICKING</button>
        <button className={`tab-pill ${mode === 'apo' ? 'on' : ''}`} onClick={() => setMode('apo')}>🧪 THE APOTHECARY</button>
      </div>
      {mode === 'pick' ? <RipePicking action={action} /> : <Apothecary action={action} />}
    </>
  );
}

const ARROWS = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];
const arrowOf = (dx: number, dy: number) => ARROWS[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8];
/** Map coordinates (-1..1, y up) → SVG (0..200, y down). */
const sx = (x: number) => 100 + x * 92, sy = (y: number) => 100 - y * 92;
const HERB_RATE = [1, 1.122, 1.26, 1.335, 1.498, 1.682, 1.888, 2];

function Apothecary({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const level = Math.min(MAX_APO_LEVEL, player.apoLevel ?? 1);
  const [brew, setBrew] = useState<Brew>(() => newBrew(level));
  const [grind, setGrind] = useState(3);
  const [done, setDone] = useState<{ stars: number; xp: number; up: boolean } | null>(null);
  const [, force] = useState(0);
  const [wasIn, setWasIn] = useState(false);
  const blocked = lockedReason(player, action);
  const spec = apoSpec(brew.level);
  const remedy = remedyOf(brew);
  const stars = brewStars(brew);
  const herbs = HERBS.slice(0, spec.herbs);

  // A soft "you're in!" chime the first time the brew reaches the circle.
  useEffect(() => {
    if (stars > 0 && !wasIn) { sound.play('zap', { volume: 0.3, rate: 1.4 }); setWasIn(true); }
    if (stars === 0 && wasIn) setWasIn(false);
  }, [stars]); // eslint-disable-line react-hooks/exhaustive-deps

  const herb = (i: number) => {
    if (done) return;
    addHerb(brew, herbs[i], grind);
    sound.play('splash', { volume: 0.3, rate: 1.3 });
    sound.play('ding', { rate: HERB_RATE[i] * 0.85, volume: 0.3 });
    force((n) => n + 1);
  };
  const water = () => { if (done) return; addWater(brew); sound.play('splash', { volume: 0.35, rate: 0.9 }); force((n) => n + 1); };
  const empty = () => { if (done) return; emptyCauldron(brew); sound.play('douse', { volume: 0.4 }); force((n) => n + 1); };
  const turnMortar = () => { const g = grind % 3 + 1; setGrind(g); sound.play('carve', { volume: 0.4, rate: 0.8 + g * 0.15 }); game.vibrate(6); };
  const cork = () => {
    if (done || stars === 0) return;
    const xp = apoXp(brew.level, stars, action.xp);
    let shown = 0;
    if (!blocked) { game.minigameXp(action.id, xp, 80); shown = Math.round(xp * minigameXpScale(player, action)); }
    const up = stars >= 2 && brew.level >= level && !blocked;
    if (up) game.apoLevelUp();
    sound.play('clack', { volume: 0.5, rate: 1.3 });
    window.setTimeout(() => sound.play('levelup', { volume: 0.5 }), 200);
    game.vibrate(25);
    setDone({ stars, xp: shown, up });
  };
  const next = () => { sound.play('ding', { rate: 2, volume: 0.3 }); setDone(null); setWasIn(false); setBrew(newBrew(Math.min(MAX_APO_LEVEL, player.apoLevel ?? 1))); };

  const R = spec.radius * 92;
  const hue = Math.round(((Math.atan2(brew.y, brew.x) * 180) / Math.PI + 360) % 360);
  const sat = Math.round(Math.min(1, Math.hypot(brew.x, brew.y)) * 70);
  return (
    <div className="ap-root">
      <div className="ap-head">
        <b className="small">🧪 LEVEL {brew.level}/{MAX_APO_LEVEL}</b>
        <span className="tiny muted">{brew.steps} {brew.steps === 1 ? 'step' : 'steps'}</span>
      </div>
      <div className="ap-visit">
        <span className="ap-face">{brew.face}</span>
        <div className="ap-bubble">
          <span className="small">“{remedy.trouble}”</span>
          <b className="tiny">Needs: {remedy.emoji} {remedy.name}</b>
        </div>
      </div>

      <svg className="ap-map" viewBox="0 0 200 200" aria-label="Potion map">
        <defs>
          <radialGradient id="apParch" cx="50%" cy="45%" r="60%"><stop offset="0%" stopColor="#f7e9c8" /><stop offset="100%" stopColor="#d8bf8a" /></radialGradient>
        </defs>
        <circle cx="100" cy="100" r="96" fill="url(#apParch)" stroke="#7c5a2e" strokeWidth="3" />
        <circle cx="100" cy="100" r="46" fill="none" stroke="#b08a52" strokeWidth="0.6" strokeDasharray="2 3" />
        <line x1="100" y1="8" x2="100" y2="192" stroke="#b08a52" strokeWidth="0.5" strokeDasharray="2 3" />
        <line x1="8" y1="100" x2="192" y2="100" stroke="#b08a52" strokeWidth="0.5" strokeDasharray="2 3" />
        {REMEDIES.slice(0, spec.remedies).map((r) => {
          const target = r.id === brew.remedy;
          return (
            <g key={r.id} opacity={target ? 1 : 0.38}>
              <circle cx={sx(r.x)} cy={sy(r.y)} r={R} className={target ? 'ap-zone target' : 'ap-zone'} />
              {target && <circle cx={sx(r.x)} cy={sy(r.y)} r={R / 3} fill="none" stroke="#a16207" strokeWidth="0.8" strokeDasharray="1.5 1.5" />}
              <text x={sx(r.x)} y={sy(r.y) + 4} textAnchor="middle" fontSize="11">{r.emoji}</text>
            </g>
          );
        })}
        <polyline points={brew.path.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} fill="none" stroke="#6b3fa0" strokeWidth="1.6" strokeDasharray="3 2" strokeLinecap="round" />
        <g className={`ap-bottle ${stars ? 'in' : ''}`} transform={`translate(${sx(brew.x)} ${sy(brew.y)})`}>
          <circle r="7" fill={stars ? '#fde68a' : '#fff'} opacity="0.7" />
          <text y="4" textAnchor="middle" fontSize="11">🧪</text>
        </g>
      </svg>

      {done ? (
        <div className="ap-done">
          <div className="fr-stars">{[0, 1, 2].map((i) => <span key={i} className={i < done.stars ? 'on' : ''}>★</span>)}</div>
          <p className="small">{brew.face} “Oh, that’s just the thing — thank you kindly!”</p>
          {done.xp > 0 && <p className="small">+<b className="mono gold">{done.xp.toLocaleString()}</b> Herblore XP{done.up ? ' · next level!' : ''}</p>}
          <button className="btn btn-hero" onClick={next}>NEXT VISITOR ▶</button>
        </div>
      ) : (
        <>
          <div className="ap-bench">
            <button className="ap-mortar" onClick={turnMortar} aria-label="Mortar: how finely to grind">
              <span className="ap-mortar-emoji">🥣</span>
              <span className="ap-dots">{[1, 2, 3].map((g) => <i key={g} className={g <= grind ? 'on' : ''} />)}</span>
              <span className="tiny">{grind === 1 ? 'coarse' : grind === 2 ? 'fine' : 'powder'}</span>
            </button>
            <div className="ap-cauldron" style={{ ['--brew' as string]: `hsl(${hue} ${sat}% 55%)` }}><span>🫕</span></div>
            <div className="ap-side">
              <button className="btn btn-sm" onClick={water}>💧 Water</button>
              <button className="btn btn-sm" onClick={empty}>🫗 Empty</button>
            </div>
          </div>
          <div className="ap-jars" style={{ gridTemplateColumns: `repeat(${Math.min(4, herbs.length)}, 1fr)` }}>
            {herbs.map((h, i) => (
              <button key={h.id} className="ap-jar" onClick={() => herb(i)}>
                <span className="ap-jar-emoji">{h.emoji}</span>
                <span className="tiny">{h.name}</span>
                <span className="ap-arrow">{arrowOf(h.dx, h.dy)}</span>
              </button>
            ))}
          </div>
          <button className={`btn btn-wide ${stars ? 'btn-hero' : ''}`} disabled={!stars} onClick={cork}>
            {stars ? `🍾 Cork it & hand it over · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : `Steer the brew into the ${remedy.emoji} circle`}
          </button>
          {blocked && <p className="tiny red">{blocked} — you can still brew, but it won't give XP.</p>}
        </>
      )}
    </div>
  );
}
