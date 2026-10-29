// Loose lore: each town has a vibe and a few short notes you find by playing there.
// A thread runs through them towards Lunaria — the town across the water whose lights went out.
// (Lunaria is planned as a ghost town to investigate.)
import type { Region } from './tiers';

/** How a note is found: arriving in town, beating its mini boss, by chance while skilling there, or by bringing Lunaria back. */
export type LoreTrigger = 'arrive' | 'boss' | 'find' | 'restore' | 'bottle' | 'gift';

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
  Cinderpeak: 'Warm stones, spiced bread, hand drums in the Ash Market — and a mountain that snores.',
  Frosthold: 'Snow to the windowsills, steaming stew, and a whole village singing to keep warm.',
  Voidreach: 'Rope bridges, ribbons on every post, and a chasm full of stars that answers when you shout.',
  'Starfall Crater': 'Golden fields, sleepy cows, and a fallen star humming softly in the roots of a tree.',
  'Celestine Spires': 'Towers above the clouds, wind chimes in every window, and fish swimming through the air.',
  'Primordial Rift': 'Ferns taller than houses, the very first tree, and a crack in the sky that hums the oldest song.',
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
  // ----- Cinderpeak: the volcano village, and the start of the Traveller's trail -----
  {
    id: 'cp_market', region: 'Cinderpeak', trigger: 'arrive', title: 'The Ash Market',
    text: 'Stalls cling to the warm slope under awnings grey with ash. Bread bakes on flat stones by the lava vents, a goat with glowing horns naps on a pile of peppers, and somewhere a hand drum keeps time. A spice-seller grins: "First time up the mountain? Don\'t mind the rumbling. She\'s only snoring."',
  },
  {
    id: 'cp_wyrm', region: 'Cinderpeak', trigger: 'boss', boss: 'kiln_wyrm', title: 'The Kiln Keeper',
    text: 'Inside the old kiln, behind where the Wyrm sleeps, the walls are lined with clay pots — hundreds, every one fired perfectly. A chalk sign reads: "KILN WYRM — PLEASE DO NOT WAKE. Fires our pots for free." Underneath, newer: "Sorry about the noise. — Cinderpeak Potters\' Guild."',
  },
  {
    id: 'cp_ledger', region: 'Cinderpeak', trigger: 'find', title: "A Spice-Seller's Ledger",
    text: 'Pepper sales, goat feed, a note to fix the awning. Then, underlined twice: "Traveller came through again. Bought nothing, paid for everyone\'s bread anyway. Asked which road goes highest. I told them Frosthold. They smiled like they already knew." In the margin, a tiny drawing of a compass.',
  },
  {
    id: 'cp_well', region: 'Cinderpeak', trigger: 'gift', title: 'Left at the Well',
    text: 'Tucked behind the well bucket, wrapped in a faded travelling cloak: a little parcel and a card. "For whoever comes next. The springs are warmer than they look, and the goats are friendlier. I\'ve gone on ahead to Frosthold — keep up! — T."',
  },
  // ----- Frosthold: the singing snow village -----
  {
    id: 'fh_stewhall', region: 'Frosthold', trigger: 'arrive', title: "Every Pot Gets a Song",
    text: "Painted over the door of the Stew Hall: \"EVERY POT GETS A SONG.\" Inside, forty people in thick mittens are singing to one enormous pot. Nobody seems to think this is strange. A woman hands you a bowl, a spoon and a song sheet, in that order.",
  },
  {
    id: 'fh_rimeback', region: 'Frosthold', trigger: 'boss', boss: 'old_rimeback', title: "Rimeback's Cave",
    text: "Deep in the glacier, Old Rimeback's den is lined with singing icicles. When the wind blows through, they play the Frosthold lullaby, note for note. The old bear wasn't hibernating. It was listening.",
  },
  {
    id: 'fh_choir', region: 'Frosthold', trigger: 'find', title: "The Choirmaster's Notebook",
    text: "\"Visitor in the Stew Hall last night — a hooded sort who knew every verse of the winter songs, even the old ones nobody sings any more. Sang the low part beautifully. Gone before breakfast, down the Dark Stair toward the edge of the world.\"",
  },
  {
    id: 'fh_well', region: 'Frosthold', trigger: 'gift', title: "Left at the Well (Frosthold)",
    text: "Wrapped in the same faded cloak, with a card: \"Sing to the stew — they mean it, and it works. I've gone down the Dark Stair to Voidreach. Shout something kind into the chasm; it answers tomorrow, right when you need it. Keep up! — T.\"",
  },
  // ----- Voidreach: the rope-bridge town at the edge of the world -----
  {
    id: 'vr_ribbons', region: 'Voidreach', trigger: 'arrive', title: "The Ribbon Posts",
    text: "Every post on every rope bridge has ribbons tied to it — hundreds of them, every colour. Folk tie one round their wrist whenever they cross. Below the bridges there is no ground at all. Just stars, all the way down. A little girl waves: \"Don't look down. Well — do. It's lovely.\"",
  },
  {
    id: 'vr_wyrm', region: 'Voidreach', trigger: 'boss', boss: 'hollow_wyrm', title: "Under the Bridges",
    text: "Where the Hollow Wyrm coiled, the planks are scratched with thousands of little marks. Not days — echoes. Every one it ever heard. Someone has chalked beside them: \"It only wanted something to answer.\"",
  },
  {
    id: 'vr_ledger', region: 'Voidreach', trigger: 'find', title: "The Echo-Keeper's Ledger",
    text: "Every echo the chasm sends back, with the day it was first shouted. Mostly names, silly songs and one very long sneeze. Yesterday's entry, in careful handwriting: \"Echo heard — a cheerful voice: 'Something fell into the crater to the south. I'm going to go and say hello.'\"",
  },
  {
    id: 'vr_well', region: 'Voidreach', trigger: 'gift', title: "Left at the Well (Voidreach)",
    text: "\"Did you shout something kind? Good. It'll come back to you tomorrow. Something landed in the crater to the south — a star, they say. I'm going to go and say hello to it. — T.\"",
  },
  // ----- Starfall Crater: where the star came down -----
  {
    id: 'sf_fields', region: 'Starfall Crater', trigger: 'arrive', title: "The Humming Fields",
    text: "The whole crater hums one low, warm note. Corn grows in rings around a great tree in the middle, and down in its roots, something glows. The cows lie in the warm grass with their eyes closed. A farmer leans on the gate: \"You get used to the humming. Then you miss it when you leave.\"",
  },
  {
    id: 'sf_elder', region: 'Starfall Crater', trigger: 'boss', boss: 'stargrown_elder', title: "The Heart of the Crater",
    text: "Inside the Elder's roots lies the fallen star — about the size of a hay bale, warm as fresh bread, and humming. It isn't broken. Up close, the hum sounds almost like the Frosthold lullaby. Almost like it's waiting for someone to sing it back.",
  },
  {
    id: 'sf_almanac', region: 'Starfall Crater', trigger: 'find', title: "A Farmer's Almanac",
    text: "Planting dates, rainfall, a pressed starbloom. Then, in pencil: \"Stranger sat up all night by the star, humming to it. In the morning they said it came down from the Spires — that's where the stars are kept — and somebody ought to tell them it's safe. Off up the cloud stair, before the cows were even up.\"",
  },
  {
    id: 'sf_well', region: 'Starfall Crater', trigger: 'gift', title: "Left at the Well (Starfall Crater)",
    text: "\"I sat with the star all night. It isn't lost — it's resting. The Spires are up the cloud stair; they'll want to know it's safe. From up there, they say, you can see every road at once. — T.\"",
  },
  // ----- Celestine Spires: towers above the clouds -----
  {
    id: 'cs_stair', region: 'Celestine Spires', trigger: 'arrive', title: "Above the Weather",
    text: "The last step of the cloud stair comes out above the weather. Slender towers rise all around, joined by bridges no wider than a garden path. Wind chimes hang in every window, and a little shoal of fish drifts past your ear as if that's perfectly normal. Up here, it is.",
  },
  {
    id: 'cs_eyrie', region: 'Celestine Spires', trigger: 'boss', boss: 'aurelion', title: "Aurelion's Eyrie",
    text: "On top of the tallest spire, Aurelion's nest is woven from old star charts. Every chart has the same gap in it — the star that fell. She wasn't guarding the Spires. She was watching the sky for it to come home.",
  },
  {
    id: 'cs_book', region: 'Celestine Spires', trigger: 'find', title: "The Book of Roads",
    text: "The Spires' library keeps one enormous book with every road ever walked. Most entries are a single line. One goes on for hundreds of pages in a familiar hand — every road there is — and every single one ends in the same place: \"The Primordial Rift. Where it all began. Where I'll wait.\"",
  },
  {
    id: 'cs_well', region: 'Celestine Spires', trigger: 'gift', title: "Left at the Well (Celestine Spires)",
    text: "\"From up here you can see every road at once, and every one of them ends at the Rift. I'll wait for you there — this time I'll stay put. Bring the compass. — T.\"",
  },
  // ----- The Primordial Rift: where the world began, and where you meet the Traveller -----
  {
    id: 'pr_morning', region: 'Primordial Rift', trigger: 'arrive', title: "The First Morning",
    text: "The road ends in a valley of ferns taller than houses. The Worldtree holds up the sky, and above it the sky is cracked open, humming one slow, deep note. It's the same note as the star, and the singing ice, and the Frosthold lullaby. It was always the same song.",
  },
  {
    id: 'pr_wyrm', region: 'Primordial Rift', trigger: 'boss', boss: 'first_wyrm', title: "Around the Roots",
    text: "The First Wyrm sleeps curled around the Worldtree's roots — the way the Kiln Wyrm curls round its kiln, and the Hollow Wyrm round its bridges. Maybe every wyrm in the world is a little piece of this one, keeping something warm.",
  },
  {
    id: 'pr_shrine', region: 'Primordial Rift', trigger: 'find', title: "A Pocketvale Pebble",
    text: "At the foot of the Worldtree, someone has built a tiny shrine of smooth pebbles — Pocketvale pebbles, from the river by the well. Tucked under one is a child's drawing, very old and very faded: a bear in a flower crown. It's signed \"Mira, age 7\".",
  },
  {
    id: 'pr_traveller', region: 'Primordial Rift', trigger: 'gift', title: "The Traveller",
    text: "She's sitting on the edge of the well, hood down at last: an old woman with grass-green eyes and a pocket full of Pocketvale pebbles. \"You kept up!\" she laughs. \"Everyone calls me the Traveller. I was Mira, once. I drew a bear in a flower crown, back home, and then I walked every road there is to find out where they go.\" She waves at the humming sky. \"They all come here. All but one — the road up. The Ascension. My feet are too old for that one now.\" She folds her cloak into your arms and closes your fingers round the compass. \"Yours aren't. Go on. And write to me.\"",
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
