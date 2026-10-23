// Minigames for Woodcutting, Fishing, Cooking, Firemaking, Crafting and Enhancing.
// All cozy: misses never cost anything, idling never needs them.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getItem } from '../data/items';
import type { ActionDef } from '../data/skills';
import { enhanceChance } from '../core/enhancing';
import { FIRE_LOGS, MAX_FIRE_MS, usableFireLogs, whyCantDo } from '../core/idle';
import { countInBag } from '../core/inventory';
import { ACTIONS } from '../data/skills';
import { CHOP, HEAT, KINDLE, REEL, RUNE_ALIGN, STEADY_HANDS, type HitGrade } from '../core/minigames';
import { game, useGame } from '../core/store';
import { ItemIcon, UiIcon, type UiIconName } from './icons';
import { FeedbackLayer, gainText, useAnimationTime, useFeedback } from './Minigames';

function Inputs({ action }: { action: ActionDef }) {
  if (!action.inputs.length) return <>+{action.xp} XP</>;
  return <>+{action.xp} XP · {action.inputs.map((i) => `${i.qty} ${getItem(i.item).name}`).join(' + ')}</>;
}

function Panel({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="mg-panel">
      <div className="mg-row"><span className="mg-label">{label}</span><span className="mg-hint">{hint}</span></div>
      {children}
    </div>
  );
}

function BigButton({ icon, label, blocked, onPress, onRelease }: {
  icon: UiIconName; label: string; blocked: string | null; onPress: () => void; onRelease?: () => void;
}) {
  return (
    <button
      className="btn btn-hero btn-xl" disabled={!!blocked} data-silent
      onPointerDown={(e) => { if (onRelease) { e.preventDefault(); onPress(); } }}
      onPointerUp={onRelease} onPointerLeave={onRelease} onPointerCancel={onRelease}
      onClick={() => { if (!onRelease) onPress(); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <UiIcon name={icon} size={24} /> {blocked ?? label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Woodcutting — Timber!
// ---------------------------------------------------------------------------
export function Chop({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const [taps, setTaps] = useState(0);
  const [shake, setShake] = useState(0);
  const blocked = whyCantDo(player, action, { manual: true });
  useEffect(() => { setTaps(0); }, [action.id]);

  const chop = () => {
    if (blocked) return;
    setShake((s) => s + 1);
    const next = taps + 1;
    if (next < CHOP.tapsNeeded) { setTaps(next); return; }
    setTaps(0);
    const r = game.minigameReward(action.id, { xpMult: 1, bonusRolls: 0 });
    if (r.ok) push(`TIMBER!  ${gainText(r)}`, 'good');
  };

  return (
    <div className="mg">
      <div className="mg-stage" onClick={chop} role="presentation">
        <div key={shake} className={`tree-trunk ${shake ? 'chopped' : ''}`}><ItemIcon id={action.iconItem} size={56} /></div>
        <div className="mg-stage-name">{action.name}</div>
        <div className="mg-stage-xp"><Inputs action={action} /></div>
        <div className="pips">{Array.from({ length: CHOP.tapsNeeded }, (_, i) => <span key={i} className={`pip ${i < taps ? 'good' : ''}`} />)}</div>
        <FeedbackLayer items={items} />
      </div>
      <Panel label="Chop!" hint={`Tap ${CHOP.tapsNeeded} times for a log`}>
        <BigButton icon="woodcutting" label="CHOP" blocked={blocked} onPress={chop} />
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fishing — Reel It In (hold to reel)
// ---------------------------------------------------------------------------
export function ReelItIn({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const blocked = whyCantDo(player, action, { manual: true });
  const [, setFrame] = useState(0);
  const s = useRef({ hook: 0.2, vel: 0, catchBar: 0, clean: true, entered: false, holding: false, last: performance.now(), t0: performance.now() });

  useEffect(() => { Object.assign(s.current, { catchBar: 0, clean: true, entered: false }); }, [action.id]);

  const zoneCenter = (now: number) => {
    const t = (now - s.current.t0) / 1000;
    return 0.5 + 0.28 * Math.sin(t * 0.9) * Math.cos(t * 0.37);
  };

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const st = s.current;
      const now = performance.now();
      const dt = Math.min(0.05, (now - st.last) / 1000);
      st.last = now;
      if (!blocked) {
        st.hook += (st.holding ? REEL.riseSpeed : -REEL.fallSpeed) * dt;
        st.hook = Math.max(0, Math.min(1, st.hook));
        const inZone = Math.abs(st.hook - zoneCenter(now)) <= REEL.zone / 2;
        if (inZone) { st.entered = true; st.catchBar += REEL.fillPerSecond * dt; }
        else { if (st.entered) st.clean = false; st.catchBar = Math.max(0, st.catchBar - REEL.drainPerSecond * dt); }
        if (st.catchBar >= 1) {
          const clean = st.clean;
          Object.assign(st, { catchBar: 0, clean: true, entered: false });
          const r = game.minigameReward(action.id, { xpMult: clean ? 1.2 : 1, bonusRolls: clean ? REEL.cleanCatchBonusRolls : 0 });
          if (r.ok) push(clean ? `CLEAN CATCH!  ${gainText(r)}` : `Caught!  ${gainText(r)}`, clean ? 'combo' : 'good');
        }
      }
      setFrame((f) => (f + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.id, blocked]);

  const st = s.current;
  const zc = zoneCenter(performance.now());
  return (
    <div className="mg">
      <div className="mg-stage">
        <div className="reel-wrap">
          <div className="reel-track">
            <div className="reel-zone" style={{ bottom: `${(zc - REEL.zone / 2) * 100}%`, height: `${REEL.zone * 100}%` }}>
              <ItemIcon id={action.iconItem} size={30} />
            </div>
            <div className="reel-hook" style={{ bottom: `calc(${st.hook * 100}% - 3px)` }} />
          </div>
          <div className="reel-catch"><div className="reel-catch-fill" style={{ height: `${st.catchBar * 100}%` }} /></div>
        </div>
        <div className="mg-stage-name">{action.name}</div>
        <FeedbackLayer items={items} />
      </div>
      <Panel label="Reel It In" hint="Hold to reel · keep the hook on the fish">
        <BigButton icon="fishing" label={st.holding ? 'REELING…' : 'HOLD TO REEL'} blocked={blocked}
          onPress={() => { s.current.holding = true; }} onRelease={() => { s.current.holding = false; }} />
        <p className="mg-foot">Fill the catch bar. Stay on the fish the whole time for a bonus. Fish never get away.</p>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cooking — Heat Precision
// ---------------------------------------------------------------------------
export function HeatPrecision({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const clock = useAnimationTime();
  const [sears, setSears] = useState<boolean[]>([]);
  const [zone, setZone] = useState(0.5);
  const blocked = whyCantDo(player, action, { manual: true });
  useEffect(() => { setSears([]); }, [action.id]);

  const t = (clock.now - clock.start.current) / 1000 / HEAT.sweepSeconds;
  const phase = t % 2;
  const pos = phase < 1 ? phase : 2 - phase;

  // The fire ticks down while you're in the kitchen.
  useEffect(() => { game.setCookingOpen(true); return () => game.setCookingOpen(false); }, []);
  const logs = usableFireLogs(player);
  const [pickedLog, setStokeLog] = useState<string | null>(null);
  const stokeLog = pickedLog && logs.includes(pickedLog) ? pickedLog : logs[logs.length - 1] ?? null;
  const lit = player.fire.heatMs > 0;
  const heatFrac = Math.min(1, player.fire.heatMs / MAX_FIRE_MS);
  const flame = FIRE_LOGS[player.fire.log ?? stokeLog ?? 'pine_logs']?.color ?? '#f97316';

  const sear = () => {
    if (blocked) return;
    const golden = Math.abs(pos - zone) <= HEAT.zone / 2;
    const next = [...sears, golden];
    if (next.length < HEAT.searsNeeded) {
      setSears(next);
      push(golden ? 'Golden sear!' : 'Sizzle', golden ? 'perfect' : 'good');
      return;
    }
    const great = next.every(Boolean);
    const r = game.minigameReward(action.id, { xpMult: great ? HEAT.greatXpMult : 1, bonusRolls: 0, great });
    setSears([]);
    setZone(0.25 + Math.random() * 0.5);
    if (r.ok) push(great ? `GREAT FOOD!  ${gainText(r)}` : gainText(r), great ? 'combo' : 'good');
  };

  return (
    <div className="mg">
      <div className="mg-stage">
        <div className="pan-wrap">
          <div className="cook-flame" style={{ ['--flame' as string]: flame, opacity: lit ? 0.35 + heatFrac * 0.65 : 0, transform: `scaleY(${0.5 + heatFrac * 0.6})` }} />
          <div className="pan"><ItemIcon id={action.iconItem} size={58} /></div>
        </div>
        <div className="mg-stage-name">{action.name}</div>
        <div className="mg-stage-xp"><Inputs action={action} /></div>
        <div className="pips">{Array.from({ length: HEAT.searsNeeded }, (_, i) => <span key={i} className={`pip ${sears[i] === undefined ? '' : sears[i] ? 'perfect' : 'good'}`} />)}</div>
        <FeedbackLayer items={items} />
      </div>
      {!lit && <div className="fire-out">The fire has gone out! Stoke it to cook.</div>}
      <div className="mg-panel">
        <div className="mg-row">
          <span className="mg-label">Fire heat</span>
          <span className="mono small" style={{ color: flame }}>{Math.ceil(player.fire.heatMs / 1000)}s · {Math.round(heatFrac * 100)}%</span>
        </div>
        <div className="kindle-bar"><div className="kindle-fill" style={{ width: `${heatFrac * 100}%`, background: flame }} /></div>
        {logs.length > 1 && (
          <div className="log-pick">
            {logs.map((l) => (
              <button key={l} className={`res-chip ${l === stokeLog ? 'on' : ''}`} onClick={() => setStokeLog(l)}>
                <ItemIcon id={l} size={20} /> {getItem(l).name} <span className="chip-lv">{countInBag(player.inventory, l)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="mg-row">
          <span className="mg-label">Heat precision</span>
          <span className="mg-hint">Sear twice in the golden zone for GREAT food</span>
        </div>
        <div className="strike-bar heat-bar">
          <div className="strike-zone" style={{ left: `${(zone - HEAT.zone / 2) * 100}%`, width: `${HEAT.zone * 100}%` }} />
          <div className="strike-marker" style={{ left: `calc(${pos * 100}% - 4px)` }} />
        </div>
        <div className="btn-pair">
          <button className="btn btn-fire btn-lg" disabled={!stokeLog} onClick={() => game.stokeFire(stokeLog ?? undefined)}>
            <UiIcon name="firemaking" size={20} />
            <span className="btn-two-line"><b>STOKE FIRE</b><small>{stokeLog ? `1 ${getItem(stokeLog).name} · +${ACTIONS[FIRE_LOGS[stokeLog].burnAction].xp} Firemaking XP` : 'No logs you can burn'}</small></span>
          </button>
          <button className="btn btn-hero btn-lg" disabled={!!blocked} onClick={sear} data-silent>
            <UiIcon name="cooking" size={20} /> {blocked ? (lit ? blocked : 'NEED FIRE') : 'SEAR'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Firemaking — Kindle
// ---------------------------------------------------------------------------
const FLAME_COLORS: Record<string, string> = Object.fromEntries(Object.entries(FIRE_LOGS).map(([k, v]) => [k, v.color]));

export function Kindle({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const blocked = whyCantDo(player, action, { manual: true });
  const [, setFrame] = useState(0);
  const s = useRef({ meter: 0, startedAt: 0, last: performance.now(), litUntil: 0 });
  const logItem = action.inputs[0]?.item ?? action.iconItem;
  const flame = FLAME_COLORS[logItem] ?? '#f97316';

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const st = s.current;
      const dt = Math.min(0.05, (now - st.last) / 1000);
      st.last = now;
      st.meter = Math.max(0, st.meter - KINDLE.coolPerSecond * dt);
      if (st.meter === 0) st.startedAt = 0;
      setFrame((f) => (f + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const tap = () => {
    if (blocked) return;
    const st = s.current;
    const now = performance.now();
    if (st.meter === 0) st.startedAt = now;
    st.meter += KINDLE.perTap;
    if (st.meter >= 1) {
      const quick = (now - st.startedAt) / 1000 <= KINDLE.quickSeconds;
      st.meter = 0;
      st.startedAt = 0;
      st.litUntil = now + 1200;
      const r = game.minigameReward(action.id, { xpMult: quick ? KINDLE.quickXpMult : 1, bonusRolls: 0 });
      if (r.ok) push(quick ? `QUICK SPARK!  ${gainText(r)}` : `Lit!  ${gainText(r)}`, quick ? 'combo' : 'good');
    }
  };

  const st = s.current;
  const lit = performance.now() < st.litUntil;
  return (
    <div className="mg">
      <div className="mg-stage">
        <div className="fire-wrap">
          <div className={`fire ${lit ? 'lit' : ''}`} style={{ ['--flame' as string]: flame, opacity: lit ? 1 : 0.25 + st.meter * 0.75, transform: `scale(${lit ? 1.15 : 0.5 + st.meter * 0.5})` }} />
          <div className="fire-logs"><ItemIcon id={logItem} size={52} /></div>
        </div>
        <div className="mg-stage-name">{action.name}</div>
        <div className="mg-stage-xp"><Inputs action={action} /></div>
        <FeedbackLayer items={items} />
      </div>
      <Panel label="Kindling" hint={`Tap fast — light it in ${KINDLE.quickSeconds}s for a quick spark`}>
        <div className="kindle-bar"><div className="kindle-fill" style={{ width: `${Math.min(1, st.meter) * 100}%`, background: flame }} /></div>
        <BigButton icon="firemaking" label="ADD KINDLING" blocked={blocked} onPress={tap} />
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crafting — Steady Hands
// ---------------------------------------------------------------------------
function makeNotches() {
  return Array.from({ length: STEADY_HANDS.notches }, (_, i) => 0.2 + i * 0.3 + (Math.random() - 0.5) * 0.08);
}

export function SteadyHands({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const clock = useAnimationTime();
  const [notches, setNotches] = useState(makeNotches);
  const [hits, setHits] = useState<(HitGrade | null)[]>(() => Array(STEADY_HANDS.notches).fill(null));
  const blocked = whyCantDo(player, action, { manual: true });
  const pos = ((clock.now - clock.start.current) / 1000) / STEADY_HANDS.passSeconds;

  const finish = (final: (HitGrade | null)[]) => {
    const good = final.filter(Boolean).length;
    const perfect = final.filter((h) => h === 'perfect').length;
    const r = game.minigameReward(action.id, { xpMult: 1 + good * STEADY_HANDS.xpPerHit + perfect * STEADY_HANDS.xpPerPerfect, bonusRolls: 0 });
    if (r.ok) push(perfect === STEADY_HANDS.notches ? `FINE WORK!  ${gainText(r)}` : `Crafted!  ${gainText(r)}`, perfect === STEADY_HANDS.notches ? 'combo' : 'good');
    setNotches(makeNotches());
    setHits(Array(STEADY_HANDS.notches).fill(null));
    clock.reset();
  };

  // When the blade reaches the end, the item is done (misses just mean less bonus XP).
  useEffect(() => {
    if (pos >= 1 && !blocked) finish(hits);
    else if (pos >= 1) clock.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos >= 1]);

  const carve = () => {
    if (blocked || pos >= 1) return;
    let best = -1;
    let bestDist = 1;
    notches.forEach((n, i) => {
      const d = Math.abs(pos - n);
      if (hits[i] === null && d < bestDist) { best = i; bestDist = d; }
    });
    if (best < 0 || bestDist > STEADY_HANDS.goodDistance) { push('Steady… wait for a notch', 'miss'); return; }
    const grade: HitGrade = bestDist <= STEADY_HANDS.perfectDistance ? 'perfect' : 'good';
    const next = [...hits];
    next[best] = grade;
    setHits(next);
    push(grade === 'perfect' ? 'Perfect cut!' : 'Nice cut!', grade);
  };

  return (
    <div className="mg">
      <div className="mg-stage">
        <div className="bench"><ItemIcon id={action.iconItem} size={64} /></div>
        <div className="mg-stage-name">{action.name}</div>
        <div className="mg-stage-xp"><Inputs action={action} /></div>
        <FeedbackLayer items={items} />
      </div>
      <Panel label="Steady Hands" hint="Tap as the blade passes each notch">
        <div className="carve-bar">
          {notches.map((n, i) => <span key={i} className={`carve-notch ${hits[i] ?? ''}`} style={{ left: `${n * 100}%` }} />)}
          <div className="carve-blade" style={{ left: `calc(${Math.min(1, pos) * 100}% - 3px)` }} />
        </div>
        <BigButton icon="crafting" label="CARVE" blocked={blocked} onPress={carve} />
        <p className="mg-foot">The item is made every pass. Clean cuts give bonus XP.</p>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enhancing — Rune Align
// ---------------------------------------------------------------------------
export function RuneAlign({ action }: { action: ActionDef }) {
  const { player } = useGame();
  const { items, push } = useFeedback();
  const clock = useAnimationTime();
  const blocked = whyCantDo(player, action, { manual: true });
  const [busyUntil, setBusyUntil] = useState(0);
  const angle = (((clock.now - clock.start.current) / 1000) / RUNE_ALIGN.spinSeconds * 360) % 360;
  const fromTop = Math.min(angle, 360 - angle);
  const base = enhanceChance(player, action);

  const attempt = () => {
    if (blocked || performance.now() < busyUntil) return;
    const luck = fromTop <= RUNE_ALIGN.perfectDegrees ? RUNE_ALIGN.perfectLuck : fromTop <= RUNE_ALIGN.goodDegrees ? RUNE_ALIGN.goodLuck : 0;
    setBusyUntil(performance.now() + 700);
    const r = game.minigameReward(action.id, { xpMult: 1, bonusRolls: 0, chanceBonus: luck });
    if (!r.ok) return;
    if (luck) push(`Rune aligned! +${Math.round(luck * 100)}% luck`, luck === RUNE_ALIGN.perfectLuck ? 'perfect' : 'good');
    if (r.succeeded) push(`SUCCESS!  ${gainText(r)}`, 'combo');
    else push(`Didn't take — item kept safe  +${r.xp} XP`, 'miss');
  };

  return (
    <div className="mg">
      <div className="mg-stage">
        <div className="rune-wrap">
          <div className="rune-ring" style={{ transform: `rotate(${angle}deg)` }}><span className="rune-dot" /></div>
          <span className="rune-top" />
          <div className="rune-item"><ItemIcon id={action.upgrades ?? action.iconItem} size={56} /></div>
        </div>
        <div className="mg-stage-name">{action.name}</div>
        <div className="mg-stage-xp"><Inputs action={action} /></div>
        <FeedbackLayer items={items} />
      </div>
      <Panel label="Rune Align" hint={`Success chance ${Math.round(base * 100)}% · align for up to +${Math.round(RUNE_ALIGN.perfectLuck * 100)}%`}>
        <BigButton icon="enhancing" label="ENHANCE" blocked={blocked} onPress={attempt} />
        <p className="mg-foot">A failed try only uses the bars — your item is never lost.</p>
      </Panel>
    </div>
  );
}
