// 🌌 The Road Up: the four Ascension bosses above the Primordial Rift (Combat screen, at the Rift).
// Fought by hand, once a day each. Rules live in core/combat.ts; numbers in data/monsters.ts.
import { useEffect, useState } from 'react';
import type { CombatStyle } from '../data/items';
import { ASCENSION_BOSSES, monsterStyle, type MonsterDef } from '../data/monsters';
import { ASC_BOSS_ODDS, ASCENSION_LEVEL } from '../data/ascended';
import { LOOT_TABLES } from '../data/lootTables';
import { canClimb, combatStats, weaponStyle, whyCantFight } from '../core/combat';
import { game, useGame } from '../core/store';
import { MonsterArt } from './MonsterArt';
import { UiIcon } from './icons';
import { fmtNum } from './format';

const STYLE_NAME: Record<CombatStyle, string> = { melee: 'Melee', ranged: 'Ranged', magic: 'Magic' };
const WEAK_TO: Record<CombatStyle, CombatStyle> = { ranged: 'melee', magic: 'ranged', melee: 'magic' };

function untilText(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

function BossCard({ m }: { m: MonsterDef }) {
  const { player } = useGame();
  const why = whyCantFight(player, m);
  const style = monsterStyle(m);
  const mine = weaponStyle(player);
  const s = combatStats(player, m);
  const ready = player.bossReadyAt[m.id] ?? 0;
  const beaten = ready > Date.now();
  const table = LOOT_TABLES[m.lootTable];
  const sl = table.entries.find((e) => e.item === 'starlight');
  const gems = table.groups?.length ?? 0;
  const odds = ASC_BOSS_ODDS[m.ascension!];
  return (
    <div className={`monster-card boss road-boss ${beaten ? 'beaten' : ''}`}>
      <div className="monster-portrait"><MonsterArt monster={m} size={72} /></div>
      <div className="grow">
        <div className="monster-name">{m.name} <span className="mono small muted">Lv {m.level}</span></div>
        <div className="boss-tag road-tag">ASCENSION BOSS {m.ascension}/4</div>
        <div className="small monster-meta">
          <span><UiIcon name={style} size={13} /> {STYLE_NAME[style]}{m.daily ? ' today' : ''}</span>
          <span><UiIcon name="heart" size={13} /> {fmtNum(m.hp)}</span>
          <span className={mine === WEAK_TO[style] ? 'green' : ''}>Weak to {STYLE_NAME[WEAK_TO[style]]}</span>
        </div>
        <div className="small road-loot">
          {gems} gems (🌌 Starborn possible) · ✨ {sl?.min}–{sl?.max} · 🌟 1 Ascended item (Godforged 1 in {Math.round(1 / (odds.g ?? 1))}){m.pet ? ' · a pet' : ''}
        </div>
        {!beaten && canClimb(player) && <div className="small mono muted">Your hit chance {Math.round(s.accuracy * 100)}% · they hit you {Math.round(s.enemyAccuracy * 100)}%</div>}
      </div>
      {beaten
        ? <div className="road-beaten small"><b>✔ Beaten today</b><span className="muted">back in {untilText(ready - Date.now())}</span></div>
        : <button className="btn btn-hero fight-btn" disabled={!!why} onClick={() => game.startFight(m.id)}>FIGHT</button>}
      {why && !beaten && <div className="small red monster-why">{why}</div>}
    </div>
  );
}

export function RoadUp() {
  const { player } = useGame();
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const open = canClimb(player);
  return (
    <section className="road-up">
      <h2 className="section-title">🌌 THE ROAD UP</h2>
      <p className="small muted">
        {open
          ? 'Above the Rift, Mira\'s road climbs into the sky. Four great guardians wait along it — each can be beaten once a day (they return at midnight). They drop the best gems, the only 🌌 Starborn ones, Starlight and an Ascended item with better odds. Fought by hand, so bring food.'
          : `Above the Rift, Mira's road climbs into the sky. It opens when any combat skill reaches ${ASCENSION_LEVEL}.`}
      </p>
      {ASCENSION_BOSSES.map((m) => <BossCard key={m.id} m={m} />)}
    </section>
  );
}
