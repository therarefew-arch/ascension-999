// Equipping gear and adding up stats.
import { gemStats, getItem, type EquipSlot, type ItemDef, type ItemStats } from '../data/items';
import { SKILLS } from '../data/skills';
import { addToBag, addToBank, countInBag, countInBank, removeFromBag, removeFromBank, spaceFor } from './inventory';
import type { PlayerState } from './player';
import { levelForXp } from './xp';

/** Gear slots that have a gem socket. */
export const SOCKET_SLOTS: EquipSlot[] = ['head', 'weapon', 'body', 'shield', 'legs'];

/** Total stats from worn gear plus socketed gems. */
export function equipmentStats(p: PlayerState): ItemStats {
  const total: ItemStats = {};
  const add = (stats: ItemStats) => {
    for (const [k, v] of Object.entries(stats) as [keyof ItemStats, number][]) total[k] = (total[k] ?? 0) + v;
  };
  for (const id of Object.values(p.equipment)) if (id) add(getItem(id).equip?.stats ?? {});
  for (const id of Object.values(p.sockets ?? {})) if (id) add(gemStats(id));
  return total;
}

/** Puts a gem from the bag into a slot's socket. A gem already there goes back to the bag. */
export function socketGem(p: PlayerState, slot: EquipSlot, gemId: string): string | null {
  if (!SOCKET_SLOTS.includes(slot)) return 'That slot has no socket';
  if (!getItem(gemId).gem) return "That's not a gem";
  if (countInBag(p.inventory, gemId) < 1) return 'The gem must be in your bag';
  removeFromBag(p.inventory, gemId, 1);
  const old = p.sockets[slot];
  p.sockets[slot] = gemId;
  if (old) storeItem(p, old);
  return null;
}

/** Takes a gem out of its socket (free). */
export function unsocketGem(p: PlayerState, slot: EquipSlot): void {
  const old = p.sockets[slot];
  if (!old) return;
  delete p.sockets[slot];
  storeItem(p, old);
}

/** Coins to reroll a gem's stat, by rarity. */
export const REROLL_COST: Record<string, number> = {
  common: 50, uncommon: 120, rare: 300, epic: 800, legendary: 2000, mythic: 5000,
};

export function canEquip(p: PlayerState, item: ItemDef): string | null {
  if (!item.equip) return "This can't be equipped";
  const req = item.equip.req;
  if (req && levelForXp(p.skills[req.skill].xp) < req.level) {
    return `Needs ${SKILLS[req.skill].name} level ${req.level}`;
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
