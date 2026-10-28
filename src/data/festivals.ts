// 🎪 Seasonal festivals, tied to the real calendar. While one is on:
// - every skilling action (and some monster kills) can turn up a festival token,
// - one skill that fits the season gets +10% XP,
// - a festival stall in every town trades tokens for a treat, a Cottage decoration and a festival pet.
// Tokens keep after the festival ends (the stall comes back next year). Never gems, never real money.
import type { SkillId } from './items';

export type FestivalId = 'blossom' | 'midsummer' | 'harvest' | 'winter';

export interface FestivalDef {
  id: FestivalId;
  name: string;
  emoji: string;
  /** First and last day, as [month (1–12), day]. Winter wraps over New Year. */
  start: [number, number];
  end: [number, number];
  blurb: string;
  /** Little flags strung over the town banner. */
  bunting: string;
  /** The skill that gets +10% XP during the festival. */
  skill: SkillId;
  token: { id: string; name: string; emoji: string };
  treat: { id: string; name: string; emoji: string; description: string };
  decoration: { id: string; name: string; emoji: string; blurb: string };
  pet: { id: string; name: string; emoji: string; blurb: string };
}

export const FESTIVALS: FestivalDef[] = [
  {
    id: 'blossom', name: 'Blossom Fair', emoji: '🌸', start: [3, 20], end: [4, 15], skill: 'herblore',
    blurb: 'Petals on every breeze, flower crowns for sale, and the meadows humming with bees.',
    bunting: '🌸🌼🌷🌸🌼🌷🌸',
    token: { id: 'blossom_petal', name: 'Blossom petal', emoji: '🌸' },
    treat: { id: 'blossom_cupcake', name: 'Blossom cupcake', emoji: '🧁', description: 'Pink icing and a sugared petal on top.' },
    decoration: { id: 'blossom_tree', name: 'Potted blossom tree', emoji: '🌸', blurb: 'A little cherry tree that blooms all year round.' },
    pet: { id: 'pet_petal', name: 'Petal', emoji: '🐇', blurb: 'A spring bunny with a flower behind one ear. Hops after butterflies.' },
  },
  {
    id: 'midsummer', name: 'Midsummer Lanterns', emoji: '🏮', start: [6, 15], end: [7, 10], skill: 'fishing',
    blurb: 'Long golden evenings, paper lanterns floating down the river, and fish jumping at dusk.',
    bunting: '🏮✨🏮✨🏮✨🏮',
    token: { id: 'sun_charm', name: 'Sun charm', emoji: '☀️' },
    treat: { id: 'berry_ice', name: 'Berry ice', emoji: '🍧', description: 'Shaved ice with summer berries. Perfect on a hot day.' },
    decoration: { id: 'paper_lanterns', name: 'Paper lanterns', emoji: '🏮', blurb: 'A string of glowing lanterns across the ceiling.' },
    pet: { id: 'pet_glimmer', name: 'Glimmer', emoji: '🐞', blurb: 'A ladybird that glows faintly on summer nights.' },
  },
  {
    id: 'harvest', name: 'Harvest Festival', emoji: '🍂', start: [10, 1], end: [11, 10], skill: 'farming',
    blurb: 'Pumpkins on doorsteps, cider by the fire, and the whole valley bringing in the harvest.',
    bunting: '🍂🎃🌾🍁🍂🎃🌾',
    token: { id: 'harvest_acorn', name: 'Harvest acorn', emoji: '🌰' },
    treat: { id: 'toffee_apple', name: 'Toffee apple', emoji: '🍎', description: 'Crunchy, sticky and sweet. A harvest favourite.' },
    decoration: { id: 'harvest_sheaf', name: 'Harvest sheaf', emoji: '🌾', blurb: 'A golden bundle of wheat tied with a ribbon, for luck.' },
    pet: { id: 'pet_gourdie', name: 'Gourdie', emoji: '🎃', blurb: 'A tiny pumpkin sprite who rolls everywhere. Grins at everyone.' },
  },
  {
    id: 'winter', name: 'Winter Lights', emoji: '❄️', start: [12, 10], end: [1, 6], skill: 'firemaking',
    blurb: 'Snow on the rooftops, candles in every window, and warm fires in every hearth.',
    bunting: '❄️⭐❄️⭐❄️⭐❄️',
    token: { id: 'snowflake_charm', name: 'Snowflake charm', emoji: '❄️' },
    treat: { id: 'gingerbread', name: 'Gingerbread', emoji: '🍪', description: 'Spiced and warm, shaped like a little adventurer.' },
    decoration: { id: 'winter_tree', name: 'Winter tree', emoji: '🎄', blurb: 'A little pine covered in candles and paper stars.' },
    pet: { id: 'pet_flurry', name: 'Flurry', emoji: '⛄', blurb: 'A cheerful snow friend who never melts — even by the fire.' },
  },
];

/** What the stall asks (in tokens). */
export const FESTIVAL_PRICES = { treat: 6, decoration: 80, pet: 150 } as const;
/** Chance of a token per skilling action / per monster defeated, during a festival. */
export const TOKEN_CHANCE = 1 / 60;
export const TOKEN_CHANCE_KILL = 1 / 30;
/** The festival skill's bonus XP. */
export const FESTIVAL_XP_BONUS = 0.1;
/** Treats: a small +2% XP to all skills for 30 minutes, in their own slot — they stack with brews, never replace them. */
export const TREAT_BUFF = { skill: 'all' as const, kind: 'xp' as const, pct: 2, minutes: 30, slot: 'treat' };

export const FESTIVAL_MAP: Record<FestivalId, FestivalDef> = Object.fromEntries(FESTIVALS.map((f) => [f.id, f])) as Record<FestivalId, FestivalDef>;
