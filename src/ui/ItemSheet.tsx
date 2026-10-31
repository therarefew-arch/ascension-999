// Details for one item, with the actions that make sense where it is (bag, bank, or worn).
import { useEffect } from 'react';
import { getItem, MAX_UPGRADE, MEALS, SLOT_LABELS } from '../data/items';

/** Brews (Cooking → Brews) are drunk; everything else, festival treats included, is eaten. */
const DRINKS = new Set(MEALS.filter((m) => m.tab === 'Brews').map((m) => m.id));
import { SKILLS } from '../data/skills';
import { maxHp } from '../core/combat';
import { REROLL_COST } from '../core/equipment';
import { canEquip } from '../core/equipment';
import { countInBag, countInBank } from '../core/inventory';
import { game, useGame } from '../core/store';
import { ItemIcon } from './icons';
import { Sheet, StatCompare } from './components';
import { fmtNum } from './format';
import { buffText } from '../core/buffs';
import { BONUSES, BREAK_VALUE, GRADES, isTownBonus, townBonusFor, townBonusName } from '../data/ascended';
import { ReforgePanel } from './Starforge';
import { REGIONS } from '../data/tiers';

export type ItemPlace = 'bag' | 'bank' | 'worn';

export function ItemSheet({ id, from, onClose, onReroll }: { id: string; from: ItemPlace; onClose: () => void; onReroll?: (newId: string) => void }) {
  const { player } = useGame();
  const item = getItem(id);
  const inBag = countInBag(player.inventory, id);
  const inBank = countInBank(player, id);
  const slot = item.equip?.slot;
  const wornId = slot ? player.equipment[slot] : undefined;
  const worn = wornId ? getItem(wornId) : null;
  const equipProblem = item.equip ? canEquip(player, item) : null;

  // Close automatically if the item is gone from where we opened it.
  const have = from === 'bag' ? inBag : from === 'bank' ? inBank : wornId === id ? 1 : 0;
  useEffect(() => { if (have === 0) onClose(); }, [have, onClose]);
  if (have === 0) return null;

  const amounts = (max: number) => {
    const list = (item.stackable ? [1, 10, 100] : [1]).filter((n) => n < max);
    return [...list, max];
  };

  return (
    <Sheet title={item.name} onClose={onClose}>
      <div className="item-head">
        <div className="item-big"><ItemIcon id={id} size={64} /></div>
        <div>
          <div className="pill-row">
            <span className="pill">{item.category === 'armour' ? 'Armour' : item.category[0].toUpperCase() + item.category.slice(1)}</span>
            {slot && <span className="pill">{SLOT_LABELS[slot]} slot</span>}
          </div>
          {item.ascended
            ? <p className="muted">🌟 Ascended · found in {REGIONS[item.ascended.town]}. Every one rolls different bonuses.</p>
            : <p className="muted">{item.description}</p>}
          {item.heals && <p className="small good-text">Heals {item.heals} in combat (coming soon)</p>}
          {item.upgrade && (
            <p className="small gold">
              {item.upgrade.level >= MAX_UPGRADE ? 'Fully upgraded (+10)!' : `Upgrade +${item.upgrade.level} of +${MAX_UPGRADE} · improve at the ${item.upgrade.by === 'crafting' ? 'Workshop' : 'Rune Tower'}`}
            </p>
          )}
          <p className="small">In bag: <b>{fmtNum(inBag)}</b> · In bank: <b>{fmtNum(inBank)}</b></p>
        </div>
      </div>

      {item.ascended && (
        <section className="block asc-block" style={{ ['--grade' as string]: item.ascended.grade.color }}>
          <h3 className="asc-grade">{item.ascended.grade.key === 'g' ? '✨ ' : ''}{item.ascended.grade.name}</h3>
          <ul className="asc-bonuses">
            {item.ascended.bonuses.map((b) => {
              const def = BONUSES[b.key];
              const near = b.value >= def.max - Math.max(1, (def.max - def.min) * 0.08);
              return <li key={b.key} className={`${near ? 'top' : ''} ${isTownBonus(b.key) ? 'town' : ''}`}>{def.text(b.value, SKILLS[item.ascended!.base.skill].name)} <span className="muted small">({def.min}–{def.max})</span></li>;
            })}
          </ul>
          {(() => {
            const tb = townBonusFor(item.ascended.base, item.ascended.town);
            return tb
              ? <p className="small muted">🗺️ {REGIONS[item.ascended.town]}'s town bonus <b>{townBonusName(tb)}</b> can roll on this (and on a reforge). It only rolls on items found or crafted there.</p>
              : <p className="small muted">🗺️ {REGIONS[item.ascended.town]}'s town bonus doesn't fit this kind of item.</p>;
          })()}
          <p className="small muted">Grades: {GRADES.map((g) => g.name).join(' → ')}. Divine can drop from level 850, Godforged from 950.</p>
          {from !== 'worn' && (
            <button className="btn btn-wide" onClick={() => game.breakDown(id, from)}>
              Break down · +{BREAK_VALUE[item.ascended.grade.key]} ✨ Starlight
            </button>
          )}
        </section>
      )}
      {item.ascended && <ReforgePanel id={id} from={from} onChange={(next) => onReroll?.(next)} />}

      {item.equip && (
        <section className="block">
          <h3>{from === 'worn' ? 'Stats' : worn ? `Compared with your ${worn.name}` : 'Stats (nothing worn in this slot)'}</h3>
          <StatCompare next={item.equip.stats} current={from === 'worn' ? null : worn?.equip?.stats ?? null} />
          {item.equip.req && (
            <p className={`small ${equipProblem ? 'bad-text' : 'muted'}`}>
              Requires {SKILLS[item.equip.req.skill].name} level {item.equip.req.level}
            </p>
          )}
        </section>
      )}

      <div className="action-stack">
        {item.opens && from === 'bag' && countInBag(player.inventory, id) > 0 && (
          <>
            <button className="btn btn-hero btn-lg" onClick={() => game.openFind(id)}>🎁 Open one</button>
            {countInBag(player.inventory, id) > 1 && (
              <button className="btn btn-lg" onClick={() => game.openFind(id, true)}>Open all ({countInBag(player.inventory, id)})</button>
            )}
          </>
        )}
        {item.buff && (
          <section className="block">
            <p className="small"><b>{buffText(item.buff)}</b> for {item.buff.minutes} minutes{item.buff.kind === 'speed' ? ' — actions go faster' : ''}.</p>
            {from === 'bag'
              ? <button className="btn btn-primary btn-lg btn-wide" onClick={() => game.consumeBuff(id)}>{DRINKS.has(item.id) ? '🍵 Drink it' : '🍽️ Eat it'}</button>
              : <p className="small muted">Withdraw it to your bag to {/tea|tonic|brew/.test(item.id) ? 'drink' : 'eat'} it.</p>}
          </section>
        )}
        {item.heals && from === 'bag' && (
          <button className="btn btn-primary btn-lg" onClick={() => game.eat(id)}>
            Eat (+{item.heals} HP) · you have {player.hp}/{maxHp(player)}
          </button>
        )}
        {item.gem && (
          <section className="block">
            <h3>Gem</h3>
            <p className="small muted">Socket it into a gear slot on the Gear screen. Reroll to get a new stat roll of the same rarity.</p>
            <button className="btn btn-primary btn-lg btn-wide" disabled={from !== 'bag' || player.coins < REROLL_COST[item.gem.rarity]}
              onClick={() => { const next = game.rerollGem(id); if (next) onReroll?.(next); }}>
              Reroll for {REROLL_COST[item.gem.rarity]} coins {player.coins < REROLL_COST[item.gem.rarity] ? `(you have ${player.coins})` : ''}
            </button>
          </section>
        )}
        {item.equip && from !== 'worn' && (
          <button className="btn btn-primary btn-lg" disabled={!!equipProblem}
            onClick={() => { game.equip(id); onClose(); }}>
            {equipProblem ?? (worn ? `Equip (replaces ${worn.name})` : 'Equip')}
          </button>
        )}
        {from === 'worn' && slot && (
          <button className="btn btn-lg" onClick={() => { game.unequip(slot); onClose(); }}>Unequip</button>
        )}

        {from !== 'worn' && (
          <button className={`btn keep-btn ${player.keep.includes(id) ? 'on' : ''}`} onClick={() => game.toggleKeep(id)}>
            {player.keep.includes(id) ? '📌 Kept in bag on “Deposit all” — tap to stop' : '📌 Keep in bag on “Deposit all”'}
          </button>
        )}
        {from === 'bag' && (
          <div className="amount-row">
            <span className="amount-label">Deposit</span>
            {amounts(inBag).map((n, i, arr) => (
              <button key={n} className="btn" onClick={() => game.deposit(id, n)}>
                {i === arr.length - 1 && arr.length > 1 ? 'All' : fmtNum(n)}
              </button>
            ))}
          </div>
        )}
        {from === 'bank' && (
          <div className="amount-row">
            <span className="amount-label">Withdraw</span>
            {amounts(inBank).map((n, i, arr) => (
              <button key={n} className="btn" onClick={() => game.withdraw(id, n)}>
                {i === arr.length - 1 && arr.length > 1 ? 'All' : fmtNum(n)}
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
