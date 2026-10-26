// 🌋 Cinderpeak's card on the Town screen: the volcano event, the hot springs, and the Traveller's gift at the well.
import { useEffect, useState } from 'react';
import { EMBER_GEODE_CHANCE, HOT_SPRING_MULT, mountainStirs, STIR_XP_MULT, travellerGiftWaiting } from '../core/cinderpeak';
import { maxHp } from '../core/combat';
import { game, useGame } from '../core/store';
import { fmtDuration } from './format';

/** Ticks once a second so the countdowns stay live. */
function useClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

export function CinderpeakCard({ onMining }: { onMining: () => void }) {
  const { player } = useGame();
  const now = useClock();
  const stir = mountainStirs(now);
  const gift = travellerGiftWaiting(player);
  const max = maxHp(player);
  const atTime = new Date(stir.nextAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <section className={`cp-card ${stir.active ? 'stirring' : ''}`}>
      <h2 className="section-title">🌋 THE MOUNTAIN STIRS</h2>
      {stir.active ? (
        <>
          <p className="small"><b>The ground is rumbling!</b> For the next <b className="mono">{fmtDuration(stir.endsAt - now)}</b>, mining Emberite here gives <b>×{STIR_XP_MULT} XP</b> and shakes loose ember geodes (about 1 in {Math.round(1 / EMBER_GEODE_CHANCE)}).</p>
          <button className="btn btn-fire btn-wide" onClick={onMining}>⛏️ Go to The Glowing Vents</button>
        </>
      ) : (
        <p className="small muted">The volcano is snoring. Every 3 hours it stirs for 15 minutes — Emberite gives double XP and ember geodes tumble out. Next rumble at <b className="mono">{atTime}</b> (in {fmtDuration(stir.nextAt - now)}).</p>
      )}
      <div className="cp-row">
        <span className="cp-emoji">♨️</span>
        <div className="grow">
          <b>Hot springs</b>
          <div className="small muted">While you're in Cinderpeak and not fighting, you heal {HOT_SPRING_MULT}× faster.{player.hp < max ? ` (${player.hp}/${max} HP)` : ' You feel wonderful.'}</div>
        </div>
      </div>
      {gift && (
        <button className="cp-gift" onClick={() => game.takeTravellerGift()}>
          <span className="cp-emoji">🎁</span>
          <span className="grow"><b>Something is tucked behind the well…</b><span className="small muted">A parcel, wrapped in a faded travelling cloak. Tap to look.</span></span>
        </button>
      )}
    </section>
  );
}
