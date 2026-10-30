// 🏡 Your Cottage (in Pocketvale): build furniture from the things every skill makes.
// Each piece sits in its own spot in the room and gives a small permanent perk.
// Materials come from your bag first, then your bank. Building gives XP in that piece's skill.
import type { SkillId } from '../data/items';
import { getItem } from '../data/items';
import { regionOpen, tierRegion, tierXp, type Region } from '../data/tiers';
import type { ProgressReport } from './idle';
import { addXp, skillLevel } from './idle';
import { countInBag, countInBank, removeFromBag, removeFromBank } from './inventory';
import type { ItemStack, PlayerState } from './player';
import { FESTIVALS, type FestivalId } from '../data/festivals';

export type Perk =
  | { kind: 'xp'; skill: SkillId | 'all' | 'combat'; pct: number }
  | { kind: 'fire'; pct: number }
  | { kind: 'stars'; pct: number };

export interface Furniture {
  id: string;
  name: string;
  emoji: string;
  /** Spot in the room (percent from left / top). */
  x: number;
  y: number;
  skill: SkillId;
  level: number;
  /** Town tier the materials come from. */
  tier: number;
  cost: ItemStack[];
  perk: Perk;
  /** Needs Lunaria brought home first. */
  needsLunaria?: boolean;
  /** Festival keepsakes come from the festival stall instead of being built. */
  festival?: FestivalId;
  /** 👪 Earned with your family (a 🥇 week) instead of being built. */
  family?: boolean;
  blurb: string;
}

export const FURNITURE: Furniture[] = [
  // ----- Pocketvale -----
  { id: 'pine_bed', name: 'Pine bed', emoji: '🛏️', x: 14, y: 58, skill: 'crafting', level: 5, tier: 0,
    cost: [{ id: 'pine_logs', qty: 30 }, { id: 'stone', qty: 10 }], perk: { kind: 'xp', skill: 'all', pct: 1 }, blurb: 'A good night\'s sleep makes everything easier.' },
  { id: 'stone_hearth', name: 'Stone hearth', emoji: '🔥', x: 50, y: 30, skill: 'firemaking', level: 10, tier: 0,
    cost: [{ id: 'stone', qty: 40 }, { id: 'pine_logs', qty: 20 }], perk: { kind: 'fire', pct: 25 }, blurb: 'Warm and crackling. Your cooking fire burns longer.' },
  { id: 'shrimp_tank', name: 'Shrimp tank', emoji: '🐠', x: 84, y: 36, skill: 'fishing', level: 15, tier: 0,
    cost: [{ id: 'raw_shrimp', qty: 20 }, { id: 'bronze_bar', qty: 5 }, { id: 'stone', qty: 10 }], perk: { kind: 'xp', skill: 'fishing', pct: 3 }, blurb: 'Your first catches, happily swimming.' },
  { id: 'copper_kettle', name: 'Copper kettle', emoji: '🫖', x: 62, y: 42, skill: 'smithing', level: 20, tier: 0,
    cost: [{ id: 'bronze_bar', qty: 10 }, { id: 'copper_ore', qty: 5 }], perk: { kind: 'xp', skill: 'cooking', pct: 3 }, blurb: 'Always on the boil.' },
  { id: 'herb_rack', name: 'Herb rack', emoji: '🌿', x: 30, y: 22, skill: 'herblore', level: 15, tier: 0,
    cost: [{ id: 'dried_meadowsweet', qty: 20 }, { id: 'pine_logs', qty: 10 }], perk: { kind: 'xp', skill: 'herblore', pct: 3 }, blurb: 'Bundles of herbs drying in the window.' },
  { id: 'flower_box', name: 'Flower box', emoji: '🌷', x: 72, y: 20, skill: 'farming', level: 15, tier: 0,
    cost: [{ id: 'garlic', qty: 15 }, { id: 'pine_logs', qty: 10 }], perk: { kind: 'xp', skill: 'farming', pct: 3 }, blurb: 'Grown from your very own garden.' },
  // ----- Ironmoor -----
  { id: 'oak_table', name: 'Oak table', emoji: '🪑', x: 46, y: 64, skill: 'crafting', level: 55, tier: 1,
    cost: [{ id: 'oak_logs', qty: 30 }, { id: 'iron_bar', qty: 10 }], perk: { kind: 'xp', skill: 'crafting', pct: 3 }, blurb: 'Sturdy enough for a feast.' },
  { id: 'display_anvil', name: 'Display anvil', emoji: '⚒️', x: 88, y: 66, skill: 'smithing', level: 60, tier: 1,
    cost: [{ id: 'iron_bar', qty: 25 }], perk: { kind: 'xp', skill: 'smithing', pct: 3 }, blurb: 'Polished to a shine. Ironmoor would approve.' },
  { id: 'miners_lamp', name: "Miner's lamp", emoji: '🏮', x: 8, y: 26, skill: 'mining', level: 55, tier: 1,
    cost: [{ id: 'iron_ore', qty: 40 }, { id: 'oak_logs', qty: 10 }], perk: { kind: 'xp', skill: 'mining', pct: 3 }, blurb: 'A brass lamp like the ones in the Deep Mine.' },
  // ----- Coalhaven -----
  { id: 'rocking_chair', name: 'Willow rocking chair', emoji: '🛋️', x: 28, y: 72, skill: 'woodcutting', level: 115, tier: 2,
    cost: [{ id: 'willow_logs', qty: 40 }, { id: 'steel_bar', qty: 10 }], perk: { kind: 'xp', skill: 'woodcutting', pct: 3 }, blurb: 'Creaks gently. Perfect for a nap.' },
  { id: 'telescope', name: 'Stargazing telescope', emoji: '🔭', x: 90, y: 14, skill: 'crafting', level: 120, tier: 2,
    cost: [{ id: 'steel_bar', qty: 15 }, { id: 'willow_logs', qty: 20 }], perk: { kind: 'stars', pct: 20 }, blurb: 'Pointed at the sky. Lucky Stars find you more often.' },
  { id: 'weapon_rack', name: 'Weapon rack', emoji: '🗡️', x: 70, y: 70, skill: 'smithing', level: 125, tier: 2,
    cost: [{ id: 'steel_bar', qty: 15 }, { id: 'steel_arrows', qty: 50 }], perk: { kind: 'xp', skill: 'combat', pct: 3 }, blurb: 'Every blade has a story.' },
  // ----- Bluecliff -----
  { id: 'maple_bookcase', name: 'Maple bookcase', emoji: '📚', x: 16, y: 36, skill: 'crafting', level: 180, tier: 3,
    cost: [{ id: 'maple_logs', qty: 40 }, { id: 'cobalt_bar', qty: 10 }], perk: { kind: 'xp', skill: 'runecrafting', pct: 3 }, blurb: 'Full of rune books — and your Tales.' },
  { id: 'rune_mirror', name: 'Rune mirror', emoji: '🪞', x: 40, y: 18, skill: 'enhancing', level: 185, tier: 3,
    cost: [{ id: 'cobalt_bar', qty: 10 }, { id: 'nature_rune', qty: 200 }], perk: { kind: 'xp', skill: 'enhancing', pct: 3 }, blurb: 'Runes shimmer around the frame.' },
  // ----- Lunaria -----
  { id: 'moon_chandelier', name: 'Moonsilver chandelier', emoji: '🕯️', x: 52, y: 8, skill: 'smithing', level: 250, tier: 4, needsLunaria: true,
    cost: [{ id: 'moonsilver_bar', qty: 20 }, { id: 'moonwood_logs', qty: 20 }], perk: { kind: 'xp', skill: 'all', pct: 2 }, blurb: 'A gift of light from a town you brought home.' },
  // ----- Cinderpeak -----
  { id: 'kiln_vase', name: 'Kiln-fired vase', emoji: '🏺', x: 6, y: 80, skill: 'crafting', level: 325, tier: 5,
    cost: [{ id: 'emberbark_logs', qty: 30 }, { id: 'stone', qty: 60 }, { id: 'fire_rune', qty: 100 }], perk: { kind: 'xp', skill: 'firemaking', pct: 3 }, blurb: 'Fired in the Kiln Wyrm\'s kiln (while it snored).' },
  { id: 'spice_shelf', name: 'Spice shelf', emoji: '🌶️', x: 58, y: 82, skill: 'cooking', level: 330, tier: 5,
    cost: [{ id: 'emberpepper', qty: 30 }, { id: 'dried_emberleaf', qty: 20 }, { id: 'emberbark_logs', qty: 10 }], perk: { kind: 'xp', skill: 'cooking', pct: 3 }, blurb: 'Jars of Ash Market spices. The whole cottage smells wonderful.' },
  { id: 'ember_brazier', name: 'Emberite brazier', emoji: '🪔', x: 36, y: 48, skill: 'smithing', level: 335, tier: 5,
    cost: [{ id: 'emberite_bar', qty: 20 }, { id: 'emberbark_logs', qty: 20 }], perk: { kind: 'fire', pct: 25 }, blurb: 'Glows all night. Your cooking fire burns even longer.' },
  // ----- Frosthold -----
  { id: 'frost_quilt', name: 'Frosthold patchwork quilt', emoji: '🧶', x: 76, y: 56, skill: 'crafting', level: 405, tier: 6,
    cost: [{ id: 'frostpine_logs', qty: 30 }, { id: 'dried_frostmint', qty: 25 }, { id: 'snowcabbage', qty: 20 }], perk: { kind: 'xp', skill: 'defense', pct: 3 }, blurb: 'Sewn while singing, the Frosthold way. Every patch is a verse.' },
  { id: 'singing_lantern', name: 'Singing ice lantern', emoji: '🧊', x: 40, y: 88, skill: 'firemaking', level: 410, tier: 6,
    cost: [{ id: 'frostcore_bar', qty: 20 }, { id: 'frostpine_logs', qty: 20 }], perk: { kind: 'fire', pct: 25 }, blurb: 'A candle inside clear ice. It hums softly while it burns, and so does your fire.' },
  // ----- Voidreach -----
  { id: 'void_window', name: 'Void-glass window', emoji: '🪟', x: 6, y: 50, skill: 'crafting', level: 490, tier: 7,
    cost: [{ id: 'voidstone_bar', qty: 20 }, { id: 'voidwood_logs', qty: 30 }], perk: { kind: 'stars', pct: 15 }, blurb: 'Look through it and you see the night sky, even at noon. Lucky Stars find you more often.' },
  // ----- Starfall Crater -----
  { id: 'star_orrery', name: 'Starmetal orrery', emoji: '🪐', x: 90, y: 92, skill: 'smithing', level: 575, tier: 8,
    cost: [{ id: 'starmetal_bar', qty: 25 }, { id: 'starbloom_logs', qty: 20 }, { id: 'starfruit', qty: 10 }], perk: { kind: 'xp', skill: 'combat', pct: 3 }, blurb: 'Little planets that circle a chip of the fallen star. It hums when you walk past.' },
  // ----- Celestine Spires -----
  { id: 'wind_chimes', name: 'Celestine wind chimes', emoji: '🎐', x: 22, y: 8, skill: 'crafting', level: 665, tier: 9,
    cost: [{ id: 'celestium_bar', qty: 20 }, { id: 'celestwood_logs', qty: 30 }], perk: { kind: 'xp', skill: 'all', pct: 2 }, blurb: 'Tuned by the Spires\' chime-makers. Every breeze through the window plays a little tune.' },
  // ----- The Primordial Rift -----
  { id: 'worldtree_sapling', name: 'Worldtree sapling', emoji: '🌳', x: 56, y: 54, skill: 'farming', level: 755, tier: 10,
    cost: [{ id: 'worldtree_logs', qty: 40 }, { id: 'worldpumpkin', qty: 30 }, { id: 'dried_worldroot', qty: 20 }], perk: { kind: 'xp', skill: 'all', pct: 3 }, blurb: 'A cutting of the very first tree, growing in a pot by the window. The whole cottage feels older and kinder.' },
];
/** 🎪 Festival keepsakes: traded for tokens at a festival stall (not built). +1% XP to everything each. */
const FESTIVAL_SPOTS: Record<string, [number, number]> = { blossom: [22, 44], midsummer: [64, 4], harvest: [80, 82], winter: [92, 44] };
export const FESTIVAL_FURNITURE: Furniture[] = FESTIVALS.map((fe) => ({
  id: fe.decoration.id, name: fe.decoration.name, emoji: fe.decoration.emoji, x: FESTIVAL_SPOTS[fe.id][0], y: FESTIVAL_SPOTS[fe.id][1],
  skill: 'crafting', level: 1, tier: 0, cost: [], perk: { kind: 'xp', skill: 'all', pct: 1 }, festival: fe.id, blurb: fe.decoration.blurb,
}));
/** 👪 The family keepsake: earned on your first 🥇 Gold family week (v0.0.1.56). */
export const FAMILY_FURNITURE: Furniture[] = [
  { id: 'family_portrait', name: 'Guild portrait', emoji: '🖼️', x: 38, y: 8, skill: 'crafting', level: 1, tier: 0, cost: [],
    perk: { kind: 'xp', skill: 'all', pct: 1 }, family: true, blurb: 'Everyone squeezed into one frame, someone blinking. It makes the cottage feel full.' },
];
export const ALL_FURNITURE = [...FURNITURE, ...FESTIVAL_FURNITURE, ...FAMILY_FURNITURE];
export const FURNITURE_MAP: Record<string, Furniture> = Object.fromEntries(ALL_FURNITURE.map((f) => [f.id, f]));

const baseXp = (t: number) => (t === 0 ? 8 : t === 1 ? 12 : tierXp(t));
export const buildXp = (f: Furniture) => Math.round(baseXp(f.tier) * 25);
export const furnitureRegion = (f: Furniture): Region => tierRegion(f.tier);

/** How much of an item you have in total (bag + bank). */
export const haveTotal = (p: PlayerState, id: string) => countInBag(p.inventory, id) + countInBank(p, id);

export function whyCantBuild(p: PlayerState, id: string): string | null {
  const f = FURNITURE_MAP[id];
  if (!f) return 'Unknown furniture';
  if (p.cottage.includes(id)) return 'Already built';
  if (f.festival) return 'Find it at the festival stall';
  if (f.family) return 'Earned on a 🥇 Gold guild week';
  const region = furnitureRegion(f);
  if (!regionOpen(region) || !p.regions.includes(region)) return `Discover ${region} first`;
  if (f.needsLunaria && !p.lunaria.restored) return 'Bring Lunaria home first';
  if (skillLevel(p, f.skill) < f.level) return `Needs ${f.skill[0].toUpperCase() + f.skill.slice(1)} ${f.level}`;
  for (const c of f.cost) if (haveTotal(p, c.id) < c.qty) return `Needs ${c.qty} ${getItem(c.id).name} (bag + bank)`;
  return null;
}

/** Builds a piece: takes materials (bag first, then bank) and gives XP in its skill. */
export function build(p: PlayerState, id: string, report: ProgressReport): string | null {
  const why = whyCantBuild(p, id);
  if (why) return why;
  const f = FURNITURE_MAP[id];
  for (const c of f.cost) {
    const fromBag = removeFromBag(p.inventory, c.id, c.qty);
    if (fromBag < c.qty) removeFromBank(p, c.id, c.qty - fromBag);
  }
  p.cottage.push(id);
  addXp(p, { skill: f.skill }, report, buildXp(f));
  return null;
}

// ----- Perks -----
const built = (p: PlayerState) => p.cottage.map((id) => FURNITURE_MAP[id]).filter(Boolean);
const COMBAT: SkillId[] = ['melee', 'ranged', 'magic', 'defense', 'health'];

/** XP multiplier from Cottage furniture for a skill. */
export function cottageXpMult(p: PlayerState, skill: SkillId): number {
  let pct = 0;
  for (const f of built(p)) {
    if (f.perk.kind !== 'xp') continue;
    if (f.perk.skill === skill || f.perk.skill === 'all' || (f.perk.skill === 'combat' && COMBAT.includes(skill))) pct += f.perk.pct;
  }
  return 1 + pct / 100;
}
export const cottageFirePct = (p: PlayerState) => built(p).reduce((s, f) => s + (f.perk.kind === 'fire' ? f.perk.pct : 0), 0);
export const cottageStarPct = (p: PlayerState) => built(p).reduce((s, f) => s + (f.perk.kind === 'stars' ? f.perk.pct : 0), 0);

export function perkText(perk: Perk): string {
  if (perk.kind === 'fire') return `Cooking fire burns ${perk.pct}% longer`;
  if (perk.kind === 'stars') return `Lucky Stars appear ${perk.pct}% more often`;
  const who = perk.skill === 'all' ? 'all skills' : perk.skill === 'combat' ? 'combat' : perk.skill[0].toUpperCase() + perk.skill.slice(1);
  return `+${perk.pct}% ${who} XP`;
}
