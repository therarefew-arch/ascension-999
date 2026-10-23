import { useState } from 'react';
import { getItem, ITEM_LIST } from '../../data/items';
import { usedSlots } from '../../core/inventory';
import { game, useGame } from '../../core/store';
import { ItemSlot } from '../components';
import { UiIcon } from '../icons';

const ORDER = Object.fromEntries(ITEM_LIST.map((it, i) => [it.id, i]));

export function BankScreen({ onItem }: { onItem: (id: string) => void }) {
  const { player } = useGame();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const items = [...player.bank]
    .sort((a, b) => ORDER[a.id] - ORDER[b.id])
    .filter((s) => !q || getItem(s.id).name.toLowerCase().includes(q) || getItem(s.id).category.includes(q));
  const bagUsed = usedSlots(player.inventory);

  return (
    <div className="screen">
      <h1 className="screen-title">Bank</h1>
      <div className="search">
        <UiIcon name="search" size={20} />
        <input type="search" placeholder="Search the bank…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the bank" />
        {query && <button className="icon-btn" onClick={() => setQuery('')} aria-label="Clear search"><UiIcon name="close" size={18} /></button>}
      </div>
      <button className="btn btn-lg btn-wide" disabled={bagUsed === 0} onClick={() => game.depositAll()}>
        Deposit whole bag ({bagUsed} slots)
      </button>
      <p className="small muted">{player.bank.length} kinds of item stored · tap one to withdraw</p>
      {items.length === 0 ? (
        <div className="empty">{q ? 'Nothing matches your search.' : 'Your bank is empty. Deposit items from your bag to keep them safe.'}</div>
      ) : (
        <div className="grid">
          {items.map((s) => <ItemSlot key={s.id} id={s.id} qty={s.qty} onClick={() => onItem(s.id)} />)}
        </div>
      )}
    </div>
  );
}
