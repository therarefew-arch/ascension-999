// ⛶ Full screen for every skill minigame (v0.0.2.17, owner: "give all the mini games inside of skills the option to go
// full screen"). The skill screen wraps its minigame area in <MinigameFrame>; a ⛶ button in its corner makes the
// whole area (sub-game tabs included) cover the screen, in the skill's own colours. Nothing remounts, so a game in
// progress is never lost. Games with their own full screen layout (Sort the Catch, Spellcards, The Loom) call
// `useOwnFullScreen()` and the frame hides its button while they're showing.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { sound } from '../audio/sound';

const Ctx = createContext<{ own: (d: number) => void } | null>(null);

/** For games that bring their own ⛶ button: hides the frame's while the game is on screen. */
export function useOwnFullScreen() {
  const c = useContext(Ctx);
  useEffect(() => {
    if (!c) return;
    c.own(1);
    return () => c.own(-1);
  }, [c]);
}

export function MinigameFrame({ skill, children }: { skill: string; children: ReactNode }) {
  const [full, setFull] = useState(false);
  const [own, setOwn] = useState(0);
  const ctx = useRef({ own: (d: number) => setOwn((n) => Math.max(0, n + d)) }).current;

  useEffect(() => {
    if (!full) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let wasFs = !!document.fullscreenElement;
    const off = () => { if (document.fullscreenElement) wasFs = true; else if (wasFs) setFull(false); };
    document.addEventListener('fullscreenchange', off);
    return () => { document.body.style.overflow = before; document.removeEventListener('fullscreenchange', off); };
  }, [full]);
  useEffect(() => () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); }, []);
  // A game with its own full screen took over — leave ours.
  useEffect(() => { if (own > 0 && full) setFull(false); }, [own, full]);

  const toggle = () => {
    sound.play('click');
    if (full) { setFull(false); if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); return; }
    setFull(true);
    try { document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {}); } catch { /* the overlay still covers the screen */ }
  };

  return (
    <Ctx.Provider value={ctx}>
      <div className={`mg-fs mg-skin-${skill} ${full ? 'on' : ''}`}>
        {own === 0 && (
          <button className="mg-fs-btn" onClick={toggle} aria-label={full ? 'Leave full screen' : 'Full screen'} title={full ? 'Leave full screen' : 'Full screen'}>
            {full ? '✕' : '⛶'}
          </button>
        )}
        <div className="mg-fs-body">{children}</div>
      </div>
    </Ctx.Provider>
  );
}
