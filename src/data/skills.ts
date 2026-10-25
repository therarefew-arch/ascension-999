// Skills and the actions (resources/recipes) you can idle on or play minigames with. Static data only.
import {
  BOWS, CRAFTED_TOOLS, ELEMENTS, elementRegion, GEAR_PIECES, ITEMS, MAX_UPGRADE, METAL_ORES, METAL_TIERS, STAFF_WOODS, TOOL_TIERS, toolName,
  upgradeId, type SkillId,
} from './items';
import { FISH, METALS, TIER_COUNT, tierLevel, tierRegion, tierTimeMs, tierXp, WOODS, type Region } from './tiers';
import type { SoundKey } from '../audio/soundList';

export interface SkillDef {
  id: SkillId;
  name: string;
  verb: string;
  place: string;
  description: string;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  mining: { id: 'mining', name: 'Mining', verb: 'Mining', place: 'The Mine', description: 'Dig ores and stone from the hills.' },
  smithing: { id: 'smithing', name: 'Smithing', verb: 'Smithing', place: 'The Forge', description: 'Smelt ores into bars and hammer bars into weapons and armour.' },
  woodcutting: { id: 'woodcutting', name: 'Woodcutting', verb: 'Chopping', place: 'Whispering Woods', description: 'Chop trees for logs.' },
  firemaking: { id: 'firemaking', name: 'Firemaking', verb: 'Burning', place: 'The Campfire', description: 'Light cozy fires from logs.' },
  fishing: { id: 'fishing', name: 'Fishing', verb: 'Fishing', place: 'Willow River', description: 'Catch fish from the river — or relax sorting the day\'s catch into pairs.' },
  cooking: { id: 'cooking', name: 'Cooking', verb: 'Cooking', place: 'The Kitchen', description: 'Keep the fire fed with logs and cook fish into food — or unwind with some pantry prep.' },
  crafting: { id: 'crafting', name: 'Crafting', verb: 'Crafting', place: 'The Workshop', description: 'Make a tool for every skill and upgrade it +1 to +10.' },
  enhancing: { id: 'enhancing', name: 'Enhancing', verb: 'Enhancing', place: 'Rune Tower', description: 'Improve weapons and armour +1 to +10. A failed try only uses the bars — never the item.' },
  runecrafting: { id: 'runecrafting', name: 'Runecrafting', verb: 'Runecrafting', place: 'Rune Altar', description: 'Shape rune essence into talismans and runes, and give blank staffs an element.' },
  melee: { id: 'melee', name: 'Melee', verb: 'Fighting', place: 'Training Grounds', description: 'Fight up close with swords. Beats Ranged.' },
  ranged: { id: 'ranged', name: 'Ranged', verb: 'Fighting', place: 'Training Grounds', description: 'Fight from afar with bows and arrows. Beats Magic.' },
  magic: { id: 'magic', name: 'Magic', verb: 'Fighting', place: 'Training Grounds', description: 'Cast spells with staffs and runes. Beats Melee.' },
  defense: { id: 'defense', name: 'Defense', verb: 'Fighting', place: 'Training Grounds', description: 'Take less damage. Trained by dodging and blocking.' },
  health: { id: 'health', name: 'Health', verb: 'Fighting', place: 'Training Grounds', description: 'More hit points. Trained by all combat.' },
};
/** Gathering & making skills (shown on the Skills tab). */
export const SKILL_ORDER: SkillId[] = ['mining', 'smithing', 'woodcutting', 'firemaking', 'fishing', 'cooking', 'crafting', 'runecrafting', 'enhancing'];
/** Combat skills (shown on the Combat tab). */
export const COMBAT_SKILLS: SkillId[] = ['melee', 'ranged', 'magic', 'defense', 'health'];
export const ALL_SKILLS: SkillId[] = [...SKILL_ORDER, ...COMBAT_SKILLS];

export interface ActionDef {
  id: string;
  skill: SkillId;
  name: string;
  /** Tab inside the skill screen (Smithing: Smelt / Weapons / Armour, Crafting: Tools / Upgrades). */
  tab?: string;
  level: number;
  durationMs: number;
  xp: number;
  inputs: { item: string; qty: number }[];
  /** What it produces (null = nothing, e.g. burning logs). Always given through the central loot system. */
  output: { item: string; qty: number } | null;
  /** Loot table id (made from `output`). */
  lootTable: string;
  /** Cooking: the better food a great minigame result makes (its own loot table). */
  greatLootTable?: string;
  /** Item shown as this action's icon. */
  iconItem: string;
  sound: SoundKey;
  /** The skill's tool (of at least this tier) must be equipped. Tier-0 resources need no tool. */
  needsTool?: number;
  /** An item that must be in your bag but is NOT used up (e.g. a talisman). */
  requires?: string;
  /** 'upgrade' = guaranteed tool upgrade (Crafting). 'enhance' = chance-based gear upgrade (Enhancing). */
  kind?: 'upgrade' | 'enhance';
  /** For upgrades: the item being improved (from the bag, or straight from its gear slot). */
  upgrades?: string;
  /** Region this belongs to. Actions in regions that aren't built yet are locked. */
  region?: Region;
}

const actions: ActionDef[] = [];
const add = (a: Omit<ActionDef, 'lootTable'> & { lootTable?: string }) =>
  actions.push({ ...a, lootTable: a.lootTable ?? a.id });

// Tiers 0–1 keep their original hand-tuned numbers; higher tiers follow the tier formulas (tiers.ts).
const gatherXp = (t: number) => (t === 0 ? 8 : t === 1 ? 12 : tierXp(t));
const gatherMs = (t: number) => (t === 0 ? 3000 : t === 1 ? 3300 : tierTimeMs(t));
const tool = (t: number) => (t > 0 ? t : undefined);

// ----- Mining -----
add({ id: 'mine_copper', skill: 'mining', name: 'Copper ore', level: 1, durationMs: 3000, xp: 8, inputs: [], output: { item: 'copper_ore', qty: 1 }, iconItem: 'copper_ore', sound: 'mine', region: 'Pocketvale' });
add({ id: 'mine_tin', skill: 'mining', name: 'Tin ore', level: 1, durationMs: 3000, xp: 8, inputs: [], output: { item: 'tin_ore', qty: 1 }, iconItem: 'tin_ore', sound: 'mine', region: 'Pocketvale' });
add({ id: 'mine_stone', skill: 'mining', name: 'Stone', level: 1, durationMs: 2600, xp: 5, inputs: [], output: { item: 'stone', qty: 1 }, iconItem: 'stone', sound: 'mine', region: 'Pocketvale' });
add({ id: 'mine_essence', skill: 'mining', name: 'Rune essence', level: 5, durationMs: 2800, xp: 7, inputs: [], output: { item: 'rune_essence', qty: 1 }, iconItem: 'rune_essence', sound: 'mine', region: 'Pocketvale' });
add({ id: 'mine_iron', skill: 'mining', name: 'Iron ore', level: tierLevel(1), needsTool: 1, durationMs: 3300, xp: 12, inputs: [], output: { item: 'iron_ore', qty: 1 }, iconItem: 'iron_ore', sound: 'mine', region: tierRegion(1) });
add({ id: 'mine_coal', skill: 'mining', name: 'Coal', level: tierLevel(2), needsTool: 2, durationMs: gatherMs(2), xp: gatherXp(2), inputs: [], output: { item: 'coal', qty: 1 }, iconItem: 'coal', sound: 'mine', region: tierRegion(2) });
for (let t = 3; t < TIER_COUNT; t++) {
  const m = METALS[t];
  add({ id: `mine_${m.key}`, skill: 'mining', name: `${m.name} ore`, level: tierLevel(t), needsTool: t, durationMs: gatherMs(t), xp: gatherXp(t), inputs: [], output: { item: `${m.key}_ore`, qty: 1 }, iconItem: `${m.key}_ore`, sound: 'mine', region: tierRegion(t) });
}

// ----- Smithing: smelt bars, then weapons and armour -----
for (const metal of METAL_TIERS) {
  const t = metal.t;
  add({
    id: `smelt_${metal.tier}`, skill: 'smithing', name: `${metal.name} bar`, tab: 'Smelt', level: metal.level, needsTool: tool(t),
    durationMs: gatherMs(t), xp: gatherXp(t), inputs: METAL_ORES[t], output: { item: metal.bar, qty: 1 }, iconItem: metal.bar, sound: 'smith', region: metal.region,
  });
}
for (const metal of METAL_TIERS) {
  for (const piece of GEAR_PIECES) {
    const id = `${metal.tier}_${piece.key}`;
    add({
      id: `smith_${id}`, skill: 'smithing', name: `${metal.name} ${piece.name}`, tab: piece.tab,
      level: metal.level + piece.levelOffset, needsTool: tool(metal.t),
      durationMs: 2500 + 500 * piece.bars + 100 * metal.t, xp: Math.round(metal.barXp * (0.6 * piece.bars + 0.4)),
      inputs: [{ item: metal.bar, qty: piece.bars }], output: { item: id, qty: 1 }, iconItem: id, sound: 'smith', region: metal.region,
    });
  }
}

// ----- Woodcutting & Firemaking -----
for (let t = 0; t < TIER_COUNT; t++) {
  const w = WOODS[t];
  add({ id: `chop_${w.key}`, skill: 'woodcutting', name: `${w.name} tree`, level: tierLevel(t), needsTool: tool(t), durationMs: gatherMs(t), xp: gatherXp(t), inputs: [], output: { item: `${w.key}_logs`, qty: 1 }, iconItem: `${w.key}_logs`, sound: 'chop', region: tierRegion(t) });
}
for (let t = 0; t < TIER_COUNT; t++) {
  const w = WOODS[t];
  // Burning gives XP, no item.
  add({ id: `burn_${w.key}`, skill: 'firemaking', name: `${w.name} logs`, level: tierLevel(t), needsTool: tool(t), durationMs: gatherMs(t), xp: t === 0 ? 9 : t === 1 ? 13 : Math.round(tierXp(t) * 1.1), inputs: [{ item: `${w.key}_logs`, qty: 1 }], output: null, iconItem: `${w.key}_logs`, sound: 'crackle', region: tierRegion(t) });
}

// ----- Fishing & Cooking (cooking needs a fire fed with logs; the minigame can make "Great" food) -----
export const GREAT_FOOD: Record<string, string> = {};
for (let t = 0; t < TIER_COUNT; t++) {
  const f = FISH[t];
  add({ id: `fish_${f.key}`, skill: 'fishing', name: f.name, level: tierLevel(t), needsTool: tool(t), durationMs: gatherMs(t), xp: gatherXp(t), inputs: [], output: { item: `raw_${f.key}`, qty: 1 }, iconItem: `raw_${f.key}`, sound: 'splash', region: tierRegion(t) });
  add({
    id: `cook_${f.key}`, skill: 'cooking', name: f.name, level: tierLevel(t), needsTool: tool(t),
    durationMs: t === 0 ? 2500 : t === 1 ? 2800 : tierTimeMs(t) - 300, xp: gatherXp(t),
    inputs: [{ item: `raw_${f.key}`, qty: 1 }], output: { item: `cooked_${f.key}`, qty: 1 }, greatLootTable: `cook_${f.key}_great`,
    iconItem: `cooked_${f.key}`, sound: 'sizzle', region: tierRegion(t),
  });
  GREAT_FOOD[`cook_${f.key}_great`] = `great_${f.key}`;
}

// ----- Crafting: a tool for every skill, then upgrades (always succeed) -----
for (const tier of TOOL_TIERS) {
  for (const tl of CRAFTED_TOOLS) {
    const id = `${tier.tier}_${tl.key}`;
    const name = toolName(tier, tl);
    const level = tier.level + tl.levelOffset;
    // Tier-k tools need a tier k-1 knife (the Stone knife itself needs nothing).
    const needsTool = tier.toolTier > 0 ? tier.toolTier - 1 : undefined;
    const inputs = [{ item: tier.logs, qty: tl.logs }, { item: tier.hard, qty: tl.hard }];
    add({
      id: `craft_${id}`, skill: 'crafting', name, tab: 'Tools', level, needsTool,
      durationMs: 2600 + 400 * (tl.logs + tl.hard), xp: Math.round(tier.xpBase * (0.5 * (tl.logs + tl.hard) + 0.5)),
      inputs, output: { item: id, qty: 1 }, iconItem: id, sound: 'craft', region: tier.region,
    });
    for (let n = 0; n < MAX_UPGRADE; n++) {
      add({
        id: `upgrade_${id}_${n + 1}`, skill: 'crafting', name: `${name} +${n + 1}`, tab: 'Upgrades',
        level: level + 3 * (n + 1), needsTool, durationMs: 4000, xp: Math.round(tier.xpBase * (2 + n) * 1.2),
        inputs: [{ item: upgradeId(id, n), qty: 1 }, { item: tier.logs, qty: (n + 1) * 2 }, { item: tier.hard, qty: n + 1 }],
        output: { item: upgradeId(id, n + 1), qty: 1 }, iconItem: upgradeId(id, n + 1), sound: 'craft',
        kind: 'upgrade', upgrades: upgradeId(id, n), region: tier.region,
      });
    }
  }
}

// ----- Crafting: bows, blank staffs and arrows (one of each per tier) -----
add({ id: 'craft_pine_shortbow', skill: 'crafting', name: 'Pine shortbow', tab: 'Weapons', level: 8, durationMs: 4000, xp: 16, inputs: [{ item: 'pine_logs', qty: 3 }, { item: 'stone', qty: 1 }], output: { item: 'pine_shortbow', qty: 1 }, iconItem: 'pine_shortbow', sound: 'craft', region: 'Pocketvale' });
add({ id: 'craft_pine_staff', skill: 'crafting', name: 'Blank pine staff', tab: 'Weapons', level: 12, durationMs: 4000, xp: 18, inputs: [{ item: 'pine_logs', qty: 2 }, { item: 'stone', qty: 2 }], output: { item: 'pine_staff', qty: 1 }, iconItem: 'pine_staff', sound: 'craft', region: 'Pocketvale' });
add({ id: 'craft_oak_longbow', skill: 'crafting', name: 'Oak longbow', tab: 'Weapons', level: tierLevel(1) + 5, needsTool: 0, durationMs: 4500, xp: 40, inputs: [{ item: 'oak_logs', qty: 3 }, { item: 'bronze_bar', qty: 1 }], output: { item: 'oak_longbow', qty: 1 }, iconItem: 'oak_longbow', sound: 'craft', region: tierRegion(1) });
add({ id: 'craft_oak_staff', skill: 'crafting', name: 'Blank oak staff', tab: 'Weapons', level: tierLevel(1) + 10, needsTool: 0, durationMs: 4500, xp: 44, inputs: [{ item: 'oak_logs', qty: 2 }, { item: 'iron_bar', qty: 1 }], output: { item: 'oak_staff', qty: 1 }, iconItem: 'oak_staff', sound: 'craft', region: tierRegion(1) });
for (let t = 2; t < TIER_COUNT; t++) {
  const w = WOODS[t];
  const bow = BOWS[t];
  add({ id: `craft_${bow.id}`, skill: 'crafting', name: bow.name, tab: 'Weapons', level: tierLevel(t) + 5, needsTool: t - 1, durationMs: 4500 + 100 * t, xp: Math.round(tierXp(t) * 3), inputs: [{ item: `${w.key}_logs`, qty: 3 }, { item: `${METALS[t - 1].key}_bar`, qty: 1 }], output: { item: bow.id, qty: 1 }, iconItem: bow.id, sound: 'craft', region: tierRegion(t) });
  add({ id: `craft_${w.key}_staff`, skill: 'crafting', name: `Blank ${w.name.toLowerCase()} staff`, tab: 'Weapons', level: tierLevel(t) + 10, needsTool: t - 1, durationMs: 4500 + 100 * t, xp: Math.round(tierXp(t) * 3.3), inputs: [{ item: `${w.key}_logs`, qty: 2 }, { item: `${METALS[t].key}_bar`, qty: 1 }], output: { item: `${w.key}_staff`, qty: 1 }, iconItem: `${w.key}_staff`, sound: 'craft', region: tierRegion(t) });
}
for (let t = 0; t < TIER_COUNT; t++) {
  const m = METALS[t];
  const logs = t === 0 ? 'pine_logs' : `${WOODS[t].key}_logs`;
  add({ id: `craft_${m.key}_arrows`, skill: 'crafting', name: `${m.name} arrows ×15`, tab: 'Ammo', level: t === 0 ? 5 : tierLevel(t) + 2, needsTool: tool(t), durationMs: t === 0 ? 3200 : 3500 + 50 * t, xp: t === 0 ? 10 : t === 1 ? 18 : Math.round(tierXp(t) * 1.5), inputs: [{ item: logs, qty: 1 }, { item: `${m.key}_bar`, qty: 1 }], output: { item: `${m.key}_arrows`, qty: 15 }, iconItem: `${m.key}_arrows`, sound: 'craft', region: tierRegion(t) });
}

// ----- Runecrafting: talismans (kept), runes (need the talisman in your bag), elemental staffs -----
for (const el of ELEMENTS) {
  add({
    id: `rc_talisman_${el.element}`, skill: 'runecrafting', name: `${el.name} talisman`, tab: 'Talismans', level: el.level,
    durationMs: 4000, xp: 20 + el.level, inputs: [{ item: 'rune_essence', qty: 5 }, { item: 'stone', qty: 2 }],
    output: { item: `${el.element}_talisman`, qty: 1 }, iconItem: `${el.element}_talisman`, sound: 'enchant', region: elementRegion(el.level),
  });
}
for (const el of ELEMENTS) {
  add({
    id: `rc_runes_${el.element}`, skill: 'runecrafting', name: `${el.name} runes ×2`, tab: 'Runes', level: el.level,
    durationMs: 2800, xp: 6 + Math.round(el.level / 5) * 2, inputs: [{ item: 'rune_essence', qty: 1 }],
    requires: `${el.element}_talisman`,
    output: { item: `${el.element}_rune`, qty: 2 }, iconItem: `${el.element}_rune`, sound: 'enchant', region: elementRegion(el.level),
  });
}
for (const s of STAFF_WOODS) {
  for (const el of ELEMENTS) {
    const staffId = `${s.wood}_${el.element}_staff`;
    add({
      id: `rc_staff_${s.wood}_${el.element}`, skill: 'runecrafting', name: `${s.name} ${el.name.toLowerCase()} staff`, tab: 'Staffs',
      level: Math.max(s.imbueLevel, el.level + (s.t >= 1 ? 30 : 2)),
      durationMs: 5000, xp: s.t === 0 ? 40 + el.level * 2 : s.t === 1 ? 120 + el.level * 2 : Math.round(tierXp(s.t) * 10 + el.level * 2),
      inputs: [{ item: `${s.wood}_staff`, qty: 1 }, { item: `${el.element}_rune`, qty: s.runes }],
      output: { item: staffId, qty: 1 }, iconItem: staffId, sound: 'enchant', region: ITEMS[staffId].region,
    });
  }
}

// ----- Enhancing: improve weapons and armour (chance-based; failure only uses the bars) -----
const ENHANCEABLE: { id: string; name: string; bar: string; level: number; barXp: number; region: Region }[] = [
  ...METAL_TIERS.flatMap((metal) => GEAR_PIECES.map((piece) => ({
    id: `${metal.tier}_${piece.key}`, name: `${metal.name} ${piece.name}`, bar: metal.bar, level: metal.level, barXp: metal.barXp, region: metal.region,
  }))),
  ...BOWS.map((w) => ({ id: w.id, name: w.name, bar: w.bar, level: tierLevel(w.t), barXp: gatherXp(w.t), region: w.region })),
  ...STAFF_WOODS.flatMap((s) => ELEMENTS.map((el) => ({
    id: `${s.wood}_${el.element}_staff`, name: `${s.name} ${el.name.toLowerCase()} staff`, bar: s.bar,
    level: tierLevel(s.t), barXp: gatherXp(s.t), region: ITEMS[`${s.wood}_${el.element}_staff`].region!,
  }))),
];
for (const g of ENHANCEABLE) {
  for (let n = 0; n < MAX_UPGRADE; n++) {
    add({
      id: `enhance_${g.id}_${n + 1}`, skill: 'enhancing', name: `${g.name} +${n + 1}`,
      level: g.level + 4 * n, durationMs: 4000, xp: Math.round(g.barXp * (n + 1) * 1.5),
      inputs: [{ item: upgradeId(g.id, n), qty: 1 }, { item: g.bar, qty: n + 1 }],
      output: { item: upgradeId(g.id, n + 1), qty: 1 }, iconItem: upgradeId(g.id, n + 1), sound: 'enchant',
      kind: 'enhance', upgrades: upgradeId(g.id, n), region: g.region,
    });
  }
}

export const ACTIONS: Record<string, ActionDef> = Object.fromEntries(actions.map((a) => [a.id, a]));
export const ACTION_LIST = actions;

export function actionsForSkill(skill: SkillId): ActionDef[] {
  return actions.filter((a) => a.skill === skill);
}

/** Tabs a skill screen shows (empty = no tabs). */
export function tabsForSkill(skill: SkillId): string[] {
  return Array.from(new Set(actionsForSkill(skill).map((a) => a.tab).filter((t): t is string => !!t)));
}
