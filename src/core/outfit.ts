// 🧳 "Outfit me" (v0.0.1.54, owner's wish): get ready for a town in one tap.
// Reaching a new town used to mean going back to craft every tool and armour piece one by one.
// This plans the whole set for a town (9 tools, 4 armour pieces and a weapon in your style),
// smelts any bars it needs from your ore, makes everything you can, and puts it on.
// Every item is still made by the normal recipe (completeAction → the central loot system) and gives
// its normal XP; only the walking between screens is skipped. It only makes things you can wear now.
import {
  BOWS, CRAFTED_TOOLS, GEAR_PIECES, getItem, METAL_TIERS, STAFF_WOODS, TOOL_TIERS, upgradeId, MAX_UPGRADE,
  type EquipSlot,
} from '../data/items';
import { ACTIONS, SKILLS, type ActionDef } from '../data/skills';
import { tierRegion, type Region } from '../data/tiers';
import { canEquip, equip } from './equipment';
import { completeAction, emptyReport, equippedToolTier, whyCantDo, type ProgressReport } from './idle';
import { countInBag, countInBank, deposit, withdraw } from './inventory';
import type { PlayerState } from './player';

export type OutfitStatus = 'ok' | 'wear' | 'make' | 'blocked';
export interface OutfitLine {
  slot: EquipSlot;
  /** The item this slot should get (base id, or the upgraded copy you already own). */
  item: string;
  status: OutfitStatus;
  /** Short reason shown under the line. */
  note: string;
}
export interface OutfitPlan {
  tier: number;
  town: Region;
  lines: OutfitLine[];
  /** Raw materials still missing for the pieces that can't be made yet (after smelting what it can). */
  missing: { item: string; qty: number }[];
}

/** Total of an item's combat stats (to compare an old +10 piece with a new +0 one). */
function strength(id: string): number {
  return Object.values(getItem(id).equip?.stats ?? {}).reduce((n, v) => n + (v ?? 0), 0);
}

/** The best copy (highest +N) of a base item you own in the bag or bank, if any. */
function ownedCopy(p: PlayerState, base: string): string | null {
  for (let n = MAX_UPGRADE; n >= 0; n--) {
    const id = upgradeId(base, n);
    if (countInBag(p.inventory, id) + countInBank(p, id) > 0) return id;
  }
  return null;
}

/** Relics and Ascended pieces are special — Outfit never swaps them out. */
const special = (id: string) => !!getItem(id).relic || !!getItem(id).ascended;

/** What each slot should get for town tier `t`: [slot, base item, the action that makes it]. */
function targets(p: PlayerState, t: number): { slot: EquipSlot; base: string; action: string; tool: boolean }[] {
  const out: { slot: EquipSlot; base: string; action: string; tool: boolean }[] = [];
  const tier = TOOL_TIERS[t];
  for (const tl of CRAFTED_TOOLS) out.push({ slot: tl.slot, base: `${tier.tier}_${tl.key}`, action: `craft_${tier.tier}_${tl.key}`, tool: true });
  // The weapon follows the style you fight with now (melee if nothing is worn).
  const worn = p.equipment.weapon ? getItem(p.equipment.weapon).equip : undefined;
  const metal = METAL_TIERS[t];
  if (worn?.style === 'ranged') out.push({ slot: 'weapon', base: BOWS[t].id, action: `craft_${BOWS[t].id}`, tool: false });
  else if (worn?.style === 'magic' && worn.element) {
    const wood = STAFF_WOODS[t].wood;
    out.push({ slot: 'weapon', base: `${wood}_${worn.element}_staff`, action: `rc_staff_${wood}_${worn.element}`, tool: false });
  } else out.push({ slot: 'weapon', base: `${metal.tier}_sword`, action: `smith_${metal.tier}_sword`, tool: false });
  for (const piece of GEAR_PIECES) {
    if (piece.key === 'sword') continue;
    out.push({ slot: piece.slot, base: `${metal.tier}_${piece.key}`, action: `smith_${metal.tier}_${piece.key}`, tool: false });
  }
  return out;
}

/** The action that makes a material Outfit is allowed to make on the way (bars from ore, blank staffs). */
function makerFor(item: string): ActionDef | null {
  const m = METAL_TIERS.find((x) => x.bar === item);
  if (m) return ACTIONS[`smelt_${m.tier}`] ?? null;
  if (/^[a-z]+_staff$/.test(item) && ACTIONS[`craft_${item}`]) return ACTIONS[`craft_${item}`];
  return null;
}

const have = (p: PlayerState, id: string) => countInBag(p.inventory, id) + countInBank(p, id);

/**
 * Makes one item by its recipe: first makes any bars / blank staff it needs, then takes the
 * materials out of the bank into the bag, then runs the normal action. Returns why it couldn't (or null).
 */
function make(p: PlayerState, action: ActionDef, report: ProgressReport, depth = 0): string | null {
  for (const input of action.inputs) {
    const sub = depth < 2 ? makerFor(input.item) : null;
    let short = input.qty - have(p, input.item);
    while (short > 0 && sub) {
      const why = make(p, sub, report, depth + 1);
      if (why) return why;
      short = input.qty - have(p, input.item);
    }
    const inBag = countInBag(p.inventory, input.item);
    if (inBag < input.qty) withdraw(p, input.item, input.qty - inBag);
  }
  const why = whyCantDo(p, action);
  if (why) return why;
  completeAction(p, action, report);
  return null;
}

/** Raw materials an action needs, with bars / blank staffs broken down into what they're made from. */
function addNeeds(action: ActionDef, times: number, need: Map<string, number>) {
  for (const input of action.inputs) {
    need.set(input.item, (need.get(input.item) ?? 0) + input.qty * times);
  }
}

/** The shopping list: what's still missing for the pieces that are blocked. */
function shoppingList(p: PlayerState, actions: ActionDef[]): { item: string; qty: number }[] {
  const need = new Map<string, number>();
  for (const a of actions) addNeeds(a, 1, need);
  // Break bars / blank staffs you don't have into their own materials (twice, for staff → bar → ore).
  for (let pass = 0; pass < 3; pass++) {
    for (const [item, qty] of [...need]) {
      const sub = makerFor(item);
      const short = qty - have(p, item);
      if (sub && short > 0) {
        need.set(item, have(p, item));
        const per = sub.output?.qty ?? 1;
        addNeeds(sub, Math.ceil(short / per), need);
      }
    }
  }
  return [...need].map(([item, qty]) => ({ item, qty: qty - have(p, item) })).filter((m) => m.qty > 0);
}

/**
 * Plans (and with `apply`, does) the outfit for a town's tier. Pass a copy of the player to preview.
 * The order matters: tools first (the new hammer is needed to smith the new armour), then the rest.
 */
export function outfit(p: PlayerState, t: number, apply: boolean): { plan: OutfitPlan; report: ProgressReport } {
  const report = emptyReport(null);
  const lines: OutfitLine[] = [];
  const blockedActions: ActionDef[] = [];
  const list = targets(p, t);
  list.sort((a, b) => Number(b.tool) - Number(a.tool) || Number(a.slot === 'knife' ? 0 : 1) - Number(b.slot === 'knife' ? 0 : 1));
  for (const tg of list) {
    const worn = p.equipment[tg.slot];
    const target = getItem(tg.base);
    // Already good enough?
    if (worn && special(worn)) { lines.push({ slot: tg.slot, item: worn, status: 'ok', note: 'Keeping your special piece' }); continue; }
    if (worn && tg.tool && equippedToolTier(p, CRAFTED_TOOLS.find((c) => c.slot === tg.slot)!.skill) >= (target.equip?.toolTier ?? 0)) {
      lines.push({ slot: tg.slot, item: worn, status: 'ok', note: 'Already good enough' }); continue;
    }
    if (worn && !tg.tool && ((getItem(worn).tierNum ?? 0) >= t || strength(worn) >= strength(tg.base))) {
      lines.push({ slot: tg.slot, item: worn, status: 'ok', note: (getItem(worn).tierNum ?? 0) >= t ? 'Already good enough' : 'Your upgraded one is still stronger' }); continue;
    }
    // Can you wear it?
    const wearWhy = canEquip(p, target);
    if (wearWhy) { lines.push({ slot: tg.slot, item: tg.base, status: 'blocked', note: wearWhy.replace('Needs', 'Wear it at') }); continue; }
    // Already own one?
    const own = ownedCopy(p, tg.base);
    if (own) {
      if (apply) wear(p, own);
      lines.push({ slot: tg.slot, item: own, status: 'wear', note: 'You have one — put it on' });
      continue;
    }
    // Make it.
    const action = ACTIONS[tg.action];
    if (!action) { lines.push({ slot: tg.slot, item: tg.base, status: 'blocked', note: 'Not made in this town' }); continue; }
    if (!p.regions.includes(action.region ?? 'Pocketvale')) {
      lines.push({ slot: tg.slot, item: tg.base, status: 'blocked', note: `Travel to ${action.region} first` }); continue;
    }
    const why = make(p, action, report);
    if (why) {
      blockedActions.push(action);
      lines.push({ slot: tg.slot, item: tg.base, status: 'blocked', note: friendly(why, action) });
      continue;
    }
    const made = ownedCopy(p, tg.base);
    if (made) wear(p, made);
    lines.push({ slot: tg.slot, item: tg.base, status: 'make', note: `${SKILLS[action.skill].name} makes it` });
  }
  return { plan: { tier: t, town: tierRegion(t), lines, missing: shoppingList(p, blockedActions) }, report };
}

/** Puts an item on; the piece it replaces goes to the bank, so the bag stays free. */
function wear(p: PlayerState, id: string) {
  const slot = getItem(id).equip?.slot;
  const old = slot ? p.equipment[slot] : undefined;
  if (equip(p, id)) return;
  if (old && countInBag(p.inventory, old) > 0) deposit(p, old, 1);
}

function friendly(why: string, action: ActionDef): string {
  if (why.startsWith('Equip a ')) return `Needs the ${why.slice(8).replace(' (or better)', '')} first`;
  if (why.startsWith('Needs level')) return `Needs ${SKILLS[action.skill].name} ${why.replace('Needs level ', '')}`;
  if (why.startsWith('Out of')) return 'Missing materials';
  return why;
}

/** Plan only (works on a copy, so nothing changes). */
export function previewOutfit(p: PlayerState, t: number): OutfitPlan {
  const copy = JSON.parse(JSON.stringify(p)) as PlayerState;
  return outfit(copy, t, true).plan;
}

/** How many pieces a preview would make or put on. */
export const outfitCount = (plan: OutfitPlan) => plan.lines.filter((l) => l.status === 'make' || l.status === 'wear').length;
