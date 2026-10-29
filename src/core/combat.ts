// Combat: fights run on the same game clock as idling (and keep going offline, except mini bosses).
// Triangle: Melee beats Ranged, Ranged beats Magic, Magic beats Melee.
// Cozy rule: being knocked out never costs items — you just wake up in town with full health.
import { getItem, ITEMS, WEAPON_SPEED, type CombatStyle, type SkillId } from '../data/items';
import { MONSTER_MAP, monsterStyle, nextMidnight, nextWeeklyReset, type MonsterDef } from '../data/monsters';
import { ASC_BASES, ASC_BOSS_ODDS, ASCENSION_LEVEL, rollAscended } from '../data/ascended';
import { REGIONS } from '../data/tiers';
import { equipmentStats } from './equipment';
import { addXp, chooseSlot, type ProgressReport } from './idle';
import { countInBag, removeFromBag } from './inventory';
import { giveLoot, rollLoot, rollPet } from './loot';
import type { PlayerState } from './player';
import { levelForXp } from './xp';
import { HOT_SPRING_MULT, inHotSprings } from './cinderpeak';
import { rollFestivalToken } from './festivals';
import { RELIC, relicOn } from './relics';
import { ascBonus } from './ascBonus';

export const FIGHT_PREFIX = 'fight:';
export const isFightId = (actionId: string | undefined | null) => !!actionId && actionId.startsWith(FIGHT_PREFIX);
export const fightMonster = (actionId: string) => MONSTER_MAP[actionId.slice(FIGHT_PREFIX.length)];

/** Pause between one monster falling and the next one showing up. */
const RESPAWN_MS = 800;
/** Eat when below this share of max HP. */
const EAT_BELOW = 0.5;
/** Chance an arrow or rune is saved instead of used up. */
const AMMO_SAVE = 0.25;
/** With no food left, retreat below this share of max HP. */
const RETREAT_BELOW = 0.25;
const hasFood = (p: PlayerState) => p.inventory.some((s) => !!s && !!ITEMS[s.id]?.heals);
/** You heal 1 HP every this many ms (in and out of combat). */
export const REGEN_MS = 5000;
/** BLOCK works if tapped within this long before the monster's attack. */
export const BLOCK_WINDOW_MS = 750;
/** The STRIKE timing bar in fights crosses this fast (seconds). */
export const STRIKE_SWEEP_SECONDS = 0.9;
export const CRIT_MULT = 1.75;

const BEATS: Record<CombatStyle, CombatStyle> = { melee: 'ranged', ranged: 'magic', magic: 'melee' };

export interface FightState {
  monsterId: string;
  monsterHp: number;
  /** ms until your next attack. */
  playerTimer: number;
  /** ms until the monster's next attack. */
  monsterTimer: number;
  /** ms until the next monster appears (0 = one is here). */
  respawn: number;
  /** Minigame: your next attack is a guaranteed critical hit. */
  critReady: boolean;
  /** Minigame: the monster's attack landing before this time is blocked. */
  blockUntil: number;
  /** ✨ Emberheart Blade: swings at this monster so far. */
  kindle?: number;
  /** ✨ Oathkeeper Shield: this monster's first blow was already warded off. */
  warded?: boolean;
  kills: number;
  /** What just happened (for the fight screen). */
  log: { at: number; text: string; kind: 'you' | 'them' | 'info' | 'loot' }[];
}

const lvl = (p: PlayerState, s: SkillId) => levelForXp(p.skills[s].xp);

export function weaponStyle(p: PlayerState): CombatStyle {
  const w = p.equipment.weapon;
  return (w && getItem(w).equip?.style) || 'melee';
}

export function maxHp(p: PlayerState): number {
  return 20 + 4 * lvl(p, 'health') + (equipmentStats(p).health ?? 0);
}

/** Best arrows/runes in the bag for the current weapon (null for melee or none). */
export function currentAmmo(p: PlayerState): string | null {
  const style = weaponStyle(p);
  if (style === 'melee') return null;
  // Elemental staffs only cast with runes of their own element (✨ the Starweaver Staff casts with any).
  const element = p.equipment.weapon ? getItem(p.equipment.weapon).equip?.element : undefined;
  // 🌟 Ascended staffs cast with any rune too.
  const anyRune = relicOn(p, 'starweaver_staff') || !!(p.equipment.weapon && ITEMS[p.equipment.weapon]?.ascended);
  let best: string | null = null;
  for (const s of p.inventory) {
    if (!s) continue;
    const a = ITEMS[s.id]?.ammo;
    if (!a || a.style !== style) continue;
    if (style === 'magic' && !anyRune && a.element !== element) continue;
    if (!best || a.power > ITEMS[best].ammo!.power) best = s.id;
  }
  return best;
}

export function combatStats(p: PlayerState, monster?: MonsterDef) {
  const style = weaponStyle(p);
  const stats = equipmentStats(p);
  const styleLevel = lvl(p, style);
  const ammo = currentAmmo(p);
  const ammoPower = ammo ? ITEMS[ammo].ammo!.power : 0;
  const weapon = p.equipment.weapon ? getItem(p.equipment.weapon) : null;
  const mStyle = monster ? monsterStyle(monster) : 'melee';
  const advantage = monster ? (BEATS[style] === mStyle ? 1 : BEATS[mStyle] === style ? -1 : 0) : 0;
  const attack = stats.attack ?? 0;
  const defense = stats.defense ?? 0;
  const accuracy = monster
    ? Math.min(0.95, Math.max(0.15, 0.6 + 0.012 * (styleLevel + attack / 2 - monster.defense) + 0.1 * advantage))
    : 0;
  const maxHit = Math.max(1, Math.round((1 + Math.floor(styleLevel / 5) + Math.floor(attack / 3) + ammoPower) * (advantage > 0 ? 1.25 : advantage < 0 ? 0.8 : 1)));
  const enemyAccuracy = monster
    ? Math.min(0.9, Math.max(0.1, 0.6 + 0.012 * (monster.attack - (lvl(p, 'defense') + defense / 3)) - 0.1 * advantage))
    : 0;
  return {
    style, styleLevel, attack, defense, ammo, ammoPower, accuracy, maxHit, enemyAccuracy, advantage,
    speedMs: weapon?.equip?.speedMs ?? WEAPON_SPEED.melee, maxHp: maxHp(p),
  };
}

/** Why you can't fight this monster right now (null = you can). */
export function whyCantFight(p: PlayerState, monster: MonsterDef, now = Date.now()): string | null {
  const ready = p.bossReadyAt[monster.id] ?? 0;
  if (monster.region !== p.location) return `Travel to ${monster.region} to fight this`;
  if (monster.weekly && ready > now) return `Defeated this week — returns Monday`;
  if (monster.ascension) {
    if (!canClimb(p)) return `The Road Up opens when a combat skill reaches ${ASCENSION_LEVEL}`;
    if (ready > now) return 'Beaten today — back at midnight';
  }
  if (monster.miniboss && ready > now) return `${monster.name} is resting — back in ${Math.ceil((ready - now) / 1000)}s`;
  const style = weaponStyle(p);
  if (style !== 'melee' && !currentAmmo(p)) {
    if (style === 'ranged') return 'Your bow needs arrows in your bag';
    const el = p.equipment.weapon ? getItem(p.equipment.weapon).equip?.element : undefined;
    return el ? `Your staff needs ${el[0].toUpperCase() + el.slice(1)} runes in your bag` : 'Your staff needs runes in your bag';
  }
  return null;
}

function newFight(monster: MonsterDef, p: PlayerState): FightState {
  return {
    monsterId: monster.id, monsterHp: monster.hp, playerTimer: combatStats(p).speedMs, monsterTimer: monster.speedMs,
    respawn: 0, critReady: false, blockUntil: 0, kills: 0, log: [],
  };
}

/** 🌌 The Road Up (Ascension bosses) opens when any combat skill is 750+. */
export function canClimb(p: PlayerState): boolean {
  return (['melee', 'ranged', 'magic', 'defense', 'health'] as SkillId[]).some((s) => lvl(p, s) >= ASCENSION_LEVEL);
}

export function startFight(p: PlayerState, monsterId: string): string | null {
  const monster = MONSTER_MAP[monsterId];
  if (!monster) return 'Unknown monster';
  const why = whyCantFight(p, monster);
  if (why) return why;
  // Only one fight at a time: reuse the fighting slot, else a free one, else slot 1.
  const id = FIGHT_PREFIX + monsterId;
  const i = chooseSlot(p, id);
  p.slots[i] = { actionId: id, progressMs: 0 };
  p.fight = newFight(monster, p);
  p.lastStop = null;
  return null;
}

/** The slot index that's fighting, or -1. */
export function fightSlot(p: PlayerState): number {
  return p.slots.findIndex((s) => isFightId(s?.actionId));
}

export function endFight(p: PlayerState) {
  const i = fightSlot(p);
  if (i >= 0) p.slots[i] = null;
  p.fight = null;
}

export interface CombatReport {
  kills: number;
  damageDealt: number;
  damageTaken: number;
  foodEaten: number;
}

function log(f: FightState, at: number, text: string, kind: FightState['log'][number]['kind']) {
  f.log.push({ at, text, kind });
  if (f.log.length > 6) f.log.shift();
}

/** Eats the best food in the bag if HP is low. */
function autoEat(p: PlayerState, report: ProgressReport, cr: CombatReport, max: number, f: FightState, at: number) {
  if (p.hp >= max * EAT_BELOW) return;
  let best: string | null = null;
  for (const s of p.inventory) {
    const h = s ? ITEMS[s.id]?.heals : undefined;
    if (h && (!best || h > ITEMS[best].heals!)) best = s!.id;
  }
  if (!best) return;
  removeFromBag(p.inventory, best, 1);
  const heal = foodHeal(p, best);
  p.hp = Math.min(max, p.hp + heal);
  report.used[best] = (report.used[best] ?? 0) + 1;
  cr.foodEaten++;
  log(f, at, `Ate ${ITEMS[best].name} (+${heal} HP)`, 'info');
}

/**
 * Runs the current fight forward by `ms`. Returns a stop reason if the fight ended by itself
 * (knocked out, out of ammo, mini boss defeated), else null.
 */
export function advanceFight(
  p: PlayerState, ms: number, report: ProgressReport, cr: CombatReport, startAt: number, rng: () => number = Math.random,
): { stop: string | null; usedMs: number } {
  const f = p.fight;
  if (!f) return { stop: 'No fight', usedMs: 0 };
  const monster = MONSTER_MAP[f.monsterId];
  let t = 0;
  while (t < ms) {
    const at = startAt + t;
    if (f.respawn > 0) {
      const step = Math.min(f.respawn, ms - t);
      f.respawn -= step;
      t += step;
      if (f.respawn <= 0) { f.monsterHp = monster.hp; f.monsterTimer = monster.speedMs; f.kindle = 0; f.warded = false; log(f, at, `A ${monster.name} appears!`, 'info'); }
      continue;
    }
    const step = Math.min(f.playerTimer, f.monsterTimer, ms - t);
    f.playerTimer -= step;
    f.monsterTimer -= step;
    t += step;
    regenHp(p, step); // you slowly heal even while fighting
    const now = startAt + t;

    // Your attack
    if (f.playerTimer <= 0) {
      const s = combatStats(p, monster);
      f.playerTimer += s.speedMs;
      if (s.style !== 'melee') {
        if (!s.ammo) return { stop: s.style === 'ranged' ? 'Out of arrows' : 'Out of runes', usedMs: t };
        const save = s.style === 'ranged' && relicOn(p, 'galewhisper_bow') ? RELIC.arrowSave : AMMO_SAVE;
        if (rng() >= save) {
          removeFromBag(p.inventory, s.ammo, 1);
          report.used[s.ammo] = (report.used[s.ammo] ?? 0) + 1;
        }
      }
      const crit = f.critReady;
      f.critReady = false;
      if (crit || rng() < s.accuracy) {
        let dmg = 1 + Math.floor(rng() * s.maxHit);
        if (crit) dmg = Math.ceil(s.maxHit * CRIT_MULT);
        // ✨ Emberheart Blade: hotter with every swing at the same foe.
        if (s.style === 'melee' && relicOn(p, 'emberheart_blade')) {
          dmg = Math.round(dmg * (1 + Math.min(RELIC.kindleMax, RELIC.kindlePerSwing * (f.kindle ?? 0))));
          f.kindle = (f.kindle ?? 0) + 1;
        }
        // 🌟 Ascended: extra damage to mini bosses.
        if (monster.miniboss) dmg = Math.round(dmg * (1 + ascBonus(p, 'bd') / 100));
        // 🌋 Molten (Cinderpeak town bonus): more damage to everything.
        const molten = ascBonus(p, 'mo');
        if (molten) dmg = Math.round(dmg * (1 + molten / 100));
        dmg = Math.min(dmg, f.monsterHp);
        f.monsterHp -= dmg;
        cr.damageDealt += dmg;
        addXp(p, { skill: s.style }, report, dmg * 4);
        addXp(p, { skill: 'health' }, report, Math.round(dmg * 1.33));
        log(f, now, crit ? `CRITICAL! You hit ${dmg}` : `You hit ${dmg}`, 'you');
      } else {
        log(f, now, 'You missed', 'you');
      }
      if (f.monsterHp <= 0) {
        cr.kills++;
        f.kills++;
        let loot = rollLoot(monster.lootTable, rng);
        // ✨ Pedlar's Patchwork Coat: a little more coin from every monster.
        if (relicOn(p, 'patchwork_coat')) loot = loot.map((st) => (st.id === 'coins' ? { ...st, qty: Math.round(st.qty * RELIC.coatCoins) } : st));
        // 🌟 Ascended: more coins from monsters.
        const ascCoins = ascBonus(p, 'cn');
        if (ascCoins) loot = loot.map((st) => (st.id === 'coins' ? { ...st, qty: Math.round(st.qty * (1 + ascCoins / 100)) } : st));
        giveLoot(p, loot, monster.ascension ? { overflowToBank: true } : undefined); // 🌌 once-a-day bosses never lose loot to a full bag
        for (const st of loot) report.gained[st.id] = (report.gained[st.id] ?? 0) + st.qty;
        log(f, now, `${monster.name} defeated!`, 'loot');
        rollFestivalToken(p, report, now, true);
        if (monster.miniboss) {
          p.bossReadyAt[monster.id] = monster.weekly ? nextWeeklyReset(now) : monster.ascension ? nextMidnight(now) : now + monster.miniboss.respawnMs;
          // 🌌 Ascension bosses: one Ascended item for any slot, with better grade odds (capped by your level).
          if (monster.ascension) {
            const base = ASC_BASES[Math.floor(rng() * ASC_BASES.length)];
            const id = rollAscended(base, lvl(p, s.style), REGIONS.indexOf('Primordial Rift'), rng, ASC_BOSS_ODDS[monster.ascension]);
            giveLoot(p, [{ id, qty: 1 }], { overflowToBank: true });
            report.gained[id] = (report.gained[id] ?? 0) + 1;
            (report.ascended ??= []).push(id);
          }
          const petId = monster.weekly ? 'pet_sprout' : monster.pet ?? null;
          const pet = petId ? rollPet(p, 'combat', rng, petId) : null;
          if (pet) report.pets.push(pet);
          return { stop: `${monster.name} defeated!`, usedMs: t };
        }
        f.respawn = RESPAWN_MS;
        f.playerTimer = s.speedMs;
        continue;
      }
    }

    // The monster's attack
    if (f.monsterTimer <= 0) {
      f.monsterTimer += monster.speedMs;
      const s = combatStats(p, monster);
      const blocked = f.blockUntil >= now;
      f.blockUntil = 0;
      const lands = rng() < s.enemyAccuracy;
      if (lands && !f.warded && relicOn(p, 'oathkeeper_shield')) {
        // ✨ Oathkeeper Shield: the first blow from every foe never lands.
        f.warded = true;
        addXp(p, { skill: 'defense' }, report, 4);
        log(f, now, `The Oathkeeper wards off ${monster.name}'s blow!`, 'them');
      } else if (lands) {
        let dmg = Math.floor(rng() * (monster.maxHit + 1));
        if (blocked) dmg = Math.floor(dmg / 2);
        p.hp -= dmg;
        cr.damageTaken += dmg;
        addXp(p, { skill: 'defense' }, report, blocked ? 3 + dmg : dmg);
        log(f, now, blocked ? `Blocked! ${monster.name} hits ${dmg}` : `${monster.name} hits ${dmg}`, 'them');
      } else {
        addXp(p, { skill: 'defense' }, report, blocked ? 4 : 2);
        log(f, now, blocked ? `Blocked! ${monster.name} misses` : `${monster.name} misses`, 'them');
      }
      if (p.hp <= 0) {
        p.hp = maxHp(p);
        return { stop: `Knocked out by ${monster.name} — you wake up safe in town (nothing lost)`, usedMs: t };
      }
      autoEat(p, report, cr, maxHp(p), f, now);
      // Cozy: low on health with no food left? Head home to rest instead of getting knocked out.
      if (p.hp < maxHp(p) * RETREAT_BELOW && !hasFood(p)) {
        return { stop: 'Low on health and out of food — you headed home to rest (nothing lost)', usedMs: t };
      }
    }
  }
  return { stop: null, usedMs: ms };
}

/** Out of combat, hit points slowly come back. */
export function regenHp(p: PlayerState, ms: number) {
  const max = maxHp(p);
  if (p.hp >= max) { p.hp = max; p.regenMs = 0; return; }
  // ♨️ Cinderpeak's hot springs: resting there heals much faster.
  // ❄️ Hearthwarm (Frosthold town bonus) heals faster everywhere.
  p.regenMs += (inHotSprings(p) ? ms * HOT_SPRING_MULT : ms) * (1 + ascBonus(p, 'hw') / 100);
  const gained = Math.floor(p.regenMs / REGEN_MS);
  if (gained > 0) {
    p.hp = Math.min(max, p.hp + gained);
    p.regenMs -= gained * REGEN_MS;
  }
}

export function eatFood(p: PlayerState, id: string): string | null {
  const heals = ITEMS[id]?.heals;
  if (!heals) return "You can't eat that";
  if (countInBag(p.inventory, id) < 1) return 'Not in your bag';
  const max = maxHp(p);
  if (p.hp >= max) return "You're already at full health";
  removeFromBag(p.inventory, id, 1);
  p.hp = Math.min(max, p.hp + foodHeal(p, id));
  return null;
}

/** How much a food heals you (🌟 Ascended gear can make food heal more). */
export function foodHeal(p: PlayerState, id: string): number {
  return Math.round((ITEMS[id]?.heals ?? 0) * (1 + ascBonus(p, 'fh') / 100));
}
