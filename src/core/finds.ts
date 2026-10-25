// 🎁 Rare finds: bird nests (Woodcutting), geodes (Mining) and corked bottles (Fishing).
// They turn up while gathering (see completeAction). Opening one rolls its loot table
// for the best area you've reached in that skill — all through the central loot system.
import { getItem, type SkillId } from '../data/items';
import { BOTTLE_TALE_CHANCE, BOTTLE_TALES, LORE_MAP, type LoreNote } from '../data/lore';
import { TIER_COUNT, regionOpen, tierLevel, tierRegion } from '../data/tiers';
import { countInBag, removeFromBag } from './inventory';
import { giveLoot, rollLoot } from './loot';
import type { ItemStack, PlayerState } from './player';
import { levelForXp } from './xp';

/** The best tier you've reached for a gathering skill (level + town discovered). */
export function bestTier(p: PlayerState, skill: SkillId): number {
  const lvl = levelForXp(p.skills[skill].xp);
  let best = 0;
  for (let t = 0; t < TIER_COUNT; t++) {
    const region = tierRegion(t);
    if (regionOpen(region) && p.regions.includes(region) && lvl >= tierLevel(t)) best = t;
  }
  return best;
}

export interface OpenResult { loot: ItemStack[]; tales: LoreNote[]; opened: number }

/** Opens up to `qty` finds of one kind from the bag. */
export function openFinds(p: PlayerState, id: string, qty = 1, rng: () => number = Math.random): OpenResult | string {
  const item = getItem(id);
  if (!item.opens) return "That can't be opened";
  const n = Math.min(qty, countInBag(p.inventory, id));
  if (n <= 0) return `No ${item.name} in your bag`;
  const table = `open_${item.opens}_${bestTier(p, item.opens)}`;
  const total: Record<string, number> = {};
  const tales: LoreNote[] = [];
  for (let i = 0; i < n; i++) {
    removeFromBag(p.inventory, id, 1);
    const loot = rollLoot(table, rng);
    giveLoot(p, loot);
    for (const st of loot) total[st.id] = (total[st.id] ?? 0) + st.qty;
    // Bottles sometimes hold the next message.
    if (item.opens === 'fishing' && rng() < BOTTLE_TALE_CHANCE) {
      const next = BOTTLE_TALES.find((t) => !p.lore.includes(t));
      if (next) { p.lore.push(next); tales.push(LORE_MAP[next]); }
    }
  }
  return { loot: Object.entries(total).map(([lid, q]) => ({ id: lid, qty: q })), tales, opened: n };
}
