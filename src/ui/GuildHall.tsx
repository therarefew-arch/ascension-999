// 🏰 The Guild Hall card (v0.0.2.22, Guild tab): the room being built, three bars (the guild's total + your share),
// tap a bar to give things from your bag and bank, and the rooms already finished with their bonuses.
import { useState } from 'react';
import { SKILLS } from '../data/skills';
import { getItem } from '../data/items';
import { HALL_ROOMS, type HallRoom } from '../data/guildHall';
import { game } from '../core/store';
import type { PlayerState } from '../core/player';
import type { FamilyBoard } from '../core/family';
import { donatable, hallView, perkText } from '../core/guildHall';
import { ItemIcon } from './icons';
import { FoldHead, useFold } from './Fold';

const pctOf = (n: number, need: number) => Math.min(100, need ? (n / need) * 100 : 0);

export function GuildHallCard({ board, player }: { board: FamilyBoard | null; player: PlayerState }) {
  const [open, toggle] = useFold('guildhall', true);
  const [pick, setPick] = useState<number | null>(null);
  const v = hallView(player, board);
  if (!v) return null;
  const done = HALL_ROOMS.slice(0, v.built);
  const room = v.room;
  const overall = room ? Math.floor((v.total.reduce((s, t) => s + Math.min(t, v.need), 0) / (v.need * 3)) * 100) : 100;
  return (
    <section className="card gh-card">
      <FoldHead title="🏰 GUILD HALL" open={open} onToggle={toggle}
        summary={room ? <>{room.emoji} {overall}%</> : '✨ All built!'} />
      {open && <>
        {room ? (
          <>
            <div className="gh-room">
              <span className="gh-emoji">{room.emoji}</span>
              <div className="grow">
                <b>Room {v.built + 1} of {HALL_ROOMS.length}: {room.name}</b>
                <div className="small muted">{room.blurb}</div>
                <div className="small gold">When it's done: {perkText(room)} for everyone in the guild</div>
              </div>
            </div>
            {room.needs.map((skill, i) => {
              const full = v.total[i] >= v.need;
              return (
                <div key={skill} className="gh-need">
                  <button className={`gh-bar-btn ${pick === i ? 'on' : ''}`} disabled={full} onClick={() => setPick(pick === i ? null : i)}>
                    <div className="row-between small">
                      <b>{SKILLS[skill].name} goods</b>
                      <span className="mono">{full ? '✓ done' : `${Math.floor(pctOf(v.total[i], v.need))}%`}</span>
                    </div>
                    <div className="gh-bar">
                      <div className="gh-fill" style={{ width: `${pctOf(v.total[i], v.need)}%` }} />
                      <div className="gh-mine" style={{ width: `${pctOf(v.mine[i], v.need)}%` }} />
                    </div>
                    {!full && <div className="tiny muted">{v.mine[i] ? `You've given ${Math.floor(pctOf(v.mine[i], v.need))}% · ` : ''}tap to give</div>}
                  </button>
                  {pick === i && !full && <GivePicker player={player} room={room} i={i} />}
                </div>
              );
            })}
            <p className="tiny muted">Every log, bar, fish or meal counts as the time it took to make, so everyone's help counts the same whatever their level. You get a few coins and a little XP back.</p>
          </>
        ) : <p className="small">Every room is built — your guild's hall is complete. 🎉</p>}
        {done.length > 0 && (
          <div className="gh-done">
            {done.map((r) => <span key={r.id} className="gh-done-chip" title={perkText(r)}>{r.emoji} {r.name} · {perkText(r)}</span>)}
          </div>
        )}
      </>}
    </section>
  );
}

function GivePicker({ player, room, i }: { player: PlayerState; room: HallRoom; i: number }) {
  const list = donatable(player, room, i);
  if (!list.length) return <p className="small muted gh-none">You don't have any {SKILLS[room.needs[i]].name} goods in your bag or bank right now.</p>;
  return (
    <div className="gh-give">
      {list.map(({ id, qty, good }) => (
        <div key={id} className="gh-give-row">
          <ItemIcon id={id} size={28} />
          <div className="grow">
            <b className="small">{getItem(id).name}</b>
            <div className="tiny muted"><span className="mono">{qty.toLocaleString()}</span> owned · {good.pts} pts each</div>
          </div>
          {qty >= 10 && <button className="btn btn-sm" onClick={() => game.hallDonate(i, id, 10)}>10</button>}
          <button className="btn btn-sm btn-primary" onClick={() => game.hallDonate(i, id, qty)}>All</button>
        </div>
      ))}
    </div>
  );
}
