// 🧭 Expeditions (v0.0.1.59, part 1): the at-home adventure. Pack a satchel, pick your way across a
// branching map of one town's wild place, and fight turn by turn — monsters show what they'll do next.
// This file is the whole engine (no drawing, seeded rng) so it can be tested. Rewards are handed to
// the store as `Reward`s (`game.expeditionReward`), which gives XP and loot through the loot system.
// Knocked out = carried home with everything found so far. Only packed supplies you use are gone.
import { ITEMS, type CombatStyle, type SkillId } from '../data/items';
import { MONSTERS, MONSTER_MAP, type MonsterDef } from '../data/monsters';
import { METALS, REGIONS, TIER_LEVELS, type Region } from '../data/tiers';
import { ammoFits, combatStats, foodHeal, maxHp, weaponStyle } from './combat';
import { newPlayer, type ItemStack, type PlayerState } from './player';
import { levelForXp, XP_AT } from './xp';

// ----- Tuning -----
/** One turn stands for this much real-time fighting (sets how fast fights go). */
export const TURN_MS = 6000;
/** Rows of the map before the boss. */
export const ROWS = 14;
export const COLS = 3;
export const SATCHEL_SLOTS = 8;
/** Most of one thing a satchel slot holds (food, meals, brews / arrows, runes). */
export const SLOT_MAX = { food: 4, ammo: 300 } as const;
export const FOCUS_MAX = 5;
export const SPECIAL_COST = 3;
/** Arrows/runes a Volley or spell uses. */
export const SPECIAL_AMMO = 3;
/** Chance an arrow or rune is saved on a normal attack (same as normal combat). */
const AMMO_SAVE = 0.25;
/** Damage of a normal attack with no arrows/runes left. */
const NO_AMMO_MULT = 0.35;
/** Turns a fair fighter needs per monster (weakest → strongest in the town), and each one's hit as a share of their health. */
export const FAIR = { turns: [2.2, 3.6], hurt: [0.027, 0.05], eliteTurns: 8.5, eliteHurt: 0.072, bossTurns: 15, bossHurt: 0.068 };
const GUARD_TAKEN = 0.4;
/** XP the store gives, in seconds of the town's gathering XP (see `game.expeditionReward`). */
export const XP_SECS = { kill: 75, elite: 360, boss: 900, event: 90 } as const;

// ----- The wild place of each town -----
export const AREAS: Record<Region, { name: string; emoji: string; blurb: string }> = {
  Pocketvale: { name: 'the Whispering Woods', emoji: '🌳', blurb: 'Old oaks, mossy stones and a path that seems to move when no one looks.' },
  Ironmoor: { name: 'the Deep Shafts', emoji: '⛏️', blurb: 'Abandoned tunnels below the mines, where the lamps still flicker.' },
  Coalhaven: { name: 'the Smoke Marshes', emoji: '🌫️', blurb: 'Reed beds and sunken barges in the haze past the docks.' },
  Bluecliff: { name: 'the Wreckers’ Coves', emoji: '🐚', blurb: 'Hidden coves under the cliffs, full of driftwood and old secrets.' },
  Lunaria: { name: 'the Drowned Lanes', emoji: '🕯️', blurb: 'Fog-filled back streets where the lights went out all at once.' },
  Cinderpeak: { name: 'the Ember Trails', emoji: '🌋', blurb: 'Warm ash paths winding up between the lava vents.' },
  Frosthold: { name: 'the Whiteout Pass', emoji: '❄️', blurb: 'A snowy mountain pass where the wind hums old songs.' },
  Voidreach: { name: 'the Ribbon Depths', emoji: '🌌', blurb: 'Ledges and rope bridges down into the shimmering chasm.' },
  'Starfall Crater': { name: 'the Glittering Wilds', emoji: '🌟', blurb: 'Fields of star-flowers grown from fallen sky.' },
  'Celestine Spires': { name: 'the Cloud Steps', emoji: '☁️', blurb: 'Stairways of cloud between the floating towers.' },
  'Primordial Rift': { name: 'the First Forest', emoji: '🌿', blurb: 'Giant ferns and the oldest trees in the world.' },
};

// ----- Types -----
export type NodeKind = 'fight' | 'elite' | 'camp' | 'event' | 'cache' | 'shrine' | 'boss';
export const NODE_ICON: Record<NodeKind, string> = { fight: '⚔️', elite: '💀', camp: '🔥', event: '❓', cache: '🧺', shrine: '⛲', boss: '👑' };
export const NODE_NAME: Record<NodeKind, string> = { fight: 'Fight', elite: 'Elite', camp: 'Camp', event: 'Something odd', cache: 'Cache', shrine: 'Shrine', boss: 'Boss' };
export interface MapNode { id: number; row: number; col: number; kind: NodeKind; next: number[] }

export type IntentKind = 'attack' | 'heavy' | 'guard';
export const INTENT_ICON: Record<IntentKind, string> = { attack: '⚔️', heavy: '💥', guard: '🛡️' };
export interface Foe {
  /** Monster id (art, loot table). */
  m: string;
  name: string;
  hp: number;
  maxHp: number;
  /** Its normal hit per turn. */
  hurt: number;
  pattern: IntentKind[];
  step: number;
  intent: IntentKind;
  elite?: boolean;
  boss?: boolean;
}

export type BoonId = 'edge' | 'cloak' | 'wind' | 'keen' | 'breath' | 'hearty' | 'forager' | 'thorns' | 'will' | 'hands' | 'feast' | 'hunter' | 'echo' | 'mender';
export const BOONS: Record<BoonId, { emoji: string; name: string; text: string }> = {
  edge: { emoji: '🗡️', name: 'Whetstone', text: '+15% damage.' },
  cloak: { emoji: '🧥', name: 'Thick Cloak', text: 'Take 12% less damage.' },
  wind: { emoji: '🌬️', name: 'Second Wind', text: 'Heal 15% after every fight.' },
  keen: { emoji: '👁️', name: 'Keen Eye', text: 'Your first attack in each fight hits twice as hard.' },
  breath: { emoji: '🫁', name: 'Steady Breath', text: 'Start every fight with 2 Focus.' },
  hearty: { emoji: '❤️', name: 'Hearty', text: '+20% max health (and heal that much now).' },
  forager: { emoji: '🍄', name: 'Forager', text: 'An extra loot roll from every fight and cache.' },
  thorns: { emoji: '🌵', name: 'Bramble Mail', text: 'Monsters that hit you take 20% of it back.' },
  will: { emoji: '🕯️', name: 'Iron Will', text: 'Once, when you would be knocked out, stay up with a little health.' },
  hands: { emoji: '🤲', name: 'Quick Hands', text: 'Guard gives 1 more Focus.' },
  feast: { emoji: '🍲', name: 'Hearty Appetite', text: 'Food heals 50% more.' },
  hunter: { emoji: '🎯', name: 'Hunter’s Mark', text: '+30% damage to elites and the boss.' },
  echo: { emoji: '🔔', name: 'Echo', text: 'Specials cost 1 less Focus.' },
  mender: { emoji: '🩹', name: 'Mender', text: 'Resting at camp heals you fully.' },
};
const BOON_IDS = Object.keys(BOONS) as BoonId[];

/** A satchel slot. `heal` is fixed when packed. */
export interface Supply { id: string; qty: number; heal: number; kind: 'food' | 'meal' | 'brew' | 'ammo' }

/** What the store should give for something you just did. */
export interface Reward {
  /** Monsters beaten (one loot roll each; elites and the boss roll more). */
  kills?: { m: string; elite?: boolean; boss?: boolean }[];
  /** Loot rolls from the town's monsters (caches, events). */
  rolls?: number;
  /** A rare find (bird's nest, geode, corked bottle). */
  find?: string;
  /** Gathering-skill XP from a skill check. */
  skillXp?: SkillId;
}

export interface EventChoice { label: string; need?: { skill: SkillId; level: number }; needFood?: boolean; result: string; heal?: number; hurt?: number; boon?: boolean; rolls?: number; find?: string; skillXp?: SkillId; sharpen?: boolean }
export interface EventDef { id: string; emoji: string; title: string; text: string; choices: EventChoice[] }

export type Phase = 'map' | 'fight' | 'camp' | 'event' | 'cache' | 'shrine' | 'boon' | 'done';
export interface Run {
  v: 1;
  /** rng state */
  rs: number;
  region: Region;
  style: CombatStyle;
  startedAt: number;
  map: MapNode[];
  /** Current node (null = choosing where to start). */
  at: number | null;
  visited: number[];
  phase: Phase;
  hp: number;
  maxHp: number;
  focus: number;
  boons: BoonId[];
  /** Camp "sharpen up" stacks (+8% damage each). */
  sharpen: number;
  satchel: Supply[];
  /** Your expected hit / their expected hit per turn, per monster (worked out when you set off). */
  power: Record<string, { hit: number; hurt: number }>;
  fight?: { foes: Foe[]; turn: number; usedSupply: boolean; attacked: boolean; fed: boolean; target: number };
  event?: string;
  /** Events met this run. */
  seen?: string[];
  boonChoices?: BoonId[];
  willUsed?: boolean;
  /** Short story of what just happened (newest last). */
  log: string[];
  /** Everything found so far (filled in by the store). */
  found: { items: ItemStack[]; xp: Partial<Record<SkillId, number>>; kills: number; pet?: string };
  end?: 'won' | 'ko' | 'home';
  /** The store has given back unused supplies (and what they were). */
  settled?: boolean;
  returned?: ItemStack[];
}

// ----- rng -----
function rand(r: Run): number {
  r.rs = (r.rs + 0x6d2b79f5) | 0;
  let t = r.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(r: Run, a: readonly T[]): T => a[Math.floor(rand(r) * a.length)];

// ----- The town -----
export const townMonsters = (region: Region) => MONSTERS.filter((m) => m.region === region && !m.miniboss && !m.weekly).sort((a, b) => a.level - b.level);
export const townBoss = (region: Region): MonsterDef | undefined => MONSTERS.find((m) => m.region === region && m.miniboss && !m.weekly && !m.ascension);
/** The level a skill check asks for in this town. */
export const checkLevel = (region: Region) => TIER_LEVELS[REGIONS.indexOf(region)] + 20;
/** "Monsters here are level 1–45." */
export function levelRange(region: Region): [number, number] {
  const ms = townMonsters(region);
  return [ms[0]?.level ?? 1, townBoss(region)?.level ?? ms[ms.length - 1]?.level ?? 1];
}

// ----- Packing -----
export function supplyKind(p: PlayerState, id: string): Supply['kind'] | null {
  const it = ITEMS[id];
  if (!it) return null;
  if (it.ammo) return ammoFits(p, id) ? 'ammo' : null;
  if (it.buff) return it.buff.kind === 'xp' ? 'brew' : 'meal';
  if (it.heals) return 'food';
  return null;
}
export const slotMax = (kind: Supply['kind']) => (kind === 'ammo' ? SLOT_MAX.ammo : SLOT_MAX.food);

/** Why you can't set off (null = you can). */
export function whyCantStart(p: PlayerState, region: Region, pack: ItemStack[]): string | null {
  if (!p.regions.includes(region)) return 'Discover this town first';
  if (!townMonsters(region).length || !townBoss(region)) return 'Nothing to explore here yet';
  if (pack.length > SATCHEL_SLOTS) return `Your satchel holds ${SATCHEL_SLOTS} things`;
  for (const s of pack) {
    const k = supplyKind(p, s.id);
    if (!k) return `${ITEMS[s.id]?.name ?? 'That'} can't go in your satchel`;
    if (s.qty < 1 || s.qty > slotMax(k)) return `Up to ${slotMax(k)} per slot`;
  }
  const style = weaponStyle(p);
  if (style !== 'melee' && !pack.some((s) => supplyKind(p, s.id) === 'ammo')) return style === 'ranged' ? 'Pack some arrows for your bow' : 'Pack some runes for your staff';
  return null;
}

/** Sets off. The store takes the packed things out of your bag/bank first. */
export function newRun(p: PlayerState, region: Region, pack: ItemStack[], seed = Math.floor(Math.random() * 2 ** 31)): Run {
  const hp = maxHp(p);
  const satchel: Supply[] = pack.map((s) => ({ id: s.id, qty: s.qty, heal: supplyHeal(p, s.id, region, hp), kind: supplyKind(p, s.id)! }));
  const ammo = bestAmmo(satchel);
  const power: Run['power'] = {};
  const fair = fairPower(region);
  for (const m of [...townMonsters(region), townBoss(region)!]) {
    const you = rawPower(p, m, ammo);
    const f = fair[m.id];
    // Your hits are your own; theirs are the fair fighter's, scaled by how your defence compares.
    power[m.id] = { hit: you.hit, hurt: f.hurt * Math.min(3, Math.max(0.35, you.hurt / f.rawHurt)) };
  }
  const r: Run = {
    v: 1, rs: seed, region, style: weaponStyle(p), startedAt: Date.now(), map: [], at: null, visited: [], phase: 'map',
    hp, maxHp: hp, focus: 0, boons: [], sharpen: 0, satchel, power, log: [], found: { items: [], xp: {}, kills: 0 },
  };
  r.map = makeMap(r);
  say(r, `You set off into ${AREAS[region].name}.`);
  return r;
}
/**
 * How much a packed food heals on an expedition: a share of your health — 15% for this town's own food,
 * 3% more per town further out (less for food from nearer towns), ×1.4 for Great food. Meals heal 30%.
 */
export function supplyHeal(p: PlayerState, id: string, region: Region, hpMax: number): number {
  const it = ITEMS[id];
  if (!it?.heals && !it?.buff) return 0;
  const gap = (it.tierNum ?? 0) - REGIONS.indexOf(region);
  let pct = it.buff ? 0.3 : Math.min(0.3, Math.max(0.06, 0.15 + 0.03 * gap));
  if (id.startsWith('great_')) pct *= 1.4;
  // 🌟 Ascended gear that makes food heal more works here too.
  const extra = it.heals ? foodHeal(p, id) / it.heals : 1;
  return Math.max(1, Math.round(hpMax * pct * extra));
}

/** Expected hit per turn, both ways, in real combat terms. */
function rawPower(p: PlayerState, m: MonsterDef, ammo: string | null) {
  const s = combatStats(p, m, ammo);
  return {
    hit: Math.max(0.5, (TURN_MS / s.speedMs) * s.accuracy * (1 + s.maxHit) / 2),
    hurt: Math.max(0.05, (TURN_MS / m.speedMs) * s.enemyAccuracy * (m.maxHit / 2)),
  };
}
/**
 * The fair fighter for a town (its strongest monster's level + 15, the town's own metal gear, no style edge):
 * expedition monsters get their health and hits from this, so every town plays about the same.
 */
const fairCache = new Map<Region, Record<string, { hp: number; hurt: number; rawHurt: number }>>();
export function fairPower(region: Region) {
  let out = fairCache.get(region);
  if (out) return out;
  out = {};
  const t = REGIONS.indexOf(region);
  const ms = townMonsters(region);
  const boss = townBoss(region);
  const p = newPlayer(0);
  const L = Math.min(999, (ms[ms.length - 1]?.level ?? 1) + 15);
  for (const k of ['melee', 'defense', 'health'] as const) p.skills[k].xp = XP_AT[L];
  const metal = METALS[Math.max(0, t)].key;
  p.equipment = { weapon: `${metal}_sword`, head: `${metal}_helmet`, shield: `${metal}_shield`, legs: `${metal}_platelegs`, body: `${metal}_chestplate` };
  const hpMax = maxHp(p);
  for (const [i, m] of ms.entries()) {
    const raw = rawPower(p, { ...m, style: 'melee' }, null);
    const rank = ms.length > 1 ? i / (ms.length - 1) : 1;
    out[m.id] = { hp: raw.hit * (FAIR.turns[0] + (FAIR.turns[1] - FAIR.turns[0]) * rank), hurt: hpMax * (FAIR.hurt[0] + (FAIR.hurt[1] - FAIR.hurt[0]) * rank), rawHurt: raw.hurt };
  }
  if (boss) {
    const raw = rawPower(p, { ...boss, style: 'melee' }, null);
    out[boss.id] = { hp: raw.hit * FAIR.bossTurns, hurt: hpMax * FAIR.bossHurt, rawHurt: raw.hurt };
  }
  fairCache.set(region, out);
  return out;
}

function bestAmmo(satchel: Supply[]): string | null {
  let best: Supply | null = null;
  for (const s of satchel) if (s.kind === 'ammo' && s.qty > 0 && (!best || ITEMS[s.id].ammo!.power > ITEMS[best.id].ammo!.power)) best = s;
  return best?.id ?? null;
}
const say = (r: Run, text: string) => { r.log.push(text); if (r.log.length > 5) r.log.shift(); };

// ----- The map -----
function makeMap(r: Run): MapNode[] {
  const nodes: MapNode[] = [];
  const kindFor = (row: number): NodeKind => {
    if (row === 0) return 'fight';
    if (row === ROWS - 1) return 'camp';
    const x = rand(r);
    if (row < 2) return x < 0.65 ? 'fight' : x < 0.85 ? 'event' : 'cache';
    if (x < 0.4) return 'fight';
    if (x < 0.6) return 'event';
    if (x < 0.72) return 'elite';
    if (x < 0.82) return 'camp';
    if (x < 0.91) return 'cache';
    return 'shrine';
  };
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) nodes.push({ id: row * COLS + col, row, col, kind: kindFor(row), next: [] });
  const bossId = ROWS * COLS;
  nodes.push({ id: bossId, row: ROWS, col: 1, kind: 'boss', next: [] });
  // Every row has at least one fight-ish node, so the road never runs out of monsters.
  for (let row = 2; row < ROWS - 1; row++) {
    const rowNodes = nodes.filter((n) => n.row === row);
    if (!rowNodes.some((n) => n.kind === 'fight' || n.kind === 'elite')) pick(r, rowNodes).kind = 'fight';
  }
  // Paths: straight up, and sometimes across to a neighbour (never crossing another path).
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const n = nodes[row * COLS + col];
      if (row === ROWS - 1) { n.next = [bossId]; continue; }
      n.next.push((row + 1) * COLS + col);
      const left = nodes[row * COLS + col - 1];
      const leftGoesRight = col > 0 && left.next.includes((row + 1) * COLS + col);
      if (col > 0 && !leftGoesRight && rand(r) < 0.35) n.next.push((row + 1) * COLS + col - 1);
      else if (col < COLS - 1 && rand(r) < 0.35) n.next.push((row + 1) * COLS + col + 1);
    }
  }
  return nodes;
}
/** Nodes you can walk to next. */
export function reachable(r: Run): number[] {
  if (r.phase !== 'map') return [];
  if (r.at === null) return r.map.filter((n) => n.row === 0).map((n) => n.id);
  return r.map[r.at].next;
}

/** Walk to a node. Returns a reward for caches. */
export function goTo(r: Run, id: number): Reward | null {
  if (!reachable(r).includes(id)) return null;
  const n = r.map[id];
  r.at = id;
  r.visited.push(id);
  switch (n.kind) {
    case 'fight': startFight(r, n.row); break;
    case 'elite': startFight(r, n.row, 'elite'); break;
    case 'boss': startFight(r, n.row, 'boss'); break;
    case 'camp': r.phase = 'camp'; say(r, 'You make camp for a while.'); break;
    case 'shrine': r.phase = 'shrine'; say(r, 'A mossy shrine glows softly.'); break;
    case 'event': {
      // A new scene each time (until you've seen them all).
      const fresh = EVENTS.filter((e) => !(r.seen ?? []).includes(e.id));
      r.event = pick(r, fresh.length ? fresh : EVENTS).id;
      (r.seen ??= []).push(r.event);
      r.phase = 'event';
      break;
    }
    case 'cache': {
      r.phase = 'cache';
      say(r, 'You find a forgotten cache!');
      return { rolls: 3 + (has(r, 'forager') ? 1 : 0) };
    }
  }
  return null;
}
/** Back to the map after a camp, cache, event or boon. */
export function toMap(r: Run) {
  if (r.phase === 'done') return;
  r.phase = r.at !== null && r.map[r.at].kind === 'boss' ? 'done' : 'map';
  r.event = undefined;
}

// ----- Fights -----
const has = (r: Run, b: BoonId) => r.boons.includes(b);
function patternFor(m: MonsterDef, boss?: boolean): IntentKind[] {
  if (boss) return ['attack', 'heavy', 'attack', 'guard', 'heavy'];
  if (['boar', 'tortoise', 'crab', 'treant', 'bear', 'goat'].includes(m.art)) return ['attack', 'guard', 'heavy'];
  if (m.style === 'magic') return ['attack', 'heavy', 'attack'];
  return ['attack', 'attack', 'heavy'];
}
function makeFoe(r: Run, m: MonsterDef, kind?: 'elite' | 'boss'): Foe {
  const fair = fairPower(r.region)[m.id];
  const mult = kind === 'elite' ? { hp: (FAIR.eliteTurns / FAIR.turns[1]), hurt: FAIR.eliteHurt / FAIR.hurt[1] } : { hp: 1, hurt: 1 };
  const hp = Math.max(4, Math.round(fair.hp * mult.hp));
  const pattern = patternFor(m, kind === 'boss');
  const step = kind === 'boss' ? 0 : Math.floor(rand(r) * pattern.length);
  return {
    m: m.id, name: kind === 'elite' ? `Fierce ${m.name}` : m.name, hp, maxHp: hp, hurt: r.power[m.id].hurt * mult.hurt,
    pattern, step, intent: pattern[step], elite: kind === 'elite' || undefined, boss: kind === 'boss' || undefined,
  };
}
function startFight(r: Run, row: number, kind?: 'elite' | 'boss') {
  const pool = townMonsters(r.region);
  const foes: Foe[] = [];
  if (kind === 'boss') foes.push(makeFoe(r, townBoss(r.region)!, 'boss'));
  else if (kind === 'elite') foes.push(makeFoe(r, pool[pool.length - 1], 'elite'));
  else {
    const count = row < 2 ? 1 + (rand(r) < 0.4 ? 1 : 0) : row < 6 ? 1 + Math.floor(rand(r) * 3) : 2 + (rand(r) < 0.5 ? 1 : 0);
    // Further along, tougher monsters turn up.
    const top = Math.min(pool.length, 2 + Math.floor(row / 3));
    for (let i = 0; i < count; i++) foes.push(makeFoe(r, pool[Math.floor(rand(r) * top)]));
  }
  r.fight = { foes, turn: 1, usedSupply: false, attacked: false, fed: false, target: 0 };
  r.focus = has(r, 'breath') ? 2 : 0;
  r.phase = 'fight';
  say(r, kind === 'boss' ? `${foes[0].name} blocks the way!` : kind === 'elite' ? `${foes[0].name} snarls at you!` : foes.length > 1 ? `${foes.length} monsters jump out!` : `A ${foes[0].name} jumps out!`);
}
/** What a foe will do this turn, with numbers. */
export function intentDamage(r: Run, f: Foe): number {
  if (f.intent === 'guard') return 0;
  const big = f.intent === 'heavy' ? (f.boss ? 2.2 : 1.8) : 1;
  return Math.max(1, Math.round(f.hurt * big * (has(r, 'cloak') ? 0.88 : 1)));
}
export const specialCost = (r: Run) => SPECIAL_COST - (has(r, 'echo') ? 1 : 0);
export const SPECIAL_NAME: Record<CombatStyle, { name: string; emoji: string; text: string }> = {
  melee: { name: 'Cleave', emoji: '🌀', text: 'Hit every monster, and take 30% less this turn.' },
  ranged: { name: 'Volley', emoji: '🏹', text: `A big hit on one monster (uses ${SPECIAL_AMMO} arrows).` },
  magic: { name: 'Spellburst', emoji: '✨', text: `Hit every monster hard (uses ${SPECIAL_AMMO} runes).` },
};
function ammoLeft(r: Run): Supply | null {
  let best: Supply | null = null;
  for (const s of r.satchel) if (s.kind === 'ammo' && s.qty > 0 && (!best || ITEMS[s.id].ammo!.power > ITEMS[best.id].ammo!.power)) best = s;
  return best;
}
export const ammoCount = (r: Run) => r.satchel.filter((s) => s.kind === 'ammo').reduce((n, s) => n + s.qty, 0);
export function whyNoSpecial(r: Run): string | null {
  if (r.focus < specialCost(r)) return `Needs ${specialCost(r)} Focus`;
  if (r.style !== 'melee' && ammoCount(r) < SPECIAL_AMMO) return r.style === 'ranged' ? `Needs ${SPECIAL_AMMO} arrows` : `Needs ${SPECIAL_AMMO} runes`;
  return null;
}
function useAmmo(r: Run, n: number) {
  for (let i = 0; i < n; i++) { const s = ammoLeft(r); if (!s) return; s.qty--; }
  r.satchel = r.satchel.filter((s) => s.qty > 0);
}
const alive = (r: Run) => r.fight!.foes.filter((f) => f.hp > 0);

function hitFor(r: Run, f: Foe, mult: number): number {
  let m = mult * (1 + (has(r, 'edge') ? 0.15 : 0) + 0.08 * r.sharpen) * (r.fight!.fed ? 1.15 : 1);
  if ((f.elite || f.boss) && has(r, 'hunter')) m *= 1.3;
  if (f.intent === 'guard') m *= 0.5;
  const dmg = Math.max(1, Math.round(r.power[f.m].hit * m * (0.85 + rand(r) * 0.3)));
  return Math.min(dmg, f.hp);
}

export type Move = 'attack' | 'guard' | 'special';
export interface TurnResult {
  /** Damage each foe took (by index), and what each did to you. */
  dealt: number[];
  taken: { i: number; dmg: number; kind: IntentKind }[];
  won: boolean;
  ko: boolean;
  reward: Reward | null;
}

/** Your move, then every monster does what it showed. */
export function playTurn(r: Run, move: Move, target = r.fight?.target ?? 0): TurnResult | null {
  const fight = r.fight;
  if (r.phase !== 'fight' || !fight) return null;
  if (move === 'special' && whyNoSpecial(r)) return null;
  const foes = fight.foes;
  if (!foes[target] || foes[target].hp <= 0) target = foes.findIndex((f) => f.hp > 0);
  fight.target = target;
  const dealt = foes.map(() => 0);
  let guard = false;
  let cleave = false;
  if (move === 'attack') {
    let mult = 1;
    if (r.style !== 'melee') {
      if (ammoCount(r) > 0) { if (rand(r) >= AMMO_SAVE) useAmmo(r, 1); } else mult = NO_AMMO_MULT;
    }
    if (!fight.attacked && has(r, 'keen')) mult *= 2;
    fight.attacked = true;
    dealt[target] = hitFor(r, foes[target], mult);
    r.focus = Math.min(FOCUS_MAX, r.focus + 1);
  } else if (move === 'guard') {
    guard = true;
    r.focus = Math.min(FOCUS_MAX, r.focus + 2 + (has(r, 'hands') ? 1 : 0));
  } else {
    r.focus -= specialCost(r);
    fight.attacked = true;
    if (r.style === 'melee') { cleave = true; for (const [i, f] of foes.entries()) if (f.hp > 0) dealt[i] = hitFor(r, f, 1); }
    else if (r.style === 'ranged') { useAmmo(r, SPECIAL_AMMO); dealt[target] = hitFor(r, foes[target], 2.6); }
    else { useAmmo(r, SPECIAL_AMMO); for (const [i, f] of foes.entries()) if (f.hp > 0) dealt[i] = hitFor(r, f, 1.4); }
  }
  for (const [i, d] of dealt.entries()) foes[i].hp -= d;
  const names = dealt.map((d, i) => (d ? `${foes[i].name} −${d}` : '')).filter(Boolean);
  say(r, move === 'guard' ? 'You raise your guard.' : `${move === 'special' ? SPECIAL_NAME[r.style].name + '! ' : ''}${names.join(', ') || 'You miss'}`);

  // Their turn.
  const taken: TurnResult['taken'] = [];
  for (const [i, f] of foes.entries()) {
    if (f.hp <= 0 || f.intent === 'guard') continue;
    let dmg = intentDamage(r, f);
    if (guard) dmg = Math.round(dmg * GUARD_TAKEN);
    if (cleave) dmg = Math.round(dmg * 0.7);
    r.hp -= dmg;
    taken.push({ i, dmg, kind: f.intent });
    if (dmg > 0 && has(r, 'thorns')) { const back = Math.min(f.hp, Math.max(1, Math.round(dmg * 0.2))); f.hp -= back; dealt[i] += back; }
  }
  if (taken.length) say(r, taken.map((t) => `${foes[t.i].name} ${t.kind === 'heavy' ? 'slams' : 'hits'} ${t.dmg}`).join(', '));
  let ko = false;
  if (r.hp <= 0) {
    if (has(r, 'will') && !r.willUsed) { r.willUsed = true; r.hp = Math.max(1, Math.round(r.maxHp * 0.15)); say(r, '🕯️ Iron Will! You stay on your feet.'); }
    else { r.hp = 0; ko = true; }
  }
  // Next intents.
  for (const f of foes) if (f.hp > 0) { f.step = (f.step + 1) % f.pattern.length; f.intent = f.pattern[f.step]; }
  fight.turn++;
  fight.usedSupply = false;
  if (ko) {
    r.phase = 'done';
    r.end = 'ko';
    r.fight = undefined;
    say(r, 'You are knocked out… and carried home safe, with everything you found.');
    return { dealt, taken, won: false, ko: true, reward: null };
  }
  if (!alive(r).length) return { dealt, taken, won: true, ko: false, reward: winFight(r) };
  if (foes[fight.target].hp <= 0) fight.target = foes.findIndex((f) => f.hp > 0);
  return { dealt, taken, won: false, ko: false, reward: null };
}

function winFight(r: Run): Reward {
  const foes = r.fight!.foes;
  const node = r.map[r.at!];
  r.fight = undefined;
  r.focus = 0;
  if (has(r, 'wind')) r.hp = Math.min(r.maxHp, r.hp + Math.round(r.maxHp * 0.15));
  const reward: Reward = { kills: foes.map((f) => ({ m: f.m, elite: f.elite, boss: f.boss })), rolls: has(r, 'forager') ? 1 : 0 };
  if (node.kind === 'boss') {
    r.phase = 'done';
    r.end = 'won';
    say(r, `${foes[0].name} is beaten! The way home is clear.`);
  } else if (node.kind === 'elite') {
    offerBoons(r);
    say(r, `${foes[0].name} is beaten! Pick a Boon.`);
  } else {
    r.phase = 'map';
    say(r, 'All clear. Onward!');
  }
  return reward;
}

// ----- Supplies -----
/** Eat or drink something from the satchel (once per turn in a fight; any time on the map). */
export function useSupply(r: Run, i: number): string | null {
  const s = r.satchel[i];
  if (!s || s.qty < 1) return 'Nothing there';
  if (s.kind === 'ammo') return 'Arrows and runes are used when you attack';
  if (r.phase === 'fight' && r.fight?.usedSupply) return 'One snack a turn';
  if (r.phase === 'done') return 'The expedition is over';
  const name = ITEMS[s.id].name;
  if (s.kind === 'brew') {
    if (r.phase !== 'fight') return 'Save brews for a fight';
    r.focus = Math.min(FOCUS_MAX, r.focus + 3);
    r.hp = Math.min(r.maxHp, r.hp + Math.round(r.maxHp * 0.15));
    say(r, `You drink the ${name}: +3 Focus.`);
  } else {
    const heal = s.heal;
    if (r.hp >= r.maxHp && !(s.kind === 'meal' && r.phase === 'fight')) return "You're already at full health";
    const h = Math.round(heal * (has(r, 'feast') ? 1.5 : 1));
    r.hp = Math.min(r.maxHp, r.hp + h);
    if (s.kind === 'meal' && r.fight) r.fight.fed = true;
    say(r, s.kind === 'meal' && r.fight ? `You eat the ${name}: +${h} health and +15% damage this fight.` : `You eat the ${name}: +${h} health.`);
  }
  s.qty--;
  if (r.fight) r.fight.usedSupply = true;
  r.satchel = r.satchel.filter((x) => x.qty > 0);
  return null;
}

// ----- Camps, shrines, boons -----
export function camp(r: Run, choice: 'rest' | 'sharpen'): string | null {
  if (r.phase !== 'camp') return 'Not at a camp';
  if (choice === 'rest') {
    const h = has(r, 'mender') ? r.maxHp : Math.round(r.maxHp * 0.35);
    r.hp = Math.min(r.maxHp, r.hp + h);
    say(r, 'You rest by the fire and feel much better.');
  } else {
    r.sharpen++;
    say(r, 'You sharpen up: +8% damage for the rest of the expedition.');
  }
  toMap(r);
  return null;
}
function offerBoons(r: Run) {
  const pool = BOON_IDS.filter((b) => !has(r, b));
  const choices: BoonId[] = [];
  while (choices.length < 3 && pool.length) choices.push(pool.splice(Math.floor(rand(r) * pool.length), 1)[0]);
  r.boonChoices = choices;
  r.phase = choices.length ? 'boon' : 'map';
}
export function pickBoon(r: Run, b: BoonId): string | null {
  if (r.phase !== 'boon' || !r.boonChoices?.includes(b)) return 'Not on offer';
  r.boons.push(b);
  if (b === 'hearty') { const extra = Math.round(r.maxHp * 0.2); r.maxHp += extra; r.hp += extra; }
  r.boonChoices = undefined;
  say(r, `${BOONS[b].emoji} ${BOONS[b].name}: ${BOONS[b].text}`);
  toMap(r);
  return null;
}
/** Shrine: give some health for a Boon, or take a sip and go. */
export function shrine(r: Run, choice: 'offer' | 'sip'): string | null {
  if (r.phase !== 'shrine') return 'Not at a shrine';
  if (choice === 'offer') {
    const cost = Math.round(r.maxHp * 0.2);
    if (r.hp <= cost) return 'You need more health to offer';
    r.hp -= cost;
    say(r, `You offer ${cost} health to the shrine…`);
    offerBoons(r);
  } else {
    r.hp = Math.min(r.maxHp, r.hp + Math.round(r.maxHp * 0.2));
    say(r, 'The water is cool and sweet.');
    toMap(r);
  }
  return null;
}

// ----- Events -----
export const EVENTS: EventDef[] = [
  { id: 'fallen_tree', emoji: '🌲', title: 'A fallen tree', text: 'A great tree has come down across the path, roots and all.', choices: [
    { label: 'Chop through it', need: { skill: 'woodcutting', level: 0 }, result: 'You chop a way through — and a bird’s nest tumbles out of the branches!', find: 'bird_nest', skillXp: 'woodcutting' },
    { label: 'Climb over', result: 'You scrape a knee, but spot something shiny on top.', hurt: 0.08, rolls: 1 },
    { label: 'Go the long way round', result: 'A pleasant, if longer, walk.' },
  ] },
  { id: 'glinting_rock', emoji: '🪨', title: 'Something glints', text: 'A rocky outcrop sparkles where the light hits it.', choices: [
    { label: 'Pry the vein open', need: { skill: 'mining', level: 0 }, result: 'The rock splits — there’s a geode inside!', find: 'geode', skillXp: 'mining' },
    { label: 'Dig with your hands', result: 'Sore fingers, but you dig something up.', hurt: 0.06, rolls: 1 },
    { label: 'Leave it be', result: 'Some rocks are best left alone.' },
  ] },
  { id: 'still_pool', emoji: '💧', title: 'A still pool', text: 'A clear, quiet pool. Something moves in the deep part.', choices: [
    { label: 'Cast a line', need: { skill: 'fishing', level: 0 }, result: 'You reel in… a corked bottle!', find: 'message_bottle', skillXp: 'fishing' },
    { label: 'Have a long drink', result: 'Cold and refreshing.', heal: 0.25 },
  ] },
  { id: 'old_campfire', emoji: '🔥', title: 'A warm campfire', text: 'Someone’s campfire, still warm. They can’t have gone far.', choices: [
    { label: 'Rekindle it', need: { skill: 'firemaking', level: 0 }, result: 'The fire crackles back to life. You warm right through.', heal: 0.4, skillXp: 'firemaking' },
    { label: 'Cook a quick stew', need: { skill: 'cooking', level: 0 }, result: 'A hot stew in the wild. Wonderful.', heal: 0.55, skillXp: 'cooking' },
    { label: 'Warm your hands', result: 'Just a little warmer.', heal: 0.12 },
  ] },
  { id: 'hurt_traveller', emoji: '🧳', title: 'A traveller in need', text: 'A traveller sits by the road, nursing a twisted ankle.', choices: [
    { label: 'Bind it with herbs', need: { skill: 'herblore', level: 0 }, result: 'Good as new! They teach you a trick of the road.', boon: true, skillXp: 'herblore' },
    { label: 'Share a snack', needFood: true, result: 'They thank you warmly and share a trick of the road.', boon: true },
    { label: 'Wish them well', result: '“Safe travels!” they call after you.' },
  ] },
  { id: 'locked_chest', emoji: '🧰', title: 'A locked chest', text: 'A small iron-bound chest, half buried in the dirt.', choices: [
    { label: 'Work the lock', need: { skill: 'smithing', level: 0 }, result: 'Click! It swings open.', rolls: 3, skillXp: 'smithing' },
    { label: 'Ease the hinges off', need: { skill: 'crafting', level: 0 }, result: 'The lid lifts right off.', rolls: 3, skillXp: 'crafting' },
    { label: 'Smash it open', result: 'Ouch — but it opens.', hurt: 0.1, rolls: 2 },
  ] },
  { id: 'humming_stones', emoji: '🗿', title: 'Humming stones', text: 'A ring of old standing stones hums softly. Strange marks cover them.', choices: [
    { label: 'Read the runes', need: { skill: 'runecrafting', level: 0 }, result: 'The marks are a blessing for travellers: +8% damage for the rest of the expedition.', sharpen: true, skillXp: 'runecrafting' },
    { label: 'Rest inside the ring', result: 'The hum is very soothing.', heal: 0.2 },
    { label: 'Walk on', result: 'The hum follows you a little way.' },
  ] },
  { id: 'bear_mark', emoji: '🐻', title: 'A little drawing', text: 'Someone has scratched a little bear into a tree trunk, with an arrow pointing on. It looks fresh.', choices: [
    { label: 'Follow the arrow', result: 'It leads to a small stash, left for whoever came next.', rolls: 2 },
    { label: 'Sit under the tree a while', result: 'You feel like someone kind passed this way.', heal: 0.2 },
  ] },
  { id: 'wild_garden', emoji: '🌱', title: 'A wild garden', text: 'An old garden, gone wild. A few plants still look healthy.', choices: [
    { label: 'Tend the plants', need: { skill: 'farming', level: 0 }, result: 'You find some ripe things among the weeds.', rolls: 2, skillXp: 'farming' },
    { label: 'Pick some berries', result: 'Sweet and juicy.', heal: 0.15 },
  ] },
];
export const EVENT_MAP: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
/** A choice's skill check for this town (`level: 0` in the list = "this town's check level"). */
export const needFor = (r: Run, c: EventChoice) => (c.need ? { skill: c.need.skill, level: c.need.level || checkLevel(r.region) } : null);

/** Make a choice at an event. `levels` = your real skill levels. */
export function choose(r: Run, i: number, p: PlayerState): { error: string | null; reward: Reward | null; result?: string } {
  const ev = r.event ? EVENT_MAP[r.event] : null;
  const c = ev?.choices[i];
  if (r.phase !== 'event' || !ev || !c) return { error: 'Nothing to choose', reward: null };
  const need = needFor(r, c);
  if (need && levelForXp(p.skills[need.skill].xp) < need.level) return { error: `Needs ${need.skill[0].toUpperCase() + need.skill.slice(1)} ${need.level}`, reward: null };
  if (c.needFood) {
    const i2 = r.satchel.findIndex((s) => s.kind === 'food' || s.kind === 'meal');
    if (i2 < 0) return { error: 'No food in your satchel', reward: null };
    r.satchel[i2].qty--;
    r.satchel = r.satchel.filter((s) => s.qty > 0);
  }
  if (c.heal) r.hp = Math.min(r.maxHp, r.hp + Math.round(r.maxHp * c.heal));
  if (c.hurt) r.hp = Math.max(1, r.hp - Math.round(r.maxHp * c.hurt));
  if (c.sharpen) r.sharpen++;
  say(r, c.result);
  const reward: Reward | null = c.rolls || c.find || c.skillXp ? { rolls: c.rolls, find: c.find, skillXp: c.skillXp } : null;
  if (c.boon) offerBoons(r); else toMap(r);
  return { error: null, reward, result: c.result };
}

/** Head home early (keeps everything found). */
export function headHome(r: Run) {
  r.phase = 'done';
  r.end ??= 'home';
  r.fight = undefined;
}

// ----- Saving on this device -----
export function saveRun(r: Run): string { return JSON.stringify(r); }
export function loadRun(s: string | null): Run | null {
  if (!s) return null;
  try {
    const r = JSON.parse(s) as Run;
    if (r?.v !== 1 || !REGIONS.includes(r.region) || !Array.isArray(r.map) || r.map.length !== ROWS * COLS + 1) return null;
    for (const f of r.fight?.foes ?? []) if (!MONSTER_MAP[f.m]) return null;
    return r;
  } catch { return null; }
}

/** How far along the road you are (rows walked). */
export const progress = (r: Run) => (r.at === null ? 0 : r.map[r.at].row + 1);
