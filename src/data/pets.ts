// Skilling pets: rare, cozy companions. One follows you at a time for +2% XP in its skill.
import type { SkillId } from './items';

export interface PetDef {
  id: string;
  name: string;
  emoji: string;
  /** The skill it comes from (and boosts). 'combat' pets boost all combat skills. */
  skill: SkillId | 'combat';
  /** 1 in `odds` per finished action (or per mini boss kill for combat pets). */
  odds: number;
  blurb: string;
}

export const PETS: PetDef[] = [
  { id: 'pet_pebbles', name: 'Pebbles', emoji: '🐹', skill: 'mining', odds: 3000, blurb: 'A tiny hamster who loves shiny rocks.' },
  { id: 'pet_sparky', name: 'Sparky', emoji: '🦔', skill: 'smithing', odds: 3000, blurb: 'A hedgehog who naps by the warm forge.' },
  { id: 'pet_acorn', name: 'Acorn', emoji: '🐿️', skill: 'woodcutting', odds: 3000, blurb: 'Collects every pinecone you knock loose.' },
  { id: 'pet_ember', name: 'Ember', emoji: '🦊', skill: 'firemaking', odds: 3000, blurb: 'A fox who curls up by every campfire.' },
  { id: 'pet_splash', name: 'Splash', emoji: '🦦', skill: 'fishing', odds: 3000, blurb: 'An otter who claims the best fishing spot.' },
  { id: 'pet_muffin', name: 'Muffin', emoji: '🐭', skill: 'cooking', odds: 3000, blurb: 'A little mouse chef. Tastes everything.' },
  { id: 'pet_whittle', name: 'Whittle', emoji: '🦫', skill: 'crafting', odds: 3000, blurb: 'A beaver who is very proud of their teeth.' },
  { id: 'pet_glyph', name: 'Glyph', emoji: '🦉', skill: 'runecrafting', odds: 3000, blurb: 'A wise owl who can read every rune.' },
  { id: 'pet_twinkle', name: 'Twinkle', emoji: '🐱', skill: 'enhancing', odds: 3000, blurb: 'A cat who thinks every shiny thing is hers.' },
  { id: 'pet_bramble', name: 'Bramble', emoji: '🐻', skill: 'combat', odds: 50, blurb: "Old Thornhide's cub. Fierce, fluffy and loyal." },
  { id: 'pet_pinch', name: 'Pinch', emoji: '🦀', skill: 'combat', odds: 50, blurb: "Mother Clawsoot's littlest hatchling. Only pinches gently." },
  { id: 'pet_peep', name: 'Peep', emoji: '🐥', skill: 'combat', odds: 50, blurb: "Old Galewing's fluffy chick. Steals your snacks, but cutely." },
  { id: 'pet_mote', name: 'Mote', emoji: '🌙', skill: 'combat', odds: 50, blurb: 'A crumb of moonlight that slipped out of the Hush. It glows when you smile.' },
  { id: 'pet_wick', name: 'Wick', emoji: '🕯️', skill: 'firemaking', odds: 0, blurb: "Lunaria's lantern spirit. A thank-you from the whole town for bringing the light back." },
  { id: 'pet_sprout', name: 'Sprout', emoji: '🌱', skill: 'combat', odds: 20, blurb: "A seedling from Grumbleroot's crown. Grows a little every week." },
];

export const PET_MAP: Record<string, PetDef> = Object.fromEntries(PETS.map((p) => [p.id, p]));
export const PET_XP_BONUS = 0.02;
export const COMBAT_SKILL_IDS: SkillId[] = ['melee', 'ranged', 'magic', 'defense', 'health'];

export function petBoosts(petId: string | null, skill: SkillId): boolean {
  const pet = petId ? PET_MAP[petId] : null;
  if (!pet) return false;
  return pet.skill === skill || (pet.skill === 'combat' && COMBAT_SKILL_IDS.includes(skill));
}
