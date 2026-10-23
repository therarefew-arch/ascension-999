// "Welcome back" summary shown after time away.
import { getItem } from '../data/items';
import { ACTIONS, SKILLS } from '../data/skills';
import { game, type AwayReport } from '../core/store';
import { OFFLINE_CAP_MS } from '../core/player';
import { ItemIcon } from './icons';
import { fmtDuration, fmtNum } from './format';

export function AwayCard({ away }: { away: AwayReport }) {
  const { report } = away;
  const action = report.actionId ? ACTIONS[report.actionId] : null;
  const gained = Object.entries(report.gained);
  const used = Object.entries(report.used);
  const capped = away.awayMs > OFFLINE_CAP_MS;

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="away-title">
        <h2 id="away-title">Welcome back!</h2>
        <p className="muted">You were away for <b>{fmtDuration(away.awayMs)}</b>.</p>
        {action && <p>You were {SKILLS[action.skill].verb.toLowerCase()}: <b>{action.name}</b></p>}

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
        {report.actions === 0 && !report.stopped && <p className="muted">Nothing finished while you were gone.</p>}

        {report.stopped && (
          <div className="warn">
            Stopped after <b>{fmtDuration(report.stopped.afterMs)}</b>: {report.stopped.reason}.
          </div>
        )}
        {capped && <p className="small muted">Offline progress counts up to 24 hours.</p>}

        <button className="btn btn-primary btn-lg btn-wide" onClick={() => game.dismissAway()}>Collect</button>
      </div>
    </div>
  );
}
