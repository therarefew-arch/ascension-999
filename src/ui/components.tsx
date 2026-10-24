// Small building blocks shared by the screens.
import { useEffect, useRef, type ReactNode } from 'react';
import { getItem, STAT_LABELS, type ItemStats } from '../data/items';
import { ACTIONS } from '../data/skills';
import { actionDuration } from '../core/idle';
import type { PlayerState } from '../core/player';
import { ItemIcon, UiIcon } from './icons';
import { fmtQty } from './format';

export function ProgressBar({ value, tone = 'gold', thin }: { value: number; tone?: 'gold' | 'green' | 'blue'; thin?: boolean }) {
  return (
    <div className={`bar ${thin ? 'bar-thin' : ''}`}>
      <div className={`bar-fill tone-${tone}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

/** Smooth progress bar for a running idle slot (animates between game ticks). */
export function ActionProgress({ player, thin, slot = 0 }: { player: PlayerState; thin?: boolean; slot?: number }) {
  const fill = useRef<HTMLDivElement>(null);
  const data = useRef(player);
  data.current = player;
  const slotRef = useRef(slot);
  slotRef.current = slot;
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const p = data.current;
      const s = p.slots[slotRef.current];
      const action = s ? ACTIONS[s.actionId] : null;
      if (fill.current) {
        let f = 0;
        if (s && action) {
          const progress = s.progressMs + Math.max(0, Date.now() - p.lastActiveAt);
          f = Math.min(1, progress / actionDuration(p, action));
        }
        fill.current.style.width = `${f * 100}%`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className={`bar ${thin ? 'bar-thin' : ''}`}>
      <div ref={fill} className="bar-fill tone-green" />
    </div>
  );
}

export function Sheet({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><UiIcon name="close" /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ItemSlot({ id, qty, onClick, empty, label }: { id?: string; qty?: number; onClick?: () => void; empty?: boolean; label?: string }) {
  if (empty || !id) return <div className="slot slot-empty" aria-hidden="true">{label && <span className="slot-label">{label}</span>}</div>;
  const item = getItem(id);
  return (
    <button className="slot" onClick={onClick} aria-label={`${item.name}${qty && qty > 1 ? `, ${qty}` : ''}`}>
      <ItemIcon id={id} size={38} />
      {qty !== undefined && qty > 1 && <span className="slot-qty">{fmtQty(qty)}</span>}
    </button>
  );
}

/** Side-by-side stats: this item vs. what you're wearing now. */
export function StatCompare({ next, current }: { next: ItemStats; current: ItemStats | null }) {
  const keys = Array.from(new Set([...Object.keys(next), ...Object.keys(current ?? {})])) as (keyof ItemStats)[];
  if (keys.length === 0) return null;
  return (
    <table className="compare">
      <thead>
        <tr><th>Stat</th><th>This</th>{current && <th>Worn</th>}{current && <th>Change</th>}</tr>
      </thead>
      <tbody>
        {keys.map((k) => {
          const a = next[k] ?? 0;
          const b = current?.[k] ?? 0;
          const d = a - b;
          return (
            <tr key={k}>
              <td>{STAT_LABELS[k]}</td>
              <td>{a}</td>
              {current && <td>{b}</td>}
              {current && (
                <td className={d > 0 ? 'up' : d < 0 ? 'down' : 'same'}>
                  {d > 0 && <UiIcon name="up" size={14} />}
                  {d < 0 && <UiIcon name="down" size={14} />}
                  {d === 0 ? '—' : `${d > 0 ? '+' : ''}${d}`}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Small "+3 Defense" style chips summarising an upgrade. */
export function DiffChips({ next, current }: { next: ItemStats; current: ItemStats | null }) {
  const keys = Array.from(new Set([...Object.keys(next), ...Object.keys(current ?? {})])) as (keyof ItemStats)[];
  return (
    <span className="chips">
      {keys.map((k) => {
        const d = (next[k] ?? 0) - (current?.[k] ?? 0);
        if (d === 0) return null;
        return <span key={k} className={`chip ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '+' : ''}{d} {STAT_LABELS[k].replace(' %', '%')}</span>;
      })}
    </span>
  );
}
