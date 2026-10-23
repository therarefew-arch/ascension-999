import { getItem, type SkillId } from '../../data/items';
import { actionsForSkill, SKILL_ORDER, SKILLS, type ActionDef } from '../../data/skills';
import { actionDuration, skillLevel } from '../../core/idle';
import { countInBag } from '../../core/inventory';
import type { PlayerState } from '../../core/player';
import { timeToNextLevel } from '../../core/rates';
import { game, useGame } from '../../core/store';
import { levelProgress, MAX_LEVEL } from '../../core/xp';
import { ActionProgress, ProgressBar } from '../components';
import { ItemIcon, UiIcon } from '../icons';
import { fmtDuration, fmtNum, fmtSeconds } from '../format';

export function SkillHeader({ player, skill }: { player: PlayerState; skill: SkillId }) {
  const prog = levelProgress(player.skills[skill].xp);
  const eta = timeToNextLevel(player, skill);
  return (
    <div className="skill-head">
      <div className="skill-head-top">
        <span className={`skill-badge skill-${skill}`}><UiIcon name={skill} size={22} /></span>
        <div className="grow">
          <div className="skill-name">{SKILLS[skill].name}</div>
          <div className="small muted">{prog.maxed ? 'Max level!' : `${fmtNum(prog.into)} / ${fmtNum(prog.needed)} XP`}</div>
        </div>
        <div className="level-num"><span className="small muted">Lv</span> {prog.level}<span className="small muted">/{MAX_LEVEL}</span></div>
      </div>
      <ProgressBar value={prog.fraction} />
      {eta && (
        <div className="small eta">
          <UiIcon name="clock" size={14} /> Next level in <b>{fmtDuration(eta.ms)}</b>
          <span className="muted"> {eta.current ? '(at current pace)' : `(doing ${eta.action.name})`}</span>
        </div>
      )}
    </div>
  );
}

export function SkillsScreen({ onOpen }: { onOpen: (s: SkillId) => void }) {
  const { player } = useGame();
  return (
    <div className="screen">
      <h1 className="screen-title">Skills</h1>
      {SKILL_ORDER.map((s) => (
        <button key={s} className="card card-btn" onClick={() => onOpen(s)}>
          <SkillHeader player={player} skill={s} />
          {player.idle && player.idle.actionId.length > 0 && actionsForSkill(s).some((a) => a.id === player.idle!.actionId) && (
            <div className="small good-text">● Active now</div>
          )}
        </button>
      ))}
      <p className="small muted center">More skills arrive in future updates.</p>
    </div>
  );
}

function ActionCard({ player, action }: { player: PlayerState; action: ActionDef }) {
  const lvl = skillLevel(player, action.skill);
  const locked = lvl < action.level;
  const active = player.idle?.actionId === action.id;
  const dur = actionDuration(player, action);

  if (locked) {
    return (
      <div className="action-card locked">
        <div className="action-icon"><ItemIcon id={action.iconItem} size={40} /></div>
        <div className="grow">
          <div className="action-name">{action.name}</div>
          <div className="small muted"><UiIcon name="lock" size={13} /> Unlocks at level {action.level}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`action-card ${active ? 'active' : ''}`}>
      <button className="action-main" onClick={() => !active && game.startAction(action.id)} aria-pressed={active}>
        <div className="action-icon"><ItemIcon id={action.iconItem} size={40} /></div>
        <div className="grow">
          <div className="action-name">{action.name}</div>
          <div className="action-meta small">
            <span><UiIcon name="clock" size={13} /> {fmtSeconds(dur)}</span>
            <span className="xp">+{action.xp} XP</span>
            <span className="muted">Lv {action.level}</span>
          </div>
          {action.inputs.length > 0 && (
            <div className="inputs small">
              {action.inputs.map((inp) => {
                const have = countInBag(player.inventory, inp.item);
                return (
                  <span key={inp.item} className={`input ${have < inp.qty ? 'bad-text' : ''}`}>
                    <ItemIcon id={inp.item} size={18} /> {inp.qty}× {getItem(inp.item).name} <span className="muted">({fmtNum(have)} in bag)</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {!active && <span className="start-pill">Start</span>}
      </button>
      {active && (
        <div className="action-active">
          <ActionProgress player={player} />
          <button className="btn btn-stop" onClick={() => game.stopAction()}><UiIcon name="stop" size={18} /> Stop</button>
        </div>
      )}
    </div>
  );
}

export function SkillDetail({ skill, onBack }: { skill: SkillId; onBack: () => void }) {
  const { player } = useGame();
  const actions = actionsForSkill(skill);
  const groups = Array.from(new Set(actions.map((a) => a.group)));
  return (
    <div className="screen">
      <button className="back-btn" onClick={onBack}>‹ All skills</button>
      <div className="card"><SkillHeader player={player} skill={skill} /></div>
      <p className="small muted">{SKILLS[skill].description} Tap something to start. You can do one thing at a time.</p>
      {skill === 'smithing' && <p className="small muted">Smithing uses ores and bars from your <b>bag</b>.</p>}
      {groups.map((g) => (
        <section key={g}>
          <h2 className="group-title">{g}</h2>
          {actions.filter((a) => a.group === g).map((a) => <ActionCard key={a.id} player={player} action={a} />)}
        </section>
      ))}
    </div>
  );
}
