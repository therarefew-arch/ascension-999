// 🌀 Altar Spin (v0.0.2.28): Runecrafting's rune-pouch builder. Rules in core/altarSpin.ts; this file only draws it.
// An unfinished run is kept on this device per save slot (`ui.altar.<slot>`), so you can leave and carry on.
// Also holds RunecraftingGames: the tabs for the ALTAR (Rune Trace) and ALTAR SPIN.
import { useEffect, useRef, useState } from 'react';
import type { ActionDef } from '../data/skills';
import {
  ALTAR_MAP, canPayEarly, CELLS, choose, payEarly, chooseAltar, cleanse, COLS, loadRun, newRun, RARITY_COLOR, reroll, RUNE_MAP, RUNES, SPINS_PER_TITHE, spin, TITHES, titheDue,
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

/** How a spin plays out (v0.0.2.29, owner: "satisfying sound effects… watching a number add up… an action light up"):
 *  DEAL — the runes drop onto the altar one after another;
 *  TALLY — each rune lights up in turn, the runes that boosted it flash, its points fly into a big running total
 *          (a bell ding climbing a scale; a zing for multipliers, a boom for big ones), speeding up as it goes;
 *  POUR — the total pours into the tithe bar. Tap the altar to hurry it along. */
type Phase = 'idle' | 'deal' | 'tally' | 'pour';
const DEAL_MS = 45;
/** A pentatonic ladder (semitones) so the dings climb like a little tune. */
const LADDER = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
const dingRate = (k: number) => 0.75 * Math.pow(2, LADDER[Math.min(k, LADDER.length - 1)] / 12);

interface Pop { cell: number; text: string; kind: 'add' | 'mult' | 'big' | 'eat'; key: number }

export function AltarSpin() {
  const { slot } = useGame();
  const [run, setRun] = useState<AltarRun | null>(() => readRun(slot));
  const [, force] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [shown, setShown] = useState(CELLS); // how many runes of the last spin have dropped in
  const [counted, setCounted] = useState<Set<number>>(() => new Set(Array.from({ length: CELLS }, (_, i) => i)));
  const [cur, setCur] = useState(-1); // the rune being counted now
  const [lit, setLit] = useState<number[]>([]); // the runes that boosted it
  const [running, setRunning] = useState(0);
  const [pending, setPending] = useState(0); // power not yet poured into the bar
  const [pop, setPop] = useState<Pop | null>(null);
  const [readyFlash, setReadyFlash] = useState(false);
  const [bonusLine, setBonusLine] = useState<string | null>(null);
  const [altarsOpen, setAltarsOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [xpGot, setXpGot] = useState(0);
  const [pouchOpen, setPouchOpen] = useState(false);
  const timers = useRef<number[]>([]);
  const finish = useRef<(() => void) | null>(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const commit = (r: AltarRun | null) => { writeRun(slot, r); setRun(r ? { ...r } : null); force((n) => n + 1); };
  const busy = phase !== 'idle';
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

  const start = () => {
    sound.play('riffle');
    const r = newRun();
    setXpGot(0); setMsg(null); setShown(CELLS); setRunning(0); setPending(0); setPhase('idle');
    commit(r);
  };

  /** The total lands in the bar (shared by the normal ending and "hurry"). */
  const pourIn = (r: AltarRun, gain: number) => {
    timers.current.forEach(clearTimeout); timers.current = [];
    finish.current = null;
    setShown(CELLS); setCounted(new Set(Array.from({ length: CELLS }, (_, i) => i))); setCur(-1); setLit([]); setPop(null);
    setBonusLine(r.bonus.length ? r.bonus.map((b) => `${b.emoji} +${b.value}`).join('  ') : null);
    setRunning(gain);
    setPhase('pour');
    const before = r.power - gain;
    const due = titheDue(r);
    sound.play('pour', { volume: 0.7 });
    setPending(0);
    if (before < due && r.power >= due) {
      later(450, () => { sound.play('enchant'); game.vibrate(40); setReadyFlash(true); });
      later(1900, () => setReadyFlash(false));
    }
    later(650, () => setPhase('idle'));
  };

  const doSpin = () => {
    if (!run || run.over || run.offer.length || busy) return;
    sound.play('riffle', { volume: 0.7 });
    const gain = spin(run);
    commit(run);
    setMsg(null); setReadyFlash(false);
    timers.current.forEach(clearTimeout); timers.current = [];
    setPending(gain); setRunning(0); setShown(0); setCounted(new Set()); setCur(-1); setLit([]); setPop(null); setBonusLine(null);
    setPhase('deal');
    const filled = run.grid.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
    finish.current = () => pourIn(run, gain);

    // DEAL: the runes drop in.
    filled.forEach((_, k) => later(k * DEAL_MS, () => { setShown(k + 1); if (k % 2 === 0) sound.play('slide', { volume: 0.25, rate: 1 + k * 0.03 }); }));

    // TALLY: count each rune, faster as it goes.
    let t = filled.length * DEAL_MS + 250;
    later(t - 120, () => setPhase('tally'));
    let total = 0;
    let step = 0;
    filled.forEach((cell) => {
      const c = run.grid[cell]!;
      const k = step++;
      const big = c.value >= 10;
      later(t, () => {
        setCur(cell);
        setLit(c.from ?? []);
        setCounted((s) => new Set(s).add(cell));
        if (c.eaten) {
          sound.play('thud', { volume: 0.5 });
          setPop({ cell, text: 'eaten!', kind: 'eat', key: Date.now() });
          return;
        }
        total += c.value;
        setRunning(total);
        if (c.mult) { sound.play('zap', { volume: 0.45, rate: 0.9 + Math.min(0.5, k * 0.03) }); game.vibrate(12); }
        if (big) { sound.play('boom', { volume: 0.4, rate: 1.15 }); game.vibrate(20); }
        sound.play('ding', { rate: dingRate(k), volume: 0.42 });
        setPop({ cell, text: c.mult ? `×${c.mult} → +${c.value}` : `+${c.value}`, kind: big ? 'big' : c.mult ? 'mult' : 'add', key: Date.now() + cell });
      });
      t += Math.max(85, 260 - k * 14) + (c.mult ? 140 : 0) + (big ? 110 : 0) + (c.from?.length ? 60 : 0);
    });

    // 🏛️ Altar bonuses join the total one by one.
    run.bonus.forEach((b, j) => {
      t += 380;
      later(t, () => {
        setCur(-1); setLit([]);
        total += b.value;
        setRunning(total);
        setBonusLine(`${b.emoji} ${b.name} +${b.value}`);
        sound.play('zap', { volume: 0.5, rate: 1.1 + j * 0.12 });
        sound.play('ding', { rate: dingRate(LADDER.length - 1) * (1 + j * 0.06), volume: 0.4 });
        game.vibrate(15);
      });
    });

    // POUR.
    later(t + 250, () => pourIn(run, gain));
  };

  /** Tap the altar while it's counting to skip to the end. */
  const hurry = () => { if ((phase === 'deal' || phase === 'tally') && finish.current) { sound.play('whoosh', { volume: 0.4 }); finish.current(); } };

  const pick = (id: string | null) => {
    if (!run || busy) return;
    sound.play(id ? 'slide' : 'whoosh');
    setReadyFlash(false);
    const res = choose(run, id);
    if (res === 'poor') { sound.play('error'); setMsg('Not enough stored power for that rune.'); return; }
    if (id && run.offer.length === 0) sound.play('coin', { volume: 0.5 });
    settled(res);
  };
  /** After a tithe: XP, sounds and the message. */
  const settled = (res: string, skipped = 0) => {
    if (!run) return;
    if (res === 'paid' || res === 'won') {
      const xp = game.altarSpinReward('tithe') + (res === 'won' ? game.altarSpinReward('win') : 0);
      setXpGot((x) => x + xp);
      if (res === 'paid') {
        sound.play('levelup'); game.vibrate(30);
        setMsg(`🌀 Tithe ${run.paid} paid! +${xp.toLocaleString()} Runecrafting XP · 🧹 +1 cleanse · 🔄 +${1 + skipped} reroll${skipped ? 's' : ''} · 🏛️ pick an altar`);
      }
    }
    if (res === 'lost') { sound.play('fail'); game.vibrate(60); }
    commit(run);
  };
  /** ⏩ Pay now and skip the spins left. */
  const moveOn = () => {
    if (!run || busy || !canPayEarly(run)) return;
    const skipped = run.spinsLeft;
    sound.play('pour', { volume: 0.6 });
    setReadyFlash(false);
    settled(payEarly(run), skipped);
  };

  // ----- No run yet -----
  if (!run) {
    return (
      <div className="ar-root">
        <div className="ar-intro">
          <div className="ar-intro-emoji">🌀</div>
          <h3>Altar Spin</h3>
          <p className="small muted">Your pouch of runes is spun onto the altar. Runes next to each other set each other off: 🔥 flares beside 💨, 🌊 doubles water, 🕳️ eats its neighbours… After each spin, add a new rune to your pouch — one is always free, better ones cost some of your stored ⚡.</p>
          <p className="small muted">🏛️ Pick an altar at the start and after every tithe: each one changes how your runes combo for the rest of the run.</p>
          <p className="small muted">Every {SPINS_PER_TITHE} spins the Ley Spirit asks for a tithe of power. Pay all {TITHES.length} to win. Every tithe paid gives Runecrafting XP — nothing is ever lost.</p>
          <button className="btn btn-hero" onClick={start}>BEGIN A RUN</button>
        </div>
      </div>
    );
  }

  const due = titheDue(run);
  const barPower = run.power - pending;
  const pct = Math.min(100, (barPower / due) * 100);
  const ready = barPower >= due;

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
            {run.altars.length > 0 && <span>Altars {run.altars.map((a) => ALTAR_MAP[a].emoji).join(' ')}</span>}
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
          <span className={run.spinsLeft <= 1 && !ready ? 'red' : 'muted'}>🌀 {run.spinsLeft} spin{run.spinsLeft === 1 ? '' : 's'} left</span>
        </div>
        {/* v0.0.2.31 (owner: show what you have and what the tithe will take): the three numbers that matter. */}
        <div className="ar-stats">
          <div className="ar-stat"><span className="tiny muted">⚡ Stored</span><b className="mono">{barPower.toLocaleString()}</b></div>
          <div className="ar-stat"><span className="tiny muted">🕯️ Tithe takes</span><b className="mono">{due.toLocaleString()}</b></div>
          {ready
            ? <div className="ar-stat good"><span className="tiny muted">✨ Spare</span><b className="mono">{(barPower - due).toLocaleString()}</b></div>
            : <div className="ar-stat short"><span className="tiny muted">Still need</span><b className="mono">{(due - barPower).toLocaleString()}</b></div>}
        </div>
        <div className={`ar-bar ${ready ? 'ready' : ''} ${phase === 'pour' ? 'pouring' : ''} ${readyFlash ? 'flash' : ''}`}>
          <div className="ar-fill" style={{ width: `${pct}%` }} />
          <span className="ar-bar-text mono">{readyFlash ? '✨ TITHE READY! ✨' : `${barPower.toLocaleString()} / ${due.toLocaleString()}⚡`}</span>
        </div>
        {run.altars.length > 0 && (
          <button className="ar-altars" onClick={() => { sound.play('click', { volume: 0.4 }); setAltarsOpen((o) => !o); }} aria-expanded={altarsOpen}>
            <span className="tiny muted">🏛️ Altars</span>
            {run.altars.map((a) => <span key={a} className="ar-altar-chip" title={`${ALTAR_MAP[a].name}: ${ALTAR_MAP[a].text}`}>{ALTAR_MAP[a].emoji}</span>)}
            <span className="tiny muted">{altarsOpen ? '▲' : '▼'}</span>
          </button>
        )}
        {altarsOpen && (
          <div className="ar-altar-list">
            {run.altars.map((a) => <div key={a} className="tiny"><b>{ALTAR_MAP[a].emoji} {ALTAR_MAP[a].name}</b> <span className="muted">— {ALTAR_MAP[a].text}</span></div>)}
          </div>
        )}
      </div>

      <div className={`ar-altar ${phase === 'tally' ? 'counting' : ''}`} style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }} onClick={hurry}>
        {run.grid.map((c, i) => {
          const order = run.grid.slice(0, i + 1).filter(Boolean).length; // this cell's place in the reveal
          const show = c && order <= shown;
          const d = c ? RUNE_MAP[c.id] : null;
          const done = counted.has(i);
          return (
            <div key={i} className={`ar-cell ${show ? 'on' : ''} ${c?.eaten && done ? 'eaten' : ''} ${cur === i ? 'now' : ''} ${lit.includes(i) ? 'src' : ''} ${done && c?.mult ? 'multd' : ''}`}
              style={d ? { ['--rc' as string]: RARITY_COLOR[d.rarity] } : undefined}>
              {show && d && <>
                <span className="ar-rune">{d.emoji}</span>
                {done && <span className={`ar-val mono ${c!.value >= 10 ? 'big' : ''}`}>{c!.eaten ? '✖' : c!.value}</span>}
                {done && c!.note && <span className="ar-note">{c!.note}</span>}
              </>}
              {pop && pop.cell === i && <span key={pop.key} className={`ar-pop ${pop.kind}`}>{pop.text}</span>}
            </div>
          );
        })}
        {phase === 'tally' && <span className="ar-hurry tiny">tap to hurry</span>}
      </div>

      <div className="ar-gain">
        {run.spins > 0
          ? <b key={running} className={`ar-total mono ${busy ? 'live' : ''}`} style={{ ['--sz' as string]: String(1 + Math.min(0.7, running / Math.max(1, due) * 0.9)) }}>+{(busy ? running : run.lastGain).toLocaleString()}⚡</b>
          : <span className="muted small">Spin the altar to begin</span>}
        {bonusLine && <span key={bonusLine} className="ar-bonus small">{bonusLine}</span>}
      </div>

      {msg && <p className="small ar-msg" onClick={() => setMsg(null)}>{msg}</p>}

      {run.offer.length > 0 && !busy ? (
        <div className="ar-offer">
          <div className="small muted">Add a rune to your pouch <span className="tiny">(stored: <b className="mono">{run.power.toLocaleString()}⚡</b>{run.spinsLeft === 0 ? ` · tithe ${due.toLocaleString()}⚡ is taken next` : ''})</span>:</div>
          <div className="ar-cards">
            {run.offer.map((id, k) => {
              const d = RUNE_MAP[id];
              const cost = run.prices[k] ?? 0;
              const poor = cost > run.power;
              // Buying on the last spin before the tithe must still leave enough to pay it.
              const risky = !poor && cost > 0 && run.spinsLeft === 0 && run.power - cost < due;
              return (
                <button key={id} className={`ar-card ${poor || risky ? 'off' : ''}`} style={{ ['--rc' as string]: RARITY_COLOR[d.rarity] }} disabled={poor || risky} onClick={() => pick(id)}>
                  <span className={`ar-price mono ${cost ? '' : 'free'}`}>{cost ? `${cost.toLocaleString()}⚡` : 'FREE'}</span>
                  <span className="ar-card-emoji">{d.emoji}</span>
                  <b>{d.name}</b>
                  <span className="ar-card-rar">{d.rarity} · ⚡{d.base}</span>
                  <span className="ar-card-text">{d.text}</span>
                  {(poor || risky) && <span className="ar-card-why">{poor ? `need ${cost.toLocaleString()}⚡` : 'you’d miss the tithe'}</span>}
                </button>
              );
            })}
          </div>
          <div className="ar-row">
            <button className="btn" disabled={run.rerolls <= 0} onClick={() => { if (reroll(run)) { sound.play('riffle'); commit(run); } }}>🔄 Reroll ({run.rerolls})</button>
            <button className="btn" onClick={() => pick(null)}>Skip</button>
          </div>
        </div>
      ) : run.altarOffer.length > 0 && !busy ? (
        <div className="ar-offer">
          <div className="small muted">🏛️ {run.altars.length ? 'The Ley Spirit is pleased — choose another altar:' : 'Choose your first altar:'}</div>
          <div className="ar-cards">
            {run.altarOffer.map((id) => {
              const a = ALTAR_MAP[id];
              return (
                <button key={id} className="ar-card ar-altar-card" onClick={() => { if (chooseAltar(run, id)) { sound.play('enchant'); game.vibrate(20); commit(run); } }}>
                  <span className="ar-card-emoji">{a.emoji}</span>
                  <b>{a.name}</b>
                  <span className="ar-card-text">{a.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="ar-row">
          <button className="btn" onClick={() => { sound.play('click'); setPouchOpen(true); }}>{run.cleanses > 0 ? `👝 ${run.pouch.length} · 🧹${run.cleanses}` : `👝 Pouch · ${run.pouch.length}`}</button>
          <button className="btn btn-hero ar-spin" disabled={busy} onClick={doSpin}>🌀 SPIN</button>
        </div>
      )}
      {!busy && canPayEarly(run) && (
        <button className="btn ar-early" onClick={moveOn}>
          ⏩ Pay the tithe now — skip {run.spinsLeft} spin{run.spinsLeft === 1 ? '' : 's'} <span className="tiny">(+{run.spinsLeft} 🔄)</span>
        </button>
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
