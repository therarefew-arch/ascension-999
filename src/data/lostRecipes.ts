// 📖 Lost recipes (v0.0.1.61, Expeditions part 3): two per town, found on that town's expedition
// (its boss, sometimes a cache). Once learned they're made at home like any other recipe:
// - a lost meal or brew (Cooking): stronger and longer-lasting than the town's usual one;
// - a charm (Crafting → Charms): pack it on an expedition and you start the run with its Boon.
//   Charms are never used up — they come home with you.
// Recipes you've learned are kept in `player.recipes` (action ids).
import type { MealDef } from './items';
import { CROPS, FISH, HERBS, METALS, REGIONS, tierLevel, WOODS, type Region } from './tiers';

const cooked = (t: number) => `cooked_${FISH[t].key}`;
const crop = (t: number) => CROPS[t].key;
const herb = (t: number) => `dried_${HERBS[t].key}`;

/** Lost meals (even towns) and brews (odd towns): a buff for every skill, for an hour. */
export const LOST_MEALS: MealDef[] = [
  ['honey_oat_loaf', 'Honeyed oat loaf', '🍞', 'Meals', 'Baked in the Whispering Woods, the way the first Pocketvale bakers did it. Everything goes a little quicker.'],
  ['glowroot_tea', 'Glowroot tea', '🍵', 'Brews', 'The Deep Shaft miners’ secret. It glows faintly in the cup and makes everything you learn stick.'],
  ['marshfog_chowder', 'Marsh-fog chowder', '🥣', 'Meals', 'A chowder thick enough to stand a spoon in, from a barge cook who never came home.'],
  ['wreckers_cider', 'Wrecker’s cider', '🧉', 'Brews', 'Captain Barnacle’s own recipe. Sweet, sharp, and only a tiny bit stolen.'],
  ['lamplighter_supper', 'Lamplighter’s supper', '🥧', 'Meals', 'A small warm pie, the kind you eat walking a long round through the fog.'],
  ['ashhorn_ember_tea', 'Ashhorn ember tea', '🫖', 'Brews', 'Brewed on a lava vent. It hums in the cup, like the mountain does.'],
  ['yeti_porridge', 'Yeti’s porridge', '🥣', 'Meals', 'An enormous bowl. The yeti swears by it, and it is very hard to argue with a yeti.'],
  ['heron_starwater', 'Heron’s starwater', '🧋', 'Brews', 'Water from the starlit pools at the bottom of the chasm, steeped with herbs. Tiny lights swirl in it.'],
  ['starflower_cake', 'Star-flower honey cake', '🍰', 'Meals', 'Made with honey from bees that only visit star-flowers. It sparkles a little on the tongue.'],
  ['raincloud_cordial', 'Rain-cloud cordial', '🍹', 'Brews', 'Old Nimbus’s favourite. Cool, fizzy, and it rains very softly inside the bottle.'],
  ['truffle_roast', 'Old Tusk’s truffle roast', '🍖', 'Meals', 'Roasted with mushrooms nobody has ever named. Tastes like the very first autumn.'],
].map(([id, name, emoji, tab, description], t) => ({
  id, name, emoji, tab: tab as 'Meals' | 'Brews', level: tierLevel(t) + 10, tierNum: t, description, lost: true,
  inputs: tab === 'Meals'
    ? [{ item: cooked(t), qty: 3 }, { item: crop(t), qty: 2 }, { item: herb(t), qty: 1 }]
    : [{ item: herb(t), qty: 4 }, { item: crop(t), qty: 1 }],
  buff: { skill: 'all', kind: tab === 'Meals' ? 'speed' : 'xp', pct: 3 + Math.floor(t / 3), minutes: 60 },
}));

/** Expedition charms: one per town, each brings its Boon along. */
export interface CharmDef { id: string; name: string; emoji: string; boon: string; tierNum: number; region: Region; description: string }
export const CHARMS: CharmDef[] = ([
  ['acorn_charm', 'Acorn charm', '🌰', 'breath', 'A polished acorn on a string. Holding it, your breathing slows down.'],
  ['lucky_nail', 'Miner’s lucky nail', '📍', 'edge', 'Bent, shiny, and every Ironmoor miner has one. Your blade feels sharper with it in your pocket.'],
  ['marshlight_locket', 'Marsh-light locket', '🔆', 'forager', 'A tiny wisp lives inside. It always seems to know where the good stuff is.'],
  ['seaglass_charm', 'Sea-glass charm', '🧿', 'cloak', 'Smoothed by a hundred years of waves. Blows seem to slide right off.'],
  ['silent_bell', 'Silent bell charm', '🔕', 'will', 'A little silver bell with no clapper. It will never ring — and somehow that keeps you standing.'],
  ['ember_charm', 'Ember charm', '🔥', 'thorns', 'Always warm. Anything that hits you gets a little scorched.'],
  ['snowflake_charm', 'Snowflake charm', '❄️', 'hearty', 'A snowflake that never melts, sung into ice by the Frosthold choir.'],
  ['ribbon_knot', 'Ribbon knot', '🎀', 'echo', 'A wish-ribbon from the chasm, tied in a knot that hums when you use your Focus.'],
  ['star_charm', 'Star charm', '⭐', 'keen', 'A star from Starhorn’s antlers. Your first strike always finds its mark.'],
  ['windchime_charm', 'Wind-chime charm', '🎐', 'hands', 'It chimes when you raise your guard, and you feel quicker for it.'],
  ['firstseed_charm', 'First-seed charm', '🌱', 'wind', 'A seed from the very first tree. After every fight, you feel it growing.'],
] as const).map(([id, name, emoji, boon, description], t) => ({ id, name, emoji, boon, tierNum: t, region: REGIONS[t], description }));
export const CHARM_MAP: Record<string, CharmDef> = Object.fromEntries(CHARMS.map((c) => [c.id, c]));
/** What a charm takes to make: the town's bars and logs, and a few of its dried herbs. */
export const charmInputs = (t: number) => [
  { item: `${METALS[t].key}_bar`, qty: 6 }, { item: `${WOODS[t].key}_logs`, qty: 6 }, { item: herb(t), qty: 4 },
];

/** Every lost recipe's action id, per town. */
export const lostRecipesOf = (region: Region): string[] => {
  const t = REGIONS.indexOf(region);
  return [`cook_${LOST_MEALS[t].id}`, `craft_${CHARMS[t].id}`];
};
