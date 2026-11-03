// 🎪 Today's town happening on the Town screen (rules in core/happenings.ts).
import { useEffect } from 'react';
import type { SkillId } from '../data/items';
import { SKILLS } from '../data/skills';
import { getItem } from '../data/items';
import { happeningState, HAPPENING_XP, happeningOn, happeningPrize, whyCantClaimHappening } from '../core/happenings';
import { game, useGame } from '../core/store';
import { sound } from '../audio/sound';
import { fmtNum } from './format';
import { FoldHead, useFold } from './Fold';

export function HappeningCard({ onSkill }: { onSkill: (s: SkillId) => void }) {
  const { player } = useGame();
  useEffect(() => { game.ensureRequests(); }, []);
  const [open, toggle] = useFold('happening', true);
  const h = happeningOn(player);
  if (!h) return null;
  // Read-only view of today's progress (the store makes it fresh each day).
  const st = happeningState(player);
  if (!st) return null;
  const here = !player.travel && player.location === h.town;
  const done = st.progress >= st.goal;
  const why = whyCantClaimHappening(player);
  const prize = happeningPrize(player, h);
  const tomorrow = happeningOn(player, Date.now() + 86_400_000);
  const skill = SKILLS[h.skill].name;
  return (
    <section className={`today-card hp-card ${here ? 'here' : ''}`}>
      <FoldHead title="🎪 HAPPENING" open={open} onToggle={toggle}
        summary={!why ? <b className="gold">🎁 Prize ready!</b> : open ? (here ? 'Here today!' : `in ${h.town}`)
          : <>{h.emoji} {st.claimed ? '✅' : `${Math.floor(Math.min(100, (st.progress / st.goal) * 100))}%`} · {here ? 'here' : h.town}</>} />
      {open && <>
      <div className="hp-main">
        <span className="hp-emoji bob">{h.emoji}</span>
        <div className="grow">
          <b>{h.name}</b>
          <div className="small muted">{h.blurb}</div>
        </div>
      </div>
      <div className="hp-chips">
        <span className="boost-chip hap">{h.emoji} +{Math.round(HAPPENING_XP * 100)}% {skill} XP all day</span>
        <span className="small dim">Prize: {prize.map((p) => (p.id === 'coins' ? `${fmtNum(p.qty)} coins` : `${getItem(p.id).emoji ?? ''} ${getItem(p.id).name}`)).join(' + ')}</span>
      </div>
      {st.claimed ? (
        <div className="gift-done small muted">✅ Prize collected from {h.host}.</div>
      ) : (
        <>
          <div className="hp-prog">
            <div className="small">{done ? <>🎉 You joined in! </> : <>Join in — earn {skill} XP: </>}<span className="mono">{fmtNum(Math.floor(st.progress))} / {fmtNum(st.goal)}</span></div>
            <div className="bar bar-thin"><div className="bar-fill tone-gold" style={{ width: `${Math.min(100, (st.progress / st.goal) * 100)}%` }} /></div>
          </div>
          {!why ? (
            <button className="btn btn-primary hp-claim" onClick={() => game.claimHappening()}>🎁 Collect your prize from {h.host}</button>
          ) : done ? (
            <div className="small gold">🎁 Your prize waits in {h.town} — travel there to collect it.</div>
          ) : (
            <button className="btn hp-go" onClick={() => { sound.play('click'); onSkill(h.skill); }}>Go to {skill} ›</button>
          )}
        </>
      )}
      {tomorrow && <div className="small dim">Tomorrow: {tomorrow.emoji} {tomorrow.name} in {tomorrow.town}</div>}
      </>}
    </section>
  );
}

