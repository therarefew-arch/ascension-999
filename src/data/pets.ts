// Skilling pets: rare, cozy companions. One follows you at a time for +2% XP in its skill.
import type { SkillId } from './items';
import { FESTIVALS } from './festivals';

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
  { id: 'pet_bumble', name: 'Bumble', emoji: '🐝', skill: 'herblore', odds: 3000, blurb: 'A fuzzy bee who always knows where the best herbs grow.' },
  { id: 'pet_shelly', name: 'Shelly', emoji: '🐌', skill: 'farming', odds: 300, blurb: 'A slow, happy snail who loves your garden (but promises not to eat it).' },
  { id: 'pet_bramble', name: 'Bramble', emoji: '🐻', skill: 'combat', odds: 50, blurb: "Old Thornhide's cub. Fierce, fluffy and loyal." },
  { id: 'pet_pinch', name: 'Pinch', emoji: '🦀', skill: 'combat', odds: 50, blurb: "Mother Clawsoot's littlest hatchling. Only pinches gently." },
  { id: 'pet_peep', name: 'Peep', emoji: '🐥', skill: 'combat', odds: 50, blurb: "Old Galewing's fluffy chick. Steals your snacks, but cutely." },
  { id: 'pet_mote', name: 'Mote', emoji: '🌙', skill: 'combat', odds: 50, blurb: 'A crumb of moonlight that slipped out of the Hush. It glows when you smile.' },
  { id: 'pet_kindle', name: 'Kindle', emoji: '🐉', skill: 'combat', odds: 50, blurb: "A pocket-sized lava dragon from the Kiln Wyrm's nest. Snores little smoke rings." },
  { id: 'pet_snowdrop', name: 'Snowdrop', emoji: '🐻‍❄️', skill: 'combat', odds: 50, blurb: "Old Rimeback's cub. Slides everywhere on its tummy and hums along when Frosthold sings." },
  { id: 'pet_nib', name: 'Nib', emoji: '🦇', skill: 'combat', odds: 50, blurb: 'A star-bat that hatched in the Hollow Wyrm\'s coils. Hangs upside down from your hat and squeaks a day late.' },
  { id: 'pet_nova', name: 'Nova', emoji: '🌠', skill: 'combat', odds: 50, blurb: 'A seed of light from the Stargrown Elder. It hums the crater\'s note, very quietly, when it\'s happy.' },
  { id: 'pet_cirrus', name: 'Cirrus', emoji: '🕊️', skill: 'combat', odds: 50, blurb: "Aurelion's littlest eaglet. Too fluffy to fly properly, so it mostly drifts." },
  { id: 'pet_pip', name: 'Pip', emoji: '🦕', skill: 'combat', odds: 50, blurb: 'A baby long-neck from the Rift, the very first of its kind. Follows you like you hung the moon.' },
  { id: 'pet_wick', name: 'Wick', emoji: '🕯️', skill: 'firemaking', odds: 0, blurb: "Lunaria's lantern spirit. A thank-you from the whole town for bringing the light back." },
  { id: 'pet_lumen', name: 'Lumen', emoji: '🦋', skill: 'combat', odds: 0, blurb: 'A lantern moth who followed your light home after your first dawn on Lantern Watch.' },
  { id: 'pet_confetti', name: 'Confetti', emoji: '🐩', skill: 'combat', odds: 0, blurb: 'A fluffy parade poodle who joined you after your first full Pet Parade. Prances everywhere.' },
  { id: 'pet_lookout', name: 'Lookout', emoji: '🦅', skill: 'combat', odds: 0, blurb: 'A watch-hawk from the town wall. Followed you home after you first held the wall.' },
  { id: 'pet_sprout', name: 'Sprout', emoji: '🌱', skill: 'combat', odds: 20, blurb: "A seedling from Grumbleroot's crown. Grows a little every week." },
];

// 🎪 Festival pets: from the festival stall (rewards, never random drops).
for (const f of FESTIVALS) PETS.push({ id: f.pet.id, name: f.pet.name, emoji: f.pet.emoji, skill: f.skill, odds: 0, blurb: `${f.pet.blurb} (${f.name})` });

export const PET_MAP: Record<string, PetDef> = Object.fromEntries(PETS.map((p) => [p.id, p]));
export const PET_XP_BONUS = 0.02;
export const COMBAT_SKILL_IDS: SkillId[] = ['melee', 'ranged', 'magic', 'defense', 'health'];

export function petBoosts(petId: string | null, skill: SkillId): boolean {
  const pet = petId ? PET_MAP[petId] : null;
  if (!pet) return false;
  return pet.skill === skill || (pet.skill === 'combat' && COMBAT_SKILL_IDS.includes(skill));
}
