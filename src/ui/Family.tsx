// 🏰 Guild (Profile → Guild; called "family" in the code and save): start or join a guild, see everyone's adventurer, cheer big moments,
// and nudge someone to come play. Also: the invite prompt and the regular check-in (useFamilySync).
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ALL_SKILLS, SKILLS } from '../data/skills';
import { game, useGame } from '../core/store';
import type { PlayerState } from '../core/player';
import {
  cheerMoment, clearInvite, GOAL_EMOJI, goalReward, hearthLit, MEDAL_NAMES, MEDALS, nextWeekStart, playedToday, thisWeek, createFamily, familyInfo, inviteLink, joinFamily, lastBoard, lastFamilyName, leaveFamily,
  MOMENT_ICON, nudgeMember, onFamilyMoment, pendingInvite, rememberFamilyName, seen, setBoard, subscribeBoard, syncFamily,
  type FamilyBoard, type FamilyMember,
} from '../core/family';
import { skillLevel } from '../core/idle';
import { fmtDuration } from './format';
import { hasPushSubscription } from '../core/push';
import { Avatar } from './Avatar';
import { Sheet } from './components';
import { sound } from '../audio/sound';

const SYNC_MS = 3 * 60_000;

function useBoard() {
  return useSyncExternalStore(subscribeBoard, lastBoard, lastBoard);
}

/** Checks in with the family board while the game is open (every few minutes, and soon after a big moment). */
export function useFamilySync() {
  const { player, slot } = useGame();
  const inFamily = slot !== null && !!player.family;
  const key = player.family?.m;
  useEffect(() => {
    if (!inFamily) { setBoard(null); return; }
    let timer: number | undefined;
    let stopped = false;
    const run = () => {
      const p = game.player();
      if (!p.family || stopped) return;
      syncFamily(p).then((b) => game.familyBoard(b)).catch((e: Error) => {
        // Removed from the family (or it was closed): forget it on this save.
        if (/no longer in this guild/.test(e.message)) { setBoard(null); game.setFamily(null); }
      });
    };
    run();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') run(); }, SYNC_MS);
    const onVis = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVis);
    onFamilyMoment(() => { window.clearTimeout(timer); timer = window.setTimeout(run, 5000); });
    return () => { stopped = true; window.clearInterval(id); window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); onFamilyMoment(null); };
  }, [inFamily, key]);
}

/** "Join The Oak Family?" — shown after a save is opened from an invite link. */
export function FamilyInvite() {
  const { player, slot } = useGame();
  const [f, setF] = useState(() => pendingInvite());
  const [info, setInfo] = useState<{ name: string; members: string[]; full: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState(() => player.family?.me ?? lastFamilyName());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!f || slot === null) return;
    familyInfo(f).then(setInfo).catch((e: Error) => setErr(e.message));
  }, [f, slot]);
  if (!f || slot === null) return null;
  const close = () => { clearInvite(); setF(null); };
  const already = player.family?.f === f;
  const join = async () => {
    setBusy(true);
    try {
      if (player.family && !already) await leaveFamily(player.family).catch(() => {});
      const link = await joinFamily(f, name.trim() || 'Adventurer');
      rememberFamilyName(link.me);
      game.setFamily(link);
      sound.play('levelup');
      close();
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <Sheet title="🏰 Guild invite" onClose={close}>
      {err ? <p className="small">{err}</p>
        : !info ? <p className="small muted">Looking up the invite…</p>
        : already ? <p className="small">This save is already in <b>{info.name}</b>. 🏡</p>
        : info.full ? <p className="small"><b>{info.name}</b> is full (8 adventurers).</p>
        : (
          <div className="fam-form">
            <p>You've been invited to join <b>{info.name}</b>!</p>
            {info.members.length > 0 && <p className="small muted">Already there: {info.members.join(', ')}</p>}
            {player.family && <p className="small">This save will leave <b>{player.family.family}</b> to join.</p>}
            <label className="small">Your name in the guild
              <input className="name-input" value={name} maxLength={24} placeholder="e.g. Dad" onChange={(e) => setName(e.target.value)} />
            </label>
            <button className="btn btn-hero" disabled={busy || !name.trim()} onClick={join}>{busy ? 'Joining…' : `JOIN ${info.name.toUpperCase()}`}</button>
          </div>
        )}
      <button className="link-btn small" onClick={close}>{already || err ? 'Close' : 'Not now'}</button>
    </Sheet>
  );
}

/** A little copy of someone's adventurer, built from their board summary. */
function MiniAvatar({ m }: { m: FamilyMember }) {
  const fake = { equipment: m.snap.eq ?? {} } as unknown as PlayerState;
  return <div className="fam-avatar"><Avatar player={fake} size={64} /></div>;
}

/** 🏆 This week's family goal: everyone's play adds up; each step's reward is claimed by each member. */
function GoalCard({ board, player }: { board: FamilyBoard; player: PlayerState }) {
  const g = board.goal;
  if (!g) return null;
  const mine = thisWeek(player);
  const claimed = mine.week === g.week ? mine.claimed : 0;
  const top = g.steps[2];
  const pct = (n: number) => Math.min(100, (n / top) * 100);
  const best = Math.max(...ALL_SKILLS.map((s) => skillLevel(player, s)));
  const next = claimed < 3 && g.total >= g.steps[claimed] ? claimed : -1;
  const names = Object.fromEntries(board.members.map((m) => [m.id, m.id === player.family?.m ? 'You' : m.name]));
  const by = Object.entries(g.by).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const reward = next >= 0 ? goalReward(best, next) : null;
  return (
    <section className="card fam-goal">
      <div className="row-between">
        <h3>🏆 This week: {GOAL_EMOJI[g.kind] ?? '✨'} {g.label}</h3>
      </div>
      <div className="fam-goal-bar">
        <div className="fam-goal-fill" style={{ width: `${pct(g.total)}%` }} />
        {g.steps.map((s, i) => <span key={i} className={`fam-goal-mark ${g.total >= s ? 'done' : ''}`} style={{ left: `${pct(s)}%` }}>{MEDALS[i]}</span>)}
      </div>
      <div className="row-between tiny muted">
        <span className="mono">{g.total.toLocaleString()} / {top.toLocaleString()}</span>
        <span>new goal in {fmtDuration(nextWeekStart() - Date.now())}</span>
      </div>
      <div className="fam-goal-steps">
        {g.steps.map((s, i) => (
          <div key={i} className={`fam-goal-step ${g.total >= s ? 'done' : ''}`}>
            <b>{MEDALS[i]} {MEDAL_NAMES[i]}</b>
            <span className="tiny mono">{s.toLocaleString()}</span>
            <span className="tiny muted" style={{ display: 'block' }}>{i < claimed ? '✓ claimed' : g.total >= s ? 'ready!' : i === 2 ? '+ 🖼️ keepsake' : ' '}</span>
          </div>
        ))}
      </div>
      {by.length > 0 && (
        <div className="fam-goal-by tiny">
          {by.map(([id, n]) => <span key={id}><b>{names[id] ?? 'Someone'}</b> <span className="mono">{n.toLocaleString()}</span></span>)}
        </div>
      )}
      {reward && (
        <button className="btn btn-hero" onClick={() => game.claimFamilyGoal()}>
          CLAIM {MEDALS[next]} {MEDAL_NAMES[next].toUpperCase()} · {reward.coins.toLocaleString()} coins + a rare find{reward.keepsake && !player.cottage.includes('family_portrait') ? ' + 🖼️' : ''}
        </button>
      )}
      {claimed === 3 && <p className="tiny muted">All three steps claimed — well done, everyone! A new goal comes on Monday.</p>}
      {claimed < 3 && !reward && <p className="tiny muted">Everyone's normal play counts — idle, offline and minigames too.</p>}
    </section>
  );
}

function Start() {
  const [family, setFamily] = useState('');
  const [me, setMe] = useState(lastFamilyName());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const start = async () => {
    setBusy(true); setErr(null);
    try {
      const link = await createFamily(family.trim() || 'Our Guild', me.trim() || 'Adventurer');
      rememberFamilyName(link.me);
      game.setFamily(link);
      sound.play('levelup');
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <section className="card fam-start">
      <h3>🏰 Play together</h3>
      <p className="small muted">
        Start a guild and send the invite link to the people you play with. You'll see each other's adventurers,
        cheer each other's big moments and send a friendly "come play!" — no accounts or passwords.
      </p>
      <div className="fam-form">
        <label className="small">Guild name<input className="name-input" value={family} maxLength={24} placeholder="e.g. The Oak Guild" onChange={(e) => setFamily(e.target.value)} /></label>
        <label className="small">Your name in it<input className="name-input" value={me} maxLength={24} placeholder="e.g. Dad" onChange={(e) => setMe(e.target.value)} /></label>
        <button className="btn btn-hero" disabled={busy || !me.trim()} onClick={start}>{busy ? 'Starting…' : 'START A GUILD'}</button>
        {err && <p className="small red">{err}</p>}
      </div>
      <p className="small muted">Got an invite? Open the link on this phone and pick this save.</p>
    </section>
  );
}

export function FamilyTab() {
  const { player } = useGame();
  const board = useBoard();
  const link = player.family;
  const [msg, setMsg] = useState<string | null>(null);
  const [nudged, setNudged] = useState<string[]>([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  if (!link) return <Start />;

  const invite = async () => {
    const url = inviteLink(link.f);
    const text = `Come join ${link.family} in Ascension 999!`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Ascension 999', text, url }); return; }
    } catch { return; /* closed the share sheet */ }
    try { await navigator.clipboard.writeText(url); setMsg('Invite link copied — paste it in a message.'); } catch { setMsg(url); }
  };
  const cheer = async (id: number) => {
    sound.play('levelup');
    try { game.familyBoard(await cheerMoment(link, id)); } catch (e) { setMsg((e as Error).message); }
  };
  const nudge = async (m: FamilyMember) => {
    sound.play('click');
    setNudged((n) => [...n, m.id]);
    try {
      const r = await nudgeMember(link, m.id);
      setMsg(!r.ok ? `You already nudged ${m.name} today.` : r.push ? `👋 Nudge sent to ${m.name}!` : `👋 Nudged — ${m.name} will see it when they turn on notifications.`);
    } catch (e) { setMsg((e as Error).message); }
  };
  const leave = async () => {
    try { await leaveFamily(link); } catch { /* leave locally anyway */ }
    setBoard(null);
    game.setFamily(null);
    setConfirmLeave(false);
  };

  const names = Object.fromEntries((board?.members ?? []).map((m) => [m.id, m.id === link.m ? 'You' : m.name]));
  return (
    <>
      <section className="card fam-head">
        <div className="row-between">
          <h3>🏰 {board?.name ?? link.family}</h3>
          <button className="btn btn-primary" onClick={invite}>Invite</button>
        </div>
        {msg && <p className="small fam-msg" onClick={() => setMsg(null)}>{msg}</p>}
        {board && (() => {
          const others = playedToday(board, link.m);
          return hearthLit(player) || others.length
            ? <p className="small fam-hearth on">🔥 Hearth Together is lit: +5% XP in every skill today{others.length ? ` — ${others.map((m) => m.name).join(', ')} played too` : ''}.</p>
            : <p className="tiny muted fam-hearth">🔥 Hearth Together: +5% XP in every skill on days someone else in the guild plays too.</p>;
        })()}
        {!hasPushSubscription() && <p className="tiny muted">Turn on notifications in Settings so cheers and nudges reach your phone.</p>}
      </section>
      {board && <GoalCard board={board} player={player} />}

      {!board ? <p className="small muted">Loading the guild board…</p> : (
        <>
          <div className="fam-members">
            {board.members.map((m) => {
              const me = m.id === link.m;
              return (
                <div key={m.id} className={`fam-member card ${me ? 'me' : ''}`}>
                  <MiniAvatar m={m} />
                  <div className="fam-info">
                    <b>{m.name}{me ? ' (you)' : ''} {m.snap.pet ?? ''}</b>
                    <span className="small">{m.snap.town ?? '—'} · total level <span className="mono">{m.snap.total ?? 0}</span></span>
                    {m.snap.best && <span className="tiny muted">Best: {SKILLS[m.snap.best.skill]?.name} {m.snap.best.level}</span>}
                    <span className="tiny muted">{m.snap.idle?.length ? m.snap.idle.join(' · ') : 'Resting'}</span>
                    <span className={`tiny ${seen(m.updated, board.now) === 'playing now' ? 'fam-now' : 'muted'}`}>{seen(m.updated, board.now)}</span>
                  </div>
                  {!me && (
                    <button className="btn fam-nudge" disabled={nudged.includes(m.id)} onClick={() => nudge(m)} aria-label={`Nudge ${m.name}`}>👋</button>
                  )}
                </div>
              );
            })}
          </div>
          {board.members.length === 1 && <p className="small muted">It's just you so far — tap Invite to send the link.</p>}

          <h2 className="section-title">BIG MOMENTS</h2>
          {board.feed.length === 0 ? <p className="small muted">Nothing yet — new towns, big levels, boss wins and rare finds show up here.</p> : (
            <ul className="fam-feed">
              {board.feed.map((e) => {
                const mine = e.member === link.m;
                const cheered = e.cheers.includes(link.m);
                return (
                  <li key={e.id} className="fam-moment">
                    <span className="fam-icon">{MOMENT_ICON[e.kind] ?? '✨'}</span>
                    <span className="fam-text small">
                      <b>{names[e.member] ?? 'Someone'}</b> {e.text}
                      <span className="tiny muted"> · {seen(e.at, board.now).replace('playing now', 'just now')}
                        {e.cheers.length > 0 && ` · 🎉 ${e.cheers.map((c) => names[c] ?? 'someone').join(', ')}`}</span>
                    </span>
                    {!mine && e.kind !== 'leave' && (
                      <button className={`fam-cheer ${cheered ? 'on' : ''}`} disabled={cheered} onClick={() => cheer(e.id)} aria-label="Cheer">🎉</button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <div className="fam-leave">
        {confirmLeave
          ? <><span className="small">Leave {link.family}?</span> <button className="link-btn small red" onClick={leave}>Yes, leave</button> <button className="link-btn small" onClick={() => setConfirmLeave(false)}>Cancel</button></>
          : <button className="link-btn small muted" onClick={() => setConfirmLeave(true)}>Leave guild</button>}
      </div>
    </>
  );
}
