// 🔥 Forge Rush (v0.0.2.37, Smithing's second game — owner picked it: a cozy blacksmith's shift). Engine only.
//  • Customers come to the counter wanting a horseshoe, axe, helmet, shield or sword (with a patience bubble).
//  • Put a bar in the forge to heat → move the glowing bar to the anvil → pick the shape → hammer it (one tap a
//    blow) → quench it in the barrel → hand it over. Quicker service = a bigger tip (more XP).
//  • Cozy: a customer who waits too long just wanders off; nothing is lost. A shift lasts SHIFT_MS.
//  • Levels 1 → 999 (`forgeSpec`): more seats, more kinds of order, shorter patience, customers coming sooner.
export const MAX_FORGE_LEVEL = 999;
export const SHIFT_MS = 120_000;
export const HEAT_MS = 2200;
export const QUENCH_MS = 1000;
export const FORGE_SLOTS = 2;
export const RACK_SLOTS = 3;

export type Kind = 'shoe' | 'axe' | 'helm' | 'shield' | 'sword';
export const KINDS: Record<Kind, { emoji: string; name: string; taps: number }> = {
  shoe: { emoji: '🧲', name: 'Horseshoe', taps: 3 },
  axe: { emoji: '🪓', name: 'Axe head', taps: 4 },
  helm: { emoji: '⛑️', name: 'Helmet', taps: 5 },
  shield: { emoji: '🛡️', name: 'Shield', taps: 6 },
  sword: { emoji: '🗡️', name: 'Sword', taps: 7 },
};
export const KIND_ORDER: Kind[] = ['shoe', 'sword', 'axe', 'helm', 'shield'];
const FACES = ['🧑‍🌾', '👩‍🍳', '🧙', '🧝', '🧔', '👵', '🧑‍✈️', '🤴', '👸', '🧑‍🎨', '🧌', '🧚'];

export interface ForgeSpec { seats: number; kinds: Kind[]; patience: number; gap: number; goal: number }

export function forgeSpec(level: number): ForgeSpec {
  const L = Math.max(1, Math.min(MAX_FORGE_LEVEL, Math.floor(level)));
  const e = Math.pow((L - 1) / (MAX_FORGE_LEVEL - 1), 0.5);
  const kinds = KIND_ORDER.slice(0, L < 3 ? 2 : L < 6 ? 3 : L < 10 ? 4 : 5);
  return {
    seats: L < 4 ? 2 : L < 40 ? 3 : 4,
    kinds,
    patience: Math.round(32_000 - 14_000 * e),
    gap: Math.round(8_000 - 4_000 * e),
    goal: Math.round(10 + 16 * e),
  };
}

export interface Customer { id: number; kind: Kind; face: string; patience: number; max: number }
export interface Piece { id: number; heat: number; kind: Kind | null; taps: number }
export interface Shift {
  level: number; t: number; seed: number; seq: number;
  seats: (Customer | null)[];
  forge: (Piece | null)[];
  anvil: Piece | null;
  barrel: { kind: Kind; left: number } | null;
  rack: (Kind | null)[];
  nextCustomer: number;
  served: number; missed: number;
  /** Tips (0..1) of every order served, for the XP and the end panel. */
  tips: number[];
  over: boolean;
  /** Things that just happened, for sounds (the screen empties it). */
  events: string[];
}

function rnd(s: Shift): number {
  let t = (s.seed = (s.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function newShift(level: number, seed = (Math.random() * 2 ** 32) >>> 0): Shift {
  const spec = forgeSpec(level);
  return {
    level: Math.max(1, Math.floor(level)), t: 0, seed, seq: 1,
    seats: Array(spec.seats).fill(null), forge: Array(FORGE_SLOTS).fill(null), anvil: null, barrel: null, rack: Array(RACK_SLOTS).fill(null),
    nextCustomer: 600, served: 0, missed: 0, tips: [], over: false, events: [],
  };
}

/** Time passes: heating, quenching, patience, new customers, the end of the shift. */
export function step(s: Shift, dt: number) {
  if (s.over) return;
  const spec = forgeSpec(s.level);
  s.t += dt;
  for (const p of s.forge) if (p && p.heat < 1) { p.heat = Math.min(1, p.heat + dt / HEAT_MS); if (p.heat >= 1) s.events.push('hot'); }
  if (s.barrel) {
    s.barrel.left -= dt;
    if (s.barrel.left <= 0) {
      const free = s.rack.indexOf(null);
      if (free >= 0) { s.rack[free] = s.barrel.kind; s.barrel = null; s.events.push('done'); }
    }
  }
  s.seats.forEach((c, i) => {
    if (!c) return;
    c.patience -= dt;
    if (c.patience <= 0) { s.seats[i] = null; s.missed++; s.events.push('leave'); }
  });
  if (s.t >= s.nextCustomer && s.t < SHIFT_MS - 6000) {
    const free = s.seats.indexOf(null);
    if (free >= 0) {
      const kind = spec.kinds[Math.floor(rnd(s) * spec.kinds.length)];
      s.seats[free] = { id: s.seq++, kind, face: FACES[Math.floor(rnd(s) * FACES.length)], patience: spec.patience, max: spec.patience };
      s.events.push('arrive');
      s.nextCustomer = s.t + spec.gap * (0.75 + rnd(s) * 0.5);
    } else s.nextCustomer = s.t + 800;
  }
  if (s.t >= SHIFT_MS) { s.over = true; s.events.push('over'); }
}

// ----- What you do -----
export function takeBar(s: Shift): boolean {
  const free = s.forge.indexOf(null);
  if (s.over || free < 0) return false;
  s.forge[free] = { id: s.seq++, heat: 0, kind: null, taps: 0 };
  return true;
}
/** A glowing bar from the forge onto the anvil. */
export function toAnvil(s: Shift, slot: number): boolean {
  const p = s.forge[slot];
  if (s.over || !p || p.heat < 1 || s.anvil) return false;
  s.anvil = p;
  s.forge[slot] = null;
  return true;
}
export function chooseShape(s: Shift, kind: Kind): boolean {
  if (!s.anvil || s.anvil.kind) return false;
  s.anvil.kind = kind;
  return true;
}
/** One hammer blow. Returns true when the piece is finished shaping. */
export function hammer(s: Shift): boolean {
  const a = s.anvil;
  if (s.over || !a || !a.kind) return false;
  if (a.taps < KINDS[a.kind].taps) a.taps++;
  return a.taps >= KINDS[a.kind].taps;
}
export const shaped = (s: Shift) => !!s.anvil?.kind && s.anvil.taps >= KINDS[s.anvil.kind].taps;
/** A shaped piece into the quench barrel. */
export function quench(s: Shift): boolean {
  if (s.over || !shaped(s) || s.barrel) return false;
  s.barrel = { kind: s.anvil!.kind!, left: QUENCH_MS };
  s.anvil = null;
  return true;
}
/** Start again on the anvil (a mis-picked shape): the bar goes back in the forge if there's room, else it's scrapped. */
export function scrap(s: Shift): boolean {
  if (!s.anvil) return false;
  const free = s.forge.indexOf(null);
  if (free >= 0) s.forge[free] = { ...s.anvil, kind: null, taps: 0, heat: 0.6 };
  s.anvil = null;
  return true;
}
/** Hand a finished piece from the rack to the customer who wants it most (the one closest to leaving). */
export function deliver(s: Shift, slot: number): { tip: number; seat: number } | null {
  const kind = s.rack[slot];
  if (s.over || !kind) return null;
  let best = -1;
  s.seats.forEach((c, i) => { if (c && c.kind === kind && (best < 0 || c.patience < s.seats[best]!.patience)) best = i; });
  if (best < 0) return null;
  const c = s.seats[best]!;
  const tip = Math.max(0, Math.min(1, c.patience / c.max));
  s.seats[best] = null;
  s.rack[slot] = null;
  s.served++;
  s.tips.push(tip);
  // The next customer comes a little sooner after a happy one.
  s.nextCustomer = Math.min(s.nextCustomer, s.t + 900);
  return { tip, seat: best };
}

/** 0–3 stars for a finished shift (3 also needs no more than 2 customers walking off). Two or more = the next level. */
export function stars(s: Shift): number {
  const goal = forgeSpec(s.level).goal;
  if (s.served >= goal && s.missed <= 2) return 3;
  return s.served >= goal * 0.75 ? 2 : s.served >= goal * 0.45 ? 1 : 0;
}

/** Smithing XP for one order: ×3 the chosen recipe's XP plus up to ×2 for a quick hand-over, a little more at higher
 *  levels (then scaled to your own level by game.minigameXp). */
export function orderXp(level: number, tip: number, baseXp: number): number {
  const lv = 1 + (Math.max(1, level) - 1) / (MAX_FORGE_LEVEL - 1) * 0.5;
  return Math.max(1, Math.round(baseXp * (3 + 2 * tip) * lv));
}
