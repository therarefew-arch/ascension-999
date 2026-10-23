// Bag and bank rules. These move items around; they never create items.
// (New items only come from the loot system in loot.ts.)
import { getItem } from '../data/items';
import { STACK_LIMIT, type ItemStack, type PlayerState } from './player';

type Bag = (ItemStack | null)[];

function stackMax(id: string): number {
  return getItem(id).stackable ? STACK_LIMIT : 1;
}

export function countInBag(bag: Bag, id: string): number {
  let n = 0;
  for (const s of bag) if (s && s.id === id) n += s.qty;
  return n;
}

export function usedSlots(bag: Bag): number {
  return bag.filter(Boolean).length;
}

/** How many of `id` could fit in the bag right now. */
export function spaceFor(bag: Bag, id: string): number {
  const max = stackMax(id);
  let room = 0;
  for (const s of bag) {
    if (!s) room += max;
    else if (s.id === id) room += max - s.qty;
  }
  return room;
}

/** Can all these stacks fit together? Checks on a copy, so nothing changes. */
export function canFitAll(bag: Bag, stacks: ItemStack[]): boolean {
  const copy = bag.map((s) => (s ? { ...s } : null));
  for (const st of stacks) {
    if (addToBag(copy, st.id, st.qty) < st.qty) return false;
  }
  return true;
}

/** Adds as many as fit. Returns how many were added. Mutates the bag. */
export function addToBag(bag: Bag, id: string, qty: number): number {
  const max = stackMax(id);
  let left = qty;
  for (const s of bag) {
    if (left <= 0) break;
    if (s && s.id === id && s.qty < max) {
      const put = Math.min(max - s.qty, left);
      s.qty += put;
      left -= put;
    }
  }
  for (let i = 0; i < bag.length && left > 0; i++) {
    if (!bag[i]) {
      const put = Math.min(max, left);
      bag[i] = { id, qty: put };
      left -= put;
    }
  }
  return qty - left;
}

/** Removes up to qty. Takes from the last slots first. Returns how many were removed. */
export function removeFromBag(bag: Bag, id: string, qty: number): number {
  let left = qty;
  for (let i = bag.length - 1; i >= 0 && left > 0; i--) {
    const s = bag[i];
    if (s && s.id === id) {
      const take = Math.min(s.qty, left);
      s.qty -= take;
      left -= take;
      if (s.qty <= 0) bag[i] = null;
    }
  }
  return qty - left;
}

// ---------- Bank ----------

export function countInBank(p: PlayerState, id: string): number {
  return p.bank.find((s) => s.id === id)?.qty ?? 0;
}

export function addToBank(p: PlayerState, id: string, qty: number): void {
  if (qty <= 0) return;
  const s = p.bank.find((b) => b.id === id);
  if (s) s.qty += qty;
  else p.bank.push({ id, qty });
}

export function removeFromBank(p: PlayerState, id: string, qty: number): number {
  const i = p.bank.findIndex((b) => b.id === id);
  if (i < 0) return 0;
  const take = Math.min(p.bank[i].qty, qty);
  p.bank[i].qty -= take;
  if (p.bank[i].qty <= 0) p.bank.splice(i, 1);
  return take;
}

/** Bag → bank. Returns how many moved. */
export function deposit(p: PlayerState, id: string, qty: number): number {
  const moved = removeFromBag(p.inventory, id, qty);
  addToBank(p, id, moved);
  return moved;
}

export function depositAll(p: PlayerState): number {
  let moved = 0;
  p.inventory.forEach((s, i) => {
    if (s) {
      addToBank(p, s.id, s.qty);
      moved += s.qty;
      p.inventory[i] = null;
    }
  });
  return moved;
}

/** Bank → bag, as many as fit. Returns how many moved. */
export function withdraw(p: PlayerState, id: string, qty: number): number {
  const want = Math.min(qty, countInBank(p, id), spaceFor(p.inventory, id));
  if (want <= 0) return 0;
  const added = addToBag(p.inventory, id, want);
  removeFromBank(p, id, added);
  return added;
}
