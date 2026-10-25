// 🌱 Farming: your garden. Plant seeds, watch them grow over real time, harvest for crops and XP.
// Minigame "Garden Helpers": pests and weeds pop up on growing plots — tap them for XP and faster growth.
import { useEffect, useState } from 'react';
import { sound } from '../audio/sound';
import { getItem } from '../data/items';
import { CROPS, tierLevel } from '../data/tiers';
import { growMs, MAX_TEND_SHARE, PLOTS, plotReady, whyCantPlant } from '../core/farming';
import { countInBag } from '../core/inventory';
import { game, useGame } from '../core/store';
import { levelProgress, MAX_LEVEL } from '../core/xp';
import { ProgressBar } from './components';
import { fmtDuration, fmtNum } from './format';
import { PixelScene } from './PixelScene';
import { BoostRow, GoalRow } from './screens/SkillScreen';

const PESTS = ['🐛', '🐌', '🌾', '🐞'];

export function FarmScreen() {
  const { player } = useGame();
  const [, tick] = useState(0);
  const [seed, setSeed] = useState<string | null>(null);
  const [pests, setPests] = useState<Record<number, { emoji: string; until: number }>>({});
  const prog = levelProgress(player.skills.farming.xp);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);

  const seeds = CROPS.map((c) => `${c.key}_seed`).filter((id) => countInBag(player.inventory, id) > 0);
  const chosen = seed && countInBag(player.inventory, seed) > 0 ? seed : seeds[seeds.length - 1] ?? null;
  const now = Date.now();
  const growing = player.farm.plots.map((pl, i) => (pl && !plotReady(pl, now) ? i : -1)).filter((i) => i >= 0);
  const readyCount = player.farm.plots.filter((pl) => plotReady(pl, now)).length;

  // 🐛 Garden Helpers: a pest or weed pops up on a growing plot every couple of seconds.
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setPests((cur) => {
        const next: typeof cur = {};
        for (const [k, v] of Object.entries(cur)) if (v.until > n) next[Number(k)] = v;
        const free = growing.filter((i) => !next[i]);
        if (free.length && Math.random() < 0.7) next[free[Math.floor(Math.random() * free.length)]] = { emoji: PESTS[Math.floor(Math.random() * PESTS.length)], until: n + 2600 };
        return next;
      });
    }, 1800);
    return () => clearInterval(t);
  }, [growing.join(',')]);

  const shoo = (i: number) => {
    setPests((cur) => { const n = { ...cur }; delete n[i]; return n; });
    sound.play('carve', { rate: 1.2, volume: 0.7 });
    game.tendPlot(i);
  };

  return (
    <div className="skill-screen">
      <PixelScene scene="town" dim={0.6} className="screen-bg" />
      <div className="skill-top">
        <div className="mastery-row">
          <h1 className="mastery-title">Farming</h1>
          <span className="mono muted">Lv {prog.level}<span className="dim">/{MAX_LEVEL}</span> ({Math.floor(prog.fraction * 100)}%)</span>
        </div>
        <ProgressBar value={prog.fraction} />
        <div className="mastery-sub mono"><span className="muted">{prog.maxed ? 'MAX' : `${fmtNum(prog.into)} / ${fmtNum(prog.needed)} XP`}</span></div>
        <BoostRow skill="farming" />
        <GoalRow skill="farming" place="📍 Your Garden, Pocketvale" />
      </div>

      <div className="screen">
        <div className="garden">
          {Array.from({ length: PLOTS }, (_, i) => {
            const pl = player.farm.plots[i];
            if (!pl) {
              const why = chosen ? whyCantPlant(player, i, chosen) : 'No seeds in your bag';
              return (
                <div key={i} className="plot empty">
                  <div className="plot-soil">🟫</div>
                  <button className="btn btn-sm" disabled={!!why} onClick={() => game.plantSeed(i, chosen!)} title={why ?? undefined}>
                    {chosen && !why ? `Plant ${CROPS[getItem(chosen).seedOf!].name.toLowerCase()}` : 'Empty'}
                  </button>
                </div>
              );
            }
            const crop = CROPS[pl.crop];
            const ready = plotReady(pl, now);
            const share = Math.min(1, (now - pl.plantedAt) / Math.max(1, pl.readyAt - pl.plantedAt));
            const pest = pests[i] && pests[i].until > now ? pests[i] : null;
            return (
              <div key={i} className={`plot ${ready ? 'ready' : ''}`}>
                <div className={`plot-crop ${ready ? 'bob' : ''}`}>{ready ? crop.emoji : share < 0.4 ? '🌱' : '🌿'}</div>
                {pest && <button className="plot-pest" data-silent onClick={() => shoo(i)} aria-label="Shoo the pest">{pest.emoji}</button>}
                <div className="small"><b>{crop.name}</b></div>
                {ready ? (
                  <button className="btn btn-primary btn-sm" onClick={() => game.harvestPlot(i)}>Harvest</button>
                ) : (
                  <>
                    <div className="bar bar-thin"><div className="bar-fill tone-gold" style={{ width: `${share * 100}%` }} /></div>
                    <div className="small muted mono">{fmtDuration(pl.readyAt - now)}{pl.tendedMs > 0 ? ` · tended ${Math.round((pl.tendedMs / growMs(pl.crop)) * 100)}%` : ''}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="btn-pair">
          <button className="btn btn-primary btn-lg" disabled={readyCount === 0} onClick={() => game.harvestAll()}>🧺 Harvest all{readyCount ? ` (${readyCount})` : ''}</button>
          <button className="btn btn-lg" disabled={!chosen || !player.farm.plots.some((pl, i) => !pl && !whyCantPlant(player, i, chosen))}
            onClick={() => { player.farm.plots.forEach((pl, i) => { if (!pl && chosen && !whyCantPlant(player, i, chosen)) game.plantSeed(i, chosen); }); }}>
            🌱 Plant all
          </button>
        </div>

        <div className="card">
          <h3>Seeds</h3>
          {seeds.length ? (
            <div className="chip-row no-pad wrap">
              {seeds.map((id) => {
                const t = getItem(id).seedOf!;
                return (
                  <button key={id} className={`res-chip ${id === chosen ? 'on' : ''}`} onClick={() => setSeed(id)}>
                    {CROPS[t].emoji} {CROPS[t].name} <span className="chip-lv">×{countInBag(player.inventory, id)} · Lv {tierLevel(t)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="small muted">No seeds in your bag. Forage herbs (Herblore) — seeds turn up while you do — or buy them at a Trading Post.</p>
          )}
          <p className="small muted">Crops keep growing while you're away. Tap pests and weeds when they pop up to help: each one is a little XP and makes the crop grow a bit faster (up to {Math.round(MAX_TEND_SHARE * 100)}%).</p>
        </div>
      </div>
    </div>
  );
}
