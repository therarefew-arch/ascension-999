import { usedSlots } from '../core/inventory';
import { game, useGame } from '../core/store';
import { ItemSlot, Sheet } from './components';

export function BagSheet({ onClose, onItem }: { onClose: () => void; onItem: (id: string) => void }) {
  const { player } = useGame();
  const used = usedSlots(player.inventory);
  const size = player.inventory.length;
  const full = used >= size;
  return (
    <Sheet
      title={<>Bag <span className={`count ${full ? 'bad-text' : ''}`}>{used}/{size}</span></>}
      onClose={onClose}
      footer={<button className="btn btn-primary btn-lg btn-wide" disabled={used === 0} onClick={() => game.depositAll()}>Deposit all to bank</button>}
    >
      {player.satchel.owned && (
        <button className={`satchel-toggle ${player.satchel.on ? 'on' : ''}`} onClick={() => game.toggleSatchel()}>
          🎒 Satchel {player.satchel.on ? 'on — overflow goes to the bank' : 'off — tap to turn on'}
        </button>
      )}
      {full && !(player.satchel.owned && player.satchel.on) && <div className="warn">Your bag is full. Idling stops when there's no room — deposit to keep going.{player.satchel.owned ? '' : ' (Later, the Satchel from the Trading Post sends extras to the bank.)'}</div>}
      <div className="grid bag-grid">
        {player.inventory.map((s, i) =>
          s ? <ItemSlot key={i} id={s.id} qty={s.qty} onClick={() => onItem(s.id)} /> : <ItemSlot key={i} empty />,
        )}
      </div>
      <p className="small muted center">Ores and bars stack up to 500 per slot. Gear takes one slot each.</p>
    </Sheet>
  );
}
