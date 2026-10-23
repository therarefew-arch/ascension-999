// One skill: pick a resource, play its minigame, or set it to idle.
import { useEffect, useState } from 'react';
import type { SkillId } from '../../data/items';
import { actionsForSkill, SKILL_ORDER, SKILLS, type ActionDef } from '../../data/skills';
import { skillLevel } from '../../core/idle';
import { bestAction, timeToNextLevel } from '../../core/rates';
import { game, useGame } from '../../core/store';
import { levelProgress, MAX_LEVEL } from '../../core/xp';
import { ProgressBar } from '../components';
import { ItemIcon, UiIcon } from '../icons';
import { fmtDuration, fmtNum } from '../format';
import { AnvilRhythm, StrikeVein } from '../Minigames';
import { PixelScene } from '../PixelScene';

export function shortTime(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
}

/** Horizontal strip of skill tiles (like a hotbar). */
export function SkillStrip({ selected, onSelect }: { selected: SkillId; onSelect: (s: SkillId) => void }) {
  const { player } = useGame();
  return (
    <div className="skill-strip" role="tablist" aria-label="Skills">
      {SKILL_ORDER.map((s) => {
        const eta = timeToNextLevel(player, s);
        const idling = player.idle && actionsForSkill(s).some((a) => a.id === player.idle!.actionId);
        return (
          <button key={s} role="tab" aria-selected={selected === s} className={`skill-tile ${selected === s ? 'on' : ''}`} onClick={() => onSelect(s)}>
            {idling && <span className="tile-badge"><UiIcon name="clock" size={11} /></span>}
            <span className={`tile-icon skill-${s}`}><UiIcon name={s} size={20} /></span>
            <span className="tile-name">{SKILLS[s].name}</span>
            <span className="tile-lv">Lv {skillLevel(player, s)} <span className="tile-next">· {eta ? shortTime(eta.ms) : '—'}</span></span>
          </button>
        );
      })}
      <div className="skill-tile locked-tile" aria-hidden="true">
        <span className="tile-icon"><UiIcon name="lock" size={20} /></span>
        <span className="tile-name">More soon</span>
      </div>
    </div>
  );
}

export function SkillScreen({ skill }: { skill: SkillId }) {
  const { player } = useGame();
  const actions = actionsForSkill(skill);
  const lvl = skillLevel(player, skill);
  const prog = levelProgress(player.skills[skill].xp);
  const eta = timeToNextLevel(player, skill);
  const [selectedId, setSelectedId] = useState<string>(() => (bestAction(player, skill) ?? actions[0]).id);

  useEffect(() => {
    const idleHere = player.idle && actions.some((a) => a.id === player.idle!.actionId) ? player.idle.actionId : null;
    setSelectedId(idleHere ?? (bestAction(player, skill) ?? actions[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill]);

  const action = actions.find((a) => a.id === selectedId) ?? actions[0];
  useEffect(() => {
    document.querySelector('.res-chip.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [action.id]);
  const unlocked = lvl >= action.level;
  const idlingThis = player.idle?.actionId === action.id;

  return (
    <div className="skill-screen">
      <PixelScene scene={skill === 'mining' ? 'mine' : 'forge'} dim={0.6} className="screen-bg" />
      <div className="skill-top">
        <div className="mastery-row">
          <h1 className="mastery-title">{SKILLS[skill].name}</h1>
          <span className="mono muted">Lv {prog.level}<span className="dim">/{MAX_LEVEL}</span> ({Math.floor(prog.fraction * 100)}%)</span>
        </div>
        <ProgressBar value={prog.fraction} />
        <div className="mastery-sub mono">
          <span className="muted">{prog.maxed ? 'MAX' : `${fmtNum(prog.into)} / ${fmtNum(prog.needed)} XP`}</span>
          {eta && <span className="gold"><UiIcon name="clock" size={13} /> next lv {fmtDuration(eta.ms)}</span>}
        </div>
      </div>

      <div className="chip-row" role="tablist" aria-label="Resources">
        {actions.map((a: ActionDef) => {
          const locked = lvl < a.level;
          return (
            <button key={a.id} role="tab" aria-selected={a.id === action.id}
              className={`res-chip ${a.id === action.id ? 'on' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => setSelectedId(a.id)}>
              <ItemIcon id={a.iconItem} size={22} />
              <span>{a.name}</span>
              {locked && <span className="chip-lv">Lv{a.level}</span>}
              {player.idle?.actionId === a.id && <span className="chip-idle"><UiIcon name="clock" size={12} /></span>}
            </button>
          );
        })}
      </div>

      {unlocked ? (
        skill === 'mining' ? <StrikeVein action={action} /> : <AnvilRhythm action={action} />
      ) : (
        <div className="mg">
          <div className="mg-stage">
            <div className="mg-rock locked-art"><ItemIcon id={action.iconItem} size={72} /></div>
            <div className="mg-stage-name">{action.name}</div>
            <div className="mg-stage-xp"><UiIcon name="lock" size={14} /> Unlocks at {SKILLS[skill].name} level {action.level}</div>
          </div>
        </div>
      )}

      {unlocked && (
        <div className="idle-cta">
          {idlingThis ? (
            <button className="btn btn-stop btn-lg btn-wide" onClick={() => game.stopAction()}>
              <UiIcon name="stop" size={18} /> Stop idling {action.name}
            </button>
          ) : (
            <button className="btn btn-idle btn-lg btn-wide" onClick={() => game.startAction(action.id)}>
              <UiIcon name="clock" size={18} /> Idle this — keeps going while you're away
            </button>
          )}
        </div>
      )}
    </div>
  );
}
