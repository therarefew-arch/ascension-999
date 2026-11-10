// 🏡 Little Homestead (v0.0.2.40): Farming's cozy field of your own. Rules in core/homestead.ts; this draws it.
import { useEffect, useState } from 'react';
import {
  catchUp, CROP_MAP, EGG_CAP, eggsReady, growMsOf, HOME_CROPS, isWet, ready, sprinkled, sprinklersPlaced, upgradeCost, WET_MS,
  type Upgrade,
} from '../core/homestead';
import { skillLevel } from '../core/idle';
import { game, useGame } from '../core/store';
import { sound } from '../audio/sound';
import { fmtDuration } from './format';
import { FoldHead, useFold } from './Fold';

const UPGRADES: { u: Upgrade; emoji: string; name: string; text: string }[] = [
  { u: 'field', emoji: '📏', name: 'Bigger field', text: 'One more row and column of land' },
  { u: 'sprinkler', emoji: '⛲', name: 'Sprinkler', text: 'Waters the 8 squares around it, forever' },
  { u: 'hive', emoji: '🐝', name: 'Beehive', text: 'Everything grows 25% faster' },
  { u: 'hens', emoji: '🐔', name: 'Hen house', text: `An egg every 10 min (holds ${EGG_CAP}) to sell` },
  { u: 'hand', emoji: '🧑‍🌾', name: 'Farmhand', text: 'Harvests ripe crops and re-sows your chosen seed' },
];

export function Homestead() {
  const { player } = useGame();
  const h = game.homestead();
  const [, tick] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [open, toggle] = useFold('homestead-up', false);
  const lvl = skillLevel(player, 'farming');
  const seed = CROP_MAP[h.seed] && lvl >= CROP_MAP[h.seed].level ? CROP_MAP[h.seed] : HOME_CROPS[0];

  useEffect(() => {
    game.homeTick();
    let n = 0;
    const t = window.setInterval(() => { n++; if (n % 5 === 0) game.homeTick(); else tick((x) => x + 1); }, 1000);
    return () => clearInterval(t);
  }, []);

  const now = Date.now();
  catchUp(h, now);
  const basketCount = Object.values(h.basket).reduce((s, x) => s + x, 0);
  const basketValue = Object.entries(h.basket).reduce((s, [id, n]) => s + (id === 'egg' ? 18 : CROP_MAP[id]?.sell ?? 0) * n, 0);
  const eggs = eggsReady(h, now);
  const toPlace = h.sprinklers - sprinklersPlaced(h);

  const tap = (i: number) => {
    if (placing) {
      if (game.homePlaceSprinkler(i)) { setPlacing(false); setMsg('⛲ Sprinkler placed — the squares around it stay watered.'); }
      else sound.play('error', { volume: 0.3 });
      return;
    }
    const r = game.homeTap(i, seed.id);
    if (r === 'till') { sound.play('carve', { volume: 0.45, rate: 0.8 }); game.vibrate(6); }
    if (r === 'sow') { sound.play('slide', { volume: 0.4 }); sound.play('tick', { volume: 0.3, rate: 1.4 }); }
    if (r === 'water') sound.play('splash', { volume: 0.45, rate: 1.2 });
    if (r === 'harvest') { sound.play('eat', { volume: 0.4 }); sound.play('ding', { rate: 1.6, volume: 0.35 }); game.vibrate(12); }
    if (r === 'poor') { sound.play('error', { volume: 0.3 }); setMsg(`Not enough market coins for ${seed.name.toLowerCase()} seed (${seed.seed}🪙) — sell your basket first.`); }
    if (r === 'locked') { sound.play('error', { volume: 0.3 }); setMsg(`${seed.name} needs Farming ${seed.level}.`); }
    if (r === 'nothing') sound.play('tick', { volume: 0.15 });
    tick((x) => x + 1);
  };

  return (
    <div className="hs-root">
      <div className="hs-top">
        <span className="small">🪙 <b className="mono">{h.coins.toLocaleString()}</b> <span className="tiny muted">market coins</span></span>
        <button className="btn btn-sm btn-primary" disabled={!basketCount} onClick={() => { const c = game.homeSell(); if (c) setMsg(`🧺 Sold at your stall for ${c.toLocaleString()} market coins.`); }}>
          🧺 Sell {basketCount ? `${basketCount} · ${basketValue}🪙` : 'basket'}
        </button>
      </div>
      {h.eggs && (
        <div className="hs-hens small">
          <span>🐔 Hen house · {eggs}/{EGG_CAP} 🥚</span>
          <button className="btn btn-sm" disabled={!eggs} onClick={() => { const n = game.homeEggs(); if (n) setMsg(`🥚 ${n} egg${n > 1 ? 's' : ''} into the basket.`); }}>Collect</button>
        </div>
      )}

      <div className="hs-seeds">
        {HOME_CROPS.map((c) => {
          const locked = lvl < c.level;
          return (
            <button key={c.id} className={`hs-seed ${c.id === seed.id ? 'on' : ''} ${locked ? 'locked' : ''}`} disabled={locked}
              onClick={() => { game.homeSeed(c.id); sound.play('click', { volume: 0.4 }); }} title={locked ? `Needs Farming ${c.level}` : `${c.growMin} min · sells for ${c.sell}`}>
              <span className="hs-seed-emoji">{locked ? '🔒' : c.emoji}</span>
              <span className="tiny">{locked ? `Lv ${c.level}` : `${c.seed}🪙`}</span>
            </button>
          );
        })}
      </div>
      <p className="tiny muted hs-hint">{seed.emoji} <b>{seed.name}</b>: {seed.growMin} min while watered · sells for {seed.sell}🪙{seed.regrow ? ' · regrows after picking' : ''}{h.hand ? ' · 🧑‍🌾 your farmhand sows this too' : ''}</p>

      {(toPlace > 0 || placing) && (
        <button className={`btn btn-wide ${placing ? 'btn-hero' : ''}`} onClick={() => setPlacing((x) => !x)}>
          {placing ? '⛲ Tap a free square to place your sprinkler (tap here to cancel)' : `⛲ Place a sprinkler (${toPlace} to place)`}
        </button>
      )}

      <div className="hs-field" style={{ gridTemplateColumns: `repeat(${h.size}, 1fr)` }}>
        {h.tiles.map((t, i) => {
          const wet = t.s === 'sown' && isWet(h, i, now);
          const c = t.crop ? CROP_MAP[t.crop] : null;
          const share = c ? Math.min(1, (t.grown ?? 0) / growMsOf(c)) : 0;
          const isReady = ready(t);
          const thirsty = t.s === 'sown' && !wet && !isReady;
          const left = c && wet && !isReady ? (growMsOf(c) - (t.grown ?? 0)) / (h.hive ? 1.25 : 1) : 0;
          return (
            <button key={i} className={`hs-tile ${t.sprinkler ? 'sprinkler' : t.s} ${wet || (t.s !== 'wild' && sprinkled(h, i)) ? 'wet' : ''} ${isReady ? 'ready' : ''} ${placing && !t.sprinkler && t.s !== 'sown' ? 'placeable' : ''}`}
              onClick={() => tap(i)} aria-label={t.sprinkler ? 'Sprinkler' : t.s === 'wild' ? 'Wild grass — tap to till' : t.s === 'tilled' ? 'Tilled soil — tap to sow' : isReady ? `${c?.name} — tap to harvest` : thirsty ? 'Thirsty — tap to water' : 'Growing'}>
              {t.sprinkler ? <span className="hs-crop">⛲</span>
                : t.s === 'wild' ? <span className="hs-grass">🌿</span>
                : t.s === 'sown' && c ? <>
                    <span className={`hs-crop ${isReady ? 'bob' : ''}`}>{isReady ? c.emoji : share < 0.35 ? '🌱' : share < 0.75 ? '🌿' : c.emoji}</span>
                    {!isReady && <span className="hs-grow"><i style={{ width: `${share * 100}%` }} /></span>}
                    {thirsty && <span className="hs-thirst">💧</span>}
                    {left > 0 && <span className="hs-left tiny">{fmtDuration(left)}</span>}
                  </>
                : null}
            </button>
          );
        })}
      </div>
      {msg && <p className="small hs-msg" onClick={() => setMsg(null)}>{msg}</p>}
      <p className="tiny muted center">Tap a square: 🌿 till → sow your seed → 💧 water → 🧺 pick. Crops grow while the soil is wet (one watering lasts {Math.round(WET_MS / 60000)} min) — even while you're away. Every harvest gives Farming XP.</p>

      <section className="hs-ups">
        <FoldHead title="🛠️ HOMESTEAD UPGRADES" open={open} onToggle={toggle} summary={`${h.size}×${h.size} field${h.hive ? ' · 🐝' : ''}${h.eggs ? ' · 🐔' : ''}${h.hand ? ' · 🧑‍🌾' : ''}${h.sprinklers ? ` · ⛲${h.sprinklers}` : ''}`} />
        {open && UPGRADES.map((u) => {
          const cost = upgradeCost(h, u.u);
          return (
            <div key={u.u} className="dd-up">
              <span className="dd-up-emoji">{u.emoji}</span>
              <div className="grow"><b className="small">{u.name}{u.u === 'sprinkler' ? ` (${h.sprinklers}/4)` : ''}</b><div className="tiny muted">{u.text}</div></div>
              {cost === null ? <span className="tiny gold">✓</span>
                : <button className="btn btn-sm" disabled={h.coins < cost} onClick={() => { if (game.homeBuy(u.u)) { if (u.u === 'sprinkler') setPlacing(true); setMsg(`${u.emoji} ${u.name} bought!`); } }}>🪙 {cost.toLocaleString()}</button>}
            </div>
          );
        })}
      </section>
    </div>
  );
}
