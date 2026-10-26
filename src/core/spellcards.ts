// 🃏 Spellcards — Enhancing's card minigame (inspired by poker roguelikes, our own magic twist).
// A run is 6 wards. Each ward needs a target score: you hold 8 rune cards and cast up to 5 as a "spell"
// (poker hands). Score = Essence × Power. Between wards the Enchanter sells Charms (always-on modifiers)
// and Scrolls (enchant cards in your deck for the rest of the run). Beating a ward gives Enhancing + Magic XP.
// No bars, no gear; losing a run only ends it.
import { gatherXpPerHour, tierForLevel } from '../data/tiers';

export type Element = 'fire' | 'water' | 'earth' | 'air';
export const ELEMENTS: Element[] = ['fire', 'water', 'earth', 'air'];
export const ELEMENT_INFO: Record<Element, { name: string; emoji: string; color: string }> = {
  fire: { name: 'Fire', emoji: '🔥', color: '#f97316' },
  water: { name: 'Water', emoji: '💧', color: '#38bdf8' },
  earth: { name: 'Earth', emoji: '🪨', color: '#84cc16' },
  air: { name: 'Air', emoji: '🌬️', color: '#e2e8f0' },
};

export type Enchant = 'gilded' | 'charged' | 'radiant';
export interface Card { id: number; el: Element; v: number; ench?: Enchant }

export const HAND_SIZE = 8;
export const MAX_PLAY = 5;
export const CASTS = 4;
export const REDRAWS = 3;
export const WARDS = 6;
export const MAX_CHARMS = 5;
export const MAX_SCROLLS = 2;

// ---------- Spells (poker hands) ----------
export type SpellId = 'high' | 'pair' | 'twopair' | 'three' | 'ley' | 'pure' | 'full' | 'four' | 'grand';
export const SPELLS: Record<SpellId, { name: string; essence: number; power: number; how: string }> = {
  high: { name: 'Spark', essence: 5, power: 1, how: 'Your highest card' },
  pair: { name: 'Pair', essence: 10, power: 2, how: 'Two of the same number' },
  twopair: { name: 'Two Pair', essence: 20, power: 2, how: 'Two different pairs' },
  three: { name: 'Three of a Kind', essence: 30, power: 3, how: 'Three of the same number' },
  ley: { name: 'Ley Line', essence: 30, power: 4, how: 'Five numbers in a row' },
  pure: { name: 'Pure Element', essence: 35, power: 4, how: 'Five cards of one element' },
  full: { name: 'Full House', essence: 40, power: 4, how: 'Three of a kind + a pair' },
  four: { name: 'Four of a Kind', essence: 60, power: 7, how: 'Four of the same number' },
  grand: { name: 'Grand Ritual', essence: 100, power: 8, how: 'Ley Line, all one element' },
};
export const SPELL_ORDER: SpellId[] = ['grand', 'four', 'full', 'pure', 'ley', 'three', 'twopair', 'pair', 'high'];

/** Which spell a set of cards makes, and which of them count ("scoring cards"). */
export function readSpell(cards: Card[]): { spell: SpellId; scoring: Card[] } {
  const byValue = new Map<number, Card[]>();
  for (const c of cards) byValue.set(c.v, [...(byValue.get(c.v) ?? []), c]);
  const groups = [...byValue.values()].sort((a, b) => b.length - a.length || b[0].v - a[0].v);
  const sorted = [...cards].sort((a, b) => a.v - b.v);
  const five = cards.length === 5;
  const flush = five && cards.every((c) => c.el === cards[0].el);
  const straight = five && groups.length === 5 && sorted[4].v - sorted[0].v === 4;
  if (straight && flush) return { spell: 'grand', scoring: cards };
  if (groups[0]?.length === 4) return { spell: 'four', scoring: groups[0] };
  if (groups[0]?.length === 3 && groups[1]?.length === 2) return { spell: 'full', scoring: cards };
  if (flush) return { spell: 'pure', scoring: cards };
  if (straight) return { spell: 'ley', scoring: cards };
  if (groups[0]?.length === 3) return { spell: 'three', scoring: groups[0] };
  if (groups[0]?.length === 2 && groups[1]?.length === 2) return { spell: 'twopair', scoring: [...groups[0], ...groups[1]] };
  if (groups[0]?.length === 2) return { spell: 'pair', scoring: groups[0] };
  const top = sorted[sorted.length - 1];
  return { spell: 'high', scoring: top ? [top] : [] };
}

// ---------- Charms (always-on modifiers, up to 5) ----------
export type CharmId =
  | 'ember' | 'tide' | 'stone' | 'gale' | 'twin_moons' | 'even_keel' | 'odd_owl' | 'ley_seeker'
  | 'purist' | 'clover' | 'hoarder' | 'last_light' | 'echo' | 'big_ten' | 'wizard_hat' | 'familiar' | 'sparkler';
export interface CharmDef { id: CharmId; name: string; emoji: string; text: string; cost: number }
export const CHARMS: CharmDef[] = [
  { id: 'ember', name: 'Ember Charm', emoji: '🔥', text: '+5 Power if your spell has a Fire card', cost: 4 },
  { id: 'tide', name: 'Tide Charm', emoji: '🌊', text: '+15 Essence for each scoring Water card', cost: 4 },
  { id: 'stone', name: 'Stone Charm', emoji: '🪨', text: 'Earth cards score double their number', cost: 4 },
  { id: 'gale', name: 'Gale Charm', emoji: '🌬️', text: '+3 Power for each scoring Air card', cost: 5 },
  { id: 'twin_moons', name: 'Twin Moons', emoji: '🌗', text: '×2 Power if your spell has a pair in it', cost: 6 },
  { id: 'even_keel', name: 'Even Keel', emoji: '⚖️', text: '+10 Essence for each scoring even card', cost: 4 },
  { id: 'odd_owl', name: 'Odd Owl', emoji: '🦉', text: '+2 Power for each scoring odd card', cost: 5 },
  { id: 'ley_seeker', name: 'Ley Seeker', emoji: '🧭', text: '+12 Power on a Ley Line or Grand Ritual', cost: 5 },
  { id: 'purist', name: 'Purist', emoji: '💠', text: '+10 Power on a Pure Element or Grand Ritual', cost: 5 },
  { id: 'clover', name: 'Lucky Clover', emoji: '🍀', text: '+1 to +12 Power, random every spell', cost: 4 },
  { id: 'hoarder', name: 'Dragon’s Hoard', emoji: '💰', text: '+1 Power for every 2 sparks you have', cost: 5 },
  { id: 'last_light', name: 'Last Light', emoji: '🕯️', text: '×3 Power on your last cast of a ward', cost: 6 },
  { id: 'echo', name: 'Echo Stone', emoji: '🔁', text: 'Your first scoring card counts twice', cost: 6 },
  { id: 'big_ten', name: 'Perfect Ten', emoji: '🔟', text: '+30 Essence for each scoring 10', cost: 4 },
  { id: 'wizard_hat', name: 'Wizard’s Hat', emoji: '🎩', text: '×1.5 Power, always', cost: 7 },
  { id: 'familiar', name: 'Familiar', emoji: '🐈‍⬛', text: '+1 cast every ward', cost: 6 },
  { id: 'sparkler', name: 'Sparkler', emoji: '✨', text: '+2 sparks after every ward', cost: 4 },
];
export const CHARM_MAP = Object.fromEntries(CHARMS.map((c) => [c.id, c])) as Record<CharmId, CharmDef>;

// ---------- Scrolls (use during a ward on selected cards; the change lasts the whole run) ----------
export type ScrollId = 'gild' | 'charge' | 'radiance' | 'attune' | 'uplift';
export interface ScrollDef { id: ScrollId; name: string; emoji: string; text: string; cost: number; max: number }
export const SCROLLS: ScrollDef[] = [
  { id: 'gild', name: 'Gild', emoji: '🪙', text: 'Up to 2 cards: +30 Essence when they score', cost: 3, max: 2 },
  { id: 'charge', name: 'Charge', emoji: '⚡', text: 'Up to 2 cards: +4 Power when they score', cost: 3, max: 2 },
  { id: 'radiance', name: 'Radiance', emoji: '🌟', text: '1 card: ×1.5 Power when it scores', cost: 4, max: 1 },
  { id: 'attune', name: 'Attune', emoji: '🔮', text: 'Up to 3 cards become the element of the first one you picked', cost: 3, max: 3 },
  { id: 'uplift', name: 'Uplift', emoji: '⬆️', text: 'Up to 2 cards: +1 to their number (max 10)', cost: 3, max: 2 },
];
export const SCROLL_MAP = Object.fromEntries(SCROLLS.map((s) => [s.id, s])) as Record<ScrollId, ScrollDef>;
export const ENCHANT_INFO: Record<Enchant, { emoji: string; text: string }> = {
  gilded: { emoji: '🪙', text: '+30 Essence' },
  charged: { emoji: '⚡', text: '+4 Power' },
  radiant: { emoji: '🌟', text: '×1.5 Power' },
};

// ---------- Wards ----------
export type Quirk = 'ashen' | 'drowned' | 'short' | 'still';
export const QUIRKS: Record<Quirk, { name: string; text: string }> = {
  ashen: { name: 'Ashen Ward', text: 'Fire cards score nothing' },
  drowned: { name: 'Drowned Ward', text: 'Water cards score nothing' },
  short: { name: 'Hasty Ward', text: 'One cast fewer' },
  still: { name: 'Still Ward', text: 'No redraws' },
};
/** Score each ward needs. Wards 3 and 6 are the tricky ones (with a quirk). Tuned by simulation. */
export const WARD_TARGETS = [300, 500, 800, 1300, 2000, 3200];
export const isBossWard = (w: number) => w === 2 || w === 5;

// ---------- The run ----------
export interface Run {
  ward: number;
  deck: Card[];
  pile: Card[];
  hand: Card[];
  score: number;
  casts: number;
  redraws: number;
  sparks: number;
  charms: CharmId[];
  scrolls: ScrollId[];
  quirk: Quirk | null;
  phase: 'play' | 'shop' | 'won' | 'lost';
  shop: { charms: CharmId[]; scrolls: ScrollId[]; rerollCost: number };
  /** XP given so far this run (for the summary). */
  xp: { enhancing: number; magic: number };
  best: { spell: SpellId; total: number } | null;
  nextId: number;
}

type Rng = () => number;
function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function newRun(rng: Rng = Math.random): Run {
  const deck: Card[] = [];
  let id = 1;
  for (const el of ELEMENTS) for (let v = 1; v <= 10; v++) deck.push({ id: id++, el, v });
  const run: Run = {
    ward: 0, deck, pile: [], hand: [], score: 0, casts: CASTS, redraws: REDRAWS, sparks: 4, charms: [], scrolls: [],
    quirk: null, phase: 'play', shop: { charms: [], scrolls: [], rerollCost: 2 }, xp: { enhancing: 0, magic: 0 }, best: null, nextId: id,
  };
  startWard(run, rng);
  return run;
}

function startWard(run: Run, rng: Rng) {
  run.quirk = isBossWard(run.ward) ? (Object.keys(QUIRKS) as Quirk[])[Math.floor(rng() * 4)] : null;
  run.casts = CASTS + (run.charms.includes('familiar') ? 1 : 0) - (run.quirk === 'short' ? 1 : 0);
  run.redraws = run.quirk === 'still' ? 0 : REDRAWS;
  run.score = 0;
  run.pile = shuffle(run.deck.map((c) => ({ ...c })), rng);
  run.hand = [];
  run.phase = 'play';
  draw(run);
}

function draw(run: Run) {
  while (run.hand.length < HAND_SIZE && run.pile.length) run.hand.push(run.pile.shift()!);
}

export interface Cast { spell: SpellId; scoring: Card[]; essence: number; power: number; total: number }

/** Works out what a spell would score. `rng` only matters for the Lucky Clover. */
export function scoreSpell(run: Pick<Run, 'charms' | 'quirk' | 'sparks' | 'casts'>, cards: Card[], rng: Rng = Math.random): Cast {
  const { spell, scoring } = readSpell(cards);
  const has = (c: CharmId) => run.charms.includes(c);
  let essence = SPELLS[spell].essence;
  let power = SPELLS[spell].power;
  const dead = (c: Card) => (run.quirk === 'ashen' && c.el === 'fire') || (run.quirk === 'drowned' && c.el === 'water');
  const triggers = scoring.flatMap((c, i) => (i === 0 && has('echo') ? [c, c] : [c]));
  for (const c of triggers) {
    if (dead(c)) continue;
    essence += c.el === 'earth' && has('stone') ? c.v * 2 : c.v;
    if (c.ench === 'gilded') essence += 30;
    if (c.ench === 'charged') power += 4;
    if (has('tide') && c.el === 'water') essence += 15;
    if (has('even_keel') && c.v % 2 === 0) essence += 10;
    if (has('big_ten') && c.v === 10) essence += 30;
    if (has('gale') && c.el === 'air') power += 3;
    if (has('odd_owl') && c.v % 2 === 1) power += 2;
    if (c.ench === 'radiant') power *= 1.5;
  }
  if (has('ember') && cards.some((c) => c.el === 'fire' && !dead(c))) power += 5;
  if (has('ley_seeker') && (spell === 'ley' || spell === 'grand')) power += 12;
  if (has('purist') && (spell === 'pure' || spell === 'grand')) power += 10;
  if (has('clover')) power += 1 + Math.floor(rng() * 12);
  if (has('hoarder')) power += Math.floor(run.sparks / 2);
  const values = new Map<number, number>();
  for (const c of cards) values.set(c.v, (values.get(c.v) ?? 0) + 1);
  if (has('twin_moons') && [...values.values()].some((n) => n >= 2)) power *= 2;
  if (has('last_light') && run.casts === 1) power *= 3;
  if (has('wizard_hat')) power *= 1.5;
  power = Math.round(power * 10) / 10;
  return { spell, scoring, essence, power, total: Math.floor(essence * power) };
}

/** Cast the selected cards. Returns the result, or a reason it can't be cast. */
export function cast(run: Run, ids: number[], rng: Rng = Math.random): Cast | string {
  if (run.phase !== 'play') return 'Not now';
  const cards = run.hand.filter((c) => ids.includes(c.id));
  if (!cards.length) return 'Pick 1 to 5 cards';
  if (cards.length > MAX_PLAY) return `At most ${MAX_PLAY} cards`;
  if (run.casts <= 0) return 'No casts left';
  const result = scoreSpell(run, cards, rng);
  run.score += result.total;
  run.casts -= 1;
  if (!run.best || result.total > run.best.total) run.best = { spell: result.spell, total: result.total };
  run.hand = run.hand.filter((c) => !ids.includes(c.id));
  draw(run);
  if (run.score >= WARD_TARGETS[run.ward]) wardCleared(run);
  else if (run.casts <= 0) run.phase = 'lost';
  return result;
}

/** Swap the selected cards for new ones. */
export function redraw(run: Run, ids: number[]): string | null {
  if (run.phase !== 'play') return 'Not now';
  if (run.redraws <= 0) return 'No redraws left';
  if (!ids.length || ids.length > MAX_PLAY) return `Pick 1 to ${MAX_PLAY} cards to swap`;
  run.hand = run.hand.filter((c) => !ids.includes(c.id));
  run.redraws -= 1;
  draw(run);
  return null;
}

/** Sparks earned for a ward: 3, +1 per cast left, +1 per 5 sparks saved (up to +5), +2 with the Sparkler. */
export function wardSparks(run: Run): number {
  return 3 + run.casts + Math.min(5, Math.floor(run.sparks / 5)) + (run.charms.includes('sparkler') ? 2 : 0);
}

function wardCleared(run: Run) {
  run.sparks += wardSparks(run);
  if (run.ward >= WARDS - 1) { run.phase = 'won'; return; }
  run.phase = 'shop';
  run.shop.rerollCost = 2;
  stockShop(run, Math.random);
}

export function stockShop(run: Run, rng: Rng) {
  const charms = shuffle(CHARMS.map((c) => c.id).filter((id) => !run.charms.includes(id)), rng).slice(0, 3);
  const scrolls = shuffle(SCROLLS.map((s) => s.id), rng).slice(0, 2);
  run.shop.charms = charms;
  run.shop.scrolls = scrolls;
}

export function buyCharm(run: Run, id: CharmId): string | null {
  if (run.phase !== 'shop' || !run.shop.charms.includes(id)) return 'Not for sale';
  if (run.charms.length >= MAX_CHARMS) return `You can carry ${MAX_CHARMS} charms — sell one first`;
  if (run.sparks < CHARM_MAP[id].cost) return 'Not enough sparks';
  run.sparks -= CHARM_MAP[id].cost;
  run.charms.push(id);
  run.shop.charms = run.shop.charms.filter((c) => c !== id);
  return null;
}
export const sellPrice = (id: CharmId) => Math.floor(CHARM_MAP[id].cost / 2);
export function sellCharm(run: Run, id: CharmId): void {
  if (!run.charms.includes(id)) return;
  run.charms = run.charms.filter((c) => c !== id);
  run.sparks += sellPrice(id);
}
export function buyScroll(run: Run, id: ScrollId): string | null {
  if (run.phase !== 'shop' || !run.shop.scrolls.includes(id)) return 'Not for sale';
  if (run.scrolls.length >= MAX_SCROLLS) return `You can carry ${MAX_SCROLLS} scrolls`;
  if (run.sparks < SCROLL_MAP[id].cost) return 'Not enough sparks';
  run.sparks -= SCROLL_MAP[id].cost;
  run.scrolls.push(id);
  run.shop.scrolls = run.shop.scrolls.filter((s) => s !== id);
  return null;
}
export function rerollShop(run: Run, rng: Rng = Math.random): string | null {
  if (run.phase !== 'shop') return 'Not now';
  if (run.sparks < run.shop.rerollCost) return 'Not enough sparks';
  run.sparks -= run.shop.rerollCost;
  run.shop.rerollCost += 1;
  stockShop(run, rng);
  return null;
}
export function nextWard(run: Run, rng: Rng = Math.random): void {
  if (run.phase !== 'shop') return;
  run.ward += 1;
  startWard(run, rng);
}

/** Read a scroll on the selected hand cards. The change also applies to that card in your deck for the rest of the run. */
export function readScrollOn(run: Run, index: number, ids: number[]): string | null {
  const id = run.scrolls[index];
  if (!id || run.phase !== 'play') return 'Not now';
  const def = SCROLL_MAP[id];
  if (!ids.length) return 'Pick the cards first';
  if (ids.length > def.max) return `${def.name} works on up to ${def.max} card${def.max > 1 ? 's' : ''}`;
  const picked = ids.map((cid) => run.hand.find((c) => c.id === cid)!).filter(Boolean);
  const change = (c: Card) => {
    if (id === 'gild') c.ench = 'gilded';
    if (id === 'charge') c.ench = 'charged';
    if (id === 'radiance') c.ench = 'radiant';
    if (id === 'attune') c.el = picked[0].el;
    if (id === 'uplift') c.v = Math.min(10, c.v + 1);
  };
  for (const c of picked) {
    change(c);
    const inDeck = run.deck.find((d) => d.id === c.id);
    if (inDeck) { inDeck.el = c.el; inDeck.v = c.v; inDeck.ench = c.ench; }
  }
  run.scrolls.splice(index, 1);
  return null;
}

// ---------- XP ----------
/** XP for beating ward `w` (0–5) at your Enhancing level. Deeper wards give more; the last one doubles. */
export function wardXp(enhancingLevel: number, w: number): { enhancing: number; magic: number } {
  const perSecond = gatherXpPerHour(tierForLevel(enhancingLevel)) / 3600;
  const enhancing = Math.max(1, Math.round(perSecond * 70 * 3 * (1 + 0.25 * w) * (w === WARDS - 1 ? 2 : 1)));
  return { enhancing, magic: Math.max(1, Math.round(enhancing / 2)) };
}
