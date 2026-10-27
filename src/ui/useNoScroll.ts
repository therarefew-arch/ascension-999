// Keeps the page still while you swipe on a game board.
// (iPhone Safari ignores CSS `touch-action: none`, so we also stop the touch from scrolling the page.)
import { useEffect, type RefObject } from 'react';

export function useNoScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: TouchEvent) => { if (e.cancelable) e.preventDefault(); };
    el.addEventListener('touchmove', stop, { passive: false });
    return () => el.removeEventListener('touchmove', stop);
  }, [ref]);
}
