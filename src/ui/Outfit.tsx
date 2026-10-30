// 🧳 Outfit me (Gear screen): get every tool and armour piece for a town in one tap.
import { useMemo, useState } from 'react';
import { getItem, SLOT_LABELS } from '../data/items';
import { REGIONS, type Region } from '../data/tiers';
import { outfitCount, previewOutfit } from '../core/outfit';
import { game, useGame } from '../core/store';
import { ItemIcon } from './icons';
import { fmtNum } from './format';

const MARK = { ok: '✓', wear: '👕', make: '🔨', blocked: '🔒' } as const;

export function OutfitCard() {
  const { player } = useGame();
  const towns = REGIONS.filter((r) => player.regions.includes(r)) as Region[];
  const [pick, setPick] = useState<Region | null>(null);
  const [open, setOpen] = useState(false);
  const town = pick && towns.includes(pick) ? pick : towns[towns.length - 1];
  const tier = REGIONS.indexOf(town);
  // A dry run on a copy of your save shows exactly what one tap would do.
  const plan = useMemo(() => previewOutfit(player, tier), [player, tier]);
  const ready = outfitCount(plan);
  const blocked = plan.lines.filter((l) => l.status === 'blocked').length;
  const allSet = !ready && !blocked;

  return (
    <section className="card outfit">
      <h3>🧳 Outfit me</h3>
      <p className="small muted">Makes and puts on every tool, armour piece and a weapon for a town in one tap. Bars are smelted from your ore and materials come from your bag and bank.</p>
      {towns.length > 1 && (
        <div className="outfit-towns">
          {[...towns].reverse().map((r) => (
            <button key={r} className={`outfit-town ${r === town ? 'on' : ''}`} onClick={() => setPick(r)}>{r}</button>
          ))}
        </div>
      )}
      <p className="small outfit-sum">
        {allSet ? `✓ You're all set for ${town}.`
          : <>{ready > 0 && <b>{ready} piece{ready === 1 ? '' : 's'} ready</b>}{ready > 0 && blocked > 0 && ' · '}{blocked > 0 && <span className="muted">{blocked} not yet</span>}</>}
      </p>
      {plan.missing.length > 0 && (
        <p className="small outfit-missing">
          Still needed: {plan.missing.map((m) => (
            <span key={m.item} className="outfit-need"><ItemIcon id={m.item} size={16} /> {fmtNum(m.qty)} {getItem(m.item).name}</span>
          ))}
        </p>
      )}
      <div className="outfit-actions">
        <button className="btn btn-hero" disabled={!ready} onClick={() => game.outfit(tier)}>
          {ready ? `🧳 OUTFIT ME FOR ${town.toUpperCase()}` : 'Nothing to make yet'}
        </button>
        {!allSet && <button className="link-btn small" onClick={() => setOpen((o) => !o)}>{open ? 'Hide details' : 'Show each piece'}</button>}
      </div>
      {open && (
        <ul className="outfit-lines">
          {plan.lines.map((l) => (
            <li key={l.slot} className={`outfit-line ${l.status}`}>
              <span className="outfit-mark">{MARK[l.status]}</span>
              <ItemIcon id={l.item} size={26} />
              <span className="outfit-text">
                <b className="small">{getItem(l.item).name}</b>
                <span className="tiny muted">{SLOT_LABELS[l.slot]} · {l.note}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
