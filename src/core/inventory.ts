// Bag and bank rules. These move items around; they never create items.
// (New items only come from the loot system in loot.ts.)
import { getItem, ITEM_LIST, ITEMS, type ItemCategory } from '../data/items';
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
  if (s) { s.qty += qty; return; }
  // A new kind of item lands right after the last item of the same kind (ores with ores…), else at the end.
  const cat = getItem(id).category;
  let at = -1;
  for (let i = 0; i < p.bank.length; i++) if (ITEMS[p.bank[i].id]?.category === cat) at = i;
  if (at >= 0) p.bank.splice(at + 1, 0, { id, qty });
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

/** Bag → bank, everything except items you've pinned to keep in the bag (📌). */
export function depositAll(p: PlayerState): number {
  let moved = 0;
  p.inventory.forEach((s, i) => {
    if (s && !p.keep.includes(s.id)) {
      addToBank(p, s.id, s.qty);
      moved += s.qty;
      p.inventory[i] = null;
    }
  });
  return moved;
}

// ---------- Sorting and moving (never creates or removes items) ----------

/** The order item kinds are sorted in: resources first, then food, gear and treasures. */
export const CATEGORY_ORDER: ItemCategory[] = [
  'ore', 'bar', 'log', 'fish', 'food', 'meal', 'herb', 'crop', 'seed', 'material', 'ammo',
  'weapon', 'armour', 'tool', 'gem', 'treasure', 'currency',
];
const ITEM_INDEX: Record<string, number> = Object.fromEntries(ITEM_LIST.map((it, i) => [it.id, i]));
const catRank = (id: string) => CATEGORY_ORDER.indexOf(getItem(id).category);
/** "By type": kind of item, then the game's own order (tier by tier). */
export const byType = (a: string, b: string) => catRank(a) - catRank(b) || (ITEM_INDEX[a] ?? 0) - (ITEM_INDEX[b] ?? 0);

/** Tidies the bag: joins half stacks, moves 📌 kept items to the front, sorts by type, empty slots last. */
export function sortBag(p: PlayerState): void {
  const totals = new Map<string, number>();
  for (const s of p.inventory) if (s) totals.set(s.id, (totals.get(s.id) ?? 0) + s.qty);
  const ids = [...totals.keys()].sort((a, b) => Number(p.keep.includes(b)) - Number(p.keep.includes(a)) || byType(a, b));
  const fresh: Bag = p.inventory.map(() => null);
  for (const id of ids) addToBag(fresh, id, totals.get(id)!);
  p.inventory = fresh;
}

/** Drag and drop in the bag: swap two slots, or join them if they're the same stackable item. */
export function moveBagSlot(p: PlayerState, from: number, to: number): void {
  const bag = p.inventory;
  if (from === to || from < 0 || to < 0 || from >= bag.length || to >= bag.length) return;
  const a = bag[from];
  const b = bag[to];
  if (!a) return;
  if (b && b.id === a.id && stackMax(a.id) > 1) {
    const put = Math.min(stackMax(a.id) - b.qty, a.qty);
    b.qty += put;
    a.qty -= put;
    if (a.qty <= 0) bag[from] = null;
    return;
  }
  bag[from] = b;
  bag[to] = a;
}

export type BankSort = 'type' | 'name' | 'amount' | 'value';

/** Sorts the bank. `value` gives an item's worth (from the market) for the "value" sort. */
export function sortBank(p: PlayerState, mode: BankSort, value: (id: string) => number = () => 0): void {
  const name = (id: string) => getItem(id).name.toLowerCase();
  p.bank.sort((a, b) =>
    mode === 'name' ? name(a.id).localeCompare(name(b.id))
      : mode === 'amount' ? b.qty - a.qty || byType(a.id, b.id)
        : mode === 'value' ? value(b.id) * b.qty - value(a.id) * a.qty || byType(a.id, b.id)
          : byType(a.id, b.id));
}

/** Drag and drop in the bank: move one item to another spot (everything else shifts along). */
export function moveBankItem(p: PlayerState, fromId: string, toId: string): void {
  const from = p.bank.findIndex((s) => s.id === fromId);
  const to = p.bank.findIndex((s) => s.id === toId);
  if (from < 0 || to < 0 || from === to) return;
  const [s] = p.bank.splice(from, 1);
  p.bank.splice(to, 0, s);
}

/** Undo a bank sort: put items back in their old order (anything new since then goes after). */
export function restoreBankOrder(p: PlayerState, oldOrder: string[]): void {
  const rank = new Map(oldOrder.map((id, i) => [id, i]));
  p.bank.sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));
}

/** Undo a bag tidy — only if the bag still holds exactly the same things (so nothing can be lost). */
export function restoreBagLayout(p: PlayerState, old: Bag): boolean {
  const total = (bag: Bag) => { const m = new Map<string, number>(); for (const s of bag) if (s) m.set(s.id, (m.get(s.id) ?? 0) + s.qty); return m; };
  const a = total(p.inventory);
  const b = total(old);
  if (a.size !== b.size || old.length !== p.inventory.length) return false;
  for (const [id, n] of a) if (b.get(id) !== n) return false;
  p.inventory = old.map((s) => (s ? { ...s } : null));
  return true;
}

/** 📌 Pin an item so "Deposit all" leaves it in the bag (food, runes, arrows…). */
export function toggleKeep(p: PlayerState, id: string): boolean {
  const i = p.keep.indexOf(id);
  if (i >= 0) { p.keep.splice(i, 1); return false; }
  p.keep.push(id);
  return true;
}

/** Bank → bag, as many as fit. Returns how many moved. */
export function withdraw(p: PlayerState, id: string, qty: number): number {
  const want = Math.min(qty, countInBank(p, id), spaceFor(p.inventory, id));
  if (want <= 0) return 0;
  const added = addToBag(p.inventory, id, want);
  removeFromBank(p, id, added);
  return added;
}
