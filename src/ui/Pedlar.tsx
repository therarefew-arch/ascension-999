// 🧺 The Wandering Pedlar on the Town screen: his cart of sealed crates (when he's in your town),
// the 🍀 Pedlar's Favour meter, the ✨ Relics you've found, and the crate-prying moment itself.
// Rules live in market/pedlar.ts; this file only draws and plays sounds.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { sound } from '../audio/sound';
import { getItem, STAT_LABELS, type ItemStats } from '../data/items';
import { RELICS, RELIC_MAP } from '../data/relics';
import { REGIONS } from '../data/tiers';
import { SKILLS } from '../data/skills';
import { game, useGame } from '../core/store';
import {
  CRATES, CRATE_MAP, cratePrice, FAVOUR_MAX, pedlarHere, pedlarTomorrow, pedlarTown, whyCantOpen,
  type CrateKey, type CrateResult,
} from '../market/pedlar';
import { ItemIcon } from './icons';
import { canEquip } from '../core/equipment';

const fmt = (n: number) => n.toLocaleString();
/** Taps it takes to pry a crate open. */
const PRIES = 3;

export function PedlarCard() {
  const { player } = useGame();
  const [opening, setOpening] = useState<CrateKey | null>(null);
  const [showRelics, setShowRelics] = useState(false);
  const town = pedlarTown(player);
  const found = RELICS.filter((r) => player.relics[r.key] !== undefined);

  if (!pedlarHere(player)) {
    return (
      <div className="pd-sighting small">
        <span className="pd-emoji-s">🧺</span>
        <span>The Wandering Pedlar is in <b>{town}</b> today{player.regions.length > 1 ? <> · tomorrow: {pedlarTomorrow(player)}</> : null}.</span>
      </div>
    );
  }

  const tryOpen = (k: CrateKey) => {
    const why = whyCantOpen(player, k);
    if (why) { game.cant(why); return; }
    sound.play('thud', { volume: 0.6 });
    setOpening(k);
  };

  return (
    <section className="pd-card">
      <div className="pd-head">
        <span className="pd-emoji">🧺</span>
        <div className="grow">
          <h2 className="section-title">THE WANDERING PEDLAR</h2>
          <div className="small muted">A hooded trader with a creaky cart. “Sealed crates! No peeking, no refunds!” Here today — tomorrow he’s off to {pedlarTomorrow(player)}.</div>
        </div>
      </div>

      <div className="pd-favour" title="Every empty crate fills it. When it's full, your next crate is a good one — and Relics are 3× as likely.">
        <span className="small"><b>🍀 Pedlar’s Favour</b></span>
        <span className="pd-pips">{Array.from({ length: FAVOUR_MAX }, (_, i) => <i key={i} className={i < player.pedlar.favour ? 'on' : ''} />)}</span>
        <span className="small muted">{player.pedlar.favour >= FAVOUR_MAX ? 'Full! Your next crate is a good one.' : 'Empty crates fill it.'}</span>
      </div>

      <div className="pd-crates">
        {CRATES.map((c) => {
          const price = cratePrice(player, c.key);
          const afford = player.coins >= price;
          return (
            <button key={c.key} className={`pd-crate ${afford ? '' : 'poor'}`} onClick={() => tryOpen(c.key)}>
              <span className="pd-crate-emoji">{c.emoji}</span>
              <span className="grow"><b>{c.name}</b><span className="small muted">{c.blurb}</span></span>
              <span className="pd-price mono">🪙 {fmt(price)}</span>
            </button>
          );
        })}
      </div>

      <button className="pd-relic-toggle small" onClick={() => { sound.play('click', { volume: 0.5 }); setShowRelics((s) => !s); }}>
        ✨ Relics found: <b>{found.length}</b> of {RELICS.length} {showRelics ? '▲' : '▼'}
      </button>
      {showRelics && (
        <div className="pd-relics">
          {RELICS.map((r) => {
            const t = player.relics[r.key];
            return t === undefined ? (
              <div key={r.key} className="pd-relic unknown"><span className="pd-relic-emoji">❔</span><span className="grow small"><b>An unknown Relic</b><span className="muted">{r.trait}</span></span></div>
            ) : (
              <div key={r.key} className="pd-relic"><span className="pd-relic-emoji">{r.emoji}</span><span className="grow small"><b>{r.name}</b> <span className="dim">· {REGIONS[t]} strength</span><span className="muted">{r.trait}</span></span></div>
            );
          })}
          <p className="small dim">Find a Relic again in a farther town’s crate and it awakens to that town’s strength.</p>
        </div>
      )}

      {opening && <CrateOpening crate={opening} onClose={() => setOpening(null)} onAgain={(k) => setOpening(k)} />}
    </section>
  );
}

/** The crate on the ground: tap to pry it open (3 creaky taps), then see what's inside. */
function CrateOpening({ crate, onClose, onAgain }: { crate: CrateKey; onClose: () => void; onAgain: (k: CrateKey) => void }) {
  const { player } = useGame();
  const def = CRATE_MAP[crate];
  const [pries, setPries] = useState(0);
  const [result, setResult] = useState<CrateResult | null>(null);
  const [shake, setShake] = useState(0);
  const price = cratePrice(player, crate);

  const pry = () => {
    if (result) return;
    const n = pries + 1;
    setShake((s) => s + 1);
    if (n < PRIES) {
      sound.play('creak', { rate: 0.9 + n * 0.12, volume: 0.7 });
      game.vibrate(15);
      setPries(n);
      return;
    }
    const got = game.openCrate(crate);
    if (!got) { onClose(); return; }
    setPries(n);
    setResult(got);
    sound.play('creak', { rate: 1.3, volume: 0.6 });
    if (got.outcome === 'relic') { sound.play('levelup', { volume: 0.9 }); sound.play('enchant', { rate: 0.8, volume: 0.6 }); }
    else if (got.outcome === 'treasure') { sound.play('coin', { volume: 0.9 }); sound.play('match', { rate: 1.2, volume: 0.5 }); }
    else if (got.outcome === 'goods') sound.play('coin', { volume: 0.7 });
    else sound.play('whoosh', { volume: 0.5 });
  };

  const again = () => {
    const why = whyCantOpen(player, crate);
    if (why) { game.cant(why); return; }
    sound.play('thud', { volume: 0.6 });
    setPries(0); setResult(null); setShake(0);
    onAgain(crate);
  };

  return createPortal(
    <div className="pd-overlay" onClick={(e) => { if (e.target === e.currentTarget && (result || pries === 0)) onClose(); }}>
      <div className="pd-panel">
        {!result ? (
          <>
            <div className="pd-title">{def.emoji} {def.name}</div>
            <p className="small muted center">{fmt(price)} coins · {player.location}. Tap the crate to pry it open.</p>
            <button key={shake} className={`pd-big-crate ${shake ? 'shake' : ''}`} onClick={pry} aria-label="Pry the crate open">
              {def.emoji}
            </button>
            <div className="pd-pry-pips">{Array.from({ length: PRIES }, (_, i) => <i key={i} className={i < pries ? 'on' : ''} />)}</div>
            <p className="small dim center">{pries === 0 ? 'The coins are only paid when it opens.' : pries === 1 ? '…creak…' : '…CREEEAK…'}</p>
            <button className="btn btn-wide" onClick={onClose}>Not now</button>
          </>
        ) : (
          <Reveal r={result} onClose={onClose} onAgain={again} canAgain={!whyCantOpen(player, crate)} price={price} />
        )}
      </div>
    </div>,
    document.body,
  );
}

function statLine(stats: ItemStats) {
  return (Object.entries(stats) as [keyof ItemStats, number][]).map(([k, v]) => `+${v} ${STAT_LABELS[k]}`).join(' · ');
}

function Reveal({ r, onClose, onAgain, canAgain, price }: { r: CrateResult; onClose: () => void; onAgain: () => void; canAgain: boolean; price: number }) {
  const { player } = useGame();
  const items = r.loot.filter((s) => s.id !== 'coins');
  const coins = r.loot.find((s) => s.id === 'coins')?.qty ?? 0;
  const relicItem = r.relic ? getItem(r.relic.itemId) : null;
  const worn = relicItem ? Object.values(player.equipment).includes(relicItem.id) : false;
  return (
    <div className={`pd-reveal ${r.outcome}`}>
      {r.favourUsed && <div className="pd-favour-used small">🍀 The Pedlar winks. “For a loyal customer.”</div>}
      {r.outcome === 'relic' && relicItem && r.relic ? (
        <>
          <div className="pd-relic-glow">{RELIC_MAP[r.relic.key].emoji}</div>
          <div className="pd-title gold">{r.relic.awakened ? '✨ RELIC AWAKENED' : '✨ A RELIC!'}</div>
          <b className="center">{relicItem.name}</b>
          <p className="small center">{RELIC_MAP[r.relic.key].trait}.</p>
          <p className="small muted center"><i>{RELIC_MAP[r.relic.key].lore}</i></p>
          {relicItem.equip && <p className="small center mono">{statLine(relicItem.equip.stats)}{relicItem.equip.req ? ` · needs ${SKILLS[relicItem.equip.req.skill].name} ${relicItem.equip.req.level}` : ''}</p>}
          {!worn && !canEquip(player, relicItem) && <button className="btn btn-hero btn-wide" onClick={() => game.equip(relicItem.id)}>Equip it</button>}
          {!worn && canEquip(player, relicItem) && <p className="small center muted">{canEquip(player, relicItem)} to wear it. It's kept safe with your things until then.</p>}
          {worn && <p className="small center green">Worn{r.relic.awakened ? ' — and stronger now' : ''}.</p>}
        </>
      ) : (
        <>
          <div className="pd-title">{r.outcome === 'dud' ? '🌾 Nothing much…' : r.outcome === 'treasure' ? '💰 TREASURE!' : '📦 Good goods'}</div>
          <p className="small center">{r.line}</p>
          {(items.length > 0 || coins > 0) && (
            <div className="pd-loot">
              {items.map((s) => (
                <div key={s.id} className="pd-loot-row"><ItemIcon id={s.id} size={30} /><span className="grow">{getItem(s.id).name}</span><b className="mono">×{fmt(s.qty)}</b></div>
              ))}
              {coins > 0 && <div className="pd-loot-row"><span className="pd-coin">🪙</span><span className="grow">Coins</span><b className="mono gold">{fmt(coins)}</b></div>}
            </div>
          )}
          {r.outcome === 'dud' && <p className="small muted center">🍀 Pedlar’s Favour {player.pedlar.favour}/{FAVOUR_MAX}{player.pedlar.favour >= FAVOUR_MAX ? ' — your next crate is a good one!' : ''}</p>}
        </>
      )}
      {r.toBank && <p className="small center muted">Your bag was full, so some of it went to the bank.</p>}
      <div className="pd-btns">
        <button className="btn btn-lg" onClick={onClose}>Done</button>
        <button className="btn btn-primary btn-lg" disabled={!canAgain} onClick={onAgain}>Another · {fmt(price)}</button>
      </div>
    </div>
  );
}
