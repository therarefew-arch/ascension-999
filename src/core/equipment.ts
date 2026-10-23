// Equipping gear and adding up stats.
import { getItem, type EquipSlot, type ItemDef, type ItemStats } from '../data/items';
import { addToBag, addToBank, countInBag, countInBank, removeFromBag, removeFromBank, spaceFor } from './inventory';
import type { PlayerState } from './player';
import { levelForXp } from './xp';

export function equipmentStats(p: PlayerState): ItemStats {
  const total: ItemStats = {};
  for (const id of Object.values(p.equipment)) {
    if (!id) continue;
    const stats = getItem(id).equip?.stats ?? {};
    for (const [k, v] of Object.entries(stats) as [keyof ItemStats, number][]) {
      total[k] = (total[k] ?? 0) + v;
    }
  }
  return total;
}

export function canEquip(p: PlayerState, item: ItemDef): string | null {
  if (!item.equip) return "This can't be equipped";
  const req = item.equip.req;
  if (req && levelForXp(p.skills[req.skill].xp) < req.level) {
    return `Needs ${req.skill[0].toUpperCase() + req.skill.slice(1)} level ${req.level}`;
  }
  return null;
}

/** Equips an item from the bag or bank. The old item goes to the bag (or bank if the bag is full). */
export function equip(p: PlayerState, itemId: string): string | null {
  const item = getItem(itemId);
  const why = canEquip(p, item);
  if (why) return why;
  const slot = item.equip!.slot;

  if (countInBag(p.inventory, itemId) > 0) removeFromBag(p.inventory, itemId, 1);
  else if (countInBank(p, itemId) > 0) removeFromBank(p, itemId, 1);
  else return "You don't have that item";

  const old = p.equipment[slot];
  p.equipment[slot] = itemId;
  if (old) storeItem(p, old);
  return null;
}

export function unequip(p: PlayerState, slot: EquipSlot): void {
  const old = p.equipment[slot];
  if (!old) return;
  delete p.equipment[slot];
  storeItem(p, old);
}

function storeItem(p: PlayerState, id: string) {
  if (spaceFor(p.inventory, id) > 0) addToBag(p.inventory, id, 1);
  else addToBank(p, id, 1);
}
