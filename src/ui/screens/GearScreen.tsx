import { useState } from 'react';
import { getItem, ITEM_LIST, SLOT_LABELS, SLOT_ORDER, STAT_LABELS, type EquipSlot, type ItemStats } from '../../data/items';
import { canEquip, equipmentStats } from '../../core/equipment';
import { countInBag, countInBank } from '../../core/inventory';
import { game, useGame } from '../../core/store';
import { DiffChips, Sheet, StatCompare } from '../components';
import { ItemIcon } from '../icons';

function SlotPicker({ slot, onClose }: { slot: EquipSlot; onClose: () => void }) {
  const { player } = useGame();
  const wornId = player.equipment[slot];
  const worn = wornId ? getItem(wornId) : null;
  const options = ITEM_LIST.filter((it) => it.equip?.slot === slot)
    .map((it) => ({ item: it, bag: countInBag(player.inventory, it.id), bank: countInBank(player, it.id) }))
    .filter((o) => o.bag + o.bank > 0);

  return (
    <Sheet title={`${SLOT_LABELS[slot]} slot`} onClose={onClose}>
      {worn ? (
        <section className="block">
          <h3>Wearing</h3>
          <div className="row">
            <ItemIcon id={worn.id} size={44} />
            <div className="grow"><b>{worn.name}</b></div>
            <button className="btn" onClick={() => { game.unequip(slot); }}>Unequip</button>
          </div>
          <StatCompare next={worn.equip!.stats} current={null} />
        </section>
      ) : <p className="muted">Nothing worn here yet.</p>}

      <h3>Your {SLOT_LABELS[slot].toLowerCase()} items</h3>
      {options.length === 0 && <p className="small muted">You don't have any. Smith some at the Forge!</p>}
      <div className="list">
        {options.map(({ item, bag, bank }) => {
          const problem = canEquip(player, item);
          return (
            <button key={item.id} className="list-row" disabled={!!problem}
              onClick={() => { game.equip(item.id); onClose(); }}>
              <ItemIcon id={item.id} size={40} />
              <div className="grow">
                <div><b>{item.name}</b> <span className="small muted">{bag > 0 ? `bag ${bag}` : ''}{bag > 0 && bank > 0 ? ' Â· ' : ''}{bank > 0 ? `bank ${bank}` : ''}</span></div>
                {problem ? <span className="small bad-text">{problem}</span> : <DiffChips next={item.equip!.stats} current={worn?.equip?.stats ?? null} />}
              </div>
              {!problem && <span className="start-pill">Equip</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

export function GearScreen() {
  const { player } = useGame();
  const [picking, setPicking] = useState<EquipSlot | null>(null);
  const stats = equipmentStats(player);

  return (
    <div className="screen">
      <h1 className="screen-title">GEAR</h1>
      <div className="gear-grid">
        {SLOT_ORDER.map((slot) => {
          const id = player.equipment[slot];
          return (
            <button key={slot} className={`gear-slot ${id ? 'filled' : ''}`} onClick={() => setPicking(slot)}>
              {id ? <ItemIcon id={id} size={48} /> : <span className="gear-empty" />}
              <span className="gear-label">{SLOT_LABELS[slot]}</span>
              {id && <span className="gear-name small">{getItem(id).name}</span>}
            </button>
          );
        })}
      </div>
      <div className="card">
        <h3>Total stats</h3>
        <div className="stat-list">
          {(Object.keys(STAT_LABELS) as (keyof ItemStats)[]).map((k) => (
            <div key={k} className="stat-line"><span>{STAT_LABELS[k]}</span><b>{stats[k] ?? 0}</b></div>
          ))}
        </div>
        <p className="small muted">A pickaxe makes mining faster. Attack and Defense matter once combat arrives.</p>
      </div>
      {picking && <SlotPicker slot={picking} onClose={() => setPicking(null)} />}
    </div>
  );
}
