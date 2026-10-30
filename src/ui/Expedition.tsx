// 🧭 Expeditions — the at-home adventure screen. Rules live in core/expedition.ts; this file draws the
// packing table, the branching road, the turn-by-turn fights and the camps/events, plays the sounds, and
// keeps the expedition on this device (`ui.expedition.<slot>`) so you can stop and carry on later.
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import { combatStats, weaponStyle } from '../core/combat';
import {
  ammoCount, AREAS, BOONS, camp, choose, COLS, EVENT_MAP, FOCUS_MAX, goTo, headHome, intentDamage, INTENT_ICON, levelRange, loadRun,
  NODE_ICON, NODE_NAME, needFor, pickBoon, playTurn, reachable, ROWS, saveRun, SATCHEL_SLOTS, shrine, slotMax, SPECIAL_NAME, specialCost,
  supplyKind, toMap, townBoss, useSupply, whyNoSpecial, type Move, type Run, type TurnResult,
} from '../core/expedition';
import type { ItemStack } from '../core/player';
import { game, useGame } from '../core/store';
import { levelForXp } from '../core/xp';
import { getItem, type CombatStyle } from '../data/items';
import { EXP_BOSS_MOVE, MONSTER_MAP, monsterStyle } from '../data/monsters';
import { PET_MAP } from '../data/pets';
import { EXPEDITION_FURNITURE, FURNITURE_MAP } from '../core/cottage';
import { SKILLS } from '../data/skills';
import { REGIONS, type Region } from '../data/tiers';
import { ItemIcon } from './icons';
import { MonsterArt } from './MonsterArt';

const saveKey = (slot: number | null) => `ui.expedition.${slot ?? 0}`;
function readSaved(slot: number | null): Run | null { try { return loadRun(localStorage.getItem(saveKey(slot))); } catch { return null; } }
function writeSaved(slot: number | null, r: Run) { try { localStorage.setItem(saveKey(slot), saveRun(r)); } catch { /* storage full */ } }
function clearSaved(slot: number | null) { try { localStorage.removeItem(saveKey(slot)); } catch { /* ignore */ } }

const STYLE_NAME: Record<CombatStyle, string> = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic' };
const BEATEN_BY: Record<CombatStyle, CombatStyle> = { melee: 'magic', ranged: 'melee', magic: 'ranged' };
const HERO: Record<CombatStyle, string> = { melee: '🤺', ranged: '🧝', magic: '🧙' };

function Bar({ value, max, tone }: { value: number; max: number; tone: 'green' | 'red' | 'gold' }) {
  const pct = Math.max(0, Math.min(100, (100 * value) / Math.max(1, max)));
  return <div className={`ex-bar ${tone}`}><div style={{ width: `${pct}%` }} /><span className="mono">{Math.max(0, Math.round(value)).toLocaleString()} / {Math.round(max).toLocaleString()}</span></div>;
}

/** The Combat screen card. */
export function ExpeditionLaunch() {
  const { player, slot } = useGame();
  const [open, setOpen] = useState(false);
  const saved = open ? null : readSaved(slot);
  return (
    <>
      <button className="lw-launch ex-launch" onClick={() => { sound.play('click'); setOpen(true); }}>
        <span className="lw-launch-emoji">🧭</span>
        <span className="grow"><b>Expeditions</b><span className="small muted">{saved
          ? saved.phase === 'done' ? '📜 Your last expedition is over — tap to see what you found.' : `💾 You're out in ${AREAS[saved.region].name} — tap to carry on.`
          : `Pack a satchel and explore ${AREAS[player.location].name} — pick your road, fight turn by turn, face the boss.`}</span></span>
        <span className="lw-launch-go">▶</span>
      </button>
      {open && <Expedition onClose={() => setOpen(false)} />}
    </>
  );
}

export function Expedition({ onClose }: { onClose: () => void }) {
  const { player, slot } = useGame();
  const [run, setRunState] = useState<Run | null>(() => readSaved(slot));
  const [, bump] = useState(0);
  // Keep the run saved after every change.
  const commit = (r: Run | null) => {
    if (r) writeSaved(slot, r); else clearSaved(slot);
    setRunState(r);
    bump((n) => n + 1);
  };
  const region = run?.region ?? player.location;
  useEffect(() => {
    sound.playMusic(musicFor(region));
    return () => sound.playMusic(musicFor(player.location));
  }, [region]); // eslint-disable-line react-hooks/exhaustive-deps
  // Settle up once when it ends (supplies come back).
  useEffect(() => {
    if (run && run.phase === 'done' && !run.settled) {
      const back = game.expeditionEnd(run);
      run.settled = true;
      run.returned = back;
      commit(run);
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="ex-root" role="dialog" aria-modal="true">
      <div className="ex-top">
        <span className="ex-title">🧭 {run ? areaTitle(run.region) : 'Expeditions'}</span>
        <button className="ex-close" onClick={() => { sound.play('click'); onClose(); }} aria-label={run && run.phase !== 'done' ? 'Save and leave' : 'Close'}>{run && run.phase !== 'done' ? '💾 Leave' : '✕'}</button>
      </div>
      <div className="ex-body">
        {!run && <Setup onStart={(r) => commit(r)} />}
        {run && run.phase === 'done' && <Done run={run} onClose={() => { clearSaved(slot); onClose(); }} />}
        {run && run.phase !== 'done' && <Journey run={run} commit={commit} />}
      </div>
    </div>,
    document.body,
  );
}

// ----- Packing -----
function Setup({ onStart }: { onStart: (r: Run) => void }) {
  const { player } = useGame();
  const towns = REGIONS.filter((r) => player.regions.includes(r) && townBoss(r));
  const [town, setTown] = useState<Region>(towns.includes(player.location) ? player.location : towns[0] ?? 'Pocketvale');
  const [pack, setPack] = useState<ItemStack[]>([]);
  const style = weaponStyle(player);
  const boss = townBoss(town);
  const [lo, hi] = levelRange(town);
  const bossStyle = boss ? monsterStyle(boss) : 'melee';
  const fair = boss ? combatStats(player, boss).advantage : 0;
  const have = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of player.inventory) if (s) m.set(s.id, (m.get(s.id) ?? 0) + s.qty);
    for (const s of player.bank) m.set(s.id, (m.get(s.id) ?? 0) + s.qty);
    return [...m].filter(([id, n]) => n > 0 && supplyKind(player, id)).sort((a, b) => {
      const ka = supplyKind(player, a[0])!, kb = supplyKind(player, b[0])!;
      return ka === kb ? (getItem(b[0]).heals ?? 0) - (getItem(a[0]).heals ?? 0) : ka.localeCompare(kb);
    });
  }, [player]);
  const packed = (id: string) => pack.filter((s) => s.id === id).reduce((n, s) => n + s.qty, 0);
  const add = (id: string, n: number) => {
    if (pack.length >= SATCHEL_SLOTS) { sound.play('error'); return; }
    const k = supplyKind(player, id)!;
    const qty = Math.min(slotMax(k), n - packed(id));
    if (qty <= 0) { sound.play('error'); return; }
    sound.play('deposit', { rate: 1 + pack.length * 0.05 });
    setPack([...pack, { id, qty }]);
  };
  const remove = (i: number) => { sound.play('whoosh', { volume: 0.5 }); setPack(pack.filter((_, j) => j !== i)); };
  const start = () => {
    const r = game.expeditionStart(town, pack);
    if (r) { sound.play('levelup'); onStart(r); }
  };
  const needAmmo = style !== 'melee' && !pack.some((s) => supplyKind(player, s.id) === 'ammo');
  return (
    <div className="ex-setup">
      <p className="small muted center">At work your skills stock the pantry — at home, go on the adventure you packed for.</p>
      <h3 className="ex-h">Where to?</h3>
      <div className="ex-towns">
        {towns.map((t) => (
          <button key={t} className={`ex-town ${t === town ? 'on' : ''}`} onClick={() => { sound.play('tick', { rate: 1.1 }); setTown(t); }}>
            <span>{AREAS[t].emoji}</span><span className="tiny">{t}</span>
          </button>
        ))}
      </div>
      <div className="ex-card">
        <b className="gold">{AREAS[town].emoji} {AREAS[town].name[0].toUpperCase() + AREAS[town].name.slice(1)}</b>
        <span className="small muted">{AREAS[town].blurb}</span>
        <span className="small">Monsters level {lo}–{hi}{boss && <> · 👑 {boss.name} ({STYLE_NAME[bossStyle]})</>}</span>
        {boss && <BossPrizes region={town} pet={boss.pet} />}
        <span className="small">You fight with <b>{STYLE_NAME[style]}</b>
          {fair < 0 && <span className="red"> — {STYLE_NAME[BEATEN_BY[bossStyle]]} would do better against the boss</span>}
          {fair > 0 && <span className="green"> — good against the boss!</span>}
        </span>
      </div>
      <h3 className="ex-h">Pack your satchel <span className="tiny muted">({pack.length}/{SATCHEL_SLOTS} · tap to unpack)</span></h3>
      <div className="ex-satchel">
        {Array.from({ length: SATCHEL_SLOTS }, (_, i) => pack[i]).map((s, i) => (
          <button key={i} className={`ex-slot ${s ? '' : 'empty'}`} disabled={!s} onClick={() => remove(i)} aria-label={s ? `Unpack ${getItem(s.id).name}` : 'Empty slot'}>
            {s && <><ItemIcon id={s.id} size={30} /><span className="ex-qty mono">{s.qty}</span></>}
          </button>
        ))}
      </div>
      <p className="tiny muted">Food heals (more if it's from a farther town) · meals heal and give +15% damage for a fight · brews give +3 Focus · {style === 'ranged' ? 'arrows for your bow' : style === 'magic' ? 'runes for your staff' : 'melee needs no ammo'}. Only what you use is gone — the rest comes home.</p>
      <div className="ex-pick">
        {have.length === 0 && <p className="small muted">No food, meals, brews or ammo in your bag or bank. Cook something first!</p>}
        {have.map(([id, n]) => {
          const left = n - packed(id);
          return (
            <button key={id} className="ex-pick-row" disabled={left <= 0 || pack.length >= SATCHEL_SLOTS} onClick={() => add(id, n)}>
              <ItemIcon id={id} size={26} />
              <span className="grow small">{getItem(id).name}</span>
              <span className="tiny muted mono">{left.toLocaleString()}</span>
              <span className="ex-plus">+</span>
            </button>
          );
        })}
      </div>
      {needAmmo && <p className="small red center">{style === 'ranged' ? 'Pack some arrows for your bow.' : 'Pack some runes for your staff.'}</p>}
      <button className="btn btn-hero" disabled={needAmmo} onClick={start}>SET OFF</button>
      <p className="tiny muted center">Knocked out? You're carried home safe with everything you found. No limits — go as often as you like.</p>
    </div>
  );
}

/** What the boss can give (✓ once you have it). */
function BossPrizes({ region, pet }: { region: Region; pet?: string }) {
  const { player } = useGame();
  const piece = EXPEDITION_FURNITURE.find((x) => x.expedition === region);
  const p = pet ? PET_MAP[pet] : null;
  const wins = player.expeditionWins?.[region] ?? 0;
  return (
    <span className="small muted">
      Boss prizes: 💎 a gem every time{p && <> · {p.emoji} {p.name}{player.pets.includes(p.id) ? ' ✓' : ' (rare)'}</>}
      {piece && <> · {piece.emoji} {piece.name}{player.cottage.includes(piece.id) ? ' ✓' : ''}</>} · 📜 a lost note{wins > 0 ? ' · beaten ' + wins + '×' : ''}
    </span>
  );
}

// ----- On the road -----
function Journey({ run, commit }: { run: Run; commit: (r: Run | null) => void }) {
  const { player } = useGame();
  const [bag, setBag] = useState(false);
  const [last, setLast] = useState<{ res: TurnResult; key: number } | null>(null);
  const [found, setFound] = useState<ItemStack[] | null>(null);
  const [confirmHome, setConfirmHome] = useState(false);
  const reward = (rw: ReturnType<typeof goTo>) => game.expeditionReward(run, rw);

  const walk = (id: number) => {
    const n = run.map[id];
    sound.play('tick', { rate: 0.9 + n.row * 0.03 });
    const rw = goTo(run, id);
    if (rw) { setFound(reward(rw)); sound.play('coin'); }
    if (run.phase === 'fight') sound.play(n.kind === 'boss' ? 'boom' : 'shing', { rate: n.kind === 'boss' ? 0.7 : 1 });
    else if (run.phase === 'event') sound.play('card');
    else if (run.phase === 'camp') sound.play('ignite');
    else if (run.phase === 'shrine') sound.play('enchant', { volume: 0.6 });
    setLast(null);
    commit(run);
  };
  const move = (m: Move) => {
    const res = playTurn(run, m);
    if (!res) { sound.play('error'); return; }
    sound.play(m === 'guard' ? 'block' : m === 'special' ? 'boom' : 'hit', { rate: m === 'attack' ? 0.9 + Math.random() * 0.2 : 1 });
    if (res.taken.some((t) => t.dmg > 0)) setTimeout(() => sound.play('hurt', { volume: 0.7 }), 220);
    if (res.reward) { setFound(reward(res.reward)); setTimeout(() => sound.play('levelup'), 300); }
    if (res.ko) setTimeout(() => sound.play('fail'), 300);
    game.vibrate(res.taken.length ? 25 : 10);
    setLast({ res, key: Date.now() });
    commit(run);
  };
  const eat = (i: number) => {
    const why = useSupply(run, i);
    if (why) { sound.play('error'); game.cant(why); return; }
    sound.play('eat');
    commit(run);
  };

  return (
    <div className="ex-journey">
      <div className="ex-hud">
        <span className="ex-hero">{HERO[run.style]}</span>
        <div className="grow"><Bar value={run.hp} max={run.maxHp} tone="green" />
          {run.phase === 'fight' && <div className="ex-focus" aria-label={`Focus ${run.focus} of ${FOCUS_MAX}`}>{Array.from({ length: FOCUS_MAX }, (_, i) => <span key={i} className={i < run.focus ? 'on' : ''} />)}<span className="tiny muted">Focus</span></div>}
        </div>
        <button className="ex-bagbtn" onClick={() => { sound.play('click'); setBag(!bag); }} aria-label="Satchel">🎒<span className="tiny mono">{run.satchel.reduce((n, s) => n + (s.kind === 'ammo' ? 0 : s.qty), 0)}</span></button>
      </div>
      {run.boons.length > 0 && <div className="ex-boons">{run.boons.map((b) => <span key={b} className="ex-boon" title={BOONS[b].text}>{BOONS[b].emoji} {BOONS[b].name}</span>)}{run.sharpen > 0 && <span className="ex-boon">🪨 +{run.sharpen * 8}%</span>}</div>}
      {bag && <Satchel run={run} onUse={eat} onClose={() => setBag(false)} />}

      {run.phase === 'map' && <MapView run={run} onWalk={walk} />}
      {run.phase === 'fight' && run.fight && <FightView run={run} last={last} onMove={move} onBag={() => setBag(true)} onTarget={(i) => { run.fight!.target = i; commit(run); }} />}
      {run.phase === 'camp' && (
        <Panel emoji="🔥" title="A quiet camp" text="Crackling fire, soft moss. Time to catch your breath.">
          <Choice onClick={() => { camp(run, 'rest'); sound.play('crackle'); commit(run); }} emoji="😴" title="Rest" text={run.boons.includes('mender') ? 'Heal fully.' : 'Heal 35% of your health.'} />
          <Choice onClick={() => { camp(run, 'sharpen'); sound.play('anvil'); commit(run); }} emoji="🪨" title="Sharpen up" text="+8% damage for the rest of the expedition." />
        </Panel>
      )}
      {run.phase === 'shrine' && (
        <Panel emoji="⛲" title="A mossy shrine" text="Coins glint in the water. An old blessing still lingers here.">
          <Choice onClick={() => { const e = shrine(run, 'offer'); if (e) { sound.play('error'); game.cant(e); return; } sound.play('rune'); commit(run); }} emoji="🙏" title="Make an offering" text={`Give ${Math.round(run.maxHp * 0.2)} health for a Boon (pick 1 of 3).`} />
          <Choice onClick={() => { shrine(run, 'sip'); sound.play('splash'); commit(run); }} emoji="💧" title="Take a sip" text="Heal 20% of your health." />
        </Panel>
      )}
      {run.phase === 'event' && run.event && <EventView run={run} onChoose={(i) => {
        const res = choose(run, i, player);
        if (res.error) { sound.play('error'); game.cant(res.error); return; }
        sound.play('card', { rate: 1.15 });
        if (res.reward) { const got = reward(res.reward); if (got.length) setFound(got); }
        commit(run);
      }} />}
      {run.phase === 'boon' && run.boonChoices && (
        <Panel emoji="✨" title="Pick a Boon" text="It lasts for the rest of this expedition.">
          {run.boonChoices.map((b) => <Choice key={b} emoji={BOONS[b].emoji} title={BOONS[b].name} text={BOONS[b].text} onClick={() => { pickBoon(run, b); sound.play('rune', { rate: 1.1 }); commit(run); }} />)}
        </Panel>
      )}
      {run.phase === 'cache' && (
        <Panel emoji="🧺" title="A forgotten cache" text="Someone left this here a long time ago.">
          <button className="btn btn-primary" onClick={() => { toMap(run); sound.play('click'); setFound(null); commit(run); }}>Pack it up and go on</button>
        </Panel>
      )}

      {found && found.length > 0 && run.phase !== 'fight' && (
        <div className="ex-found" onClick={() => setFound(null)}>
          {found.map((s) => <span key={s.id} className="ex-found-item"><ItemIcon id={s.id} size={22} /><span className="tiny mono">{s.qty.toLocaleString()}</span></span>)}
        </div>
      )}
      <p className="ex-log small">{run.log[run.log.length - 1]}</p>
      {run.phase === 'map' && (confirmHome
        ? <div className="ex-home-confirm"><span className="small">Head home now? You keep everything you found.</span>
            <button className="btn btn-primary" onClick={() => { headHome(run); sound.play('whoosh'); commit(run); }}>Yes, head home</button>
            <button className="btn" onClick={() => { sound.play('click'); setConfirmHome(false); }}>Keep going</button></div>
        : <button className="link-btn small ex-home" onClick={() => { sound.play('click'); setConfirmHome(true); }}>🏡 Head home early</button>)}
    </div>
  );
}

function Panel({ emoji, title, text, children }: { emoji: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="ex-panel">
      <div className="ex-panel-emoji">{emoji}</div>
      <b className="ex-panel-title">{title}</b>
      <p className="small muted center">{text}</p>
      <div className="ex-choices">{children}</div>
    </div>
  );
}
function Choice({ emoji, title, text, onClick, disabled, note }: { emoji: string; title: string; text: string; onClick: () => void; disabled?: boolean; note?: string }) {
  return (
    <button className="lw-choice ex-choice" onClick={onClick} disabled={disabled}>
      <span className="ex-choice-emoji">{emoji}</span>
      <span className="grow"><b>{title}</b><span className="small muted">{text}</span>{note && <span className="tiny red">{note}</span>}</span>
    </button>
  );
}

function EventView({ run, onChoose }: { run: Run; onChoose: (i: number) => void }) {
  const { player } = useGame();
  const ev = EVENT_MAP[run.event!];
  const food = run.satchel.some((s) => s.kind === 'food' || s.kind === 'meal');
  return (
    <Panel emoji={ev.emoji} title={ev.title} text={ev.text}>
      {ev.choices.map((c, i) => {
        const need = needFor(run, c);
        const lvl = need ? levelForXp(player.skills[need.skill].xp) : 0;
        const short = need && lvl < need.level;
        return (
          <Choice key={i} emoji={need ? '🎯' : c.needFood ? '🍞' : '➡️'} title={c.label}
            text={need ? `${SKILLS[need.skill].name} ${need.level} (you: ${lvl})` : c.needFood ? 'Uses 1 food from your satchel' : c.hurt ? 'A little risky' : ''}
            disabled={!!short || (c.needFood && !food)} note={short ? 'Not quite yet' : undefined} onClick={() => onChoose(i)} />
        );
      })}
    </Panel>
  );
}

function Satchel({ run, onUse, onClose }: { run: Run; onUse: (i: number) => void; onClose: () => void }) {
  return (
    <div className="ex-bag">
      <div className="row-between"><b className="small gold">🎒 Satchel</b><button className="link-btn tiny" onClick={onClose}>close</button></div>
      {run.satchel.length === 0 && <p className="tiny muted">Empty.</p>}
      <div className="ex-bag-list">
        {run.satchel.map((s, i) => (
          <button key={s.id + i} className="ex-bag-row" disabled={s.kind === 'ammo'} onClick={() => onUse(i)}>
            <ItemIcon id={s.id} size={26} />
            <span className="grow tiny">{getItem(s.id).name}<span className="muted"> · {s.kind === 'ammo' ? 'used when you attack' : s.kind === 'brew' ? '+3 Focus' : `+${s.heal} health${s.kind === 'meal' ? ', +15% dmg' : ''}`}</span></span>
            <span className="mono tiny">×{s.qty}</span>
          </button>
        ))}
      </div>
      {run.style !== 'melee' && <p className="tiny muted">{run.style === 'ranged' ? 'Arrows' : 'Runes'} left: {ammoCount(run)}{ammoCount(run) === 0 ? ' — your attacks are much weaker' : ''}</p>}
      {run.phase === 'fight' && <p className="tiny muted">One snack a turn — it doesn't use up your move.</p>}
    </div>
  );
}

// ----- The map -----
const ROW_H = 62;
function MapView({ run, onWalk }: { run: Run; onWalk: (id: number) => void }) {
  const can = reachable(run);
  const H = (ROWS + 1) * ROW_H;
  const y = (row: number) => H - (row + 0.5) * ROW_H;
  const x = (col: number) => ((col + 0.5) / COLS) * 300;
  const visited = new Set(run.visited);
  const here = run.at;
  useEffect(() => {
    // Keep where you are in view.
    const el = document.querySelector('.ex-node.can');
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [run.at]);
  return (
    <div className="ex-map" style={{ height: H }}>
      <svg className="ex-paths" viewBox={`0 0 300 ${H}`} preserveAspectRatio="none" width="100%" height={H}>
        {run.map.flatMap((n) => n.next.map((t) => {
          const m = run.map[t];
          const walked = visited.has(n.id) && visited.has(t);
          const open = n.id === here && can.includes(t);
          return <line key={`${n.id}-${t}`} x1={x(n.col)} y1={y(n.row)} x2={x(m.col)} y2={y(m.row)} className={walked ? 'walked' : open ? 'open' : ''} vectorEffect="non-scaling-stroke" />;
        }))}
      </svg>
      {run.map.map((n) => {
        const isCan = can.includes(n.id);
        return (
          <button key={n.id} className={`ex-node ${n.kind} ${isCan ? 'can' : ''} ${visited.has(n.id) ? 'been' : ''} ${n.id === here ? 'here' : ''}`}
            style={{ left: `${(x(n.col) / 300) * 100}%`, top: y(n.row) }} disabled={!isCan} onClick={() => onWalk(n.id)}
            aria-label={`${NODE_NAME[n.kind]}${isCan ? ' — go here' : ''}`}>
            {NODE_ICON[n.kind]}
          </button>
        );
      })}
      <div className="ex-map-legend tiny muted">⚔️ fight · 💀 elite · 🔥 camp · ❓ ? · 🧺 cache · ⛲ shrine · 👑 boss</div>
    </div>
  );
}

// ----- Fights -----
function FightView({ run, last, onMove, onBag, onTarget }: { run: Run; last: { res: TurnResult; key: number } | null; onMove: (m: Move) => void; onBag: () => void; onTarget: (i: number) => void }) {
  const f = run.fight!;
  const sp = SPECIAL_NAME[run.style];
  const noSp = whyNoSpecial(run);
  const hurt = last?.res.taken.reduce((n, t) => n + t.dmg, 0) ?? 0;
  const incoming = f.foes.filter((x) => x.hp > 0).reduce((n, x) => n + intentDamage(run, x), 0);
  return (
    <div className="ex-fight">
      <div className={`ex-foes n${f.foes.length}`}>
        {f.foes.map((foe, i) => {
          const m = MONSTER_MAP[foe.m];
          const dead = foe.hp <= 0;
          return (
            <button key={i} className={`ex-foe ${dead ? 'dead' : ''} ${i === f.target && !dead ? 'target' : ''} ${foe.boss ? 'boss' : foe.elite ? 'elite' : ''}`}
              disabled={dead} onClick={() => { sound.play('tick', { rate: 1.3 }); onTarget(i); }} aria-label={`Aim at ${foe.name}`}>
              {!dead && <span className={`ex-intent ${foe.intent}`}>{INTENT_ICON[foe.intent]}{foe.boss && foe.intent === 'heavy' && EXP_BOSS_MOVE[foe.m] ? ` ${EXP_BOSS_MOVE[foe.m]}` : ''}{foe.intent !== 'guard' ? ` ${intentDamage(run, foe)}` : ''}</span>}
              <span className="ex-foe-art"><MonsterArt monster={m} size={f.foes.length > 2 ? 56 : 72} hurt={!!last && last.res.dealt[i] > 0} /></span>
              {last && last.res.dealt[i] > 0 && <span key={last.key} className="ex-pop">−{last.res.dealt[i]}</span>}
              <span className="ex-foe-name tiny">{foe.name}</span>
              <Bar value={foe.hp} max={foe.maxHp} tone="red" />
            </button>
          );
        })}
      </div>
      <div className="ex-you">
        {last && hurt > 0 && <span key={last.key} className="ex-pop you">−{hurt}</span>}
        <span className="tiny muted">Coming at you: <b className={incoming > run.hp ? 'red' : ''}>{incoming}</b>{incoming >= run.hp * 0.3 && incoming > 0 ? ' — maybe guard?' : ''}</span>
      </div>
      <div className="ex-moves">
        <button className="ex-move attack" onClick={() => onMove('attack')}><span>⚔️</span><b>Attack</b><span className="tiny">+1 Focus</span></button>
        <button className="ex-move guard" onClick={() => onMove('guard')}><span>🛡️</span><b>Guard</b><span className="tiny">Block 60% · +{run.boons.includes('hands') ? 3 : 2} Focus</span></button>
        <button className="ex-move special" disabled={!!noSp} onClick={() => onMove('special')}><span>{sp.emoji}</span><b>{sp.name}</b><span className="tiny">{noSp ?? `${specialCost(run)} Focus`}</span></button>
        <button className="ex-move supply" disabled={f.usedSupply || !run.satchel.some((s) => s.kind !== 'ammo')} onClick={onBag}><span>🍖</span><b>Satchel</b><span className="tiny">{f.usedSupply ? 'next turn' : 'free'}</span></button>
      </div>
      <p className="tiny muted center">{sp.text} Tap a monster to aim at it.</p>
    </div>
  );
}

// ----- The end -----
const areaTitle = (r: Region) => AREAS[r].name[0].toUpperCase() + AREAS[r].name.slice(1);
function merge(list: ItemStack[]): ItemStack[] {
  const out: ItemStack[] = [];
  for (const s of list) { const m = out.find((x) => x.id === s.id); if (m) m.qty += s.qty; else out.push({ ...s }); }
  return out;
}
function Done({ run, onClose }: { run: Run; onClose: () => void }) {
  const boss = townBoss(run.region);
  const xp = Object.entries(run.found.xp).filter(([, n]) => (n ?? 0) > 0);
  return (
    <div className="ex-panel ex-done">
      <div className="ex-panel-emoji">{run.end === 'won' ? '🏆' : run.end === 'ko' ? '😵‍💫' : '🏡'}</div>
      <b className="ex-panel-title">{run.end === 'won' ? `You beat ${boss?.name ?? 'the boss'}!` : run.end === 'ko' ? 'Carried home safe' : 'Back home'}</b>
      <p className="small muted center">{run.end === 'won' ? `${areaTitle(run.region)} is a little less wild today.` : run.end === 'ko' ? 'A kind traveller carried you back to town. You kept everything you found.' : 'You headed home with everything you found.'}</p>
      <p className="small">⚔️ {run.found.kills} monster{run.found.kills === 1 ? '' : 's'} beaten</p>
      {run.found.pet && <p className="small gold">🐾 {PET_MAP[run.found.pet]?.emoji} {PET_MAP[run.found.pet]?.name} came home with you!</p>}
      {run.found.cottage && <p className="small gold">🏡 {FURNITURE_MAP[run.found.cottage]?.emoji} {FURNITURE_MAP[run.found.cottage]?.name} — it's waiting in your Cottage!</p>}
      {run.found.lore && <p className="small">📜 New note in your Journal: <b>{run.found.lore}</b></p>}
      {xp.length > 0 && <div className="ex-xp">{xp.map(([s, n]) => <span key={s} className="tiny"><b>{SKILLS[s as keyof typeof SKILLS].name}</b> +{Math.round(n!).toLocaleString()} XP</span>)}</div>}
      {run.found.items.length > 0 && <div className="ex-found static">{run.found.items.map((s) => <span key={s.id} className="ex-found-item"><ItemIcon id={s.id} size={26} /><span className="tiny mono">{s.qty.toLocaleString()}</span></span>)}</div>}
      {(run.returned?.length ?? 0) > 0 && <p className="tiny muted">Unused supplies went back to your bag (or bank): {merge(run.returned!).map((s) => `${s.qty} ${getItem(s.id).name}`).join(', ')}.</p>}
      <button className="btn btn-hero" onClick={() => { sound.play('click'); onClose(); }}>BACK TO TOWN</button>
    </div>
  );
}

