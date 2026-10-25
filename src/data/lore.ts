// Loose lore: each town has a vibe and a few short notes you find by playing there.
// A thread runs through them towards Lunaria — the town across the water whose lights went out.
// (Lunaria is planned as a ghost town to investigate.)
import type { Region } from './tiers';

/** How a note is found: arriving in town, beating its mini boss, by chance while skilling there, or by bringing Lunaria back. */
export type LoreTrigger = 'arrive' | 'boss' | 'find' | 'restore' | 'bottle';

export interface LoreNote {
  id: string;
  region: Region;
  trigger: LoreTrigger;
  /** Mini boss id for 'boss' notes. */
  boss?: string;
  /** 'find' notes: chance per finished action (default LORE_FIND_CHANCE). Several 'find' notes in a town are found in order. */
  chance?: number;
  title: string;
  text: string;
}

/** A one-line feel for each town (shown on the Tales page). */
export const TOWN_VIBE: Partial<Record<Region, string>> = {
  Pocketvale: 'Sleepy hills, warm bread and a well everyone makes wishes in.',
  Ironmoor: 'Brass bells, soot-black faces and songs sung deep underground.',
  Coalhaven: 'Foghorns, lantern-light on black water, and a question nobody likes to ask.',
  Bluecliff: 'Salt wind, red maples and a lighthouse that watches the one island nobody visits.',
  Lunaria: 'Fog, silver moonlight, and a whole town holding its breath.',
};

export const LORE: LoreNote[] = [
  // ----- Pocketvale -----
  {
    id: 'pv_stone', region: 'Pocketvale', trigger: 'arrive', title: 'The Founding Stone',
    text: 'Carved into the stone by the well: "Pocketvale — small enough to fit in your pocket, big enough to hold a heart." Someone has scratched underneath, in much smaller letters: "and a lot of rats."',
  },
  {
    id: 'pv_thornhide', region: 'Pocketvale', trigger: 'boss', boss: 'old_thornhide', title: "Thornhide's Hollow",
    text: 'Behind the old bear\'s den is a tiny shrine of pebbles and a child\'s drawing of a bear in a flower crown, signed "Mira, age 7". Thornhide was never guarding the forest from people. It was guarding Mira\'s shrine.',
  },
  {
    id: 'pv_diary', region: 'Pocketvale', trigger: 'find', title: "A Page from the Mayor's Diary",
    text: '"Another traveller asked about the road east today. Everyone asks about the road east. Nobody ever asks why the boats stopped coming up the river from the coast. I suppose that is for the best."',
  },
  // ----- Ironmoor -----
  {
    id: 'im_bell', region: 'Ironmoor', trigger: 'arrive', title: 'The Shift Bell',
    text: 'A brass bell hangs over the mine entrance. Miners ring it once going in and twice coming out. A painted sign below reads: "Ring it properly. Brask counts."',
  },
  {
    id: 'im_brask', region: 'Ironmoor', trigger: 'boss', boss: 'forgefather_brask', title: "The Forgefather's Tally",
    text: 'Brask\'s den is full of neat stacks of iron, sorted by size. On the wall, claw marks count every miner who went in — and every one who came out. Each mark has its pair. All but one row at the very bottom, marked with a little crescent moon.',
  },
  {
    id: 'im_order', region: 'Ironmoor', trigger: 'find', title: 'A Crumpled Shipping Order',
    text: '"Iron, forty crates. To Coalhaven docks, then onward by barge to LUNARIA. Paid in moonsilver." The stamp is many years old. You look for a newer order. There isn\'t one.',
  },
  // ----- Coalhaven -----
  {
    id: 'ch_notice', region: 'Coalhaven', trigger: 'arrive', title: 'The Harbour Notice Board',
    text: 'Most notices are about salmon prices. One, yellowed and curling, reads: "Barge SILVER WILLOW, bound for Lunaria — overdue. Any news to the harbourmaster." Below it, in a dozen different hands, people have written: "No news."',
  },
  {
    id: 'ch_clawsoot', region: 'Coalhaven', trigger: 'boss', boss: 'mother_clawsoot', title: 'Inside the Shell Heap',
    text: "Mother Clawsoot's nest is built from whatever the tide brings in: rope, a cracked lantern, a ship's bell… and a nameboard reading SILVER WILLOW. The wood is cold. Colder than the sea it came out of.",
  },
  {
    id: 'ch_letter', region: 'Coalhaven', trigger: 'find', title: "The Harbourmaster's Unsent Letter",
    text: '"Dear sister — the lights on Lunaria went out again last night. Not dimmed. Out. The fishermen swear they can still hear the town bell ringing across the water, though there is no one left to ring it. I will sail over when the fog lifts." The letter was never sent.',
  },
  // ----- Bluecliff -----
  {
    id: 'bc_logbook', region: 'Bluecliff', trigger: 'arrive', title: "The Lighthouse Keeper's Log",
    text: 'Forty years of nights in a neat hand. Almost every entry says the same: "Sea calm. Lunaria lights: on." Then, one autumn night: "Lunaria lights: on — then off. All at once, like a candle snuffed." Every entry since says only: "Lunaria lights: off." The keeper still writes it, every night.',
  },
  {
    id: 'bc_galewing', region: 'Bluecliff', trigger: 'boss', boss: 'old_galewing', title: "Galewing's Nest",
    text: "High on the cliff, Old Galewing's nest is lined with shiny treasures: buttons, a teaspoon, a fishing lure… and a heavy brass key stamped LUNARIA BELL TOWER. Gulls fly everywhere. Even there.",
  },
  {
    id: 'bc_bottle', region: 'Bluecliff', trigger: 'find', title: 'A Message in a Bottle',
    text: 'Wedged between the rocks below the lighthouse, a corked bottle. The note inside is written in silver ink: "To whoever finds this — we are not gone. We are only waiting. Whatever you hear, please do not ring the bell. — L." The ink still shimmers.',
  },
  // ----- Lunaria: the Silent Bell -----
  {
    id: 'lu_quay', region: 'Lunaria', trigger: 'arrive', title: 'The Empty Quay',
    text: 'The ferry bumps against a silent quay. Every door in Lunaria stands open. Teacups wait on tables, a broom leans where someone left it, and every lantern is dark. Pale shapes stand along the shore, looking out to sea. One turns — a woman with a ring of keys at her belt — and whispers: "You came. Please… not the bell. Not yet."',
  },
  {
    id: 'lu_diary1', region: 'Lunaria', trigger: 'find', chance: 1 / 150, title: "Lune's Diary — The Moonwake",
    text: '"Tonight is the Moonwake, when the moon comes down to touch the sea. We light the seven Moonlanterns along the shore, and at midnight I ring the bell to call everyone home to watch. My brother writes from Coalhaven that the Silver Willow sails tonight with his iron. I have saved the crew a seat at the lanterns." — Lune, bell-keeper',
  },
  {
    id: 'lu_lamplist', region: 'Lunaria', trigger: 'find', chance: 1 / 150, title: "The Lamplighter's List",
    text: 'A tidy list pinned inside the lamplighter\'s shed: "Seven Moonlanterns — Quay, Well, Market, School, Orchard, Chapel, Bell Tower. Moonwood for the flame, moonsilver for the cage. RULE ONE: never ring the bell while a single lantern is dark."',
  },
  {
    id: 'lu_drawing', region: 'Lunaria', trigger: 'find', chance: 1 / 150, title: "A Child's Drawing",
    text: 'Crayon on brown paper: everyone on the shore, waving at a little boat with a silver sail. The moon is big and smiling. But in the corner, someone has scribbled a dark cloud, pressing hard, and above the lanterns, one by one, the yellow has been crossed out.',
  },
  {
    id: 'lu_diary2', region: 'Lunaria', trigger: 'find', chance: 1 / 150, title: "Lune's Diary — The Last Page",
    text: '"The fog came in silent. The Hush. It drank the lanterns one by one, and in the dark I rang the bell too early — to call everyone in, to keep them safe. And we slipped. Half a step sideways, into the moonlight. We can see you. We are still here. If the bell rings again in the dark, we will fade for good. Light the lanterns first. Then ring. Then we can come home."',
  },
  {
    id: 'lu_hush', region: 'Lunaria', trigger: 'boss', boss: 'the_hush', title: 'What the Hush Left Behind',
    text: 'Where The Hush faded, seven cold lantern wicks lie on the cobbles, and a little crumb of moonlight hops between them. The fog is thinner already. Along the shore, the pale shapes turn to watch you — and for the first time, one of them waves.',
  },
  {
    id: 'lu_moonwake', region: 'Lunaria', trigger: 'restore', title: 'The Moonwake',
    text: 'Seven lanterns burn. The key turns, and the bell rings out, warm and round, across the water. The fog lifts like a curtain. Colour floods back into faces — the baker, the lamplighter, the children on the steps — and down at the quay, the crew of the Silver Willow blink awake, still holding their ropes. Lune runs to the end of the pier with a letter in her hand. Across the water, Coalhaven\'s lights flicker in answer. Her brother is coming. Lunaria is home.',
  },
  // ----- 🍶 Messages in bottles (found in corked bottles while fishing, in order). Little hints of the Frontier. -----
  // (Not tied to a town — the Tales page shows them in their own section.)
  {
    id: 'bt_boast', region: 'Coalhaven', trigger: 'bottle', title: "A Fisher's Boast",
    text: '"To whoever finds this: I caught a salmon THIS big off Salmon Quay. Nobody believes me. Now you know. Tell everyone. — Tobb" (There is a drawing of the fish. It is enormous. It is probably not to scale.)',
  },
  {
    id: 'bt_ember', region: 'Coalhaven', trigger: 'bottle', title: 'Warm Glass',
    text: 'The bottle is still warm. "The mountain is awake again. The goats sneeze sparks and the bread bakes itself on the windowsill. If you\'re coming to Cinderpeak, bring a hat — and something to trade for our ember-pepper. — The Ash Market"',
  },
  {
    id: 'bt_frost', region: 'Coalhaven', trigger: 'bottle', title: 'A Recipe, Half Frozen',
    text: '"FROSTHOLD WINTER STEW: one frostcod, three snow-onions, a knob of butter, and a song sung slowly while it simmers. (The song is the important part.)" The rest of the recipe is frozen into the glass.',
  },
  {
    id: 'bt_star', region: 'Coalhaven', trigger: 'bottle', title: 'Unsigned, Smelling of Stars',
    text: '"Something fell from the sky last night and landed in the crater. It hums. The cows are calm about it. We are trying to be calm about it too." The paper sparkles faintly in the dark.',
  },
  {
    id: 'bt_rift', region: 'Coalhaven', trigger: 'bottle', title: 'The Last Bottle',
    text: '"Before the towns, before the roads, there was the Rift. Everything began there, and everything finds its way back. I have walked every road there is to walk, and I wanted to tell someone: it was worth it, every step. — A traveller, at the end of the world"',
  },
];

/** Messages in bottles, in the order they're found. */
export const BOTTLE_TALES = ['bt_boast', 'bt_ember', 'bt_frost', 'bt_star', 'bt_rift'];
/** Chance an opened bottle holds the next message. */
export const BOTTLE_TALE_CHANCE = 0.35;

export const LORE_MAP: Record<string, LoreNote> = Object.fromEntries(LORE.map((n) => [n.id, n]));

/** Chance per finished action (in that town) to find its hidden note. ~1 in 250. */
export const LORE_FIND_CHANCE = 1 / 250;
