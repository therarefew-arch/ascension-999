// 🃏 Spellcards — Enhancing's card minigame. Rules live in core/spellcards.ts.
import { useEffect, useReducer, useState } from 'react';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import {
  buyCharm, buyScroll, cast, CHARM_MAP, ELEMENT_INFO, ENCHANT_INFO, ELEMENTS, MAX_CHARMS, MAX_PLAY, newRun, nextWard, QUIRKS, redraw,
  rerollShop, scoreSpell, SCROLL_MAP, sellCharm, sellPrice, SPELL_ORDER, SPELLS, readScrollOn, WARD_TARGETS, wardSparks, WARDS, wardXp,
  type Card, type Run,
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

function RuneCard({ c, picked, onClick, dim }: { c: Card; picked?: boolean; onClick?: () => void; dim?: boolean }) {
  const e = ELEMENT_INFO[c.el];
  return (
    <button data-silent className={`sc-card ${picked ? 'picked' : ''} ${dim ? 'dim' : ''}`} style={{ ['--el' as string]: e.color }} onClick={onClick}
      aria-label={`${c.v} of ${e.name}${c.ench ? `, ${c.ench}` : ''}${picked ? ', picked' : ''}`}>
      <span className="sc-v">{c.v}</span>
      <span className="sc-el">{e.emoji}</span>
      {c.ench && <span className="sc-ench" title={ENCHANT_INFO[c.ench].text}>{ENCHANT_INFO[c.ench].emoji}</span>}
    </button>
  );
}

export function Spellcards() {
  const { player, slot } = useGame();
  const { items, push } = useFeedback();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [picked, setPicked] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'value' | 'element'>('value');
  const [info, setInfo] = useState<string | null>(null);
  const [showSpells, setShowSpells] = useState(false);
  const [giveUp, setGiveUp] = useState(false);
  const run = load(slot);
  const best = readBest(slot);
  const lvl = skillLevel(player, 'enhancing');

  // A calm card-table tune while you play.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_mahjong');
    return () => sound.playMusic(musicFor(town));
  }, [town]);

  const commit = (r: Run | null) => { store(slot, r); bump(); };

  const begin = () => { sound.play('enchant', { volume: 0.7 }); setPicked([]); commit(newRun()); };

  if (!run) {
    return (
      <div className="mg">
        <div className="sc-intro">
          <div className="sc-intro-cards" aria-hidden="true">
            {ELEMENTS.map((el, i) => <RuneCard key={el} c={{ id: i, el, v: [7, 7, 9, 10][i] }} />)}
          </div>
          <h3>🃏 Spellcards</h3>
          <p className="small">Cast poker hands as spells to beat <b>{WARDS} wards</b>. Score = <b>Essence × Power</b>. Between wards, spend sparks on <b>Charms</b> that boost every spell and <b>Scrolls</b> that enchant your cards.</p>
          <p className="small muted">Every ward you beat gives Enhancing + Magic XP (ward 1 at your level: {wardXp(lvl, 0).enhancing.toLocaleString()} + {wardXp(lvl, 0).magic.toLocaleString()}). No bars, no gear — losing just ends the run.{best ? ` Your best: ${best >= WARDS ? 'all 6 wards! 🏆' : `ward ${best}`}.` : ''}</p>
          <button className="btn btn-hero btn-lg btn-wide" onClick={begin}>✨ Begin a run</button>
        </div>
      </div>
    );
  }

  const target = WARD_TARGETS[run.ward];
  const pickedCards = run.hand.filter((c) => picked.includes(c.id));
  const preview = pickedCards.length ? scoreSpell(run, pickedCards, () => 0.5) : null;
  const hand = [...run.hand].sort((a, b) => (sortBy === 'value' ? b.v - a.v || ELEMENTS.indexOf(a.el) - ELEMENTS.indexOf(b.el) : ELEMENTS.indexOf(a.el) - ELEMENTS.indexOf(b.el) || b.v - a.v));

  const toggle = (id: number) => {
    setPicked((p) => {
      if (p.includes(id)) { sound.play('tile', { rate: 0.85, volume: 0.5 }); return p.filter((x) => x !== id); }
      if (p.length >= MAX_PLAY) return p;
      sound.play('tile', { rate: 1.15, volume: 0.6 });
      return [...p, id];
    });
  };

  const doCast = () => {
    const wardBefore = run.ward;
    const res = cast(run, picked);
    if (typeof res === 'string') { push(res, 'miss'); return; }
    setPicked([]);
    sound.play('rune', { rate: 0.9 + Math.min(0.8, res.total / 1500), volume: 0.85 });
    push(`${SPELLS[res.spell].name}!  ${res.essence} × ${res.power} = ${res.total.toLocaleString()}`, res.total >= target / 2 ? 'combo' : 'good');
    if (run.phase === 'shop' || run.phase === 'won') {
      const xp = game.spellcardsWard(wardBefore);
      run.xp.enhancing += xp.enhancing;
      run.xp.magic += xp.magic;
      sound.play('levelup', { volume: 0.7 });
      if (wardBefore + 1 > best) writeBest(slot, wardBefore + 1);
    } else if (run.phase === 'lost') {
      sound.play('whoosh', { rate: 0.7 });
    }
    commit(run);
  };

  const doRedraw = () => {
    const why = redraw(run, picked);
    if (why) { push(why, 'miss'); return; }
    sound.play('whoosh', { rate: 1.3, volume: 0.5 });
    setPicked([]);
    commit(run);
  };

  const readScroll = (i: number) => {
    const why = readScrollOn(run, i, picked);
    if (why) { push(why, 'miss'); return; }
    sound.play('enchant', { rate: 1.1 });
    push('The cards shimmer — changed for the rest of the run', 'perfect');
    commit(run);
  };

  // ----- Run over -----
  if (run.phase === 'won' || run.phase === 'lost') {
    const cleared = run.phase === 'won' ? WARDS : run.ward;
    return (
      <div className="mg">
        <div className="sc-intro">
          <h3>{run.phase === 'won' ? '🏆 Every ward broken!' : '💨 The ward held'}</h3>
          <p className="small">{run.phase === 'won' ? 'A masterful run.' : `You scored ${run.score.toLocaleString()} of ${target.toLocaleString()} on ward ${run.ward + 1}.`} Wards beaten: <b>{cleared}/{WARDS}</b>.</p>
          <p className="small">This run: <b className="gold">+{run.xp.enhancing.toLocaleString()} Enhancing</b> · <b className="gold">+{run.xp.magic.toLocaleString()} Magic XP</b></p>
          {run.best && <p className="small muted">Best spell: {SPELLS[run.best.spell].name} for {run.best.total.toLocaleString()}</p>}
          <button className="btn btn-hero btn-lg btn-wide" onClick={begin}>✨ New run</button>
        </div>
        <FeedbackLayer items={items} />
      </div>
    );
  }

  // ----- The Enchanter's shop -----
  if (run.phase === 'shop') {
    return (
      <div className="mg">
        <div className="sc-shop">
          <div className="row-between">
            <h3>🧙 The Enchanter</h3>
            <span className="sc-sparks">✨ {run.sparks}</span>
          </div>
          <p className="small muted">Ward {run.ward + 1} broken! Next: ward {run.ward + 2} needs {WARD_TARGETS[run.ward + 1].toLocaleString()}{[2, 5].includes(run.ward + 1) ? ' (a tricky one)' : ''}.</p>
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
            <button className="btn btn-lg" disabled={run.sparks < run.shop.rerollCost} onClick={() => { const why = rerollShop(run); if (why) push(why, 'miss'); else { sound.play('tile'); commit(run); } }}>🎲 Reroll ✨{run.shop.rerollCost}</button>
            <button className="btn btn-hero btn-lg" onClick={() => { nextWard(run); setPicked([]); sound.play('enchant', { volume: 0.6 }); commit(run); }}>Next ward ▶</button>
          </div>
          <p className="small dim">Sparks: 3 per ward + 1 per cast left + 1 for every 5 you save (up to +5).</p>
        </div>
        <FeedbackLayer items={items} />
      </div>
    );
  }

  // ----- Playing a ward -----
  const quirk = run.quirk ? QUIRKS[run.quirk] : null;
  return (
    <div className="mg sc-play">
      <div className="sc-top">
        <div className="row-between">
          <b>Ward {run.ward + 1}/{WARDS}{quirk ? ` · ${quirk.name}` : ''}</b>
          <span className="sc-sparks">✨ {run.sparks}</span>
        </div>
        {quirk && <div className="small sc-quirk">⚠️ {quirk.text}</div>}
        <div className="bar"><div className="bar-fill tone-gold" style={{ width: `${Math.min(100, (run.score / target) * 100)}%` }} /></div>
        <div className="row-between small mono">
          <span>{run.score.toLocaleString()}&nbsp;/&nbsp;{target.toLocaleString()}</span>
          <span title={`${run.casts} casts and ${run.redraws} redraws left`}>🔮 {run.casts} · ♻️ {run.redraws}</span>
        </div>
      </div>

      {(run.charms.length > 0 || run.scrolls.length > 0) && (
        <div className="sc-charms">
          {run.charms.map((id) => (
            <button key={id} className="sc-charm" onClick={() => setInfo(info === id ? null : id)} aria-label={CHARM_MAP[id].name}>{CHARM_MAP[id].emoji}</button>
          ))}
          {run.scrolls.map((id, i) => (
            <button key={`${id}${i}`} className="sc-charm scroll" onClick={() => readScroll(i)} disabled={!picked.length} title={SCROLL_MAP[id].text}>
              {SCROLL_MAP[id].emoji} <span className="small">{SCROLL_MAP[id].name}</span>
            </button>
          ))}
        </div>
      )}
      {info && CHARM_MAP[info as keyof typeof CHARM_MAP] && <p className="small sc-info">{CHARM_MAP[info as keyof typeof CHARM_MAP].emoji} <b>{CHARM_MAP[info as keyof typeof CHARM_MAP].name}:</b> {CHARM_MAP[info as keyof typeof CHARM_MAP].text}</p>}
      {run.scrolls.length > 0 && !picked.length && <p className="small dim center">Pick cards, then tap a scroll to read it on them.</p>}

      <div className="sc-preview">
        {preview
          ? <><b>{SPELLS[preview.spell].name}</b> <span className="mono">{preview.essence} × {preview.power}{run.charms.includes('clover') ? '+🍀' : ''} = <b className="gold">{preview.total.toLocaleString()}</b></span></>
          : <span className="muted">Pick up to {MAX_PLAY} cards to cast a spell</span>}
        <FeedbackLayer items={items} />
      </div>

      <div className="sc-hand">
        {hand.map((c) => {
          const scoring = preview?.scoring.some((s) => s.id === c.id);
          return <RuneCard key={c.id} c={c} picked={picked.includes(c.id)} dim={!!preview && picked.includes(c.id) && !scoring} onClick={() => toggle(c.id)} />;
        })}
      </div>

      <div className="btn-pair">
        <button className="btn btn-lg" disabled={!picked.length || run.redraws <= 0} onClick={doRedraw}>♻️ Redraw</button>
        <button className="btn btn-hero btn-lg" disabled={!picked.length} onClick={doCast}>✨ Cast</button>
      </div>
      <div className="sc-tools">
        <button className="btn btn-sm" onClick={() => setSortBy(sortBy === 'value' ? 'element' : 'value')}>Sort: {sortBy === 'value' ? 'number' : 'element'}</button>
        <button className="btn btn-sm" onClick={() => setShowSpells((s) => !s)}>📖 Spells</button>
        <button className="btn btn-sm" onClick={() => { if (giveUp) { setGiveUp(false); commit(null); } else setGiveUp(true); }}>{giveUp ? 'Tap again to give up' : 'Give up'}</button>
      </div>
      {showSpells && (
        <div className="sc-spells">
          {SPELL_ORDER.map((id) => (
            <div key={id} className="row-between small"><span><b>{SPELLS[id].name}</b> <span className="muted">{SPELLS[id].how}</span></span><span className="mono">{SPELLS[id].essence} × {SPELLS[id].power}</span></div>
          ))}
          <p className="small dim">Only the cards that make the spell add their number to Essence. Sparks after a ward: {wardSparks(run)} if you win now.</p>
        </div>
      )}
    </div>
  );
}
