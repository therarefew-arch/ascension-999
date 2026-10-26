import { useState } from 'react';
import { getItem, type ItemCategory } from '../../data/items';
import { usedSlots, type BankSort } from '../../core/inventory';
import { baseValue } from '../../market/market';
import { game, useGame } from '../../core/store';
import { ItemSlot } from '../components';
import { UiIcon } from '../icons';
import { fmtNum } from '../format';
import { useItemDrag, useUndoWindow } from '../useItemDrag';

/** Quick filters: tap one to see just that kind of item. */
const FILTERS: { key: string; label: string; cats: ItemCategory[] }[] = [
  { key: 'all', label: 'All', cats: [] },
  { key: 'res', label: '⛏️ Resources', cats: ['ore', 'bar', 'log', 'material'] },
  { key: 'food', label: '🍲 Food & farm', cats: ['fish', 'food', 'meal', 'herb', 'crop', 'seed'] },
  { key: 'gear', label: '⚔️ Gear', cats: ['weapon', 'armour', 'tool', 'ammo'] },
  { key: 'treasure', label: '💎 Treasures', cats: ['gem', 'treasure', 'currency'] },
];
const SORTS: { mode: BankSort; label: string }[] = [
  { mode: 'type', label: 'By type' },
  { mode: 'name', label: 'A → Z' },
  { mode: 'amount', label: 'Most first' },
  { mode: 'value', label: 'Total worth' },
];

export function BankScreen({ onItem }: { onItem: (id: string) => void }) {
  const { player } = useGame();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortOpen, setSortOpen] = useState(false);
  const q = query.trim().toLowerCase();
  const cats = FILTERS.find((f) => f.key === filter)?.cats ?? [];
  // The bank keeps your own order (sort it, or drag items around).
  const items = player.bank.filter((s) => {
    const it = getItem(s.id);
    return (!cats.length || cats.includes(it.category)) && (!q || it.name.toLowerCase().includes(q) || it.category.includes(q));
  });
  const bagUsed = usedSlots(player.inventory);
  const kept = player.inventory.filter((s) => s && player.keep.includes(s.id)).length;
  const worth = player.bank.reduce((sum, s) => sum + baseValue(getItem(s.id)) * s.qty, 0);
  const { slotProps, tap, ghost, dragging } = useItemDrag((from, to) => { game.moveBankItem(from, to); hideUndo(); }, () => game.pickUp());
  const [canUndo, showUndo, hideUndo] = useUndoWindow();

  return (
    <div className="screen">
      <h1 className="screen-title">BANK</h1>
      <div className="search">
        <UiIcon name="search" size={20} />
        <input type="search" placeholder="Search the bank…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the bank" />
        {query && <button className="icon-btn" onClick={() => setQuery('')} aria-label="Clear search"><UiIcon name="close" size={18} /></button>}
      </div>
      <button className="btn btn-lg btn-wide" disabled={bagUsed - kept === 0} onClick={() => game.depositAll()}>
        Deposit whole bag ({bagUsed - kept} slots{kept ? ` · keeps ${kept} 📌` : ''})
      </button>
      <div className="tab-row no-pad bank-filters" role="tablist" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f.key} role="tab" aria-selected={filter === f.key} className={`tab-pill ${filter === f.key ? 'on' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>
      <div className="inv-tools">
        <span className="small muted">
          {dragging ? 'Drop it where you want it' : <>{player.bank.length} kinds · worth about <b className="gold mono">{fmtNum(worth)}</b> coins</>}
        </span>
        <div className="btn-pair-sm">
          {canUndo && <button className="btn btn-sm" onClick={() => { game.undoSort('bank'); hideUndo(); }}>↶ Undo</button>}
          <div className="sort-wrap">
            <button className="btn btn-sm" disabled={player.bank.length < 2} onClick={() => setSortOpen((o) => !o)} aria-expanded={sortOpen}>⇅ Sort</button>
            {sortOpen && (
              <>
                <div className="sort-catcher" onClick={() => setSortOpen(false)} />
                <div className="sort-menu" role="menu">
                  {SORTS.map((s) => (
                    <button key={s.mode} role="menuitem" onClick={() => { game.sortBank(s.mode); setSortOpen(false); showUndo(); }}>{s.label}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty">{q || filter !== 'all' ? 'Nothing here matches.' : 'Your bank is empty. Deposit items from your bag to keep them safe.'}</div>
      ) : (
        <div className={`grid ${dragging ? 'is-dragging' : ''}`}>
          {items.map((s) => (
            <ItemSlot key={s.id} id={s.id} qty={s.qty} onClick={tap(() => onItem(s.id))} drag={slotProps(s.id, s.id)} pinned={player.keep.includes(s.id)} />
          ))}
        </div>
      )}
      {ghost}
      <p className="small muted center">Tap an item to withdraw it · hold and drag to move it.</p>
    </div>
  );
}
