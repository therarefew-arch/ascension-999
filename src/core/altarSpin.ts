// 🌀 Altar Spin (v0.0.2.28, owner picked it for Runecrafting — a rune-pouch builder like Pet Parade's "build a clever
// combo"). Engine only: no drawing, seeded rng so a saved run carries on exactly.
//
// How a run goes:
//  • Your pouch starts with a few plain runes. Each SPIN, the pouch is shuffled onto the 5×4 altar (up to 20 runes;
//    the rest of the cells stay empty), the runes set each other off, and their power is added to your store.
//  • After every spin you pick 1 of 3 new runes for the pouch (or skip).
//  • Every SPINS_PER_TITHE spins the Ley Spirit asks for a tithe of power. Pay it and the run goes on (and you get a
//    🧹 Cleanse to remove a rune from the pouch, and a 🔄 reroll); fall short and the run ends.
//  • Pay all TITHES tithes to win. XP is paid for every tithe you manage, so a short run still counts.
// v0.0.2.30 (owner: "I'm just buying the highest rated item and winning" — wanted it deeper):
//  • 💰 Runes cost power: every offer has one free common; better runes cost a share of the coming tithe, paid from
//    your stored power — so every pick is "is it worth it, or do I save for the tithe?".
//  • 🏛️ Altars: pick 1 of 3 at the start and after every tithe paid. They stack for the run and reshape the combos
//    (Hearth Altar fire ×1.5, Hoarder's Altar +1 per rune in the pouch, Snug Altar fewer runes but ×1.5…).
export const COLS = 5;
export const ROWS = 4;
export const CELLS = COLS * ROWS;
export const SPINS_PER_TITHE = 4;
export const TITHES = [36, 95, 190, 330, 510, 750, 1050, 1400, 1800, 2260];
/** Rewards: minutes of your best Runecrafting action's XP per tithe paid, and the extra for paying them all. */
export const ALTAR_TITHE_MIN = 1;
export const ALTAR_WIN_MIN = 5;
export const START_POUCH = ['ember', 'droplet', 'breeze', 'pebble', 'sprout', 'spark'];

export type Element = 'fire' | 'water' | 'air' | 'earth' | 'nature' | 'light' | 'dark' | 'star';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface RuneDef {
  id: string;
  name: string;
  emoji: string;
  el: Element;
  rarity: Rarity;
  base: number;
  /** What it does, in a few words. */
  text: string;
}

export const RUNES: RuneDef[] = [
  // Common
  { id: 'ember', name: 'Ember', emoji: '🔥', el: 'fire', rarity: 'common', base: 1, text: '×2 next to any air rune' },
  { id: 'droplet', name: 'Droplet', emoji: '💧', el: 'water', rarity: 'common', base: 1, text: '+1 for each other water rune next to it' },
  { id: 'breeze', name: 'Breeze', emoji: '💨', el: 'air', rarity: 'common', base: 1, text: 'Gives +1 to every fire rune next to it' },
  { id: 'pebble', name: 'Pebble', emoji: '🪨', el: 'earth', rarity: 'common', base: 2, text: 'Steady: always 2' },
  { id: 'sprout', name: 'Sprout', emoji: '🌱', el: 'nature', rarity: 'common', base: 1, text: 'Grows +1 for good each spin it lands next to water' },
  { id: 'spark', name: 'Spark', emoji: '✨', el: 'light', rarity: 'common', base: 1, text: '+1 for each empty cell next to it' },
  { id: 'shade', name: 'Shade', emoji: '🌑', el: 'dark', rarity: 'common', base: 4, text: 'Takes 1 from every rune next to it' },
  // Uncommon
  { id: 'blaze', name: 'Blaze', emoji: '🌋', el: 'fire', rarity: 'uncommon', base: 3, text: '×2 next to any air rune' },
  { id: 'tide', name: 'Tide', emoji: '🌊', el: 'water', rarity: 'uncommon', base: 2, text: 'Doubles every water rune next to it' },
  { id: 'gale', name: 'Gale', emoji: '🌪️', el: 'air', rarity: 'uncommon', base: 2, text: 'Gives +2 to every fire rune next to it' },
  { id: 'boulder', name: 'Boulder', emoji: '⛰️', el: 'earth', rarity: 'uncommon', base: 3, text: '+2 for each earth rune next to it' },
  { id: 'bloom', name: 'Bloom', emoji: '🌸', el: 'nature', rarity: 'uncommon', base: 2, text: '+2 for each nature rune next to it' },
  { id: 'prism', name: 'Prism', emoji: '🔷', el: 'light', rarity: 'uncommon', base: 0, text: 'Copies the strongest rune next to it' },
  { id: 'void', name: 'Void', emoji: '🕳️', el: 'dark', rarity: 'uncommon', base: 1, text: 'Eats a common rune next to it (gone for good) and grows +3' },
  { id: 'bell', name: 'Bell', emoji: '🔔', el: 'air', rarity: 'uncommon', base: 1, text: '+1 for each rune in its row' },
  // Rare
  { id: 'sun', name: 'Sun', emoji: '☀️', el: 'light', rarity: 'rare', base: 3, text: 'Gives +2 to every rune in its row' },
  { id: 'moon', name: 'Moon', emoji: '🌙', el: 'dark', rarity: 'rare', base: 2, text: '+2 for each empty cell on the altar' },
  { id: 'orb', name: 'Orb', emoji: '🔮', el: 'star', rarity: 'rare', base: 2, text: '+3 for each different element next to it' },
  { id: 'lantern', name: 'Lantern', emoji: '🏮', el: 'light', rarity: 'rare', base: 2, text: 'Dark runes next to it give instead of take, ×2' },
  { id: 'hourglass', name: 'Hourglass', emoji: '⏳', el: 'star', rarity: 'rare', base: 1, text: 'Once per tithe: the first time it lands, +1 spin before the tithe' },
  { id: 'comet', name: 'Comet', emoji: '☄️', el: 'star', rarity: 'rare', base: 2, text: '1 in 3 spins it streaks for +25' },
  // Legendary
  { id: 'trident', name: 'Trident', emoji: '🔱', el: 'water', rarity: 'legendary', base: 4, text: 'Every water rune on the altar ×3' },
  { id: 'worldtree', name: 'Worldtree', emoji: '🌳', el: 'nature', rarity: 'legendary', base: 4, text: 'Every nature rune on the altar grows +1 for good each spin' },
  { id: 'crown', name: 'Crown', emoji: '👑', el: 'star', rarity: 'legendary', base: 3, text: 'Doubles every rune next to it' },
  { id: 'rift', name: 'Rift', emoji: '🌀', el: 'star', rarity: 'legendary', base: 5, text: '+1 for every rune in your pouch' },
];
export const RUNE_MAP: Record<string, RuneDef> = Object.fromEntries(RUNES.map((r) => [r.id, r]));
/** 🏛️ Altars: lasting upgrades for the run (pick 1 of 3 at the start and after each tithe). */
export interface AltarDef { id: string; name: string; emoji: string; text: string }
export const ALTARS: AltarDef[] = [
  { id: 'hearth', name: 'Hearth Altar', emoji: '🔥', text: 'Fire runes ×1.5' },
  { id: 'tidal', name: 'Tidal Altar', emoji: '🌊', text: 'Water runes +1 for every other water rune on the altar (up to +6)' },
  { id: 'kite', name: 'Kite Altar', emoji: '🪁', text: 'Breeze and Gale give their boost to every neighbour, not just fire' },
  { id: 'stone', name: 'Stone Altar', emoji: '⛰️', text: 'Earth runes +3, and Voids can’t eat them' },
  { id: 'grove', name: 'Grove Altar', emoji: '🌿', text: 'Every nature rune grows +1 for good each spin' },
  { id: 'dawn', name: 'Dawn Altar', emoji: '🌅', text: 'Light runes ×2' },
  { id: 'dusk', name: 'Dusk Altar', emoji: '🌑', text: 'Dark runes +3 and stop taking from their neighbours' },
  { id: 'star', name: 'Star Altar', emoji: '🌠', text: 'Star runes ×2, and Comets streak 1 spin in 2' },
  { id: 'ley', name: 'Ley Line', emoji: '〰️', text: 'Runes in the two middle rows ×1.5' },
  { id: 'snug', name: 'Snug Altar', emoji: '🧺', text: 'Only 16 runes land each spin, but every rune ×1.5' },
  { id: 'hoarder', name: 'Hoarder’s Altar', emoji: '🎒', text: '+1⚡ each spin for every rune in your pouch' },
  { id: 'hollow', name: 'Hollow Altar', emoji: '🫙', text: '+3⚡ each spin for every empty cell' },
  { id: 'echo', name: 'Echo Altar', emoji: '📯', text: 'Your best rune each spin counts twice' },
  { id: 'pure', name: 'Pure Altar', emoji: '🕊️', text: '+50% on a spin with 3 or fewer elements on the altar' },
  { id: 'merchant', name: 'Merchant’s Altar', emoji: '🪙', text: 'Runes cost half' },
  { id: 'lucky', name: 'Lucky Altar', emoji: '🍀', text: 'Rarer runes turn up in offers' },
];
export const ALTAR_MAP: Record<string, AltarDef> = Object.fromEntries(ALTARS.map((a) => [a.id, a]));

/** 💰 What a rune costs, as a share of the coming tithe (commons are free). */
export const PRICE_SHARE: Record<Rarity, number> = { common: 0, uncommon: 0.12, rare: 0.25, legendary: 0.45 };

export const RARITY_COLOR: Record<Rarity, string> = { common: '#c9bfae', uncommon: '#6ee7b7', rare: '#93c5fd', legendary: '#fbbf24' };

/** A rune in your pouch (with what it has grown, for good). */
export interface PouchRune { uid: number; id: string; grow: number }

/** One cell's result from a spin. `from` = the cells that boosted (or ate) it, `mult` = its multiplier — the screen
 *  lights those up while it adds the spin up. */
export interface CellResult { uid: number; id: string; value: number; eaten?: boolean; note?: string; from?: number[]; mult?: number }

export interface AltarRun {
  seed: number;
  pouch: PouchRune[];
  nextUid: number;
  /** Power stored up toward the tithe. */
  power: number;
  /** Tithes paid so far (0..TITHES.length). */
  paid: number;
  /** Spins left before the next tithe. */
  spinsLeft: number;
  /** The last spin's grid (null cells are empty), and its total. */
  grid: (CellResult | null)[];
  lastGain: number;
  /** Runes offered after the last spin (empty = nothing to pick), and what each costs in power. */
  offer: string[];
  prices: number[];
  /** 🏛️ Altars chosen this run, and the 3 on offer (empty = nothing to pick). */
  altars: string[];
  altarOffer: string[];
  /** The last spin's altar bonuses (shown at the end of the add-up). */
  bonus: { emoji: string; name: string; value: number }[];
  cleanses: number;
  rerolls: number;
  /** Hourglass already used this tithe. */
  hourglassUsed: boolean;
  spins: number;
  over: boolean;
  won: boolean;
  best: number;
}

// ----- seeded rng (mulberry32), kept in the run so a saved run carries on the same way -----
function rnd(run: AltarRun): number {
  let t = (run.seed = (run.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(run: AltarRun, list: T[]): T => list[Math.floor(rnd(run) * list.length)];

export function newRun(seed = (Math.random() * 2 ** 32) >>> 0): AltarRun {
  const run: AltarRun = {
    seed, pouch: [], nextUid: 1, power: 0, paid: 0, spinsLeft: SPINS_PER_TITHE, grid: Array(CELLS).fill(null), lastGain: 0,
    offer: [], prices: [], altars: [], altarOffer: [], bonus: [], cleanses: 0, rerolls: 1, hourglassUsed: false, spins: 0, over: false, won: false, best: 0,
  };
  for (const id of START_POUCH) addRune(run, id);
  run.altarOffer = makeAltarOffer(run);
  return run;
}

export function addRune(run: AltarRun, id: string) {
  run.pouch.push({ uid: run.nextUid++, id, grow: 0 });
}

const neighbours = (i: number): number[] => {
  const x = i % COLS, y = Math.floor(i / COLS);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) out.push(ny * COLS + nx);
  }
  return out;
};
const NB: number[][] = Array.from({ length: CELLS }, (_, i) => neighbours(i));
const rowOf = (i: number) => Math.floor(i / COLS);

/** Lay the pouch onto the altar and work out what every rune is worth. Changes the pouch (growth, eaten runes). */
const has = (run: AltarRun, id: string) => run.altars.includes(id);

export function spin(run: AltarRun): number {
  if (run.over || run.offer.length || run.altarOffer.length) return 0;
  // Shuffle the pouch, take up to 20, scatter them over random cells.
  const bag = [...run.pouch];
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd(run) * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  const cells = Array.from({ length: CELLS }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rnd(run) * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  const at: (PouchRune | null)[] = Array(CELLS).fill(null);
  bag.slice(0, has(run, 'snug') ? 16 : CELLS).forEach((r, k) => { at[cells[k]] = r; });
  const def = (i: number) => (at[i] ? RUNE_MAP[at[i]!.id] : null);
  const eaten = new Set<number>();
  const src: Set<number>[] = Array.from({ length: CELLS }, () => new Set<number>());
  const notes: string[] = Array(CELLS).fill('');

  // 1. Voids eat a common rune next to them (gone from the pouch for good) and grow.
  for (let i = 0; i < CELLS; i++) {
    if (def(i)?.id !== 'void') continue;
    const food = NB[i].filter((n) => at[n] && !eaten.has(n) && def(n)!.rarity === 'common' && !(has(run, 'stone') && def(n)!.el === 'earth'));
    if (!food.length) continue;
    const n = pick(run, food);
    eaten.add(n);
    src[n].add(i);
    at[i]!.grow += 3;
    notes[i] = 'ate a rune! +3';
  }
  const live = (i: number) => !!at[i] && !eaten.has(i);
  const liveDef = (i: number) => (live(i) ? def(i) : null);

  // 2. Growth for good.
  const hasTree = at.some((r, i) => live(i) && r!.id === 'worldtree');
  for (let i = 0; i < CELLS; i++) {
    const d = liveDef(i);
    if (!d) continue;
    if (d.id === 'sprout' && NB[i].some((n) => liveDef(n)?.el === 'water')) { at[i]!.grow += 1; notes[i] = 'grew +1'; }
    if (hasTree && d.el === 'nature' && d.id !== 'worldtree') { at[i]!.grow += 1; notes[i] = notes[i] || 'grew +1'; }
    if (has(run, 'grove') && d.el === 'nature') { at[i]!.grow += 1; notes[i] = notes[i] || 'grew +1'; }
  }

  // 3. Base values.
  const v: number[] = Array(CELLS).fill(0);
  const empty = at.filter((_, i) => !live(i)).length;
  const waterOn = at.filter((r, i) => live(i) && RUNE_MAP[r!.id].el === 'water').length;
  for (let i = 0; i < CELLS; i++) {
    const d = liveDef(i);
    if (!d) continue;
    let x = d.base + at[i]!.grow;
    if (has(run, 'tidal') && d.el === 'water') x += Math.min(6, waterOn - 1);
    if (has(run, 'stone') && d.el === 'earth') x += 3;
    if (has(run, 'dusk') && d.el === 'dark') x += 3;
    const nb = NB[i].filter(live);
    switch (d.id) {
      case 'droplet': { const w = nb.filter((n) => def(n)!.el === 'water'); w.forEach((n) => src[i].add(n)); x += w.length; break; }
      case 'spark': x += NB[i].filter((n) => !live(n)).length; break;
      case 'boulder': { const e = nb.filter((n) => def(n)!.el === 'earth'); e.forEach((n) => src[i].add(n)); x += 2 * e.length; break; }
      case 'bloom': { const e = nb.filter((n) => def(n)!.el === 'nature'); e.forEach((n) => src[i].add(n)); x += 2 * e.length; break; }
      case 'bell': x += at.filter((_, j) => live(j) && j !== i && rowOf(j) === rowOf(i)).length; break;
      case 'moon': x += 2 * empty; break;
      case 'orb': nb.forEach((n) => src[i].add(n)); x += 3 * new Set(nb.map((n) => def(n)!.el)).size; break;
      case 'rift': x += run.pouch.length; break;
      case 'comet': if (rnd(run) < (has(run, 'star') ? 1 / 2 : 1 / 3)) { x += 25; notes[i] = 'streaks! +25'; } break;
    }
    v[i] = x;
  }

  // 4. Gifts to neighbours / rows.
  const add: number[] = Array(CELLS).fill(0);
  for (let i = 0; i < CELLS; i++) {
    const d = liveDef(i);
    if (!d) continue;
    const nb = NB[i].filter(live);
    const kite = has(run, 'kite');
    if (d.id === 'breeze') nb.forEach((n) => { if (kite || def(n)!.el === 'fire') { add[n] += 1; src[n].add(i); } });
    if (d.id === 'gale') nb.forEach((n) => { if (kite || def(n)!.el === 'fire') { add[n] += 2; src[n].add(i); } });
    if (d.id === 'sun') for (let j = 0; j < CELLS; j++) if (j !== i && live(j) && rowOf(j) === rowOf(i)) { add[j] += 2; src[j].add(i); }
    if (d.el === 'dark' && d.id !== 'moon' && d.id !== 'void') {
      const lit = NB[i].some((n) => liveDef(n)?.id === 'lantern');
      if (lit) { v[i] *= 2; nb.forEach((n) => { add[n] += 1; src[n].add(i); }); NB[i].forEach((n) => { if (liveDef(n)?.id === 'lantern') src[i].add(n); }); notes[i] = notes[i] || 'lantern-lit ×2'; }
      else if (!has(run, 'dusk')) nb.forEach((n) => { add[n] -= 1; src[n].add(i); });
    }
  }
  for (let i = 0; i < CELLS; i++) v[i] = Math.max(0, v[i] + add[i]);

  // 5. Multipliers.
  const hasTrident = at.some((r, i) => live(i) && r!.id === 'trident');
  const mult: number[] = Array(CELLS).fill(1);
  for (let i = 0; i < CELLS; i++) {
    const d = liveDef(i);
    if (!d) continue;
    const nb = NB[i].filter(live);
    if ((d.id === 'ember' || d.id === 'blaze') && nb.some((n) => def(n)!.el === 'air')) { mult[i] *= 2; nb.forEach((n) => { if (def(n)!.el === 'air') src[i].add(n); }); }
    if (d.id === 'tide') nb.forEach((n) => { if (def(n)!.el === 'water') { mult[n] *= 2; src[n].add(i); } });
    if (d.id === 'crown') nb.forEach((n) => { mult[n] *= 2; src[n].add(i); });
    if (has(run, 'hearth') && d.el === 'fire') mult[i] *= 1.5;
    if (has(run, 'dawn') && d.el === 'light') mult[i] *= 2;
    if (has(run, 'star') && d.el === 'star') mult[i] *= 2;
    if (has(run, 'ley') && (rowOf(i) === 1 || rowOf(i) === 2)) mult[i] *= 1.5;
    if (has(run, 'snug')) mult[i] *= 1.5;
    if (hasTrident && d.el === 'water') { mult[i] *= 3; at.forEach((r, j) => { if (live(j) && r!.id === 'trident' && j !== i) src[i].add(j); }); }
  }
  for (let i = 0; i < CELLS; i++) v[i] = Math.round(v[i] * mult[i]);

  // 6. Prisms copy the strongest neighbour.
  for (let i = 0; i < CELLS; i++) {
    if (liveDef(i)?.id !== 'prism') continue;
    const cand = NB[i].filter((n) => live(n) && def(n)!.id !== 'prism');
    if (!cand.length) continue;
    const top = cand.reduce((a, b) => (v[b] > v[a] ? b : a));
    v[i] += v[top];
    src[i].add(top);
  }

  // 7. Hourglass: one extra spin before the tithe, once per tithe.
  let extra = false;
  if (!run.hourglassUsed && at.some((r, i) => live(i) && r!.id === 'hourglass')) { run.hourglassUsed = true; extra = true; }

  // 8. Altar bonuses on the whole spin.
  const bonus: AltarRun['bonus'] = [];
  const runeSum = v.reduce((s, x) => s + x, 0);
  const b = (id: string, value: number) => { if (value > 0) bonus.push({ emoji: ALTAR_MAP[id].emoji, name: ALTAR_MAP[id].name, value }); };
  if (has(run, 'echo')) b('echo', Math.max(0, ...v));
  if (has(run, 'hoarder')) b('hoarder', run.pouch.length - eaten.size);
  if (has(run, 'hollow')) b('hollow', 3 * empty);
  if (has(run, 'pure')) {
    const els = new Set(at.filter((_, i) => live(i)).map((r) => RUNE_MAP[r!.id].el));
    if (els.size && els.size <= 3) b('pure', Math.round((runeSum + bonus.reduce((s, x) => s + x.value, 0)) * 0.5));
  }
  run.bonus = bonus;
  const total = runeSum + bonus.reduce((s, x) => s + x.value, 0);
  run.grid = at.map((r, i) => (r ? { uid: r.uid, id: r.id, value: eaten.has(i) ? 0 : v[i], eaten: eaten.has(i) || undefined, note: notes[i] || undefined,
    from: src[i].size ? [...src[i]] : undefined, mult: mult[i] > 1 ? mult[i] : undefined } : null));
  if (eaten.size) { const gone = new Set([...eaten].map((i) => at[i]!.uid)); run.pouch = run.pouch.filter((r) => !gone.has(r.uid)); }
  run.power += total;
  run.lastGain = total;
  run.best = Math.max(run.best, total);
  run.spins++;
  run.spinsLeft--;
  if (extra) run.spinsLeft++;
  run.offer = makeOffer(run);
  run.prices = run.offer.map((id) => priceOf(run, id));
  return total;
}

/** Odds of each rarity in an offer — better runes later in the run. */
export function rarityOdds(paid: number): Record<Rarity, number> {
  const t = Math.min(1, paid / (TITHES.length - 1));
  return { common: 0.55 - 0.3 * t, uncommon: 0.33, rare: 0.1 + 0.2 * t, legendary: 0.02 + 0.1 * t };
}
function rollRarity(run: AltarRun): Rarity {
  const o = rarityOdds(run.paid + (has(run, 'lucky') ? 4 : 0));
  let r = rnd(run) * (o.common + o.uncommon + o.rare + o.legendary);
  for (const k of ['common', 'uncommon', 'rare', 'legendary'] as Rarity[]) { if (r < o[k]) return k; r -= o[k]; }
  return 'common';
}
/** What a rune costs right now (a share of the coming tithe; commons free; Merchant's Altar halves it). */
export function priceOf(run: AltarRun, id: string): number {
  const share = PRICE_SHARE[RUNE_MAP[id].rarity];
  return Math.round(titheDue(run) * share * (has(run, 'merchant') ? 0.5 : 1));
}
/** Three runes: the first always a free common, the other two rolled (rarer later in the run). */
export function makeOffer(run: AltarRun): string[] {
  const commons = RUNES.filter((r) => r.rarity === 'common');
  const out: string[] = [pick(run, commons).id];
  for (let tries = 0; out.length < 3 && tries < 30; tries++) {
    const rar = rollRarity(run);
    const id = pick(run, RUNES.filter((r) => r.rarity === rar)).id;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** Take a rune from the offer (or null to skip). Then, if the tithe is due, pay it (or end the run). */
export function choose(run: AltarRun, id: string | null): 'ok' | 'paid' | 'won' | 'lost' | 'poor' {
  if (!run.offer.length) return 'ok';
  if (id) {
    const k = run.offer.indexOf(id);
    if (k < 0) return 'ok';
    const cost = run.prices[k] ?? 0;
    if (run.power < cost) return 'poor';
    run.power -= cost;
    addRune(run, id);
  }
  run.offer = [];
  run.prices = [];
  return settle(run);
}
/** 🏛️ Three altars you don't have yet. */
export function makeAltarOffer(run: AltarRun): string[] {
  const pool = ALTARS.filter((a) => !run.altars.includes(a.id)).map((a) => a.id);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd(run) * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 3);
}
export function chooseAltar(run: AltarRun, id: string): boolean {
  if (!run.altarOffer.includes(id)) return false;
  run.altars.push(id);
  run.altarOffer = [];
  return true;
}
export function reroll(run: AltarRun): boolean {
  if (!run.offer.length || run.rerolls <= 0) return false;
  run.rerolls--;
  run.offer = makeOffer(run);
  run.prices = run.offer.map((id) => priceOf(run, id));
  return true;
}
/** 🧹 Remove a rune from the pouch for good (one per tithe paid). */
export function cleanse(run: AltarRun, uid: number): boolean {
  if (run.cleanses <= 0 || run.pouch.length <= 1) return false;
  const before = run.pouch.length;
  run.pouch = run.pouch.filter((r) => r.uid !== uid);
  if (run.pouch.length === before) return false;
  run.cleanses--;
  return true;
}

/** The tithe that's due now (or next). */
export const titheDue = (run: AltarRun) => TITHES[Math.min(run.paid, TITHES.length - 1)];

function settle(run: AltarRun): 'ok' | 'paid' | 'won' | 'lost' {
  if (run.spinsLeft > 0) return 'ok';
  const due = titheDue(run);
  if (run.power < due) { run.over = true; return 'lost'; }
  run.power -= due;
  run.paid++;
  if (run.paid >= TITHES.length) { run.over = true; run.won = true; return 'won'; }
  run.spinsLeft = SPINS_PER_TITHE;
  run.hourglassUsed = false;
  run.cleanses++;
  run.rerolls++;
  run.altarOffer = makeAltarOffer(run);
  return 'paid';
}

/** Save/load (the device keeps an unfinished run per save slot). */
export function loadRun(raw: unknown): AltarRun | null {
  const r = raw as AltarRun;
  if (!r || typeof r !== 'object' || !Array.isArray(r.pouch) || !Array.isArray(r.grid) || typeof r.seed !== 'number') return null;
  r.pouch = r.pouch.filter((x) => x && RUNE_MAP[x.id]);
  r.offer = (r.offer ?? []).filter((id) => RUNE_MAP[id]);
  // Runs saved before v0.0.2.30 had no prices or altars.
  if (!Array.isArray(r.prices) || r.prices.length !== r.offer.length) r.prices = r.offer.map(() => 0);
  r.altars = (Array.isArray(r.altars) ? r.altars : []).filter((id) => ALTAR_MAP[id]);
  r.altarOffer = (Array.isArray(r.altarOffer) ? r.altarOffer : []).filter((id) => ALTAR_MAP[id]);
  r.bonus = Array.isArray(r.bonus) ? r.bonus : [];
  return r;
}
