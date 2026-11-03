// A card header you can tap to fold the card away (v0.0.2.11, owner: "make things smoother and flow better").
// Whether each card is open is remembered on this device (`ui.fold.<id>`).
import { useState, type ReactNode } from 'react';
import { sound } from '../audio/sound';

export function useFold(id: string, startOpen: boolean): [boolean, () => void] {
  const key = `ui.fold.${id}`;
  const [open, setOpen] = useState<boolean>(() => {
    try { const v = localStorage.getItem(key); return v === null ? startOpen : v === '1'; } catch { return startOpen; }
  });
  const toggle = () => {
    sound.play('click', { volume: 0.4 });
    setOpen((o) => {
      try { localStorage.setItem(key, o ? '0' : '1'); } catch { /* storage full or blocked: still works this visit */ }
      return !o;
    });
  };
  return [open, toggle];
}

/** The tappable header: title on the left, a short summary + ▼/▲ on the right. */
export function FoldHead({ title, summary, open, onToggle }: { title: ReactNode; summary?: ReactNode; open: boolean; onToggle: () => void }) {
  return (
    <button className="collapse-head fold-head" onClick={onToggle} aria-expanded={open}>
      <h2 className="section-title">{title}</h2>
      <span className="small muted fold-sum">{summary}{summary ? ' ' : ''}<span className="fold-arrow">{open ? '▲' : '▼'}</span></span>
    </button>
  );
}
