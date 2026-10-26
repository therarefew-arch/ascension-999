// 🎶 Runesong — Enhancing's second minigame. The runes sing a spell; echo it back.
// No bars, no gear, no timer: an echoed spell gives Enhancing + Magic XP, a wrong note just fizzles.
import { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import type { ActionDef } from '../data/skills';
import { skillLevel } from '../core/idle';
import { MIN_LENGTH, newSpell, nextLength, NOTE_MS, RUNES, runesongXp } from '../core/runesong';
import { game, useGame } from '../core/store';
import { UiIcon } from './icons';
import { FeedbackLayer, useFeedback } from './Minigames';
import { RuneAlign } from './Minigames2';
import { Spellcards } from './Spellcards';

type Phase = 'ready' | 'listen' | 'echo' | 'done' | 'fizzle';

/** Remembered while the app is open, so leaving the screen doesn't reset your streak. */
let savedLength = MIN_LENGTH;
let savedBest = 0;

function Runesong() {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const [length, setLength] = useState(savedLength);
  const [spell, setSpell] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('ready');
  const [lit, setLit] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [best, setBest] = useState(savedBest);
  const timers = useRef<number[]>([]);
  const xp = runesongXp(skillLevel(player, 'enhancing'), length);

  // A misty, magical tune while you play; the town's song comes back when you leave.
  const town = player.location;
  useEffect(() => {
    sound.playMusic('music_lunaria');
    return () => { sound.playMusic(musicFor(town)); timers.current.forEach(clearTimeout); };
  }, [town]);

  const sing = (r: number, volume = 0.8) => sound.play('rune', { rate: RUNES[r].rate, volume, exact: true });

  /** Play the spell: each rune glows and sings in turn, then it's your go. */
  const playSpell = (s: number[]) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('listen');
    setStep(0);
    s.forEach((r, i) => {
      timers.current.push(window.setTimeout(() => { setLit(r); sing(r); }, 500 + i * NOTE_MS));
      timers.current.push(window.setTimeout(() => setLit(null), 500 + i * NOTE_MS + NOTE_MS * 0.7));
    });
    timers.current.push(window.setTimeout(() => setPhase('echo'), 500 + s.length * NOTE_MS));
  };

  const cast = (len = length) => {
    const s = newSpell(len);
    setSpell(s);
    playSpell(s);
  };

  const tap = (r: number) => {
    if (phase !== 'echo') return;
    setLit(r);
    timers.current.push(window.setTimeout(() => setLit((x) => (x === r ? null : x)), 220));
    if (spell[step] !== r) {
      // A wrong note: a soft fizzle, nothing lost — the next spell is a little shorter.
      sound.play('whoosh', { rate: 0.8, volume: 0.6 });
      const next = nextLength(length, false);
      savedLength = next;
      setLength(next);
      setPhase('fizzle');
      push('Fizzle! The spell slipped away', 'miss');
      return;
    }
    sing(r);
    if (step + 1 < spell.length) { setStep(step + 1); return; }
    // The whole spell, echoed!
    const got = game.runesongCast(spell.length);
    sound.play('match');
    sound.play('enchant', { rate: 1.2, volume: 0.6 });
    push(`Spell woven! +${got.enhancing.toLocaleString()} Enhancing · +${got.magic.toLocaleString()} Magic`, spell.length >= 8 ? 'combo' : 'perfect');
    if (spell.length > best) { savedBest = spell.length; setBest(spell.length); }
    const next = nextLength(length, true);
    savedLength = next;
    setLength(next);
    setPhase('done');
  };

  const waiting = phase === 'ready' || phase === 'done' || phase === 'fizzle';
  return (
    <div className="mg">
      <div className="mg-stage rs-stage">
        <div className={`rs-circle ${phase}`}>
          {RUNES.map((r, i) => {
            const angle = (i / RUNES.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <button key={r.key} data-silent className={`rs-rune ${lit === i ? 'lit' : ''}`} disabled={phase !== 'echo'}
                style={{ left: `${50 + 38 * Math.cos(angle)}%`, top: `${50 + 38 * Math.sin(angle)}%`, ['--rune' as string]: r.color }}
                onClick={() => tap(i)} aria-label={`${r.name} rune`}>
                <span>{r.emoji}</span>
              </button>
            );
          })}
          <div className="rs-core">
            {phase === 'listen' && <><b>Listen…</b><span>{spell.length} notes</span></>}
            {phase === 'echo' && <><b>{step + 1}/{spell.length}</b><span>your turn</span></>}
            {phase === 'done' && <><b>✨</b><span>woven!</span></>}
            {phase === 'fizzle' && <><b>💨</b><span>fizzled</span></>}
            {phase === 'ready' && <><b>🎶</b><span>Runesong</span></>}
          </div>
        </div>
        <FeedbackLayer items={items} />
      </div>
      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Runesong</span>
          <span className="mg-hint">{phase === 'echo' ? 'Tap the runes in the same order' : phase === 'listen' ? 'Watch and listen…' : `Next spell: ${length} notes`}</span>
        </div>
        {waiting ? (
          <div className="btn-pair">
            <button className="btn btn-hero btn-lg" onClick={() => cast()}><UiIcon name="magic" size={18} /> {phase === 'ready' ? 'Sing a spell' : 'Next spell'}</button>
            {phase === 'fizzle' && <button className="btn btn-lg" onClick={() => playSpell(spell)}>↻ Hear it again</button>}
          </div>
        ) : (
          <button className="btn btn-lg btn-wide" disabled={phase !== 'echo'} onClick={() => playSpell(spell)}>↻ Hear it again</button>
        )}
        <p className="mg-foot">
          No bars or gear needed — handy when everything is fully enhanced. A {length}-note spell gives <b>{xp.enhancing.toLocaleString()} Enhancing</b> + <b>{xp.magic.toLocaleString()} Magic XP</b>; each one you echo adds a note.{best ? ` Longest spell: ${best}.` : ''}
        </p>
      </div>
    </div>
  );
}

/** Enhancing's two minigames. With nothing left to enhance, Runesong is still there. */
/** Remembered while the app is open, so Enhancing reopens on the game you were playing. */
let lastMode: 'anvil' | 'song' | 'cards' | null = null;

export function EnhancingGames({ action }: { action?: ActionDef }) {
  const [mode, setModeState] = useState<'anvil' | 'song' | 'cards'>(() => (lastMode && (lastMode !== 'anvil' || action) ? lastMode : action ? 'anvil' : 'cards'));
  const setMode = (m: 'anvil' | 'song' | 'cards') => { lastMode = m; setModeState(m); };
  return (
    <>
      <div className="tab-row small-tabs">
        <button className={`tab-pill ${mode === 'anvil' ? 'on' : ''}`} disabled={!action} onClick={() => setMode('anvil')}><UiIcon name="enhancing" size={16} /> RUNE ALIGN</button>
        <button className={`tab-pill ${mode === 'cards' ? 'on' : ''}`} onClick={() => setMode('cards')}>🃏 SPELLCARDS</button>
        <button className={`tab-pill ${mode === 'song' ? 'on' : ''}`} onClick={() => setMode('song')}>🎶 RUNESONG</button>
      </div>
      {mode === 'anvil' && action ? <RuneAlign action={action} /> : mode === 'song' ? <Runesong /> : <Spellcards />}
    </>
  );
}
