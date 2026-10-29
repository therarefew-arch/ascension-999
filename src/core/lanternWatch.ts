// 🏮 Lantern Watch — a survivor mode (Combat). Night falls on the town you're in; hold the lantern
// while that town's monsters pour out of the dark. Your attacks fire by themselves — you only steer.
// Every level-up pauses the night and offers 3 power-ups (new weapons, weapon upgrades, or passives).
// v0.0.1.36: 14 weapons + 14 passives, weapon evolutions (max a weapon + own its partner passive, then
// open a chest), 🕯️ candle stubs to spend at the Night Pedlar's cart (5:00) or on rerolls, monsters that
// charge and spit. Beating the dawn beast ends the night (the endless watch was removed in v0.0.1.37 —
// owner's choice). Being knocked out just ends the night — you keep everything you earned. This file is the whole game engine (no drawing), so it can be tested.
import { gatherXpPerHour, tierForLevel } from '../data/tiers';
import { MONSTERS, type MonsterDef } from '../data/monsters';

export type Style = 'melee' | 'ranged' | 'magic';
export const NIGHT_SECONDS = 600;
/** The Night Pedlar's cart rolls in at 5:00. */
export const CART_EVERY = 300;
const CART_STAYS = 75;

// ---------- Power-ups ----------
export type WeaponId = 'sword' | 'arrows' | 'bolt' | 'ring' | 'glow' | 'storm' | 'pet' | 'nova' | 'hatchet'
  | 'boomer' | 'flask' | 'gust' | 'spear' | 'wisp';
export type PassiveId = 'boots' | 'stew' | 'tonic' | 'hands' | 'magpie' | 'shield' | 'wide' | 'herbs' | 'clover'
  | 'feather' | 'cloak' | 'notes' | 'thorns' | 'purse';
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 6;
export const MAX_LEVEL = 5;

export interface WeaponDef { name: string; emoji: string; text: string; up: string; partner: PassiveId; evo: { name: string; emoji: string; text: string } }
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  sword: { name: 'Sword Sweep', emoji: '🗡️', text: 'Slashes a wide arc in front of you', up: 'Bigger, harder slashes', partner: 'tonic',
    evo: { name: 'Dawnblade', emoji: '⚔️', text: 'Slashes in every direction at once' } },
  arrows: { name: 'Arrow Volley', emoji: '🏹', text: 'Shoots the nearest monster', up: 'More arrows, more damage', partner: 'hands',
    evo: { name: 'Hailstorm Volley', emoji: '🎯', text: 'A storm of piercing arrows' } },
  bolt: { name: 'Spark Bolt', emoji: '✨', text: 'Homing sparks of magic', up: 'More sparks, more damage', partner: 'clover',
    evo: { name: 'Starfall', emoji: '🌠', text: 'Falling stars hunt the dark' } },
  ring: { name: 'Ember Ring', emoji: '🔥', text: 'Embers circle around you', up: 'One more ember, hotter', partner: 'wide',
    evo: { name: 'Sun Wheel', emoji: '☀️', text: 'A blazing wheel of embers' } },
  glow: { name: 'Lantern Glow', emoji: '🏮', text: 'Your light burns monsters close by', up: 'Wider, brighter light', partner: 'herbs',
    evo: { name: 'Hearthlight', emoji: '🕯️', text: 'A great warm light that also heals you' } },
  storm: { name: 'Storm Rune', emoji: '⚡', text: 'Lightning strikes monsters nearby', up: 'More strikes, more damage', partner: 'magpie',
    evo: { name: 'Thunderhead', emoji: '🌩️', text: 'A storm cloud that never stops striking' } },
  pet: { name: 'Loyal Companion', emoji: '🐾', text: 'Your pet pounces on monsters', up: 'Faster, fiercer pounces', partner: 'boots',
    evo: { name: 'Pack Leader', emoji: '🐺', text: 'Your companion becomes a whirlwind' } },
  nova: { name: 'Frost Nova', emoji: '❄️', text: 'A ring of frost that slows monsters', up: 'Wider ring, more damage', partner: 'shield',
    evo: { name: 'Glacier Heart', emoji: '🧊', text: 'Bitter frost, often and wide' } },
  hatchet: { name: 'Tumbling Hatchet', emoji: '🪓', text: 'Hatchets arc up and crash down', up: 'More hatchets, more damage', partner: 'stew',
    evo: { name: "Woodsman's Fury", emoji: '🌲', text: 'A rain of heavy hatchets' } },
  boomer: { name: 'Hunting Boomerang', emoji: '🪃', text: 'Flies out and comes back, hitting twice', up: 'More boomerangs, harder', partner: 'cloak',
    evo: { name: 'Moon Boomerang', emoji: '🌙', text: 'Silver crescents that sweep the field' } },
  flask: { name: 'Fire Flask', emoji: '🧪', text: 'Lobs flasks that leave burning puddles', up: 'Bigger, longer fires', partner: 'purse',
    evo: { name: "Dragon's Breath", emoji: '🐉', text: 'Great pools of dragonfire' } },
  gust: { name: 'Gale Feather', emoji: '🌬️', text: 'A gust that hurts and blows monsters back', up: 'Stronger, wider gusts', partner: 'feather',
    evo: { name: 'Tempest', emoji: '🌪️', text: 'A howling wind on every side' } },
  spear: { name: 'Tide Spear', emoji: '🔱', text: 'Thrusts straight through a line of monsters', up: 'Longer, harder thrusts', partner: 'thorns',
    evo: { name: 'Leviathan', emoji: '🐋', text: 'Three crashing spear-waves' } },
  wisp: { name: 'Will-o’-Wisps', emoji: '💫', text: 'Drifting lights that burst on monsters', up: 'More wisps, bigger bursts', partner: 'notes',
    evo: { name: 'Wisp Swarm', emoji: '🎆', text: 'A swarm of bursting lights' } },
};
export const PASSIVES: Record<PassiveId, { name: string; emoji: string; text: string }> = {
  boots: { name: 'Swift Boots', emoji: '🥾', text: '+8% move speed' },
  stew: { name: 'Hearty Stew', emoji: '🍲', text: '+20 max health (and heals 20)' },
  tonic: { name: 'Strength Tonic', emoji: '💪', text: '+10% damage' },
  hands: { name: 'Quick Hands', emoji: '⏱️', text: 'Weapons fire 7% more often' },
  magpie: { name: 'Magpie Charm', emoji: '🧲', text: '+30% reach for picking up light' },
  shield: { name: 'Sturdy Shield', emoji: '🛡️', text: 'Take 1 less damage per hit' },
  wide: { name: 'Wide Swing', emoji: '🌀', text: '+10% size for every attack' },
  herbs: { name: 'Healing Herbs', emoji: '🌿', text: 'Heal 0.4 health every second' },
  clover: { name: 'Lucky Clover', emoji: '🍀', text: '+6% chance of a double-damage hit' },
  feather: { name: 'Phoenix Feather', emoji: '🪶', text: 'Get back up once when knocked out (more health each level)' },
  cloak: { name: 'Shadow Cloak', emoji: '🧥', text: '+6% chance to dodge a hit' },
  notes: { name: "Scholar's Notes", emoji: '📜', text: '+10% light from every pickup' },
  thorns: { name: 'Thorn Mail', emoji: '🦔', text: 'Monsters that touch you get hurt' },
  purse: { name: 'Pedlar’s Purse', emoji: '👛', text: '+25% coins and candle stubs' },
};

export type Choice =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  | { kind: 'meal' } | { kind: 'coins' };

export type ShopOffer = { kind: 'power'; c: Choice; cost: number; sold?: boolean } | { kind: 'heal'; cost: number; sold?: boolean };

// ---------- The night ----------
export type Role = 'walk' | 'charge' | 'spit';
export interface Kind { name: string; emoji: string; hp: number; speed: number; dmg: number; r: number; unlockAt: number; light: number; role: Role }
export interface Enemy {
  id: number; k: number; x: number; y: number; hp: number; max: number; speed: number; dmg: number; r: number;
  elite?: boolean; boss?: boolean; slowUntil: number; flash: number; touchCd: number; ringCd: number; glowCd: number;
  poolCd?: number; actCd?: number; windUntil?: number; dashUntil?: number; dvx?: number; dvy?: number; kbx?: number; kby?: number;
}
export interface Shot {
  kind: 'arrow' | 'bolt' | 'hatchet' | 'boomer' | 'wisp'; x: number; y: number; vx: number; vy: number; dmg: number; r: number;
  pierce: number; life: number; hit: number[]; target?: number; src: WeaponId; ax?: number; ay?: number; turned?: boolean; burst?: number;
}
/** A monster's spit (dodge it!). */
export interface Foe { x: number; y: number; vx: number; vy: number; dmg: number; life: number; r: number }
export interface Pool { x: number; y: number; r: number; life: number; dmg: number; src: WeaponId }
export interface Pickup { x: number; y: number; kind: 'light' | 'meal' | 'magnet' | 'chest' | 'stub' | 'hourglass' | 'keg'; v: number; pulled?: boolean }
export interface Fx { kind: 'slash' | 'strike' | 'nova' | 'pounce' | 'boom' | 'gust' | 'thrust' | 'num' | 'revive'; x: number; y: number; a: number; r: number; t: number; life: number; v?: number }
export type LwEvent =
  | { type: 'hit'; boss?: boolean } | { type: 'kill'; elite?: boolean } | { type: 'hurt' } | { type: 'light' } | { type: 'dodge' }
  | { type: 'level' } | { type: 'meal' } | { type: 'chest' } | { type: 'boss' } | { type: 'won' } | { type: 'lost' } | { type: 'fire'; w: WeaponId }
  | { type: 'stub' } | { type: 'evolve'; w: WeaponId } | { type: 'cart' } | { type: 'shop' } | { type: 'revive' } | { type: 'spit' }
  | { type: 'freeze' } | { type: 'keg' } | { type: 'dash' };

export interface Run {
  t: number;
  /** 'dawn' only appears in nights saved by v0.0.1.36 (beast beaten, rewards not yet collected). */
  phase: 'play' | 'dawn' | 'won' | 'lost';
  region: string;
  kinds: Kind[];
  boss: Kind;
  bossSpawned: boolean;
  /** The great beast was beaten (a won night). */
  dawnWon: boolean;
  bossCount: number; nextBoss: number;
  px: number; py: number; face: number; moving: boolean;
  hp: number; maxHp: number; touchFlash: number; revived: boolean; shake: number;
  level: number; xp: number; need: number;
  /** Level-ups waiting to be picked (each one shows a choice of 3). */
  pending: number;
  choices: Choice[] | null;
  rerollCost: number;
  weapons: { id: WeaponId; level: number; cd: number; evo?: boolean }[];
  passives: { id: PassiveId; level: number }[];
  enemies: Enemy[]; shots: Shot[]; foes: Foe[]; pools: Pool[]; pickups: Pickup[]; fx: Fx[];
  pet: { x: number; y: number; cd: number; target: number | null; emoji: string };
  kills: number; coins: number; mealsFound: number;
  /** 🕯️ Candle stubs: spend them at the Night Pedlar's cart or on rerolls. Leftovers become coins. */
  stubs: number;
  cart: { x: number; y: number; until: number } | null;
  nextCart: number;
  shop: { offers: ShopOffer[]; reroll: number } | null;
  freezeUntil: number;
  dmgBy: Partial<Record<WeaponId, number>>;
  banner: { text: string; until: number } | null;
  spawnAcc: number; nextElite: number; nextRing: number;
  view: { w: number; h: number };
  head: { dmg: number; armor?: number };
  events: LwEvent[];
  nextId: number;
  rng: () => number;
}

const ART_EMOJI: Record<MonsterDef['art'], string> = {
  rat: '🐀', sprite: '🧚', bandit: '🥷', boar: '🐗', bear: '🐻', treant: '🌳', crab: '🦀', bird: '🦅', ghost: '👻',
  goat: '🐐', lizard: '🦎', tortoise: '🐢', wyrm: '🐉',
};

/** The monsters of a town, weakest first, plus its great beast for dawn. Some charge, some spit. */
export function nightMonsters(region: string): { kinds: Kind[]; boss: Kind } {
  const all = MONSTERS.filter((m) => m.region === region && !m.weekly);
  const mobs = all.filter((m) => !m.miniboss).sort((a, b) => a.level - b.level);
  const big = all.find((m) => m.miniboss) ?? mobs[mobs.length - 1];
  const list = mobs.length ? mobs : MONSTERS.filter((m) => m.region === 'Pocketvale' && !m.miniboss);
  const n = list.length;
  const kinds = list.map((m, k): Kind => ({
    name: m.name, emoji: ART_EMOJI[m.art] ?? '👾',
    hp: Math.round(10 * (1 + k * 0.9)), speed: 52 + (k % 2 ? 10 : 0) - k * 2, dmg: 6 + k * 3, r: 12 + k * 2,
    unlockAt: Math.round((k * 360) / Math.max(1, n - 1 || 1)) * (n > 1 ? 1 : 0), light: 1 + k,
    role: k === 0 ? 'walk' : k % 3 === 2 ? 'spit' : 'charge',
  }));
  const boss: Kind = { name: big.name, emoji: ART_EMOJI[big.art] ?? '👹', hp: 4200, speed: 44, dmg: 24, r: 36, unlockAt: NIGHT_SECONDS, light: 40, role: 'walk' };
  return { kinds, boss };
}

const START_WEAPON: Record<Style, WeaponId> = { melee: 'sword', ranged: 'arrows', magic: 'bolt' };
export const startWeapon = (s: Style) => START_WEAPON[s];

export interface LwInit { region: string; style: Style; styleLevel: number; healthLevel: number; petEmoji?: string; rng?: () => number }

export function newRun(o: LwInit): Run {
  const { kinds, boss } = nightMonsters(o.region);
  // A small head start from your real character (the night itself is the fun part).
  // Melee fighters stand in the crowd, so they're sturdier (more health, a little armour).
  const maxHp = 100 + Math.min(60, Math.floor(o.healthLevel / 5)) + (o.style === 'melee' ? 40 : 0);
  return {
    t: 0, phase: 'play', region: o.region, kinds, boss, bossSpawned: false, dawnWon: false,
    bossCount: 0, nextBoss: NIGHT_SECONDS,
    px: 0, py: 0, face: 0, moving: false, hp: maxHp, maxHp, touchFlash: 0, revived: false, shake: 0,
    level: 1, xp: 0, need: needFor(1), pending: 0, choices: null, rerollCost: 2,
    weapons: [{ id: START_WEAPON[o.style], level: 1, cd: 0.5 }], passives: [],
    enemies: [], shots: [], foes: [], pools: [], pickups: [], fx: [],
    pet: { x: 0, y: 0, cd: 0, target: null, emoji: o.petEmoji ?? '🐕' },
    kills: 0, coins: 0, mealsFound: 0, stubs: 0, cart: null, nextCart: CART_EVERY, shop: null, freezeUntil: 0,
    dmgBy: {}, banner: null,
    spawnAcc: 0, nextElite: 75, nextRing: 100,
    view: { w: 400, h: 720 }, head: { dmg: 1 + Math.min(0.25, o.styleLevel / 2000), armor: o.style === 'melee' ? 2 : 0 }, events: [], nextId: 1, rng: o.rng ?? Math.random,
  };
}

/** Light needed to go from `level` to the next. */
export const needFor = (level: number) => 4 + level * 2 + Math.floor(level ** 1.3);

// ---------- Saving a night (so you can leave and come back) ----------
export const SAVE_VERSION = 2;
export function saveRun(r: Run): string {
  const { rng: _rng, events: _events, ...rest } = r;
  return JSON.stringify({ v: SAVE_VERSION, run: rest });
}
export function loadRun(raw: string | null): Run | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (d?.v !== SAVE_VERSION || !d.run || (d.run.phase !== 'play' && d.run.phase !== 'dawn')) return null;
    const run = { ...d.run, rng: Math.random, events: [] } as Run & { endless?: boolean };
    // Nights from the old endless watch (v0.0.1.36) can only be collected now, not carried on.
    if (run.dawnWon || run.endless) run.phase = 'dawn';
    delete run.endless;
    return run;
  } catch { return null; }
}

// ---------- Derived stats ----------
const pl = (r: Run, id: PassiveId) => r.passives.find((p) => p.id === id)?.level ?? 0;
export function stats(r: Run) {
  return {
    dmg: r.head.dmg * (1 + 0.1 * pl(r, 'tonic')),
    cd: 1 - 0.07 * pl(r, 'hands'),
    area: 1 + 0.1 * pl(r, 'wide'),
    speed: 115 * (1 + 0.08 * pl(r, 'boots')),
    magnet: 55 * (1 + 0.3 * pl(r, 'magpie')),
    armor: pl(r, 'shield') + (r.head.armor ?? 0),
    regen: 0.4 * pl(r, 'herbs') + (r.weapons.some((w) => w.id === 'glow' && w.evo) ? 1 : 0),
    crit: 0.06 * pl(r, 'clover'),
    dodge: 0.06 * pl(r, 'cloak'),
    light: 1 + 0.1 * pl(r, 'notes'),
    thorns: 8 * pl(r, 'thorns'),
    purse: 1 + 0.25 * pl(r, 'purse'),
    feather: pl(r, 'feather'),
  };
}

// ---------- Level-ups ----------
/** A few different power-ups to choose from (new weapons, upgrades, passives). */
export function rollChoices(r: Run, count = 3): Choice[] {
  const pool: Choice[] = [];
  for (const w of r.weapons) if (w.level < MAX_LEVEL) pool.push({ kind: 'weapon', id: w.id, level: w.level + 1 });
  if (r.weapons.length < MAX_WEAPONS) {
    for (const id of Object.keys(WEAPONS) as WeaponId[]) if (!r.weapons.some((w) => w.id === id)) pool.push({ kind: 'weapon', id, level: 1 });
  }
  for (const p of r.passives) if (p.level < MAX_LEVEL) pool.push({ kind: 'passive', id: p.id, level: p.level + 1 });
  if (r.passives.length < MAX_PASSIVES) {
    for (const id of Object.keys(PASSIVES) as PassiveId[]) if (!r.passives.some((p) => p.id === id)) pool.push({ kind: 'passive', id, level: 1 });
  }
  const out: Choice[] = [];
  // Upgrades of what you already have show up a bit more often, and so do partners for your weapons.
  const partners = new Set(r.weapons.map((w) => WEAPONS[w.id].partner));
  const weight = (c: Choice) =>
    (c.kind === 'weapon' || c.kind === 'passive') && c.level > 1 ? 1.6 : c.kind === 'passive' && partners.has(c.id) ? 1.3 : 1;
  while (out.length < count && pool.length) {
    const total = pool.reduce((s, c) => s + weight(c), 0);
    let x = r.rng() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) { x -= weight(pool[i]); if (x <= 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  // Everything maxed out: a hot meal or a pouch of coins.
  if (out.length < count) out.push({ kind: 'meal' });
  if (out.length < count) out.push({ kind: 'coins' });
  return out;
}

function apply(r: Run, c: Choice) {
  if (c.kind === 'weapon') {
    const w = r.weapons.find((x) => x.id === c.id);
    if (w) w.level = Math.min(MAX_LEVEL, w.level + 1); else if (r.weapons.length < MAX_WEAPONS) r.weapons.push({ id: c.id, level: 1, cd: 0.2 });
  } else if (c.kind === 'passive') {
    const p = r.passives.find((x) => x.id === c.id);
    if (p) p.level = Math.min(MAX_LEVEL, p.level + 1); else if (r.passives.length < MAX_PASSIVES) r.passives.push({ id: c.id, level: 1 });
    if (c.id === 'stew') { r.maxHp += 20; r.hp = Math.min(r.maxHp, r.hp + 20); }
  } else if (c.kind === 'meal') {
    r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.3);
  } else {
    r.coins += 25 + r.level * 5;
  }
}

export function choose(r: Run, c: Choice) {
  if (!r.choices) return;
  apply(r, c);
  r.pending -= 1;
  r.choices = r.pending > 0 ? rollChoices(r) : null;
}

/** 🎲 Swap the 3 level-up choices for new ones (costs candle stubs, a little more each time). */
export function rerollChoices(r: Run): boolean {
  if (!r.choices || r.stubs < r.rerollCost) return false;
  r.stubs -= r.rerollCost;
  r.rerollCost += 1;
  r.choices = rollChoices(r);
  return true;
}

/** Can this weapon evolve now? (max level, not evolved, and you have its partner passive) */
export function canEvolve(r: Run, w: Run['weapons'][number]) {
  return w.level >= MAX_LEVEL && !w.evo && r.passives.some((p) => p.id === WEAPONS[w.id].partner);
}

// ---------- The Night Pedlar's cart ----------
function shopOffers(r: Run): ShopOffer[] {
  const powers = rollChoices(r, 3).map((c): ShopOffer => ({
    kind: 'power', c,
    cost: c.kind === 'weapon' ? (c.level === 1 ? 12 : 8) : c.kind === 'passive' ? (c.level === 1 ? 9 : 6) : 4,
  }));
  return [...powers, { kind: 'heal', cost: 8 }];
}
export function openShop(r: Run) {
  r.shop = { offers: shopOffers(r), reroll: 3 };
  r.cart = null;
  r.events.push({ type: 'shop' });
}
export function buyOffer(r: Run, i: number): boolean {
  const o = r.shop?.offers[i];
  if (!o || o.sold || r.stubs < o.cost) return false;
  r.stubs -= o.cost;
  o.sold = true;
  if (o.kind === 'heal') r.hp = r.maxHp; else apply(r, o.c);
  // Bought things can make other offers stale (e.g. a weapon that's now maxed): refresh their levels.
  if (r.shop) for (const x of r.shop.offers) {
    if (x.sold || x.kind !== 'power' || (x.c.kind !== 'weapon' && x.c.kind !== 'passive')) continue;
    const id = x.c.id;
    const have = x.c.kind === 'weapon' ? r.weapons.find((w) => w.id === id)?.level : r.passives.find((p) => p.id === id)?.level;
    if ((have ?? 0) >= MAX_LEVEL) x.sold = true; else x.c = { ...x.c, level: (have ?? 0) + 1 } as Choice;
  }
  return true;
}
export function rerollShop(r: Run): boolean {
  if (!r.shop || r.stubs < r.shop.reroll) return false;
  r.stubs -= r.shop.reroll;
  r.shop = { offers: shopOffers(r), reroll: r.shop.reroll + 2 };
  return true;
}
export function closeShop(r: Run) { r.shop = null; }


// ---------- The step ----------
export interface Input { dx: number; dy: number }
const dist2 = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;

function nearest(r: Run, x: number, y: number, maxD = Infinity, skip?: (e: Enemy) => boolean): Enemy | null {
  let best: Enemy | null = null;
  let bd = maxD * maxD;
  for (const e of r.enemies) {
    if (skip?.(e)) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function damage(r: Run, e: Enemy, amount: number, src: WeaponId | null) {
  if (e.hp <= 0) return;
  const s = stats(r);
  let dmg = amount * s.dmg;
  const crit = s.crit > 0 && r.rng() < s.crit;
  if (crit) dmg *= 2;
  e.hp -= dmg;
  e.flash = 0.12;
  if (src) r.dmgBy[src] = (r.dmgBy[src] ?? 0) + dmg;
  if ((crit || dmg >= 120) && r.fx.length < 160) r.fx.push({ kind: 'num', x: e.x, y: e.y - e.r, a: 0, r: 0, t: 0, life: 0.6, v: Math.round(dmg) });
  r.events.push({ type: 'hit', boss: e.boss });
}

/** How tough monsters are this far into the night. */
function toughness(r: Run) {
  const m = r.t / 60;
  return 1 + m * 0.25 + Math.max(0, m - 5) * 0.32 + Math.max(0, m - 10) * 0.6;
}

function spawnAt(r: Run, kind: Kind, k: number, angle: number, extra = 0, opts: { elite?: boolean; boss?: boolean } = {}) {
  const rad = Math.hypot(r.view.w, r.view.h) / 2 + 30 + extra;
  const minutes = r.t / 60;
  const scale = opts.boss ? 1.8 ** r.bossCount : toughness(r);
  const hp = Math.round(kind.hp * scale * (opts.elite ? 7 : 1));
  r.enemies.push({
    id: r.nextId++, k, x: r.px + Math.cos(angle) * rad, y: r.py + Math.sin(angle) * rad,
    hp, max: hp, speed: kind.speed * (opts.elite ? 0.85 : 1) * (0.9 + r.rng() * 0.2) * (1 + Math.min(0.35, minutes * 0.015)),
    dmg: (kind.dmg * (opts.elite ? 1.6 : 1) + Math.floor(minutes * 1.3)) * (opts.boss ? 1 + 0.3 * r.bossCount : 1),
    r: kind.r * (opts.elite ? 1.7 : 1), elite: opts.elite, boss: opts.boss, slowUntil: 0, flash: 0, touchCd: 0, ringCd: 0, glowCd: 0,
    actCd: 1.5 + r.rng() * 2,
  });
}

const MAX_ENEMIES = 240;

function spawning(r: Run, dt: number) {
  const minutes = r.t / 60;
  const open = r.kinds.map((k, i) => ({ k, i })).filter(({ k }) => r.t >= k.unlockAt);
  const bossAlive = r.enemies.some((e) => e.boss);
  // Steadily more monsters as the night goes on (a little calmer while a great beast is out).
  const rate = (1.0 + minutes * 0.8) * (bossAlive ? 0.6 : 1);
  r.spawnAcc += rate * dt;
  while (r.spawnAcc >= 1) {
    r.spawnAcc -= 1;
    if (r.enemies.length >= MAX_ENEMIES) break;
    // Newer monster kinds are commoner; the old ones still turn up.
    const pick = open[Math.min(open.length - 1, Math.floor(Math.sqrt(r.rng()) * open.length))];
    spawnAt(r, pick.k, pick.i, r.rng() * Math.PI * 2);
  }
  // A big one every 75 s — it carries a lantern chest (a free power-up, or an evolution).
  if (r.t >= r.nextElite) {
    r.nextElite += 75;
    const i = open.length - 1;
    spawnAt(r, open[i].k, open[i].i, r.rng() * Math.PI * 2, 0, { elite: true });
    if (minutes > 6) spawnAt(r, open[Math.max(0, i - 1)].k, open[Math.max(0, i - 1)].i, r.rng() * Math.PI * 2, 0, { elite: true });
  }
  // Every 100 s a ring of monsters closes in from all sides.
  if (r.t >= r.nextRing && !bossAlive) {
    r.nextRing += 100;
    const n = 20 + Math.floor(minutes * 2.5);
    const ringKind = open[Math.floor(r.rng() * Math.min(2, open.length))];
    for (let j = 0; j < n && r.enemies.length < MAX_ENEMIES + 40; j++) spawnAt(r, ringKind.k, ringKind.i, (j / n) * Math.PI * 2, 20);
  }
  // The Night Pedlar's cart: halfway through the night.
  if (r.t >= r.nextCart) {
    r.nextCart += CART_EVERY;
    if (r.t < NIGHT_SECONDS) {
      const a = r.rng() * Math.PI * 2;
      r.cart = { x: r.px + Math.cos(a) * 240, y: r.py + Math.sin(a) * 240, until: r.t + CART_STAYS };
      r.events.push({ type: 'cart' });
      r.banner = { text: '🛒 The Night Pedlar’s cart is nearby!', until: r.t + 3 };
    }
  }
  if (r.cart && r.t > r.cart.until) r.cart = null;
  // Dawn: the town's great beast.
  if (r.t >= r.nextBoss && !r.bossSpawned) {
    r.bossSpawned = true;
    spawnAt(r, r.boss, -1, r.rng() * Math.PI * 2, 0, { boss: true });
    r.events.push({ type: 'boss' });
    r.banner = { text: `🌅 Dawn — the ${r.boss.name} comes!`, until: r.t + 3 };
  }
}

/** Effective level of a weapon (evolved weapons hit like level 7). */
const eff = (w: { level: number; evo?: boolean }) => (w.evo ? 7 : w.level);
const evoMult = (w: { evo?: boolean }) => (w.evo ? 1.5 : 1);

function fireWeapons(r: Run, dt: number) {
  const s = stats(r);
  for (const w of r.weapons) {
    w.cd -= dt;
    if (w.cd > 0) continue;
    const L = eff(w), M = evoMult(w);
    if (w.id === 'sword') {
      w.cd = (L >= 5 ? 0.8 : 1.0) * s.cd;
      const reach = (68 + 8 * L) * s.area;
      const arcs = w.evo ? [0, 1, 2, 3].map((j) => r.face + (j * Math.PI) / 2) : L >= 3 ? [r.face, r.face + Math.PI] : [r.face];
      for (const a of arcs) {
        r.fx.push({ kind: 'slash', x: r.px, y: r.py, a, r: reach, t: 0, life: 0.22 });
        for (const e of r.enemies) {
          const d = Math.sqrt(dist2(r.px, r.py, e.x, e.y));
          if (d > reach + e.r) continue;
          let diff = Math.abs(Math.atan2(e.y - r.py, e.x - r.px) - a) % (Math.PI * 2);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < 1.0 + 0.1 * L || d < 24) damage(r, e, (10 + 4 * L) * M, 'sword');
        }
      }
    } else if (w.id === 'arrows') {
      w.cd = (L >= 5 ? 0.55 : 0.7) * s.cd;
      const n = 1 + (L >= 2 ? 1 : 0) + (L >= 4 ? 1 : 0) + (w.evo ? 2 : 0);
      const target = nearest(r, r.px, r.py, 520);
      const base = target ? Math.atan2(target.y - r.py, target.x - r.px) : r.face;
      for (let j = 0; j < n; j++) {
        const a = base + (j - (n - 1) / 2) * 0.16;
        r.shots.push({ kind: 'arrow', src: 'arrows', x: r.px, y: r.py, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, dmg: (12 + 5 * L) * M, r: 6 * s.area, pierce: L >= 3 ? 3 + (w.evo ? 3 : 0) : 2, life: 1.3, hit: [] });
      }
    } else if (w.id === 'bolt') {
      w.cd = 0.75 * s.cd;
      const n = 1 + (L >= 2 ? 1 : 0) + (L >= 4 ? 1 : 0) + (w.evo ? 2 : 0);
      for (let j = 0; j < n; j++) {
        const a = r.rng() * Math.PI * 2;
        const target = nearest(r, r.px, r.py, 600, (e) => r.shots.some((sh) => sh.target === e.id))?.id ?? nearest(r, r.px, r.py, 600)?.id;
        r.shots.push({ kind: 'bolt', src: 'bolt', x: r.px, y: r.py, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, dmg: (16 + 6 * L) * M, r: (L >= 5 ? 9 : 7) * s.area, pierce: w.evo ? 2 : 1, life: 2.4, hit: [], target });
      }
    } else if (w.id === 'storm') {
      w.cd = (2.4 - 0.15 * L) * s.cd * (w.evo ? 0.6 : 1);
      const n = 1 + Math.floor(L / 2);
      const near = r.enemies.filter((e) => Math.abs(e.x - r.px) < r.view.w / 2 && Math.abs(e.y - r.py) < r.view.h / 2);
      for (let j = 0; j < n && near.length; j++) {
        const e = near.splice(Math.floor(r.rng() * near.length), 1)[0];
        const rad = (34 + 4 * L) * s.area;
        r.fx.push({ kind: 'strike', x: e.x, y: e.y, a: 0, r: rad, t: 0, life: 0.3 });
        for (const o of r.enemies) if (dist2(o.x, o.y, e.x, e.y) < (rad + o.r) ** 2) damage(r, o, (22 + 8 * L) * M, 'storm');
      }
    } else if (w.id === 'nova') {
      w.cd = 4 * s.cd * (w.evo ? 0.6 : 1);
      const rad = (90 + 16 * L) * s.area;
      r.fx.push({ kind: 'nova', x: r.px, y: r.py, a: 0, r: rad, t: 0, life: 0.45 });
      for (const e of r.enemies) if (dist2(e.x, e.y, r.px, r.py) < (rad + e.r) ** 2) { damage(r, e, (6 + 4 * L) * M, 'nova'); e.slowUntil = r.t + 2 + 0.3 * L; }
    } else if (w.id === 'hatchet') {
      w.cd = 1.5 * s.cd;
      const n = 1 + (L >= 3 ? 1 : 0) + (L >= 5 ? 1 : 0) + (w.evo ? 2 : 0);
      for (let j = 0; j < n; j++) {
        const vx = (r.rng() - 0.5) * 240;
        r.shots.push({ kind: 'hatchet', src: 'hatchet', x: r.px, y: r.py, vx, vy: -360 - r.rng() * 80, dmg: (20 + 7 * L) * M, r: 12 * s.area * (w.evo ? 1.3 : 1), pierce: 99, life: 2.2, hit: [] });
      }
    } else if (w.id === 'boomer') {
      w.cd = 1.7 * s.cd;
      const n = 1 + (L >= 3 ? 1 : 0) + (L >= 5 ? 1 : 0) + (w.evo ? 1 : 0);
      const target = nearest(r, r.px, r.py, 420);
      const base = target ? Math.atan2(target.y - r.py, target.x - r.px) : r.face;
      for (let j = 0; j < n; j++) {
        const a = base + (j - (n - 1) / 2) * (w.evo ? 0.9 : 0.5);
        r.shots.push({ kind: 'boomer', src: 'boomer', x: r.px, y: r.py, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, ax: -Math.cos(a) * 420, ay: -Math.sin(a) * 420,
          dmg: (16 + 6 * L) * M, r: 13 * s.area * (w.evo ? 1.4 : 1), pierce: 99, life: 1.9, hit: [] });
      }
    } else if (w.id === 'flask') {
      w.cd = 2.6 * s.cd * (w.evo ? 0.75 : 1);
      const n = 1 + (L >= 4 ? 1 : 0) + (w.evo ? 1 : 0);
      const near = r.enemies.filter((e) => Math.abs(e.x - r.px) < r.view.w / 2 && Math.abs(e.y - r.py) < r.view.h / 2);
      for (let j = 0; j < n; j++) {
        const e = near.length ? near[Math.floor(r.rng() * near.length)] : null;
        const x = e ? e.x : r.px + (r.rng() - 0.5) * 200, y = e ? e.y : r.py + (r.rng() - 0.5) * 200;
        r.pools.push({ x, y, r: (40 + 6 * L) * s.area * (w.evo ? 1.4 : 1), life: 2.6 + 0.3 * L, dmg: (6 + 3 * L) * M, src: 'flask' });
      }
    } else if (w.id === 'gust') {
      w.cd = 2.2 * s.cd;
      const reach = (140 + 12 * L) * s.area;
      const dirs = w.evo ? [0, 1, 2, 3].map((j) => r.face + (j * Math.PI) / 2) : [r.face];
      for (const a of dirs) {
        r.fx.push({ kind: 'gust', x: r.px, y: r.py, a, r: reach, t: 0, life: 0.35 });
        for (const e of r.enemies) {
          const d = Math.sqrt(dist2(r.px, r.py, e.x, e.y));
          if (d > reach + e.r) continue;
          let diff = Math.abs(Math.atan2(e.y - r.py, e.x - r.px) - a) % (Math.PI * 2);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < 0.7) {
            damage(r, e, (10 + 5 * L) * M, 'gust');
            if (!e.boss) { const k = (90 + 18 * L) * (e.elite ? 0.4 : 1); e.kbx = (Math.cos(a) * k); e.kby = (Math.sin(a) * k); }
          }
        }
      }
    } else if (w.id === 'spear') {
      w.cd = (1.5 - 0.08 * L) * s.cd;
      const target = nearest(r, r.px, r.py, 400);
      const base = target ? Math.atan2(target.y - r.py, target.x - r.px) : r.face;
      const len = (150 + 20 * L) * s.area;
      const lines = w.evo ? [base - 0.35, base, base + 0.35] : [base];
      for (const a of lines) {
        r.fx.push({ kind: 'thrust', x: r.px, y: r.py, a, r: len, t: 0, life: 0.25 });
        const ux = Math.cos(a), uy = Math.sin(a);
        for (const e of r.enemies) {
          const qx = e.x - r.px, qy = e.y - r.py;
          const along = qx * ux + qy * uy;
          if (along < -10 || along > len + e.r) continue;
          if (Math.abs(qx * uy - qy * ux) < 14 * s.area + e.r) damage(r, e, (25 + 10 * L) * M, 'spear');
        }
      }
    } else if (w.id === 'wisp') {
      w.cd = 3.0 * s.cd * (w.evo ? 0.7 : 1);
      const n = 1 + Math.floor(L / 2) + (w.evo ? 2 : 0);
      for (let j = 0; j < n; j++) {
        const a = (j / n) * Math.PI * 2 + r.rng();
        r.shots.push({ kind: 'wisp', src: 'wisp', x: r.px, y: r.py, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, dmg: (18 + 7 * L) * M, r: 9 * s.area, pierce: 1, life: 4, hit: [], burst: (46 + 4 * L) * s.area });
      }
    } else {
      w.cd = 0.1; // ring / glow / pet: continuous, handled below
      continue;
    }
    r.events.push({ type: 'fire', w: w.id });
  }
}

function auras(r: Run, dt: number) {
  const s = stats(r);
  const ring = r.weapons.find((w) => w.id === 'ring');
  const glow = r.weapons.find((w) => w.id === 'glow');
  const pet = r.weapons.find((w) => w.id === 'pet');
  if (ring) {
    const L = eff(ring);
    const n = 1 + L + (ring.evo ? 2 : 0);
    const rad = (62 + 4 * L) * s.area;
    for (let j = 0; j < n; j++) {
      const a = r.t * (ring.evo ? 4 : 3) + (j / n) * Math.PI * 2;
      const ex = r.px + Math.cos(a) * rad, ey = r.py + Math.sin(a) * rad;
      for (const e of r.enemies) {
        if (e.ringCd > 0) continue;
        if (dist2(ex, ey, e.x, e.y) < (10 * s.area * (ring.evo ? 1.5 : 1) + e.r) ** 2) { damage(r, e, (8 + 3 * L) * evoMult(ring), 'ring'); e.ringCd = 0.5; }
      }
    }
  }
  if (glow) {
    const L = eff(glow);
    const rad = (58 + 12 * L) * s.area;
    for (const e of r.enemies) {
      if (e.glowCd > 0) continue;
      if (dist2(r.px, r.py, e.x, e.y) < (rad + e.r) ** 2) { damage(r, e, (3 + 1.5 * L) * evoMult(glow), 'glow'); e.glowCd = 0.5; }
    }
  }
  // Fire puddles burn whatever stands in them.
  for (const p of r.pools) {
    p.life -= dt;
    for (const e of r.enemies) {
      if ((e.poolCd ?? 0) > 0) continue;
      if (dist2(p.x, p.y, e.x, e.y) < (p.r + e.r * 0.5) ** 2) { damage(r, e, p.dmg, p.src); e.poolCd = 0.45; }
    }
  }
  r.pools = r.pools.filter((p) => p.life > 0);
  // The companion: runs to the nearest monster and pounces.
  const p = r.pet;
  if (pet) {
    const L = eff(pet);
    p.cd -= dt;
    const tgt = r.enemies.find((e) => e.id === p.target) ?? nearest(r, p.x, p.y, 380);
    p.target = tgt?.id ?? null;
    const tx = tgt ? tgt.x : r.px + 28, ty = tgt ? tgt.y : r.py + 18;
    const d = Math.sqrt(dist2(p.x, p.y, tx, ty)) || 1;
    const sp = 230 + 25 * L;
    if (d > 4) { p.x += ((tx - p.x) / d) * Math.min(d, sp * dt); p.y += ((ty - p.y) / d) * Math.min(d, sp * dt); }
    if (tgt && d < tgt.r + 12 && p.cd <= 0) {
      p.cd = (0.75 - 0.06 * L) * s.cd;
      // Pack Leader: each pounce hits everything around the target.
      const rad = pet.evo ? 60 * s.area : 0;
      if (rad) { for (const o of r.enemies) if (dist2(o.x, o.y, tgt.x, tgt.y) < (rad + o.r) ** 2) damage(r, o, (14 + 6 * L) * 1.5, 'pet'); }
      else damage(r, tgt, 14 + 6 * L, 'pet');
      r.fx.push({ kind: 'pounce', x: tgt.x, y: tgt.y, a: 0, r: rad || 16, t: 0, life: 0.2 });
    }
  } else {
    p.x = r.px + 26; p.y = r.py + 16;
  }
}

function moveShots(r: Run, dt: number) {
  for (const sh of r.shots) {
    sh.life -= dt;
    if (sh.kind === 'bolt' || sh.kind === 'wisp') {
      const t = r.enemies.find((e) => e.id === sh.target) ?? nearest(r, sh.x, sh.y, sh.kind === 'wisp' ? 300 : 500);
      if (t) {
        sh.target = t.id;
        const a = Math.atan2(t.y - sh.y, t.x - sh.x);
        const sp = sh.kind === 'wisp' ? 190 : 420;
        sh.vx += (Math.cos(a) * sp - sh.vx) * Math.min(1, dt * (sh.kind === 'wisp' ? 2 : 4));
        sh.vy += (Math.sin(a) * sp - sh.vy) * Math.min(1, dt * (sh.kind === 'wisp' ? 2 : 4));
      }
    }
    if (sh.kind === 'hatchet') sh.vy += 520 * dt;
    if (sh.kind === 'boomer') {
      sh.vx += (sh.ax ?? 0) * dt; sh.vy += (sh.ay ?? 0) * dt;
      // On its way back it can hit everything a second time.
      if (!sh.turned && sh.vx * (sh.ax ?? 0) + sh.vy * (sh.ay ?? 0) > 0) { sh.turned = true; sh.hit = []; }
    }
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    for (const e of r.enemies) {
      if (sh.pierce <= 0) break;
      if (e.hp <= 0 || sh.hit.includes(e.id)) continue;
      if (dist2(sh.x, sh.y, e.x, e.y) < (sh.r + e.r) ** 2) {
        if (sh.burst) {
          r.fx.push({ kind: 'boom', x: sh.x, y: sh.y, a: 0, r: sh.burst, t: 0, life: 0.3 });
          for (const o of r.enemies) if (dist2(o.x, o.y, sh.x, sh.y) < (sh.burst + o.r) ** 2) damage(r, o, sh.dmg, sh.src);
          sh.pierce = 0;
          break;
        }
        damage(r, e, sh.dmg, sh.src);
        sh.hit.push(e.id);
        sh.pierce -= 1;
      }
    }
  }
  r.shots = r.shots.filter((sh) => sh.life > 0 && sh.pierce > 0);
}

function hurtPlayer(r: Run, amount: number, from?: Enemy) {
  const s = stats(r);
  if (s.dodge > 0 && r.rng() < s.dodge) { r.events.push({ type: 'dodge' }); return; }
  r.hp -= Math.max(1, amount - s.armor);
  r.touchFlash = 0.25;
  r.shake = Math.max(r.shake, 0.18);
  r.events.push({ type: 'hurt' });
  if (from && s.thorns) damage(r, from, s.thorns, null);
}

function moveEnemies(r: Run, dt: number) {
  const frozen = r.freezeUntil > r.t;
  const cell = 48;
  const grid = new Map<number, Enemy[]>();
  const key = (x: number, y: number) => (Math.floor(x / cell) + 4096) * 8192 + (Math.floor(y / cell) + 4096);
  for (const e of r.enemies) { const k = key(e.x, e.y); const b = grid.get(k); if (b) b.push(e); else grid.set(k, [e]); }
  const far = Math.hypot(r.view.w, r.view.h) * 0.85;
  for (const e of r.enemies) {
    e.flash = Math.max(0, e.flash - dt);
    e.touchCd = Math.max(0, e.touchCd - dt);
    e.ringCd = Math.max(0, e.ringCd - dt);
    e.glowCd = Math.max(0, e.glowCd - dt);
    e.poolCd = Math.max(0, (e.poolCd ?? 0) - dt);
    const dx = r.px - e.x, dy = r.py - e.y;
    const d = Math.hypot(dx, dy) || 1;
    // Wandered too far behind? It circles round to the front again.
    if (d > far && !e.boss) {
      const a = Math.atan2(r.py - e.y, r.px - e.x);
      e.x = r.px + Math.cos(a) * far * 0.7; e.y = r.py + Math.sin(a) * far * 0.7;
      continue;
    }
    if (frozen && !e.boss) continue;
    // Being blown back by a gust.
    if (e.kbx || e.kby) {
      e.x += (e.kbx ?? 0) * dt * 4; e.y += (e.kby ?? 0) * dt * 4;
      e.kbx = (e.kbx ?? 0) * (1 - Math.min(1, dt * 6)); e.kby = (e.kby ?? 0) * (1 - Math.min(1, dt * 6));
      if (Math.abs(e.kbx) + Math.abs(e.kby) < 4) { e.kbx = 0; e.kby = 0; }
    }
    const role: Role = e.boss ? 'walk' : r.kinds[e.k]?.role ?? 'walk';
    const slow = e.slowUntil > r.t ? 0.5 : 1;
    let speed = e.speed * slow;
    let mx = (dx / d) * speed, my = (dy / d) * speed;
    e.actCd = (e.actCd ?? 2) - dt;
    if ((e.windUntil ?? 0) > r.t) {
      // Winding up (it stops and trembles) — your cue to step aside.
      mx = 0; my = 0;
    } else if ((e.dashUntil ?? 0) > r.t) {
      // Charging: a fast straight rush in the direction it aimed.
      mx = e.dvx ?? 0; my = e.dvy ?? 0;
    } else if (role === 'charge' && e.actCd <= 0 && d < 280 && d > 60) {
      e.actCd = 3.4 + r.rng() * 1.5;
      e.windUntil = r.t + 0.45;
      e.dashUntil = r.t + 1.0;
      const sp = e.speed * 3.3 * slow;
      e.dvx = (dx / d) * sp; e.dvy = (dy / d) * sp;
      r.events.push({ type: 'dash' });
    } else if (role === 'spit') {
      // Spitters keep a little distance and lob slow shots at you.
      if (d < 170) { mx = -mx * 0.4; my = -my * 0.4; }
      if (e.actCd <= 0 && d < 330) {
        e.actCd = 2.6 + r.rng() * 1.2;
        const a = Math.atan2(dy, dx);
        r.foes.push({ x: e.x, y: e.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, dmg: e.dmg * 0.6, life: 3, r: 6 });
        r.events.push({ type: 'spit' });
      }
    }
    // Great beasts: a charge now and then, and a ring of spit.
    if (e.boss && e.actCd <= 0) {
      e.actCd = 3.6;
      const n = 10 + 2 * r.bossCount;
      for (let j = 0; j < n; j++) {
        const a = (j / n) * Math.PI * 2 + r.rng() * 0.3;
        r.foes.push({ x: e.x, y: e.y, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130, dmg: 14 + 4 * r.bossCount, life: 4, r: 8 });
      }
      r.events.push({ type: 'spit' });
      if (d < 360) { e.windUntil = r.t + 0.5; e.dashUntil = r.t + 1.2; e.dvx = (dx / d) * e.speed * 3; e.dvy = (dy / d) * e.speed * 3; }
    }
    // Gentle push away from neighbours so they don't all stack in one spot.
    const cx = Math.floor(e.x / cell), cy = Math.floor(e.y / cell);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const b = grid.get((cx + ox + 4096) * 8192 + (cy + oy + 4096));
      if (!b) continue;
      for (const o of b) {
        if (o === e) continue;
        const qx = e.x - o.x, qy = e.y - o.y;
        const q = qx * qx + qy * qy;
        const min = (e.r + o.r) * 0.8;
        if (q > 0.01 && q < min * min) { const m = Math.sqrt(q); mx += (qx / m) * 60; my += (qy / m) * 60; }
      }
    }
    e.x += mx * dt; e.y += my * dt;
    // Touching you hurts (each monster can only nip you so often).
    if (d < e.r + 13 && e.touchCd <= 0) {
      e.touchCd = 0.6;
      hurtPlayer(r, e.dmg, e);
    }
  }
  // Spit flies until it hits you or fizzles out.
  for (const f of r.foes) {
    f.life -= dt;
    if (frozen) continue;
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (dist2(f.x, f.y, r.px, r.py) < (f.r + 11) ** 2) { f.life = 0; hurtPlayer(r, f.dmg); }
  }
  r.foes = r.foes.filter((f) => f.life > 0);
}

function deaths(r: Run) {
  const alive: Enemy[] = [];
  const s = stats(r);
  for (const e of r.enemies) {
    if (e.hp > 0) { alive.push(e); continue; }
    r.kills += 1;
    r.events.push({ type: 'kill', elite: e.elite || e.boss });
    if (e.boss) {
      r.fx.push({ kind: 'boom', x: e.x, y: e.y, a: 0, r: 120, t: 0, life: 0.8 });
      r.shake = 0.5;
      r.pickups.push({ x: e.x, y: e.y, kind: 'stub', v: Math.round(15 * s.purse) });
      r.pickups.push({ x: e.x + 20, y: e.y, kind: 'chest', v: 1 });
      r.coins += Math.round((150 + 100 * r.bossCount) * s.purse);
      r.bossCount += 1;
      if (!r.dawnWon) {
        r.dawnWon = true;
        r.phase = 'won';
        r.foes = [];
        r.events.push({ type: 'won' });
      }
      continue;
    }
    const kind = r.kinds[e.k];
    r.pickups.push({ x: e.x, y: e.y, kind: 'light', v: (kind?.light ?? 1) * (e.elite ? 10 : 1) });
    if (e.elite) {
      r.pickups.push({ x: e.x + 14, y: e.y, kind: 'chest', v: 1 });
      r.pickups.push({ x: e.x - 14, y: e.y, kind: 'stub', v: Math.round(5 * s.purse) });
    } else {
      const roll = r.rng();
      if (roll < 0.03) r.pickups.push({ x: e.x, y: e.y, kind: 'stub', v: 1 });
      else if (roll < 0.036) r.pickups.push({ x: e.x, y: e.y, kind: 'meal', v: 30 });
      else if (roll < 0.0385) r.pickups.push({ x: e.x, y: e.y, kind: 'magnet', v: 0 });
      else if (roll < 0.0400) r.pickups.push({ x: e.x, y: e.y, kind: 'hourglass', v: 0 });
      else if (roll < 0.0415) r.pickups.push({ x: e.x, y: e.y, kind: 'keg', v: 0 });
    }
    if (r.rng() < 0.15 * s.purse) r.coins += 1;
  }
  r.enemies = alive;
  // Too many lights lying about? Fold the oldest together.
  const lights = r.pickups.filter((p) => p.kind === 'light');
  if (lights.length > 260) {
    const old = lights.slice(0, lights.length - 200);
    const sum = old.reduce((s2, p) => s2 + p.v, 0);
    r.pickups = r.pickups.filter((p) => !old.includes(p));
    r.pickups.push({ x: old[0].x, y: old[0].y, kind: 'light', v: sum });
  }
}

/** A lantern chest: evolves a weapon if one is ready, otherwise a free power-up. */
function openChest(r: Run) {
  const w = r.weapons.find((x) => canEvolve(r, x));
  if (w) {
    w.evo = true;
    w.cd = 0.2;
    const d = WEAPONS[w.id];
    r.banner = { text: `${d.evo.emoji} ${d.name} evolved into ${d.evo.name}!`, until: r.t + 3.5 };
    r.events.push({ type: 'evolve', w: w.id });
    return;
  }
  r.pending += 1;
  r.events.push({ type: 'chest' });
}

function gather(r: Run, dt: number) {
  const s = stats(r);
  const keep: Pickup[] = [];
  for (const p of r.pickups) {
    const d = Math.sqrt(dist2(p.x, p.y, r.px, r.py)) || 1;
    if (d < s.magnet || p.pulled) p.pulled = true;
    if (p.pulled) {
      const sp = 340 + (p.kind === 'light' ? 0 : 60);
      p.x += ((r.px - p.x) / d) * Math.min(d, sp * dt);
      p.y += ((r.py - p.y) / d) * Math.min(d, sp * dt);
    }
    if (d < 16) {
      if (p.kind === 'light') { r.xp += p.v * s.light; r.events.push({ type: 'light' }); }
      if (p.kind === 'meal') { r.hp = Math.min(r.maxHp, r.hp + p.v); r.mealsFound += 1; r.events.push({ type: 'meal' }); }
      if (p.kind === 'magnet') { for (const q of r.pickups) if (q.kind === 'light' || q.kind === 'stub') q.pulled = true; }
      if (p.kind === 'chest') openChest(r);
      if (p.kind === 'stub') { r.stubs += p.v; r.events.push({ type: 'stub' }); }
      if (p.kind === 'hourglass') { r.freezeUntil = r.t + 5; r.foes = []; r.events.push({ type: 'freeze' }); r.banner = { text: '⏳ Time stands still!', until: r.t + 2 }; }
      if (p.kind === 'keg') {
        // A powder keg: everything on screen gets a big bang.
        r.fx.push({ kind: 'boom', x: r.px, y: r.py, a: 0, r: Math.max(r.view.w, r.view.h) * 0.6, t: 0, life: 0.6 });
        for (const e of r.enemies) if (Math.abs(e.x - r.px) < r.view.w / 2 + 20 && Math.abs(e.y - r.py) < r.view.h / 2 + 20) damage(r, e, e.boss ? 200 : 9999, null);
        r.shake = 0.4;
        r.events.push({ type: 'keg' });
      }
      continue;
    }
    keep.push(p);
  }
  r.pickups = keep;
  while (r.xp >= r.need) {
    r.xp -= r.need;
    r.level += 1;
    r.need = needFor(r.level);
    r.pending += 1;
    r.events.push({ type: 'level' });
  }
  if (r.pending > 0 && !r.choices) r.choices = rollChoices(r);
}

/** Moves the night forward by `dt` seconds. Does nothing while a choice, the cart or dawn is open. */
export function step(r: Run, dt: number, input: Input) {
  if (r.phase !== 'play' || r.choices || r.shop) return;
  dt = Math.min(dt, 0.05);
  r.t += dt;
  const s = stats(r);
  const len = Math.hypot(input.dx, input.dy);
  r.moving = len > 0.1;
  if (r.moving) {
    const k = Math.min(1, len);
    r.px += (input.dx / len) * s.speed * k * dt;
    r.py += (input.dy / len) * s.speed * k * dt;
    r.face = Math.atan2(input.dy, input.dx);
  } else {
    const n = nearest(r, r.px, r.py, 200);
    if (n) r.face = Math.atan2(n.y - r.py, n.x - r.px);
  }
  r.hp = Math.min(r.maxHp, r.hp + s.regen * dt);
  r.touchFlash = Math.max(0, r.touchFlash - dt);
  r.shake = Math.max(0, r.shake - dt);
  if (r.banner && r.t > r.banner.until) r.banner = null;
  spawning(r, dt);
  fireWeapons(r, dt);
  auras(r, dt);
  moveShots(r, dt);
  moveEnemies(r, dt);
  deaths(r);
  if (r.phase !== 'play') return;
  gather(r, dt);
  // Walking up to the Night Pedlar's cart opens it.
  if (r.cart && dist2(r.cart.x, r.cart.y, r.px, r.py) < 34 ** 2) openShop(r);
  for (const f of r.fx) f.t += dt;
  r.fx = r.fx.filter((f) => f.t < f.life);
  if (r.hp <= 0 && r.phase === 'play') {
    // Phoenix Feather: get back up once, and the monsters around you are knocked away.
    if (s.feather && !r.revived) {
      r.revived = true;
      r.hp = r.maxHp * (0.3 + 0.1 * s.feather);
      r.foes = [];
      r.fx.push({ kind: 'revive', x: r.px, y: r.py, a: 0, r: 220, t: 0, life: 0.8 });
      for (const e of r.enemies) if (dist2(e.x, e.y, r.px, r.py) < 220 ** 2) { damage(r, e, e.boss ? 100 : 400, 'gust'); if (!e.boss) { const a = Math.atan2(e.y - r.py, e.x - r.px); e.kbx = Math.cos(a) * 160; e.kby = Math.sin(a) * 160; } }
      r.banner = { text: '🪶 The Phoenix Feather lifts you up!', until: r.t + 2.5 };
      r.events.push({ type: 'revive' });
      return;
    }
    r.hp = 0;
    r.phase = 'lost';
    r.events.push({ type: 'lost' });
  }
}

// ---------- Rewards ----------
/** Combat XP for a night: about the pace of your tier, a little more for kills, and a big dawn bonus. */
export function nightXp(styleLevel: number, seconds: number, kills: number, won: boolean) {
  const perSecond = gatherXpPerHour(tierForLevel(styleLevel)) / 3600;
  const secs = Math.max(0, Math.min(NIGHT_SECONDS + 180, seconds));
  const k = Math.max(0, Math.min(20000, kills));
  const style = Math.round(perSecond * (secs * 1.5 + k * 0.25) * (won ? 1.5 : 1));
  return { style, health: Math.round(style / 3), defense: Math.round(style / 4) };
}
export const runXp = (styleLevel: number, r: Run) => nightXp(styleLevel, r.t, r.kills, r.dawnWon);
/** How many of the town's monster loot rolls a night gives (one per 40 kills, up to 12). */
export const lootRolls = (kills: number) => Math.min(12, Math.floor(Math.max(0, kills) / 40));
/** Candle stubs left over at the end turn into coins. */
export const STUB_COINS = 5;
