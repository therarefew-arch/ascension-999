// "Idle skill slots" popup: see what's idling, its per-hour rates, and change it (skill → resource).
import { useState } from 'react';
import type { SkillId } from '../data/items';
import { ACTIONS, SKILL_ORDER, SKILLS, type ActionDef } from '../data/skills';
import { actionDuration, skillLevel } from '../core/idle';
import type { PlayerState } from '../core/player';
import { visibleActions, xpPerHour } from '../core/rates';
import { fightMonster, isFightId } from '../core/combat';
import { game, useGame } from '../core/store';
import { ActionProgress } from './components';
import { ItemIcon, UiIcon } from './icons';
import { fmtNum } from './format';

function itemsPerHour(p: PlayerState, a: ActionDef) {
  return 3_600_000 / actionDuration(p, a);
}

function Rates({ player, action }: { player: PlayerState; action: ActionDef }) {
  return (
    <span className="mono rates">
      <span className="green">{fmtNum(xpPerHour(player, action))} XP/hr</span>
      <span className="dim"> · </span>
      <span className="gold">{fmtNum(itemsPerHour(player, action))} items/hr</span>
    </span>
  );
}

export function IdleSlots({ onClose }: { onClose: () => void }) {
  const { player } = useGame();
  const [step, setStep] = useState<'slots' | 'skill' | SkillId>('slots');
  const action = player.idle ? ACTIONS[player.idle.actionId] : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel-modal" role="dialog" aria-modal="true" aria-labelledby="idle-title" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span className="panel-icon"><UiIcon name="clock" size={26} /></span>
          <div className="grow">
            <h2 id="idle-title" className="panel-title">IDLE SKILL SLOTS</h2>
            <div className="small muted">Skill → resource · change anytime, progress kept</div>
          </div>
          <button className="icon-btn round" onClick={onClose} aria-label="Close"><UiIcon name="close" /></button>
        </div>

        {step === 'slots' && (
          <>
            <div className="slot-card">
              <div className="row">
                {action ? <ItemIcon id={action.iconItem} size={36} /> : <span className="slot-empty-icon"><UiIcon name="clock" size={20} /></span>}
                <div className="grow">
                  <div className="slot-title">Slot 1: <span className="gold">{action ? SKILLS[action.skill].name : player.idle ? 'Combat' : 'Empty'}</span></div>
                  <div className="small muted">{action ? `${SKILLS[action.skill].verb} ${action.name.toLowerCase()}` : 'Pick a skill to idle'}</div>
                </div>
                <button className="btn btn-outline" onClick={() => setStep('skill')}>{action ? 'CHANGE' : 'CHOOSE'}</button>
              </div>
              {action && (
                <>
                  <div className="rate-box mono">
                    <span className="muted">Per hour:</span>
                    <Rates player={player} action={action} />
                  </div>
                  <div className="mono small row-between"><span className="muted">Next drop:</span></div>
                  <ActionProgress player={player} />
                  <button className="btn btn-stop btn-wide" onClick={() => game.stopAction()}><UiIcon name="stop" size={16} /> Stop</button>
                </>
              )}
              {!action && player.idle && isFightId(player.idle.actionId) && (
                <>
                  <div className="warn fight-note">⚔ Fighting {fightMonster(player.idle.actionId).name} — {player.fight?.kills ?? 0} kills so far. Fights count as your idle and keep going while you're away (except mini bosses).</div>
                  <button className="btn btn-stop btn-wide" onClick={() => game.stopFight()}><UiIcon name="stop" size={16} /> Stop fighting</button>
                </>
              )}
              {!action && !player.idle && player.lastStop && (
                <div className="warn">Last stopped: {player.lastStop.reason}</div>
              )}
            </div>
            <div className="slot-card locked">
              <div className="row"><UiIcon name="lock" size={20} /><span className="grow">Slot 2</span><span className="small muted">Coming in a later update</span></div>
            </div>
            <div className="slot-card locked">
              <div className="row"><UiIcon name="lock" size={20} /><span className="grow">Slot 3</span><span className="small muted">Coming in a later update</span></div>
            </div>
          </>
        )}

        {step === 'skill' && (
          <>
            <div className="row-between step-head"><b>Step 1 — choose skill</b><button className="link-btn" onClick={() => setStep('slots')}>‹ Slots</button></div>
            <div className="list">
              {SKILL_ORDER.map((s) => (
                <button key={s} className="list-row" onClick={() => setStep(s)}>
                  <span className={`tile-icon skill-${s}`}><UiIcon name={s} size={22} /></span>
                  <div className="grow"><b>{SKILLS[s].name}</b> <span className="small muted">Lv {skillLevel(player, s)}</span></div>
                  <span className="gold">›</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step !== 'slots' && step !== 'skill' && (
          <>
            <div className="row-between step-head"><b>Step 2 — {SKILLS[step].name}: choose resource</b><button className="link-btn" onClick={() => setStep('skill')}>‹ Skills</button></div>
            <div className="list scroll-list">
              {visibleActions(player, step).map((a) => {
                const locked = skillLevel(player, step) < a.level;
                return (
                  <button key={a.id} className={`list-row ${locked ? 'locked' : ''}`} disabled={locked}
                    onClick={() => { game.startAction(a.id); setStep('slots'); }}>
                    {locked ? <span className="lock-icon"><UiIcon name="lock" size={20} /></span> : <ItemIcon id={a.iconItem} size={36} />}
                    <div className="grow">
                      <div><b>{a.name}</b> <span className="small muted">Lv {a.level}</span></div>
                      <Rates player={player} action={a} />
                    </div>
                    {!locked && <span className="gold">›</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <p className="small muted center panel-foot">Idle rewards gather even while you browse menus — or close the app.</p>
      </div>
    </div>
  );
}
