// 🃏 Spellcards — Enhancing's card minigame. Rules live in core/spellcards.ts.
import { useEffect, useReducer, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import {
  buyCharm, buyScroll, cast, CHARM_MAP, continueRun, ELEMENT_INFO, ENCHANT_INFO, ELEMENTS, isBossWard, isDeep, MAX_CHARMS, MAX_PLAY, newRun,
  nextWard, QUIRKS, redraw, rerollShop, scoreSpell, SCROLL_MAP, sellCharm, sellPrice, SPELL_ORDER, SPELLS, readScrollOn, wardSparks,
  wardTarget, WARDS, wardXp, type Card, type Cast, type Run,
} from '../core/spellcards';
import { skillLevel } from '../core/idle';
import { game, useGame } from '../core/store';
import { FeedbackLayer, useFeedback } from './Minigames';

/** The run in progress, per save slot. Kept while the app is open and on this device, so you can step away mid-run. */
let current: { slot: number | null; run: Run | null } = { slot: null, run: null };
const KEY = (slot: number | null) => `ui.spellcards.${slot ?? 0}`;
const BEST_KEY = (slot: number | null) => `ui.spellcards.best.${slot ?? 0}`;
function load(slot: number | null): Run | null {
  if (current.slot === slot) return current.run;
  let run: Run | null = null;
  try { const raw = localStorage.getItem(KEY(slot)); run = raw ? (JSON.parse(raw) as Run) : null; } catch { run = null; }
  current = { slot, run };
  return run;
}
function store(slot: number | null, run: Run | null) {
  current = { slot, run };
  try { if (run) localStorage.setItem(KEY(slot), JSON.stringify(run)); else localStorage.removeItem(KEY(slot)); } catch { /* ignore */ }
}
function readBest(slot: number | null): number { try { return Number(localStorage.getItem(BEST_KEY(slot))) || 0; } catch { return 0; } }
function writeBest(slot: number | null, n: number) { try { localStorage.setItem(BEST_KEY(slot), String(n)); } catch { /* ignore */ } }

const wardName = (w: number) => (isDeep(w) ? `🌀 Deep ward ${w + 1}` : `Ward ${w + 1}/${WARDS}`);
const bestText = (best: number) => (best > WARDS ? `deep ward ${best} 🌀` : best === WARDS ? 'all 6 wards! 🏆' : `ward ${best}`);

function RuneCard({ c, picked, onClick, dim, className = '' }: { c: Card; picked?: boolean; onClick?: () => void; dim?: boolean; className?: string }) {
  const e = ELEMENT_INFO[c.el];
  return (
    <button data-silent className={`sc-card ${picked ? 'picked' : ''} ${dim ? 'dim' : ''} ${className}`} style={{ ['--el' as string]: e.color }} onClick={onClick}
      aria-label={`${c.v} of ${e.name}${c.ench ? `, ${c.ench}` : ''}${picked ? ', picked' : ''}`}>
      <span className="sc-v">{c.v}</span>
      <span className="sc-el">{e.emoji}</span>
      {c.ench && <span className="sc-ench" title={ENCHANT_INFO[c.ench].text}>{ENCHANT_INFO[c.ench].emoji}</span>}
    </button>
  );
}

/** A number that rolls up from `from` to `to`. */
function CountUp({ from = 0, to, ms = 650 }: { from?: number; to: number; ms?: number }) {
  const [n, setN] = useState(from);
  useEffect(() => {
    // A plain timer (not animation frames), so it always lands on the right number.
    const t0 = Date.now();
    const id = window.setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      setN(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
      if (k >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [from, to, ms]);
  return <>{n.toLocaleString()}</>;
}

/** The spell being tallied: the cast cards, then each beat of the count, then the big total. */
interface Tally { cards: Card[]; res: Cast; before: number; step: number; wardBefore: number; target: number }
/** How long each beat of the tally lasts (ms). */
const beatMs = (res: Cast, i: number) => (i >= res.steps.length ? 1100 : res.steps[i].kind === 'spell' ? 520 : res.steps[i].mult ? 560 : 330);

export function Spellcards() {
  const { player, slot } = useGame();
  const { items, push } = useFeedback();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [picked, setPicked] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'element'>('value');
  const [info, setInfo] = useState<string | null>(null);
  const [showSpells, setShowSpells] = useState(false);
  const [giveUp, setGiveUp] = useState(false);
  const [tally, setTally] = useState<Tally | null>(null);
  const run = load(slot);
  const best = readBest(slot);
  const lvl = skillLevel(player, 'enhancing');
  /** A ward broken during the tally whose XP hasn't been given yet (given at the end, or if you leave early). */
  const owed = useRef<{ run: Run; ward: number } | null>(null);

  const commit = (r: Run | null) => { store(slot, r); bump(); };

  /** Hands out the XP for a broken ward. Safe to call twice. */
  const payOwed = () => {
    const o = owed.current;
    if (!o) return null;
    owed.current = null;
    const xp = game.spellcardsWard(o.ward);
    o.run.xp.enhancing += xp.enhancing;
    o.run.xp.magic += xp.magic;
    if (o.ward + 1 > readBest(slot)) writeBest(slot, o.ward + 1);
    store(slot, o.run);
    return xp;
  };

  // A calm card-table tune while you play. Leaving mid-tally still gives the ward's XP.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_mahjong');
    return () => { payOwed(); sound.playMusic(musicFor(town)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [town]);

  // ----- The tally: one beat at a time, each with its own sound -----
  useEffect(() => {
    if (!tally) return;
    const { res, step } = tally;
    const s = res.steps[step];
    if (s) {
      if (s.kind === 'spell') sound.play('rune', { rate: 0.85, volume: 0.8 });
      else if (s.kind === 'card') {
        const n = res.steps.slice(0, step).filter((x) => x.kind === 'card').length;
        if (s.text === 'fizzles') sound.play('whoosh', { rate: 0.9, volume: 0.6 });
        else sound.play('tick', { rate: 1 + n * 0.09, volume: 0.8 });
      } else if (s.mult) sound.play('boom', { rate: 0.9 + Math.min(0.4, step * 0.03), volume: 0.85 });
      else sound.play('coin', { rate: 1.25, volume: 0.6 });
    } else {
      // The total: a bigger chime for a bigger spell.
      const big = res.total >= tally.target - tally.before;
      sound.play(big ? 'boom' : 'enchant', { rate: big ? 1.1 : 1, volume: 0.8 });
      sound.play('rune', { rate: 1 + Math.min(0.9, res.total / 2500), volume: 0.7 });
    }
    const t = window.setTimeout(() => {
      if (step < res.steps.length) setTally({ ...tally, step: step + 1 });
      else finishTally();
    }, beatMs(res, step));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tally]);

  const finishTally = () => {
    if (!tally || !run) { setTally(null); return; }
    const { res } = tally;
    setTally(null);
    const xp = payOwed();
    if (xp) {
      sound.play('levelup', { volume: 0.75 });
      push(`Ward broken! +${xp.enhancing.toLocaleString()} Enhancing · +${xp.magic.toLocaleString()} Magic`, 'combo');
    } else if (run.phase === 'lost') {
      sound.play('fail', { volume: 0.6 });
    } else {
      push(`${SPELLS[res.spell].name} · +${res.total.toLocaleString()}`, 'good');
      dealSounds(Math.min(5, tally.cards.length));
    }
    commit(run);
  };

  /** A few card flicks, as new cards are dealt. */
  const dealSounds = (n: number) => {
    for (let i = 0; i < n; i++) window.setTimeout(() => sound.play('card', { rate: 0.9 + Math.random() * 0.25, volume: 0.7 }), 60 + i * 70);
  };

  const begin = () => { sound.play('enchant', { volume: 0.7 }); dealSounds(5); setPicked([]); commit(newRun()); };

  if (!run) {
    return (
      <div className="mg">
        <div className="sc-intro">
          <div className="sc-intro-cards" aria-hidden="true">
            {ELEMENTS.map((el, i) => <RuneCard key={el} c={{ id: i, el, v: [7, 7, 9, 10][i] }} />)}
          </div>
          <h3>🃏 Spellcards</h3>
          <p className="small">Cast poker hands as spells to beat <b>{WARDS} wards</b>. Score = <b>Essence × Power</b>. Between wards, spend sparks on <b>Charms</b> that boost every spell and <b>Scrolls</b> that enchant your cards. Brave enough? Carry on into the endless <b>Deep Wards</b>.</p>
          <p className="small muted">Every ward you beat gives Enhancing + Magic XP (ward 1 at your level: {wardXp(lvl, 0).enhancing.toLocaleString()} + {wardXp(lvl, 0).magic.toLocaleString()}). No bars, no gear — losing just ends the run.{best ? ` Your best: ${bestText(best)}.` : ''}</p>
          <button className="btn btn-hero btn-lg btn-wide" onClick={begin}>✨ Begin a run</button>
        </div>
      </div>
    );
  }

  const target = wardTarget(run.ward);
  const pickedCards = run.hand.filter((c) => picked.includes(c.id));
  const preview = pickedCards.length && !tally ? scoreSpell(run, pickedCards, () => 0.5) : null;
  const hand = [...run.hand].sort((a, b) => (sortBy === 'value' ? b.v - a.v || ELEMENTS.indexOf(a.el) - ELEMENTS.indexOf(b.el) : ELEMENTS.indexOf(a.el) - ELEMENTS.indexOf(b.el) || b.v - a.v));

  const toggle = (id: number) => {
    if (tally) return;
    setPicked((p) => {
      if (p.includes(id)) { sound.play('card', { rate: 0.85, volume: 0.6 }); return p.filter((x) => x !== id); }
      if (p.length >= MAX_PLAY) { sound.play('whoosh', { volume: 0.4 }); return p; }
      sound.play('card', { rate: 1.1 + p.length * 0.05, volume: 0.75 });
      return [...p, id];
    });
  };

  const doCast = () => {
    if (tally) return;
    const wardBefore = run.ward;
    const before = run.score;
    const cards = run.hand.filter((c) => picked.includes(c.id));
    const res = cast(run, picked);
    if (typeof res === 'string') { push(res, 'miss'); return; }
    setPicked([]);
    if (run.phase === 'shop' || run.phase === 'won') owed.current = { run, ward: wardBefore };
    store(slot, run); // saved straight away; the tally is just the show
    setTally({ cards, res, before, step: 0, wardBefore, target });
  };

  const skipTally = () => {
    if (!tally) return;
    if (tally.step < tally.res.steps.length) setTally({ ...tally, step: tally.res.steps.length });
    else finishTally();
  };

  const doRedraw = () => {
    const swapped = run.hand.length - picked.length;
    const why = redraw(run, picked);
    if (why) { push(why, 'miss'); return; }
    sound.play('whoosh', { rate: 1.3, volume: 0.5 });
    dealSounds(Math.min(6, swapped));
    commit(run);
  };

  const readScroll = (i: number) => {
    const why = readScrollOn(run, i, picked);
    if (why) { push(why, 'miss'); return; }
    sound.play('enchant', { rate: 1.1 });
    push('The cards shimmer — changed for the rest of the run', 'perfect');
    commit(run);
  };

  // ----- Six wards broken: finish, or carry on into the Deep Wards -----
  if (run.phase === 'won' && !tally) {
    const next = wardXp(lvl, run.ward + 1);
    return (
      <div className="mg">
        <div className="sc-intro sc-won">
          <h3>🏆 All six wards broken!</h3>
          <p className="small">A masterful run. So far: <b className="gold">+{run.xp.enhancing.toLocaleString()} Enhancing</b> · <b className="gold">+{run.xp.magic.toLocaleString()} Magic XP</b></p>
          <p className="small">Below the last ward, the <b>Deep Wards</b> stir — each one harder than the last, and each worth more XP. The next needs <b className="mono">{wardTarget(run.ward + 1).toLocaleString()}</b> and gives <b>{next.enhancing.toLocaleString()} + {next.magic.toLocaleString()} XP</b>. Your charms, scrolls and enchanted cards come with you.</p>
          <button className="btn btn-hero btn-lg btn-wide" onClick={() => { continueRun(run); sound.play('boom', { rate: 0.8, volume: 0.7 }); commit(run); }}>🌀 Into the Deep Wards</button>
          <button className="btn btn-lg btn-wide" onClick={begin}>✨ Finish & start a new run</button>
        </div>
        <FeedbackLayer items={items} />
      </div>
    );
  }

  // ----- Run over -----
  if (run.phase === 'lost' && !tally) {
    const deep = isDeep(run.ward);
    return (
      <div className="mg">
        <div className="sc-intro">
          <h3>{deep ? '🌀 The deep closes in' : '💨 The ward held'}</h3>
          <p className="small">You scored {run.score.toLocaleString()} of {target.toLocaleString()} on {deep ? `deep ward ${run.ward + 1}` : `ward ${run.ward + 1}`}. Wards beaten: <b>{run.ward}</b>{deep ? ' 🏆' : `/${WARDS}`}.</p>
          <p className="small">This run: <b className="gold">+{run.xp.enhancing.toLocaleString()} Enhancing</b> · <b className="gold">+{run.xp.magic.toLocaleString()} Magic XP</b></p>
          {run.best && <p className="small muted">Best spell: {SPELLS[run.best.spell].name} for {run.best.total.toLocaleString()}</p>}
          <button className="btn btn-hero btn-lg btn-wide" onClick={begin}>✨ New run</button>
        </div>
        <FeedbackLayer items={items} />
      </div>
    );
  }

  // ----- The Enchanter's shop -----
  if (run.phase === 'shop' && !tally) {
    const nextW = run.ward + 1;
    const nextXp = wardXp(lvl, nextW);
    return (
      <div className="mg">
        <div className="sc-shop">
          <div className="row-between">
            <h3>🧙 The Enchanter</h3>
            <span className="sc-sparks">✨ {run.sparks}</span>
          </div>
          <p className="small muted">{isDeep(run.ward) ? `Deep ward ${run.ward + 1}` : `Ward ${run.ward + 1}`} broken! Next: {isDeep(nextW) ? 'deep ' : ''}ward {nextW + 1} needs <b className="mono">{wardTarget(nextW).toLocaleString()}</b>{isBossWard(nextW) ? ' (a tricky one)' : ''} · worth {nextXp.enhancing.toLocaleString()} + {nextXp.magic.toLocaleString()} XP.</p>
          <h4>Charms <span className="small muted">({run.charms.length}/{MAX_CHARMS})</span></h4>
          {run.shop.charms.length === 0 && <p className="small dim">Sold out — try a reroll.</p>}
          {run.shop.charms.map((id) => {
            const c = CHARM_MAP[id];
            return (
              <div key={id} className="sc-offer">
                <span className="sc-offer-emoji">{c.emoji}</span>
                <div className="grow"><b>{c.name}</b><div className="small muted">{c.text}</div></div>
                <button className="btn btn-primary btn-sm" disabled={run.sparks < c.cost || run.charms.length >= MAX_CHARMS}
                  onClick={() => { const why = buyCharm(run, id); if (why) push(why, 'miss'); else { sound.play('coin'); commit(run); } }}>✨ {c.cost}</button>
              </div>
            );
          })}
          <h4>Scrolls <span className="small muted">({run.scrolls.length}/2 · read them during a ward on cards you pick)</span></h4>
          {run.shop.scrolls.map((id) => {
            const s = SCROLL_MAP[id];
            return (
              <div key={id} className="sc-offer">
                <span className="sc-offer-emoji">{s.emoji}</span>
                <div className="grow"><b>{s.name}</b><div className="small muted">{s.text}</div></div>
                <button className="btn btn-primary btn-sm" disabled={run.sparks < s.cost || run.scrolls.length >= 2}
                  onClick={() => { const why = buyScroll(run, id); if (why) push(why, 'miss'); else { sound.play('coin'); commit(run); } }}>✨ {s.cost}</button>
              </div>
            );
          })}
          {run.charms.length > 0 && (
            <>
              <h4>Your charms <span className="small muted">(tap to sell)</span></h4>
              <div className="sc-charms">
                {run.charms.map((id) => (
                  <button key={id} className="sc-charm" title={CHARM_MAP[id].text} onClick={() => { sellCharm(run, id); sound.play('coin', { rate: 0.8 }); commit(run); }}>
                    {CHARM_MAP[id].emoji} <span className="small">sell ✨{sellPrice(id)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="btn-pair">
            <button className="btn btn-lg" disabled={run.sparks < run.shop.rerollCost} onClick={() => { const why = rerollShop(run); if (why) push(why, 'miss'); else { sound.play('card'); sound.play('tile', { volume: 0.5 }); commit(run); } }}>🎲 Reroll ✨{run.shop.rerollCost}</button>
            <button className="btn btn-hero btn-lg" onClick={() => { nextWard(run); setPicked([]); sound.play('enchant', { volume: 0.6 }); dealSounds(5); commit(run); }}>Next ward ▶</button>
          </div>
          <p className="small dim">Sparks: 3 per ward + 1 per cast left + 1 for every 5 you save (up to +5).</p>
        </div>
        <FeedbackLayer items={items} />
      </div>
    );
  }

  // ----- Playing a ward (and the tally after each cast) -----
  const quirk = run.quirk ? QUIRKS[run.quirk] : null;
  const t = tally;
  const beat = t ? t.res.steps[Math.min(t.step, t.res.steps.length - 1)] : null;
  const atTotal = !!t && t.step >= t.res.steps.length;
  const shownScore = t ? t.before : run.score;
  const activeCard = t && beat?.kind === 'card' && !atTotal ? beat.cardId : null;
  const activeCharm = t && beat?.kind === 'charm' && !atTotal ? beat.charm : null;
  const doneCards = new Set(t ? t.res.steps.slice(0, t.step + 1).filter((s) => s.kind === 'card').map((s) => s.cardId) : []);
  const barPct = (n: number) => Math.min(100, (n / target) * 100);
  const keeping = picked.length > 0;

  return (
    <div className="mg sc-play">
      <div className="sc-top">
        <div className="row-between">
          <b>{wardName(run.ward)}{quirk ? ` · ${quirk.name}` : ''}</b>
          <span className="sc-sparks">✨ {run.sparks}</span>
        </div>
        {quirk && <div className="small sc-quirk">⚠️ {quirk.text}</div>}
        <div className="bar sc-bar">
          <div className="bar-fill tone-gold" style={{ width: `${barPct(atTotal && t ? t.before + t.res.total : shownScore)}%` }} />
        </div>
        <div className="row-between small mono">
          <span>{atTotal && t ? <CountUp from={t.before} to={t.before + t.res.total} ms={800} /> : shownScore.toLocaleString()}&nbsp;/&nbsp;{target.toLocaleString()}</span>
          <span title={`${run.casts} casts and ${run.redraws} redraws left`}>🔮 {run.casts} · ♻️ {run.redraws}</span>
        </div>
      </div>

      {(run.charms.length > 0 || run.scrolls.length > 0) && (
        <div className="sc-charms">
          {run.charms.map((id) => (
            <button key={id} className={`sc-charm ${activeCharm === id ? 'fire' : ''}`} onClick={() => setInfo(info === id ? null : id)} aria-label={CHARM_MAP[id].name}>
              {CHARM_MAP[id].emoji}
              {activeCharm === id && beat && <span className="sc-pop" key={t?.step}>{beat.text}</span>}
            </button>
          ))}
          {run.scrolls.map((id, i) => (
            <button key={`${id}${i}`} className="sc-charm scroll" onClick={() => readScroll(i)} disabled={!picked.length || !!t} title={SCROLL_MAP[id].text}>
              {SCROLL_MAP[id].emoji} <span className="small">{SCROLL_MAP[id].name}</span>
            </button>
          ))}
        </div>
      )}
      {info && !t && CHARM_MAP[info as keyof typeof CHARM_MAP] && <p className="small sc-info">{CHARM_MAP[info as keyof typeof CHARM_MAP].emoji} <b>{CHARM_MAP[info as keyof typeof CHARM_MAP].name}:</b> {CHARM_MAP[info as keyof typeof CHARM_MAP].text}</p>}

      {t ? (
        // The tally. Tap to skip ahead.
        <button className={`sc-stage ${atTotal && t.res.total >= t.target - t.before ? 'breaks' : ''}`} onClick={skipTally} aria-label="Skip the tally">
          <div className="sc-cast-row">
            {t.cards.map((c) => {
              const scoring = t.res.scoring.some((s) => s.id === c.id);
              return (
                <div key={c.id} className="sc-cast-slot">
                  <RuneCard c={c} className={`${scoring ? 'scoring' : 'idle'} ${doneCards.has(c.id) ? 'counted' : ''} ${activeCard === c.id ? 'hit' : ''}`} />
                  {activeCard === c.id && beat && <span className="sc-pop" key={t.step}>{beat.text}</span>}
                </div>
              );
            })}
          </div>
          <div className="sc-spellname">{SPELLS[t.res.spell].name}</div>
          <div className="sc-ep mono">
            <span className="sc-ess" key={`e${beat?.essence}`}>{atTotal ? t.res.essence : beat?.essence}</span>
            <span className="sc-x">×</span>
            <span className={`sc-pow ${beat?.mult && !atTotal ? 'mult' : ''}`} key={`p${beat?.power}`}>{atTotal ? t.res.power : beat?.power}</span>
          </div>
          <div className="sc-total mono">{atTotal ? <>= <CountUp to={t.res.total} ms={700} /></> : ' '}</div>
          <span className="sc-skip small dim">tap to skip</span>
        </button>
      ) : (
        <div className="sc-preview">
          {preview
            ? <><b>{SPELLS[preview.spell].name}</b> <span className="mono">{preview.essence} × {preview.power}{run.charms.includes('clover') ? '+🍀' : ''} = <b className="gold">{preview.total.toLocaleString()}</b></span></>
            : <span className="muted">Pick up to {MAX_PLAY} cards to cast — or pick the ones to keep and redraw the rest</span>}
          <FeedbackLayer items={items} />
        </div>
      )}

      <div className={`sc-hand ${t ? 'busy' : ''}`}>
        {hand.map((c) => {
          const scoring = preview?.scoring.some((s) => s.id === c.id);
          return <RuneCard key={c.id} c={c} className="dealt" picked={picked.includes(c.id)} dim={!!preview && picked.includes(c.id) && !scoring} onClick={() => toggle(c.id)} />;
        })}
      </div>

      <div className="btn-pair">
        <button className="btn btn-lg" disabled={!!t || run.redraws <= 0 || picked.length >= run.hand.length} onClick={doRedraw}
          title={keeping ? 'Keep the picked cards and swap the rest' : 'Swap your whole hand'}>
          ♻️ {keeping ? `Keep ${picked.length}, redraw` : 'Redraw all'}
        </button>
        <button className="btn btn-hero btn-lg" disabled={!picked.length || !!t} onClick={doCast}>✨ Cast</button>
      </div>
      <div className="sc-tools">
        <button className="btn btn-sm" onClick={() => setSortBy(sortBy === 'value' ? 'element' : 'value')}>Sort: {sortBy === 'value' ? 'number' : 'element'}</button>
        <button className="btn btn-sm" onClick={() => setShowSpells((s) => !s)}>📖 Spells</button>
        <button className="btn btn-sm" disabled={!!t} onClick={() => { if (giveUp) { setGiveUp(false); commit(null); } else setGiveUp(true); }}>{giveUp ? 'Tap again to give up' : 'Give up'}</button>
      </div>
      {showSpells && (
        <div className="sc-spells">
          {SPELL_ORDER.map((id) => (
            <div key={id} className="row-between small"><span><b>{SPELLS[id].name}</b> <span className="muted">{SPELLS[id].how}</span></span><span className="mono">{SPELLS[id].essence} × {SPELLS[id].power}</span></div>
          ))}
          <p className="small dim">Only the cards that make the spell add their number to Essence. Redraw keeps the cards you've picked and swaps the rest. Sparks after a ward: {wardSparks(run)} if you win now.</p>
        </div>
      )}
    </div>
  );
}
