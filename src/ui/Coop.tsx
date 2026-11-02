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
import { DungeonFound, holdFor, lookOf, paintRoom, playSound, readBar, RoomControls, SkillBook, view, wantsTurn, writeBar, type Look } from './Dungeon';

/** How often the leader sends the room picture (ms). */
const PICTURE_MS = 60;
/** The rooms of a co-op outing: fights, an elite every third room, a little tougher each time (depth 1–5). */
const roomSpec = (n: number): RoomSpec => ({ kind: n % 3 === 2 ? 'elite' : 'fight', depth: Math.min(5, 1 + n), hp: 1e9, snacks: SNACKS, coop: true });
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
          <span className="small muted">Team up with a friend in {AREAS[player.location].name}: make a party and share its code, or join theirs. Tougher monsters — and you each get the full loot of every kill. Nothing you wear is at risk.</span></span>
        <span className="lw-launch-go">▶</span>
      </button>
      {open && <CoopShell onClose={() => setOpen(false)} />}
    </>
  );
}

type Stage = 'menu' | 'lobby' | 'play' | 'between';
type Listener = (m: PartyMsg) => void;

function CoopShell({ onClose }: { onClose: () => void }) {
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
  const link = useRef<PartyLink | null>(null);
  const listener = useRef<Listener | null>(null);
  const region: Region = role === 'friend' && party ? party.region : player.location;
  useEffect(() => { sound.playMusic(musicFor(region)); }, [region]);
  useEffect(() => () => { link.current?.close(); link.current = null; }, []);

  const why = player.dungeonRun ? "You're inside a dungeon run — finish it first (your gear is in there)." : '';
  const leave = () => { sound.play('click'); link.current?.close(); link.current = null; onClose(); };
  const lost = (msg: string) => { link.current?.close(); link.current = null; setErr(msg); setStage('menu'); setFriend(null); setParty(null); };

  // Every message from the other phone comes through here; a room in play also gets them.
  const onMsg = useRef<Listener>(() => {});
  onMsg.current = (m) => {
    if (m.t === 'nope') { lost(m.why); return; }
    if (role === 'lead') {
      if (m.t === 'peer' && m.on) link.current?.send({ t: 'party', region: player.location, lead: name });
      if (m.t === 'peer' && !m.on) { setFriend(null); if (stage !== 'play') sound.play('whoosh'); }
      if (m.t === 'card') { setFriend(m.card); setErr(''); sound.play('levelup', { rate: 1.3 }); }
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
      if (m.t === 'start') { setResult(null); setRoom((r) => ({ d: m.d, n: m.room, key: r.key + 1 })); setStage('play'); }
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
      sound.play('creak');
    } catch { setErr("Couldn't reach the party server — check your connection."); }
    setBusy(false);
  };
  const join = () => {
    if (why) { setErr(why); return; }
    const c = cleanCode(typed);
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
        {role === 'lead' && <button className="btn btn-hero" disabled={!friend} onClick={() => begin(0)}>{friend ? 'START' : 'WAITING FOR A FRIEND…'}</button>}
      </div>
    </div>
  );
  else if (stage === 'play' && role === 'lead') body = (
    <CoopLead key={room.key} link={link.current!} friend={friend} region={region} n={room.n} name={name} land={land} listen={(l) => { listener.current = l; }}
      onEnd={(won, found) => { listener.current = null; setResult({ won, found }); setStage('between'); }} onLeave={leave} />
  );
  else if (stage === 'play' && room.d) body = (
    <CoopFollow key={room.key} link={link.current!} start={room.d} n={room.n} lead={party?.lead ?? 'Leader'} land={land} listen={(l) => { listener.current = l; }}
      onEnd={(won, found) => { listener.current = null; setResult({ won, found }); setStage('between'); }} onLeave={leave} />
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

function CoopHud({ d, n, region, partner, note, onBook, onLeave }: { d: Dungeon; n: number; region: Region; partner: string; note?: string; onBook: () => void; onLeave: () => void }) {
  const h = d.hero;
  const al = d.ally?.hero;
  const left = d.mobs.filter((m) => m.hp > 0).length;
  const kind = roomSpec(n).kind;
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
function CoopFollow({ link, start, n, lead, land, listen, onEnd, onLeave }: {
  link: PartyLink; start: Dungeon; n: number; lead: string; land: boolean;
  listen: (l: Listener) => void; onEnd: (won: boolean, found: ExRun['found']) => void; onLeave: () => void;
}) {
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
        if (m.k?.length) game.dungeonReward(found.current, region, myStyle, m.k);
        for (const s of m.snd ?? []) playSound(s);
      } else if (m.t === 'end' && !ended.current) {
        ended.current = true;
        sound.play(m.won ? 'levelup' : 'fail', { rate: 1.2 });
        window.setTimeout(() => onEnd(m.won, found.current), 700);
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
      <CoopHud d={d} n={n} region={region} partner={lead} onBook={() => { sound.play('click'); setBook(true); }} onLeave={onLeave} />
      <RoomControls ctrl={controls} input={input} bar={bar} cd={d.cd ?? {}} snacks={d.snacks ?? 0} style={myStyle} hold={holdFor(input)}
        onSkill={skill} onEmpty={() => { sound.play('click'); setBook(true); }} onSnack={() => { link.send({ t: 'eat' }); sound.play('eat'); }} />
      {book && <SkillBook player={player} bar={bar} onBar={saveBar} style={myStyle} onClose={() => { sound.play('click'); setBook(false); }} />}
    </>
  );
}
