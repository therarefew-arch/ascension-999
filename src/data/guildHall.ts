// 🏰 The Guild Hall (v0.0.2.22, owner's choices: small XP perks for everyone, rooms that take a family about a
// week, and a little back for whoever donates). The guild builds one room at a time; each room asks for three
// kinds of things, and each finished room gives every member a small permanent XP bonus.
// Rules live in core/guildHall.ts.
import type { SkillId } from './items';

/** A room. `needs` are the three skills whose goods it takes; `perk` is +pct% XP in those skills (or 'all'). */
export interface HallRoom {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  needs: [SkillId, SkillId, SkillId];
  /** Hours of work (one person, base speed) of each of the three kinds. */
  hours: number;
  perk: { skills: SkillId[] | 'all'; pct: number };
}

export const HALL_ROOMS: HallRoom[] = [
  { id: 'hearth', name: 'The Great Hearth', emoji: '🔥', blurb: 'A fire big enough for the whole guild to sit around.', needs: ['woodcutting', 'mining', 'fishing'], hours: 6, perk: { skills: ['firemaking', 'woodcutting'], pct: 3 } },
  { id: 'kitchen', name: 'The Long Kitchen', emoji: '🍲', blurb: 'Pots on every hook, and a table that seats everyone.', needs: ['fishing', 'cooking', 'farming'], hours: 8, perk: { skills: ['cooking', 'fishing'], pct: 3 } },
  { id: 'forge', name: 'The Forge Corner', emoji: '🔨', blurb: 'An anvil that rings like a bell.', needs: ['mining', 'smithing', 'woodcutting'], hours: 10, perk: { skills: ['smithing', 'mining'], pct: 3 } },
  { id: 'workshop', name: 'The Workshop', emoji: '🧵', blurb: 'Benches, lathes and a wall of tidy tools.', needs: ['woodcutting', 'crafting', 'smithing'], hours: 12, perk: { skills: ['crafting'], pct: 4 } },
  { id: 'loft', name: 'The Herb Loft', emoji: '🌿', blurb: 'Bundles drying from the rafters; it smells like summer.', needs: ['herblore', 'farming', 'crafting'], hours: 14, perk: { skills: ['herblore', 'farming'], pct: 3 } },
  { id: 'library', name: 'The Rune Library', emoji: '🔮', blurb: 'Shelves of humming runes and very old books.', needs: ['runecrafting', 'mining', 'herblore'], hours: 16, perk: { skills: ['runecrafting', 'enhancing'], pct: 3 } },
  { id: 'boathouse', name: 'The Boathouse', emoji: '⛵', blurb: 'A little jetty and a boat with the guild colours.', needs: ['woodcutting', 'fishing', 'crafting'], hours: 18, perk: { skills: ['fishing', 'woodcutting'], pct: 2 } },
  { id: 'armoury', name: 'The Armoury', emoji: '🛡️', blurb: 'Racks of polished gear and a practice dummy.', needs: ['smithing', 'crafting', 'runecrafting'], hours: 20, perk: { skills: ['melee', 'ranged', 'magic', 'defense', 'health'], pct: 3 } },
  { id: 'feast', name: 'The Feast Hall', emoji: '🍗', blurb: 'Long tables, lanterns, and room for every friend you have.', needs: ['cooking', 'farming', 'fishing'], hours: 22, perk: { skills: ['cooking', 'farming', 'herblore'], pct: 2 } },
  { id: 'tower', name: 'The Guild Tower', emoji: '🏰', blurb: "Your banner at the top, seen from every road.", needs: ['mining', 'smithing', 'runecrafting'], hours: 24, perk: { skills: 'all', pct: 2 } },
];

/** Donating gives this share of the goods' Trading Post value back as coins, and this share of their XP. */
export const HALL_COIN_BACK = 0.2;
export const HALL_XP_BACK = 0.1;
