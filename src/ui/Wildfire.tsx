// Firemaking: Kindle (existing), Bonfire, and the Wildfire mini boss rhythm game (Piano Tiles style).
import { useEffect, useRef, useState } from 'react';
import { getItem } from '../data/items';
import type { ActionDef } from '../data/skills';
import { BONFIRE_LOGS, BONFIRE_XP_BONUS, BONFIRES, WILDFIRE, bonfireActive, wildfireReady } from '../core/firemaking';
import { FIRE_LOGS, skillLevel } from '../core/idle';
import { countInBag } from '../core/inventory';
import { game, useGame } from '../core/store';
import { sound } from '../audio/sound';
import { ItemIcon, UiIcon } from './icons';
import { fmtDuration, fmtNum } from './format';
import { Kindle } from './Minigames2';

// ---------------------------------------------------------------------------
// Bonfire
// ---------------------------------------------------------------------------
function Bonfire() {
  const { player } = useGame();
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const lit = bonfireActive(player);
  const color = FIRE_LOGS[player.bonfire?.log ?? 'pine_logs']?.color ?? '#f97316';
  return (
    <div className="mg">
      <div className="mg-stage">
        <div className="fire-wrap">
          <div className={`fire ${lit ? 'lit' : ''}`} style={{ ['--flame' as string]: color, opacity: lit ? 1 : 0.2, transform: `scale(${lit ? 1.5 : 0.6})` }} />
          <div className="fire-logs"><ItemIcon id={player.bonfire?.log ?? 'pine_logs'} size={56} /></div>
        </div>
        <div className="mg-stage-name">{lit ? 'The bonfire is roaring!' : 'No bonfire lit'}</div>
        <div className="mg-stage-xp">{lit ? `+${BONFIRE_XP_BONUS * 100}% XP to all skills · ${fmtDuration(player.bonfire!.until - Date.now())} left` : `Burn ${BONFIRE_LOGS} logs for a big blaze`}</div>
      </div>
      <div className="mg-panel">
        <div className="mg-row"><span className="mg-label">Light a bonfire</span><span className="mg-hint">Lighting again adds more time</span></div>
        {Object.entries(BONFIRES).map(([log, b]) => {
          const have = countInBag(player.inventory, log);
          const lvlOk = skillLevel(player, 'firemaking') >= b.level;
          return (
            <button key={log} className="list-row" disabled={!lvlOk || have < BONFIRE_LOGS} onClick={() => game.lightBonfire(log)}>
              <ItemIcon id={log} size={36} />
              <div className="grow">
                <b>{getItem(log).name} bonfire</b>
                <div className="small muted">{BONFIRE_LOGS} logs (you have {fmtNum(have)}) · {b.minutes} min of +{BONFIRE_XP_BONUS * 100}% XP</div>
                {!lvlOk && <div className="small red">Needs Firemaking level {b.level}</div>}
              </div>
              <span className="start-pill" style={{ color: FIRE_LOGS[log].color, borderColor: FIRE_LOGS[log].color }}>LIGHT</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wildfire mini boss — rhythm game
// ---------------------------------------------------------------------------
interface Note { lane: number; at: number; state: 'live' | 'hit' | 'miss' }
const LANES = 4;
const HIT_WINDOW = 170;
const PERFECT_WINDOW = 70;

function makeSong(): Note[] {
  const notes: Note[] = [];
  let t = 1800;
  let last = -1;
  while (t < WILDFIRE.durationMs) {
    let lane = Math.floor(Math.random() * LANES);
    if (lane === last && Math.random() < 0.6) lane = (lane + 1 + Math.floor(Math.random() * 3)) % LANES;
    notes.push({ lane, at: t, state: 'live' });
    last = lane;
    // Starts gentle, gets a little quicker.
    const progress = t / WILDFIRE.durationMs;
    t += 720 - 300 * progress + Math.random() * 160;
  }
  return notes;
}

function WildfireGame() {
  const { player } = useGame();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [result, setResult] = useState<{ won: boolean; share: number; gained: [string, number][] } | null>(null);
  const notes = useRef<Note[]>([]);
  const start = useRef(0);
  const [, setFrame] = useState(0);
  const [flash, setFlash] = useState<{ lane: number; good: boolean; at: number } | null>(null);
  const waitMs = wildfireReady(player);
  const lvlOk = skillLevel(player, 'firemaking') >= WILDFIRE.level;

  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    const loop = () => {
      const t = performance.now() - start.current;
      for (const n of notes.current) if (n.state === 'live' && t > n.at + HIT_WINDOW) n.state = 'miss';
      if (t > WILDFIRE.durationMs + 1200) {
        const hits = notes.current.filter((n) => n.state === 'hit').length;
        const r = game.finishWildfire(hits, notes.current.length);
        setResult({ won: r.won, share: r.share, gained: Object.entries(r.report.gained) });
        setPhase('done');
        return;
      }
      setFrame((f) => (f + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const begin = () => {
    notes.current = makeSong();
    start.current = performance.now();
    setResult(null);
    setPhase('playing');
  };

  const tapLane = (lane: number) => {
    if (phase !== 'playing') return;
    const t = performance.now() - start.current;
    const target = notes.current.filter((n) => n.lane === lane && n.state === 'live' && Math.abs(n.at - t) <= HIT_WINDOW)
      .sort((a, b) => Math.abs(a.at - t) - Math.abs(b.at - t))[0];
    if (target) {
      target.state = 'hit';
      sound.play('crackle');
      setFlash({ lane, good: Math.abs(target.at - t) <= PERFECT_WINDOW, at: t });
    } else {
      setFlash({ lane, good: false, at: t });
    }
  };

  const t = phase === 'playing' ? performance.now() - start.current : 0;
  const travel = 1700 - 400 * Math.min(1, t / WILDFIRE.durationMs);
  const total = notes.current.length || 1;
  const hits = notes.current.filter((n) => n.state === 'hit').length;
  const passed = notes.current.filter((n) => n.state !== 'live').length;
  const strength = Math.max(0, 1 - hits / total / WILDFIRE.winShare);

  if (phase !== 'playing') {
    return (
      <div className="mg">
        <div className="mg-stage wildfire-intro">
          <div className="wildfire-face">🔥</div>
          <div className="mg-stage-name">Wildfire</div>
          <div className="boss-tag">MINI BOSS · can drop gems</div>
          {phase === 'done' && result && (
            <div className={`wf-result ${result.won ? 'won' : ''}`}>
              <b>{result.won ? 'WILDFIRE TAMED!' : 'It fizzled out on its own…'}</b>
              <span className="small">{Math.round(result.share * 100)}% of flames doused</span>
              {result.gained.length > 0 && <span className="small">{result.gained.map(([id, n]) => (id === 'coins' ? `+${n} coins` : `+${n} ${getItem(id).name}`)).join(' · ')}</span>}
            </div>
          )}
        </div>
        <div className="mg-panel">
          <div className="mg-row"><span className="mg-label">Rhythm battle</span><span className="mg-hint">Tap each lane as its flame reaches the line</span></div>
          <p className="mg-foot">Douse {Math.round(WILDFIRE.winShare * 100)}% of the flames to tame the Wildfire. Missing costs nothing — just try again. It returns 15 minutes after being tamed.</p>
          <button className="btn btn-hero btn-xl" disabled={!lvlOk || waitMs > 0} onClick={begin}>
            <UiIcon name="firemaking" size={22} /> {!lvlOk ? `Needs Firemaking ${WILDFIRE.level}` : waitMs > 0 ? `Returns in ${fmtDuration(waitMs)}` : phase === 'done' ? 'PLAY AGAIN' : 'FACE THE WILDFIRE'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mg">
      <div className="wf-top">
        <span className="small gold">Wildfire strength</span>
        <div className="hp-bar"><div className="hp-fill hp-red" style={{ width: `${strength * 100}%` }} /><span className="hp-text mono">{hits}/{total} doused</span></div>
        <div className="small muted mono">{fmtDuration(Math.max(0, WILDFIRE.durationMs - t))} · {passed - hits} missed</div>
      </div>
      <div className="wf-board">
        {Array.from({ length: LANES }, (_, lane) => (
          <div key={lane} className="wf-lane" onPointerDown={(e) => { e.preventDefault(); tapLane(lane); }}>
            {notes.current.filter((n) => n.lane === lane && n.state === 'live' && n.at - t < travel && n.at - t > -HIT_WINDOW).map((n) => {
              const y = (1 - (n.at - t) / travel) * 100;
              return <div key={n.at} className="wf-note" style={{ top: `calc(${y * 0.86}% - 22px)` }}>🔥</div>;
            })}
            {flash && flash.lane === lane && t - flash.at < 180 && <div className={`wf-flash ${flash.good ? 'good' : ''}`} />}
            <div className="wf-line" />
            <button className="wf-key" data-silent tabIndex={-1} aria-label={`Lane ${lane + 1}`}>💧</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function FiremakingGames({ action }: { action: ActionDef }) {
  const [mode, setMode] = useState<'kindle' | 'bonfire' | 'wildfire'>('kindle');
  return (
    <>
      <div className="tab-row small-tabs">
        <button className={`tab-pill ${mode === 'kindle' ? 'on' : ''}`} onClick={() => setMode('kindle')}><UiIcon name="firemaking" size={16} /> KINDLE</button>
        <button className={`tab-pill ${mode === 'bonfire' ? 'on' : ''}`} onClick={() => setMode('bonfire')}>🔥 BONFIRE</button>
        <button className={`tab-pill ${mode === 'wildfire' ? 'on' : ''}`} onClick={() => setMode('wildfire')}>🎵 WILDFIRE</button>
      </div>
      {mode === 'kindle' && <Kindle action={action} />}
      {mode === 'bonfire' && <Bonfire />}
      {mode === 'wildfire' && <WildfireGame />}
    </>
  );
}
