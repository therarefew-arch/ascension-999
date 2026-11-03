// 🧰 The helper circle (v0.0.2.18, owner: "skills feed each other"). Every skill now and then turns up a small
// helper while you train it (a by-product, through the loot system), and that helper boosts a DIFFERENT skill.
// The 11 skills link up in one big circle. Helpers are used up on their own, 1 per action, from the bag first,
// then the bank. Rules live in core/helpers.ts.
import type { SkillId } from './items';

/** What a helper does to the skill it helps. */
export type HelperEffect =
  | 'extra' // a chance of one more result (logs, ore, fish, dishes, herbs, runes, crops)
  | 'save' // a chance the materials stay in your bag
  | 'luck' // a better chance an upgrade works (Enhancing)
  | 'xp'; // more XP (Firemaking)

export interface HelperDef {
  id: string;
  name: string;
  emoji: string;
  /** The skill that turns it up while you train. */
  from: SkillId;
  /** The skill it helps. */
  helps: SkillId;
  effect: HelperEffect;
  blurb: string;
}

/** The numbers. */
export const HELPER = {
  /** Chance per action of turning up a bundle, and its size. */
  dropChance: 0.1, min: 3, max: 6,
  /** A harvest is one big, slow action, so it turns up more. */
  harvestChance: 0.6, harvestMin: 4, harvestMax: 8,
  /** 'extra' and 'save': the chance it works. */
  chance: 0.25,
  /** 'luck': added to the upgrade's chance. */
  luck: 0.05,
  /** 'xp': XP multiplier. */
  xp: 1.25,
};

export const HELPERS: HelperDef[] = [
  { id: 'helper_pit_props', name: 'Pit props', emoji: '🪵', from: 'woodcutting', helps: 'mining', effect: 'extra',
    blurb: 'Sturdy offcuts to shore up a mine tunnel. Miners dig deeper with them.' },
  { id: 'helper_rock_salt', name: 'Rock salt', emoji: '🧂', from: 'mining', helps: 'cooking', effect: 'extra',
    blurb: 'Pink crystals chipped from the rock face. A pinch makes every pot go further.' },
  { id: 'helper_compost', name: 'Compost', emoji: '🍂', from: 'cooking', helps: 'farming', effect: 'extra',
    blurb: 'Peelings and scraps from the kitchen, rotted down rich and dark. Plants love it.' },
  { id: 'helper_bait', name: 'Bait worms', emoji: '🪱', from: 'farming', helps: 'fishing', effect: 'extra',
    blurb: 'Fat wriggly worms from your garden beds. The fish can\'t resist them.' },
  { id: 'helper_grease', name: 'Fish grease', emoji: '🫙', from: 'fishing', helps: 'woodcutting', effect: 'extra',
    blurb: 'A pot of rendered fish oil. Smells awful, but an axe slides through wood with it.' },
  { id: 'helper_charcoal', name: 'Charcoal', emoji: '⚫', from: 'firemaking', helps: 'smithing', effect: 'save',
    blurb: 'Black lumps left in the ashes. They burn hot enough that a smith wastes less ore.' },
  { id: 'helper_nails', name: 'Nails', emoji: '🔩', from: 'smithing', helps: 'crafting', effect: 'save',
    blurb: 'A handful of offcut nails from the anvil. Crafters waste fewer materials with them.' },
  { id: 'helper_basket', name: "Forager's basket", emoji: '🧺', from: 'crafting', helps: 'herblore', effect: 'extra',
    blurb: 'A little woven basket from your workbench scraps. Holds more herbs than your pockets.' },
  { id: 'helper_ink', name: 'Rune ink', emoji: '🖋️', from: 'herblore', helps: 'runecrafting', effect: 'extra',
    blurb: 'Dark ink pressed from herb stalks. Runes drawn with it come out twice as often.' },
  { id: 'helper_rune_dust', name: 'Rune dust', emoji: '✨', from: 'runecrafting', helps: 'enhancing', effect: 'luck',
    blurb: 'Glittering dust swept up from the altar. Sprinkled on an upgrade, it helps it take.' },
  { id: 'helper_sigil', name: 'Flame sigil', emoji: '🔆', from: 'enhancing', helps: 'firemaking', effect: 'xp',
    blurb: 'A warm glowing rune left over from enhancing. Fires lit with it burn brighter.' },
];

export const HELPER_FROM: Partial<Record<SkillId, HelperDef>> = Object.fromEntries(HELPERS.map((h) => [h.from, h]));
export const HELPER_FOR: Partial<Record<SkillId, HelperDef>> = Object.fromEntries(HELPERS.map((h) => [h.helps, h]));

/** A short line for what it does, e.g. "+25% chance of extra ore". */
export function helperText(h: HelperDef): string {
  const pc = `${Math.round(HELPER.chance * 100)}%`;
  switch (h.effect) {
    case 'extra': return `${pc} chance of an extra ${RESULT[h.helps] ?? 'result'}`;
    case 'save': return `${pc} chance your materials are kept`;
    case 'luck': return `+${Math.round(HELPER.luck * 100)}% upgrade success`;
    case 'xp': return `+${Math.round((HELPER.xp - 1) * 100)}% Firemaking XP`;
  }
}
const RESULT: Partial<Record<SkillId, string>> = {
  mining: 'ore', cooking: 'dish', farming: 'handful of crops', fishing: 'fish', woodcutting: 'log', herblore: 'herb', runecrafting: 'result',
};
