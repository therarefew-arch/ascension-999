// 🎪 Pet Parade — a cozy auto-battler (in the spirit of Super Auto Pets). Each turn you get 10 coins of
// parade money, buy critters from the stall, feed them snacks, and line up 5 of them. Then your parade
// meets a rival's parade and they bump heads by themselves. 10 wins finishes the parade; 5 losses ends it.
// Three copies of a critter merge into a stronger one. Pets you've found in the main game join the stall
// as ⭐ champions with their own tricks. This file is the whole game engine (no drawing), so it can be tested.
// Parade money is only for this game — rewards are paid by `game.petParadeEnd` through the loot system.

export const TEAM_SIZE = 5;
export const WINS_NEEDED = 10;
export const LIVES = 5;
export const TURN_GOLD = 10;
export const PET_COST = 3;
export const FOOD_COST = 3;
export const REROLL_COST = 1;
const STAT_CAP = 50;
const MAX_TURNS = 30;

// ---------- Critters ----------
export type Trigger =
  | 'buy' | 'sell' | 'startTurn' | 'endTurn' | 'levelUp' | 'friendAte' | 'buyOther' // the stall
  | 'sob' | 'before' | 'hurt' | 'faint' | 'knockout' | 'aheadAttacks' | 'aheadFaints' // the parade
  | 'summoned'; // both: a friend joins (bought in the stall, or summoned in a parade)

export interface Kind {
  id: string; name: string; emoji: string; tier: number; atk: number; hp: number;
  /** What it does, for level L (1–3). */
  text: (L: number) => string;
  /** The real game pet this champion is (only in the stall once you own it). */
  champion?: string;
  /** Summoned only (never sold in the stall). */
  token?: boolean;
}

const K = (id: string, name: string, emoji: string, tier: number, atk: number, hp: number, text: (L: number) => string, champion?: string): Kind =>
  ({ id, name, emoji, tier, atk, hp, text, champion });
const T = (id: string, name: string, emoji: string): Kind => ({ id, name, emoji, tier: 1, atk: 1, hp: 1, text: () => 'Summoned.', token: true });

export const KINDS: Kind[] = [
  // Tier 1
  K('ant', 'Ant', '🐜', 1, 2, 1, (L) => `Faint: give a random friend +${2 * L}/+${L}.`),
  K('cricket', 'Cricket', '🦗', 1, 1, 2, (L) => `Faint: summon a ${L}/${L} Beetle.`),
  K('minnow', 'Minnow', '🐟', 1, 2, 2, (L) => `Level up: give all friends +${Math.max(1, L - 1)}/+${Math.max(1, L - 1)}.`),
  K('duck', 'Duck', '🦆', 1, 2, 3, (L) => `Sell: give the stall's critters +${L} health.`),
  K('frog', 'Frog', '🐸', 1, 2, 2, (L) => `Sell: give 2 random friends +${L} attack.`),
  K('pony', 'Pony', '🐴', 1, 2, 1, (L) => `Friend joins: give it +${L} attack until the next parade ends.`),
  K('sparrow', 'Sparrow', '🐦', 1, 2, 2, (L) => `Start of parade: peck ${L} random rival${L > 1 ? 's' : ''} for 1.`),
  // Tier 2
  K('puffer', 'Pufferfish', '🐡', 2, 3, 2, (L) => `Faint: prick ALL critters for ${2 * L}.`),
  K('peacock', 'Peacock', '🦚', 2, 2, 5, (L) => `Hurt: gain +${2 * L} attack (up to 3 times a parade).`),
  K('swan', 'Swan', '🦢', 2, 1, 3, (L) => `Start of turn: gain ${L} coin${L > 1 ? 's' : ''}.`),
  K('flamingo', 'Flamingo', '🦩', 2, 3, 2, (L) => `Faint: give the 2 friends behind +${L}/+${L}.`),
  K('spider', 'Spider', '🕷️', 2, 2, 2, (L) => `Faint: summon a random tier 3 critter as a 2/2 at level ${L}.`),
  // Tier 3
  K('sheep', 'Sheep', '🐑', 3, 2, 2, (L) => `Faint: summon two ${L + 1}/${L + 1} Rams.`),
  K('kangaroo', 'Kangaroo', '🦘', 3, 1, 2, (L) => `Friend ahead attacks: gain +${2 * L}/+${2 * L}.`),
  K('ox', 'Ox', '🐂', 3, 1, 3, (L) => `Friend ahead faints: gain 🧄 Garlic and +${2 * L} attack.`),
  K('dog', 'Dog', '🐕', 3, 2, 3, (L) => `Friend joins: gain +${L} attack or +${L} health.`),
  K('badger', 'Badger', '🦡', 3, 5, 3, (L) => `Faint: hit the critters next to it for ${L * 50}% of its attack.`),
  K('giraffe', 'Giraffe', '🦒', 3, 1, 3, (L) => `End turn: give ${L} friend${L > 1 ? 's' : ''} ahead +1/+1.`),
  // Tier 4
  K('bison', 'Bison', '🦬', 4, 4, 4, (L) => `End turn: if you have a level 3 friend, gain +${L}/+${L}.`),
  K('turtle', 'Turtle', '🐢', 4, 1, 2, (L) => `Faint: give ${L} friend${L > 1 ? 's' : ''} behind a 🍵 Tea shield.`),
  K('skunk', 'Skunk', '🦨', 4, 3, 5, (L) => `Start of parade: cut the healthiest rival's health by ${25 * L}%.`),
  K('llama', 'Llama', '🦙', 4, 3, 6, (L) => `End turn: if you have 4 or fewer critters, gain +${L}/+${2 * L}.`),
  K('deer', 'Deer', '🦌', 4, 1, 1, (L) => `Faint: summon a ${2 * L + 2}/${2 * L + 1} Boar with 🌶️ Chilli.`),
  // Tier 5
  K('cow', 'Cow', '🐄', 5, 4, 6, (L) => `Buy: fill the snack shelf with 2 free 🥛 Milks (+${L}/+${2 * L}).`),
  K('rhino', 'Rhino', '🦏', 5, 5, 8, (L) => `Knock out: hit the first rival for ${4 * L}.`),
  K('monkey', 'Monkey', '🐒', 5, 1, 2, (L) => `End turn: give the front friend +${L}/+${2 * L}.`),
  K('turkey', 'Turkey', '🦃', 5, 3, 4, (L) => `Friend summoned in a parade: give it +${3 * L}/+${3 * L}.`),
  K('croc', 'Crocodile', '🐊', 5, 8, 4, (L) => `Start of parade: snap the last rival for ${8 * L}.`),
  // Tier 6
  K('mammoth', 'Mammoth', '🦣', 6, 3, 10, (L) => `Faint: give all friends +${2 * L}/+${2 * L}.`),
  K('snake', 'Snake', '🐍', 6, 6, 6, (L) => `Friend ahead attacks: hit a random rival for ${5 * L}.`),
  K('gorilla', 'Gorilla', '🦍', 6, 6, 9, (L) => `Hurt: gain a 🍵 Tea shield (${L} time${L > 1 ? 's' : ''} a parade).`),
  K('dragon', 'Dragon', '🐲', 6, 6, 8, (L) => `Buy a tier 1 critter: give all friends +1/+1 (${L} time${L > 1 ? 's' : ''} a turn).`),
  K('leopard', 'Leopard', '🐆', 6, 10, 4, (L) => `Start of parade: pounce on ${L} random rival${L > 1 ? 's' : ''} for 40% of its attack.`),

  // ⭐ Champions: your own pets from the main game (only in the stall once you've found them).
  K('c_pebbles', 'Pebbles', '🐹', 1, 2, 2, (L) => `Sell: gain ${L} extra coin${L > 1 ? 's' : ''}.`, 'pet_pebbles'),
  K('c_whittle', 'Whittle', '🦫', 1, 3, 2, (L) => `Sell: give 2 random friends +${L} health.`, 'pet_whittle'),
  K('c_shelly', 'Shelly', '🐌', 1, 1, 4, (L) => `Buy: if you lost the last parade, give all friends +${L}/+${L}.`, 'pet_shelly'),
  K('c_sprout', 'Sprout', '🌱', 1, 1, 2, (L) => `End turn: grow +${L} health.`, 'pet_sprout'),
  K('c_acorn', 'Acorn', '🐿️', 1, 2, 3, (L) => `Start of turn: put a free 🌰 Acorn (+${L}/+${L}) on the snack shelf.`, 'pet_acorn'),
  K('c_sparky', 'Sparky', '🦔', 2, 3, 3, (L) => `Start of parade: give the friend ahead +${2 * L} attack (forge-warmed).`, 'pet_sparky'),
  K('c_splash', 'Splash', '🦦', 2, 2, 4, (L) => `Buy: give ${L} random friend${L > 1 ? 's' : ''} +1/+1.`, 'pet_splash'),
  K('c_muffin', 'Muffin', '🐭', 2, 2, 3, (L) => `Friend eats a snack: give it +${Math.ceil(L / 2)}/+${Math.ceil(L / 2)} more.`, 'pet_muffin'),
  K('c_peep', 'Peep', '🐥', 2, 2, 2, (L) => `End turn: give the friend behind +${L}/+${L}.`, 'pet_peep'),
  K('c_petal', 'Petal', '🐇', 2, 2, 3, (L) => `End turn: give 2 random friends +${L} health.`, 'pet_petal'),
  K('c_ember', 'Ember', '🦊', 3, 3, 3, (L) => `Before attack: flick a spark at a random rival for ${2 * L}.`, 'pet_ember'),
  K('c_twinkle', 'Twinkle', '🐱', 3, 3, 4, (L) => `End turn: if you kept 2+ coins, gain +${L}/+${L}.`, 'pet_twinkle'),
  K('c_bumble', 'Bumble', '🐝', 3, 2, 4, (L) => `Faint: give all friends +${2 * L} health.`, 'pet_bumble'),
  K('c_pinch', 'Pinch', '🦀', 3, 3, 2, (L) => `Start of parade: gain ${25 * L}% of the healthiest friend's health.`, 'pet_pinch'),
  K('c_glimmer', 'Glimmer', '🐞', 3, 2, 3, (L) => `Start of parade: hit the weakest rival for ${2 * L}.`, 'pet_glimmer'),
  K('c_confetti', 'Confetti', '🐩', 3, 3, 3, (L) => `Buy: give all friends +${L} attack.`, 'pet_confetti'),
  K('c_glyph', 'Glyph', '🦉', 4, 4, 5, (L) => `Start of parade: give all friends +${L} attack.`, 'pet_glyph'),
  K('c_wick', 'Wick', '🕯️', 4, 3, 4, (L) => `Faint: give the friends ahead and behind +${2 * L}/+${2 * L}.`, 'pet_wick'),
  K('c_lumen', 'Lumen', '🦋', 4, 2, 5, (L) => `Start of parade: light up the friend behind: +${3 * L} attack.`, 'pet_lumen'),
  K('c_gourdie', 'Gourdie', '🎃', 4, 3, 5, (L) => `Faint: summon a ${2 * L + 1}/${2 * L + 1} Little Pumpkin.`, 'pet_gourdie'),
  K('c_lookout', 'Lookout', '🦅', 4, 4, 4, (L) => `Start of parade: dive at the last rival for ${4 * L}.`, 'pet_lookout'),
  K('c_bramble', 'Bramble', '🐻', 5, 6, 6, (L) => `Knock out: gain +${2 * L}/+${2 * L}.`, 'pet_bramble'),
  K('c_mote', 'Mote', '🌙', 5, 3, 6, (L) => `Start of parade: give the ${Math.min(2, L)} front friend${L > 1 ? 's' : ''} a 🍵 Tea shield.`, 'pet_mote'),
  K('c_flurry', 'Flurry', '⛄', 5, 4, 7, (L) => `Start of parade: chill the front rival: −${2 * L} attack.`, 'pet_flurry'),
  K('c_kindle', 'Kindle', '🐉', 6, 5, 6, (L) => `Start of parade: breathe fire on ALL rivals for ${L + 1}.`, 'pet_kindle'),
  K('c_snowdrop', 'Snowdrop', '🐻‍❄️', 5, 3, 6, (L) => `Start of parade: tuck everyone in — all friends get +${Math.min(2, L)} health.`, 'pet_snowdrop'),
  K('c_nib', 'Nib', '🦇', 5, 5, 4, (L) => `Faint: an echo! Hit the 2 front rivals for ${3 * L}.`, 'pet_nib'),
  K('c_nova', 'Nova', '🌠', 6, 5, 6, (L) => `Start of parade: give a random friend +${2 * L}/+${2 * L}.`, 'pet_nova'),
  K('c_cirrus', 'Cirrus', '🕊️', 5, 4, 6, (L) => `Before attack: lift the friend behind: +${L}/+${L}.`, 'pet_cirrus'),
  K('c_pip', 'Pip', '🦕', 6, 4, 9, (L) => `Faint: give the friend behind +${L} attack and +${3 * L} health.`, 'pet_pip'),
  K('c_wishling', 'Wishling', '⭐', 6, 5, 7, (L) => `Start of parade: light the way — the front friend gets +${L} attack and +${2 * L} health.`, 'pet_wishling'),

  // Summoned helpers
  T('beetle', 'Beetle', '🪲'), T('ram', 'Ram', '🐏'), T('boar', 'Boar', '🐗'), T('bee', 'Bee', '🐝'), T('pumpkin', 'Little Pumpkin', '🎃'),
];
export const KIND: Record<string, Kind> = Object.fromEntries(KINDS.map((k) => [k.id, k]));

// ---------- Snacks ----------
export type PerkId = 'honey' | 'meat' | 'garlic' | 'chilli' | 'tea' | 'mushroom';
export const PERKS: Record<PerkId, { emoji: string; name: string; text: string }> = {
  honey: { emoji: '🍯', name: 'Honey', text: 'Faint: summon a 1/1 Bee.' },
  meat: { emoji: '🍖', name: 'Meaty bone', text: 'Attacks hit 3 harder.' },
  garlic: { emoji: '🧄', name: 'Garlic', text: 'Takes 2 less damage (at least 1).' },
  chilli: { emoji: '🌶️', name: 'Chilli', text: 'Attacks also singe the rival behind for 5.' },
  tea: { emoji: '🍵', name: 'Tea shield', text: 'Blocks 20 damage once.' },
  mushroom: { emoji: '🍄', name: 'Lucky mushroom', text: 'Faint: come back as a 1/1.' },
};
export interface FoodDef { id: string; name: string; emoji: string; tier: number; text: string; perk?: PerkId; atk?: number; hp?: number; temp?: boolean; spread?: number; token?: boolean }
export const FOODS: FoodDef[] = [
  { id: 'apple', name: 'Apple', emoji: '🍎', tier: 1, text: '+1/+1.', atk: 1, hp: 1 },
  { id: 'honey', name: 'Honey', emoji: '🍯', tier: 1, text: PERKS.honey.text, perk: 'honey' },
  { id: 'candy', name: 'Toffee', emoji: '🍬', tier: 2, text: '+3/+3 until the next parade ends.', atk: 3, hp: 3, temp: true },
  { id: 'bread', name: 'Loaf', emoji: '🥖', tier: 2, text: 'Give 2 random critters +1/+1.', atk: 1, hp: 1, spread: 2 },
  { id: 'pie', name: 'Berry pie', emoji: '🥧', tier: 3, text: '+2/+2.', atk: 2, hp: 2 },
  { id: 'meat', name: 'Meaty bone', emoji: '🍖', tier: 3, text: PERKS.meat.text, perk: 'meat' },
  { id: 'garlic', name: 'Garlic', emoji: '🧄', tier: 3, text: PERKS.garlic.text, perk: 'garlic' },
  { id: 'chilli', name: 'Chilli', emoji: '🌶️', tier: 4, text: PERKS.chilli.text, perk: 'chilli' },
  { id: 'stew', name: 'Hearty stew', emoji: '🍲', tier: 5, text: 'Give 3 random critters +2/+2.', atk: 2, hp: 2, spread: 3 },
  { id: 'tea', name: 'Tea', emoji: '🍵', tier: 5, text: PERKS.tea.text, perk: 'tea' },
  { id: 'mushroom', name: 'Lucky mushroom', emoji: '🍄', tier: 6, text: PERKS.mushroom.text, perk: 'mushroom' },
  { id: 'milk', name: 'Milk', emoji: '🥛', tier: 9, text: 'A free treat.', token: true },
  { id: 'acorn', name: 'Acorn', emoji: '🌰', tier: 9, text: 'A free treat.', token: true },
];
export const FOOD: Record<string, FoodDef> = Object.fromEntries(FOODS.map((f) => [f.id, f]));

// ---------- State ----------
export interface Pet { uid: number; id: string; atk: number; hp: number; exp: number; perk: PerkId | null; tAtk: number; tHp: number; /** Ability uses this turn (Dragon). */ uses?: number }
export interface StallPet { id: string; atk: number; hp: number; frozen: boolean; bonus?: boolean }
export interface StallFood { id: string; atk: number; hp: number; cost: number; frozen: boolean }
export type Result = 'win' | 'loss' | 'draw';
export interface Run {
  v: number;
  turn: number; gold: number; lives: number; wins: number;
  team: (Pet | null)[];
  stall: { pets: (StallPet | null)[]; foods: (StallFood | null)[] };
  /** Health added to every critter that arrives in the stall (from Ducks). */
  stallHp: number;
  last: Result | null;
  phase: 'shop' | 'over';
  champions: string[];
  history: { turn: number; result: Result; rival: string }[];
  rs: number; nextUid: number;
  /** A rival's simulated parade (no battles, so no "last result"). */
  rival?: boolean;
}

export const level = (p: { exp: number }) => (p.exp >= 5 ? 3 : p.exp >= 2 ? 2 : 1);
/** How far through the current level (for the little pips): [have, need]. */
export const expPips = (p: { exp: number }): [number, number] => (p.exp >= 5 ? [0, 0] : p.exp >= 2 ? [p.exp - 2, 3] : [p.exp, 2]);
export const maxTier = (turn: number) => Math.min(6, Math.ceil(turn / 2));
const stallPetSlots = (turn: number) => (turn >= 9 ? 5 : turn >= 5 ? 4 : 3);
const stallFoodSlots = (turn: number) => (turn >= 3 ? 2 : 1);
export const sellValue = (p: Pet) => level(p);

/** A tiny seeded random (its state lives in the run, so a saved parade carries on the same). */
export function rand(r: { rs: number }) {
  r.rs = (r.rs + 0x6d2b79f5) | 0;
  let t = r.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <X>(r: { rs: number }, list: X[]): X => list[Math.floor(rand(r) * list.length)];
const cap = (n: number) => Math.max(0, Math.min(STAT_CAP, n));

export function newRun(o: { champions: string[]; seed?: number; rival?: boolean }): Run {
  const r: Run = {
    v: 1, turn: 1, gold: TURN_GOLD, lives: LIVES, wins: 0,
    team: Array(TEAM_SIZE).fill(null), stall: { pets: [], foods: [] }, stallHp: 0,
    last: null, phase: 'shop', champions: o.champions.filter((c) => KINDS.some((k) => k.champion === c)), history: [],
    rs: o.seed ?? Math.floor(Math.random() * 2 ** 31), nextUid: 1, rival: o.rival,
  };
  restock(r, false);
  return r;
}

/** Which critters can turn up in the stall right now. */
function stallPool(r: Run, tierCap = maxTier(r.turn)) {
  return KINDS.filter((k) => !k.token && k.tier <= tierCap && (!k.champion || r.champions.includes(k.champion)));
}
function rollStallPet(r: Run, tier?: number): StallPet {
  const pool = tier ? KINDS.filter((k) => !k.token && k.tier === tier && (!k.champion || r.champions.includes(k.champion))) : stallPool(r);
  const k = pick(r, pool.length ? pool : stallPool(r));
  return { id: k.id, atk: k.atk, hp: cap(k.hp + r.stallHp), frozen: false };
}
function rollStallFood(r: Run): StallFood {
  const f = pick(r, FOODS.filter((x) => !x.token && x.tier <= maxTier(r.turn)));
  return { id: f.id, atk: f.atk ?? 0, hp: f.hp ?? 0, cost: FOOD_COST, frozen: false };
}
/** New wares in the stall (frozen ones stay). */
function restock(r: Run, keepFrozen = true) {
  const pets = keepFrozen ? r.stall.pets.filter((p): p is StallPet => !!p && p.frozen) : [];
  const foods = keepFrozen ? r.stall.foods.filter((f): f is StallFood => !!f && f.frozen) : [];
  while (pets.length < stallPetSlots(r.turn)) pets.push(rollStallPet(r));
  while (foods.length < stallFoodSlots(r.turn)) foods.push(rollStallFood(r));
  r.stall = { pets, foods };
}

// ---------- Abilities ----------
/** What an ability can do. The stall and the parade each fill this in their own way. */
interface Api {
  inBattle: boolean;
  friends(self: Unit, includeSelf?: boolean): Unit[];
  ahead(self: Unit, n?: number): Unit[];
  behind(self: Unit, n?: number): Unit[];
  /** Permanent in the stall, for this parade only in a parade. */
  buff(u: Unit, atk: number, hp: number, temp?: boolean): void;
  givePerk(u: Unit, perk: PerkId): void;
  // Parade only (no-ops in the stall):
  rivals(self: Unit): Unit[];
  hit(target: Unit, n: number, src: Unit): void;
  summon(self: Unit, kindId: string, atk: number, hp: number, at: number, L?: number, perk?: PerkId | null): void;
  // Stall only (no-ops in a parade):
  gold(n: number): void;
  stallPets(): StallPet[];
  stockFood(f: StallFood, replace?: boolean): void;
  run?: Run;
  rng(): number;
  note(self: Unit, text: string): void;
}
/** A critter in the stall (Pet) or in a parade (Fighter) — the shared parts. */
interface Unit { uid: number; id: string; atk: number; hp: number; perk: PerkId | null; L?: number; exp?: number }
const lv = (u: Unit) => u.L ?? level(u as Pet);
type Ability = Partial<Record<Trigger, (api: Api, self: Unit, L: number, arg?: Unit) => void>>;
const randomOf = (api: Api, list: Unit[], n: number) => {
  const a = [...list];
  const out: Unit[] = [];
  while (a.length && out.length < n) out.push(a.splice(Math.floor(api.rng() * a.length), 1)[0]);
  return out;
};

const ABILITIES: Record<string, Ability> = {
  ant: { faint: (api, s, L) => { for (const f of randomOf(api, api.friends(s), 1)) api.buff(f, 2 * L, L); } },
  cricket: { faint: (api, s, L, at) => api.summon(s, 'beetle', L, L, posOf(at)) },
  minnow: { levelUp: (api, s, L) => { const n = Math.max(1, L - 1); for (const f of api.friends(s)) api.buff(f, n, n); } },
  duck: { sell: (api, _s, L) => { for (const p of api.stallPets()) p.hp = cap(p.hp + L); } },
  frog: { sell: (api, s, L) => { for (const f of randomOf(api, api.friends(s), 2)) api.buff(f, L, 0); } },
  pony: { summoned: (api, _s, L, f) => { if (f) api.buff(f, L, 0, true); } },
  sparrow: { sob: (api, s, L) => { for (let i = 0; i < L; i++) { const t = randomOf(api, api.rivals(s), 1)[0]; if (t) api.hit(t, 1, s); } } },
  puffer: { faint: (api, s, L) => { for (const u of [...api.friends(s), ...api.rivals(s)]) api.hit(u, 2 * L, s); } },
  peacock: { hurt: (api, s, L) => { const u = s as Fighter; if ((u.hurts ?? 0) < 3) { u.hurts = (u.hurts ?? 0) + 1; api.buff(s, 2 * L, 0); } } },
  swan: { startTurn: (api, _s, L) => api.gold(L) },
  flamingo: { faint: (api, s, L) => { for (const f of api.behind(s, 2)) api.buff(f, L, L); } },
  spider: { faint: (api, s, L, at) => { const t3 = KINDS.filter((k) => k.tier === 3 && !k.champion && !k.token); api.summon(s, t3[Math.floor(api.rng() * t3.length)].id, 2, 2, posOf(at), L); } },
  sheep: { faint: (api, s, L, at) => { api.summon(s, 'ram', L + 1, L + 1, posOf(at)); api.summon(s, 'ram', L + 1, L + 1, posOf(at)); } },
  kangaroo: { aheadAttacks: (api, s, L) => api.buff(s, 2 * L, 2 * L) },
  ox: { aheadFaints: (api, s, L) => { api.givePerk(s, 'garlic'); api.buff(s, 2 * L, 0); } },
  dog: { summoned: (api, s, L) => (api.rng() < 0.5 ? api.buff(s, L, 0) : api.buff(s, 0, L)) },
  badger: {
    faint: (api, s, L, at) => {
      const n = Math.max(1, Math.floor(s.atk * 0.5 * L));
      const near = [...api.ahead(s, 1), ...api.behind(s, 1)];
      if (posOf(at) === 0) near.push(...api.rivals(s).slice(0, 1));
      for (const u of near) api.hit(u, n, s);
    },
  },
  giraffe: { endTurn: (api, s, L) => { for (const f of api.ahead(s, L)) api.buff(f, 1, 1); } },
  bison: { endTurn: (api, s, L) => { if (api.friends(s).some((f) => lv(f) >= 3)) api.buff(s, L, L); } },
  turtle: { faint: (api, s, L) => { for (const f of api.behind(s, L)) api.givePerk(f, 'tea'); } },
  skunk: { sob: (api, s, L) => { const t = [...api.rivals(s)].sort((a, b) => b.hp - a.hp)[0]; if (t) api.hit(t, Math.max(1, Math.floor(t.hp * Math.min(0.75, 0.25 * L))), s); } },
  llama: { endTurn: (api, s, L) => { if (api.friends(s, true).length <= 4) api.buff(s, L, 2 * L); } },
  deer: { faint: (api, s, L, at) => api.summon(s, 'boar', 2 * L + 2, 2 * L + 1, posOf(at), 1, 'chilli') },
  cow: { buy: (api, _s, L) => { api.stockFood({ id: 'milk', atk: L, hp: 2 * L, cost: 0, frozen: false }, true); api.stockFood({ id: 'milk', atk: L, hp: 2 * L, cost: 0, frozen: false }); } },
  rhino: { knockout: (api, s, L) => { const t = api.rivals(s)[0]; if (t) api.hit(t, 4 * L, s); } },
  monkey: { endTurn: (api, s, L) => { const f = api.friends(s)[0]; if (f) api.buff(f, L, 2 * L); } },
  turkey: { summoned: (api, _s, L, f) => { if (f && api.inBattle) api.buff(f, 3 * L, 3 * L); } },
  croc: { sob: (api, s, L) => { const r = api.rivals(s); if (r.length) api.hit(r[r.length - 1], 8 * L, s); } },
  mammoth: { faint: (api, s, L) => { for (const f of api.friends(s)) api.buff(f, 2 * L, 2 * L); } },
  snake: { aheadAttacks: (api, s, L) => { const t = randomOf(api, api.rivals(s), 1)[0]; if (t) api.hit(t, 5 * L, s); } },
  gorilla: { hurt: (api, s, L) => { const u = s as Fighter; if ((u.hurts ?? 0) < L && u.perk !== 'tea') { u.hurts = (u.hurts ?? 0) + 1; api.givePerk(s, 'tea'); } } },
  // Only a few times a turn (buying and re-selling cheap critters used to pump the whole team endlessly).
  dragon: { buyOther: (api, s, L, f) => { const p = s as Pet; if (f && KIND[f.id]?.tier === 1 && (p.uses ?? 0) < L) { p.uses = (p.uses ?? 0) + 1; for (const x of api.friends(s)) api.buff(x, 1, 1); } } },
  leopard: { sob: (api, s, L) => { for (let i = 0; i < L; i++) { const t = randomOf(api, api.rivals(s), 1)[0]; if (t) api.hit(t, Math.max(1, Math.floor(s.atk * 0.4)), s); } } },
  // Champions
  c_pebbles: { sell: (api, _s, L) => api.gold(L) },
  c_whittle: { sell: (api, s, L) => { for (const f of randomOf(api, api.friends(s), 2)) api.buff(f, 0, L); } },
  c_shelly: { buy: (api, s, L) => { if (api.run?.last === 'loss') for (const f of api.friends(s)) api.buff(f, L, L); } },
  c_sprout: { endTurn: (api, s, L) => api.buff(s, 0, L) },
  c_acorn: { startTurn: (api, _s, L) => api.stockFood({ id: 'acorn', atk: L, hp: L, cost: 0, frozen: false }) },
  c_sparky: { sob: (api, s, L) => { for (const f of api.ahead(s, 1)) api.buff(f, 2 * L, 0); } },
  c_splash: { buy: (api, s, L) => { for (const f of randomOf(api, api.friends(s), L)) api.buff(f, 1, 1); } },
  c_muffin: { friendAte: (api, _s, L, f) => { const n = Math.ceil(L / 2); if (f) api.buff(f, n, n); } },
  c_peep: { endTurn: (api, s, L) => { for (const f of api.behind(s, 1)) api.buff(f, L, L); } },
  c_petal: { endTurn: (api, s, L) => { for (const f of randomOf(api, api.friends(s), 2)) api.buff(f, 0, L); } },
  c_ember: { before: (api, s, L) => { const t = randomOf(api, api.rivals(s), 1)[0]; if (t) api.hit(t, 2 * L, s); } },
  c_twinkle: { endTurn: (api, s, L) => { if ((api.run?.gold ?? 0) >= 2) api.buff(s, L, L); } },
  c_bumble: { faint: (api, s, L) => { for (const f of api.friends(s)) api.buff(f, 0, 2 * L); } },
  c_pinch: { sob: (api, s, L) => { const best = Math.max(0, ...api.friends(s).map((f) => f.hp)); api.buff(s, 0, Math.floor(best * 0.25 * L)); } },
  c_glimmer: { sob: (api, s, L) => { const t = [...api.rivals(s)].sort((a, b) => a.hp - b.hp)[0]; if (t) api.hit(t, 2 * L, s); } },
  c_confetti: { buy: (api, s, L) => { for (const f of api.friends(s)) api.buff(f, L, 0); } },
  c_glyph: { sob: (api, s, L) => { for (const f of api.friends(s)) api.buff(f, L, 0); } },
  c_wick: { faint: (api, s, L) => { for (const f of [...api.ahead(s, 1), ...api.behind(s, 1)]) api.buff(f, 2 * L, 2 * L); } },
  c_lumen: { sob: (api, s, L) => { for (const f of api.behind(s, 1)) api.buff(f, 3 * L, 0); } },
  c_gourdie: { faint: (api, s, L, at) => api.summon(s, 'pumpkin', 2 * L + 1, 2 * L + 1, posOf(at)) },
  c_lookout: { sob: (api, s, L) => { const r = api.rivals(s); if (r.length) api.hit(r[r.length - 1], 4 * L, s); } },
  c_bramble: { knockout: (api, s, L) => api.buff(s, 2 * L, 2 * L) },
  c_mote: { sob: (api, s, L) => { for (const f of api.friends(s, true).slice(0, Math.min(2, L))) api.givePerk(f, 'tea'); } },
  c_flurry: { sob: (api, s, L) => { const t = api.rivals(s)[0]; if (t) api.buff(t, -2 * L, 0); } },
  c_kindle: { sob: (api, s, L) => { for (const t of api.rivals(s)) api.hit(t, L + 1, s); } },
  c_snowdrop: { sob: (api, s, L) => { for (const f of api.friends(s, true)) api.buff(f, 0, Math.min(2, L)); } },
  c_nib: { faint: (api, s, L) => { for (const t of api.rivals(s).slice(0, 2)) api.hit(t, 3 * L, s); } },
  c_nova: { sob: (api, s, L) => { const f = randomOf(api, api.friends(s), 1)[0]; if (f) api.buff(f, 2 * L, 2 * L); } },
  c_cirrus: { before: (api, s, L) => { for (const f of api.behind(s, 1)) api.buff(f, L, L); } },
  c_wishling: { sob: (api, s, L) => { const f = api.friends(s, true)[0]; if (f) api.buff(f, L, 2 * L); } },
  c_pip: { faint: (api, s, L) => { for (const f of api.behind(s, 1)) api.buff(f, L, 3 * L); } },
};
/** Faint abilities get told where the critter stood (so summons appear in its place). */
const posOf = (at: Unit | undefined) => (at as unknown as { i: number } | undefined)?.i ?? 0;
export const hasTrigger = (id: string, t: Trigger) => !!ABILITIES[id]?.[t];

// ---------- The stall (your turn) ----------
const teamPets = (r: Run) => r.team.filter((p): p is Pet => !!p);
function stallApi(r: Run): Api {
  const others = (self: Unit) => teamPets(r).filter((p) => p.uid !== self.uid);
  const idx = (self: Unit) => r.team.findIndex((p) => p?.uid === self.uid);
  return {
    inBattle: false, run: r,
    friends: (self, inc) => (inc ? teamPets(r) : others(self)),
    ahead: (self, n = 1) => r.team.slice(0, Math.max(0, idx(self))).filter((p): p is Pet => !!p).reverse().slice(0, n),
    behind: (self, n = 1) => r.team.slice(idx(self) + 1).filter((p): p is Pet => !!p).slice(0, n),
    buff: (u, a, h, temp) => {
      const p = u as Pet;
      if (temp) { p.tAtk += a; p.tHp += h; } else { p.atk = cap(p.atk + a); p.hp = cap(p.hp + h); }
    },
    givePerk: (u, perk) => { u.perk = perk; },
    rivals: () => [], hit: () => {}, summon: () => {},
    gold: (n) => { r.gold += n; },
    stallPets: () => r.stall.pets.filter((p): p is StallPet => !!p),
    stockFood: (f, replace) => {
      if (replace) r.stall.foods = r.stall.foods.filter((x) => x?.frozen);
      r.stall.foods.push(f);
      if (r.stall.foods.length > 3) r.stall.foods.splice(0, r.stall.foods.length - 3);
    },
    rng: () => rand(r),
    note: () => {},
  };
}
function fire(r: Run, p: Pet, t: Trigger, arg?: Unit) {
  const fn = ABILITIES[p.id]?.[t];
  if (fn) fn(stallApi(r), p, level(p), arg);
}
/** Every critter on the team, front to back, gets a chance at this trigger. */
function fireAll(r: Run, t: Trigger, arg?: Unit, except?: number) {
  for (const p of teamPets(r)) if (p.uid !== except && r.team.includes(p)) fire(r, p, t, arg);
}

function addExp(r: Run, p: Pet, exp: number, atk: number, hp: number) {
  const before = level(p);
  p.exp = Math.min(5, p.exp + exp);
  p.atk = cap(Math.max(p.atk, atk) + 1);
  p.hp = cap(Math.max(p.hp, hp) + 1);
  const after = level(p);
  if (after > before) {
    fire(r, p, 'levelUp');
    // A level-up brings a critter from the next tier to the stall.
    r.stall.pets.push({ ...rollStallPet(r, Math.min(6, maxTier(r.turn) + 1)), bonus: true });
    return true;
  }
  return false;
}

export type Act = { ok: true; levelUp?: boolean } | { ok: false; why: string };
const no = (why: string): Act => ({ ok: false, why });

/** Buy a critter from the stall onto a team spot (empty, or the same critter to merge). */
export function buyPet(r: Run, stallIdx: number, teamIdx: number): Act {
  const s = r.stall.pets[stallIdx];
  if (!s || r.phase !== 'shop') return no('Nothing there.');
  if (r.gold < PET_COST) return no(`You need ${PET_COST} coins.`);
  const here = r.team[teamIdx];
  if (here && (here.id !== s.id || level(here) >= 3)) return no(here.id === s.id ? 'Already at the top level.' : 'That spot is taken — pick an empty spot or the same critter.');
  r.gold -= PET_COST;
  r.stall.pets.splice(stallIdx, 1);
  let levelUp = false;
  if (here) {
    levelUp = addExp(r, here, 1, s.atk, s.hp);
    fire(r, here, 'buy');
    fireAll(r, 'buyOther', here, here.uid);
  } else {
    const p: Pet = { uid: r.nextUid++, id: s.id, atk: s.atk, hp: s.hp, exp: 0, perk: null, tAtk: 0, tHp: 0 };
    r.team[teamIdx] = p;
    fire(r, p, 'buy');
    fireAll(r, 'buyOther', p, p.uid);
    fireAll(r, 'summoned', p, p.uid);
  }
  return { ok: true, levelUp };
}

/** Swap two team spots (or move into an empty one). Dropping onto the same critter merges them. */
export function moveOrMerge(r: Run, from: number, to: number): Act {
  if (from === to) return { ok: true };
  const a = r.team[from], b = r.team[to];
  if (!a) return no('Nothing there.');
  if (b && b.id === a.id && level(a) < 3 && level(b) < 3) {
    r.team[from] = null;
    const levelUp = addExp(r, b, a.exp + 1, a.atk, a.hp);
    if (a.perk && !b.perk) b.perk = a.perk;
    return { ok: true, levelUp };
  }
  r.team[from] = b; r.team[to] = a;
  return { ok: true };
}

export function sellPet(r: Run, teamIdx: number): Act {
  const p = r.team[teamIdx];
  if (!p) return no('Nothing there.');
  fire(r, p, 'sell');
  r.team[teamIdx] = null;
  r.gold += sellValue(p);
  return { ok: true };
}

/** Feed a snack to a critter (some snacks spread themselves around). */
export function buyFood(r: Run, foodIdx: number, teamIdx: number): Act {
  const f = r.stall.foods[foodIdx];
  const p = r.team[teamIdx];
  if (!f || !p) return no('Pick a critter to feed.');
  if (r.gold < f.cost) return no(`You need ${f.cost} coins.`);
  const d = FOOD[f.id];
  r.gold -= f.cost;
  r.stall.foods.splice(foodIdx, 1);
  const api = stallApi(r);
  const fed: Pet[] = d.spread ? randomOf(api, teamPets(r), d.spread) as Pet[] : [p];
  for (const x of fed) {
    if (d.perk) x.perk = d.perk;
    if (d.temp) { x.tAtk += f.atk; x.tHp += f.hp; } else { x.atk = cap(x.atk + f.atk); x.hp = cap(x.hp + f.hp); }
    fireAll(r, 'friendAte', x, x.uid);
  }
  return { ok: true };
}

export function reroll(r: Run): Act {
  if (r.gold < REROLL_COST) return no(`You need ${REROLL_COST} coin.`);
  r.gold -= REROLL_COST;
  restock(r);
  return { ok: true };
}
export function toggleFreeze(r: Run, kind: 'pet' | 'food', idx: number) {
  const x = kind === 'pet' ? r.stall.pets[idx] : r.stall.foods[idx];
  if (x) x.frozen = !x.frozen;
}

// ---------- The parade (the battle) ----------
export interface Fighter extends Unit { side: 0 | 1; L: number; hurts?: number; dead?: boolean; killer?: Fighter | null; summoned?: boolean }
export interface FView { uid: number; id: string; atk: number; hp: number; perk: PerkId | null; L: number; dead?: boolean }
export interface Frame {
  a: FView[]; b: FView[];
  /** Short line under the parade ("🐦 Sparrow pecks!"). */
  text?: string;
  /** Who got hit this frame (and for how much), who acted, who fainted. */
  hits?: { uid: number; n: number }[];
  actor?: number;
  attack?: boolean;
}
export interface Battle { result: Result; frames: Frame[] }

export function battle(mine: (Pet | null)[], theirs: (Pet | null)[], seed: number): Battle {
  const st = { rs: seed };
  let uid = 10000;
  const toF = (p: Pet, side: 0 | 1): Fighter => ({
    uid: uid++, id: p.id, atk: cap(p.atk + p.tAtk), hp: cap(p.hp + p.tHp), perk: p.perk, side, L: level(p),
  });
  const A: Fighter[] = mine.filter((p): p is Pet => !!p).map((p) => toF(p, 0));
  const B: Fighter[] = theirs.filter((p): p is Pet => !!p).map((p) => toF(p, 1));
  const sides = [A, B];
  const frames: Frame[] = [];
  let hits: { uid: number; n: number }[] = [];
  const view = (f: Fighter): FView => ({ uid: f.uid, id: f.id, atk: f.atk, hp: Math.max(0, f.hp), perk: f.perk, L: f.L, dead: f.dead });
  const snap = (text?: string, extra: Partial<Frame> = {}) => {
    frames.push({ a: A.map(view), b: B.map(view), text, hits: hits.length ? hits : undefined, ...extra });
    hits = [];
  };
  const hurtQ: Fighter[] = [];
  const mineOf = (u: Unit) => sides[(u as Fighter).side];
  const api: Api = {
    inBattle: true,
    friends: (s, inc) => mineOf(s).filter((f) => !f.dead && (inc || f.uid !== s.uid)),
    ahead: (s, n = 1) => { const t = mineOf(s); const i = t.indexOf(s as Fighter); return t.slice(0, Math.max(0, i)).filter((f) => !f.dead).reverse().slice(0, n); },
    behind: (s, n = 1) => { const t = mineOf(s); const i = t.indexOf(s as Fighter); return (i < 0 ? [] : t.slice(i + 1)).filter((f) => !f.dead).slice(0, n); },
    buff: (u, a, h) => { u.atk = Math.max(1, cap(u.atk + a)); u.hp = cap(u.hp + h); },
    givePerk: (u, perk) => { u.perk = perk; },
    rivals: (s) => sides[1 - (s as Fighter).side].filter((f) => !f.dead),
    hit: (target, n, src) => damage(target as Fighter, n, src as Fighter),
    summon: (s, kindId, atk, hp, at, L = 1, perk = null) => {
      const team = mineOf(s);
      if (team.filter((f) => !f.dead).length >= TEAM_SIZE) return;
      const f: Fighter = { uid: uid++, id: kindId, atk: cap(atk), hp: cap(hp), perk, side: (s as Fighter).side, L, summoned: true };
      team.splice(Math.min(at, team.length), 0, f);
      snap(`${KIND[kindId].emoji} ${KIND[kindId].name} joins the parade!`, { actor: f.uid });
      for (const o of team) if (o !== f && !o.dead) trigger(o, 'summoned', f);
    },
    gold: () => {}, stallPets: () => [], stockFood: () => {},
    rng: () => rand(st),
    note: () => {},
  };
  function damage(t: Fighter, n: number, src: Fighter | null) {
    if (t.dead || n <= 0) return;
    if (t.perk === 'tea') { n = Math.max(0, n - 20); t.perk = null; }
    if (n > 0 && t.perk === 'garlic') n = Math.max(1, n - 2);
    if (n <= 0) { hits.push({ uid: t.uid, n: 0 }); return; }
    t.hp -= n;
    hits.push({ uid: t.uid, n });
    if (t.hp <= 0) { t.dead = true; t.killer = src; } else if (!hurtQ.includes(t)) hurtQ.push(t);
  }
  function trigger(f: Fighter, t: Trigger, arg?: Unit) {
    const fn = ABILITIES[f.id]?.[t];
    if (!fn) return;
    fn(api, f, f.L, arg);
    snap(`${KIND[f.id].emoji} ${KIND[f.id].name}: ${KIND[f.id].text(f.L)}`, { actor: f.uid });
  }
  /** Hurt abilities, then fainted critters leave (their faint abilities and perks go off), until things settle. */
  function settle() {
    for (let guard = 0; guard < 60; guard++) {
      const hq = hurtQ.splice(0);
      for (const f of hq) if (!f.dead) trigger(f, 'hurt');
      let any = false;
      for (const team of sides) {
        const i = team.findIndex((f) => f.dead);
        if (i < 0) continue;
        any = true;
        const f = team[i];
        // It stays in line (marked fainted) while its faint ability goes off, so "behind" and "ahead" still work;
        // summons step into its place.
        const next = team.slice(i + 1).find((x) => !x.dead);
        snap(`${KIND[f.id].emoji} ${KIND[f.id].name} faints.`);
        const at = { i } as unknown as Unit;
        const fn = ABILITIES[f.id]?.faint;
        if (fn) { fn(api, f, f.L, at); snap(`${KIND[f.id].emoji} ${KIND[f.id].name}: ${KIND[f.id].text(f.L)}`); }
        if (f.perk === 'honey') api.summon(f, 'bee', 1, 1, i);
        if (f.perk === 'mushroom') api.summon(f, f.id, 1, 1, i, f.L);
        team.splice(team.indexOf(f), 1);
        if (next && !next.dead) trigger(next, 'aheadFaints');
        const k = f.killer;
        if (k && !k.dead && k.side !== f.side && sides[k.side].includes(k)) trigger(k, 'knockout');
        break;
      }
      if (!any && !hurtQ.length) return;
    }
  }

  snap('The parades line up…');
  // Start of the parade: the strongest go first.
  const order = [...A, ...B].sort((x, y) => y.atk - x.atk || x.side - y.side);
  for (const f of order) if (!f.dead && sides[f.side].includes(f)) trigger(f, 'sob');
  settle();

  for (let round = 0; round < 80 && A.length && B.length; round++) {
    const fa = A[0], fb = B[0];
    trigger(fa, 'before');
    if (!fb.dead) trigger(fb, 'before');
    settle();
    if (A[0] !== fa || B[0] !== fb || !A.length || !B.length) continue;
    const behindA = A[1], behindB = B[1];
    const pa = fa.atk + (fa.perk === 'meat' ? 3 : 0), pb = fb.atk + (fb.perk === 'meat' ? 3 : 0);
    damage(fb, pa, fa);
    damage(fa, pb, fb);
    if (fa.perk === 'chilli' && B[1]) damage(B[1], 5, fa);
    if (fb.perk === 'chilli' && A[1]) damage(A[1], 5, fb);
    snap(undefined, { attack: true });
    if (behindA && !behindA.dead) trigger(behindA, 'aheadAttacks');
    if (behindB && !behindB.dead) trigger(behindB, 'aheadAttacks');
    settle();
  }
  const result: Result = A.length && !B.length ? 'win' : B.length && !A.length ? 'loss' : 'draw';
  snap(result === 'win' ? '🎉 Your parade wins!' : result === 'loss' ? 'The rival parade wins this time.' : 'A draw — everyone bows.');
  return { result, frames };
}

// ---------- Rivals ----------
const RIVAL_NAMES = [
  'Farmer Wren', 'Old Tom the Miller', 'Granny Bramwell', 'Sir Puddle', 'Little Pip', 'Captain Gull', 'Miss Clementine',
  'Brother Hob', 'The Ironmoor Lads', 'Widow Fennel', 'Tinker Mags', 'Young Barnaby', 'The Bluecliff Twins', 'Lady Marigold',
  'Smith Dunstan', 'Auntie Rue', 'Reverend Quill', 'Mossy Pete',
];
export const RIVAL_HANDICAP = 1;
/** A rival who has played the same number of turns (a simulated player, so they feel like real teams). */
export function makeRival(turn: number, seed: number): { name: string; team: (Pet | null)[] } {
  const r = newRun({ champions: [], seed, rival: true });
  for (let t = 1; t <= turn; t++) {
    if (t > 1) nextTurn(r);
    // Rivals shop with a coin less than you from turn 2 (keeps 10 wins within reach — it's cozy).
    if (t > 1) r.gold -= RIVAL_HANDICAP;
    r.last = rand(r) < 0.5 ? 'win' : 'loss';
    aiShop(r, t <= 2 ? 0 : 1);
    if (t < turn) endTurnAbilities(r);
  }
  endTurnAbilities(r);
  return { name: pick(r, RIVAL_NAMES), team: r.team };
}

// ---------- A simple stall player (rivals, and the balance tests) ----------
const value = (k: { id: string; atk: number; hp: number }) => (KIND[k.id]?.tier ?? 1) * 2.2 + k.atk + k.hp;
export function aiShop(r: Run, skill = 1) {
  for (let guard = 0; guard < 40 && r.phase === 'shop'; guard++) {
    const pets = r.stall.pets;
    // 1. Merge copies.
    const m = pets.findIndex((s) => s && r.team.some((p) => p && p.id === s.id && level(p) < 3));
    if (m >= 0 && r.gold >= PET_COST) { buyPet(r, m, r.team.findIndex((p) => p && p.id === pets[m]!.id && level(p) < 3)); continue; }
    // 2. Fill empty spots with the best critter.
    const empty = r.team.findIndex((p) => !p);
    const best = pets.map((s, i) => ({ s, i })).filter((x) => x.s).sort((a, b) => value(b.s!) - value(a.s!))[0];
    if (empty >= 0 && best && r.gold >= PET_COST) { buyPet(r, best.i, empty); continue; }
    // 3. Swap the weakest for something clearly better.
    if (best && r.gold >= PET_COST && empty < 0) {
      const weakest = r.team.map((p, i) => ({ p: p!, i })).sort((a, b) => value(a.p) + a.p.exp * 3 - (value(b.p) + b.p.exp * 3))[0];
      if (value(best.s!) > value(weakest.p) + weakest.p.exp * 3 + 3) { sellPet(r, weakest.i); continue; }
    }
    // 4. Snacks.
    const fi = r.stall.foods.findIndex((f) => f && f.cost <= r.gold);
    if (fi >= 0 && teamPets(r).length && (r.gold - r.stall.foods[fi]!.cost >= 0) && (skill > 0 || r.stall.foods[fi]!.cost === 0)) {
      const f = r.stall.foods[fi]!;
      const d = FOOD[f.id];
      const team = r.team.map((p, i) => ({ p, i })).filter((x) => x.p) as { p: Pet; i: number }[];
      let target = team[0];
      if (d.perk === 'meat' || d.perk === 'chilli') target = [...team].sort((a, b) => b.p.atk - a.p.atk)[0];
      else if (d.perk) target = team.find((x) => !x.p.perk) ?? team[0];
      else target = [...team].sort((a, b) => b.p.exp - a.p.exp || b.p.hp - a.p.hp)[0];
      buyFood(r, fi, target.i);
      continue;
    }
    // 5. New wares.
    if (r.gold >= REROLL_COST + (skill > 0 ? 0 : 2)) { reroll(r); continue; }
    break;
  }
  // Line them up: the sturdiest in front, start-of-parade shooters and helpers at the back.
  const ps = teamPets(r);
  const front = (p: Pet) => p.hp * 1.3 + p.atk + (hasTrigger(p.id, 'faint') ? 4 : 0) - (hasTrigger(p.id, 'sob') || hasTrigger(p.id, 'aheadAttacks') ? 8 : 0);
  ps.sort((a, b) => front(b) - front(a));
  r.team = [...ps, ...Array(TEAM_SIZE - ps.length).fill(null)];
}

// ---------- Turn flow ----------
function endTurnAbilities(r: Run) { fireAll(r, 'endTurn'); }
function nextTurn(r: Run) {
  r.turn += 1;
  r.gold = TURN_GOLD;
  for (const p of teamPets(r)) { p.tAtk = 0; p.tHp = 0; p.uses = 0; }
  restock(r);
  fireAll(r, 'startTurn');
}

export interface ParadeOutcome { battle: Battle; rival: string; rivalTeam: (Pet | null)[]; result: Result }
/** "March!" — end-of-turn abilities, the parade against a rival, then the next turn begins. */
export function march(r: Run): ParadeOutcome | null {
  if (r.phase !== 'shop' || !teamPets(r).length) return null;
  endTurnAbilities(r);
  const rival = makeRival(r.turn, Math.floor(rand(r) * 2 ** 31));
  const b = battle(r.team, rival.team, Math.floor(rand(r) * 2 ** 31));
  r.last = b.result;
  if (b.result === 'win') r.wins += 1;
  if (b.result === 'loss') r.lives -= 1;
  r.history.push({ turn: r.turn, result: b.result, rival: rival.name });
  if (r.wins >= WINS_NEEDED || r.lives <= 0 || r.turn >= MAX_TURNS) r.phase = 'over';
  else nextTurn(r);
  return { battle: b, rival: rival.name, rivalTeam: rival.team, result: b.result };
}
export const finished = (r: Run) => r.wins >= WINS_NEEDED;

// ---------- Saving ----------
export function saveRun(r: Run) { return JSON.stringify(r); }
export function loadRun(raw: string | null): Run | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Run;
    if (r?.v !== 1 || r.phase !== 'shop' || !Array.isArray(r.team)) return null;
    return r;
  } catch { return null; }
}

// ---------- Rewards ----------
/** Coins for a parade: a little per win (more for stronger adventurers), and a big bonus for all 10. */
export function paradeCoins(wins: number, bestLevel: number) {
  const per = Math.round(30 + Math.min(999, bestLevel) * 0.9);
  const w = Math.max(0, Math.min(WINS_NEEDED, wins));
  return w * per + (w >= WINS_NEEDED ? per * 6 : 0);
}
