// ✋ Pick up and drag items (bag and bank).
// Phone: press and hold an item for a moment, then drag it — a quick tap still opens it, and a swipe still scrolls.
// Mouse: just click and drag.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ItemIcon } from './icons';

const HOLD_MS = 260;
const MOVE_TOLERANCE = 8;

interface DragState { key: string; id: string; x: number; y: number; over: string | null }

/** Shows an "Undo" button for a few seconds after sorting. */
export function useUndoWindow(ms = 8000): [boolean, () => void, () => void] {
  const [until, setUntil] = useState(0);
  useEffect(() => {
    if (!until) return;
    const t = setTimeout(() => setUntil(0), Math.max(0, until - Date.now()));
    return () => clearTimeout(t);
  }, [until]);
  return [until > 0, () => setUntil(Date.now() + ms), () => setUntil(0)];
}

/** `onDrop(fromKey, toKey)` is called when an item is dropped on another slot. */
export function useItemDrag(onDrop: (from: string, to: string) => void, onPickUp?: () => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pending = useRef<{ key: string; id: string; x: number; y: number; timer: number | null; mouse: boolean } | null>(null);
  const justDropped = useRef(false);
  const handlers = useRef({ onDrop, onPickUp });
  handlers.current = { onDrop, onPickUp };
  dragRef.current = drag;

  const slotAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest('[data-drop]') as HTMLElement | null)?.dataset.drop ?? null;

  const begin = (key: string, id: string, x: number, y: number) => {
    pending.current = null;
    handlers.current.onPickUp?.();
    const d = { key, id, x, y, over: key };
    dragRef.current = d;
    setDrag(d);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = pending.current;
      if (p) {
        const far = Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_TOLERANCE;
        if (far && p.mouse) begin(p.key, p.id, e.clientX, e.clientY);
        else if (far) { if (p.timer) clearTimeout(p.timer); pending.current = null; } // a swipe: let it scroll
        return;
      }
      if (dragRef.current) {
        const d = { ...dragRef.current, x: e.clientX, y: e.clientY, over: slotAt(e.clientX, e.clientY) };
        dragRef.current = d;
        setDrag(d);
      }
    };
    const up = (e: PointerEvent) => {
      const p = pending.current;
      if (p?.timer) clearTimeout(p.timer);
      pending.current = null;
      const d = dragRef.current;
      if (!d) return;
      const to = slotAt(e.clientX, e.clientY);
      justDropped.current = true;
      setTimeout(() => { justDropped.current = false; }, 50);
      dragRef.current = null;
      setDrag(null);
      if (to && to !== d.key) handlers.current.onDrop(d.key, to);
    };
    const cancel = () => { if (pending.current?.timer) clearTimeout(pending.current.timer); pending.current = null; dragRef.current = null; setDrag(null); };
    // While dragging on a phone, stop the page from scrolling under your finger.
    const noScroll = (e: TouchEvent) => { if (dragRef.current) e.preventDefault(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('touchmove', noScroll, { passive: false });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('touchmove', noScroll);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Props for a slot that can be picked up (`id` = the item in it) and/or dropped on. */
  const slotProps = (key: string, id: string | null) => ({
    'data-drop': key,
    className: drag ? (drag.key === key ? 'drag-from' : drag.over === key ? 'drag-over' : '') : '',
    onPointerDown: id ? (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      const mouse = e.pointerType === 'mouse';
      const x = e.clientX;
      const y = e.clientY;
      pending.current = { key, id, x, y, mouse, timer: mouse ? null : window.setTimeout(() => begin(key, id, x, y), HOLD_MS) };
    } : undefined,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  });

  /** Wrap a tap handler so it doesn't fire right after a drop. */
  const tap = (fn: () => void) => () => { if (!justDropped.current && !dragRef.current) fn(); };

  // Forget a half-started hold when the screen closes.
  useEffect(() => () => { if (pending.current?.timer) clearTimeout(pending.current.timer); }, []);

  const ghost = drag ? (
    <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><ItemIcon id={drag.id} size={44} /></div>
  ) : null;

  return { slotProps, tap, ghost, dragging: !!drag };
}
