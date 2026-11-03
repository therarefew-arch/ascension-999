// 🎪 Town happenings (v0.0.2.10, owner picked "town happenings"): each day one of the towns you've found holds a
// small event for one skill. Rules live in core/happenings.ts.
import type { SkillId } from './items';
import type { Region } from './tiers';

export interface HappeningDef {
  id: string;
  town: Region;
  name: string;
  emoji: string;
  skill: SkillId;
  /** What's going on, in the town's own voice. */
  blurb: string;
  /** Who hands you the prize. */
  host: string;
}

export const HAPPENINGS: HappeningDef[] = [
  { id: 'pie_bakeoff', town: 'Pocketvale', name: 'The Pie Bake-off', emoji: '🥧', skill: 'cooking', host: 'the bakery judges',
    blurb: 'Trestle tables on the green, a row of cooling pies and a very serious judge with a very small spoon.' },
  { id: 'log_rolling', town: 'Pocketvale', name: 'Log-Rolling Day', emoji: '🪵', skill: 'woodcutting', host: 'the old woodsman',
    blurb: 'Everyone brings a log to the millpond. Most of them end up in the millpond, along with a few woodcutters.' },
  { id: 'miners_race', town: 'Ironmoor', name: "The Miners' Race", emoji: '⛏️', skill: 'mining', host: 'the shift bell-ringer',
    blurb: 'Two teams, two tunnels, one cart of ore each. The bell rings at dawn and the whole town cheers from the pit edge.' },
  { id: 'anvil_day', town: 'Ironmoor', name: 'Anvil Day', emoji: '🔨', skill: 'smithing', host: 'the forge master',
    blurb: 'Every forge in town opens its doors. The ringing of hammers keeps time like a big iron drum.' },
  { id: 'bonfire_night', town: 'Coalhaven', name: 'Bonfire Night', emoji: '🔥', skill: 'firemaking', host: 'the harbour watch',
    blurb: 'Fires all along the harbour wall, so the barges can find their way home through the fog.' },
  { id: 'barge_angling', town: 'Coalhaven', name: 'Barge-side Angling', emoji: '🛶', skill: 'fishing', host: 'the bargemaster',
    blurb: 'The coal barges tie up side by side and the bargefolk fish off the decks, trading tall tales and bait.' },
  { id: 'fishing_derby', town: 'Bluecliff', name: 'The Fishing Derby', emoji: '🎣', skill: 'fishing', host: 'the harbourmaster',
    blurb: 'Rods all along the cliff path and a chalkboard by the lighthouse for the biggest catch of the day.' },
  { id: 'net_mending', town: 'Bluecliff', name: 'The Net-Mending Bee', emoji: '🪢', skill: 'crafting', host: 'the net-mender',
    blurb: 'Nets spread out on the quay like great grey blankets, and everyone sits down with a needle and a mug of tea.' },
  { id: 'lantern_night', town: 'Lunaria', name: 'Lantern Night', emoji: '🏮', skill: 'firemaking', host: 'the lamplighters',
    blurb: 'The town that went dark now lights every window on purpose — one lantern for each year it waited.' },
  { id: 'moonherb', town: 'Lunaria', name: 'Moon-herb Gathering', emoji: '🌙', skill: 'herblore', host: 'the herb-wife',
    blurb: 'Silver herbs only open under a full fog. Baskets out, everyone — and mind the canal edge.' },
  { id: 'ember_forge', town: 'Cinderpeak', name: 'The Ember Forge', emoji: '🌋', skill: 'smithing', host: 'the Ash Market smiths',
    blurb: 'Smiths carry their work up to the warm vents and forge straight off the mountain’s own heat.' },
  { id: 'pepper_feast', town: 'Cinderpeak', name: 'The Fire-pepper Feast', emoji: '🌶️', skill: 'cooking', host: 'the feast-cook',
    blurb: 'Long tables in the Ash Market and pots so hot the steam glows. Bring water. Bring more water.' },
  { id: 'stew_cookoff', town: 'Frosthold', name: 'The Stew Hall Cook-off', emoji: '🍲', skill: 'cooking', host: 'the Stew Hall keeper',
    blurb: 'A hundred cauldrons in the Stew Hall and one wooden ladle for a prize. It is a very old ladle. Everyone wants it.' },
  { id: 'ice_timber', town: 'Frosthold', name: 'Ice-Timber Day', emoji: '🪓', skill: 'woodcutting', host: 'the sled-builder',
    blurb: 'Frozen pines ring like bells when you cut them. The whole valley listens to the music.' },
  { id: 'star_runes', town: 'Voidreach', name: 'Star-rune Night', emoji: '🔮', skill: 'runecrafting', host: 'the bridge-keeper',
    blurb: 'On the ribbon bridges the stars come so close you can trace runes straight off them.' },
  { id: 'chasm_fishing', town: 'Voidreach', name: 'Chasm Line-Fishing', emoji: '🌌', skill: 'fishing', host: 'the old line-fisher',
    blurb: 'Long, long lines dropped into the starlight below. Nobody quite knows what bites down there.' },
  { id: 'meteor_dig', town: 'Starfall Crater', name: 'The Meteor Dig', emoji: '🌠', skill: 'mining', host: 'the crater warden',
    blurb: 'Last night a star came down at the crater rim. Shovels out — whatever fell is still warm.' },
  { id: 'starglass', town: 'Starfall Crater', name: 'Starglass Crafting', emoji: '💫', skill: 'crafting', host: 'the glassblower',
    blurb: 'Crater sand melts into glass that keeps a little starlight inside. Everyone makes something to take home.' },
  { id: 'kite_festival', town: 'Celestine Spires', name: 'The Kite Festival', emoji: '🪁', skill: 'crafting', host: 'the kite-master',
    blurb: 'Kites tied to every spire, tails streaming over the cloud sea. The best ones are made on the day.' },
  { id: 'cloudherb', town: 'Celestine Spires', name: 'Cloud-herb Picking', emoji: '☁️', skill: 'herblore', host: 'the sky-gardener',
    blurb: 'Herbs that grow on the undersides of clouds. You pick them lying on your back, very carefully.' },
  { id: 'worldtree_rites', town: 'Primordial Rift', name: 'Worldtree Rites', emoji: '🌳', skill: 'woodcutting', host: 'the root-tenders',
    blurb: 'Fallen branches from the Worldtree are gathered and shared out, one for every hearth in the world.' },
  { id: 'first_runes', town: 'Primordial Rift', name: 'The First Runes', emoji: '🪨', skill: 'runecrafting', host: 'the rift-scribe',
    blurb: 'Down by the well the oldest runes glow again for one day. Copy one, and it remembers you.' },
];
export const HAPPENING_MAP: Record<string, HappeningDef> = Object.fromEntries(HAPPENINGS.map((h) => [h.id, h]));
