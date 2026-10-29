// 🛡️ Hold the Wall — tower defence (Combat). The town's monsters march down the road toward the gate in
// 15 waves, ending with the town's great beast. Build towers on the stone pads beside the road — 🏹 archers,
// 🔮 mages, 🛡️ a barracks whose soldiers block the road, 🔥 fire pits — upgrade them, and at level 3 pick a
// specialisation. Your 🧑 Captain (you!) stands on the road and fights; tap the road to move them. Two
// spells (🪨 Rockfall, 📯 Militia) and a town charter every 3 waves (pick 1 of 3 perks) round it out.
// This file is the whole game engine (no drawing), so it can be tested. Rewards: `game.holdWallEnd`.
import { gatherXpPerHour, tierForLevel } from '../data/tiers';
import { nightMonsters } from './lanternWatch';

export const W = 360;
export const H = 640;
export const WAVES = 15;
export const START_LIVES = 20;
const START_GOLD = 280;
export const BREAK_SECONDS = 16;
const SELL_BACK = 0.6;
const CHARTER_WAVES = [3, 6, 9, 12];

export type Style = 'melee' | 'ranged' | 'magic';
type XpKind = 'melee' | 'ranged' | 'magic';

// ---------- The map ----------
interface Layout { path: [number, number][]; pads: [number, number][] }
const LAYOUTS: Layout[] = [
  { // The winding road (S-bends)
    path: [[60, -30], [60, 140], [300, 140], [300, 300], [60, 300], [60, 460], [300, 460], [300, 560], [180, 560], [180, 680]],
    pads: [[150, 70], [260, 70], [130, 220], [220, 220], [150, 380], [250, 380], [240, 510], [95, 540], [270, 620]],
  },
  { // The switchbacks (diagonals)
    path: [[290, -30], [290, 100], [70, 190], [70, 300], [290, 380], [290, 480], [90, 560], [90, 680]],
    pads: [[170, 60], [200, 230], [150, 400], [220, 300], [205, 445], [280, 570], [190, 600], [130, 250], [250, 200]],
  },
];
/** Which layout (and whether it's mirrored) each town uses. */
const TOWN_MAP: Record<string, [number, boolean]> = {
  Pocketvale: [0, false], Ironmoor: [1, false], Coalhaven: [0, true], Bluecliff: [1, true], Lunaria: [0, true], Cinderpeak: [1, false],
  Frosthold: [0, false], Voidreach: [1, true], 'Starfall Crater': [0, true], 'Celestine Spires': [1, false], 'Primordial Rift': [0, false],
};
export function mapFor(region: string): Layout {
  const [i, mirror] = TOWN_MAP[region] ?? [0, false];
  const L = LAYOUTS[i];
  const m = (p: [number, number]): [number, number] => (mirror ? [W - p[0], p[1]] : p);
  return { path: L.path.map(m), pads: L.pads.map(m) };
}
interface PathInfo { pts: [number, number][]; cum: number[]; len: number }
function pathInfo(pts: [number, number][]): PathInfo {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
export function posAt(p: PathInfo, d: number): [number, number] {
  const dd = Math.max(0, Math.min(p.len, d));
  let i = 1;
  while (i < p.cum.length - 1 && p.cum[i] < dd) i++;
  const seg = p.cum[i] - p.cum[i - 1] || 1;
  const k = (dd - p.cum[i - 1]) / seg;
  return [p.pts[i - 1][0] + (p.pts[i][0] - p.pts[i - 1][0]) * k, p.pts[i - 1][1] + (p.pts[i][1] - p.pts[i - 1][1]) * k];
}
/** The closest point on the road to (x, y), and how far along the road it is. */
export function nearestOnPath(p: PathInfo, x: number, y: number): { x: number; y: number; d: number; dist: number } {
  let best = { x: 0, y: 0, d: 0, dist: Infinity };
  for (let i = 1; i < p.pts.length; i++) {
    const [ax, ay] = p.pts[i - 1], [bx, by] = p.pts[i];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    const px = ax + dx * t, py = ay + dy * t;
    const dist = Math.hypot(x - px, y - py);
    if (dist < best.dist) best = { x: px, y: py, d: p.cum[i - 1] + Math.sqrt(l2) * t, dist };
  }
  return best;
}

// ---------- Towers ----------
export type TowerId = 'archer' | 'mage' | 'barracks' | 'fire';
export type SpecId = 'longbow' | 'volley' | 'storm' | 'frost' | 'knights' | 'paladins' | 'inferno' | 'smoke';
export const TOWERS: Record<TowerId, { name: string; emoji: string; text: string; cost: [number, number, number]; specCost: number; specs: [SpecId, SpecId]; xp: XpKind }> = {
  archer: { name: 'Archer tower', emoji: '🏹', text: 'Quick arrows at one monster. Weak against armour.', cost: [70, 60, 90], specCost: 150, specs: ['longbow', 'volley'], xp: 'ranged' },
  mage: { name: 'Mage tower', emoji: '🔮', text: 'Slow orbs that splash. Melts armour.', cost: [100, 80, 120], specCost: 180, specs: ['storm', 'frost'], xp: 'magic' },
  barracks: { name: 'Barracks', emoji: '🛡️', text: '3 soldiers who block the road. Can’t stop fliers.', cost: [80, 70, 100], specCost: 160, specs: ['knights', 'paladins'], xp: 'melee' },
  fire: { name: 'Fire pit', emoji: '🔥', text: 'Lobs fire pots that leave burning ground.', cost: [90, 70, 110], specCost: 170, specs: ['inferno', 'smoke'], xp: 'magic' },
};
export const SPECS: Record<SpecId, { name: string; emoji: string; text: string }> = {
  longbow: { name: 'Longbow nest', emoji: '🎯', text: 'Huge range, big hits, lucky crits.' },
  volley: { name: 'Volley tower', emoji: '🏹', text: 'Fires at 3 monsters at once.' },
  storm: { name: 'Storm spire', emoji: '⚡', text: 'Lightning that jumps between 4 monsters.' },
  frost: { name: 'Frost spire', emoji: '❄️', text: 'Big icy splash that slows everything.' },
  knights: { name: 'Knight hall', emoji: '🛡️', text: 'Armoured knights with lots of health.' },
  paladins: { name: 'Paladin chapel', emoji: '✨', text: 'Holy soldiers who heal themselves.' },
  inferno: { name: 'Inferno', emoji: '🌋', text: 'Huge, scorching fire pools.' },
  smoke: { name: 'Smoke pit', emoji: '💨', text: 'Burning smoke that slows monsters.' },
};

// ---------- Town charters (pick 1 of 3 every 3 waves) ----------
export type CharterId = 'arrows' | 'arcane' | 'drill' | 'coal' | 'masons' | 'bounty' | 'walls' | 'interest' | 'rocks' | 'captain' | 'sight' | 'refund';
export const CHARTERS: Record<CharterId, { emoji: string; name: string; text: string }> = {
  arrows: { emoji: '🏹', name: "Fletchers' Guild", text: 'Archer towers +30% damage.' },
  arcane: { emoji: '🔮', name: 'Arcane Academy', text: 'Mage towers +30% damage.' },
  drill: { emoji: '🛡️', name: 'Drill Sergeant', text: 'Soldiers +50% health and +25% damage.' },
  coal: { emoji: '🔥', name: 'Coal Merchants', text: 'Fire pits burn 35% hotter.' },
  masons: { emoji: '🧱', name: "Masons' Union", text: 'Towers and upgrades cost 15% less.' },
  bounty: { emoji: '💰', name: 'Bounty Office', text: '+30% gold from monsters.' },
  walls: { emoji: '🏰', name: 'Thicker Walls', text: '+6 lives.' },
  interest: { emoji: '🏦', name: 'Town Treasury', text: 'After each wave, gain 12% of your gold (up to 90).' },
  rocks: { emoji: '🪨', name: 'Quarry Crew', text: 'Rockfall recharges 35% faster and drops 2 more rocks.' },
  captain: { emoji: '🎖️', name: 'Captain’s Commission', text: 'Your Captain: +50% damage and health.' },
  sight: { emoji: '🔭', name: 'Watch Bells', text: 'All towers +15% range.' },
  refund: { emoji: '🔁', name: 'Fair Traders', text: 'Selling gives back 95% (not 60%).' },
};

// ---------- Monsters ----------
type Role = 'walk' | 'fast' | 'armour' | 'flier' | 'brute';
const ROLES: Role[] = ['walk', 'fast', 'armour', 'flier', 'brute'];
const ROLE: Record<Role, { hp: number; speed: number; armour: number; gold: number; lives: number; dmg: number; r: number }> = {
  walk: { hp: 1, speed: 38, armour: 0, gold: 5, lives: 1, dmg: 1, r: 11 },
  fast: { hp: 0.6, speed: 64, armour: 0, gold: 5, lives: 1, dmg: 0.8, r: 10 },
  armour: { hp: 1.25, speed: 31, armour: 0.55, gold: 7, lives: 1, dmg: 1.2, r: 12 },
  flier: { hp: 0.75, speed: 45, armour: 0, gold: 7, lives: 1, dmg: 1, r: 11 },
  brute: { hp: 2.8, speed: 26, armour: 0.25, gold: 12, lives: 2, dmg: 2, r: 15 },
};
export const ROLE_TEXT: Record<Role, string> = {
  walk: '', fast: 'Fast', armour: 'Armoured — mages and fire hurt more', flier: 'Flies over soldiers', brute: 'Big brute — costs 2 lives',
};

export interface Monster {
  uid: number; v: number; role: Role; emoji: string; name: string; boss?: boolean; elite?: boolean;
  hp: number; max: number; speed: number; armour: number; gold: number; lives: number; dmg: number; r: number;
  d: number; x: number; y: number; cd: number;
  slowUntil: number; slowPct: number;
  blockedBy: number | null; hitFlash: number;
}
export interface Soldier {
  uid: number; pad: number; x: number; y: number; hx: number; hy: number; hp: number; max: number; dmg: number; cd: number;
  target: number | null; deadUntil: number; until?: number; emoji: string; armour: number; heal: number;
}
export interface Hero { x: number; y: number; tx: number; ty: number; hp: number; max: number; cd: number; deadUntil: number; target: number | null; style: Style }
export interface Tower { id: TowerId; level: number; spec?: SpecId; cd: number; spent: number }
export interface Shot { kind: 'arrow' | 'orb' | 'pot' | 'hero' | 'axe'; x: number; y: number; tx: number; ty: number; target: number; speed: number; dmg: number; type: 'phys' | 'magic' | 'fire'; splash: number; from: XpKind; slow?: number; pool?: { r: number; dps: number; slow: number } }
export interface Pool { x: number; y: number; r: number; dps: number; until: number; slow: number }
export interface Fx { kind: 'boom' | 'zap' | 'num' | 'rock' | 'heal' | 'frost'; x: number; y: number; x2?: number; y2?: number; t: number; life: number; r?: number; v?: string; at?: number }
export type WallEvent =
  | { type: 'shoot'; tower: TowerId } | { type: 'hit' } | { type: 'kill'; boss?: boolean } | { type: 'leak'; lives: number }
  | { type: 'wave'; n: number } | { type: 'clear' } | { type: 'rock' } | { type: 'militia' } | { type: 'won' } | { type: 'lost' } | { type: 'zap' } | { type: 'charter' };

export interface Run {
  v: number; t: number;
  phase: 'build' | 'wave' | 'won' | 'lost';
  region: string;
  wave: number;
  /** Monsters still to come this wave: [time, virtual kind, elite, boss]. */
  queue: [number, number, boolean, boolean][];
  nextWaveAt: number | null;
  gold: number; lives: number;
  towers: (Tower | null)[];
  soldiers: Soldier[]; monsters: Monster[]; shots: Shot[]; pools: Pool[]; fx: Fx[];
  hero: Hero;
  spells: { rock: number; militia: number };
  charters: CharterId[];
  choices: CharterId[] | null;
  kills: number; leaks: number;
  dmg: Record<XpKind, number>;
  banner: { text: string; until: number } | null;
  rs: number; nextUid: number;
  events: WallEvent[];
  /** Kinds of monster (5 roles, using the town's monsters' looks). */
  kinds: { emoji: string; name: string }[];
  boss: { emoji: string; name: string };
}

export function rand(r: { rs: number }) {
  r.rs = (r.rs + 0x6d2b79f5) | 0;
  let t = r.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const pathCache = new Map<string, PathInfo>();
export function roadOf(region: string): PathInfo {
  let p = pathCache.get(region);
  if (!p) { p = pathInfo(mapFor(region).path); pathCache.set(region, p); }
  return p;
}
export const padsOf = (region: string) => mapFor(region).pads;

export function newRun(o: { region: string; style: Style; seed?: number }): Run {
  const nm = nightMonsters(o.region);
  // Give each role a monster that looks the part: something winged/ghostly flies, the biggest one is the brute.
  const ks = nm.kinds, n = ks.length;
  const flyer = ks.find((k) => ['🧚', '🦅', '👻'].includes(k.emoji));
  const kinds = [
    ks[0], ks[1 % n], ks[2 % n],
    flyer ?? { emoji: '🦇', name: 'Cave bat' },
    ks[n - 1],
  ].map((k) => ({ emoji: k.emoji, name: k.name }));
  const road = roadOf(o.region);
  const [hx, hy] = posAt(road, road.len - 170);
  return {
    v: 1, t: 0, phase: 'build', region: o.region, wave: 0, queue: [], nextWaveAt: null,
    gold: START_GOLD, lives: START_LIVES,
    towers: padsOf(o.region).map(() => null),
    soldiers: [], monsters: [], shots: [], pools: [], fx: [],
    hero: { x: hx, y: hy, tx: hx, ty: hy, hp: 260, max: 260, cd: 0, deadUntil: 0, target: null, style: o.style },
    spells: { rock: 0, militia: 0 }, charters: [], choices: null,
    kills: 0, leaks: 0, dmg: { melee: 0, ranged: 0, magic: 0 }, banner: null,
    rs: o.seed ?? Math.floor(Math.random() * 2 ** 31), nextUid: 1, events: [],
    kinds, boss: { emoji: nm.boss.emoji, name: nm.boss.name },
  };
}

const has = (r: Run, c: CharterId) => r.charters.includes(c);
/** The Captain's health (melee Captains stand in the thick of it, so they're much sturdier). */
const heroMax = (r: Run) => Math.round((260 + r.wave * 18) * (has(r, 'captain') ? 1.5 : 1) * (r.hero.style === 'melee' ? 1.8 : 1));
const costMul = (r: Run) => (has(r, 'masons') ? 0.85 : 1);
export const buildCost = (r: Run, id: TowerId) => Math.round(TOWERS[id].cost[0] * costMul(r));
export function upgradeCost(r: Run, t: Tower): number | null {
  if (t.level < 3) return Math.round(TOWERS[t.id].cost[t.level] * costMul(r));
  return null;
}
export const specCost = (r: Run, t: Tower) => (t.level === 3 && !t.spec ? Math.round(TOWERS[t.id].specCost * costMul(r)) : null);
export const sellValue = (r: Run, t: Tower) => Math.floor(t.spent * (has(r, 'refund') ? 0.95 : SELL_BACK));

/** A tower's numbers right now (level, specialisation and charters). */
export function towerStats(r: Run, t: Tower) {
  const L = t.level, s = t.spec;
  const range = (b: number) => b * (has(r, 'sight') ? 1.15 : 1);
  if (t.id === 'archer') {
    const m = has(r, 'arrows') ? 1.3 : 1;
    if (s === 'longbow') return { dmg: 48 * m, rate: 1.35, range: range(175), targets: 1, crit: 0.25 };
    if (s === 'volley') return { dmg: 17 * m, rate: 0.8, range: range(135), targets: 3, crit: 0 };
    return { dmg: [8, 13, 20][L - 1] * m, rate: 0.75, range: range([110, 120, 130][L - 1]), targets: 1, crit: 0 };
  }
  if (t.id === 'mage') {
    const m = has(r, 'arcane') ? 1.3 : 1;
    if (s === 'storm') return { dmg: 50 * m, rate: 1.4, range: range(118), splash: 0, chain: 4, slow: 0 };
    if (s === 'frost') return { dmg: 42 * m, rate: 1.5, range: range(110), splash: 52, chain: 0, slow: 0.45 };
    return { dmg: [16, 26, 40][L - 1] * m, rate: 1.5, range: range([95, 100, 108][L - 1]), splash: 36, chain: 0, slow: 0 };
  }
  if (t.id === 'fire') {
    const m = has(r, 'coal') ? 1.35 : 1;
    if (s === 'inferno') return { rate: 2.0, range: range(110), r: 54, dps: 42 * m, slow: 0 };
    if (s === 'smoke') return { rate: 1.9, range: range(110), r: 48, dps: 26 * m, slow: 0.5 };
    return { rate: [2.2, 2.0, 1.8][L - 1], range: range([100, 104, 108][L - 1]), r: [34, 38, 42][L - 1], dps: [10, 16, 24][L - 1] * m, slow: 0 };
  }
  // barracks
  const hpM = has(r, 'drill') ? 1.5 : 1, dM = has(r, 'drill') ? 1.25 : 1;
  if (s === 'knights') return { hp: 260 * hpM, dmg: 14 * dM, armour: 0.4, heal: 0, range: 70 };
  if (s === 'paladins') return { hp: 180 * hpM, dmg: 16 * dM, armour: 0.15, heal: 12, range: 70 };
  return { hp: [55, 85, 120][L - 1] * hpM, dmg: [5, 8, 12][L - 1] * dM, armour: 0, heal: 0, range: 65 };
}

// ---------- Building ----------
export type Act = { ok: true } | { ok: false; why: string };
const no = (why: string): Act => ({ ok: false, why });

/** Where a barracks' soldiers stand: the nearest bit of road. */
function rallyFor(r: Run, pad: number) {
  const [px, py] = padsOf(r.region)[pad];
  const n = nearestOnPath(roadOf(r.region), px, py);
  return { x: n.x, y: n.y };
}
function makeSoldiers(r: Run, pad: number) {
  const t = r.towers[pad];
  r.soldiers = r.soldiers.filter((s) => s.pad !== pad);
  if (!t || t.id !== 'barracks') return;
  const st = towerStats(r, t) as { hp: number; dmg: number; armour: number; heal: number };
  const home = rallyFor(r, pad);
  const emoji = t.spec === 'knights' ? '🛡️' : t.spec === 'paladins' ? '😇' : '💂';
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const hx = home.x + Math.cos(a) * 12, hy = home.y + Math.sin(a) * 12;
    r.soldiers.push({ uid: r.nextUid++, pad, x: hx, y: hy, hx, hy, hp: st.hp, max: st.hp, dmg: st.dmg, cd: 0, target: null, deadUntil: 0, emoji, armour: st.armour, heal: st.heal });
  }
}

export function build(r: Run, pad: number, id: TowerId): Act {
  if (r.towers[pad]) return no('Something is already built there.');
  const c = buildCost(r, id);
  if (r.gold < c) return no(`You need ${c} gold.`);
  r.gold -= c;
  r.towers[pad] = { id, level: 1, cd: 0.3, spent: c };
  if (id === 'barracks') makeSoldiers(r, pad);
  return { ok: true };
}
export function upgrade(r: Run, pad: number): Act {
  const t = r.towers[pad];
  if (!t) return no('Nothing built there.');
  const c = upgradeCost(r, t);
  if (c === null) return no('Fully upgraded — pick a specialisation.');
  if (r.gold < c) return no(`You need ${c} gold.`);
  r.gold -= c; t.spent += c; t.level += 1;
  if (t.id === 'barracks') makeSoldiers(r, pad);
  return { ok: true };
}
export function specialise(r: Run, pad: number, spec: SpecId): Act {
  const t = r.towers[pad];
  if (!t) return no('Nothing built there.');
  const c = specCost(r, t);
  if (c === null || !TOWERS[t.id].specs.includes(spec)) return no('Not yet.');
  if (r.gold < c) return no(`You need ${c} gold.`);
  r.gold -= c; t.spent += c; t.spec = spec;
  if (t.id === 'barracks') makeSoldiers(r, pad);
  return { ok: true };
}
export function sell(r: Run, pad: number): Act {
  const t = r.towers[pad];
  if (!t) return no('Nothing built there.');
  r.gold += sellValue(r, t);
  r.towers[pad] = null;
  r.soldiers = r.soldiers.filter((s) => s.pad !== pad);
  for (const m of r.monsters) if (m.blockedBy !== null && !r.soldiers.some((s) => s.uid === m.blockedBy)) m.blockedBy = null;
  return { ok: true };
}

/** Send the Captain to a spot on the road. */
export function moveHero(r: Run, x: number, y: number) {
  const n = nearestOnPath(roadOf(r.region), x, y);
  r.hero.tx = n.x; r.hero.ty = n.y;
  if (r.hero.target !== null) { const m = r.monsters.find((q) => q.uid === r.hero.target); if (m && m.blockedBy === -1) m.blockedBy = null; r.hero.target = null; }
}

export const ROCK_COOLDOWN = 40;
export const MILITIA_COOLDOWN = 26;
export const rockCooldown = (r: Run) => ROCK_COOLDOWN * (has(r, 'rocks') ? 0.65 : 1);
export function castRock(r: Run, x: number, y: number): Act {
  if (r.t < r.spells.rock) return no('Rockfall is still recharging.');
  if (r.phase !== 'wave' && r.phase !== 'build') return no('Not now.');
  r.spells.rock = r.t + rockCooldown(r);
  const n = 3 + (has(r, 'rocks') ? 2 : 0);
  for (let i = 0; i < n; i++) {
    const a = rand(r) * Math.PI * 2, d = i === 0 ? 0 : 16 + rand(r) * 22;
    r.fx.push({ kind: 'rock', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, t: 0, life: 0.7 + i * 0.08, r: 40, at: 0.55 + i * 0.08 });
  }
  r.events.push({ type: 'rock' });
  return { ok: true };
}
export function castMilitia(r: Run, x: number, y: number): Act {
  if (r.t < r.spells.militia) return no('The militia are still resting.');
  r.spells.militia = r.t + MILITIA_COOLDOWN;
  const n = nearestOnPath(roadOf(r.region), x, y);
  const hp = 70 + r.wave * 14;
  for (let i = 0; i < 2; i++) {
    const hx = n.x + (i ? 10 : -10), hy = n.y;
    r.soldiers.push({ uid: r.nextUid++, pad: -1, x: hx, y: hy, hx, hy, hp, max: hp, dmg: 6 + r.wave, cd: 0, target: null, deadUntil: 0, until: r.t + 18, emoji: '🧑‍🌾', armour: 0, heal: 0 });
  }
  r.events.push({ type: 'militia' });
  return { ok: true };
}

// ---------- Waves ----------
export const TUNE = { scale: 0.42, curve: 0.012, hp: 46, speed: 1.0 };
const waveScale = (w: number) => 1 + TUNE.scale * (w - 1) + TUNE.curve * (w - 1) ** 2;
const HP0 = () => TUNE.hp;
function planWave(r: Run, w: number) {
  const q: [number, number, boolean, boolean][] = [];
  const n = 5 + Math.round(1.6 * w);
  const unlocked = Math.min(4, Math.floor((w - 1) / 2));
  let t = r.t + 0.5;
  for (let i = 0; i < n; i++) {
    // Monsters come in little groups of the same kind.
    const v = i % 4 === 0 ? Math.floor(rand(r) * (unlocked + 1)) : q.length ? q[q.length - 1][1] : 0;
    q.push([t, v, false, false]);
    t += ROLES[v] === 'fast' ? 0.45 : ROLES[v] === 'brute' ? 1.3 : 0.8;
  }
  if (w === 5 || w === 10) q.push([t + 1, Math.min(4, unlocked), true, false]);
  if (w === WAVES) q.push([t + 2, 4, false, true]);
  return q;
}
export function startWave(r: Run) {
  const ready = (r.phase === 'build' && r.wave === 0) || (r.phase === 'wave' && !r.queue.length && r.nextWaveAt !== null);
  if (!ready || r.wave >= WAVES || r.choices) return;
  // Calling a wave early pays a little bonus.
  if (r.nextWaveAt !== null && r.nextWaveAt > r.t) r.gold += Math.floor((r.nextWaveAt - r.t) * 3);
  r.wave += 1;
  r.phase = 'wave';
  r.nextWaveAt = null;
  r.queue = planWave(r, r.wave);
  r.events.push({ type: 'wave', n: r.wave });
  r.banner = r.wave === WAVES ? { text: `👹 The ${r.boss.name} is coming!`, until: r.t + 3 } : { text: `🌊 Wave ${r.wave} of ${WAVES}`, until: r.t + 2 };
  // The Captain toughens up a little every wave.
  const nm = heroMax(r);
  r.hero.hp = Math.max(1, r.hero.hp + nm - r.hero.max);
  r.hero.max = nm;
}
function spawn(r: Run, v: number, elite: boolean, boss: boolean) {
  const road = roadOf(r.region);
  const role = boss ? 'brute' : ROLES[v];
  const R = ROLE[role];
  const s = waveScale(r.wave);
  let hp = HP0() * R.hp * s * (1 + 0.1 * v);
  if (elite) hp *= 7;
  if (boss) hp = HP0() * s * 55;
  const [x, y] = posAt(road, 0);
  r.monsters.push({
    uid: r.nextUid++, v, role, emoji: boss ? r.boss.emoji : r.kinds[v].emoji, name: boss ? r.boss.name : r.kinds[v].name, boss, elite,
    hp, max: hp, speed: (boss ? 20 : R.speed * (elite ? 0.85 : 1)) * TUNE.speed * 1.19 * Math.sqrt(road.len / 1550), armour: boss ? 0.3 : R.armour,
    gold: Math.round((boss ? 250 : R.gold * 1.25 * (elite ? 8 : 1)) + Math.floor(r.wave / 2)), lives: boss ? 8 : elite ? 5 : R.lives,
    dmg: (4 + r.wave * 1.1) * R.dmg * (boss ? 6 : elite ? 3 : 1), r: boss ? 26 : elite ? 19 : R.r,
    d: 0, x, y, cd: 0, slowUntil: 0, slowPct: 0, blockedBy: null, hitFlash: 0,
  });
}
export function pickCharter(r: Run, c: CharterId) {
  if (!r.choices?.includes(c)) return;
  r.charters.push(c);
  r.choices = null;
  if (c === 'walls') r.lives += 6;
  if (c === 'drill') r.towers.forEach((t, i) => { if (t?.id === 'barracks') makeSoldiers(r, i); });
  if (c === 'captain') { r.hero.max = heroMax(r); r.hero.hp = r.hero.max; }
  r.events.push({ type: 'charter' });
}
function offerCharters(r: Run) {
  const pool = (Object.keys(CHARTERS) as CharterId[]).filter((c) => !r.charters.includes(c));
  const out: CharterId[] = [];
  while (pool.length && out.length < 3) out.push(pool.splice(Math.floor(rand(r) * pool.length), 1)[0]);
  r.choices = out;
}

// ---------- Damage ----------
function hurt(r: Run, m: Monster, n: number, type: 'phys' | 'magic' | 'fire', from: XpKind) {
  if (m.hp <= 0) return;
  const mult = type === 'phys' ? 1 - m.armour : type === 'fire' ? 1 - m.armour * 0.4 : 1;
  const d = Math.max(0.5, n * mult);
  const real = Math.min(m.hp, d);
  m.hp -= d;
  m.hitFlash = 0.12;
  r.dmg[from] += real;
}
function damageSoldier(s: { hp: number; armour: number }, n: number) { s.hp -= n * (1 - s.armour); }
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

// ---------- The simulation ----------
export function step(r: Run, dt: number) {
  if (r.phase === 'won' || r.phase === 'lost' || r.choices) return;
  r.t += dt;
  const road = roadOf(r.region);
  const pads = padsOf(r.region);
  if (r.banner && r.t > r.banner.until) r.banner = null;

  // Between waves: a countdown (or press the button to call it early).
  if (r.nextWaveAt !== null && r.t >= r.nextWaveAt) startWave(r);

  // Spawning
  while (r.queue.length && r.queue[0][0] <= r.t) { const [, v, e, b] = r.queue.shift()!; spawn(r, v, e, b); }

  // Monsters walk the road (unless a soldier is holding them).
  const alive = new Map(r.monsters.map((m) => [m.uid, m]));
  for (const m of r.monsters) {
    m.hitFlash = Math.max(0, m.hitFlash - dt);
    if (m.blockedBy !== null) {
      const s = m.blockedBy === -1 ? (r.hero.deadUntil > r.t ? null : r.hero) : r.soldiers.find((q) => q.uid === m.blockedBy && q.deadUntil <= r.t);
      if (!s) { m.blockedBy = null; } else {
        // Held: it fights whoever is holding it (but only once they've reached it).
        if (dist(s.x, s.y, m.x, m.y) < m.r + 14) {
          m.cd -= dt;
          if (m.cd <= 0) { m.cd = 1; if (m.blockedBy === -1) r.hero.hp -= m.dmg; else damageSoldier(s as Soldier, m.dmg); }
        }
        continue;
      }
    }
    const slow = m.slowUntil > r.t ? 1 - m.slowPct : 1;
    m.d += m.speed * slow * dt;
    [m.x, m.y] = posAt(road, m.d);
    if (m.d >= road.len) {
      m.hp = 0;
      r.lives -= m.lives;
      r.leaks += 1;
      r.events.push({ type: 'leak', lives: m.lives });
    }
  }

  // Burning ground
  for (const p of r.pools) for (const m of r.monsters) if (dist(p.x, p.y, m.x, m.y) < p.r + m.r * 0.5) {
    hurt(r, m, p.dps * dt, 'fire', 'magic');
    if (p.slow) { m.slowPct = Math.max(m.slowUntil > r.t ? m.slowPct : 0, p.slow); m.slowUntil = r.t + 0.3; }
  }
  r.pools = r.pools.filter((p) => p.until > r.t);

  // Towers
  const targetsIn = (x: number, y: number, range: number) =>
    r.monsters.filter((m) => m.hp > 0 && dist(x, y, m.x, m.y) <= range).sort((a, b) => b.d - a.d);
  r.towers.forEach((t, i) => {
    if (!t || t.id === 'barracks') return;
    t.cd -= dt;
    if (t.cd > 0) return;
    const [px, py] = pads[i];
    const st = towerStats(r, t) as unknown as Record<string, number>;
    const ms = targetsIn(px, py - 14, st.range);
    if (!ms.length) { t.cd = 0.1; return; }
    t.cd = st.rate;
    r.events.push({ type: 'shoot', tower: t.id });
    if (t.id === 'archer') {
      for (const m of ms.slice(0, st.targets)) {
        const crit = st.crit && rand(r) < st.crit;
        r.shots.push({ kind: 'arrow', x: px, y: py - 18, tx: m.x, ty: m.y, target: m.uid, speed: 420, dmg: st.dmg * (crit ? 2.5 : 1), type: 'phys', splash: 0, from: 'ranged' });
      }
    } else if (t.id === 'mage') {
      if (st.chain) {
        // Lightning jumps from monster to monster.
        let cur = ms[0], dmg = st.dmg, fx = px, fy = py - 20;
        const hit = new Set<number>();
        for (let j = 0; j < st.chain && cur; j++) {
          hurt(r, cur, dmg, 'magic', 'magic');
          r.fx.push({ kind: 'zap', x: fx, y: fy, x2: cur.x, y2: cur.y, t: 0, life: 0.25 });
          hit.add(cur.uid); fx = cur.x; fy = cur.y; dmg *= 0.85;
          cur = r.monsters.filter((m) => m.hp > 0 && !hit.has(m.uid) && dist(fx, fy, m.x, m.y) < 80).sort((a, b) => dist(fx, fy, a.x, a.y) - dist(fx, fy, b.x, b.y))[0];
        }
        r.events.push({ type: 'zap' });
      } else {
        r.shots.push({ kind: 'orb', x: px, y: py - 20, tx: ms[0].x, ty: ms[0].y, target: ms[0].uid, speed: 230, dmg: st.dmg, type: 'magic', splash: st.splash, from: 'magic', slow: st.slow });
      }
    } else if (t.id === 'fire') {
      const m = ms[0];
      // Aim a little ahead of the monster.
      const [ax, ay] = posAt(road, m.d + m.speed * 0.7);
      r.shots.push({ kind: 'pot', x: px, y: py - 16, tx: ax, ty: ay, target: -1, speed: 190, dmg: 0, type: 'fire', splash: 0, from: 'magic', pool: { r: st.r, dps: st.dps, slow: st.slow } });
    }
  });

  // Shots fly
  for (const s of r.shots) {
    const m = s.target >= 0 ? alive.get(s.target) : undefined;
    if (m && m.hp > 0) { s.tx = m.x; s.ty = m.y; }
    const dx = s.tx - s.x, dy = s.ty - s.y, l = Math.hypot(dx, dy);
    const mv = s.speed * dt;
    if (l > mv) { s.x += (dx / l) * mv; s.y += (dy / l) * mv; continue; }
    s.x = s.tx; s.y = s.ty; s.speed = 0;
    if (s.pool) { r.pools.push({ x: s.x, y: s.y, r: s.pool.r, dps: s.pool.dps, until: r.t + 2.6, slow: s.pool.slow }); r.fx.push({ kind: 'boom', x: s.x, y: s.y, t: 0, life: 0.3, r: s.pool.r }); continue; }
    if (s.splash) {
      for (const q of r.monsters) if (q.hp > 0 && dist(s.x, s.y, q.x, q.y) <= s.splash) {
        hurt(r, q, s.dmg, s.type, s.from);
        if (s.slow) { q.slowUntil = r.t + 2; q.slowPct = s.slow; }
      }
      r.fx.push({ kind: s.slow ? 'frost' : 'boom', x: s.x, y: s.y, t: 0, life: 0.3, r: s.splash });
    } else if (m && m.hp > 0) {
      hurt(r, m, s.dmg, s.type, s.from);
      if (s.dmg >= 60) r.fx.push({ kind: 'num', x: m.x, y: m.y - 14, t: 0, life: 0.7, v: String(Math.round(s.dmg)) });
    }
    r.events.push({ type: 'hit' });
  }
  r.shots = r.shots.filter((s) => s.speed > 0);

  // Soldiers (and militia) hold the road.
  const rallyD = 70;
  for (const s of r.soldiers) {
    if (s.deadUntil > r.t) continue;
    if (s.deadUntil && s.hp <= 0) { s.hp = s.max; s.x = s.hx; s.y = s.hy; s.deadUntil = 0; }
    let m = s.target !== null ? alive.get(s.target) : undefined;
    if (!m || m.hp <= 0 || m.blockedBy !== s.uid) {
      s.target = null; m = undefined;
      const free = r.monsters.filter((q) => q.hp > 0 && q.role !== 'flier' && (q.blockedBy === null) && dist(s.hx, s.hy, q.x, q.y) < rallyD)
        .sort((a, b) => b.d - a.d)[0];
      // If everyone nearby is held, help out with someone already held.
      const any = free ?? r.monsters.filter((q) => q.hp > 0 && q.role !== 'flier' && dist(s.hx, s.hy, q.x, q.y) < rallyD).sort((a, b) => b.d - a.d)[0];
      if (any) { s.target = any.uid; m = any; if (any.blockedBy === null) any.blockedBy = s.uid; }
    }
    if (m) {
      const d = dist(s.x, s.y, m.x, m.y);
      if (d > m.r + 8) { const k = Math.min(1, (60 * dt) / d); s.x += (m.x - s.x) * k; s.y += (m.y - s.y) * k; } else {
        s.cd -= dt;
        if (s.cd <= 0) { s.cd = 1; hurt(r, m, s.dmg, 'phys', 'melee'); }
      }
    } else {
      const d = dist(s.x, s.y, s.hx, s.hy);
      if (d > 2) { const k = Math.min(1, (60 * dt) / d); s.x += (s.hx - s.x) * k; s.y += (s.hy - s.y) * k; }
      if (s.heal || s.pad >= 0) s.hp = Math.min(s.max, s.hp + (s.heal || 4) * dt);
    }
    if (s.heal && m) s.hp = Math.min(s.max, s.hp + s.heal * dt);
    if (s.hp <= 0) {
      s.deadUntil = r.t + 10;
      for (const q of r.monsters) if (q.blockedBy === s.uid) q.blockedBy = null;
      s.target = null;
    }
  }
  r.soldiers = r.soldiers.filter((s) => s.until === undefined || (s.until > r.t && s.deadUntil === 0));

  // The Captain
  const h = r.hero;
  {
    if (h.deadUntil > r.t) { /* resting */ } else {
      if (h.deadUntil && h.hp <= 0) { h.hp = h.max; h.deadUntil = 0; }
      const dm = (h.style === 'melee' ? 34 : h.style === 'ranged' ? 18 : 22) * (1 + r.wave * 0.08) * (has(r, 'captain') ? 1.5 : 1);
      const moving = dist(h.x, h.y, h.tx, h.ty) > 3;
      if (moving) {
        const d = dist(h.x, h.y, h.tx, h.ty), k = Math.min(1, (95 * dt) / d);
        h.x += (h.tx - h.x) * k; h.y += (h.ty - h.y) * k;
        if (h.target !== null) { const m = alive.get(h.target); if (m && m.blockedBy === -1) m.blockedBy = null; h.target = null; }
      } else {
        // Hold one monster on the road, and fight.
        let m = h.target !== null ? alive.get(h.target) : undefined;
        if (!m || m.hp <= 0) {
          h.target = null;
          m = r.monsters.filter((q) => q.hp > 0 && q.role !== 'flier' && q.blockedBy === null && dist(h.x, h.y, q.x, q.y) < 40).sort((a, b) => b.d - a.d)[0];
          if (m) { h.target = m.uid; m.blockedBy = -1; }
        }
        h.cd -= dt;
        if (h.cd <= 0) {
          if (h.style === 'melee') {
            // A sweeping blow: the held monster, and a glancing hit on anything right next to it.
            if (m && dist(h.x, h.y, m.x, m.y) < 52) {
              h.cd = 0.9;
              hurt(r, m, dm, 'phys', 'melee');
              for (const q of r.monsters) if (q !== m && q.hp > 0 && dist(m.x, m.y, q.x, q.y) < 26) hurt(r, q, dm * 0.5, 'phys', 'melee');
              r.fx.push({ kind: 'boom', x: m.x, y: m.y, t: 0, life: 0.2, r: 18 });
            } else {
              // Nothing to hold (or a flier overhead): throw a hatchet.
              const tgt = r.monsters.filter((q) => q.hp > 0 && dist(h.x, h.y, q.x, q.y) < 110).sort((a, b) => b.d - a.d)[0];
              if (tgt) { h.cd = 1.0; r.shots.push({ kind: 'axe', x: h.x, y: h.y - 8, tx: tgt.x, ty: tgt.y, target: tgt.uid, speed: 300, dmg: dm * 0.7, type: 'phys', splash: 0, from: 'melee' }); }
            }
          } else {
            const range = h.style === 'ranged' ? 135 : 115;
            const tgt = r.monsters.filter((q) => q.hp > 0 && dist(h.x, h.y, q.x, q.y) < range).sort((a, b) => b.d - a.d)[0];
            if (tgt) {
              h.cd = h.style === 'ranged' ? 0.8 : 1.3;
              r.shots.push(h.style === 'ranged'
                ? { kind: 'arrow', x: h.x, y: h.y - 8, tx: tgt.x, ty: tgt.y, target: tgt.uid, speed: 420, dmg: dm, type: 'phys', splash: 0, from: 'ranged' }
                : { kind: 'hero', x: h.x, y: h.y - 8, tx: tgt.x, ty: tgt.y, target: tgt.uid, speed: 260, dmg: dm, type: 'magic', splash: 30, from: 'magic' });
            }
          }
        }
        if (!m && h.hp < h.max) h.hp = Math.min(h.max, h.hp + 10 * dt);
      }
      if (h.hp <= 0) {
        h.deadUntil = r.t + 14;
        for (const q of r.monsters) if (q.blockedBy === -1) q.blockedBy = null;
        h.target = null;
      }
    }
  }

  // Rockfall lands
  for (const f of r.fx) {
    if (f.kind === 'rock' && f.at !== undefined && f.t < f.at && f.t + dt >= f.at) {
      for (const m of r.monsters) if (m.hp > 0 && dist(f.x, f.y, m.x, m.y) < (f.r ?? 40)) hurt(r, m, 55 + r.wave * 9, 'phys', 'melee');
    }
    f.t += dt;
  }
  r.fx = r.fx.filter((f) => f.t < f.life);

  // The fallen
  const left: Monster[] = [];
  for (const m of r.monsters) {
    if (m.hp > 0) { left.push(m); continue; }
    for (const s of r.soldiers) if (s.target === m.uid) s.target = null;
    if (h.target === m.uid) h.target = null;
    if (m.d >= road.len) continue; // got through the gate
    r.kills += 1;
    r.gold += Math.round(m.gold * (has(r, 'bounty') ? 1.3 : 1));
    r.fx.push({ kind: 'num', x: m.x, y: m.y - 10, t: 0, life: 0.6, v: `+${Math.round(m.gold * (has(r, 'bounty') ? 1.3 : 1))}` });
    r.events.push({ type: 'kill', boss: m.boss });
  }
  r.monsters = left;

  if (r.lives <= 0) { r.lives = 0; r.phase = 'lost'; r.events.push({ type: 'lost' }); return; }

  // The last wave beaten: the wall held!
  if (r.phase === 'wave' && r.wave >= WAVES && !r.queue.length && !r.monsters.length) { r.phase = 'won'; r.events.push({ type: 'won' }); return; }
  // Everyone in this wave has arrived: the next wave's countdown starts (waves can overlap).
  if (r.phase === 'wave' && r.wave < WAVES && !r.queue.length && r.nextWaveAt === null) {
    const bonus = 20 + 5 * r.wave;
    r.gold += bonus;
    if (has(r, 'interest')) r.gold += Math.min(90, Math.floor(r.gold * 0.12));
    r.nextWaveAt = r.t + BREAK_SECONDS;
    r.events.push({ type: 'clear' });
    r.banner = { text: `✅ Wave ${r.wave} is all here · +${bonus} gold`, until: r.t + 2.5 };
    if (CHARTER_WAVES.includes(r.wave)) offerCharters(r);
  }
}

// ---------- Saving ----------
export function saveRun(r: Run) { const { events: _e, ...rest } = r; return JSON.stringify({ ...rest, events: [] }); }
export function loadRun(raw: string | null): Run | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Run;
    if (r?.v !== 1 || (r.phase !== 'build' && r.phase !== 'wave')) return null;
    r.events = [];
    return r;
  } catch { return null; }
}

// ---------- Rewards ----------
/** Combat XP for holding the wall: about the pace of your tier per wave, with a big bonus for holding to the end. */
export function wallXp(styleLevel: number, waves: number, won: boolean) {
  const perSecond = gatherXpPerHour(tierForLevel(styleLevel)) / 3600;
  const w = Math.max(0, Math.min(WAVES, waves));
  const combat = Math.round(perSecond * w * 80 * (won ? 1.5 : 1));
  return { combat, defense: Math.round(combat / 4) };
}
/** Waves fully held (the one you were on doesn't count unless you won). */
export const wavesHeld = (r: Run) => (r.phase === 'won' ? WAVES : Math.max(0, r.wave - (r.phase === 'wave' || r.phase === 'lost' ? 1 : 0)));
