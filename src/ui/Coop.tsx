// 🤝 Dungeon together (v0.0.2.0, part 1 of the co-op dungeon). Make a party and share its code, or join a friend's.
// The leader's phone runs the room (core/dungeon.ts with a second seat); the friend's phone sends its button presses
// and draws the room from the pictures the leader sends (core/party.ts). Rooms come one after another in the leader's
// town — fights with an elite every third room, getting tougher as you go. Nothing you wear is at risk here; each
// phone pays its own player the XP and full loot of every monster beaten.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sound } from '../audio/sound';
import { musicFor } from '../audio/soundList';
import { addAlly, asSeat, castSkill, eatSnack, heroCard, newDungeon, SNACKS, step, type Dungeon, type HeroCard, type Input, type RoomSpec } from '../core/dungeon';
import { AREAS, type Run as ExRun } from '../core/expedition';
import { cleanCode, friendView, joinParty, newPartyCode, partyName, roomPicture, savePartyName, type PartyLink, type PartyMsg, type PartyRole } from '../core/party';
import { game, useGame } from '../core/store';
import { weaponStyle } from '../core/combat';
import { DUNGEON_TOWNS } from '../data/dungeonTowns';
import type { Region } from '../data/tiers';
import { useNoScroll } from './useNoScroll';
import { DungeonFound, DungeonShell, GearUp, holdFor, lookOf, paintRoom, playSound, readBar, RoomControls, RunEndPanel, RunMap, SkillBook, view, wantsTurn, WickStall, writeBar, type Look, type PartyCtx, type RunEnd } from './Dungeon';
import { charmOf, foodCount, roomOf, type DungeonRun } from '../core/dungeonRun';
import { partyAd, syncSoon } from '../core/family';
import type { ItemStack } from '../core/player';

/** How often the leader sends the room picture (ms). */
const PICTURE_MS = 60;
/** The rooms of a co-op outing: fights, an elite every third room, a little tougher each time (depth 1–5). */
const roomSpec = (n: number): RoomSpec => ({ kind: n % 3 === 2 ? 'elite' : 'fight', depth: Math.min(5, 1 + n), hp: 1e9, snacks: SNACKS, coop: true, practice: true });
const newFound = (): ExRun['found'] => ({ items: [], xp: {}, kills: 0 });

/** Combat-screen card. */
export function CoopLaunch() {
  const [open, setOpen] = useState(false);
  const { player } = useGame();
  return (
    <>
      <button className="lw-launch dg-launch" onClick={() => { sound.play('click'); setOpen(true); }}>
        <span className="lw-launch-emoji">🤝</span>
        <span className="grow"><b>Dungeon together</b>
          <span className="small muted">Team up with a friend in {AREAS[player.location].name}: make a party and share its code, or join theirs. Tougher monsters — and you each get the full loot of every kill. Nothing you wear is at risk.</span>
          <span className="lw-short">Team up with a friend</span></span>
        <span className="lw-launch-go">▶</span>
      </button>
      {open && <CoopShell onClose={() => setOpen(false)} />}
    </>
  );
}

type Stage = 'menu' | 'lobby' | 'play' | 'between' | 'gear' | 'run';
/** 🤝 The friend's card for a room of a run together: fighting numbers with the gear they took in, their run's health and food. */
function runCard(name: string, slot: number | null): HeroCard | null {
  const hero = game.dungeonHero();
  const r = game.dungeonRunNow();
  if (!hero || !r) return null;
  return { ...heroCard(hero, r.region), bar: readBar(slot, hero), look: lookOf(hero), name, hp: r.hp, snacks: foodCount(r), charm: charmOf(r) };
}
type Listener = (m: PartyMsg) => void;

export function CoopShell({ onClose, joinCode }: { onClose: () => void; joinCode?: string }) {
  const { player, slot } = useGame();
  const root = useRef<HTMLDivElement>(null);
  useNoScroll(root);
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight, turn: wantsTurn() }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight, turn: wantsTurn() });
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    const t = window.setInterval(on, 700);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); clearInterval(t); };
  }, []);
  const land = size.turn || size.w > size.h;
  view.rot = size.turn;
  view.root = root.current;

  const [stage, setStage] = useState<Stage>('menu');
  const [role, setRole] = useState<PartyRole>('lead');
  const [code, setCode] = useState('');
  const [typed, setTyped] = useState('');
  const [name, setName] = useState(() => partyName(player.family?.me));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [friend, setFriend] = useState<HeroCard | null>(null); // leader: who joined
  const [party, setParty] = useState<{ region: Region; lead: string } | null>(null); // friend: whose party
  const [room, setRoom] = useState<{ d?: Dungeon; n: number; key: number }>({ n: 0, key: 0 });
  const [result, setResult] = useState<{ won: boolean; found: ExRun['found'] } | null>(null);
  // 🗝️ A run together: the leader's map (friend), whether the friend is geared up and in (leader), partner gone
  const [runRows, setRunRows] = useState<DungeonRun['rows'] | null>(null);
  const [friendIn, setFriendIn] = useState(false);
  const [gone, setGone] = useState(false);
  const friendCard = useRef<HeroCard | null>(null);
  const link = useRef<PartyLink | null>(null);
  const listener = useRef<Listener | null>(null);
  const region: Region = role === 'friend' && party ? party.region : player.location;
  useEffect(() => { sound.playMusic(musicFor(region)); }, [region]);
  useEffect(() => () => { link.current?.close(); link.current = null; partyAd.code = ''; }, []);
  // 🏰 Joining from a guildmate's card
  useEffect(() => { if (joinCode) { setTyped(joinCode); setTimeout(() => joinWith(joinCode), 0); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const why = player.dungeonRun ? "You're inside a dungeon run — finish it first (your gear is in there)." : '';
  const leave = () => { sound.play('click'); link.current?.close(); link.current = null; partyAd.code = ''; onClose(); };
  const lost = (msg: string) => {
    link.current?.close(); link.current = null; partyAd.code = '';
    // In a run together your own run carries on (it's saved) — open the 🗝️ Dungeon to keep going.
    if (stage === 'run' || game.dungeonRunNow()) { setErr(`${msg} Your run is saved — carry on from 🗝️ Dungeon on the Combat screen.`); setStage('menu'); setGone(true); return; }
    setErr(msg); setStage('menu'); setFriend(null); setParty(null);
  };

  // Every message from the other phone comes through here; a room in play also gets them.
  const onMsg = useRef<Listener>(() => {});
  onMsg.current = (m) => {
    if (m.t === 'nope') { lost(m.why); return; }
    if (role === 'lead') {
      if (m.t === 'peer' && m.on) link.current?.send({ t: 'party', region: player.location, lead: name });
      if (m.t === 'peer' && !m.on) { setFriend(null); setFriendIn(false); friendCard.current = null; if (stage === 'run') setGone(true); if (stage !== 'play') sound.play('whoosh'); }
      if (m.t === 'card') { setFriend(m.card); setErr(''); sound.play('levelup', { rate: 1.3 }); }
      if (m.t === 'ready') { friendCard.current = m.card; if (!friendIn) { setFriendIn(true); sound.play('levelup', { rate: 1.4 }); } }
      if (m.t === 'cant') setErr(m.why);
    } else {
      if (m.t === 'peer' && !m.on) { lost('The party leader left.'); return; }
      if (m.t === 'party') {
        setParty({ region: m.region, lead: m.lead });
        const no = player.dungeonRun ? 'is inside a dungeon run' : !player.regions.includes(m.region) ? `hasn't found ${m.region} yet` : '';
        if (no) { link.current?.send({ t: 'cant', why: `${name} ${no}.` }); setErr(no === 'is inside a dungeon run' ? why : `You haven't found ${m.region} yet — walk there first.`); return; }
        link.current?.send({ t: 'card', card: { ...heroCard(player, m.region), bar: readBar(slot, player), look: lookOf(player), name } });
        sound.play('levelup', { rate: 1.3 });
      }
      if (m.t === 'start' && stage !== 'run') { setResult(null); setRoom((r) => ({ d: m.d, n: m.room, key: r.key + 1 })); setStage('play'); }
      if (m.t === 'mode' && m.run) {
        if (game.dungeonRunNow()) { link.current?.send({ t: 'cant', why: `${name} is already inside a dungeon run.` }); setErr("You're already inside a dungeon run — finish it first."); return; }
        setRunRows(null); setStage('gear');
      }
      if (m.t === 'run') setRunRows(m.rows);
    }
    listener.current?.(m);
  };
  const connect = (c: string, as: PartyRole) => {
    link.current?.close();
    link.current = joinParty(c, as, {
      msg: (m) => onMsg.current(m),
      state: (s, w) => { if (s === 'closed') lost(w ?? 'The connection was lost.'); },
    });
  };
  const make = async () => {
    if (why) { setErr(why); return; }
    setBusy(true); setErr('');
    try {
      const c = await newPartyCode();
      savePartyName(name);
      setRole('lead'); setCode(c); setStage('lobby');
      connect(c, 'lead');
      // 🏰 Your guildmates see the party on your guild card and can tap to join.
      Object.assign(partyAd, { code: c, region: player.location, at: Date.now() });
      syncSoon();
      sound.play('creak');
    } catch { setErr("Couldn't reach the party server — check your connection."); }
    setBusy(false);
  };
  const join = () => joinWith(typed);
  const joinWith = (raw: string) => {
    if (why) { setErr(why); return; }
    const c = cleanCode(raw);
    if (c.length !== 5) { setErr('A party code has 5 letters and numbers.'); sound.play('error', { volume: 0.5 }); return; }
    savePartyName(name);
    setErr(''); setRole('friend'); setCode(c); setStage('lobby');
    connect(c, 'friend');
    sound.play('creak');
  };
  const begin = (n: number) => { sound.play('creak'); setResult(null); setRoom((r) => ({ n, key: r.key + 1 })); setStage('play'); };

  let body: React.ReactNode;
  if (stage === 'menu') body = (
    <div className="dg-over">
      <div className="dg-panel cp-panel">
        <div className="row-between cp-top"><b className="gold">🤝 Dungeon together</b><button className="dg-icon" onClick={leave} aria-label="Close">✕</button></div>
        <p className="small muted center">Fight the dungeon rooms of <b>{AREAS[player.location].name}</b> side by side with a friend. Monsters are tougher, you each get the full loot of every kill, and nothing you wear is at risk. If one of you goes down, stand next to them to help them up.</p>
        <label className="cp-name small">Your name <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} /></label>
        {err && <p className="small cp-err">{err}</p>}
        <div className="dg-panel-btns">
          <button className="btn btn-hero" disabled={busy} onClick={make}>{busy ? 'MAKING A PARTY…' : 'MAKE A PARTY'}</button>
          <div className="cp-join">
            <input placeholder="CODE" value={typed} maxLength={5} autoCapitalize="characters" autoCorrect="off" spellCheck={false} onChange={(e) => setTyped(cleanCode(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') join(); }} />
            <button className="btn" onClick={join}>Join</button>
          </div>
        </div>
      </div>
    </div>
  );
  else if (stage === 'lobby') body = (
    <div className="dg-over">
      <div className="dg-panel cp-panel">
        <div className="row-between cp-top"><b className="gold">🤝 {role === 'lead' ? 'Your party' : 'Joined a party'}</b><button className="dg-icon" onClick={leave} aria-label="Leave the party">✕</button></div>
        <div className="cp-code mono">{code}</div>
        {role === 'lead' ? (
          friend ? <p className="small center">🟢 <b>{friend.name}</b> is here — ready when you are.</p>
            : <p className="small muted center">Tell your friend this code. They tap <b>🤝 Dungeon together</b> on their Combat screen and type it in.</p>
        ) : (
          party ? <p className="small center">🟢 You're in <b>{party.lead}</b>'s party in <b>{AREAS[party.region].name}</b>. Waiting for them to start…</p>
            : <p className="small muted center">Joining…</p>
        )}
        {err && <p className="small cp-err">{err}</p>}
        {role === 'lead' && (friend ? (
          <div className="dg-panel-btns">
            <button className="btn btn-hero" onClick={() => { if (why) { setErr(why); return; } link.current?.send({ t: 'mode', run: true }); setFriendIn(false); friendCard.current = null; setStage('gear'); sound.play('creak'); }}>🗝️ EXTRACTION RUN</button>
            <button className="btn" onClick={() => begin(0)}>⚔️ Practice rooms (nothing at risk)</button>
          </div>
        ) : <button className="btn btn-hero" disabled>WAITING FOR A FRIEND…</button>)}
        {role === 'lead' && <p className="tiny muted center">🏰 Guildmates can also join from your card on the Guild board.</p>}
      </div>
    </div>
  );
  else if (stage === 'play' && role === 'lead') body = (
    <CoopLead key={room.key} link={link.current!} friend={friend} region={region} n={room.n} name={name} land={land} listen={(l) => { listener.current = l; }}
      onEnd={(won, found) => { listener.current = null; setResult({ won, found }); setStage('between'); }} onLeave={leave} />
  );
  else if (stage === 'play' && room.d) body = (
    <CoopFollow key={room.key} link={link.current!} start={room.d} n={room.n} lead={party?.lead ?? 'Leader'} land={land} listen={(l) => { listener.current = l; }}
      onEnd={(won, found) => { listener.current = null; setResult({ won: !!won, found }); setStage('between'); }} onLeave={leave} />
  );
  else if (stage === 'between') body = (
    <div className="dg-over">
      <div className="dg-panel cp-panel">
        <b className="gold">{result?.won ? '🎉 Room cleared!' : '💫 You were both knocked out'}</b>
        {!result?.won && <p className="small muted center">Nothing is lost in a party — you keep the XP and loot from every monster you beat.</p>}
        {result && <DungeonFound found={result.found} rested={false} region={region} />}
        {role === 'lead' ? (
          <div className="dg-panel-btns">
            <button className="btn btn-hero" onClick={() => begin(result?.won ? room.n + 1 : room.n)}>{result?.won ? `NEXT ROOM ▶` : 'TRY AGAIN'}</button>
            <button className="btn" onClick={leave}>Leave the party</button>
          </div>
        ) : (
          <>
            <p className="small muted center">Waiting for {party?.lead ?? 'the leader'} to pick the next room…</p>
            <button className="btn" onClick={leave}>Leave the party</button>
          </>
        )}
      </div>
    </div>
  );
  // 🗝️ A run together: gear up, then the run itself (each in its own screen)
  if (stage === 'gear') {
    const lead = role === 'lead';
    return (
      <GearUp region={region} onClose={leave} rows={lead ? undefined : runRows ?? undefined}
        waiting={!lead && !runRows ? `Waiting for ${party?.lead ?? 'the leader'} to go in first…` : undefined}
        note={`🤝 A run together with ${lead ? friend?.name ?? 'your friend' : party?.lead ?? 'your friend'}: you each bring your own gear, food and run bag, and each get the full loot of every kill. ${lead ? 'You pick the rooms. ' : 'They pick the rooms. '}If one of you goes down, the other can help them up — only if you're both knocked out do you lose it all.`}
        onEntered={() => {
          if (lead) { const r = game.dungeonRunNow(); if (r) link.current?.send({ t: 'run', rows: r.rows }); }
          else { const c = runCard(name, slot); if (c) link.current?.send({ t: 'ready', card: c }); }
          setStage('run');
        }} />
    );
  }
  if (stage === 'run' && role === 'lead') {
    const ctx: PartyCtx | undefined = gone || !link.current ? undefined
      : { role: 'lead', link: link.current, me: name, partner: friend?.name ?? 'your friend', ready: friendIn, card: () => friendCard.current, listen: (l) => { listener.current = l; } };
    return <DungeonShell onClose={leave} party={ctx} />;
  }
  if (stage === 'run' && link.current) return <FollowShell link={link.current} lead={party?.lead ?? 'the leader'} me={name} listen={(l) => { listener.current = l; }} onClose={leave} />;
  return createPortal(
    <div className={`dg-root ${land ? 'land' : ''} ${size.turn ? 'rot' : ''}`} ref={root}
      style={size.turn ? { inset: 'auto', left: 0, top: 0, width: size.h, height: size.w, transformOrigin: '0 0', transform: `translate(${size.w}px, 0) rotate(90deg)` } : undefined}>
      {body}
    </div>,
    document.body,
  );
}

/** Shared room parts: the canvas loop and the keyboard (for testing on a computer). */
function useRoomLoop(tick: (dt: number, now: number) => void, deps: unknown[]) {
  useEffect(() => {
    let raf = 0, timer = 0, last = performance.now();
    const schedule = () => { raf = requestAnimationFrame(loop); timer = window.setTimeout(() => { cancelAnimationFrame(raf); loop(performance.now()); }, 50); };
    const loop = (now: number) => { clearTimeout(timer); const dt = now - last; last = now; tick(dt, now); schedule(); };
    schedule();
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
function useKeys(input: React.MutableRefObject<Input>, skill: (i: number) => void) {
  useEffect(() => {
    const set = (e: KeyboardEvent, on: boolean) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') input.current.left = on;
      else if (k === 'arrowright' || k === 'd') input.current.right = on;
      else if (k === 'arrowup' || k === 'w' || k === ' ') input.current.jump = on;
      else if (k === 'arrowdown' || k === 's') input.current.down = on;
      else if (k === 'j' || k === 'z') input.current.attack = on;
      else if (on && ['1', '2', '3', '4'].includes(k)) skill(Number(k) - 1);
      else return;
      e.preventDefault();
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  });
}

function CoopHud({ d, n, region, partner, note, onBook, onLeave, run }: { d: Dungeon; n: number; region: Region; partner: string; note?: string; onBook: () => void; onLeave: () => void; run?: DungeonRun }) {
  const h = d.hero;
  const al = d.ally?.hero;
  const left = d.mobs.filter((m) => m.hp > 0).length;
  const kind = run ? roomOf(run).kind : roomSpec(n).kind;
  return (
    <>
      <div className="dg-hud">
        <div className="dg-hp"><div style={{ width: `${(100 * Math.max(0, h.hp)) / h.maxHp}%` }} /><span className="mono">{Math.max(0, Math.round(h.hp)).toLocaleString()} / {h.maxHp.toLocaleString()}</span></div>
        <button className="dg-icon" onClick={onBook} aria-label="Skill book">📖</button>
        <button className="dg-icon" onClick={onLeave} aria-label="Leave the party">✕</button>
      </div>
      <div className="dg-sub">
        <span className="small">🤝 Room {n + 1} · {DUNGEON_TOWNS[region].rooms[kind]}{left ? ` · 👾 ${left} left` : ' · 🚪 the door is open'}</span>
        <span className="tiny cp-partner">{al ? <>{al.down ? '💫' : '🟢'} {partner} {al.down ? 'is down — stand next to them!' : `${Math.round((100 * al.hp) / al.maxHp)}%`}</> : note ?? `${partner} isn't here`}</span>
      </div>
      {h.down && <div className="cp-down"><b>💫 You're down!</b><span className="small">{al && !al.down ? `${partner} can help you up — they need to stand next to you.` : 'Hold on…'}</span></div>}
      {d.combo >= 3 && <div key={d.combo} className="dg-combo"><b>{d.combo}</b><span>HITS</span></div>}
    </>
  );
}

/** 🤝 The leader's phone: runs the room for both of you. */
function CoopLead({ link, friend, region, n, name, land, listen, onEnd, onLeave }: {
  link: PartyLink; friend: HeroCard | null; region: Region; n: number; name: string; land: boolean;
  listen: (l: Listener) => void; onEnd: (won: boolean, found: ExRun['found']) => void; onLeave: () => void;
}) {
  const { player, slot } = useGame();
  const [bar, setBar] = useState(() => readBar(slot, player));
  const [run] = useState<Dungeon>(() => {
    const d = newDungeon(player, region, readBar(slot, player), Math.floor(Math.random() * 2 ** 31), roomSpec(n));
    d.look = lookOf(player); d.name = name;
    if (friend) addAlly(d, friend);
    return d;
  });
  const [book, setBook] = useState(false);
  const [note, setNote] = useState<string>();
  const [, setTick] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const input = useRef<Input>({ left: false, right: false, jump: false, attack: false, down: false });
  const allyInput = useRef<Input>({ left: false, right: false, jump: false, attack: false });
  const look = useRef<Look>(lookOf(player));
  const camY = useRef<number | null>(null);
  const landRef = useRef(land); landRef.current = land;
  const found = useRef(newFound());
  const out = useRef<{ k: { m: string; boss?: boolean }[]; snd: string[]; at: number }>({ k: [], snd: [], at: 0 });
  const ended = useRef(false);

  useEffect(() => {
    link.send({ t: 'start', d: run, room: n });
    listen((m) => {
      if (m.t === 'in') allyInput.current = m.i;
      else if (m.t === 'sk') asSeat(run, 1, () => castSkill(run, m.i));
      else if (m.t === 'eat') asSeat(run, 1, () => eatSnack(run));
      else if (m.t === 'bar' && run.ally) run.ally.bar = m.bar;
      else if (m.t === 'peer' && !m.on && run.ally) { delete run.ally; setNote("Your friend left — you're on your own"); }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useRoomLoop((dt, now) => {
    if (!ended.current && !document.hidden) {
      const before = run.phase;
      for (const s of step(run, dt, input.current, allyInput.current)) { playSound(s); if (s !== 'jump') out.current.snd.push(s); }
      if (run.fallen.length) {
        const kills = run.fallen.splice(0);
        game.dungeonReward(found.current, region, run.style, kills);
        out.current.k.push(...kills);
      }
      if (now - out.current.at > PICTURE_MS || run.phase !== before) {
        out.current.at = now;
        link.send({ t: 's', s: roomPicture(run), k: out.current.k.splice(0), snd: out.current.snd.splice(0, 12) });
      }
      if (run.phase !== before) {
        ended.current = true;
        link.send({ t: 'end', won: run.phase === 'won' });
        sound.play(run.phase === 'won' ? 'levelup' : 'fail', { rate: 1.2 });
        window.setTimeout(() => onEnd(run.phase === 'won', found.current), 700);
      }
    }
    const c = canvas.current;
    if (c) paintRoom(c, run, look.current, landRef.current, landRef.current ? 64 : controls.current?.offsetHeight ?? 240, camY, dt);
    setTick((x) => (x + 1) % 1e6);
  }, [run]);
  const skill = (i: number) => { const s = castSkill(run, i); if (s) playSound(s); else sound.play('tick', { rate: 0.7, volume: 0.4 }); };
  useKeys(input, skill);
  const saveBar = (b: (string | null)[]) => { setBar(b); writeBar(slot, b); run.bar = b; };
  return (
    <>
      <canvas ref={canvas} className="dg-canvas" />
      <CoopHud d={run} n={n} region={region} partner={friend?.name ?? 'Friend'} note={note} onBook={() => { sound.play('click'); setBook(true); }} onLeave={onLeave} />
      <RoomControls ctrl={controls} input={input} bar={bar} cd={run.cd} snacks={run.snacks} style={run.style} hold={holdFor(input)}
        onSkill={skill} onEmpty={() => { sound.play('click'); setBook(true); }} onSnack={() => { if (eatSnack(run)) sound.play('eat'); else sound.play('error', { volume: 0.5 }); }} />
      {book && <SkillBook player={player} bar={bar} onBar={saveBar} style={run.style} onClose={() => { sound.play('click'); setBook(false); }} />}
    </>
  );
}

/** 🤝 The friend's phone: sends button presses, draws the room from the leader's pictures. */
function CoopFollow({ link, start, n, lead, land, listen, onEnd, onLeave, run: dRun }: {
  link: PartyLink; start: Dungeon; n: number; lead: string; land: boolean;
  listen: (l: Listener) => void; onEnd: (won: boolean | null, found: ExRun['found'], pending: ItemStack[], startSnacks: number, hero: Dungeon['hero'], snacksLeft: number) => void; onLeave: () => void;
  /** 🗝️ In a run together: your run (loot goes into this room's finds, gold and chests too). */
  run?: DungeonRun;
}) {
  const pending = useRef<ItemStack[]>([]);
  const startSnacks = useRef(dRun ? foodCount(dRun) : 0);
  const { player, slot } = useGame();
  const region = start.region;
  const myStyle = weaponStyle(player);
  const [bar, setBar] = useState(() => readBar(slot, player));
  const [book, setBook] = useState(false);
  const [, setTick] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const input = useRef<Input>({ left: false, right: false, jump: false, attack: false, down: false });
  const look = useRef<Look>(lookOf(player));
  const camY = useRef<number | null>(null);
  const landRef = useRef(land); landRef.current = land;
  const found = useRef(newFound());
  const pics = useRef<{ prev: Partial<Dungeon> | null; cur: Partial<Dungeon>; at: number; gap: number }>({ prev: null, cur: {}, at: 0, gap: PICTURE_MS });
  const shown = useRef<Dungeon>(friendView(start, null, {}, 1));
  const sent = useRef({ key: '', at: 0 });
  const ended = useRef(false);

  useEffect(() => {
    listen((m) => {
      if (m.t === 's') {
        const now = performance.now();
        const p = pics.current;
        pics.current = { prev: p.at ? p.cur : null, cur: m.s, at: now, gap: p.at ? Math.max(30, Math.min(200, now - p.at)) : PICTURE_MS };
        if (m.k?.length) game.dungeonReward(found.current, region, myStyle, m.k, dRun ? pending.current : undefined);
        if (dRun && m.g) game.dungeonGold(pending.current, m.g);
        if (dRun && m.o) for (let i = 0; i < m.o; i++) game.dungeonChest(pending.current);
        for (const s of m.snd ?? []) playSound(s);
      } else if (m.t === 'end' && !ended.current) {
        ended.current = true;
        sound.play(m.won ? 'levelup' : 'fail', { rate: 1.2 });
        const v = shown.current;
        window.setTimeout(() => onEnd(m.won, found.current, pending.current, startSnacks.current, v.hero, v.snacks ?? 0), 700);
      } else if (m.t === 'abort' && !ended.current) {
        ended.current = true;
        onEnd(null, found.current, [], startSnacks.current, shown.current.hero, shown.current.snacks ?? 0);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useRoomLoop((dt, now) => {
    // Send your buttons when they change (and now and then, so a lost one is never stuck).
    const key = JSON.stringify(input.current);
    if (key !== sent.current.key || now - sent.current.at > 500) { sent.current = { key, at: now }; link.send({ t: 'in', i: { ...input.current } }); }
    const p = pics.current;
    if (p.at) shown.current = friendView(start, p.prev, p.cur, Math.min(1, (now - p.at) / p.gap));
    const c = canvas.current;
    if (c) paintRoom(c, shown.current, look.current, landRef.current, landRef.current ? 64 : controls.current?.offsetHeight ?? 240, camY, dt);
    setTick((x) => (x + 1) % 1e6);
  }, []);
  const skill = (i: number) => { link.send({ t: 'sk', i }); sound.play('tick', { rate: 1.2, volume: 0.35 }); };
  useKeys(input, skill);
  const saveBar = (b: (string | null)[]) => { setBar(b); writeBar(slot, b); link.send({ t: 'bar', bar: b }); };
  const d = shown.current;
  return (
    <>
      <canvas ref={canvas} className="dg-canvas" />
      <CoopHud d={d} n={n} region={region} partner={lead} onBook={() => { sound.play('click'); setBook(true); }} onLeave={onLeave} run={dRun} />
      <RoomControls ctrl={controls} input={input} bar={bar} cd={d.cd ?? {}} snacks={d.snacks ?? 0} style={myStyle} hold={holdFor(input)}
        onSkill={skill} onEmpty={() => { sound.play('click'); setBook(true); }} onSnack={() => { link.send({ t: 'eat' }); sound.play('eat'); }} />
      {book && <SkillBook player={player} bar={bar} onBar={saveBar} style={myStyle} onClose={() => { sound.play('click'); setBook(false); }} />}
    </>
  );
}

/** 🤝 The friend's screen in a run together: the leader's map (you follow their choices), your own Wick's stall, the rooms
 * (drawn from the leader's pictures) and the end. Your run — gear, food and run bag — is your own, saved on your phone. */
function FollowShell({ link, lead, me, listen, onClose }: { link: PartyLink; lead: string; me: string; listen: (l: Listener) => void; onClose: () => void }) {
  const { player, slot } = useGame();
  const run = player.dungeonRun;
  const root = useRef<HTMLDivElement>(null);
  useNoScroll(root);
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight, turn: wantsTurn() }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight, turn: wantsTurn() });
    window.addEventListener('resize', on);
    const t = window.setInterval(on, 700);
    return () => { window.removeEventListener('resize', on); clearInterval(t); };
  }, []);
  const land = size.turn || size.w > size.h;
  view.rot = size.turn;
  view.root = root.current;
  const [room, setRoom] = useState<{ d: Dungeon; key: number } | null>(null);
  const [shop, setShop] = useState(false);
  const [end, setEnd] = useState<RunEnd | null>(null);
  const roomListener = useRef<Listener | null>(null);
  const region = run?.region ?? end?.region ?? player.location;
  useEffect(() => { sound.playMusic(musicFor(region)); }, [region]);
  // Keep the leader up to date with your health and food for the next room.
  useEffect(() => { const c = runCard(me, slot); if (c && !end) link.send({ t: 'ready', card: c }); }, [run?.hp, run ? foodCount(run) : -1, run?.row, run?.at]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    listen((m) => {
      if (m.t === 'go') { game.dungeonGo(m.i); setShop(false); }
      else if (m.t === 'start') { setShop(false); setRoom((r) => ({ d: m.d, key: (r?.key ?? 0) + 1 })); }
      else if (m.t === 'extract') {
        const r = game.dungeonRunNow();
        if (r) { const bag = game.dungeonExtract(false); setRoom(null); setEnd({ kind: 'out', region: r.region, bag }); }
      } else roomListener.current?.(m);
    });
    return () => listen(null as unknown as Listener);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const roomDone = (won: boolean | null, found: ExRun['found'], pending: ItemStack[], startSnacks: number, hero: Dungeon['hero'], snacksLeft: number) => {
    roomListener.current = null;
    setRoom(null);
    const r = game.dungeonRunNow();
    if (!r || won === null) return; // back to the map: the room starts over
    if (won) {
      const boss = roomOf(r).kind === 'boss';
      const bag = r.bag.map((x) => ({ ...x }));
      for (const x of pending) { const b = bag.find((y) => y.id === x.id); if (b) b.qty += x.qty; else bag.push({ ...x }); }
      // Down when the room was won? Your partner carries you through — back up with a little health.
      const hp = hero.down ? Math.round(hero.maxHp * 0.3) : hero.hp;
      game.dungeonRoomCleared(hp, Math.max(0, startSnacks - snacksLeft), pending, found.kills);
      if (boss) setEnd({ kind: 'won', region: r.region, bag, found });
    } else {
      const lostRun = game.dungeonDie();
      setEnd({ kind: 'dead', region: r.region, bag: [], lost: lostRun ?? undefined });
    }
  };
  let body: React.ReactNode = null;
  if (end) body = <RunEndPanel end={end} onClose={onClose} />;
  else if (room && run) body = <CoopFollow key={room.key} link={link} start={room.d} n={run.row} lead={lead} land={land} run={run} listen={(l) => { roomListener.current = l; }} onEnd={roomDone} onLeave={onClose} />;
  else if (run && shop) body = <WickStall run={run} onClose={() => { sound.play('click'); setShop(false); }} />;
  else if (run) body = <RunMap run={run} onEnter={() => {}} onExtract={() => {}} onClose={onClose} onShop={() => { sound.play('coin'); setShop(true); }} follow={`Following ${lead} — they pick the rooms and when to leave.`} />;
  return createPortal(
    <div className={`dg-root ${land ? 'land' : ''} ${size.turn ? 'rot' : ''}`} ref={root}
      style={size.turn ? { inset: 'auto', left: 0, top: 0, width: size.h, height: size.w, transformOrigin: '0 0', transform: `translate(${size.w}px, 0) rotate(90deg)` } : undefined}>
      {body}
    </div>,
    document.body,
  );
}
