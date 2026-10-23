// Details for one item, with the actions that make sense where it is (bag, bank, or worn).
import { useEffect } from 'react';
import { getItem, SLOT_LABELS } from '../data/items';
import { canEquip } from '../core/equipment';
import { countInBag, countInBank } from '../core/inventory';
import { game, useGame } from '../core/store';
import { ItemIcon } from './icons';
import { Sheet, StatCompare } from './components';
import { fmtNum } from './format';

export type ItemPlace = 'bag' | 'bank' | 'worn';

export function ItemSheet({ id, from, onClose }: { id: string; from: ItemPlace; onClose: () => void }) {
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
          <p className="muted">{item.description}</p>
          <p className="small">In bag: <b>{fmtNum(inBag)}</b> · In bank: <b>{fmtNum(inBank)}</b></p>
        </div>
      </div>

      {item.equip && (
        <section className="block">
          <h3>{from === 'worn' ? 'Stats' : worn ? `Compared with your ${worn.name}` : 'Stats (nothing worn in this slot)'}</h3>
          <StatCompare next={item.equip.stats} current={from === 'worn' ? null : worn?.equip?.stats ?? null} />
          {item.equip.req && (
            <p className={`small ${equipProblem ? 'bad-text' : 'muted'}`}>
              Requires {item.equip.req.skill === 'mining' ? 'Mining' : 'Smithing'} level {item.equip.req.level}
            </p>
          )}
        </section>
      )}

      <div className="action-stack">
        {item.equip && from !== 'worn' && (
          <button className="btn btn-primary btn-lg" disabled={!!equipProblem}
            onClick={() => { game.equip(id); onClose(); }}>
            {equipProblem ?? (worn ? `Equip (replaces ${worn.name})` : 'Equip')}
          </button>
        )}
        {from === 'worn' && slot && (
          <button className="btn btn-lg" onClick={() => { game.unequip(slot); onClose(); }}>Unequip</button>
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
