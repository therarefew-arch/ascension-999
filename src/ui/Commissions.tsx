// 📜 Commissions (v0.0.2.41): the Town card. Rules in core/commissions.ts.
import { getItem } from '../data/items';
import { SKILLS } from '../data/skills';
import { canDeliver, CLIENTS, commissionCoins, haveOf } from '../core/commissions';
import { game, useGame } from '../core/store';
import { FoldHead, useFold } from './Fold';
import { ItemIcon } from './icons';

export function CommissionsCard() {
  const { player } = useGame();
  const [open, toggle] = useFold('commissions', true);
  const c = player.commissions;
  if (!c || !c.list.length) return null;
  const ready = c.list.filter((x) => canDeliver(player, x)).length;
  const done = c.list.filter((x) => x.done).length;
  return (
    <section className="today-card cm-card">
      <FoldHead title="📜 COMMISSIONS" open={open} onToggle={toggle}
        summary={ready ? <b className="gold">{ready} ready to deliver!</b> : `${done}/${c.list.length} done today`} />
      {open && c.list.map((x, i) => {
        const who = CLIENTS[x.client];
        const ok = canDeliver(player, x);
        return (
          <div key={i} className={`cm-job ${x.done ? 'done' : ''}`}>
            <div className="cm-who">
              <span className="cm-emoji">{who.emoji}</span>
              <div className="grow"><b className="small">{who.name}</b><div className="tiny muted">“{who.line}”</div></div>
            </div>
            <div className="cm-asks">
              {x.asks.map((a) => {
                const have = haveOf(player, a.item);
                return (
                  <div key={a.item} className={`cm-ask ${have >= a.qty || x.done ? 'ok' : ''}`}>
                    <ItemIcon id={a.item} size={26} />
                    <span className="small grow">{a.qty.toLocaleString()} {getItem(a.item).name}<span className="tiny muted"> · {SKILLS[a.skill].name}</span></span>
                    <span className="mono tiny">{x.done ? '✓' : `${Math.min(have, a.qty).toLocaleString()}/${a.qty.toLocaleString()}`}</span>
                  </div>
                );
              })}
            </div>
            {x.done ? <p className="tiny gold cm-thanks">✓ Delivered — “Bless you, you’ve saved the day!”</p> : (
              <div className="row-between">
                <span className="tiny muted">Reward: 🪙 <b className="mono gold">{commissionCoins(x).toLocaleString()}</b> + bonus XP + a rare find</span>
                <button className="btn btn-sm btn-primary" disabled={!ok} onClick={() => game.deliverCommission(i)}>Deliver</button>
              </div>
            )}
          </div>
        );
      })}
      {open && <p className="tiny muted">New commissions every day. Goods come from your bag first, then your bank.</p>}
    </section>
  );
}
