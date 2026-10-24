// "Welcome back" summary shown after time away.
import { getItem } from '../data/items';
import { ACTIONS, SKILLS } from '../data/skills';
import { game, type AwayReport } from '../core/store';
import { OFFLINE_CAP_MS } from '../core/player';
import { fightMonster, isFightId } from '../core/combat';
import { ItemIcon } from './icons';
import { fmtDuration, fmtNum } from './format';

export function AwayCard({ away }: { away: AwayReport }) {
  const { report } = away;
  const doing = report.actionIds.map((id) => (isFightId(id) ? `fighting ${fightMonster(id).name}` : ACTIONS[id] ? `${SKILLS[ACTIONS[id].skill].verb.toLowerCase()} ${ACTIONS[id].name}` : '')).filter(Boolean);
  const gained = Object.entries(report.gained);
  const used = Object.entries(report.used);
  const capped = away.awayMs > OFFLINE_CAP_MS;

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="away-title">
        <h2 id="away-title">Welcome back!</h2>
        <p className="muted">You were away for <b>{fmtDuration(away.awayMs)}</b>.</p>
        {doing.length > 0 && <p>You were <b>{doing.join(', ')}</b></p>}

        {Object.entries(report.xp).map(([skill, xp]) => (
          <div key={skill} className="away-line xp">+{fmtNum(xp ?? 0)} {SKILLS[skill as keyof typeof SKILLS].name} XP</div>
        ))}
        {report.levelUps.map((l) => (
          <div key={l.skill} className="away-line level">{SKILLS[l.skill].name} level {l.from} → {l.to}!</div>
        ))}

        {gained.length > 0 && (
          <div className="away-items">
            {gained.map(([id, n]) => (
              <div key={id} className="away-item good"><ItemIcon id={id} size={28} /> +{fmtNum(n)} {getItem(id).name}</div>
            ))}
            {used.map(([id, n]) => (
              <div key={id} className="away-item used"><ItemIcon id={id} size={28} /> −{fmtNum(n)} {getItem(id).name}</div>
            ))}
          </div>
        )}
        {report.combat && (
          <div className="away-line">⚔ {report.combat.kills} monsters defeated · {report.combat.damageDealt} damage dealt{report.combat.foodEaten ? ` · ${report.combat.foodEaten} food eaten` : ''}</div>
        )}
        {report.failed > 0 && <p className="small muted">{report.failed} enhance {report.failed === 1 ? 'try' : 'tries'} didn't take (items kept safe).</p>}
        {report.actions === 0 && !report.stopped && <p className="muted">Nothing finished while you were gone.</p>}

        {report.stops.map((s, k) => (
          <div key={k} className="warn">
            {report.stops.length > 1 && <b>{isFightId(s.actionId) ? 'Combat' : ACTIONS[s.actionId]?.name}: </b>}
            Stopped after <b>{fmtDuration(s.afterMs)}</b>: {s.reason}.
          </div>
        ))}
        {capped && <p className="small muted">Offline progress counts up to 24 hours.</p>}

        <button className="btn btn-primary btn-lg btn-wide" onClick={() => game.dismissAway()}>Collect</button>
      </div>
    </div>
  );
}
