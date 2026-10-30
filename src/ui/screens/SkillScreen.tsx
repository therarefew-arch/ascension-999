// One skill: pick a resource, play its minigame, or set it to idle.
import { MASTERY } from '../../core/mastery';
import { ASCENSION_LEVEL } from '../../data/ascended';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SkillId } from '../../data/items';
import { ACTIONS, actionsForSkill, COMBAT_SKILLS, SKILL_ORDER, SKILLS, tabsForSkill, type ActionDef } from '../../data/skills';
import { getItem } from '../../data/items';
import { LOCAL_SKILLS, REGIONS, regionOpen } from '../../data/tiers';
import { HOME_TURF_PCT, homeTurf, isLocalGather, SEASONED, seasonedPercent, skillLevel, slotOf, whyCantDo } from '../../core/idle';
import { countInBag } from '../../core/inventory';
import type { PlayerState } from '../../core/player';
import { bestAction, timeToLevel, timeToNextLevel, visibleActions } from '../../core/rates';
import { goalChoices } from '../../core/cozy';
import { xpBoost } from '../../core/boosts';
import { hearthLit } from '../../core/family';
import { activeBuffs, buffText } from '../../core/buffs';
import { mountainStirs, STIR_XP_MULT } from '../../core/cinderpeak';
import { RipePicking } from '../HerbloreGame';
import { game, useGame } from '../../core/store';
import { levelProgress, MAX_LEVEL } from '../../core/xp';
import { ProgressBar, Sheet } from '../components';
import { ItemIcon, UiIcon, type UiIconName } from '../icons';
import { fmtDuration, fmtNum } from '../format';
import { AnvilRhythm, StrikeVein } from '../Minigames';
import { Chop, RuneTrace } from '../Minigames2';
import { CraftingGames } from '../Joinery';
import { EnhancingGames } from '../Runesong';
import { FiremakingGames } from '../Wildfire';
import { FishingGames } from '../TileMatch';
import { CookingGames } from '../PantryPrep';
import { PixelScene, type SceneName } from '../PixelScene';
import { placeName } from '../../data/places';

export function shortTime(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
}

/** 🌱 / 🧭 XP boosts this skill is getting right now (hidden when there are none). */
export function BoostRow({ skill }: { skill: SkillId }) {
  const { player } = useGame();
  const b = xpBoost(player, skill);
  const seasoned = seasonedPercent(player, skill);
  const uses = player.toolUses[skill] ?? 0;
  const toNext = seasoned < SEASONED.maxPercent ? SEASONED.perPercent - (uses % SEASONED.perPercent) : 0;
  const now = Date.now();
  const meals = activeBuffs(player, now).filter((a) => a.buff.skill === skill || a.buff.skill === 'all' || (a.buff.skill === 'combat' && COMBAT_SKILLS.includes(skill)));
  const stirring = skill === 'mining' && player.location === 'Cinderpeak' && mountainStirs(now).active;
  const hearth = hearthLit(player, now);
  if (b.total <= 1.001 && seasoned === 0 && uses === 0 && !meals.length && !stirring && !hearth) return null;
  const pct = (m: number) => `+${Math.round((m - 1) * 100)}%`;
  return (
    <div className="boost-row">
      {stirring && <span className="boost-chip stir" title="Every 3 hours the volcano stirs for 15 minutes">🌋 The mountain stirs! Emberite ×{STIR_XP_MULT} XP + ember geodes</span>}
      {meals.map((m) => (
        <span key={m.item} className="boost-chip meal" title={getItem(m.item).name}>
          {getItem(m.item).emoji} {buffText(m.buff)} · {Math.ceil((m.until - now) / 60000)}m
        </span>
      ))}
      {(seasoned > 0 || uses > 0) && (
        <span className="boost-chip seasoned" title={`Your tools get faster with use: +1% speed every ${SEASONED.perPercent.toLocaleString()} actions, up to +${SEASONED.maxPercent}%`}>
          🪓 Seasoned +{seasoned}% speed{toNext ? ` · next in ${toNext.toLocaleString()}` : ' · max'}
        </span>
      )}
      {hearth && <span className="boost-chip hearth" title="Someone else in your guild played today: +5% XP in every skill">🔥 Hearth Together +5%</span>}
      {b.zeal > 1.001 && <span className="boost-chip zeal" title="Early levels are faster: ×3 below 90, fading to normal by 180">🌱 ×{b.zeal.toFixed(1).replace('.0', '')} early levels</span>}
      {b.catchUp > 1.001 && b.highestSkill && <span className="boost-chip catch" title="Skills behind your highest skill get +10% XP per 10 levels behind (up to +100%)">🧭 {pct(b.catchUp)} catching up to {SKILLS[b.highestSkill].name}</span>}
      {b.zeal * b.catchUp > b.total + 0.001 && <span className="small dim">(max ×{b.total})</span>}
    </div>
  );
}

/** 🎯 Pick a target level; shows how long it'll take at your current (or best) pace. */
export function GoalRow({ skill, place }: { skill: SkillId; place: string }) {
  const { player } = useGame();
  const [picking, setPicking] = useState(false);
  const lvl = skillLevel(player, skill);
  const goal = player.goals[skill];
  const eta = goal ? timeToLevel(player, skill, goal) : null;
  if (picking) {
    return (
      <div className="goal-row">
        <span className="small muted">🎯 Goal:</span>
        {goalChoices(lvl).map((g) => (
          <button key={g} className={`goal-chip ${g === goal ? 'on' : ''}`} onClick={() => { game.setGoal(skill, g); setPicking(false); }}>Lv {g}</button>
        ))}
        {goal && <button className="goal-chip ghost" onClick={() => { game.setGoal(skill, null); setPicking(false); }}>Clear</button>}
        <button className="goal-chip ghost" onClick={() => setPicking(false)}>✕</button>
      </div>
    );
  }
  return (
    <div className="goal-row">
      <span className="small dim grow">{place}</span>
      {lvl < MAX_LEVEL && (goal
        ? <button className="goal-chip" onClick={() => setPicking(true)} title="Change goal">🎯 {goal}{eta ? ` · ${fmtDuration(eta.ms)}` : ''}</button>
        : <button className="goal-chip ghost" onClick={() => setPicking(true)}>🎯 Set goal</button>)}
    </div>
  );
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

/** Where an action happens: 🔒 not built yet, 🧭 not discovered yet, 📍 gather it on location. */
function regionTag(player: PlayerState, a: ActionDef): string | null {
  if (!a.region) return null;
  if (!regionOpen(a.region)) return `🔒 ${a.region}`;
  if (!player.regions.includes(a.region)) return `🧭 ${a.region}`;
  if ((LOCAL_SKILLS as readonly string[]).includes(a.skill) && a.inputs.length === 0 && player.location !== a.region) return `📍 ${a.region}`;
  return null;
}

const SCENES: Partial<Record<SkillId, SceneName>> = {
  mining: 'mine', smithing: 'forge', woodcutting: 'forest', firemaking: 'camp',
  fishing: 'river', cooking: 'kitchen', crafting: 'workshop', enhancing: 'tower', runecrafting: 'altar',
  herblore: 'forest', farming: 'town',
};

const MINIGAMES: Partial<Record<SkillId, (p: { action: ActionDef }) => JSX.Element>> = {
  mining: StrikeVein, smithing: AnvilRhythm, woodcutting: Chop, firemaking: FiremakingGames,
  fishing: FishingGames, cooking: CookingGames, crafting: CraftingGames, enhancing: EnhancingGames, runecrafting: RuneTrace,
  herblore: RipePicking,
};

const TAB_ICONS: Record<string, UiIconName> = {
  Smelt: 'firemaking', Weapons: 'sword', Armour: 'shield', Tools: 'crafting', Upgrades: 'up',
  Ammo: 'ammo', Talismans: 'gem', Runes: 'runecrafting', Staffs: 'magic',
};

/** Everything a recipe row needs to know: is it locked, do you have the materials, the right tool… */
function recipeInfo(player: PlayerState, a: ActionDef) {
  const lvl = skillLevel(player, a.skill);
  const tag = regionTag(player, a);
  const regionLocked = !!tag && !tag.startsWith('📍');
  const locked = lvl < a.level || regionLocked;
  // The input that limits how many you can make.
  const needs = a.inputs.filter((i) => i.item !== a.upgrades);
  const limiting = needs.reduce<{ have: number; qty: number; n: number } | null>((best, i) => {
    const have = countInBag(player.inventory, i.item);
    const n = Math.floor(have / i.qty);
    return !best || n < best.n ? { have, qty: i.qty, n } : best;
  }, null);
  const enough = !limiting || limiting.n > 0;
  const toolProblem = !locked ? !!whyCantDo(player, a)?.startsWith('Equip a') : false;
  return { lvl, tag, locked, needs, limiting, enough, toolProblem, canMake: !locked && enough && !toolProblem };
}

/** One recipe: what it makes, what it needs, and what you have. */
function RecipeRow({ player, a, on, onClick, picker }: { player: PlayerState; a: ActionDef; on?: boolean; onClick: () => void; picker?: boolean }) {
  const r = recipeInfo(player, a);
  return (
    <button className={`recipe ${on ? 'on' : ''} ${r.locked ? 'locked' : ''} ${picker ? 'recipe-picker' : ''}`} onClick={onClick}
      aria-label={picker ? `${a.name} — tap to choose a different recipe` : undefined}>
      <ItemIcon id={a.iconItem} size={36} />
      <div className="grow">
        <div className="recipe-name">{a.name}{slotOf(player, a.id) >= 0 && <span className="chip-idle"> <UiIcon name="clock" size={12} /></span>}</div>
        <div className="recipe-sub">{r.needs.map((i) => `${i.qty}× ${getItem(i.item).name}`).join(' + ')}</div>
      </div>
      <div className="recipe-right mono">
        {r.limiting && <span className={r.enough ? 'green' : 'red'}>{fmtNum(r.limiting.have)}/{r.limiting.qty}</span>}
        {r.tag && <span className="dim small">{r.tag}</span>}
        {r.lvl < a.level && <span className="dim small">Lv {a.level}</span>}
        {!r.locked && r.toolProblem && <span className="red small">needs tool</span>}
      </div>
      {picker && <span className="picker-change" aria-hidden="true">⇅</span>}
    </button>
  );
}

/** Remembered while the app is open: "Can make now" or everything. */
let pickerFilter: 'all' | 'make' = 'all';

/** 📜 The recipe picker: every recipe in this tab, grouped by town, with a "Can make now" filter. */
function RecipeSheet({ player, actions, selected, onSelect, onClose, title }: {
  player: PlayerState; actions: ActionDef[]; selected: string; onSelect: (id: string) => void; onClose: () => void; title: string;
}) {
  const [filter, setFilter] = useState(pickerFilter);
  const [openTowns, setOpenTowns] = useState<string[]>([]);
  const setF = (f: 'all' | 'make') => { pickerFilter = f; setFilter(f); };
  const info = new Map(actions.map((a) => [a.id, recipeInfo(player, a)]));
  const makeable = actions.filter((a) => info.get(a.id)!.canMake);
  const shown = filter === 'make' ? makeable : actions;
  // Group by town: where you are first, then the other towns you know, then ones still to discover.
  const townOf = (a: ActionDef) => a.region ?? player.location;
  const towns = Array.from(new Set(shown.map(townOf)));
  const rank = (t: string) => (t === player.location ? 0 : player.regions.includes(t as never) ? 1 : 2);
  towns.sort((x, y) => rank(x) - rank(y) || REGIONS.indexOf(x as never) - REGIONS.indexOf(y as never));
  useEffect(() => { document.querySelector('.recipe-sheet .recipe.on')?.scrollIntoView({ block: 'center' }); }, []);
  // Drawn at the top level of the page so it always sits above the minigame.
  return createPortal(
    <Sheet title={title} onClose={onClose}>
      <div className="tab-row no-pad picker-filters">
        <button className={`tab-pill ${filter === 'all' ? 'on' : ''}`} onClick={() => setF('all')}>All ({actions.length})</button>
        <button className={`tab-pill ${filter === 'make' ? 'on' : ''}`} onClick={() => setF('make')}>✅ Can make now ({makeable.length})</button>
      </div>
      <div className="recipe-sheet">
        {shown.length === 0 && <div className="empty">Nothing you can make right now — check your bag for materials, or switch to All.</div>}
        {towns.map((town) => {
          const list = shown.filter((a) => townOf(a) === town);
          const known = player.regions.includes(town as never);
          const folded = !known && !openTowns.includes(town) && !list.some((a) => a.id === selected);
          // Towns you haven't reached yet: one short line each (tap to peek).
          if (folded) {
            return (
              <button key={town} className="picker-fold" onClick={() => setOpenTowns((o) => [...o, town])}>
                <span>{regionOpen(town as never) ? '🧭' : '🔒'} <b>{town}</b> · {list.length} recipe{list.length > 1 ? 's' : ''}</span>
                <span className="dim">{regionOpen(town as never) ? 'not discovered' : 'coming soon'} ▾</span>
              </button>
            );
          }
          return (
            <section key={town}>
              <h3 className="picker-town">
                {town === player.location ? `📍 ${town} · you are here` : known ? town : `${regionOpen(town as never) ? '🧭' : '🔒'} ${town}`}
              </h3>
              {(
                <div className="recipe-list no-pad">
                  {list.map((a) => <RecipeRow key={a.id} player={player} a={a} on={a.id === selected} onClick={() => { onSelect(a.id); onClose(); }} />)}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </Sheet>,
    document.body,
  );
}

/** Which recipe a tab opens on: the best one you can make now, else the best one you've unlocked. */
function bestInTab(player: PlayerState, list: ActionDef[]): ActionDef | undefined {
  const withInfo = list.map((a) => ({ a, r: recipeInfo(player, a) }));
  const pick = (xs: typeof withInfo) => xs.sort((x, y) => y.a.level - x.a.level)[0]?.a;
  return pick(withInfo.filter((x) => x.r.canMake)) ?? pick(withInfo.filter((x) => !x.r.locked)) ?? list[0];
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
    ? bestInTab(player, allActions.filter((a) => a.tab === tabs[0]))
    : (bestAction(player, skill) ?? allActions[0]))?.id ?? '';
  const [selectedId, setSelectedId] = useState<string>(defaultId);
  const [tab, setTab] = useState<string>(() => ACTIONS[defaultId()]?.tab ?? tabs[0] ?? '');
  const [picking, setPicking] = useState(false);

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
          onClick={() => { setTab(t); setPicking(false); const first = bestInTab(player, allActions.filter((a) => a.tab === t)); if (first) setSelectedId(first.id); }}>
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
              ? 'Nothing to enhance right now. Smith weapons or armour at the Forge, then improve them here from +1 up to +10 — even while you wear them. Meanwhile, Runesong below still trains Enhancing (and Magic).'
              : tab === 'Upgrades'
                ? 'Craft a tool first — then upgrade it here, even while it’s equipped. Your +1 replaces the old one.'
                : 'Nothing here yet.'}
          </div>
          {skill === 'enhancing' && <EnhancingGames />}
        </div>
      </div>
    );
  }

  const tag = regionTag(player, action);
  const regionLocked = !regionOpen(action.region) || (!!action.region && !player.regions.includes(action.region));
  const unlocked = lvl >= action.level && !regionLocked;
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
        <BoostRow skill={skill} />
        <GoalRow skill={skill} place={`📍 ${placeName(player.location, skill)}, ${player.location}`} />
        {lvl >= ASCENSION_LEVEL && <MasteryRow skill={skill} level={lvl} />}
      </div>

      {tabRow}
      {tabs.length > 0 ? (
        <div className="recipe-list">
          <RecipeRow player={player} a={action} on picker onClick={() => setPicking(true)} />
          {picking && <RecipeSheet player={player} actions={actions} selected={action.id} onSelect={setSelectedId} onClose={() => setPicking(false)}
            title={`${SKILLS[skill].name} · ${tab}`} />}
        </div>
      ) : (
      <div className="chip-row" role="tablist" aria-label="Resources">
        {actions.map((a: ActionDef) => {
          const chipTag = regionTag(player, a);
          const locked = lvl < a.level || (!!chipTag && !chipTag.startsWith('📍'));
          return (
            <button key={a.id} role="tab" aria-selected={a.id === action.id}
              className={`res-chip ${a.id === action.id ? 'on' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => setSelectedId(a.id)}>
              <ItemIcon id={a.iconItem} size={22} />
              <span>{a.name}</span>
              {chipTag && <span className="chip-lv">{chipTag.split(' ')[0]}</span>}
              {lvl < a.level && <span className="chip-lv">Lv{a.level}</span>}
              {slotOf(player, a.id) >= 0 && <span className="chip-idle"><UiIcon name="clock" size={12} /></span>}
            </button>
          );
        })}
      </div>
      )}

      {unlocked ? (
        <Minigame key={skill} action={action} />
      ) : skill === 'enhancing' ? (
        <EnhancingGames key="locked" />
      ) : (
        <div className="mg">
          <div className="mg-stage">
            <div className="mg-rock locked-art"><ItemIcon id={action.iconItem} size={72} /></div>
            <div className="mg-stage-name">{action.name}</div>
            <div className="mg-stage-xp"><UiIcon name="lock" size={14} /> {!regionOpen(action.region)
              ? `Found in ${action.region} (level ${action.level}) — coming in a future update`
              : regionLocked
                ? `Travel to ${action.region} to unlock this (level ${action.level})`
                : `Unlocks at ${SKILLS[skill].name} level ${action.level}`}</div>
            {tag && <div className="small muted">{tag}</div>}
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
              <UiIcon name="clock" size={18} /> {isLocalGather(action) && player.location !== action.region
                ? `Send word — a helper gathers in ${action.region}`
                : "Idle this — keeps going while you're away"}
            </button>
          )}
          {isLocalGather(action) && (
            <p className="small muted idle-turf">
              {homeTurf(player, action)
                ? `🏡 Home turf: +${HOME_TURF_PCT}% speed while you're in ${action.region}`
                : `📨 Gathering from afar. Be in ${action.region} for +${HOME_TURF_PCT}% speed and the minigame.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** ✦ Mastery perks at 800 / 900 / 999 (shown once a skill is in the Ascension). */
function MasteryRow({ skill, level }: { skill: SkillId; level: number }) {
  const name = SKILLS[skill].name;
  const next = MASTERY.find((m) => level < m.level);
  return (
    <div className="mastery-perks small">
      {MASTERY.map((m) => (
        <span key={m.level} className={`mp ${level >= m.level ? 'on' : ''}`} title={m.text(name)}>✦ {m.name}</span>
      ))}
      <span className="muted mp-next">{next ? `Lv ${next.level}: ${next.text(name)}` : MASTERY.map((m) => m.text(name)).join(' · ')}</span>
    </div>
  );
}
