// Loose lore: each town has a vibe and a few short notes you find by playing there.
// A thread runs through them towards Lunaria — the town across the water whose lights went out.
// (Lunaria is planned as a ghost town to investigate.)
import type { Region } from './tiers';

/** How a note is found: arriving in town, beating its mini boss, or by chance while skilling there. */
export type LoreTrigger = 'arrive' | 'boss' | 'find';

export interface LoreNote {
  id: string;
  region: Region;
  trigger: LoreTrigger;
  /** Mini boss id for 'boss' notes. */
  boss?: string;
  title: string;
  text: string;
}

/** A one-line feel for each town (shown on the Tales page). */
export const TOWN_VIBE: Partial<Record<Region, string>> = {
  Pocketvale: 'Sleepy hills, warm bread and a well everyone makes wishes in.',
  Ironmoor: 'Brass bells, soot-black faces and songs sung deep underground.',
  Coalhaven: 'Foghorns, lantern-light on black water, and a question nobody likes to ask.',
  Bluecliff: 'Salt wind, red maples and a lighthouse that watches the one island nobody visits.',
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
];

export const LORE_MAP: Record<string, LoreNote> = Object.fromEntries(LORE.map((n) => [n.id, n]));

/** Chance per finished action (in that town) to find its hidden note. ~1 in 250. */
export const LORE_FIND_CHANCE = 1 / 250;
