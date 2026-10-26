import { useEffect, useMemo, useRef } from 'react';
import { usedSlots } from '../core/inventory';
import { game, useGame } from '../core/store';
import { ItemSlot, Sheet } from './components';
import { useItemDrag, useUndoWindow } from './useItemDrag';

/** Items in the bag since you last looked get a little ✨ dot (remembered on this device only). */
const SEEN_KEY = (slot: number | null) => `ui.bagSeen.${slot ?? 0}`;
function readSeen(slot: number | null): Set<string> | null {
  try { const raw = localStorage.getItem(SEEN_KEY(slot)); return raw ? new Set(JSON.parse(raw) as string[]) : null; } catch { return null; }
}

export function BagSheet({ onClose, onItem }: { onClose: () => void; onItem: (id: string) => void }) {
  const { player, slot } = useGame();
  const used = usedSlots(player.inventory);
  const size = player.inventory.length;
  const full = used >= size;
  const kept = player.inventory.filter((s) => s && player.keep.includes(s.id)).length;
  const depositable = used - kept;
  // What was in the bag the last time you opened it (read once when the bag opens).
  const seen = useMemo(() => readSeen(slot), [slot]);
  const idsNow = useRef<string[]>([]);
  idsNow.current = player.inventory.flatMap((s) => (s ? [s.id] : []));
  useEffect(() => () => {
    try { localStorage.setItem(SEEN_KEY(slot), JSON.stringify([...new Set(idsNow.current)])); } catch { /* ignore */ }
  }, [slot]);
  const { slotProps, tap, ghost, dragging } = useItemDrag((from, to) => { game.moveBagSlot(Number(from), Number(to)); hideUndo(); }, () => game.pickUp());
  const [canUndo, showUndo, hideUndo] = useUndoWindow();

  return (
    <Sheet
      title={<>Bag <span className={`count ${full ? 'bad-text' : ''}`}>{used}/{size}</span></>}
      onClose={onClose}
      footer={
        <button className="btn btn-primary btn-lg btn-wide" disabled={depositable === 0} onClick={() => game.depositAll()}>
          Deposit all to bank{kept ? ` (keeps ${kept} 📌)` : ''}
        </button>
      }
    >
      {player.satchel.owned && (
        <button className={`satchel-toggle ${player.satchel.on ? 'on' : ''}`} onClick={() => game.toggleSatchel()}>
          🎒 Satchel {player.satchel.on ? 'on — overflow goes to the bank' : 'off — tap to turn on'}
        </button>
      )}
      {full && !(player.satchel.owned && player.satchel.on) && <div className="warn">Your bag is full. Idling stops when there's no room — deposit to keep going.{player.satchel.owned ? '' : ' (Later, the Satchel from the Trading Post sends extras to the bank.)'}</div>}
      <div className="inv-tools">
        <span className="small muted">{dragging ? 'Drop it on any slot' : 'Hold an item to drag it'}</span>
        <div className="btn-pair-sm">
          {canUndo && <button className="btn btn-sm" onClick={() => { game.undoSort('bag'); hideUndo(); }}>↶ Undo</button>}
          <button className="btn btn-sm" disabled={used === 0} onClick={() => { game.sortBag(); showUndo(); }}>🧹 Tidy</button>
        </div>
      </div>
      <div className={`grid bag-grid ${dragging ? 'is-dragging' : ''}`}>
        {player.inventory.map((s, i) =>
          s
            ? <ItemSlot key={i} id={s.id} qty={s.qty} onClick={tap(() => onItem(s.id))} drag={slotProps(String(i), s.id)}
                pinned={player.keep.includes(s.id)} isNew={!!seen && !seen.has(s.id)} />
            : <ItemSlot key={i} empty drag={slotProps(String(i), null)} />,
        )}
      </div>
      {ghost}
      <p className="small muted center">Ores and bars stack up to 999 per slot. Gear takes one slot each. Drop an item on the same item to join the stacks.</p>
    </Sheet>
  );
}
