// 🌀 Altar Spin (v0.0.2.28): Runecrafting's rune-pouch builder. Rules in core/altarSpin.ts; this file only draws it.
// An unfinished run is kept on this device per save slot (`ui.altar.<slot>`), so you can leave and carry on.
// Also holds RunecraftingGames: the tabs for the ALTAR (Rune Trace) and ALTAR SPIN.
import { useEffect, useRef, useState } from 'react';
import type { ActionDef } from '../data/skills';
import {
  CELLS, choose, cleanse, COLS, loadRun, newRun, RARITY_COLOR, reroll, RUNE_MAP, RUNES, SPINS_PER_TITHE, spin, TITHES, titheDue,
  type AltarRun,
} from '../core/altarSpin';
import { game, useGame } from '../core/store';
import { sound } from '../audio/sound';
import { RuneTrace } from './Minigames2';
import { Sheet } from './components';

type RcMode = 'altar' | 'spin';
let lastMode: RcMode = 'altar';

export function RunecraftingGames({ action }: { action: ActionDef }) {
  const [mode, setModeState] = useState<RcMode>(lastMode);
  const setMode = (m: RcMode) => { lastMode = m; setModeState(m); sound.play('click', { volume: 0.4 }); };
  return (
    <>
      <div className="tab-row small-tabs">
        <button className={`tab-pill ${mode === 'altar' ? 'on' : ''}`} onClick={() => setMode('altar')}>✍️ RUNE TRACE</button>
        <button className={`tab-pill ${mode === 'spin' ? 'on' : ''}`} onClick={() => setMode('spin')}>🌀 ALTAR SPIN</button>
      </div>
      {mode === 'altar' ? <RuneTrace action={action} /> : <AltarSpin />}
    </>
  );
}

const keyFor = (slot: number | null) => `ui.altar.${slot ?? 0}`;
function readRun(slot: number | null): AltarRun | null {
  try { const raw = localStorage.getItem(keyFor(slot)); return raw ? loadRun(JSON.parse(raw)) : null; } catch { return null; }
}
function writeRun(slot: number | null, run: AltarRun | null) {
  try { if (run && !run.over) localStorage.setItem(keyFor(slot), JSON.stringify(run)); else localStorage.removeItem(keyFor(slot)); } catch { /* no storage: the run lasts this visit */ }
}

/** Reveal order + timing for the cells after a spin. */
const STEP_MS = 70;

export function AltarSpin() {
  const { slot } = useGame();
  const [run, setRun] = useState<AltarRun | null>(() => readRun(slot));
  const [, force] = useState(0);
  const [shown, setShown] = useState(CELLS); // how many cells of the last spin are revealed
  const [count, setCount] = useState(0); // the gain counting up
  const [msg, setMsg] = useState<string | null>(null);
  const [xpGot, setXpGot] = useState(0);
  const [pouchOpen, setPouchOpen] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const commit = (r: AltarRun | null) => { writeRun(slot, r); setRun(r ? { ...r } : null); force((n) => n + 1); };
  const busy = shown < CELLS;

  const start = () => {
    sound.play('riffle');
    const r = newRun();
    setXpGot(0); setMsg(null); setShown(CELLS); setCount(0);
    commit(r);
  };

  const doSpin = () => {
    if (!run || run.over || run.offer.length || busy) return;
    sound.play('riffle', { volume: 0.7 });
    const gain = spin(run);
    commit(run);
    setMsg(null);
    // Reveal the runes one by one (filled cells only), ringing higher as it goes, then count the total up.
    setShown(0); setCount(0);
    timers.current.forEach(clearTimeout); timers.current = [];
    const filled = run.grid.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
    filled.forEach((_, k) => {
      timers.current.push(window.setTimeout(() => {
        setShown(k + 1);
        const c = run.grid[filled[k]]!;
        sound.play(c.value >= 10 ? 'boom' : 'rune', { rate: 0.8 + Math.min(0.9, k * 0.05), volume: c.value >= 10 ? 0.5 : 0.35 });
        if (c.value >= 10) game.vibrate(15);
      }, k * STEP_MS));
    });
    const end = filled.length * STEP_MS;
    timers.current.push(window.setTimeout(() => setShown(CELLS), end));
    const ticks = 12;
    for (let t = 1; t <= ticks; t++) {
      timers.current.push(window.setTimeout(() => { setCount(Math.round((gain * t) / ticks)); if (t % 3 === 0) sound.play('tick', { volume: 0.3 }); }, end + t * 35));
    }
  };

  const pick = (id: string | null) => {
    if (!run || busy) return;
    sound.play(id ? 'slide' : 'whoosh');
    const res = choose(run, id);
    if (res === 'paid' || res === 'won') {
      const xp = game.altarSpinReward('tithe') + (res === 'won' ? game.altarSpinReward('win') : 0);
      setXpGot((x) => x + xp);
      if (res === 'paid') { sound.play('levelup'); game.vibrate(30); setMsg(`🌀 Tithe ${run.paid} paid! +${xp.toLocaleString()} Runecrafting XP · 🧹 +1 cleanse · 🔄 +1 reroll`); }
    }
    if (res === 'lost') { sound.play('fail'); game.vibrate(60); }
    commit(run);
  };

  // ----- No run yet -----
  if (!run) {
    return (
      <div className="ar-root">
        <div className="ar-intro">
          <div className="ar-intro-emoji">🌀</div>
          <h3>Altar Spin</h3>
          <p className="small muted">Your pouch of runes is spun onto the altar. Runes next to each other set each other off: 🔥 flares beside 💨, 🌊 doubles water, 🕳️ eats its neighbours… After each spin, add 1 of 3 new runes to your pouch.</p>
          <p className="small muted">Every {SPINS_PER_TITHE} spins the Ley Spirit asks for a tithe of power. Pay all {TITHES.length} to win. Every tithe paid gives Runecrafting XP — nothing is ever lost.</p>
          <button className="btn btn-hero" onClick={start}>BEGIN A RUN</button>
        </div>
      </div>
    );
  }

  const due = titheDue(run);
  const pct = Math.min(100, (run.power / due) * 100);
  const ready = run.power >= due;

  // ----- Run over -----
  if (run.over) {
    return (
      <div className="ar-root">
        <div className={`ar-end ${run.won ? 'won' : ''}`}>
          <div className="ar-intro-emoji">{run.won ? '🌟' : '🍂'}</div>
          <h3>{run.won ? 'Every tithe paid!' : `The Ley Spirit wanted ${due.toLocaleString()}⚡`}</h3>
          <p className="small muted">{run.won ? 'The altar hums with power. The Ley Spirit bows.' : `You had ${run.power.toLocaleString()}⚡ — so close.`}</p>
          <div className="ar-end-stats small">
            <span>Tithes paid <b className="mono">{run.paid}/{TITHES.length}</b></span>
            <span>Best spin <b className="mono">{run.best.toLocaleString()}⚡</b></span>
            <span>Pouch <b className="mono">{run.pouch.length}</b> runes</span>
            {xpGot > 0 && <span>Runecrafting XP <b className="mono gold">+{xpGot.toLocaleString()}</b></span>}
          </div>
          <button className="btn btn-hero" onClick={start}>NEW RUN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-root">
      <div className="ar-head">
        <div className="row-between small">
          <b>Tithe {run.paid + 1}/{TITHES.length}</b>
          <span className={run.spinsLeft <= 1 && !ready ? 'red' : 'muted'}>{run.spinsLeft} spin{run.spinsLeft === 1 ? '' : 's'} left</span>
        </div>
        <div className={`ar-bar ${ready ? 'ready' : ''}`}>
          <div className="ar-fill" style={{ width: `${pct}%` }} />
          <span className="ar-bar-text mono">{run.power.toLocaleString()} / {due.toLocaleString()}⚡</span>
        </div>
      </div>

      <div className="ar-altar" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {run.grid.map((c, i) => {
          const order = run.grid.slice(0, i + 1).filter(Boolean).length; // this cell's place in the reveal
          const show = c && order <= shown;
          const d = c ? RUNE_MAP[c.id] : null;
          return (
            <div key={i} className={`ar-cell ${show ? 'on' : ''} ${c?.eaten && show ? 'eaten' : ''}`} style={d ? { ['--rc' as string]: RARITY_COLOR[d.rarity] } : undefined}>
              {show && d && <>
                <span className="ar-rune">{d.emoji}</span>
                <span className={`ar-val mono ${c!.value >= 10 ? 'big' : ''}`}>{c!.eaten ? '✖' : c!.value}</span>
                {c!.note && <span className="ar-note">{c!.note}</span>}
              </>}
            </div>
          );
        })}
      </div>

      <div className="ar-gain">
        {run.spins > 0 ? <>Last spin <b className="mono gold">+{(busy ? count : run.lastGain).toLocaleString()}⚡</b></> : <span className="muted small">Spin the altar to begin</span>}
      </div>

      {msg && <p className="small ar-msg" onClick={() => setMsg(null)}>{msg}</p>}

      {run.offer.length > 0 && !busy ? (
        <div className="ar-offer">
          <div className="small muted">Add a rune to your pouch:</div>
          <div className="ar-cards">
            {run.offer.map((id) => {
              const d = RUNE_MAP[id];
              return (
                <button key={id} className="ar-card" style={{ ['--rc' as string]: RARITY_COLOR[d.rarity] }} onClick={() => pick(id)}>
                  <span className="ar-card-emoji">{d.emoji}</span>
                  <b>{d.name}</b>
                  <span className="ar-card-rar">{d.rarity} · ⚡{d.base}</span>
                  <span className="ar-card-text">{d.text}</span>
                </button>
              );
            })}
          </div>
          <div className="ar-row">
            <button className="btn" disabled={run.rerolls <= 0} onClick={() => { if (reroll(run)) { sound.play('riffle'); commit(run); } }}>🔄 Reroll ({run.rerolls})</button>
            <button className="btn" onClick={() => pick(null)}>Skip</button>
          </div>
        </div>
      ) : (
        <div className="ar-row">
          <button className="btn" onClick={() => { sound.play('click'); setPouchOpen(true); }}>👝 Pouch ({run.pouch.length}){run.cleanses > 0 ? ` · 🧹${run.cleanses}` : ''}</button>
          <button className="btn btn-hero ar-spin" disabled={busy} onClick={doSpin}>🌀 SPIN</button>
        </div>
      )}

      {pouchOpen && <PouchSheet run={run} onClose={() => setPouchOpen(false)} onCleanse={(uid) => { if (cleanse(run, uid)) { sound.play('whoosh'); commit(run); } }} />}
    </div>
  );
}

function PouchSheet({ run, onClose, onCleanse }: { run: AltarRun; onClose: () => void; onCleanse: (uid: number) => void }) {
  const sorted = [...run.pouch].sort((a, b) => RUNES.findIndex((r) => r.id === a.id) - RUNES.findIndex((r) => r.id === b.id));
  return (
    <Sheet title={`👝 Your pouch · ${run.pouch.length} runes`} onClose={onClose}>
      <p className="small muted">Up to {CELLS} runes land on the altar each spin.{run.cleanses > 0 ? ` You have 🧹 ${run.cleanses} cleanse${run.cleanses > 1 ? 's' : ''}: tap 🧹 to remove a rune for good.` : ' Paying a tithe gives a 🧹 cleanse to remove a rune.'}</p>
      <div className="ar-pouch">
        {sorted.map((r) => {
          const d = RUNE_MAP[r.id];
          return (
            <div key={r.uid} className="ar-pouch-row" style={{ ['--rc' as string]: RARITY_COLOR[d.rarity] }}>
              <span className="ar-card-emoji">{d.emoji}</span>
              <div className="grow">
                <b className="small">{d.name}</b> <span className="tiny muted">⚡{d.base}</span>{r.grow > 0 && <span className="tiny gold"> +{r.grow} grown</span>}
                <div className="tiny muted">{d.text}</div>
              </div>
              {run.cleanses > 0 && run.pouch.length > 1 && <button className="btn btn-sm" aria-label={`Remove ${d.name}`} onClick={() => onCleanse(r.uid)}>🧹</button>}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
