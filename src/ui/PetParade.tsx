// 🎪 Pet Parade — the screen. Rules live in core/petParade.ts; this file draws the stall, your line of
// critters, plays the parade back frame by frame, makes the sounds, and keeps the parade on this device
// (`ui.parade.<slot>`) so you can leave and carry on later.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sound } from '../audio/sound';
import {
  buyFood, buyPet, expPips, FOOD, KIND, KINDS, level, LIVES, loadRun, march, moveOrMerge, newRun, PERKS, PET_COST, REROLL_COST, reroll,
  saveRun, sellPet, sellValue, TEAM_SIZE, toggleFreeze, WINS_NEEDED, type Act, type FView, type Frame, type ParadeOutcome, type Pet, type Run,
} from '../core/petParade';
import { game, useGame } from '../core/store';
import { getItem } from '../data/items';

type Reward = ReturnType<typeof game.petParadeEnd>;
type Sel = { kind: 'stall'; i: number } | { kind: 'food'; i: number } | { kind: 'team'; i: number } | null;

const saveKey = (slot: number | null) => `ui.parade.${slot ?? 0}`;
function readSaved(slot: number | null): Run | null { try { return loadRun(localStorage.getItem(saveKey(slot))); } catch { return null; } }
function writeSaved(slot: number | null, r: Run) { try { localStorage.setItem(saveKey(slot), saveRun(r)); } catch { /* storage full */ } }
function clearSaved(slot: number | null) { try { localStorage.removeItem(saveKey(slot)); } catch { /* ignore */ } }
export function hasSavedParade(slot: number | null) { try { return localStorage.getItem(saveKey(slot)) !== null; } catch { return false; } }

const clone = (r: Run): Run => JSON.parse(JSON.stringify(r));
const RESULT_ICON = { win: '🎀', loss: '💔', draw: '🤝' } as const;
/** "Farmer Wren's" but "The Ironmoor Lads'". */
const whose = (name: string) => (name.endsWith('s') ? `${name}'` : `${name}'s`);

function Critter({ id, atk, hp, perk, lvl, pips, temp, dead, gold, small }: {
  id: string; atk: number; hp: number; perk?: string | null; lvl?: number; pips?: [number, number]; temp?: [number, number]; dead?: boolean; gold?: boolean; small?: boolean;
}) {
  const k = KIND[id];
  return (
    <span className={`pp-critter ${dead ? 'dead' : ''} ${gold ? 'champ' : ''} ${small ? 'small' : ''}`}>
      {lvl && lvl > 1 && <span className="pp-lv">Lv{lvl}</span>}
      {perk && <span className="pp-perk">{PERKS[perk as keyof typeof PERKS]?.emoji}</span>}
      <span className="pp-emoji">{k?.emoji ?? '❔'}</span>
      <span className="pp-stats mono">
        <span className="pp-atk">{atk + (temp?.[0] ?? 0)}</span><span className="pp-hp">{hp + (temp?.[1] ?? 0)}</span>
      </span>
      {pips && pips[1] > 0 && <span className="pp-pips">{Array.from({ length: pips[1] }, (_, i) => <i key={i} className={i < pips[0] ? 'on' : ''} />)}</span>}
    </span>
  );
}

export function PetParade({ onClose }: { onClose: () => void }) {
  const { player, slot } = useGame();
  const [saved, setSaved] = useState<Run | null>(() => readSaved(slot));
  const [run, setRun] = useState<Run | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<number, string>>({});
  const [show, setShow] = useState<ParadeOutcome | null>(null);
  const [frame, setFrame] = useState(0);
  const [fast, setFast] = useState(false);
  const [reward, setReward] = useState<Reward | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const paid = useRef(false);
  const champions = KINDS.filter((k) => k.champion && player.pets.includes(k.champion));

  // Leaving keeps the parade on this device (rewards only when it ends).
  const runRef = useRef<Run | null>(null);
  runRef.current = run;
  useEffect(() => () => { const r = runRef.current; if (r && r.phase === 'shop' && !paid.current) writeSaved(slot, r); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pay = (r: Run) => {
    if (paid.current) return;
    paid.current = true;
    clearSaved(slot);
    setReward(game.petParadeEnd({ wins: r.wins }));
  };

  const start = () => {
    paid.current = false;
    const r = newRun({ champions: player.pets });
    clearSaved(slot);
    setReward(null); setShow(null); setSel(null); setMsg(null);
    setRun(r);
    writeSaved(slot, r);
    sound.play('welcome', { volume: 0.7 });
  };
  const resume = () => {
    if (!saved) return;
    paid.current = false;
    // Champions you've found since leaving join the stall too.
    saved.champions = Array.from(new Set([...saved.champions, ...player.pets]));
    setRun(saved); setSaved(null);
    sound.play('welcome', { volume: 0.6 });
  };
  const endSaved = () => { if (saved) { setRun(saved); setSaved(null); saved.phase = 'over'; pay(saved); } };

  /** Runs one stall action on a copy, then shows what changed (little +1/+1 pops). */
  const act = (fn: (r: Run) => Act | void, good: () => void) => {
    if (!run) return;
    const r = clone(run);
    const res = fn(r);
    if (res && !res.ok) { setMsg(res.why); sound.play('whoosh', { volume: 0.4 }); return; }
    const before = new Map(run.team.filter((p): p is Pet => !!p).map((p) => [p.uid, p]));
    const pops: Record<number, string> = {};
    for (const p of r.team) {
      if (!p) continue;
      const b = before.get(p.uid);
      if (!b) continue;
      const da = p.atk + p.tAtk - b.atk - b.tAtk, dh = p.hp + p.tHp - b.hp - b.tHp;
      if (da || dh) pops[p.uid] = `${da >= 0 ? '+' : ''}${da}/${dh >= 0 ? '+' : ''}${dh}`;
      if (level(p) > level(b)) pops[p.uid] = '⬆ LEVEL UP';
    }
    setFlash(pops);
    if (Object.keys(pops).length) window.setTimeout(() => setFlash({}), 900);
    setRun(r);
    setSel(null);
    setMsg(null);
    writeSaved(slot, r);
    if (res && res.ok && res.levelUp) { sound.play('levelup', { volume: 0.7 }); game.vibrate(40); } else good();
  };

  const tapStall = (i: number) => { sound.play('tile', { rate: 1.1, volume: 0.6 }); setMsg(null); setSel(sel?.kind === 'stall' && sel.i === i ? null : { kind: 'stall', i }); };
  const tapFood = (i: number) => { sound.play('tile', { rate: 1.2, volume: 0.6 }); setMsg(null); setSel(sel?.kind === 'food' && sel.i === i ? null : { kind: 'food', i }); };
  const tapTeam = (i: number) => {
    if (!run) return;
    if (sel?.kind === 'stall') return act((r) => buyPet(r, sel.i, i), () => { sound.play('coin', { volume: 0.8 }); sound.play('match', { rate: 1.3, volume: 0.4 }); });
    if (sel?.kind === 'food') return act((r) => buyFood(r, sel.i, i), () => { sound.play('eat', { volume: 0.8 }); });
    if (sel?.kind === 'team' && sel.i !== i) return act((r) => moveOrMerge(r, sel.i, i), () => sound.play('clack', { volume: 0.6 }));
    if (!run.team[i]) { sound.play('whoosh', { volume: 0.3 }); setSel(null); return; }
    sound.play('tile', { volume: 0.6 });
    setSel(sel?.kind === 'team' && sel.i === i ? null : { kind: 'team', i });
  };
  const doSell = () => { if (sel?.kind === 'team') act((r) => sellPet(r, sel.i), () => sound.play('deposit', { volume: 0.8 })); };
  const doFreeze = () => {
    if (!run || !sel || sel.kind === 'team') return;
    const r = clone(run);
    toggleFreeze(r, sel.kind === 'stall' ? 'pet' : 'food', sel.i);
    setRun(r); writeSaved(slot, r);
    sound.play('douse', { rate: 1.3, volume: 0.6 });
  };
  const doReroll = () => act((r) => reroll(r), () => { sound.play('card', { volume: 0.8 }); sound.play('card', { rate: 1.25, volume: 0.6 }); });
  const doMarch = () => {
    if (!run) return;
    const r = clone(run);
    const o = march(r);
    if (!o) { setMsg('Put at least one critter in your parade.'); sound.play('whoosh', { volume: 0.4 }); return; }
    setSel(null); setMsg(null);
    setRun(r);
    if (r.phase === 'shop') writeSaved(slot, r); else clearSaved(slot);
    setFrame(0);
    setShow(o);
    sound.play('ignite', { rate: 1.4, volume: 0.5 });
  };

  // ----- Playing the parade back -----
  useEffect(() => {
    if (!show) return;
    const frames = show.battle.frames;
    if (frame >= frames.length - 1) return;
    const f = frames[frame + 1];
    const ms = (f.attack ? 650 : f.text ? 560 : 400) * (fast ? 0.45 : 1);
    const t = window.setTimeout(() => {
      setFrame((x) => x + 1);
      if (f.attack) { sound.play('hit', { rate: 0.9 + Math.random() * 0.3, volume: 0.7 }); game.vibrate(15); }
      else if (f.text?.includes('faints')) sound.play('thud', { volume: 0.6 });
      else if (f.text?.includes('joins')) sound.play('welcome', { rate: 1.4, volume: 0.4 });
      else if (frame + 1 === frames.length - 1) {
        if (show.result === 'win') { sound.play('levelup', { volume: 0.8 }); game.vibrate(60); }
        else if (show.result === 'loss') sound.play('fail', { volume: 0.6 });
        else sound.play('tick', { volume: 0.6 });
      } else if (f.text) sound.play('enchant', { rate: 1.3, volume: 0.45 });
    }, ms);
    return () => window.clearTimeout(t);
  }, [show, frame, fast]);
  const skip = () => { if (show) { setFrame(show.battle.frames.length - 1); sound.play('click', { volume: 0.5 }); } };
  const afterParade = () => {
    setShow(null);
    sound.play('click', { volume: 0.5 });
    if (run && run.phase === 'over') pay(run);
  };

  const r = run;
  const selPet = r && sel?.kind === 'stall' ? r.stall.pets[sel.i] : null;
  const selFood = r && sel?.kind === 'food' ? r.stall.foods[sel.i] : null;
  const selTeam = r && sel?.kind === 'team' ? r.team[sel.i] : null;
  const canMerge = (id: string) => !!r?.team.some((p) => p && p.id === id && level(p) < 3);

  return createPortal(
    <div className="lw-root pp-root" ref={wrapRef}>
      {!r && !reward && (
        <div className="lw-intro pp-intro">
          <div className="lw-title pp-title">🎪 PET PARADE</div>
          {saved ? (
            <>
              <p className="lw-sub">Your parade is waiting · turn {saved.turn} · 🎀 {saved.wins}/{WINS_NEEDED} · 🧡 {saved.lives}</p>
              <div className="lw-btns col">
                <button className="btn btn-hero btn-lg btn-wide" onClick={resume}>▶ Carry on the parade</button>
                <button className="btn btn-lg btn-wide" onClick={endSaved}>🏠 End it & collect the rewards</button>
                <button className="btn btn-lg btn-wide" onClick={onClose}>Back</button>
              </div>
            </>
          ) : (
            <>
              <p className="lw-sub">Line up 5 critters and march against the town's rival parades!</p>
              <ul className="lw-rules small">
                <li>🪙 Each turn you get 10 parade coins. Critters cost {PET_COST}, snacks 3, new wares {REROLL_COST}.</li>
                <li>👆 Tap a critter in the stall, then tap a spot in your line. The <b>front</b> is on the right.</li>
                <li>⬆ Put 3 of the same critter together to <b>level it up</b> (and a better critter turns up in the stall).</li>
                <li>❄️ Freeze anything in the stall to keep it for next turn.</li>
                <li>🎺 Then <b>March!</b> — parades bump heads by themselves. Win {WINS_NEEDED} before you lose {LIVES} 🧡.</li>
              </ul>
              <div className="pp-champs">
                <b className="small">⭐ Your champions in the stall</b>
                {champions.length
                  ? <span>{champions.map((k) => <span key={k.id} title={k.name}>{k.emoji}</span>)}</span>
                  : <span className="small muted">None yet — the pets you find on your adventures join the stall as champions.</span>}
                {champions.length > 0 && champions.length < KINDS.filter((k) => k.champion).length && <span className="small dim">Find more pets to bring more champions.</span>}
              </div>
              <p className="small muted">Rewards: coins for every win, and a big bonus, a rare find and a special friend for a full parade.</p>
              <div className="lw-btns">
                <button className="btn btn-lg" onClick={onClose}>Back</button>
                <button className="btn btn-hero btn-lg" onClick={start}>🎺 Start a parade</button>
              </div>
            </>
          )}
        </div>
      )}

      {r && !show && !reward && (
        <div className="pp-shop">
          <div className="pp-top">
            <span className="pp-chip gold mono">🪙 {r.gold}</span>
            <span className="pp-chip mono">{'🧡'.repeat(Math.max(0, r.lives))}<span className="dim">{'🤍'.repeat(Math.max(0, LIVES - r.lives))}</span></span>
            <span className="pp-chip mono">🎀 {r.wins}/{WINS_NEEDED}</span>
            <span className="pp-chip dim mono">Turn {r.turn}</span>
            <button className="lw-pause" onClick={onClose} aria-label="Save and leave">✕</button>
          </div>
          {r.history.length > 0 && <div className="pp-history">{r.history.slice(-12).map((h, i) => <span key={i} title={h.rival}>{RESULT_ICON[h.result]}</span>)}</div>}

          <div className="pp-label">YOUR PARADE <span className="dim">· front ➜</span></div>
          <div className="pp-team">
            {Array.from({ length: TEAM_SIZE }, (_, j) => TEAM_SIZE - 1 - j).map((i) => {
              const p = r.team[i];
              const target = (selPet && (!p || (p.id === selPet.id && level(p) < 3))) || (selFood && p) || (selTeam && sel?.i !== i);
              return (
                <button key={i} className={`pp-slot ${sel?.kind === 'team' && sel.i === i ? 'sel' : ''} ${target ? 'target' : ''}`} onClick={() => tapTeam(i)}>
                  {p ? <Critter id={p.id} atk={p.atk} hp={p.hp} perk={p.perk} lvl={level(p)} pips={expPips(p)} temp={[p.tAtk, p.tHp]} gold={!!KIND[p.id].champion} /> : <span className="pp-empty">·</span>}
                  {p && flash[p.uid] && <span className="pp-pop">{flash[p.uid]}</span>}
                </button>
              );
            })}
          </div>

          <div className="pp-info">
            {selPet && <><b>{KIND[selPet.id].emoji} {KIND[selPet.id].name}</b> <span className="lw-tag">TIER {KIND[selPet.id].tier}{KIND[selPet.id].champion ? ' · ⭐ CHAMPION' : ''}</span><span className="small">{KIND[selPet.id].text(1)}</span><span className="small muted">{canMerge(selPet.id) ? 'Tap the same critter to merge it.' : 'Tap an empty spot to buy it.'}</span></>}
            {selFood && <><b>{FOOD[selFood.id].emoji} {FOOD[selFood.id].name}</b> <span className="lw-tag">{selFood.cost ? `${selFood.cost} 🪙` : 'FREE'}</span><span className="small">{selFood.atk || selFood.hp ? `+${selFood.atk}/+${selFood.hp}. ` : ''}{FOOD[selFood.id].token ? '' : FOOD[selFood.id].text}</span><span className="small muted">Tap a critter to feed it.</span></>}
            {selTeam && <><b>{KIND[selTeam.id].emoji} {KIND[selTeam.id].name}</b> <span className="lw-tag">LEVEL {level(selTeam)}</span><span className="small">{KIND[selTeam.id].text(level(selTeam))}</span>{selTeam.perk && <span className="small">{PERKS[selTeam.perk].emoji} {PERKS[selTeam.perk].text}</span>}<span className="small muted">Tap another spot to move it (or onto the same critter to merge).</span></>}
            {!sel && <span className="small muted">{msg ?? 'Tap anything to see what it does.'}</span>}
            {sel && msg && <span className="small red">{msg}</span>}
          </div>

          <div className="pp-label">THE STALL</div>
          <div className="pp-stall">
            {r.stall.pets.map((s, i) => s && (
              <button key={`p${i}`} className={`pp-ware ${sel?.kind === 'stall' && sel.i === i ? 'sel' : ''} ${s.frozen ? 'frozen' : ''} ${s.bonus ? 'bonus' : ''}`} onClick={() => tapStall(i)}>
                <Critter id={s.id} atk={s.atk} hp={s.hp} gold={!!KIND[s.id].champion} small />
                {canMerge(s.id) && <span className="pp-merge">⬆</span>}
                <span className="pp-cost mono">{PET_COST}</span>
              </button>
            ))}
          </div>
          <div className="pp-stall food">
            {r.stall.foods.map((f, i) => f && (
              <button key={`f${i}`} className={`pp-ware food ${sel?.kind === 'food' && sel.i === i ? 'sel' : ''} ${f.frozen ? 'frozen' : ''}`} onClick={() => tapFood(i)}>
                <span className="pp-emoji">{FOOD[f.id].emoji}</span>
                <span className="pp-cost mono">{f.cost || 'FREE'}</span>
              </button>
            ))}
          </div>

          <div className="pp-actions">
            {selTeam
              ? <button className="btn btn-lg" onClick={doSell}>Sell +{sellValue(selTeam)} 🪙</button>
              : <button className="btn btn-lg" disabled={!sel} onClick={doFreeze}>{(selPet?.frozen || selFood?.frozen) ? '🔥 Unfreeze' : '❄️ Freeze'}</button>}
            <button className="btn btn-lg" disabled={r.gold < REROLL_COST} onClick={doReroll}>🎲 New wares · {REROLL_COST}</button>
            <button className="btn btn-hero btn-lg" onClick={doMarch}>🎺 March!</button>
          </div>
        </div>
      )}

      {show && <ParadeView show={show} frame={Math.min(frame, show.battle.frames.length - 1)} fast={fast} setFast={setFast} skip={skip} done={afterParade} run={r} />}

      {reward && r && (
        <div className="lw-overlay">
          <div className="lw-panel">
            <div className="lw-level">{r.wins >= WINS_NEEDED ? '🏆 WHAT A PARADE!' : '🎪 The parade is over'}</div>
            <p className="small center">{r.wins} win{r.wins === 1 ? '' : 's'} over {r.history.length} parade{r.history.length === 1 ? '' : 's'}.</p>
            <div className="pp-history center">{r.history.map((h, i) => <span key={i}>{RESULT_ICON[h.result]}</span>)}</div>
            <div className="lw-rewards">
              {reward.coins > 0 ? <div>🪙 <b className="gold">{reward.coins.toLocaleString()}</b> coins</div> : <div className="small muted">No wins this time — try again!</div>}
              {reward.items.length > 0 && <div className="small">{reward.items.map((s) => getItem(s.id).name).join(', ')}</div>}
              {reward.leftover > 0 && <div className="small red">Your bag was full — something was left behind.</div>}
              {reward.pet && <div className="lw-pet">🐩 <b>Confetti</b> the parade poodle wants to come home with you!</div>}
            </div>
            <div className="lw-btns">
              <button className="btn btn-lg" onClick={onClose}>Done</button>
              <button className="btn btn-hero btn-lg" onClick={start}>🎺 Again</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

function ParadeView({ show, frame, fast, setFast, skip, done, run }: {
  show: ParadeOutcome; frame: number; fast: boolean; setFast: (f: boolean) => void; skip: () => void; done: () => void; run: Run | null;
}) {
  const frames = show.battle.frames;
  const f: Frame = frames[frame];
  const last = frame >= frames.length - 1;
  const hit = new Map((f.hits ?? []).map((h) => [h.uid, h.n]));
  const cell = (v: FView, side: 'a' | 'b', i: number) => (
    <span key={v.uid} className={`pp-cell ${f.attack && i === 0 ? `bump-${side}` : ''} ${f.actor === v.uid ? 'acting' : ''}`}>
      <Critter id={v.id} atk={v.atk} hp={v.hp} perk={v.perk} lvl={v.L} dead={v.dead} gold={!!KIND[v.id]?.champion} small />
      {hit.has(v.uid) && <span className="pp-dmg mono">{hit.get(v.uid) ? `−${hit.get(v.uid)}` : '🛡️'}</span>}
    </span>
  );
  return (
    <div className="pp-parade">
      <div className="pp-vs"><b>Your parade</b><span className="dim">vs</span><b>{whose(show.rival)} parade</b></div>
      <div className="pp-lane">
        <div className="pp-side a">{[...f.a].reverse().map((v, j) => cell(v, 'a', f.a.length - 1 - j))}</div>
        <div className="pp-mid">⚔️</div>
        <div className="pp-side b">{f.b.map((v, i) => cell(v, 'b', i))}</div>
      </div>
      <div className="pp-say">{f.text ?? (f.attack ? 'Bump!' : '')}</div>
      {last ? (
        <div className="lw-panel pp-result">
          <div className="lw-level">{show.result === 'win' ? '🎀 YOU WIN!' : show.result === 'loss' ? '💔 You lost this one' : '🤝 A draw'}</div>
          {run && <p className="small center muted">🎀 {run.wins}/{WINS_NEEDED} · 🧡 {run.lives} left{run.phase === 'over' ? '' : ` · on to turn ${run.turn}`}</p>}
          <button className="btn btn-hero btn-lg btn-wide" onClick={done}>{run?.phase === 'over' ? 'See how it went' : 'Back to the stall'}</button>
        </div>
      ) : (
        <div className="pp-actions two">
          <button className="btn btn-lg" onClick={() => setFast(!fast)}>{fast ? '🐢 Normal' : '⏩ Faster'}</button>
          <button className="btn btn-lg" onClick={skip}>⏭ Skip</button>
        </div>
      )}
    </div>
  );
}
