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
  /** 🧭 Found at the end of this town's expedition instead of being built. */
  expedition?: Region;
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
/** 🧭 Rare finds from beating each town's expedition boss (v0.0.1.60). */
const ex = (id: string, name: string, emoji: string, x: number, y: number, expedition: Region, perk: Perk, blurb: string): Furniture =>
  ({ id, name, emoji, x, y, skill: 'crafting', level: 1, tier: 0, cost: [], perk, expedition, blurb });
export const EXPEDITION_FURNITURE: Furniture[] = [
  ex('whisper_bough', 'Whispering bough', '🍃', 20, 90, 'Pocketvale', { kind: 'xp', skill: 'woodcutting', pct: 3 }, 'A branch of the Whispering Oak. On quiet nights it rustles with no wind.'),
  ex('glow_stone', "Lamp-Eater's glow-stone", '💡', 30, 40, 'Ironmoor', { kind: 'xp', skill: 'mining', pct: 3 }, 'Coughed up by the Lamp-Eater. Still warm, still glowing.'),
  ex('wisp_jar', 'Wisp in a jar', '🫙', 46, 40, 'Coalhaven', { kind: 'stars', pct: 5 }, 'A little marsh light that seems happy to have a shelf of its own.'),
  ex('sea_chest', "Wrecker's sea chest", '🧰', 66, 88, 'Bluecliff', { kind: 'xp', skill: 'fishing', pct: 3 }, 'Captain Barnacle’s chest. Smells of salt and old adventures.'),
  ex('lamplighter_pole', "Lamplighter's pole", '🕯️', 80, 46, 'Lunaria', { kind: 'fire', pct: 15 }, 'Its little flame never quite goes out — as if it is waiting for something.'),
  ex('ashhorn_horn', "Ashhorn's horn", '📯', 96, 40, 'Cinderpeak', { kind: 'xp', skill: 'smithing', pct: 3 }, 'Warm as a forge. The mountain rumbles back when you blow it.'),
  ex('yeti_rug', 'Yeti-fur rug', '🧶', 48, 76, 'Frosthold', { kind: 'xp', skill: 'all', pct: 1 }, 'Freely given — the yeti was shedding anyway.'),
  ex('heron_feather', 'Ribbon heron feather', '🪶', 12, 14, 'Voidreach', { kind: 'xp', skill: 'crafting', pct: 3 }, 'Taller than you, and it shimmers with tiny stars.'),
  ex('star_antler', 'Star antler', '✨', 64, 8, 'Starfall Crater', { kind: 'xp', skill: 'combat', pct: 2 }, 'Shed by Starhorn. The stars on it still twinkle.'),
  ex('rain_cloud', 'Little rain cloud', '🌧️', 80, 82, 'Celestine Spires', { kind: 'xp', skill: 'farming', pct: 3 }, 'It drifts over to water the plants all by itself.'),
  ex('first_tusk', 'The First Tusk', '🦴', 96, 78, 'Primordial Rift', { kind: 'xp', skill: 'combat', pct: 3 }, 'Older than mountains. Ferns keep sprouting from it.'),
];
export const ALL_FURNITURE = [...FURNITURE, ...FESTIVAL_FURNITURE, ...FAMILY_FURNITURE, ...EXPEDITION_FURNITURE];
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
  if (f.expedition) return `A rare find from beating the boss of the ${f.expedition} dungeon`;
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

// ----- 🏠 The room you arrange (v0.0.2.2, owner: "update cottage to be able to customize and arrange the items … the
// pictures as a guide for the room") — a top-down pixel room: a back wall (pictures, shelves, windows hang there) and
// a floor (everything else stands on it; rugs lie flat). Sizes are in the room's own pixels; ui/cottageArt.ts draws it.
export const ROOM = { w: 192, h: 236, side: 6, wallTop: 6, wallBottom: 74, floorBottom: 228 };
export type WallId = 'cream' | 'sage' | 'amber' | 'sky' | 'rose' | 'plank';
export type FloorId = 'tiles' | 'oak' | 'pine' | 'stone' | 'checker' | 'moss';
export const WALLS: { id: WallId; name: string }[] = [
  { id: 'cream', name: 'Cream stripes' }, { id: 'sage', name: 'Sage green' }, { id: 'amber', name: 'Warm amber' },
  { id: 'sky', name: 'Sky blue' }, { id: 'rose', name: 'Rose' }, { id: 'plank', name: 'Log walls' },
];
export const FLOORS: { id: FloorId; name: string }[] = [
  { id: 'oak', name: 'Oak boards' }, { id: 'tiles', name: 'Grey tiles' }, { id: 'pine', name: 'Pine boards' },
  { id: 'stone', name: 'Flagstones' }, { id: 'checker', name: 'Checkered' }, { id: 'moss', name: 'Mossy rug' },
];
export interface PieceShape { w: number; h: number; wall?: boolean; flat?: boolean }
/** Each piece's size, and whether it hangs on the wall or lies flat on the floor. */
export const SHAPE: Record<string, PieceShape> = {
  pine_bed: { w: 32, h: 44 }, stone_hearth: { w: 38, h: 46 }, shrimp_tank: { w: 26, h: 30 }, copper_kettle: { w: 18, h: 22 },
  herb_rack: { w: 30, h: 18, wall: true }, flower_box: { w: 28, h: 26, wall: true }, oak_table: { w: 34, h: 26 },
  display_anvil: { w: 22, h: 20 }, miners_lamp: { w: 10, h: 18, wall: true }, rocking_chair: { w: 24, h: 28 },
  telescope: { w: 20, h: 32 }, weapon_rack: { w: 28, h: 22, wall: true }, maple_bookcase: { w: 28, h: 44 },
  rune_mirror: { w: 18, h: 26, wall: true }, moon_chandelier: { w: 26, h: 20, wall: true }, kiln_vase: { w: 12, h: 18 },
  spice_shelf: { w: 26, h: 16, wall: true }, ember_brazier: { w: 16, h: 20 }, frost_quilt: { w: 36, h: 26, flat: true },
  singing_lantern: { w: 12, h: 20 }, void_window: { w: 26, h: 28, wall: true }, star_orrery: { w: 20, h: 26 },
  wind_chimes: { w: 12, h: 24, wall: true }, worldtree_sapling: { w: 20, h: 30 }, blossom_tree: { w: 20, h: 32 },
  paper_lanterns: { w: 36, h: 14, wall: true }, harvest_sheaf: { w: 14, h: 22 }, winter_tree: { w: 24, h: 36 },
  family_portrait: { w: 24, h: 20, wall: true }, whisper_bough: { w: 26, h: 14, wall: true }, glow_stone: { w: 14, h: 16 },
  wisp_jar: { w: 10, h: 14 }, sea_chest: { w: 24, h: 20 }, lamplighter_pole: { w: 10, h: 38 }, ashhorn_horn: { w: 24, h: 14, wall: true },
  yeti_rug: { w: 38, h: 24, flat: true }, heron_feather: { w: 12, h: 32 }, star_antler: { w: 26, h: 18, wall: true },
  rain_cloud: { w: 22, h: 16, wall: true }, first_tusk: { w: 32, h: 18 },
};
// ----- 🛍️ Decorations (v0.0.2.5, owner: rooms like the reference pictures feel lived-in) -----
// Bought with coins (prices in market/cottageShop.ts), just for looks — no perks. You can own several of each: every
// copy is its own piece in the room, with an id `<kind>.<n>` (e.g. `rug_cream.2`).
export interface DecorDef { id: string; name: string; emoji: string; shape: PieceShape; blurb: string }
export const DECOR: DecorDef[] = [
  { id: 'rug_cream', name: 'Striped rug (cream)', emoji: '🟨', shape: { w: 40, h: 24, flat: true }, blurb: 'Soft stripes underfoot.' },
  { id: 'rug_green', name: 'Striped rug (green)', emoji: '🟩', shape: { w: 40, h: 24, flat: true }, blurb: 'The colour of a summer meadow.' },
  { id: 'rug_red', name: 'Round rug (red)', emoji: '🟥', shape: { w: 34, h: 22, flat: true }, blurb: 'Warm and cheerful by the fire.' },
  { id: 'plant_fern', name: 'Potted fern', emoji: '🪴', shape: { w: 16, h: 22 }, blurb: 'A little green in the corner.' },
  { id: 'plant_tall', name: 'Tall leafy plant', emoji: '🌿', shape: { w: 18, h: 32 }, blurb: 'Big leaves in a white pot.' },
  { id: 'plant_cactus', name: 'Little cactus', emoji: '🌵', shape: { w: 10, h: 14 }, blurb: 'Needs almost no looking after.' },
  { id: 'floor_lamp', name: 'Floor lamp', emoji: '💡', shape: { w: 14, h: 36 }, blurb: 'A warm pool of light in the evenings.' },
  { id: 'sofa', name: 'Leather sofa', emoji: '🛋️', shape: { w: 44, h: 26 }, blurb: 'Room for two and a sleepy pet.' },
  { id: 'coffee_table', name: 'Coffee table', emoji: '☕', shape: { w: 26, h: 16 }, blurb: 'With a mug that is always still warm.' },
  { id: 'side_table', name: 'Side table', emoji: '🪑', shape: { w: 14, h: 16 }, blurb: 'Just the right height for a cup.' },
  { id: 'desk', name: 'Writing desk', emoji: '📝', shape: { w: 32, h: 26 }, blurb: 'Letters, maps and a half-written diary.' },
  { id: 'wardrobe', name: 'Wardrobe', emoji: '🚪', shape: { w: 24, h: 42 }, blurb: 'Your spare cloaks, and one odd sock.' },
  { id: 'dining_set', name: 'Little dining table', emoji: '🍽️', shape: { w: 30, h: 32 }, blurb: 'A table for two, with a checked cloth.' },
  { id: 'book_stack', name: 'Pile of books', emoji: '📚', shape: { w: 12, h: 10 }, blurb: 'To be read. Eventually.' },
  { id: 'crates', name: 'Stacked crates', emoji: '📦', shape: { w: 22, h: 20 }, blurb: 'Still not unpacked.' },
  { id: 'laundry_basket', name: 'Laundry basket', emoji: '🧺', shape: { w: 16, h: 12 }, blurb: 'Clean, mostly.' },
  { id: 'pet_bed', name: 'Pet bed', emoji: '🐾', shape: { w: 18, h: 10 }, blurb: 'A round cushion your pet loves.' },
  { id: 'frame_land', name: 'Landscape painting', emoji: '🖼️', shape: { w: 18, h: 14, wall: true }, blurb: 'Rolling hills in a little frame.' },
  { id: 'frame_tall', name: 'Portrait painting', emoji: '🖼️', shape: { w: 12, h: 16, wall: true }, blurb: 'A stern-looking ancestor.' },
  { id: 'wall_clock', name: 'Wall clock', emoji: '🕰️', shape: { w: 12, h: 12, wall: true }, blurb: 'Tick, tock.' },
  { id: 'wall_shelf', name: 'Wall shelf with plant', emoji: '🪴', shape: { w: 22, h: 12, wall: true }, blurb: 'A trailing plant and a tiny jar.' },
];
export const DECOR_MAP: Record<string, DecorDef> = Object.fromEntries(DECOR.map((d) => [d.id, d]));
/** A decoration copy's kind (`rug_cream.2` → `rug_cream`), or undefined if it isn't one. */
export const decorKind = (id: string): string | undefined => { const k = id.split('.')[0]; return id.includes('.') && DECOR_MAP[k] ? k : undefined; };
/** Is this a piece of yours: built furniture or a decoration you bought? */
export const ownsPiece = (p: PlayerState, id: string) => p.cottage.includes(id) || (p.cottageDecor ?? []).includes(id);
/** A piece's name and little picture, for furniture and decorations alike. */
export function pieceInfo(id: string): { name: string; emoji: string; blurb: string; perk?: Perk } | undefined {
  const f = FURNITURE_MAP[id];
  if (f) return { name: f.name, emoji: f.emoji, blurb: f.blurb, perk: f.perk };
  const k = decorKind(id);
  return k ? { name: DECOR_MAP[k].name, emoji: DECOR_MAP[k].emoji, blurb: DECOR_MAP[k].blurb } : undefined;
}
export const shapeOf = (id: string): PieceShape => SHAPE[id] ?? DECOR_MAP[decorKind(id) ?? '']?.shape ?? { w: 16, h: 16 };
/** Where a piece sits: its top-left corner in room pixels, and whether it's flipped left-right. */
export interface Spot { x: number; y: number; f?: 1 }
/** Keep a piece in the room: wall pieces on the wall, floor pieces standing on the floor (tall ones may reach up the wall). */
export function clampSpot(id: string, x: number, y: number): { x: number; y: number } {
  const s = shapeOf(id);
  const cx = Math.max(ROOM.side, Math.min(ROOM.w - ROOM.side - s.w, Math.round(x)));
  if (s.wall) return { x: cx, y: Math.max(ROOM.wallTop + 2, Math.min(ROOM.wallBottom - 6 - s.h, Math.round(y))) };
  const minBottom = ROOM.wallBottom + (s.flat ? s.h + 2 : 8);
  return { x: cx, y: Math.max(minBottom - s.h, Math.min(ROOM.floorBottom - s.h, Math.round(y))) };
}
const overlapArea = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
/** A free-ish spot for a piece: near its old place in the room, avoiding pieces already there. */
export function freeSpot(p: PlayerState, id: string): Spot {
  // Decorations have no old place: they start in the middle of the room (on the wall or the floor).
  const f = FURNITURE_MAP[id] ?? { x: 45, y: 50 };
  const s = shapeOf(id);
  // Tall pieces (bookcases, the hearth, the bed) start against the back wall, like a real room.
  const tall = !s.wall && !s.flat && s.h >= 36;
  const want = clampSpot(id, (f.x / 100) * (ROOM.w - s.w), s.wall ? ROOM.wallTop + 4 + ((f.y / 100) * 30) : tall ? ROOM.wallBottom + 14 - s.h : ROOM.wallBottom + (f.y / 100) * (ROOM.floorBottom - ROOM.wallBottom - s.h));
  const others = Object.entries(p.cottageLayout ?? {}).filter(([o, sp]) => o !== id && sp && !!shapeOf(o).wall === !!s.wall && !!shapeOf(o).flat === !!s.flat)
    .map(([o, sp]) => ({ ...(sp as Spot), ...shapeOf(o) }));
  let best = want, bestCost = Infinity;
  for (let r = 0; r <= 120 && bestCost > 0; r += 6) {
    for (let a = 0; a < (r ? 16 : 1); a++) {
      const c = clampSpot(id, want.x + Math.cos((a / 16) * Math.PI * 2) * r, want.y + Math.sin((a / 16) * Math.PI * 2) * r * 0.7);
      const cost = others.reduce((n, o) => n + overlapArea({ ...c, w: s.w, h: s.h }, o), 0) * 10 + r;
      if (cost < bestCost) { best = c; bestCost = cost; }
    }
  }
  return best;
}
/** Give every built piece without a place one (new pieces and older saves). */
export function autoPlace(p: PlayerState): boolean {
  const lay = (p.cottageLayout ??= {});
  let changed = false;
  for (const id of [...p.cottage, ...(p.cottageDecor ?? [])]) if (lay[id] === undefined && (FURNITURE_MAP[id] || decorKind(id))) { lay[id] = freeSpot(p, id); changed = true; }
  return changed;
}
