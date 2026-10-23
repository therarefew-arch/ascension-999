import { usedSlots } from '../core/inventory';
import { INVENTORY_SLOTS } from '../core/player';
import { game, useGame } from '../core/store';
import { ItemSlot, Sheet } from './components';

export function BagSheet({ onClose, onItem }: { onClose: () => void; onItem: (id: string) => void }) {
  const { player } = useGame();
  const used = usedSlots(player.inventory);
  const full = used >= INVENTORY_SLOTS;
  return (
    <Sheet
      title={<>Bag <span className={`count ${full ? 'bad-text' : ''}`}>{used}/{INVENTORY_SLOTS}</span></>}
      onClose={onClose}
      footer={<button className="btn btn-primary btn-lg btn-wide" disabled={used === 0} onClick={() => game.depositAll()}>Deposit all to bank</button>}
    >
      {full && <div className="warn">Your bag is full. Idling stops when there's no room — deposit to keep going.</div>}
      <div className="grid bag-grid">
        {player.inventory.map((s, i) =>
          s ? <ItemSlot key={i} id={s.id} qty={s.qty} onClick={() => onItem(s.id)} /> : <ItemSlot key={i} empty />,
        )}
      </div>
      <p className="small muted center">Ores and bars stack up to 500 per slot. Gear takes one slot each.</p>
    </Sheet>
  );
}
