// Combat: pick a monster, fight (it runs on its own), and play the optional strike/block minigame.
import { useEffect, useRef, useState } from 'react';
import { getItem, ITEMS, type CombatStyle } from '../../data/items';
import { MONSTERS, MONSTER_MAP, WEEKLY_BOSS, monsterStyle, type MonsterDef } from '../../data/monsters';
import { COMBAT_SKILLS, SKILLS } from '../../data/skills';
import { BLOCK_WINDOW_MS, STRIKE_SWEEP_SECONDS, fightSlot, combatStats, currentAmmo, maxHp, weaponStyle, whyCantFight } from '../../core/combat';
import { countInBag } from '../../core/inventory';
import { STRIKE_VEIN } from '../../core/minigames';
import { game, useGame } from '../../core/store';
import { levelProgress } from '../../core/xp';
import { ItemIcon, UiIcon } from '../icons';
import { fmtNum } from '../format';
import { MonsterArt } from '../MonsterArt';
import { useAnimationTime, useFeedback, FeedbackLayer } from '../Minigames';
import { PixelScene } from '../PixelScene';
import { TRAINING } from '../../data/places';
import { sound } from '../../audio/sound';
import { AttackFxLayer, type Fx } from '../AttackFx';
import { hasSavedNight, LanternWatch } from '../LanternWatch';
import { HoldWall, hasSavedWall } from '../HoldWall';
import { WAVES as WALL_WAVES } from '../../core/holdWall';
import { RoadUp } from '../RoadUp';
import { ExpeditionLaunch } from '../Expedition';
import { DungeonLaunch } from '../Dungeon';

const STYLE_ICON = { melee: 'melee', ranged: 'ranged', magic: 'magic' } as const;
const STYLE_NAME: Record<CombatStyle, string> = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic' };
const WEAK_TO: Record<CombatStyle, CombatStyle> = { ranged: 'melee', magic: 'ranged', melee: 'magic' };

function HpBar({ hp, max, tone }: { hp: number; max: number; tone: 'green' | 'red' }) {
  return (
    <div className="hp-bar">
      <div className={`hp-fill hp-${tone}`} style={{ width: `${Math.max(0, Math.min(1, hp / max)) * 100}%` }} />
      <span className="hp-text mono">{Math.max(0, hp)}/{max}</span>
    </div>
  );
}

function CombatSkills() {
  const { player } = useGame();
  return (
    <div className="combat-skills">
      {COMBAT_SKILLS.map((s) => {
        const prog = levelProgress(player.skills[s].xp);
        return (
          <div key={s} className="cskill">
            <span className={`tile-icon cs-${s}`}><UiIcon name={s as 'melee'} size={18} /></span>
            <span className="cskill-lv mono">{prog.level}</span>
            <span className="cskill-name">{SKILLS[s].name}</span>
            <div className="cskill-bar"><div style={{ width: `${prog.fraction * 100}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function MonsterCard({ m }: { m: MonsterDef }) {
  const { player } = useGame();
  const why = whyCantFight(player, m);
  const style = weaponStyle(player);
  const s = combatStats(player, m);
  const mStyle = monsterStyle(m);
  const [, force] = useState(0);
  useEffect(() => {
    if (!m.miniboss) return;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [m.miniboss]);
  return (
    <div className={`monster-card ${m.miniboss ? 'boss' : ''}`}>
      <div className="monster-portrait"><MonsterArt monster={m} size={72} /></div>
      <div className="grow">
        <div className="monster-name">{m.name} <span className="mono small muted">Lv {m.level}</span></div>
        {m.miniboss && <div className="boss-tag">MINI BOSS · drops gems</div>}
        <div className="small monster-meta">
          <span><UiIcon name={STYLE_ICON[mStyle]} size={13} /> {STYLE_NAME[mStyle]}</span>
          <span><UiIcon name="heart" size={13} /> {m.hp}</span>
          <span className={style === WEAK_TO[mStyle] ? 'green' : ''}>Weak to {STYLE_NAME[WEAK_TO[mStyle]]}</span>
        </div>
        <div className="small mono muted">Your hit chance {Math.round(s.accuracy * 100)}% · max hit {s.maxHit}</div>
      </div>
      <button className="btn btn-hero fight-btn" disabled={!!why} onClick={() => game.startFight(m.id)}>
        {why && m.miniboss ? <span className="small">{why.replace(`${m.name} is resting — `, '')}</span> : 'FIGHT'}
      </button>
      {why && !m.miniboss && <div className="small red monster-why">{why}</div>}
    </div>
  );
}

/** The weekly boss: a big card, or a DEFEATED screen with a countdown to Monday. */
function WeeklyBoss() {
  const { player } = useGame();
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const m = WEEKLY_BOSS;
  const readyAt = player.bossReadyAt[m.id] ?? 0;
  const style = monsterStyle(m);
  if (readyAt > Date.now()) {
    const left = readyAt - Date.now();
    const d = Math.floor(left / 86_400_000);
    const h = Math.floor((left % 86_400_000) / 3_600_000);
    const min = Math.floor((left % 3_600_000) / 60_000);
    const sec = Math.floor((left % 60_000) / 1000);
    return (
      <div className="weekly defeated">
        <div className="weekly-art"><MonsterArt monster={m} size={90} /></div>
        <div className="defeated-stamp">DEFEATED</div>
        <div className="weekly-name">{m.name}</div>
        <p className="small muted">You've beaten this week's boss. It wakes again on Monday.</p>
        <div className="countdown mono">
          <div><b>{d}</b><span>days</span></div><div><b>{h}</b><span>hrs</span></div><div><b>{min}</b><span>min</span></div><div><b>{sec}</b><span>sec</span></div>
        </div>
      </div>
    );
  }
  return (
    <div className="weekly">
      <div className="boss-tag">WEEKLY BOSS · 2 gems guaranteed</div>
      <div className="row">
        <div className="weekly-art"><MonsterArt monster={m} size={90} /></div>
        <div className="grow">
          <div className="weekly-name">{m.name} <span className="mono small muted">Lv {m.level}</span></div>
          <div className="small">This week it fights with <b className="gold">{STYLE_NAME[style]}</b> — weak to <b className="green">{STYLE_NAME[WEAK_TO[style]]}</b>.</div>
          <div className="small muted"><UiIcon name="heart" size={12} /> {fmtNum(m.hp)} HP · hits up to {m.maxHit}. Bring food!</div>
        </div>
      </div>
      <MonsterCardFightButton m={m} />
    </div>
  );
}

function MonsterCardFightButton({ m }: { m: MonsterDef }) {
  const { player } = useGame();
  const why = whyCantFight(player, m);
  return (
    <>
      <button className="btn btn-hero btn-lg btn-wide" disabled={!!why} onClick={() => game.startFight(m.id)}>
        <UiIcon name="combat" size={20} /> CHALLENGE THE MOSS KING
      </button>
      {why && <div className="small red">{why}</div>}
    </>
  );
}

/** The fight itself, with the strike/block minigame. */
function Fight({ onItem }: { onItem: (id: string) => void }) {
  const { player } = useGame();
  const f = player.fight!;
  const m = MONSTER_MAP[f.monsterId];
  const s = combatStats(player, m);
  const max = maxHp(player);
  const clock = useAnimationTime();
  const { items, push } = useFeedback();
  const [zone, setZone] = useState(0.5);
  const lastLog = useRef(0);
  const [hurt, setHurt] = useState(0);
  const [fx, setFx] = useState<Fx[]>([]);
  const [ouch, setOuch] = useState(0);
  const element = player.equipment.weapon ? getItem(player.equipment.weapon).equip?.element : undefined;

  // Float the newest combat events (and play an attack splash).
  useEffect(() => {
    const newest = f.log[f.log.length - 1];
    if (!newest || newest.at === lastLog.current) return;
    lastLog.current = newest.at;
    if (newest.kind === 'you') {
      const id = Date.now() + Math.random();
      setFx((list) => [...list.slice(-2), { id, style: s.style, element, crit: newest.text.startsWith('CRIT'), miss: newest.text === 'You missed' }]);
      setTimeout(() => setFx((list) => list.filter((e) => e.id !== id)), 750);
    }
    if (newest.kind === 'them' && !/miss|block/i.test(newest.text)) setOuch((o) => o + 1);
    if (newest.kind === 'you' && newest.text !== 'You missed') setHurt((h) => h + 1);
    push(newest.text, newest.kind === 'you' ? (newest.text.startsWith('CRIT') ? 'perfect' : 'good') : newest.kind === 'loot' ? 'combo' : 'miss');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.log.length, f.log[f.log.length - 1]?.at]);

  // Strike timing bar (same feel as Strike Vein).
  const t = (clock.now - clock.start.current) / 1000 / STRIKE_SWEEP_SECONDS;
  const phase = t % 2;
  const pos = phase < 1 ? phase : 2 - phase;
  const strike = () => {
    if (f.critReady) { push('Critical already charged!', 'info'); return; }
    if (Math.abs(pos - zone) <= STRIKE_VEIN.zone / 2) {
      if (!game.combatCharge()) push('Wait for the next monster', 'miss');
      setZone(0.2 + Math.random() * 0.6);
    } else { sound.play('whoosh'); push('Missed the timing — try again', 'miss'); }
  };
  const block = () => {
    const r = game.combatBlock();
    if (r === 'blocked') push('Shield up!', 'good');
    else if (r === 'early') { sound.play('whoosh'); push('Too early — wait for the wind-up', 'miss'); }
  };

  const windup = f.respawn > 0 ? 0 : Math.max(0, 1 - f.monsterTimer / BLOCK_WINDOW_MS);
  const ammo = currentAmmo(player);
  const foods = player.inventory.filter((x): x is NonNullable<typeof x> => !!x && !!ITEMS[x.id]?.heals);
  const foodIds = Array.from(new Set(foods.map((x) => x.id)));

  return (
    <div className="fight">
      {ouch > 0 && <div key={ouch} className="ouch-flash" aria-hidden="true" />}
      <div className="fight-stage">
        <div className="fight-monster">
          {f.respawn > 0 ? <div className="respawn muted">Another {m.name} is coming…</div> : <div key={hurt} className="hit-wobble"><MonsterArt monster={m} size={120} hurt={hurt > 0} /></div>}
          {f.respawn <= 0 && <AttackFxLayer fx={fx} />}
          <div className="fight-name">{m.name} <span className="mono small muted">Lv {m.level}</span></div>
          <HpBar hp={f.respawn > 0 ? m.hp : f.monsterHp} max={m.hp} tone="red" />
          <div className={`windup ${windup > 0 ? 'on' : ''}`}>
            <div className="windup-fill" style={{ width: `${(1 - Math.min(1, f.monsterTimer / m.speedMs)) * 100}%` }} />
            <span>{windup > 0 ? 'WINDING UP — BLOCK!' : 'attack'}</span>
          </div>
        </div>
        <FeedbackLayer items={items} />
      </div>

      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label"><UiIcon name="heart" size={14} /> You</span>
          <span className="mono small muted">{STYLE_NAME[s.style]} Lv {s.styleLevel} · hit {Math.round(s.accuracy * 100)}% · max {s.maxHit}{s.advantage > 0 ? ' · ADVANTAGE' : s.advantage < 0 ? ' · disadvantage' : ''}</span>
        </div>
        <HpBar hp={player.hp} max={max} tone="green" />
        <div className="strike-bar">
          <div className="strike-zone" style={{ left: `${(zone - STRIKE_VEIN.zone / 2) * 100}%`, width: `${STRIKE_VEIN.zone * 100}%` }} />
          <div className="strike-marker" style={{ left: `calc(${pos * 100}% - 4px)` }} />
        </div>
        <div className="btn-pair">
          <button className={`btn btn-hero btn-lg ${f.critReady ? 'charged' : ''}`} onClick={strike} data-silent>
            <UiIcon name="sword" size={20} /> {f.critReady ? 'CHARGED!' : 'STRIKE'}
          </button>
          <button className={`btn btn-block btn-lg ${windup > 0 ? 'ready' : ''}`} onClick={block} data-silent>
            <UiIcon name="shield" size={20} /> BLOCK
          </button>
        </div>
        <p className="mg-foot">Fights run on their own. STRIKE in the gold zone charges a critical hit; BLOCK during the wind-up halves the damage. Misses cost nothing.</p>
        {s.style !== 'melee' && (
          <div className="small">
            {ammo ? <><ItemIcon id={ammo} size={18} /> {getItem(ammo).name} × {fmtNum(countInBag(player.inventory, ammo))}</> : <span className="red">No {s.style === 'ranged' ? 'arrows' : 'runes'} in your bag!</span>}
          </div>
        )}
        <div className="food-row">
          {foodIds.length === 0 && <span className="small muted">No food in your bag — you'll eat automatically when low if you have some.</span>}
          {foodIds.map((id) => (
            <button key={id} className="food-btn" onClick={() => game.eat(id)} onContextMenu={(e) => { e.preventDefault(); onItem(id); }}>
              <ItemIcon id={id} size={26} /><span className="mono small">{countInBag(player.inventory, id)}</span><span className="small green">+{ITEMS[id].heals}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-stop btn-wide" onClick={() => game.stopFight()}><UiIcon name="stop" size={16} /> Leave fight ({f.kills} kills)</button>
      </div>
    </div>
  );
}

/** 📋 Today's three bounties. */
function BountyBoard() {
  const { player } = useGame();
  useEffect(() => { game.ensureBounties(); }, []);
  const list = player.bounties.list;
  if (!list.length) return null;
  return (
    <section className="card bounty-board">
      <div className="row-between">
        <h3>📋 Bounty Board</h3>
        <span className="small muted">{list.filter((b) => b.claimed).length}/{list.length} done · new each day</span>
      </div>
      {list.map((b, i) => {
        const m = MONSTER_MAP[b.monster];
        const done = b.progress >= b.goal;
        const here = m.region === player.location;
        return (
          <div key={i} className={`bounty ${b.claimed ? 'claimed' : ''}`}>
            <MonsterArt monster={m} size={36} />
            <div className="grow">
              <div className="small"><b>{b.claimed ? '✅ ' : ''}Defeat {b.goal} {m.name}</b> <span className="muted">{here ? '' : `· in ${m.region}`}</span></div>
              {!b.claimed && <div className="bar bar-thin"><div className="bar-fill tone-gold" style={{ width: `${(b.progress / b.goal) * 100}%` }} /></div>}
              <div className="small muted">Reward {fmtNum(b.coins)} coins + {getItem(b.find).emoji}</div>
            </div>
            {b.claimed ? null : done ? (
              <button className="btn btn-primary btn-sm" onClick={() => game.claimBounty(i)}>Claim</button>
            ) : (
              <div className="bounty-side">
                <span className="mono small muted">{b.progress}/{b.goal}</span>
                {!player.bounties.rerolled && <button className="link-btn small" onClick={() => game.rerollBounty(i)} title="Swap this bounty (once a day)">swap</button>}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function CombatScreen({ onItem }: { onItem: (id: string) => void }) {
  const { player, slot } = useGame();
  const fighting = !!player.fight && fightSlot(player) >= 0;
  const style = weaponStyle(player);
  const max = maxHp(player);
  const [watch, setWatch] = useState(false);
  const [wall, setWall] = useState(false);
  return (
    <div className="skill-screen">
      <PixelScene scene="forest" dim={0.65} className="screen-bg" />
      <div className="screen">
        <div className="row-between">
          <h1 className="screen-title">COMBAT</h1>
          <span className="small dim">📍 {TRAINING[player.location] ?? 'Training Grounds'}, {player.location}</span>
        </div>
        <CombatSkills />
        {fighting ? <Fight onItem={onItem} /> : (
          <>
            <div className="card combat-you">
              <div className="row-between">
                <span><UiIcon name={STYLE_ICON[style]} size={16} /> Fighting with <b className="gold">{STYLE_NAME[style]}</b>{player.equipment.weapon ? ` (${getItem(player.equipment.weapon).name})` : ' (fists)'}</span>
              </div>
              <HpBar hp={player.hp} max={max} tone="green" />
              <p className="small muted">Triangle: Melee beats Ranged · Ranged beats Magic · Magic beats Melee. Your weapon sets your style. You heal slowly out of combat, and eat food automatically when low.</p>
            </div>
            <ExpeditionLaunch />
            <DungeonLaunch />
            <button className="lw-launch" style={{ marginTop: 8 }} onClick={() => setWatch(true)}>
              <span className="lw-launch-emoji">🏮</span>
              <span className="grow"><b>Lantern Watch</b><span className="small muted">{hasSavedNight(slot)
                ? '💾 You have a saved night — tap to carry on.'
                : `Survive the night in ${player.location} — dodge the swarm, pick a power-up every level, face the dawn beast.`}</span></span>
              <span className="lw-launch-go">▶</span>
            </button>
            {watch && <LanternWatch onClose={() => setWatch(false)} />}
            <button className="lw-launch hw-launch" onClick={() => setWall(true)}>
              <span className="lw-launch-emoji">🛡️</span>
              <span className="grow"><b>Hold the Wall</b><span className="small muted">{hasSavedWall(slot)
                ? '💾 Your wall is waiting — tap to carry on.'
                : `Build towers and hold ${player.location}'s gate for ${WALL_WAVES} waves against its monsters.`}</span></span>
              <span className="lw-launch-go">▶</span>
            </button>
            {wall && <HoldWall onClose={() => setWall(false)} />}
            <BountyBoard />
            {player.location === WEEKLY_BOSS.region && <WeeklyBoss />}
            <h2 className="section-title">{player.location.toUpperCase()}</h2>
            {MONSTERS.filter((m) => m.region === player.location).map((m) => <MonsterCard key={m.id} m={m} />)}
            {player.location === 'Primordial Rift' && <RoadUp />}
            <p className="small dim center">Other towns have their own monsters — travel from the Town screen.</p>
            <p className="small dim center">Knocked out? You wake up safe in town — you never lose items.</p>
          </>
        )}
      </div>
    </div>
  );
}
