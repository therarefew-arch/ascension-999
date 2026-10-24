// Cozy bits of the interface: confetti, the "Today" card (gift + Town Requests) and pet hearts.
import { useEffect, useRef, useState } from 'react';
import { getItem } from '../data/items';
import { giftFor, giftReady, REQUEST_BONUS, requestLabel, type TownRequest } from '../core/cozy';
import { game, useGame } from '../core/store';
import type { ItemStack } from '../core/player';
import { fmtNum } from './format';

const CONFETTI_COLORS = ['#fbbf24', '#f97316', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];

/** Shows a short burst of confetti whenever the game celebrates something. */
export function Confetti() {
  const { celebrate } = useGame();
  const first = useRef(celebrate);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    if (celebrate === first.current) return;
    setBurst((b) => b + 1);
    const t = setTimeout(() => setBurst(0), 2600);
    return () => clearTimeout(t);
  }, [celebrate]);
  if (!burst) return null;
  return (
    <div className="confetti" key={burst} aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <span key={i} style={{
          left: `${(i * 37) % 100}%`,
          background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animationDelay: `${(i % 9) * 0.06}s`,
          animationDuration: `${1.6 + (i % 5) * 0.18}s`,
          transform: `rotate(${i * 23}deg)`,
        }} />
      ))}
    </div>
  );
}

function stackText(g: ItemStack) {
  return g.id === 'coins' ? `${fmtNum(g.qty)} coins` : `${g.qty} ${getItem(g.id).name}`;
}

/** Daily gift + three Town Requests. */
export function TodayCard({ onGo }: { onGo: (r: TownRequest) => void }) {
  const { player } = useGame();
  useEffect(() => { game.ensureRequests(); }, []);
  const ready = giftReady(player);
  const tasks = player.requests.tasks;
  const allDone = tasks.length > 0 && tasks.every((t) => t.claimed);
  const doneCount = tasks.filter((t) => t.claimed).length;
  const nextStreak = player.daily.streak + 1;
  return (
    <section className="today-card">
      <div className="today-head">
        <h2 className="section-title">TODAY</h2>
        {player.daily.streak > 0 && <span className="streak mono">🔥 {player.daily.streak} day streak</span>}
      </div>

      {ready ? (
        <button className="gift-btn" onClick={() => game.claimGift()}>
          <span className="gift-emoji bob">🎁</span>
          <span className="grow">
            <b>Daily gift is ready!</b>
            <span className="small">{giftFor(nextStreak).map(stackText).join(' · ')}</span>
          </span>
          <span className="btn btn-primary">Open</span>
        </button>
      ) : (
        <div className="gift-done small muted">🎁 Gift opened · come back tomorrow for day {Math.min(7, nextStreak)}</div>
      )}

      <div className="requests">
        <div className="small muted">📜 Town Requests · {doneCount}/{tasks.length} done · tap one to go there</div>
        {tasks.map((r, i) => {
          const done = r.progress >= r.goal;
          return (
            <div key={i} className={`request ${r.claimed ? 'claimed' : ''}`}>
              <div className="grow request-go" role={r.claimed || done ? undefined : 'button'} tabIndex={r.claimed || done ? -1 : 0}
                onClick={() => { if (!r.claimed && !done) onGo(r); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !r.claimed && !done) onGo(r); }}>
                <div className="request-label">{r.claimed ? '✅ ' : ''}{requestLabel(r)}{!r.claimed && !done && <span className="gold"> ›</span>}</div>
                {!r.claimed && (
                  <div className="bar bar-thin"><div className="bar-fill tone-gold" style={{ width: `${(r.progress / r.goal) * 100}%` }} /></div>
                )}
              </div>
              {r.claimed
                ? <span className="small dim mono">+{r.reward}g</span>
                : done
                  ? <button className="btn btn-primary btn-sm" onClick={() => game.claimRequest(i)}>+{r.reward}g</button>
                  : <span className="small muted mono">{fmtNum(Math.floor(r.progress))}/{fmtNum(r.goal)}</span>}
            </div>
          );
        })}
        {allDone && !player.requests.bonusClaimed && (
          <button className="btn btn-primary btn-wide" onClick={() => game.claimRequestBonus()}>🎉 Claim bonus: {REQUEST_BONUS.map(stackText).join(' · ')}</button>
        )}
        {player.requests.bonusClaimed && <div className="small green center">All done for today — nice work! 🌙</div>}
      </div>
    </section>
  );
}

/** 🌟 A Lucky Star drifting across the screen. Tap it before it floats away! */
export function LuckyStar() {
  const { star } = useGame();
  if (!star) return null;
  return <StarSprite key={star.id} born={star.id} />;
}

function StarSprite({ born }: { born: number }) {
  // Worked out once, so later re-renders don't restart the drift.
  const [style] = useState(() => ({ animationDelay: `${-(Date.now() - born)}ms`, top: `${18 + (born % 5) * 5}%` }));
  return (
    <button className="lucky-star" data-silent aria-label="Catch the Lucky Star" style={style} onClick={() => game.catchStar()}>
      <span className="lucky-star-inner">🌟</span>
    </button>
  );
}

/** Tap your pet for hearts. */
export function PettablePet({ emoji, name }: { emoji: string; name: string }) {
  const [hearts, setHearts] = useState<{ id: number; x: number }[]>([]);
  const [wiggle, setWiggle] = useState(0);
  const pet = () => {
    game.petPet();
    const id = Date.now() + Math.random();
    setWiggle((w) => w + 1);
    setHearts((h) => [...h.slice(-6), { id, x: Math.round(Math.random() * 40 - 20) }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1200);
  };
  return (
    <button className="town-pet" onClick={pet} aria-label={`Pet ${name}`} data-silent>
      <span key={wiggle} className={`pet-emoji ${wiggle ? 'pet-wiggle' : 'bob'}`}>{emoji}</span>
      <span className="small">{name}</span>
      {hearts.map((h) => <span key={h.id} className="pet-heart" style={{ marginLeft: h.x }}>❤️</span>)}
    </button>
  );
}
