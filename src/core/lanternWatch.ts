// 🏮 Lantern Watch — a survivor mode (Combat). Night falls on the town you're in; hold the lantern
// while that town's monsters pour out of the dark. Your attacks fire by themselves — you only steer.
// Every level-up pauses the night and offers 3 power-ups (new weapons, weapon upgrades, or passives).
// At dawn (10:00) the town's great beast arrives; beat it to win. Being knocked out just ends the night —
// you keep everything you earned. This file is the whole game engine (no drawing), so it can be tested.
import { gatherXpPerHour, tierForLevel } from '../data/tiers';
import { MONSTERS, type MonsterDef } from '../data/monsters';

export type Style = 'melee' | 'ranged' | 'magic';
export const NIGHT_SECONDS = 600;

// ---------- Power-ups ----------
export type WeaponId = 'sword' | 'arrows' | 'bolt' | 'ring' | 'glow' | 'storm' | 'pet' | 'nova' | 'hatchet';
export type PassiveId = 'boots' | 'stew' | 'tonic' | 'hands' | 'magpie' | 'shield' | 'wide' | 'herbs' | 'clover';
export const MAX_WEAPONS = 5;
export const MAX_PASSIVES = 5;
export const MAX_LEVEL = 5;

export const WEAPONS: Record<WeaponId, { name: string; emoji: string; text: string; up: string }> = {
  sword: { name: 'Sword Sweep', emoji: '🗡️', text: 'Slashes a wide arc in front of you', up: 'Bigger, harder slashes' },
  arrows: { name: 'Arrow Volley', emoji: '🏹', text: 'Shoots the nearest monster', up: 'More arrows, more damage' },
  bolt: { name: 'Spark Bolt', emoji: '✨', text: 'Homing sparks of magic', up: 'More sparks, more damage' },
  ring: { name: 'Ember Ring', emoji: '🔥', text: 'Embers circle around you', up: 'One more ember, hotter' },
  glow: { name: 'Lantern Glow', emoji: '🏮', text: 'Your light burns monsters close by', up: 'Wider, brighter light' },
  storm: { name: 'Storm Rune', emoji: '⚡', text: 'Lightning strikes monsters nearby', up: 'More strikes, more damage' },
  pet: { name: 'Loyal Companion', emoji: '🐾', text: 'Your pet pounces on monsters', up: 'Faster, fiercer pounces' },
  nova: { name: 'Frost Nova', emoji: '❄️', text: 'A ring of frost that slows monsters', up: 'Wider ring, more damage' },
  hatchet: { name: 'Tumbling Hatchet', emoji: '🪓', text: 'Hatchets arc up and crash down', up: 'More hatchets, more damage' },
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
};

export type Choice =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  | { kind: 'meal' } | { kind: 'coins' };

// ---------- The night ----------
export interface Kind { name: string; emoji: string; hp: number; speed: number; dmg: number; r: number; unlockAt: number; light: number }
export interface Enemy {
  id: number; k: number; x: number; y: number; hp: number; max: number; speed: number; dmg: number; r: number;
  elite?: boolean; boss?: boolean; slowUntil: number; flash: number; touchCd: number; ringCd: number; glowCd: number;
}
export interface Shot {
  kind: 'arrow' | 'bolt' | 'hatchet'; x: number; y: number; vx: number; vy: number; dmg: number; r: number;
  pierce: number; life: number; hit: number[]; target?: number;
}
export interface Pickup { x: number; y: number; kind: 'light' | 'meal' | 'magnet' | 'chest'; v: number; pulled?: boolean }
export interface Fx { kind: 'slash' | 'strike' | 'nova' | 'pounce' | 'boom'; x: number; y: number; a: number; r: number; t: number; life: number }
export type LwEvent =
  | { type: 'hit'; boss?: boolean } | { type: 'kill'; elite?: boolean } | { type: 'hurt' } | { type: 'light' }
  | { type: 'level' } | { type: 'meal' } | { type: 'chest' } | { type: 'boss' } | { type: 'won' } | { type: 'lost' } | { type: 'fire'; w: WeaponId };

export interface Run {
  t: number;
  phase: 'play' | 'won' | 'lost';
  region: string;
  kinds: Kind[];
  boss: Kind;
  bossSpawned: boolean;
  px: number; py: number; face: number; moving: boolean;
  hp: number; maxHp: number; touchFlash: number;
  level: number; xp: number; need: number;
  /** Level-ups waiting to be picked (each one shows a choice of 3). */
  pending: number;
  choices: Choice[] | null;
  weapons: { id: WeaponId; level: number; cd: number }[];
  passives: { id: PassiveId; level: number }[];
  enemies: Enemy[]; shots: Shot[]; pickups: Pickup[]; fx: Fx[];
  pet: { x: number; y: number; cd: number; target: number | null; emoji: string };
  kills: number; coins: number; mealsFound: number;
  spawnAcc: number; nextElite: number; nextRing: number;
  view: { w: number; h: number };
  head: { dmg: number };
  events: LwEvent[];
  nextId: number;
  rng: () => number;
}

const ART_EMOJI: Record<MonsterDef['art'], string> = {
  rat: '🐀', sprite: '🧚', bandit: '🥷', boar: '🐗', bear: '🐻', treant: '🌳', crab: '🦀', bird: '🦅', ghost: '👻',
  goat: '🐐', lizard: '🦎', tortoise: '🐢', wyrm: '🐉',
};

/** The monsters of a town, weakest first, plus its great beast for dawn. */
export function nightMonsters(region: string): { kinds: Kind[]; boss: Kind } {
  const all = MONSTERS.filter((m) => m.region === region && !m.weekly);
  const mobs = all.filter((m) => !m.miniboss).sort((a, b) => a.level - b.level);
  const big = all.find((m) => m.miniboss) ?? mobs[mobs.length - 1];
  const list = mobs.length ? mobs : MONSTERS.filter((m) => m.region === 'Pocketvale' && !m.miniboss);
  const n = list.length;
  const kinds = list.map((m, k): Kind => ({
    name: m.name, emoji: ART_EMOJI[m.art] ?? '👾',
    hp: Math.round(9 * (1 + k * 0.9)), speed: 50 + (k % 2 ? 10 : 0) - k * 2, dmg: 5 + k * 3, r: 12 + k * 2,
    unlockAt: Math.round((k * 420) / Math.max(1, n - 1 || 1)) * (n > 1 ? 1 : 0), light: 1 + k,
  }));
  const boss: Kind = { name: big.name, emoji: ART_EMOJI[big.art] ?? '👹', hp: 3400, speed: 40, dmg: 22, r: 36, unlockAt: NIGHT_SECONDS, light: 40 };
  return { kinds, boss };
}

const START_WEAPON: Record<Style, WeaponId> = { melee: 'sword', ranged: 'arrows', magic: 'bolt' };

export interface LwInit { region: string; style: Style; styleLevel: number; healthLevel: number; petEmoji?: string; rng?: () => number }

export function newRun(o: LwInit): Run {
  const { kinds, boss } = nightMonsters(o.region);
  // A small head start from your real character (the night itself is the fun part).
  const maxHp = 100 + Math.min(60, Math.floor(o.healthLevel / 5));
  return {
    t: 0, phase: 'play', region: o.region, kinds, boss, bossSpawned: false,
    px: 0, py: 0, face: 0, moving: false, hp: maxHp, maxHp, touchFlash: 0,
    level: 1, xp: 0, need: needFor(1), pending: 0, choices: null,
    weapons: [{ id: START_WEAPON[o.style], level: 1, cd: 0.5 }], passives: [],
    enemies: [], shots: [], pickups: [], fx: [],
    pet: { x: 0, y: 0, cd: 0, target: null, emoji: o.petEmoji ?? '🐕' },
    kills: 0, coins: 0, mealsFound: 0, spawnAcc: 0, nextElite: 90, nextRing: 120,
    view: { w: 400, h: 720 }, head: { dmg: 1 + Math.min(0.25, o.styleLevel / 2000) }, events: [], nextId: 1, rng: o.rng ?? Math.random,
  };
}

/** Light needed to go from `level` to the next. */
export const needFor = (level: number) => 4 + level * 2 + Math.floor(level ** 1.3);

// ---------- Derived stats ----------
const pl = (r: Run, id: PassiveId) => r.passives.find((p) => p.id === id)?.level ?? 0;
export function stats(r: Run) {
  return {
    dmg: r.head.dmg * (1 + 0.1 * pl(r, 'tonic')),
    cd: 1 - 0.07 * pl(r, 'hands'),
    area: 1 + 0.1 * pl(r, 'wide'),
    speed: 115 * (1 + 0.08 * pl(r, 'boots')),
    magnet: 55 * (1 + 0.3 * pl(r, 'magpie')),
    armor: pl(r, 'shield'),
    regen: 0.4 * pl(r, 'herbs'),
    crit: 0.06 * pl(r, 'clover'),
  };
}

// ---------- Level-ups ----------
/** Three different power-ups to choose from (new weapons, upgrades, passives). */
export function rollChoices(r: Run): Choice[] {
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
  // Upgrades of what you already have show up a bit more often.
  const weight = (c: Choice) => (c.kind === 'weapon' || c.kind === 'passive') && c.level > 1 ? 1.6 : 1;
  while (out.length < 3 && pool.length) {
    const total = pool.reduce((s, c) => s + weight(c), 0);
    let x = r.rng() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) { x -= weight(pool[i]); if (x <= 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  // Everything maxed out: a hot meal or a pouch of coins.
  if (out.length < 3) out.push({ kind: 'meal' });
  if (out.length < 3) out.push({ kind: 'coins' });
  return out;
}

export function choose(r: Run, c: Choice) {
  if (!r.choices) return;
  if (c.kind === 'weapon') {
    const w = r.weapons.find((x) => x.id === c.id);
    if (w) w.level = Math.min(MAX_LEVEL, w.level + 1); else r.weapons.push({ id: c.id, level: 1, cd: 0.2 });
  } else if (c.kind === 'passive') {
    const p = r.passives.find((x) => x.id === c.id);
    if (p) p.level = Math.min(MAX_LEVEL, p.level + 1); else r.passives.push({ id: c.id, level: 1 });
    if (c.id === 'stew') { r.maxHp += 20; r.hp = Math.min(r.maxHp, r.hp + 20); }
  } else if (c.kind === 'meal') {
    r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.3);
  } else {
    r.coins += 25 + r.level * 5;
  }
  r.pending -= 1;
  r.choices = r.pending > 0 ? rollChoices(r) : null;
}

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

function damage(r: Run, e: Enemy, amount: number) {
  if (e.hp <= 0) return;
  const s = stats(r);
  let dmg = amount * s.dmg;
  if (s.crit && r.rng() < s.crit) dmg *= 2;
  e.hp -= dmg;
  e.flash = 0.12;
  r.events.push({ type: 'hit', boss: e.boss });
}

function spawnAt(r: Run, kind: Kind, k: number, angle: number, extra = 0, opts: { elite?: boolean; boss?: boolean } = {}) {
  const rad = Math.hypot(r.view.w, r.view.h) / 2 + 30 + extra;
  const minutes = r.t / 60;
  const scale = opts.boss ? 1 : 1 + minutes * 0.25 + Math.max(0, minutes - 5) * 0.3;
  const hp = Math.round(kind.hp * scale * (opts.elite ? 7 : 1));
  r.enemies.push({
    id: r.nextId++, k, x: r.px + Math.cos(angle) * rad, y: r.py + Math.sin(angle) * rad,
    hp, max: hp, speed: kind.speed * (opts.elite ? 0.85 : 1) * (0.9 + r.rng() * 0.2), dmg: kind.dmg * (opts.elite ? 1.6 : 1) + Math.floor(minutes * 1.1),
    r: kind.r * (opts.elite ? 1.7 : 1), elite: opts.elite, boss: opts.boss, slowUntil: 0, flash: 0, touchCd: 0, ringCd: 0, glowCd: 0,
  });
}

const MAX_ENEMIES = 230;

function spawning(r: Run, dt: number) {
  const minutes = r.t / 60;
  const open = r.kinds.map((k, i) => ({ k, i })).filter(({ k }) => r.t >= k.unlockAt);
  // Steadily more monsters as the night goes on (a little calmer once the great beast arrives).
  const rate = (0.9 + minutes * 0.75) * (r.bossSpawned ? 0.5 : 1);
  r.spawnAcc += rate * dt;
  while (r.spawnAcc >= 1) {
    r.spawnAcc -= 1;
    if (r.enemies.length >= MAX_ENEMIES) break;
    // Newer monster kinds are commoner; the old ones still turn up.
    const pick = open[Math.min(open.length - 1, Math.floor(Math.sqrt(r.rng()) * open.length))];
    spawnAt(r, pick.k, pick.i, r.rng() * Math.PI * 2);
  }
  // A big one every 90 s — it carries a lantern chest (a free power-up).
  if (r.t >= r.nextElite) {
    r.nextElite += 90;
    const i = open.length - 1;
    spawnAt(r, open[i].k, open[i].i, r.rng() * Math.PI * 2, 0, { elite: true });
  }
  // Every 2 minutes a ring of monsters closes in from all sides.
  if (r.t >= r.nextRing && !r.bossSpawned) {
    r.nextRing += 120;
    const n = 18 + Math.floor(minutes * 2);
    for (let j = 0; j < n && r.enemies.length < MAX_ENEMIES + 30; j++) spawnAt(r, open[0].k, open[0].i, (j / n) * Math.PI * 2, 20);
  }
  // Dawn: the town's great beast.
  if (r.t >= NIGHT_SECONDS && !r.bossSpawned) {
    r.bossSpawned = true;
    spawnAt(r, r.boss, -1, r.rng() * Math.PI * 2, 0, { boss: true });
    r.events.push({ type: 'boss' });
  }
}

function fireWeapons(r: Run, dt: number) {
  const s = stats(r);
  for (const w of r.weapons) {
    // Continuous weapons (ring, glow) are handled in contact checks; the rest fire on a timer.
    w.cd -= dt;
    if (w.cd > 0) continue;
    const L = w.level;
    if (w.id === 'sword') {
      w.cd = (L >= 5 ? 0.8 : 1.0) * s.cd;
      const reach = (68 + 8 * L) * s.area;
      const arcs = L >= 3 ? [r.face, r.face + Math.PI] : [r.face];
      for (const a of arcs) {
        r.fx.push({ kind: 'slash', x: r.px, y: r.py, a, r: reach, t: 0, life: 0.22 });
        for (const e of r.enemies) {
          const d = Math.sqrt(dist2(r.px, r.py, e.x, e.y));
          if (d > reach + e.r) continue;
          let diff = Math.abs(Math.atan2(e.y - r.py, e.x - r.px) - a) % (Math.PI * 2);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < 1.0 + 0.1 * L || d < 24) damage(r, e, 10 + 4 * L);
        }
      }
      r.events.push({ type: 'fire', w: 'sword' });
    } else if (w.id === 'arrows') {
      w.cd = (L >= 5 ? 0.55 : 0.7) * s.cd;
      const n = 1 + (L >= 2 ? 1 : 0) + (L >= 4 ? 1 : 0);
      const target = nearest(r, r.px, r.py, 520);
      const base = target ? Math.atan2(target.y - r.py, target.x - r.px) : r.face;
      for (let j = 0; j < n; j++) {
        const a = base + (j - (n - 1) / 2) * 0.16;
        r.shots.push({ kind: 'arrow', x: r.px, y: r.py, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, dmg: 12 + 5 * L, r: 6 * s.area, pierce: L >= 3 ? 3 : 2, life: 1.3, hit: [] });
      }
      r.events.push({ type: 'fire', w: 'arrows' });
    } else if (w.id === 'bolt') {
      w.cd = 0.85 * s.cd;
      const n = 1 + (L >= 2 ? 1 : 0) + (L >= 4 ? 1 : 0);
      for (let j = 0; j < n; j++) {
        const a = r.rng() * Math.PI * 2;
        const target = nearest(r, r.px, r.py, 600, (e) => r.shots.some((sh) => sh.target === e.id))?.id ?? nearest(r, r.px, r.py, 600)?.id;
        r.shots.push({ kind: 'bolt', x: r.px, y: r.py, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, dmg: 14 + 5 * L, r: (L >= 5 ? 9 : 7) * s.area, pierce: 1, life: 2.4, hit: [], target });
      }
      r.events.push({ type: 'fire', w: 'bolt' });
    } else if (w.id === 'storm') {
      w.cd = (2.4 - 0.15 * L) * s.cd;
      const n = 1 + Math.floor(L / 2);
      const near = r.enemies.filter((e) => Math.abs(e.x - r.px) < r.view.w / 2 && Math.abs(e.y - r.py) < r.view.h / 2);
      for (let j = 0; j < n && near.length; j++) {
        const e = near.splice(Math.floor(r.rng() * near.length), 1)[0];
        const rad = (34 + 4 * L) * s.area;
        r.fx.push({ kind: 'strike', x: e.x, y: e.y, a: 0, r: rad, t: 0, life: 0.3 });
        for (const o of r.enemies) if (dist2(o.x, o.y, e.x, e.y) < (rad + o.r) ** 2) damage(r, o, 22 + 8 * L);
      }
      if (n) r.events.push({ type: 'fire', w: 'storm' });
    } else if (w.id === 'nova') {
      w.cd = 4 * s.cd;
      const rad = (90 + 16 * L) * s.area;
      r.fx.push({ kind: 'nova', x: r.px, y: r.py, a: 0, r: rad, t: 0, life: 0.45 });
      for (const e of r.enemies) if (dist2(e.x, e.y, r.px, r.py) < (rad + e.r) ** 2) { damage(r, e, 6 + 4 * L); e.slowUntil = r.t + 2 + 0.3 * L; }
      r.events.push({ type: 'fire', w: 'nova' });
    } else if (w.id === 'hatchet') {
      w.cd = 1.5 * s.cd;
      const n = 1 + (L >= 3 ? 1 : 0) + (L >= 5 ? 1 : 0);
      for (let j = 0; j < n; j++) {
        const vx = (r.rng() - 0.5) * 220;
        r.shots.push({ kind: 'hatchet', x: r.px, y: r.py, vx, vy: -360 - r.rng() * 80, dmg: 20 + 7 * L, r: 12 * s.area, pierce: 99, life: 2.2, hit: [] });
      }
      r.events.push({ type: 'fire', w: 'hatchet' });
    } else if (w.id === 'pet') {
      w.cd = 0.1; // the pet runs on its own timer below
    } else {
      w.cd = 0.1; // ring / glow: continuous
    }
  }
}

function auras(r: Run, dt: number) {
  const s = stats(r);
  const ring = r.weapons.find((w) => w.id === 'ring');
  const glow = r.weapons.find((w) => w.id === 'glow');
  const pet = r.weapons.find((w) => w.id === 'pet');
  if (ring) {
    const n = 1 + ring.level;
    const rad = (62 + 4 * ring.level) * s.area;
    for (let j = 0; j < n; j++) {
      const a = r.t * 3 + (j / n) * Math.PI * 2;
      const ex = r.px + Math.cos(a) * rad, ey = r.py + Math.sin(a) * rad;
      for (const e of r.enemies) {
        if (e.ringCd > 0) continue;
        if (dist2(ex, ey, e.x, e.y) < (10 * s.area + e.r) ** 2) { damage(r, e, 8 + 3 * ring.level); e.ringCd = 0.5; }
      }
    }
  }
  if (glow) {
    const rad = (58 + 12 * glow.level) * s.area;
    for (const e of r.enemies) {
      if (e.glowCd > 0) continue;
      if (dist2(r.px, r.py, e.x, e.y) < (rad + e.r) ** 2) { damage(r, e, 3 + 1.5 * glow.level); e.glowCd = 0.5; }
    }
  }
  // The companion: runs to the nearest monster and pounces.
  const p = r.pet;
  if (pet) {
    p.cd -= dt;
    const tgt = r.enemies.find((e) => e.id === p.target) ?? nearest(r, p.x, p.y, 380);
    p.target = tgt?.id ?? null;
    const tx = tgt ? tgt.x : r.px + 28, ty = tgt ? tgt.y : r.py + 18;
    const d = Math.sqrt(dist2(p.x, p.y, tx, ty)) || 1;
    const sp = 230 + 25 * pet.level;
    if (d > 4) { p.x += ((tx - p.x) / d) * Math.min(d, sp * dt); p.y += ((ty - p.y) / d) * Math.min(d, sp * dt); }
    if (tgt && d < tgt.r + 12 && p.cd <= 0) {
      p.cd = (0.75 - 0.06 * pet.level) * s.cd;
      damage(r, tgt, 14 + 6 * pet.level);
      r.fx.push({ kind: 'pounce', x: tgt.x, y: tgt.y, a: 0, r: 16, t: 0, life: 0.2 });
    }
  } else {
    p.x = r.px + 26; p.y = r.py + 16;
  }
}

function moveShots(r: Run, dt: number) {
  for (const sh of r.shots) {
    sh.life -= dt;
    if (sh.kind === 'bolt') {
      const t = r.enemies.find((e) => e.id === sh.target) ?? nearest(r, sh.x, sh.y, 500);
      if (t) {
        sh.target = t.id;
        const a = Math.atan2(t.y - sh.y, t.x - sh.x);
        sh.vx += (Math.cos(a) * 420 - sh.vx) * Math.min(1, dt * 4);
        sh.vy += (Math.sin(a) * 420 - sh.vy) * Math.min(1, dt * 4);
      }
    }
    if (sh.kind === 'hatchet') sh.vy += 520 * dt;
    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;
    for (const e of r.enemies) {
      if (sh.pierce <= 0) break;
      if (e.hp <= 0 || sh.hit.includes(e.id)) continue;
      if (dist2(sh.x, sh.y, e.x, e.y) < (sh.r + e.r) ** 2) {
        damage(r, e, sh.dmg);
        sh.hit.push(e.id);
        sh.pierce -= 1;
      }
    }
  }
  r.shots = r.shots.filter((sh) => sh.life > 0 && sh.pierce > 0);
}

function moveEnemies(r: Run, dt: number) {
  const s = stats(r);
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
    const dx = r.px - e.x, dy = r.py - e.y;
    const d = Math.hypot(dx, dy) || 1;
    // Wandered too far behind? It circles round to the front again.
    if (d > far && !e.boss) {
      const a = Math.atan2(r.py - e.y, r.px - e.x);
      e.x = r.px + Math.cos(a) * far * 0.7; e.y = r.py + Math.sin(a) * far * 0.7;
      continue;
    }
    const speed = e.speed * (e.slowUntil > r.t ? 0.5 : 1);
    let mx = (dx / d) * speed, my = (dy / d) * speed;
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
      const hurt = Math.max(1, e.dmg - s.armor);
      r.hp -= hurt;
      r.touchFlash = 0.25;
      r.events.push({ type: 'hurt' });
    }
  }
}

function deaths(r: Run) {
  const alive: Enemy[] = [];
  for (const e of r.enemies) {
    if (e.hp > 0) { alive.push(e); continue; }
    r.kills += 1;
    r.events.push({ type: 'kill', elite: e.elite || e.boss });
    if (e.boss) {
      r.fx.push({ kind: 'boom', x: e.x, y: e.y, a: 0, r: 120, t: 0, life: 0.8 });
      r.phase = 'won';
      r.events.push({ type: 'won' });
      continue;
    }
    const kind = r.kinds[e.k];
    r.pickups.push({ x: e.x, y: e.y, kind: 'light', v: (kind?.light ?? 1) * (e.elite ? 10 : 1) });
    if (e.elite) r.pickups.push({ x: e.x + 14, y: e.y, kind: 'chest', v: 1 });
    else if (r.rng() < 0.006) r.pickups.push({ x: e.x, y: e.y, kind: 'meal', v: 30 });
    else if (r.rng() < 0.002) r.pickups.push({ x: e.x, y: e.y, kind: 'magnet', v: 0 });
    if (r.rng() < 0.15) r.coins += 1;
  }
  r.enemies = alive;
  // Too many lights lying about? Fold the oldest together.
  const lights = r.pickups.filter((p) => p.kind === 'light');
  if (lights.length > 260) {
    const old = lights.slice(0, lights.length - 200);
    const sum = old.reduce((s, p) => s + p.v, 0);
    r.pickups = r.pickups.filter((p) => !old.includes(p));
    r.pickups.push({ x: old[0].x, y: old[0].y, kind: 'light', v: sum });
  }
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
      if (p.kind === 'light') { r.xp += p.v; r.events.push({ type: 'light' }); }
      if (p.kind === 'meal') { r.hp = Math.min(r.maxHp, r.hp + p.v); r.mealsFound += 1; r.events.push({ type: 'meal' }); }
      if (p.kind === 'magnet') { for (const q of r.pickups) if (q.kind === 'light') q.pulled = true; }
      if (p.kind === 'chest') { r.pending += 1; r.events.push({ type: 'chest' }); }
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

/** Moves the night forward by `dt` seconds. Does nothing while a power-up choice is open. */
export function step(r: Run, dt: number, input: Input) {
  if (r.phase !== 'play' || r.choices) return;
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
  spawning(r, dt);
  fireWeapons(r, dt);
  auras(r, dt);
  moveShots(r, dt);
  moveEnemies(r, dt);
  deaths(r);
  gather(r, dt);
  for (const f of r.fx) f.t += dt;
  r.fx = r.fx.filter((f) => f.t < f.life);
  if (r.hp <= 0 && r.phase === 'play') {
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
  const k = Math.max(0, Math.min(4000, kills));
  const style = Math.round(perSecond * (secs * 1.4 + k * 0.25) * (won ? 1.5 : 1));
  return { style, health: Math.round(style / 3), defense: Math.round(style / 4) };
}
/** How many of the town's monster loot rolls a night gives (one per 40 kills, up to 12). */
export const lootRolls = (kills: number) => Math.min(12, Math.floor(Math.max(0, kills) / 40));
