// 🏡 Your Cottage: a cozy room you fill with furniture made from every skill. Each piece gives a small perk.
import { SKILLS } from '../data/skills';
import { PET_MAP } from '../data/pets';
import { ALL_FURNITURE, buildXp, cottageFirePct, cottageStarPct, FESTIVAL_FURNITURE, FURNITURE, furnitureRegion, haveTotal, perkText, whyCantBuild } from '../core/cottage';
import { game, useGame } from '../core/store';
import { fmtNum } from './format';
import { ItemIcon } from './icons';
import { dayPhase } from './PixelScene';
import { HallOfAscended } from './Hall';

export function CottageScreen({ onGarden }: { onGarden: () => void }) {
  const { player } = useGame();
  const built = new Set(player.cottage);
  const phase = dayPhase();
  const towns = Array.from(new Set(FURNITURE.map((f) => furnitureRegion(f))));
  const keepsakes = FESTIVAL_FURNITURE.filter((f) => built.has(f.id));
  const allXp = ALL_FURNITURE.filter((f) => built.has(f.id) && f.perk.kind === 'xp' && f.perk.skill === 'all')
    .reduce((s, f) => s + (f.perk.kind === 'xp' ? f.perk.pct : 0), 0);
  return (
    <div className="screen">
      <h1 className="screen-title">YOUR COTTAGE</h1>
      <div className={`cottage-room sky-${phase}`}>
        <div className="cottage-window"><span>{phase === 'night' ? '🌙' : phase === 'dusk' ? '🌇' : '☀️'}</span></div>
        <div className="cottage-floor" />
        {ALL_FURNITURE.filter((f) => built.has(f.id)).map((f) => (
          <span key={f.id} className="cottage-piece" style={{ left: `${f.x}%`, top: `${f.y}%` }} title={f.name}>{f.emoji}</span>
        ))}
        {player.activePet && PET_MAP[player.activePet] && <span className="cottage-pet bob">{PET_MAP[player.activePet].emoji}</span>}
        {built.size === 0 && <div className="cottage-empty">An empty room, full of possibilities.<br />Build your first piece below!</div>}
      </div>

      <HallOfAscended />

      <div className="card cottage-perks">
        <div className="row-between"><b>🏡 {built.size - keepsakes.length}/{FURNITURE.length} pieces{keepsakes.length ? ` · ${keepsakes.length} keepsake${keepsakes.length > 1 ? 's' : ''}` : ''}</b><button className="btn btn-sm" onClick={onGarden}>🌱 Garden</button></div>
        {built.size > 0 ? (
          <p className="small muted">
            {allXp > 0 ? `+${allXp}% XP to everything · ` : ''}
            {cottageFirePct(player) ? `fire burns ${cottageFirePct(player)}% longer · ` : ''}
            {cottageStarPct(player) ? `Lucky Stars ${cottageStarPct(player)}% more often · ` : ''}
            plus a skill bonus from each piece.
          </p>
        ) : <p className="small muted">Every piece is made from things your skills produce, and gives a small permanent bonus.</p>}
      </div>

      {towns.map((town) => (
        <section key={town}>
          <h2 className="section-title">{town.toUpperCase()}</h2>
          {FURNITURE.filter((f) => furnitureRegion(f) === town).map((f) => {
            const done = built.has(f.id);
            const why = done ? null : whyCantBuild(player, f.id);
            return (
              <div key={f.id} className={`furniture ${done ? 'built' : ''}`}>
                <span className="furniture-emoji">{f.emoji}</span>
                <div className="grow">
                  <div><b>{f.name}</b> {done && <span className="chip up">Built</span>}</div>
                  <div className="small gold">{perkText(f.perk)}</div>
                  {!done && (
                    <>
                      <div className="furniture-cost">
                        {f.cost.map((c) => (
                          <span key={c.id} className={`cost ${haveTotal(player, c.id) >= c.qty ? 'ok' : ''}`}>
                            <ItemIcon id={c.id} size={18} /> {fmtNum(Math.min(haveTotal(player, c.id), c.qty))}/{fmtNum(c.qty)}
                          </span>
                        ))}
                      </div>
                      <div className="small muted">{SKILLS[f.skill].name} {f.level} · +{fmtNum(buildXp(f))} XP · {f.blurb}</div>
                    </>
                  )}
                </div>
                {!done && (
                  <button className="btn btn-primary btn-sm" disabled={!!why} title={why ?? undefined} onClick={() => game.buildFurniture(f.id)}>
                    {why ? '🔒' : 'Build'}
                  </button>
                )}
              </div>
            );
          })}
        </section>
      ))}
      {keepsakes.length > 0 && (
        <section>
          <h2 className="section-title">🎪 FESTIVAL KEEPSAKES</h2>
          {keepsakes.map((f) => (
            <div key={f.id} className="furniture built">
              <span className="furniture-emoji">{f.emoji}</span>
              <div className="grow"><div><b>{f.name}</b></div><div className="small gold">{perkText(f.perk)}</div><div className="small muted">{f.blurb}</div></div>
            </div>
          ))}
        </section>
      )}
      <p className="small dim center">Materials come from your bag first, then your bank.</p>
    </div>
  );
}
