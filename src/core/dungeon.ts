// 🧪 The Dungeon (v0.0.1.68, PREVIEW — owner: "like MapleStory"): a real-time side-scrolling run through a
// town's wild place, ending at its expedition boss. Your hero is drawn from your worn gear (ui/Dungeon.tsx).
// Skills come from a skill book: they unlock with your Melee / Ranged / Magic / Defence levels, and you
// drag 3 of them onto the skill bar. This is a try-out of the controls and looks: it gives no rewards yet.
// This file is the engine only (no drawing): world, physics, monsters, skills.
import type { CombatStyle, SkillId } from '../data/items';
import { MONSTER_MAP, type MonsterDef } from '../data/monsters';
import { REGIONS, type Region } from '../data/tiers';
import { maxHp, weaponStyle } from './combat';
import { fairPower, rawPower, townBoss, townMonsters, TURN_MS } from './expedition';
import type { PlayerState } from './player';
import { levelForXp } from './xp';

// ----- The world (logical pixels; the screen scales it) -----
export const VIEW_W = 360;
export const VIEW_H = 640;
/** Where the ground is (feet). Below it, the phone controls sit over the earth. */
export const GROUND = 470;
export const ROW_GAP = 95;
const GRAV = 0.0024;
const JUMP_V = -0.86;
const SPEED = 0.2;
export const HERO_W = 22;
export const HERO_H = 58;
/** Time between basic attacks (ms). */
export const ATTACK_MS: Record<CombatStyle, number> = { melee: 430, ranged: 520, magic: 560 };
export const SNACKS = 3;

export interface Plat { x1: number; x2: number; y: number }
export interface Hero {
  x: number; y: number; vx: number; vy: number; face: 1 | -1; onGround: boolean;
  hp: number; maxHp: number; atkCd: number; atkT: number; invT: number; ironT: number; dashT: number; spinT: number; walkT: number;
}
export interface Mob {
  id: number; m: string; x: number; y: number; w: number; h: number; hp: number; maxHp: number; dir: 1 | -1;
  min: number; max: number; speed: number; touch: number; shoots: boolean; atkCd: number; hitT: number; dead: number;
  boss?: boolean; slamT?: number; slamCd?: number;
}
export interface Shot { x: number; y: number; vx: number; vy: number; dmg: number; mine: boolean; pierce: boolean; kind: 'arrow' | 'bolt' | 'fire' | 'spit'; ttl: number; hit: number[]; mult?: number; blast?: boolean }
export interface Pop { x: number; y: number; text: string; t: number; kind: 'hit' | 'crit' | 'hurt' | 'heal' | 'info' }
export interface Fx { x: number; y: number; t: number; kind: 'slash' | 'spin' | 'boom' | 'zap' | 'rain' | 'slam'; w?: number; x2?: number; y2?: number }

/** A little particle: sparks, dust, poofs (purely for looks). */
export interface Part { x: number; y: number; vx: number; vy: number; t: number; life: number; c: string; s: number; grav: number }

export interface Input { left: boolean; right: boolean; jump: boolean; attack: boolean; down?: boolean }

export interface Dungeon {
  region: Region; style: CombatStyle; worldW: number; arenaX: number;
  plats: Plat[]; hero: Hero; mobs: Mob[]; shots: Shot[]; pops: Pop[]; fx: Fx[];
  /** Your hit per basic attack, per monster; their touch damage is on each mob. */
  hit: Record<string, number>;
  cd: Record<string, number>; bar: (string | null)[];
  snacks: number; kills: number; t: number; phase: 'play' | 'won' | 'ko'; jumpHeld: boolean; rs: number; nextId: number;
  bossId: string;
  /** ✨ Game feel (v0.0.1.69): particles, a tiny freeze on hits, screen shake, a hit combo and banners. */
  parts: Part[]; freeze: number; shake: number; combo: number; comboT: number;
  banner: { text: string; sub: string; t: number } | null; bossSeen: boolean;
}

// ----- Skills (the skill book) -----
export interface SkillDef { id: string; name: string; emoji: string; style: CombatStyle | 'defense'; level: number; cdMs: number; text: string }
export const SKILLS: SkillDef[] = [
  { id: 'power_strike', name: 'Power Strike', emoji: '💥', style: 'melee', level: 1, cdMs: 3000, text: 'A heavy blow: 2.4× damage to the monster in front.' },
  { id: 'slash_blast', name: 'Slash Blast', emoji: '🌙', style: 'melee', level: 50, cdMs: 4500, text: 'A wide sweep: 1.4× damage to every monster close in front.' },
  { id: 'dash_strike', name: 'Dash Strike', emoji: '💨', style: 'melee', level: 110, cdMs: 6000, text: 'Dash forward, hitting everything you pass for 1.6×.' },
  { id: 'whirlwind', name: 'Whirlwind', emoji: '🌀', style: 'melee', level: 175, cdMs: 10000, text: 'Spin for 1.5s, hitting all around you again and again.' },
  { id: 'double_shot', name: 'Double Shot', emoji: '🏹', style: 'ranged', level: 1, cdMs: 2500, text: 'Two arrows at once, 1.0× each.' },
  { id: 'piercing_arrow', name: 'Piercing Arrow', emoji: '➶', style: 'ranged', level: 50, cdMs: 5000, text: 'An arrow that flies through every monster in its path, 1.8×.' },
  { id: 'arrow_rain', name: 'Arrow Rain', emoji: '🌧️', style: 'ranged', level: 110, cdMs: 8000, text: 'Arrows rain down ahead of you: 4 waves of 1.2× to all there.' },
  { id: 'leap_shot', name: 'Leap Shot', emoji: '🦘', style: 'ranged', level: 175, cdMs: 6000, text: 'Spring backwards out of reach and fire a 2× arrow.' },
  { id: 'magic_claw', name: 'Magic Claw', emoji: '🪄', style: 'magic', level: 1, cdMs: 2500, text: 'Two quick bolts, 1.1× each.' },
  { id: 'fireball', name: 'Fireball', emoji: '🔥', style: 'magic', level: 50, cdMs: 5000, text: 'A fireball that bursts on the first monster: 2× to all nearby.' },
  { id: 'chain_lightning', name: 'Chain Lightning', emoji: '⚡', style: 'magic', level: 110, cdMs: 6000, text: 'Lightning leaps between up to 4 nearby monsters, 1.5× each.' },
  { id: 'teleport', name: 'Teleport', emoji: '✨', style: 'magic', level: 175, cdMs: 4000, text: 'Blink forward a long way (great for escaping).' },
  { id: 'iron_body', name: 'Iron Body', emoji: '🛡️', style: 'defense', level: 1, cdMs: 18000, text: 'Take half damage for 6 seconds.' },
  { id: 'second_wind', name: 'Second Wind', emoji: '💚', style: 'defense', level: 50, cdMs: 30000, text: 'Heal 25% of your health.' },
  { id: 'stone_skin', name: 'Stone Skin', emoji: '🪨', style: 'defense', level: 110, cdMs: 25000, text: 'For 4 seconds, nothing can hurt you.' },
];
export const SKILL_MAP: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const BAR_SIZE = 3;

/** Why a skill can't go on your bar (null = it can). */
export function whyCantUseSkill(p: PlayerState, id: string): string | null {
  const s = SKILL_MAP[id];
  if (!s) return 'Unknown skill';
  const lvl = levelForXp(p.skills[s.style as SkillId].xp);
  if (lvl < s.level) return `Needs ${s.style === 'defense' ? 'Defence' : s.style[0].toUpperCase() + s.style.slice(1)} ${s.level}`;
  if (s.style !== 'defense' && s.style !== weaponStyle(p)) return s.style === 'melee' ? 'Needs a melee weapon' : s.style === 'ranged' ? 'Needs a bow' : 'Needs a staff';
  return null;
}
/** A starting bar: the best skills you can use right now. */
export function defaultBar(p: PlayerState): string[] {
  const ok = SKILLS.filter((s) => !whyCantUseSkill(p, s.id));
  const style = ok.filter((s) => s.style !== 'defense').reverse();
  const def = ok.filter((s) => s.style === 'defense');
  return [...style.slice(0, 2), ...def.slice(0, 1), ...style.slice(2)].slice(0, BAR_SIZE).map((s) => s.id);
}

// ----- rng -----
function rand(d: Dungeon): number {
  d.rs = (d.rs + 0x6d2b79f5) | 0;
  let t = d.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ----- Setting off -----
const SIZE: Record<string, [number, number]> = {
  rat: [34, 26], sprite: [30, 34], bandit: [32, 52], boar: [46, 34], bear: [48, 46], treant: [44, 60], crab: [40, 28],
  bird: [36, 34], ghost: [34, 42], goat: [40, 40], lizard: [44, 26], tortoise: [46, 32], wyrm: [56, 40],
};
export function newDungeon(p: PlayerState, region: Region, bar: (string | null)[], seed = Math.floor(Math.random() * 2 ** 31)): Dungeon {
  const style = weaponStyle(p);
  const fair = fairPower(region);
  const mobsDefs = townMonsters(region);
  const boss = townBoss(region)!;
  const hit: Record<string, number> = {};
  const touch: Record<string, number> = {};
  const ammo = null;
  for (const m of [...mobsDefs, boss]) {
    const edge = rawPower(p, m, ammo);
    const even = rawPower(p, { ...m, style }, ammo);
    const you = { hit: Math.sqrt(edge.hit * even.hit), hurt: Math.sqrt(edge.hurt * even.hurt) };
    hit[m.id] = Math.max(1, you.hit * (ATTACK_MS[style] / TURN_MS));
    touch[m.id] = fair[m.id].hurt * 1.4 * Math.min(3, Math.max(0.35, you.hurt / fair[m.id].rawHurt));
  }
  const hp = maxHp(p);
  const d: Dungeon = {
    region, style, worldW: 0, arenaX: 0, plats: [], mobs: [], shots: [], pops: [], fx: [], hit,
    hero: { x: 60, y: GROUND, vx: 0, vy: 0, face: 1, onGround: true, hp, maxHp: hp, atkCd: 0, atkT: 0, invT: 0, ironT: 0, dashT: 0, spinT: 0, walkT: 0 },
    cd: {}, bar: bar.slice(0, BAR_SIZE), snacks: SNACKS, kills: 0, t: 0, phase: 'play', jumpHeld: false, rs: seed, nextId: 1, bossId: boss.id,
    parts: [], freeze: 0, shake: 0, combo: 0, comboT: 0, banner: null, bossSeen: false,
  };
  // The path: ground all the way, and floating ledges at three heights.
  const pathEnd = 2700;
  d.arenaX = pathEnd;
  d.worldW = pathEnd + 560;
  d.plats.push({ x1: 0, x2: d.worldW, y: GROUND });
  for (let x = 260; x < pathEnd - 200;) {
    const w = 150 + Math.floor(rand(d) * 140);
    const row = 1 + Math.floor(rand(d) * 2);
    d.plats.push({ x1: x, x2: x + w, y: GROUND - row * ROW_GAP });
    if (row === 1 && rand(d) < 0.5) d.plats.push({ x1: x + 40, x2: x + w + 60, y: GROUND - 2 * ROW_GAP });
    if (rand(d) < 0.3) d.plats.push({ x1: x + w / 2, x2: x + w / 2 + 130, y: GROUND - 3 * ROW_GAP });
    x += w + 90 + Math.floor(rand(d) * 120);
  }
  // Monsters along the way — the further you go, the tougher they get.
  const spawn = (def: MonsterDef, x: number, plat: Plat, rank: number) => {
    const [w, h] = SIZE[def.art] ?? [40, 40];
    const mhp = Math.round((fair[def.id].rawHit * (ATTACK_MS[style] / TURN_MS)) * (3 + 3 * rank));
    d.mobs.push({
      id: d.nextId++, m: def.id, x, y: plat.y, w, h, hp: mhp, maxHp: mhp, dir: rand(d) < 0.5 ? 1 : -1,
      min: plat.x1 + w / 2, max: plat.x2 - w / 2, speed: 0.035 + rand(d) * 0.03, touch: touch[def.id],
      shoots: def.style !== 'melee', atkCd: 1500 + rand(d) * 1500, hitT: 0, dead: 0,
    });
  };
  for (let x = 330; x < pathEnd - 80; x += 150 + Math.floor(rand(d) * 90)) {
    const progress = x / pathEnd;
    const i = Math.min(mobsDefs.length - 1, Math.floor(rand(d) * Math.min(mobsDefs.length, 1 + Math.floor(progress * mobsDefs.length + 0.6))));
    const def = mobsDefs[i];
    const rank = mobsDefs.length > 1 ? i / (mobsDefs.length - 1) : 1;
    // Sometimes up on a ledge instead.
    const ledges = d.plats.filter((pl) => pl.y < GROUND && pl.x1 < x && pl.x2 > x && pl.x2 - pl.x1 > 100);
    const plat = ledges.length && rand(d) < 0.45 ? ledges[Math.floor(rand(d) * ledges.length)] : d.plats[0];
    spawn(def, plat === d.plats[0] ? x : (plat.x1 + plat.x2) / 2, plat === d.plats[0] ? { x1: x - 120, x2: x + 120, y: GROUND } : plat, rank);
  }
  // 👑 The boss waits in its clearing at the end.
  const bw = 96, bh = 96;
  const bhp = Math.round(fair[boss.id].rawHit * (ATTACK_MS[style] / TURN_MS) * 42);
  d.mobs.push({
    id: d.nextId++, m: boss.id, x: d.arenaX + 360, y: GROUND, w: bw, h: bh, hp: bhp, maxHp: bhp, dir: -1,
    min: d.arenaX + 60, max: d.worldW - 60, speed: 0.05, touch: touch[boss.id], shoots: boss.style !== 'melee', atkCd: 2500, hitT: 0, dead: 0,
    boss: true, slamT: 0, slamCd: 4000,
  });
  d.banner = { text: '', sub: '', t: 0 }; // the screen fills in the area name
  return d;
}

// ----- Helpers -----
const pop = (d: Dungeon, x: number, y: number, text: string, kind: Pop['kind']) => { d.pops.push({ x, y, text, t: 0, kind }); if (d.pops.length > 30) d.pops.shift(); };
/** Monsters still fighting. (Bug fix v0.0.1.69: a monster whose fade-out had finished used to count as alive
 * again — it walked about invisibly and could still bump into you. Now hp decides, and finished ones are removed.) */
const alive = (d: Dungeon) => d.mobs.filter((m) => m.hp > 0);
export function burst(d: Dungeon, x: number, y: number, n: number, c: string[], speed = 0.18, grav = 0.0006, size = 3, life = 500) {
  for (let i = 0; i < n; i++) {
    const a = rand(d) * Math.PI * 2;
    const v = speed * (0.4 + rand(d) * 0.8);
    d.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.6, t: 0, life: life * (0.6 + rand(d) * 0.6), c: c[i % c.length], s: size, grav });
  }
  if (d.parts.length > 220) d.parts.splice(0, d.parts.length - 220);
}
const heroBox = (h: Hero) => ({ x1: h.x - HERO_W / 2, x2: h.x + HERO_W / 2, y1: h.y - HERO_H, y2: h.y });
const mobBox = (m: Mob) => ({ x1: m.x - m.w / 2, x2: m.x + m.w / 2, y1: m.y - m.h, y2: m.y });
const overlap = (a: { x1: number; x2: number; y1: number; y2: number }, b: { x1: number; x2: number; y1: number; y2: number }) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
export const bossOf = (d: Dungeon) => d.mobs.find((m) => m.boss);
export const bossDef = (d: Dungeon) => MONSTER_MAP[d.bossId];

/** Hit a monster. Returns the damage. */
function hitMob(d: Dungeon, m: Mob, mult: number, knock = 6): number {
  if (m.hp <= 0) return 0;
  const crit = rand(d) < 0.12;
  const dmg = Math.max(1, Math.round(d.hit[m.m] * mult * (0.85 + rand(d) * 0.3) * (crit ? 1.6 : 1)));
  m.hp -= dmg;
  m.hitT = 180;
  if (!m.boss) m.x = Math.max(m.min, Math.min(m.max, m.x + Math.sign(m.x - d.hero.x || 1) * knock));
  pop(d, m.x, m.y - m.h - 6, dmg.toLocaleString(), crit ? 'crit' : 'hit');
  // ✨ Feel: sparks, a tiny freeze, a shake on crits, and the hit combo.
  burst(d, m.x - Math.sign(m.x - d.hero.x || 1) * m.w * 0.3, m.y - m.h / 2, crit ? 8 : 4, crit ? ['#fff7e0', '#fbbf24', '#f43f5e'] : ['#fff7e0', '#fde68a', '#fb923c'], crit ? 0.3 : 0.2, 0.0008, 3, 300);
  d.freeze = Math.max(d.freeze, crit ? 70 : 35);
  if (crit) d.shake = Math.max(d.shake, 3);
  d.combo++;
  d.comboT = 2200;
  if (m.hp <= 0) {
    m.dead = 500;
    d.kills++;
    const MONSTER = MONSTER_MAP[m.m];
    burst(d, m.x, m.y - m.h / 2, 12, ['#ffffff', '#e7e5e4', '#d6d3d1'], 0.12, -0.0001, 6, 650);
    burst(d, m.x, m.y - m.h / 2, 10, [MONSTER.colors.body, MONSTER.colors.accent, MONSTER.colors.dark], 0.26, 0.0012, 3, 700);
    if (m.boss) { d.phase = 'won'; d.freeze = 300; d.shake = 10; pop(d, m.x, m.y - m.h - 30, 'VICTORY!', 'info'); burst(d, m.x, m.y - m.h, 40, ['#fde68a', '#f472b6', '#60a5fa', '#4ade80'], 0.4, 0.0009, 4, 1400); }
  }
  return dmg;
}
/** Monsters inside a box in front of the hero. */
function inFront(d: Dungeon, reach: number, height = 70, both = false): Mob[] {
  const h = d.hero;
  const x1 = both ? h.x - reach : h.face > 0 ? h.x - 6 : h.x - reach;
  const x2 = both ? h.x + reach : h.face > 0 ? h.x + reach : h.x + 6;
  const box = { x1, x2, y1: h.y - height, y2: h.y + 6 };
  return alive(d).filter((m) => overlap(box, mobBox(m))).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x));
}
function shoot(d: Dungeon, kind: Shot['kind'], mult: number, opts: Partial<Shot> = {}) {
  const h = d.hero;
  d.shots.push({ x: h.x + h.face * 14, y: h.y - 34, vx: h.face * (kind === 'arrow' ? 0.62 : 0.48), vy: 0, dmg: 0, mine: true, pierce: false, kind, ttl: 900, hit: [], mult, ...opts });
}
function hurtHero(d: Dungeon, dmg: number, from: number) {
  const h = d.hero;
  if (h.invT > 0 || d.phase !== 'play') return;
  if (h.ironT > 0) dmg *= h.ironT > 100000 ? 0 : 0.5;
  dmg = Math.round(dmg * (0.9 + rand(d) * 0.2));
  if (dmg <= 0) { pop(d, h.x, h.y - HERO_H - 8, 'Blocked', 'info'); h.invT = 400; return; }
  h.hp -= dmg;
  h.invT = 900;
  d.shake = Math.max(d.shake, 4);
  d.combo = 0;
  burst(d, h.x, h.y - HERO_H / 2, 6, ['#c084fc', '#f0abfc', '#ffffff'], 0.2, 0.0008, 3, 350);
  h.vx = Math.sign(h.x - from || -h.face) * 0.25;
  h.vy = -0.45;
  h.onGround = false;
  pop(d, h.x, h.y - HERO_H - 8, `-${dmg.toLocaleString()}`, 'hurt');
  if (h.hp <= 0) { h.hp = 0; d.phase = 'ko'; }
}

// ----- Skills -----
/** Use the skill in bar slot i. Returns the sound to play, or null if it can't be used now. */
export function castSkill(d: Dungeon, i: number): string | null {
  const id = d.bar[i];
  if (!id || d.phase !== 'play' || (d.cd[id] ?? 0) > 0) return null;
  const s = SKILL_MAP[id];
  const h = d.hero;
  d.cd[id] = s.cdMs;
  h.atkT = 260;
  switch (id) {
    case 'power_strike': { const t = inFront(d, 70)[0]; if (t) hitMob(d, t, 2.4, 14); d.fx.push({ x: h.x + h.face * 34, y: h.y - 30, t: 0, kind: 'slash', w: 60 }); return 'boom'; }
    case 'slash_blast': for (const m of inFront(d, 110, 90)) hitMob(d, m, 1.4, 10); d.fx.push({ x: h.x + h.face * 50, y: h.y - 30, t: 0, kind: 'slash', w: 110 }); return 'shing';
    case 'dash_strike': h.dashT = 220; h.invT = Math.max(h.invT, 300); return 'whoosh';
    case 'whirlwind': h.spinT = 1500; return 'whoosh';
    case 'double_shot': shoot(d, 'arrow', 1); shoot(d, 'arrow', 1, { y: h.y - 26 }); return 'whoosh';
    case 'piercing_arrow': shoot(d, 'arrow', 1.8, { pierce: true, vx: h.face * 0.8 }); return 'shing';
    case 'arrow_rain': { const x = h.x + h.face * 120; for (let k = 0; k < 4; k++) d.fx.push({ x, y: GROUND, t: -k * 300, kind: 'rain', w: 150 }); return 'whoosh'; }
    case 'leap_shot': h.vx = -h.face * 0.45; h.vy = -0.7; h.onGround = false; h.invT = Math.max(h.invT, 400); shoot(d, 'arrow', 2); return 'whoosh';
    case 'magic_claw': shoot(d, 'bolt', 1.1); shoot(d, 'bolt', 1.1, { y: h.y - 24, vx: h.face * 0.42 }); return 'rune';
    case 'fireball': shoot(d, 'fire', 2, { blast: true }); return 'ignite';
    case 'chain_lightning': {
      let from = { x: h.x, y: h.y - 30 };
      const near = alive(d).filter((m) => Math.abs(m.x - h.x) < 230 && Math.abs(m.y - h.y) < 140).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x)).slice(0, 4);
      for (const m of near) { hitMob(d, m, 1.5); d.fx.push({ x: from.x, y: from.y, x2: m.x, y2: m.y - m.h / 2, t: 0, kind: 'zap' }); from = { x: m.x, y: m.y - m.h / 2 }; }
      return near.length ? 'enchant' : 'rune';
    }
    case 'teleport': h.x = Math.max(20, Math.min(d.worldW - 20, h.x + h.face * 170)); h.invT = Math.max(h.invT, 300); return 'rune';
    case 'iron_body': h.ironT = 6000; pop(d, h.x, h.y - HERO_H - 8, 'Iron Body', 'info'); return 'block';
    case 'second_wind': { const heal = Math.round(h.maxHp * 0.25); h.hp = Math.min(h.maxHp, h.hp + heal); pop(d, h.x, h.y - HERO_H - 8, `+${heal.toLocaleString()}`, 'heal'); return 'levelup'; }
    case 'stone_skin': h.ironT = 100000 + 4000; pop(d, h.x, h.y - HERO_H - 8, 'Stone Skin', 'info'); return 'block';
  }
  return null;
}
/** 🍖 A packed snack: heal 30%. */
export function eatSnack(d: Dungeon): boolean {
  const h = d.hero;
  if (d.snacks <= 0 || d.phase !== 'play' || h.hp >= h.maxHp) return false;
  d.snacks--;
  const heal = Math.round(h.maxHp * 0.3);
  h.hp = Math.min(h.maxHp, h.hp + heal);
  pop(d, h.x, h.y - HERO_H - 8, `+${heal.toLocaleString()}`, 'heal');
  return true;
}

// ----- One step of the world -----
/** Moves everything forward by dt ms. Returns sounds to play. */
export function step(d: Dungeon, dt: number, input: Input): string[] {
  const sounds: string[] = [];
  dt = Math.min(40, dt);
  d.t += dt;
  const h = d.hero;
  for (const k of Object.keys(d.cd)) d.cd[k] = Math.max(0, d.cd[k] - dt);
  d.pops = d.pops.filter((p) => (p.t += dt) < 900);
  d.shake = Math.max(0, d.shake - dt * 0.02);
  for (const p of d.parts) { p.t += dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  d.parts = d.parts.filter((p) => p.t < p.life);
  if (d.banner) { d.banner.t += dt; if (d.banner.t > 2600) d.banner = null; }
  if (d.comboT > 0) { d.comboT -= dt; if (d.comboT <= 0) d.combo = 0; }
  // A tiny freeze on hits makes them feel weighty.
  if (d.freeze > 0) { d.freeze -= dt; return sounds; }
  d.fx = d.fx.filter((f) => (f.t += dt) < 400);
  if (d.phase !== 'play') {
    for (const m of d.mobs) if (m.hp <= 0) m.dead = Math.max(0, m.dead - dt);
    return sounds;
  }
  h.invT = Math.max(0, h.invT - dt);
  if (h.ironT > 100000) { h.ironT -= dt; if (h.ironT <= 100000) h.ironT = 0; } else h.ironT = Math.max(0, h.ironT - dt);
  h.atkCd = Math.max(0, h.atkCd - dt);
  h.atkT = Math.max(0, h.atkT - dt);

  // Move
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (h.dashT > 0) {
    h.dashT -= dt;
    const before = h.x;
    h.x = Math.max(12, Math.min(d.worldW - 12, h.x + h.face * 0.9 * dt));
    const box = { x1: Math.min(before, h.x) - 14, x2: Math.max(before, h.x) + 14, y1: h.y - HERO_H, y2: h.y };
    for (const m of alive(d)) if (overlap(box, mobBox(m)) && !(m as Mob & { dashed?: number }).dashed) { hitMob(d, m, 1.6, 16); (m as Mob & { dashed?: number }).dashed = 1; }
    if (h.dashT <= 0) for (const m of d.mobs) delete (m as Mob & { dashed?: number }).dashed;
  } else if (h.invT > 600 && !h.onGround) {
    // knocked back: keep the push
  } else {
    h.vx = dir * SPEED * (h.atkT > 0 && h.onGround ? 0.55 : 1);
    if (dir) h.face = dir > 0 ? 1 : -1;
  }
  if (input.jump && !d.jumpHeld && h.onGround) {
    if (input.down && h.y < GROUND) { h.y += 4; h.onGround = false; } // drop through a ledge
    else { h.vy = JUMP_V; h.onGround = false; sounds.push('jump'); burst(d, h.x, h.y, 5, ['#ffffff', '#e7e5e4'], 0.08, -0.00005, 4, 380); }
  }
  d.jumpHeld = input.jump;
  h.walkT = h.onGround && h.vx ? h.walkT + dt : 0;
  const prevFeet = h.y;
  h.x = Math.max(12, Math.min(d.worldW - 12, h.x + h.vx * dt));
  h.vy += GRAV * dt;
  h.y += h.vy * dt;
  h.onGround = false;
  const falling = h.vy;
  if (h.vy >= 0) {
    for (const pl of d.plats) {
      if (h.x >= pl.x1 - 4 && h.x <= pl.x2 + 4 && prevFeet <= pl.y + 1 && h.y >= pl.y) { h.y = pl.y; h.vy = 0; h.onGround = true; break; }
    }
  }
  if (h.y > GROUND) { h.y = GROUND; h.vy = 0; h.onGround = true; }
  if (h.onGround && falling > 0.35) burst(d, h.x, h.y, 6, ['#ffffff', '#e7e5e4'], 0.09, -0.00005, 4, 400);
  // 👑 Entering the boss's clearing
  if (!d.bossSeen && h.x > d.arenaX - 20) { d.bossSeen = true; d.banner = { text: MONSTER_MAP[d.bossId].name, sub: '👑 Boss', t: 0 }; sounds.push('creak'); }

  // Basic attack (hold to keep swinging)
  if (input.attack && h.atkCd <= 0 && h.dashT <= 0) {
    h.atkCd = ATTACK_MS[d.style];
    h.atkT = 240;
    if (d.style === 'melee') {
      const t = inFront(d, 62)[0];
      if (t) { hitMob(d, t, 1); sounds.push('hit'); } else sounds.push('whoosh');
      d.fx.push({ x: h.x + h.face * 30, y: h.y - 32, t: 0, kind: 'slash', w: 46 });
    } else { shoot(d, d.style === 'ranged' ? 'arrow' : 'bolt', 1); sounds.push(d.style === 'ranged' ? 'whoosh' : 'rune'); }
  }
  // Whirlwind
  if (h.spinT > 0) {
    const before = h.spinT;
    h.spinT -= dt;
    if (Math.floor(before / 300) !== Math.floor(Math.max(0, h.spinT) / 300)) {
      for (const m of inFront(d, 70, 80, true)) hitMob(d, m, 0.8, 8);
      d.fx.push({ x: h.x, y: h.y - 30, t: 0, kind: 'spin', w: 70 });
      sounds.push('whoosh');
    }
  }
  // Arrow Rain lands in waves
  for (const f of d.fx) {
    if (f.kind === 'rain' && f.t >= 0 && f.t - dt < 0) {
      for (const m of alive(d)) if (Math.abs(m.x - f.x) < (f.w ?? 150) / 2) hitMob(d, m, 1.2, 4);
      sounds.push('tick');
    }
  }
  d.fx = d.fx.filter((f) => f.kind !== 'rain' || f.t < 300);

  // Shots
  for (const s of d.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.ttl -= dt;
    if (s.mine) {
      for (const m of alive(d)) {
        if (s.hit.includes(m.id)) continue;
        if (Math.abs(s.x - m.x) < m.w / 2 + 6 && s.y > m.y - m.h - 6 && s.y < m.y + 4) {
          if (s.blast) {
            for (const o of alive(d)) if (Math.abs(o.x - s.x) < 80 && Math.abs(o.y - m.y) < 90) hitMob(d, o, s.mult ?? 1, 12);
            d.fx.push({ x: s.x, y: s.y, t: 0, kind: 'boom', w: 80 });
            sounds.push('boom');
            s.ttl = 0;
            break;
          }
          hitMob(d, m, s.mult ?? 1);
          sounds.push('hit');
          s.hit.push(m.id);
          if (!s.pierce) { s.ttl = 0; break; }
        }
      }
    } else if (overlap(heroBox(h), { x1: s.x - 5, x2: s.x + 5, y1: s.y - 5, y2: s.y + 5 })) {
      hurtHero(d, s.dmg, s.x);
      sounds.push('hurt');
      s.ttl = 0;
    }
  }
  d.shots = d.shots.filter((s) => s.ttl > 0 && s.x > -50 && s.x < d.worldW + 50);

  // Monsters
  for (const m of d.mobs) {
    if (m.hp <= 0) { m.dead = Math.max(0, m.dead - dt); continue; }
    m.hitT = Math.max(0, m.hitT - dt);
    const dx = h.x - m.x;
    const sameRow = Math.abs(h.y - m.y) < 40;
    const near = Math.abs(dx) < (m.boss ? 420 : 200) && (sameRow || m.boss);
    if (m.boss && h.x < d.arenaX) { /* waits in its clearing */ }
    else if (near && m.hitT <= 0) { m.dir = dx > 0 ? 1 : -1; m.x += m.dir * m.speed * 1.4 * dt; }
    else if (m.hitT <= 0) {
      m.x += m.dir * m.speed * dt;
      if (m.x < m.min || m.x > m.max) m.dir = m.x < m.min ? 1 : -1;
    }
    m.x = Math.max(m.min, Math.min(m.max, m.x));
    // Touch
    if (overlap(heroBox(h), mobBox(m)) && h.dashT <= 0) { if (h.invT <= 0) sounds.push('hurt'); hurtHero(d, m.touch, m.x); }
    // Spit / arrows from the ranged and magic ones
    m.atkCd -= dt;
    if (m.shoots && m.atkCd <= 0 && Math.abs(dx) < 280 && Math.abs(h.y - m.y) < 120 && (!m.boss || h.x >= d.arenaX)) {
      m.atkCd = m.boss ? 2200 : 2600 + rand(d) * 1200;
      const sp = 0.22;
      const ty = h.y - HERO_H / 2 - (m.y - m.h / 2);
      d.shots.push({ x: m.x, y: m.y - m.h / 2, vx: Math.sign(dx) * sp, vy: Math.max(-0.08, Math.min(0.08, ty / 1200)), dmg: m.touch * 0.9, mine: false, pierce: false, kind: 'spit', ttl: 2200, hit: [] });
    }
    // 👑 The boss's big slam: it glows first — jump over it!
    if (m.boss && h.x >= d.arenaX) {
      if ((m.slamT ?? 0) > 0) {
        m.slamT! -= dt;
        if (m.slamT! <= 0) {
          d.fx.push({ x: m.x, y: GROUND, t: 0, kind: 'slam', w: 340 });
          sounds.push('boom');
          d.shake = 9;
          for (let k = -4; k <= 4; k++) burst(d, m.x + k * 38, GROUND, 2, ['#e7e5e4', '#a8a29e'], 0.14, 0.0006, 5, 600);
          if (h.onGround && Math.abs(h.x - m.x) < 170) hurtHero(d, m.touch * 2.6, m.x);
          m.slamCd = 3800 + rand(d) * 1500;
        }
      } else {
        m.slamCd = (m.slamCd ?? 4000) - dt;
        if (m.slamCd <= 0) { m.slamT = 900; sounds.push('creak'); }
      }
    }
  }
  // Finished fading out? Gone for good.
  d.mobs = d.mobs.filter((m) => m.hp > 0 || m.dead > 0);
  return sounds;
}

/** How far along the path you are (0–1). */
export const pathProgress = (d: Dungeon) => Math.min(1, d.hero.x / d.arenaX);
export const regionIndex = (r: Region) => REGIONS.indexOf(r);
