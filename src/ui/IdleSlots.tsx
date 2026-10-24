// "Idle skill slots" popup: up to 3 slots, each running its own skill (or one fight).
// Change any slot (skill → resource), see per-hour rates, and unlock more slots.
import { useState } from 'react';
import type { SkillId } from '../data/items';
import { ACTIONS, ALL_SKILLS, SKILL_ORDER, SKILLS, type ActionDef } from '../data/skills';
import { actionDuration, skillLevel } from '../core/idle';
import { fightMonster, isFightId } from '../core/combat';
import { MAX_IDLE_SLOTS, type PlayerState } from '../core/player';
import { visibleActions, xpPerHour } from '../core/rates';
import { game, useGame } from '../core/store';
import { SLOT_UNLOCKS } from '../market/market';
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

function SlotCard({ index, onChange }: { index: number; onChange: () => void }) {
  const { player } = useGame();
  const slot = player.slots[index];
  const action = slot ? ACTIONS[slot.actionId] : null;
  const fighting = slot && isFightId(slot.actionId);
  return (
    <div className="slot-card">
      <div className="row">
        {action ? <ItemIcon id={action.iconItem} size={36} /> : <span className="slot-empty-icon"><UiIcon name={fighting ? 'combat' : 'clock'} size={20} /></span>}
        <div className="grow">
          <div className="slot-title">Slot {index + 1}: <span className="gold">{action ? SKILLS[action.skill].name : fighting ? 'Combat' : 'Empty'}</span></div>
          <div className="small muted">
            {action ? `${SKILLS[action.skill].verb} ${action.name.toLowerCase()}` : fighting ? `Fighting ${fightMonster(slot!.actionId).name} · ${player.fight?.kills ?? 0} kills` : 'Pick a skill to idle'}
          </div>
        </div>
        <button className="btn btn-outline" onClick={onChange}>{slot ? 'CHANGE' : 'CHOOSE'}</button>
      </div>
      {action && (
        <>
          <div className="rate-box mono">
            <span className="muted">Per hour:</span>
            <Rates player={player} action={action} />
          </div>
          <div className="mono small row-between"><span className="muted">Next drop:</span></div>
          <ActionProgress player={player} slot={index} />
        </>
      )}
      {slot && (
        <button className="btn btn-stop btn-wide" onClick={() => (fighting ? game.stopFight() : game.stopAction(index))}>
          <UiIcon name="stop" size={16} /> Stop
        </button>
      )}
    </div>
  );
}

function LockedSlot({ index }: { index: number }) {
  const { player } = useGame();
  const unlock = SLOT_UNLOCKS[index];
  const isNext = index === player.unlockedSlots;
  const total = ALL_SKILLS.reduce((sum, s) => sum + skillLevel(player, s), 0);
  const free = total >= unlock.level;
  return (
    <div className="slot-card locked">
      <div className="row">
        <UiIcon name="lock" size={20} />
        <span className="grow">Slot {index + 1} (Locked)</span>
        <span className="mono small gold">Lv {unlock.level} or {fmtNum(unlock.coins)}g</span>
      </div>
      {isNext && (
        <button className="btn btn-hero btn-wide" onClick={() => game.unlockSlot()} disabled={!free && player.coins < unlock.coins}>
          {free ? 'UNLOCK (total level reached!)' : `UNLOCK FOR ${fmtNum(unlock.coins)} COINS`}
        </button>
      )}
      {!isNext && <p className="small muted">Unlock slot {index} first.</p>}
    </div>
  );
}

export function IdleSlots({ onClose }: { onClose: () => void }) {
  const { player } = useGame();
  const [editing, setEditing] = useState<number | null>(null);
  const [step, setStep] = useState<'skill' | SkillId>('skill');

  const choose = (i: number) => { setEditing(i); setStep('skill'); };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel-modal" role="dialog" aria-modal="true" aria-labelledby="idle-title" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span className="panel-icon"><UiIcon name="clock" size={26} /></span>
          <div className="grow">
            <h2 id="idle-title" className="panel-title">IDLE SKILL SLOTS</h2>
            <div className="small muted">Each slot runs its own skill · one fight at a time</div>
          </div>
          <button className="icon-btn round" onClick={onClose} aria-label="Close"><UiIcon name="close" /></button>
        </div>

        {editing === null && (
          <>
            {Array.from({ length: MAX_IDLE_SLOTS }, (_, i) => (
              i < player.unlockedSlots ? <SlotCard key={i} index={i} onChange={() => choose(i)} /> : <LockedSlot key={i} index={i} />
            ))}
            {player.lastStop && <div className="warn">Last stopped: {player.lastStop.reason}</div>}
          </>
        )}

        {editing !== null && step === 'skill' && (
          <>
            <div className="row-between step-head"><b>Slot {editing + 1} · Step 1 — choose skill</b><button className="link-btn" onClick={() => setEditing(null)}>‹ Slots</button></div>
            <div className="list scroll-list">
              {SKILL_ORDER.map((s) => (
                <button key={s} className="list-row" onClick={() => setStep(s)}>
                  <span className={`tile-icon skill-${s}`}><UiIcon name={s} size={22} /></span>
                  <div className="grow"><b>{SKILLS[s].name}</b> <span className="small muted">Lv {skillLevel(player, s)}</span></div>
                  <span className="gold">›</span>
                </button>
              ))}
              <p className="small muted">To fight, pick a monster on the Combat tab.</p>
            </div>
          </>
        )}

        {editing !== null && step !== 'skill' && (
          <>
            <div className="row-between step-head"><b>Slot {editing + 1} · {SKILLS[step].name}: choose resource</b><button className="link-btn" onClick={() => setStep('skill')}>‹ Skills</button></div>
            <div className="list scroll-list">
              {visibleActions(player, step).map((a) => {
                const locked = skillLevel(player, step) < a.level;
                return (
                  <button key={a.id} className={`list-row ${locked ? 'locked' : ''}`} disabled={locked}
                    onClick={() => { game.startAction(a.id, editing); setEditing(null); }}>
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
