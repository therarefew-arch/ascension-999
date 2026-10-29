// 🏛️ The Hall of the Ascended (in the Cottage): shows off your finest pieces.
// Not a checklist (the owner isn't a completionist): it only ever shows what you have — no empty
// slots and no "x of y" counters. It picks your best Ascended item of each kind by itself.
import { ASC_BASES, BONUSES, GRADES } from '../data/ascended';
import { getItem, ITEMS } from '../data/items';
import { RELICS, ASC_RELIC_TIER, relicItemId } from '../data/relics';
import { SKILLS } from '../data/skills';
import { useGame } from '../core/store';
import type { PlayerState } from '../core/player';
import { ItemIcon } from './icons';
import { useAscensionOpen } from './Starforge';

/** Every Ascended item you own (worn, bag, bank). */
function ownedAscended(p: PlayerState): string[] {
  const ids = new Set<string>();
  for (const id of Object.values(p.equipment)) if (id && ITEMS[id]?.ascended) ids.add(id);
  for (const s of p.inventory) if (s && ITEMS[s.id]?.ascended) ids.add(s.id);
  for (const s of p.bank) if (ITEMS[s.id]?.ascended) ids.add(s.id);
  return [...ids];
}

/** How fine a piece is: grade first, then how close its bonuses rolled to their best. */
function score(id: string): number {
  const a = getItem(id).ascended!;
  const q = a.bonuses.reduce((n, b) => n + (b.value - BONUSES[b.key].min) / Math.max(1, BONUSES[b.key].max - BONUSES[b.key].min), 0);
  return GRADES.indexOf(a.grade) * 100 + a.bonuses.length * 10 + q;
}

export function HallOfAscended() {
  const { player } = useGame();
  const open = useAscensionOpen();
  if (!open) return null;
  const owned = ownedAscended(player);
  const best = ASC_BASES.map((b) => owned.filter((id) => getItem(id).ascended!.base.key === b.key).sort((x, y) => score(y) - score(x))[0])
    .filter((id): id is string => !!id)
    .sort((x, y) => score(y) - score(x));
  const relics = RELICS.filter((r) => (player.relics[r.key] ?? -1) >= ASC_RELIC_TIER);
  const starborn = [...player.inventory, ...player.bank].filter((s) => s && ITEMS[s.id]?.gem?.rarity === 'starborn').map((s) => s!.id)
    .concat(Object.values(player.sockets ?? {}).filter((id): id is string => !!id && ITEMS[id]?.gem?.rarity === 'starborn'));
  const empty = !best.length && !relics.length && !starborn.length;
  return (
    <section className="hall">
      <h2 className="section-title">🏛️ HALL OF THE ASCENDED</h2>
      {empty
        ? <p className="small muted">A quiet hall with tall windows, waiting. Your finest Ascended pieces will be shown here by themselves as you find them.</p>
        : <p className="small muted">Your finest piece of each kind, set out by itself — the best always takes its place.</p>}
      {best.length > 0 && (
        <div className="hall-grid">
          {best.map((id) => {
            const a = getItem(id).ascended!;
            return (
              <div key={id} className={`hall-piece grade-${a.grade.key}`} style={{ ['--grade' as string]: a.grade.color }}>
                <ItemIcon id={id} size={40} />
                <b className="small">{getItem(id).name}</b>
                <span className="tiny muted">{a.bonuses.map((b) => BONUSES[b.key].text(b.value, SKILLS[a.base.skill].name)).join(' · ')}</span>
              </div>
            );
          })}
        </div>
      )}
      {relics.length > 0 && (
        <div className="hall-shelf">
          {relics.map((r) => (
            <span key={r.key} className="hall-relic" title={r.ascTrait}>
              <ItemIcon id={relicItemId(r.key, ASC_RELIC_TIER)} size={28} />
              <span className="small">Ascended {r.name}</span>
            </span>
          ))}
        </div>
      )}
      {starborn.length > 0 && (
        <p className="small hall-gems">🌌 {[...new Set(starborn)].map((id) => getItem(id).name).join(' · ')}</p>
      )}
    </section>
  );
}
