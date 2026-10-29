// ✨ The Starforge (Gear screen) and the reforge panel (item details + worn gear).
import { useState } from 'react';
import {
  ASC_BASES, ASCENSION_LEVEL, BONUSES, BREAK_VALUE, CRAFT_COST, reforgeCost, TOWN_BONUS, townBonusFor, townBonusName, type BonusKey,
} from '../data/ascended';
import { REGIONS } from '../data/tiers';
import { getItem } from '../data/items';
import { SKILLS } from '../data/skills';
import { game, useGame } from '../core/store';
import { spareFine, whyCantCraft, type ForgePlace } from '../core/starforge';
import { levelForXp } from '../core/xp';
import { ItemIcon } from './icons';
import { fmtNum } from './format';

/** Whether the Ascension has started for this player (any skill 750+, or Starlight / Ascended items already). */
export function useAscensionOpen(): boolean {
  const { player } = useGame();
  return player.starlight > 0 || Object.values(player.skills).some((s) => levelForXp(s.xp) >= ASCENSION_LEVEL);
}

export function StarforgeCard() {
  const { player } = useGame();
  const open = useAscensionOpen();
  const [made, setMade] = useState<string | null>(null);
  const [crafting, setCrafting] = useState(false);
  if (!open) return null;
  const fine = spareFine(player).reduce((n, f) => n + f.qty, 0);
  return (
    <section className="card starforge">
      <div className="row-between">
        <h3 className="sf-title">✨ THE STARFORGE</h3>
        <span className="sf-balance">✨ <b>{fmtNum(player.starlight)}</b></span>
      </div>
      <p className="small muted">
        Starlight drifts down while you work at level {ASCENSION_LEVEL}+, and comes from breaking Ascended items down.
        Spend it to craft an Ascended item for the slot you want, or to reforge one (tap an item to reforge it).
      </p>
      {(() => {
        const town = Math.max(0, REGIONS.indexOf(player.location));
        const tb = TOWN_BONUS[town];
        return tb && (
          <p className="small sf-town">
            🗺️ Crafted here in {player.location}, items can roll <b>{townBonusName(tb)}</b>: {BONUSES[tb].text(BONUSES[tb].max, 'that skill').split(': ')[1].replace(String(BONUSES[tb].max), `${BONUSES[tb].min}–${BONUSES[tb].max}`)}
            {BONUSES[tb].bases ? ` (${ASC_BASES.filter((b) => townBonusFor(b, town)).map((b) => b.name).join(', ')} only)` : ''}. Every town has its own.
          </p>
        );
      })()}
      <div className="sf-actions">
        <button className="btn btn-primary" onClick={() => setCrafting((c) => !c)}>{crafting ? 'Close' : `Craft one · ${CRAFT_COST} ✨`}</button>
        <button className="btn" disabled={fine === 0} onClick={() => game.breakDownAllFine()}>
          Break down all Fine{fine ? ` (${fine} · +${fine * BREAK_VALUE.f} ✨)` : ''}
        </button>
      </div>
      {fine > 0 && <p className="small muted">📌 Kept items are never broken down.</p>}
      {crafting && (
        <div className="sf-grid">
          {ASC_BASES.map((b) => {
            const why = whyCantCraft(player, b.key);
            const lockedOut = why && !why.includes('Starlight');
            return (
              <button key={b.key} className="sf-base" disabled={!!why} title={why ?? ''}
                onClick={() => { const id = game.craftAscended(b.key); if (id) setMade(id); }}>
                <ItemIcon id={`asc.${b.key}.f.0.${b.kind === 'tool' ? 'xp3' : b.kind === 'weapon' ? 'cx3' : 'cx3'}`} size={34} />
                <span className="small">{b.name}</span>
                {lockedOut && <span className="tiny bad-text">{SKILLS[b.skill].name} {ASCENSION_LEVEL}</span>}
              </button>
            );
          })}
        </div>
      )}
      {made && (
        <div className="sf-made" style={{ ['--grade' as string]: getItem(made).ascended?.grade.color }}>
          <ItemIcon id={made} size={40} />
          <div className="grow">
            <b className="sf-made-name">{getItem(made).name}</b>
            <div className="small muted">{getItem(made).ascended?.bonuses.map((x) => BONUSES[x.key].text(x.value, SKILLS[getItem(made).ascended!.base.skill].name)).join(' · ')}</div>
          </div>
          <button className="link-btn small" onClick={() => setMade(null)}>OK</button>
        </div>
      )}
    </section>
  );
}

/** Lock the bonuses you like, reroll the rest. Works on items in the bag or worn ones. */
export function ReforgePanel({ id, from, onChange }: { id: string; from: ForgePlace; onChange?: (next: string) => void }) {
  const { player } = useGame();
  const [locked, setLocked] = useState<BonusKey[]>([]);
  const a = getItem(id).ascended;
  if (!a) return null;
  const skill = SKILLS[a.base.skill].name;
  const live = locked.filter((k) => a.bonuses.some((b) => b.key === k));
  const cost = reforgeCost(a.grade.key, live.length);
  const allLocked = live.length >= a.bonuses.length;
  const toggle = (k: BonusKey) => setLocked((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  return (
    <section className="block sf-reforge">
      <h3>✨ Reforge</h3>
      <p className="small muted">Tap bonuses to 🔒 lock them. Reforging rerolls every unlocked bonus (which one and how strong). The grade stays {a.grade.name}. Each lock doubles the cost.</p>
      <div className="sf-locks">
        {a.bonuses.map((b) => (
          <button key={b.key} className={`sf-lock ${live.includes(b.key) ? 'on' : ''}`} onClick={() => toggle(b.key)}>
            {live.includes(b.key) ? '🔒' : '🔓'} {BONUSES[b.key].text(b.value, skill)}
          </button>
        ))}
      </div>
      {from === 'bank'
        ? <p className="small muted">Withdraw it to your bag to reforge it.</p>
        : (
          <button className="btn btn-primary btn-lg btn-wide" disabled={allLocked || player.starlight < cost}
            onClick={() => { const next = game.reforge(id, from, live); if (next) onChange?.(next); }}>
            {allLocked ? 'Leave one bonus unlocked' : `Reforge · ${fmtNum(cost)} ✨`}{!allLocked && player.starlight < cost ? ` (you have ${fmtNum(player.starlight)})` : ''}
          </button>
        )}
    </section>
  );
}
