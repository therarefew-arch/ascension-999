// One skill: pick a resource, play its minigame, or set it to idle.
import { useEffect, useState } from 'react';
import type { SkillId } from '../../data/items';
import { ACTIONS, actionsForSkill, SKILL_ORDER, SKILLS, tabsForSkill, type ActionDef } from '../../data/skills';
import { getItem } from '../../data/items';
import { skillLevel, slotOf, whyCantDo } from '../../core/idle';
import { countInBag } from '../../core/inventory';
import type { PlayerState } from '../../core/player';
import { bestAction, timeToNextLevel, visibleActions } from '../../core/rates';
import { game, useGame } from '../../core/store';
import { levelProgress, MAX_LEVEL } from '../../core/xp';
import { ProgressBar } from '../components';
import { ItemIcon, UiIcon, type UiIconName } from '../icons';
import { fmtDuration, fmtNum } from '../format';
import { AnvilRhythm, StrikeVein } from '../Minigames';
import { Chop, HeatPrecision, RuneAlign, RuneTrace, SteadyHands } from '../Minigames2';
import { FiremakingGames } from '../Wildfire';
import { FishingGames } from '../TileMatch';
import { PixelScene, type SceneName } from '../PixelScene';

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
        const idling = player.slots.some((sl) => sl && actionsForSkill(s).some((a) => a.id === sl.actionId));
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

const SCENES: Partial<Record<SkillId, SceneName>> = {
  mining: 'mine', smithing: 'forge', woodcutting: 'forest', firemaking: 'camp',
  fishing: 'river', cooking: 'kitchen', crafting: 'workshop', enhancing: 'tower', runecrafting: 'altar',
};

const MINIGAMES: Partial<Record<SkillId, (p: { action: ActionDef }) => JSX.Element>> = {
  mining: StrikeVein, smithing: AnvilRhythm, woodcutting: Chop, firemaking: FiremakingGames,
  fishing: FishingGames, cooking: HeatPrecision, crafting: SteadyHands, enhancing: RuneAlign, runecrafting: RuneTrace,
};

const TAB_ICONS: Record<string, UiIconName> = {
  Smelt: 'firemaking', Weapons: 'sword', Armour: 'shield', Tools: 'crafting', Upgrades: 'up',
  Ammo: 'ammo', Talismans: 'gem', Runes: 'runecrafting', Staffs: 'magic',
};

/** A list of recipes with what you have vs. what you need (Smithing, Crafting). */
function RecipeList({ player, actions, selected, onSelect }: {
  player: PlayerState; actions: ActionDef[]; selected: string; onSelect: (id: string) => void;
}) {
  const lvl = actions[0] ? skillLevel(player, actions[0].skill) : 0;
  return (
    <div className="recipe-list">
      {actions.map((a) => {
        const locked = lvl < a.level;
        // The input that limits how many you can make.
        const needs = a.inputs.filter((i) => i.item !== a.upgrades);
        const limiting = needs.reduce<{ have: number; qty: number; n: number } | null>((best, i) => {
          const have = countInBag(player.inventory, i.item);
          const n = Math.floor(have / i.qty);
          return !best || n < best.n ? { have, qty: i.qty, n } : best;
        }, null);
        const enough = !limiting || limiting.n > 0;
        const toolProblem = !locked ? whyCantDo(player, a)?.startsWith('Equip a') : false;
        return (
          <button key={a.id} className={`recipe ${a.id === selected ? 'on' : ''} ${locked ? 'locked' : ''}`} onClick={() => onSelect(a.id)}>
            <ItemIcon id={a.iconItem} size={36} />
            <div className="grow">
              <div className="recipe-name">{a.name}{slotOf(player, a.id) >= 0 && <span className="chip-idle"> <UiIcon name="clock" size={12} /></span>}</div>
              <div className="recipe-sub">{needs.map((i) => `${i.qty}× ${getItem(i.item).name}`).join(' + ')}</div>
            </div>
            <div className="recipe-right mono">
              {limiting && <span className={enough ? 'green' : 'red'}>{fmtNum(limiting.have)}/{limiting.qty}</span>}
              {locked && <span className="dim small">Lv {a.level}</span>}
              {!locked && toolProblem && <span className="red small">needs tool</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function SkillScreen({ skill }: { skill: SkillId }) {
  const { player } = useGame();
  const allActions = visibleActions(player, skill);
  const tabs = tabsForSkill(skill);
  const lvl = skillLevel(player, skill);
  const prog = levelProgress(player.skills[skill].xp);
  const eta = timeToNextLevel(player, skill);
  // Skills with tabs open on their first tab; others on the best resource you can do.
  const defaultId = () => (tabs.length
    ? (allActions.find((a) => a.tab === tabs[0] && a.level <= skillLevel(player, skill)) ?? allActions.find((a) => a.tab === tabs[0]))
    : (bestAction(player, skill) ?? allActions[0]))?.id ?? '';
  const [selectedId, setSelectedId] = useState<string>(defaultId);
  const [tab, setTab] = useState<string>(() => ACTIONS[defaultId()]?.tab ?? tabs[0] ?? '');

  useEffect(() => {
    const idleHere = player.slots.find((sl) => sl && allActions.some((a) => a.id === sl.actionId))?.actionId ?? null;
    const id = idleHere ?? defaultId();
    setSelectedId(id);
    setTab(ACTIONS[id]?.tab ?? tabs[0] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill]);

  const actions = tabs.length ? allActions.filter((a) => a.tab === tab) : allActions;

  // After an upgrade succeeds, follow the item to its next upgrade step.
  let action = actions.find((a) => a.id === selectedId);
  if (!action && ACTIONS[selectedId]?.output) {
    const made = ACTIONS[selectedId].output!.item;
    action = actions.find((a) => a.upgrades === made);
  }
  action = action ?? actions.find((a) => a.level <= lvl) ?? actions[0];
  const actionId = action?.id ?? '';
  useEffect(() => {
    if (actionId && actionId !== selectedId) setSelectedId(actionId);
    document.querySelector('.res-chip.on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionId]);

  const tabRow = tabs.length > 0 && (
    <div className="tab-row" role="tablist">
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={t === tab} className={`tab-pill ${t === tab ? 'on' : ''}`}
          onClick={() => { setTab(t); const first = allActions.find((a) => a.tab === t && a.level <= lvl) ?? allActions.find((a) => a.tab === t); if (first) setSelectedId(first.id); }}>
          <UiIcon name={TAB_ICONS[t] ?? 'skills'} size={16} /> {t.toUpperCase()}
        </button>
      ))}
    </div>
  );

  if (!action) {
    return (
      <div className="skill-screen">
        <PixelScene scene={SCENES[skill] ?? 'town'} dim={0.6} className="screen-bg" />
        <div className="screen">
          <h1 className="mastery-title">{SKILLS[skill].name}</h1>
          {tabRow}
          <div className="empty">
            {skill === 'enhancing'
              ? 'Nothing to enhance right now. Smith weapons or armour at the Forge, then improve them here from +1 up to +10 — even while you wear them.'
              : tab === 'Upgrades'
                ? 'Craft a tool first — then upgrade it here, even while it’s equipped. Your +1 replaces the old one.'
                : 'Nothing here yet.'}
          </div>
        </div>
      </div>
    );
  }

  const unlocked = lvl >= action.level;
  const idlingThis = slotOf(player, action.id) >= 0;
  const Minigame = MINIGAMES[skill] ?? AnvilRhythm;

  return (
    <div className="skill-screen">
      <PixelScene scene={SCENES[skill] ?? 'town'} dim={0.6} className="screen-bg" />
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

      {tabRow}
      {tabs.length > 0 ? (
        <RecipeList player={player} actions={actions} selected={action.id} onSelect={setSelectedId} />
      ) : (
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
              {slotOf(player, a.id) >= 0 && <span className="chip-idle"><UiIcon name="clock" size={12} /></span>}
            </button>
          );
        })}
      </div>
      )}

      {unlocked ? (
        <Minigame key={skill} action={action} />
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
            <button className="btn btn-stop btn-lg btn-wide" onClick={() => game.stopAction(action.id)}>
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
