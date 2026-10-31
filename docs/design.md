# Ascension 999 — Game Design

(The game was first called "Pocketvale"; Pocketvale is now the name of the starting town.)

> This is the full vision. Most of it is **not built yet**. See "Build phases" at the bottom for what exists.

## Pitch

A cozy medieval fantasy idle skilling RPG for phones (portrait). Gather, craft, fight and explore across 11 regions,
with deep progression (every skill to level 500), no energy limits and no paying to skip the grind.

## Core rules

- Single-player for now; player data, market and loot logic are kept separate so multiplayer can be added later.
- All loot goes through one central loot system.
- Gems can ONLY drop from bosses and mini bosses.
- All skills cap at level 500, with a new resource tier every 50 levels.
- No energy limits, no pay-to-skip.
- Cozy medieval style; clean, uncluttered UI.

## Skills

| Skill | Notes |
|---|---|
| Mining | Ores for every tier. |
| Smithing | Ores → bars → weapons, armour and tools. |
| Woodcutting | Logs for every tier. |
| Firemaking | Burn logs (see below). |
| Fishing | Fish for every tier. |
| Cooking | Cook fish into food. |
| Crafting | Tools from wood and stone, with +1 to +10 upgrades. |
| Enhancing | Improve gear. Unlocks the Loot Belt at level 60. |
| Melee, Ranged, Magic | Combat styles. Triangle: Melee beats Ranged, Ranged beats Magic, Magic beats Melee. |
| Defense, Health | Combat survival skills. |

### Levels and XP

- Cap: 500. A new resource tier unlocks every 50 levels.
- XP needed for the next level = `0.5 × level^2.2 + 10 × level` (rounded).
- Better resources give more XP per second, so each new tier feels like a step up.
- Target pace: ~6 hours to level 50, ~35 hours to 100, ~876 hours to 500 for one skill.
- Planning numbers for future gathering tiers (tier t = 0..10): action time ≈ `3 + 0.3t` seconds, XP ≈ `8 × 1.5^t`.

## Ore / metal tiers (11)

| # | Tier | Unlock level |
|---|---|---|
| 1 | Bronze (Copper + Tin) | 1 |
| 2 | Iron | 50 |
| 3 | Steel | 100 |
| 4 | Cobalt | 150 |
| 5 | Moonsilver | 200 |
| 6 | Emberite | 250 |
| 7 | Frostcore | 300 |
| 8 | Voidstone | 350 |
| 9 | Starmetal | 400 |
| 10 | Celestium | 450 |
| 11 | Primordial | 500 |

Weapons and armour exist for every tier, each with unique icons.

## Regions (11)

Each region has a town, its own resources, monsters and a mini boss.

1. Pocketvale (starting town)
2. Ironmoor
3. Coalhaven (introduces coal; from then on steel and higher bars may need coal)
4. Bluecliff
5. Lunaria
6. Cinderpeak
7. Frosthold
8. Voidreach
9. Starfall Crater
10. Celestine Spires
11. Primordial Rift

## Gems

- 6 rarities: Common, Uncommon, Rare, Epic, Legendary, Mythic.
- Higher rarity = better stat rolls.
- Socketable into gear. Rerollable for coins.
- **Only drop from bosses and mini bosses.**

## Loot Belt

Unlocks at Enhancing 60. Auto-sorts loot and quick-loots all gems.

## Firemaking

- Higher level and better logs burn longer.
- Bonfires.
- Coloured flames per log type.
- Wildfire mini boss: a Piano Tiles-style rhythm minigame.
- Immersive XP mode: Cooking Mama-style stick shaving, kindling meter, crackle sounds, slow lofi cowboy music.

## Combat

- Combat triangle: Melee > Ranged > Magic > Melee.
- Weekly boss with a "Defeated" screen and a countdown to respawn.

## Minigames

- Mahjong solitaire-style minigame with always-solvable boards.
- Wildfire rhythm minigame (Firemaking).

## Economy

- NPC Trading Post market with shifting prices.
- Coin sinks: player house, cosmetics, bank space, idle slots, fast travel, gem rerolls, repairs, rotating shop.

## Quality of life

Queue presets, XP tracker, loadouts, inventory full warning, collection log, skilling pets.

## Minigames — every skill gets one

The game is cozy and laid back. Every skill has a fun, optional minigame you can play instead of (or alongside) idling.
Minigames are forgiving: a hit gives the normal reward, a great hit gives a bonus, a miss just means "try again" — never a penalty.
All minigame rewards still go through the central loot system.

| Skill | Minigame | Status |
|---|---|---|
| Mining | **Strike Vein** — tap when the marker is in the gold zone (0.9s sweep, wide zone). Good hit = 2 ore, perfect = 3 ore + 50% XP, every 5-hit combo = +3 ore (owner asked for faster/more ore) | Built |
| Smithing | **Anvil Rhythm** — tap as the glowing ring lands on the anvil; 3 hits finish an item; all-perfect = masterwork bonus | Built |
| Woodcutting | **Chop!** — just tap the tree 5 times for a log (owner's request: simple) | Built |
| Fishing | **Reel It In** — hold to reel, keep the hook on the fish's green zone; a clean catch = bonus fish; fish never escape. **Tile Match** — mahjong solitaire (always-solvable boards, free shuffle); each pair = Fishing XP, clearing the board = bonus fish | Built |
| Cooking | **Fire + Heat Precision** — the cooking fire must be fed with logs (Stoke Fire = 1 log + Firemaking XP for that log; better logs burn longer; flame colour follows the log). The fire ticks down while you're in the Kitchen. Sear twice in the golden zone = Great food; food never burns. Idle cooking feeds the fire from your bag automatically. | Built |
| Firemaking | **Kindle** — tap to fill the kindling meter; light it fast for a quick-spark XP bonus; coloured flames per log | Built (stick shaving, Immersive XP mode and the Wildfire rhythm boss come later) |
| Crafting | **Steady Hands** — tap as the blade passes each notch; the item is always made, clean cuts give bonus XP | Built |
| Enhancing | **Rune Align** — tap when the rune passes the top for up to +10% success chance | Built |
| Melee, Ranged, Magic, Defense, Health | To be designed with combat | Later |

## Tools and upgrades

- Every gathering/making skill has its own tool, all made at the **Crafting** Workshop: Pickaxe (Mining), Axe (Woodcutting), Rod (Fishing), Hammer (Smithing), Knife (Crafting), Tinderbox (Firemaking), Skillet (Cooking).
- **Tools gate higher resources**: a tool of tier N must be equipped to gather/make that skill's tier-N resources. Tier 0 (level 1 resources) needs no tool.
  - Tier 0 = **Stone** tools (pine logs + stone). Tier 1 = **Bronze** tools (pine logs + bronze bars, Crafting 50+, needs a Stone knife).
  - Each tool tier is made from the previous tier's resources, so there's never a dead end. Future: Iron tools (oak + iron) for tier 2, and so on.
- Tools and smithed gear can be improved **+1 to +10**. Each level adds about +12% of the base stat (at least +1).
  - **Crafting** upgrades tools: always succeeds. Works on the equipped tool too — the +1 replaces it right in its slot.
  - **Enhancing** upgrades weapons and armour: chance-based (about 95% for +1 down to about 32% for +10, better with higher Enhancing level and Rune Align luck). A failure only uses the bars — **the item is never lost**. A failed try still gives 25% XP.
- Smithing screen has tabs **Smelt / Weapons / Armour**; Crafting has **Tools / Upgrades** (recipe list with have/need counts, like the owner's reference).
- Upgraded items are separate item ids (`bronze_sword_p3` = Bronze sword +3) so stacking and saving stay simple.

## Food

Cooked fish is stored for combat (heals Health). "Great" food from the Cooking minigame heals more.

## Visual style guide

Based on the owner's reference screenshots:
- Near-black backgrounds with warm gold/orange glow; bold UPPERCASE gold headings.
- Numbers in a monospace font: XP/hr in green, items/hr in gold.
- Top status bar of pill chips (total level, location, IDLE slots), with a line under it showing the current idle and its XP/h.
- Skill hotbar (scrollable tiles with level and time to next level) just above the bottom nav on the Skills tab.
- Resource chips row at the top of each skill; a large central "stage" card for the minigame; big orange action button.
- Pixel-art backdrops per place (drawn in code), dimmed behind the UI.
- Popups: dark panels with an orange border (e.g. "IDLE SKILL SLOTS", step 1 choose skill → step 2 choose resource with XP/hr and items/hr).
- Title screen "Choose your saga" with 3 save slots.
- Big Bag button stays centred in the bottom nav (owner's choice).

## Idle system

- Choose a skill and a specific resource. Start with 1 idle slot (more slots later as a coin sink).
- Offline progress up to 24 hours, with a summary card when returning.
- If the inventory is full, idling stops (owner's choice); the summary explains when.

---

## Build phases

### Phase 1 — built
- Pocketvale town.
- Mining (Copper, Tin, Iron) and Smithing (Bronze bar, Iron bar, Bronze/Iron pickaxe, sword, shield, helmet, chestplate, platelegs).
- Inventory (30 slots, materials stack up to 500 per slot), bank with search, gear screen with item comparison.
- 1 idle slot, offline progress (24h cap), offline summary card.
- Auto-save, phone safe areas, bottom nav, big bag button.
- Sound system with master/effects/music volume and quiet placeholder sounds.
- Minigames: Strike Vein (Mining) and Anvil Rhythm (Smithing).
- Title screen with 3 save slots; dark/gold restyle per the style guide; Idle Skill Slots popup with per-hour rates.

### Phase 2 — built
- Woodcutting (Pine, Oak), Firemaking (burn Pine/Oak), Fishing (Shrimp, River trout), Cooking (normal + Great food),
  Crafting (stone/oak axes, fishing rods, tinderboxes, skillets + upgrades +1..+10), Enhancing (smithed gear +1..+10).
- Mining: Stone added (for Crafting).
- Six new minigames (see table above), new pixel-art scenes, tool slots on the Gear screen.
- Save version 2 (old "tool" slot → "pickaxe" slot).

### Phase 2.1 — built (owner's tweaks)
- Woodcutting = tap 5 times. Pickaxes moved from Smithing to Crafting; Hammer and Knife tools added; tools gate tier-1 resources; upgrade tools in place.
- Cooking fire (stoke with logs for Firemaking XP, flame colour per log, ticks down). Shrimp icons. Fishing Tile Match (mahjong). Smithing/Crafting tabs.
- Save version 3 (old pickaxes and pine/oak tools converted to the new Stone/Bronze tools, keeping their +levels).

### Phase 3 — built (combat)
- Skills: Melee, Ranged, Magic (trained by damage you deal with that style), Defense (dodging/blocking), Health (all combat; max HP = 20 + 4 × Health level + gems).
- Weapon sets the style: swords (Smithing) = Melee; bows (Workshop) = Ranged + arrows; staffs (Workshop) = Magic + runes.
  Arrows/runes are crafted (15 arrows / 10 runes per craft), used from the bag, 25% chance to be saved. Best ammo is used automatically.
- Triangle: the right style gets +10% accuracy and ×1.25 max hit; the wrong one −10% and ×0.8.
- Pocketvale monsters: Field Rat (Lv1 Melee), Hedge Sprite (Lv8 Magic), Bandit Archer (Lv18 Ranged), Mossback Boar (Lv30 Melee).
- Mini boss: **Old Thornhide** (Lv45). Fought by hand only (pauses while you're away), respawns 5 minutes after defeat (countdown shown). Drops gems (70% per kill) — the only gem source.
- Fights use the idle slot and continue offline. Auto-eat below 50% HP. You heal 1 HP / 5s, also in fights.
  Cozy: with no food left below 25% HP you head home; if knocked out you wake up in town with full HP. **Nothing is ever lost.**
- Combat minigame: STRIKE in the gold zone charges a critical hit (×1.75 max hit, never misses); BLOCK during the monster's wind-up halves its damage. Misses cost nothing.
- Coins drop from monsters (shown in the top bar). First coin sink: gem rerolls.
- Gems: Ruby (+Attack), Sapphire (+Defense), Emerald (+Max HP) × 6 rarities; rolls get better with rarity.
  Each weapon/armour slot has one socket; **the gem stays in the slot** when you swap gear. Removing is free. Reroll costs 50–5,000 coins by rarity.
- Food heals: shrimp 6 (Great 9), trout 14 (Great 20).
- Navigation: Combat tab added; Town is opened from the "Pocketvale" chip in the top bar (and Town has a Training Grounds place).
- Save version 4.

### Phase 3.1 — built (owner's tweaks)
- **Runecrafting** skill (Rune Altar). Mining gets **Rune essence** (Lv 5).
  - Talismans (Air Lv1, Water Lv10, Earth Lv20, Fire Lv30): 5 essence + 2 stone. Kept in the bag, never used up.
  - Runes: 1 essence → 2 runes of an element; needs that element's talisman in the bag.
  - Staffs: Crafting makes **blank** staffs; Runecrafting turns blank staff + runes (50 pine / 100 oak) into an elemental staff.
  - Elemental staffs only cast with their own element's runes. Rune power: Air 2, Water 3, Earth 4, Fire 5.
  - Minigame **Rune Trace**: tap the glowing rune points in number order; a clean trace = bonus XP (+ bonus runes).
- Crafting no longer makes runes (arrows stay).
- Faster combat: attacks every 1.6s (melee) / 1.7s (ranged) / 1.9s (magic); monsters ~35% faster; next monster in 0.8s; quicker strike bar; a successful STRIKE hits immediately as a critical.
- Save version 5: Minor runes → Air runes, Major runes → Earth runes, old staffs → Air staffs (keeping +levels).

### Phase 4a — built (economy)
- **3 idle slots** running at the same time (one fight at a time). Slot 2: total level 50 or 5,000 coins. Slot 3: total level 150 or 25,000 coins.
  Starting an activity reuses the slot already doing that skill, else a free slot, else slot 1. Offline time is shared out between slots in 5-second chunks.
- **Trading Post** (Town): SELL anything (bag first, then bank), BUY basic materials/food, prices drift every 30 minutes with trend arrows.
  Gems can never be bought. Purchases go through the central loot system. Code lives in `src/market/`.
- **Rotating shop**: 4 discounted deals every 6 hours, each once per rotation.
- **Bag upgrades**: +5 slots for 2k / 6k / 15k / 40k coins (30 → 50). (Bank was already unlimited.)
- Save version 6.

### Phase 4b — built (quality of life)
- **Adventurer's Journal** (Town): XP tracker (XP and XP/hr per skill since reset), collection log (every item ever received; +0 versions only; unfound items shown as silhouettes), pets.
- **Pets**: one per skill (~1 in 3,000 actions) + Bramble from Old Thornhide (1 in 50). Active pet follows you (shown in Town) and gives +2% XP in its skill (combat pet: all combat skills).
- **Gear loadouts** (Gear screen): 3 saved setups; equipping pulls from bag/bank; gems stay in slots.
- **Queue presets** (Idle Slots popup): 3 saved idle-slot setups, restarted with one tap.
- **Bag-full warnings**: toast when 3 slots from full and when full; the Bag button glows red.
- Save version 7.

### Phase 4c — built (weekly boss, Wildfire, bonfires)
- **Weekly boss — Grumbleroot, the Moss King** (Lv 80, 1,200 HP). Fought by hand. Style rotates every week (Melee → Ranged → Magic).
  Drops 2 guaranteed gems with better rarity odds, 800–1,500 coins and supplies; pet Sprout (1 in 20).
  After defeat: **DEFEATED** card with a live countdown (days/hrs/min/sec) to Monday 00:00 local time.
- **Wildfire** (Firemaking mini boss, Firemaking 20+, Campfire → WILDFIRE): Piano Tiles–style rhythm game, 4 lanes, ~40s.
  Douse ≥60% to tame it: big Firemaking XP + loot (coins, logs, fire runes, 35% gem chance). Respawns 15 min after a win; losing just lets you retry.
- **Bonfires** (Campfire → BONFIRE): burn 20 logs for 1.2× their Firemaking XP and +5% XP to all skills (pine 10 min, oak 20 min; relighting stacks time). Flame colour follows the log. 🔥 timer chip in the top bar.
- Save version 8.

### Phase 4d — built (999 cap, tiers, profile)
- **Level cap 999.** Same XP formula as before (no one's level drops). ~6h to 50, ~33h to 90, ~1,350h to 450, ~3,150h to 999 per skill.
- **11 tiers every 90 levels, one per region**: 1 Pocketvale (Bronze/Pine/Shrimp), 90 Ironmoor (Iron/Oak/Trout), 180 Coalhaven (Steel = iron + coal / Willow / Salmon), 270 Bluecliff (Cobalt/Maple/Lobster), 360 Lunaria (Moonsilver/Moonwood/Moonfin), 450 Cinderpeak (Emberite/Emberbark/Emberfin), 540 Frosthold (Frostcore/Frostpine/Frostcod), 630 Voidreach (Voidstone/Voidwood/Void eel), 720 Starfall Crater (Starmetal/Starbloom/Star ray), 810 Celestine Spires (Celestium/Celestwood/Sky carp), 900 Primordial Rift (Primordial/Worldtree/Leviathan).
  Every tier has ores, bars, logs, fish/food, weapons, armour, bows, staffs, arrows, tools (+1..+10) and enhancing. Elements: Air 1, Water 10, Earth 20, Fire 30, Nature 270, Frost 540, Shadow 630, Light 810.
- **Locked until each region is built** (owner's choice — even Iron/Oak/Trout now wait for Ironmoor). Skill screens show the next region's tier with a 🔒 so you can see what's coming. Owned gear from locked tiers still works.
- Gear needs combat level = tier level − 20 (Iron 70, Steel 160 …).
- **Idle slots** now unlock at total level 500 (or 50,000 coins) and 1,500 (or 250,000 coins). Already-unlocked slots stay unlocked.
- **Profile** (top-right button, shows your pet): Character (avatar drawn wearing your gear + pet), Stats (all skills, totals), Pets (equip a pet), Settings.
- **Tile Match** has calm lofi music, a wooden tile thud and a match chime.

### Phase 5 — built (Ironmoor)
- **Ironmoor** (region 2, tier 1 at level 90) is built: Iron / Oak / River trout and everything made from them (iron gear, bronze tools, oak bows/staffs, iron arrows) unlock once you **discover** Ironmoor.
- **Travel** (Town → TRAVEL map): the road opens when any skill reaches 90. Walking is free (90s) and idle slots keep working on the road; **fast travel** costs 200 coins and only goes to towns you've visited. The top-bar chip shows where you are (or 🚶 and a countdown while walking).
- **Location rules**: gathering (Mining, Woodcutting, Fishing) and combat must be *started* in their region; processing skills work anywhere once the region is discovered. Idle slots keep running after you travel away. Skill screens tag resources 🔒 (not built), 🧭 (not discovered) or 📍 (gather on location).
- **Ironmoor town**: own pixel-art scene and local place names (The Deep Mine, Ironworks Forge, Oakwood Grove, Rushwater Falls, Miners' Canteen, The Ember Pit, Tinker's Bench, Stone Circle, Rune Anvil, Mine Tunnels). Its Trading Post sells iron-tier goods.
- **Ironmoor monsters**: Ore Mole (95), Rust Sprite (110, Magic), Ironmoor Raider (125, Ranged), Ironhide Boar (145); **mini boss Forgefather Brask** (170, gems 80% with slightly better rarities, 5-min respawn).
- Save version 9 (location, discovered regions, travel).

### Phase 5.1 — built (cozy update + tidier UI)
- **Daily gift** in Town's TODAY card: one per calendar day; a streak grows the gift up to day 7 (coins, food, logs, essence, bars). Missing a day restarts at day 1.
- **Town Requests**: 3 small goals each day (collect an item, earn skill XP, defeat monsters or play minigame rounds) that pay coins; finish all three for a bonus bundle. Progress counts from idling, offline time, fights and minigames.
- **Day and night**: outdoor scenes follow the phone's clock (warm dawn, orange dusk, starry night); Town greets you by time of day.
- **Pet your pet**: tap your pet in Town for a wiggle, hearts and a happy sound.
- **Confetti** on every 10th level, discovering a town, finishing all requests and 7-day streaks. **Gentle vibration** on phones that support it (toggle in Settings).
- **Tidier UI**: slimmer top bar (total level, coins, location, idle n/m) with a red dot when something is waiting in Town; thinner idle line; smaller toasts and no toast for every loot drop; Town has a compact hero, TODAY card, a shortcut row (Journal, Trading, Training, Bank, Armoury), a 3-column places grid and a fold-away travel map.
- Save version 10 (daily gift, requests).

### Phase 5.2 — built (Ascension 999, no duplicates)
- Game renamed **Ascension 999** (title screen, browser tab, home-screen name). Saves are untouched.
- **Town trimmed to what only Town has**: daily gift + Town Requests, Trading Post, Journal, Travel. The skills grid, Bank/Armoury/Combat shortcuts and the idle button were removed (they're all on the bottom bar or top bar).
- **Tap a Town Request to go there**: XP and collect requests open the right skill, monster requests open Combat.
- Each skill screen shows its local place name (e.g. "📍 The Deep Mine, Ironmoor"); Combat shows where you fight. Combat's extra Gear button was removed (Gear is on the bottom bar).

### Phase 5.3 — built (satisfying sounds)
- Every minigame tap has its own sound: pickaxe chink (Mining), hammer on anvil (Smithing, Enhancing), woody chop rising in pitch then a tree-fall (Woodcutting), reel ratchet while holding (Fishing), sizzle on each sear plus a crackling fire ambience while the fire burns (Cooking), twig snaps building to a crackle and a "whoomp" (Firemaking), steam hiss (Wildfire), knife carving (Crafting), rising rune chimes (Runecrafting), blade "shing" and shield thud (Combat), munch (eating), coin pings (Trading Post, requests).
- Better hits sound brighter; misses get a soft swish, never a harsh buzz.
- Every sound plays with a tiny random pitch change so repeated taps sound natural. Buttons have a woody "tock" (deeper for the bottom bar, brighter for main actions) and a little squish when pressed.
- All sounds are synthesised by `scripts/make-placeholder-sounds.mjs` (`npm run sounds`); a real recording with the same name replaces any of them.

### Phase 5.4 — built (Lucky Stars, goals, longer music)
- **Kindling sounds clean when spammed**: one short twig snap per tap, and a single fire crackle that grows louder as the fire builds (instead of a new crackle on every tap). Any sound now has at most 3 copies playing at once.
- **Town music** grew from a 16-second loop into a 2-minute song with the same soft swelling chords: 8 sections with new chord turns, a gentle bell melody, a soft bass and a music-box arpeggio, ending back where it started so the loop is smooth.
- **🌟 Lucky Stars**: every 6–12 minutes while you play, a star drifts across the screen for 14 seconds. Tap it for coins (grow with total level) and often a handful of your best gatherable resource (through the loot system; never gems). Count shown in Profile → Stats.
- **🎯 Skill goals**: on any skill screen, set a target (next 10, next tier, next 100, or 999). The chip shows the time left at your current pace (or best option); reaching it celebrates with confetti and clears the goal. Profile → Stats also shows day streak and goals set.
- Save version 11 (goals, stars caught).

### Phase 6 — built (Coalhaven, lore, town themes)
- **Coalhaven** (region 3, tier 2 at level 180): a sooty harbour where coal barges dock under weeping willows. Unlocks Coal, Steel bars and steel gear/arrows, Willow, Salmon, Iron tools (made from Ironmoor materials) and willow bows/staffs. Road opens when any skill reaches 180; walk 2 min, fast travel 350 coins.
- **Monsters at The Docks**: Soot Crab (185, melee), Smog Wisp (200, magic), Dockside Smuggler (220, ranged), Cinderhide Boar (245, melee); **mini boss Mother Clawsoot** (265, ranged — spits hot coal), gem 85% with better rarities than Brask, can drop the pet **Pinch** 🦀. New crab portrait. Balance simulated to match Ironmoor at the same relative level.
- Local place names (Blackseam Pit, Harbour Steelworks, Weeping Willows, Salmon Quay, The Salty Kettle, Lantern Row, Shipwright's Loft, Tide Stones, Anchor Forge), its own pixel-art harbour scene (day/night), Trading Post sells coal/steel/salmon/willow.
- **Loose lore (📜 Tales in the Journal)**: each town has a one-line vibe and 3 short notes — found by arriving, by beating its mini boss, and by chance while skilling there (~1 in 250 actions). Older saves receive the notes they've already earned. A thread runs through them: the barge *Silver Willow* never came back from **Lunaria**, whose lights went dark.
- **Every town has its own music**: Pocketvale keeps its song; Ironmoor has a deep, slow minor theme with distant anvil chimes; Coalhaven has a gentle harbour waltz with soft waves and a far-off foghorn. Songs crossfade when you travel and only download when needed.
- Save version 12 (lore).

### Phase 7 — built (Bluecliff) · v0.0.1.3
- **Bluecliff** (region 4, tier 3 at level 270): windswept sea cliffs, red maples, white cottages and a red-and-white lighthouse — with the dark island of Lunaria on the horizon. Unlocks Cobalt ore/bars/gear/arrows, Maple, Lobster, Steel tools (from Coalhaven materials), maple bows/staffs, and the new **Nature** rune element (nature talisman, runes and nature staffs). Road opens at 270; walk 2.5 min, fast travel 500 coins.
- **Monsters on The Cliff Path**: Gull Thief (275, ranged), Spray Sprite (290, magic), Cliff Wrecker (310, ranged — swings false lanterns to wreck ships), Cobalt Crab (335, melee); **mini boss Old Galewing** (355, magic — a huge grumpy storm gull), gem 88% with better rarities, can drop the pet **Peep** 🐥. New gull portrait. Balance simulated against Coalhaven.
- Places: Cobalt Cliffs, Lighthouse Forge, Maple Ridge, The Lobster Pots, Clifftop Chowder House, Beacon Point, Netmaker's Hut, Wind Stones, Tidecut Anvil. Trading Post sells cobalt/maple/lobster.
- **Music**: airy harp arpeggios, a soft high pad, sea wind, and a bell buoy ringing far out on the water.
- **Lore** (towards Lunaria): the lighthouse log shows Lunaria's lights went out all at once one autumn night; Galewing's nest holds a brass key stamped LUNARIA BELL TOWER; a message in a bottle in silver ink: "we are not gone… please do not ring the bell. — L."
- Town banners now focus on the best part of each scene. **Version number** shown on the title screen and in Settings (`src/version.ts`).

### Phase 7.1 — built · v0.0.1.4
- **Pantry Prep** (Cooking, next to the Stove): a calm 4×4 sliding puzzle on a cutting board (2048 rules). Two of the same ingredient combine: 🌿 Herbs → 🧄 Garlic → 🧅 Onion → 🥕 Carrots → 🍄 Mushrooms → 🐟 Fillet → 🍲 Fish Stew → 🥧 Fish Pie → 🍱 Harvest Platter → 👑 Royal Feast. Every combine gives Cooking XP (bigger dishes more; about the same rate as idle cooking). Your first Fish Stew each board cooks one of your fish for real (if the fire is lit); Fish Pie or better makes it Great. Swipe, arrow keys or buttons; no timer, nothing to lose; a full board is just "tidy". Rules in `src/core/pantry.ts`.
- Minigames named to fit their skill: **Sort the Catch** (Fishing, was Tile Match), **Pantry Prep** (Cooking).
- Music: Pantry Prep has a cosy café tune (electric-piano chords, walking bass, brushes, a bubbling pot). **Ironmoor** has a new miners' work song (boots-on-stone drum, pickaxe tinks, walking bass, mallet chords, whistled tune, miners' hum). Ironmoor's first song is saved as **`music_lunaria`** for the foggy island ghost town.

### Phase 8 — built (new pacing) · v0.0.1.5
- **A town every 75 levels**: 1, 75, 150, 225, 300, 375, 450, 525, 600, 675, 750 — every town open by **750**; **750 → 999 is the endgame** (to be designed: mastery perks every 25 levels, Ascended crafting at 800/850/900/950, endgame bosses, a gold "Ascended" glow at 999).
- **New XP curve** built from time targets (one skill idling its best basic action, no boosts): 75 ≈ 6 h · 150 ≈ 24 h · 300 ≈ 96 h · 750 ≈ 600 h · 999 ≈ 1,120 h. Before, 94% of the time to 999 was spent before the last town and the middle dragged (≈2,000 h between 180 and 630).
- **🌱 Early boost**: ×3 XP below level 90, fading to normal by 180. **🧭 Catch-up**: any skill behind your highest skill gets +10% XP per 10 levels behind (up to +100%). Together max ×4; shown under each skill's XP bar, and included in XP/hour, "next level" and goal times. Real pace with boosts: 75 ≈ 2 h, 150 ≈ 10 h; a lagging skill reaches 150 in ≈ 8 h.
- **Saves**: XP is kept and levels are re-worked out from it, so levels only go up (e.g. old 90 → 153, old 163 → 277). A one-time note explains it. Monsters outside Pocketvale were scaled to the new town bands (×75/90) and re-simulated: same feel as before. Rune elements and gear requirements follow the new tier levels.
- Save version 13.
- Alternative spacing considered: front-loaded — built next in v0.0.1.6.

### Phase 8.1 — built (the Heartland & the Frontier) · v0.0.1.6
- **Front-loaded towns**: 1, 50, 110, 175, 245, 320, 400, 485, 570, 660, 750. **The Heartland** (Pocketvale, Ironmoor 50, Coalhaven 110, Bluecliff 175) is a cozy cluster of neighbouring towns; **the Frontier** (Lunaria 245 onwards) is far-flung — each town an expedition, wilder and stranger the further out (longer walks there). The travel map shows both bands.
- The XP table is unchanged (nobody's levels move) — towns simply open sooner. Real pace with boosts: town 2 ≈ 50 min, town 3 ≈ 4 h, town 4 ≈ 13 h, Lunaria ≈ 37 h. Gaps between towns grow: ≈ 2.5, 9, 15, 24, 33, 46, 64, 80, 104, 127 h (no boosts). All towns ≈ 505 h, then the endgame ≈ 520 h (owner: keep the endgame long).
- Monsters re-fitted into the new town bands (same spot in their band) and re-simulated; mini bosses beatable 15 levels above them. Rune elements, gear and recipe levels follow the new tier levels. Save version 14 (one-time note).

### Phase 9 — built (Lunaria, the ghost town) · v0.0.1.7
- **Lunaria** (first Frontier town, tier 4 at level 245): a misty island reached by a 4-minute ferry crossing (fast travel 800). Every lantern went dark at once; the **townsfolk are gentle ghosts** on the shore. Unlocks Moonsilver ore/bars/gear/arrows, Moonwood, Moonfin, Cobalt tools and moonwood bows/staffs. Plays the saved foggy theme (`music_lunaria`, Ironmoor's first song). Its own scene (no day/night tint — always under its moon), with a **restored** version once solved.
- **Monsters on The Fog Streets** (things that moved in after the dark): Mist Crab (249, melee), Moonmoth (262, magic), Fog Scavenger (278, ranged), Hollow Hound (299, melee); **mini boss The Hush** (316, magic) — gem 90%, pet **Mote** 🌙. New ghost portrait. Balanced against Bluecliff.
- **🔍 The Silent Bell** (quest card on Lunaria's town screen, `src/core/lunaria.ts`): 1) arrive; 2) find Lune's 4 clues while skilling on the island (in order, ~1 in 150 actions each); 3) defeat The Hush; 4) relight the 7 Moonlanterns (each 8 Moonwood logs + 2 Moonsilver bars, Firemaking 245, +1,000 Firemaking XP); 5) ring the bell with the key from Old Galewing's nest. **Payoff**: the fog lifts, colour returns, the Silver Willow crew wakes on the quay, Lune is reunited with her brother (the Coalhaven harbourmaster); reward coins/food/bars, reward pet **Wick** 🕯️ (Firemaking, never a random drop), Lunaria's Trading Post reopens (empty until then), final tale "The Moonwake".
- Lunaria tales: The Empty Quay · Lune's Diary — The Moonwake · The Lamplighter's List · A Child's Drawing · Lune's Diary — The Last Page · What the Hush Left Behind · The Moonwake. Save version 15.

### Release 1 of the pro review — built · v0.0.1.10
- **🛟 Save backups**: Profile → Settings → "Back up your save" makes a backup code (copy, share, or download as a file) and can restore one. Every title-screen slot has "Restore from a backup code" (for after a phone wipes data). Old backups upgrade automatically.
- **Home-screen reminder** on the Town screen when the game isn't installed (iPhone: Share → Add to Home Screen; Android: an Install button) or when the last backup is over a week old. "Later" hides it for 3 days.
- **Music compressed to MP3**: sounds went from 16.4 MB to 4.3 MB; songs only download when you're in their town.

### Release 2 of the pro review — built · v0.0.1.11
- **🎒 The Satchel** (Trading Post → Upgrades; any skill 110 + 25,000 coins): anything that won't fit in the bag goes straight to the bank, so idling (and offline time) never stops for a full bag. Can be switched off from the bag. Without it, the original rule stands.
- **🎁 Rare finds** while gathering (~1 in 250 actions): 🪺 bird's nests, 🪨 geodes, 🍶 corked bottles. Open them from the bag for coins and resources from the best area you've reached, with a ~5% chance of a treasure (🥚 golden egg, 🔮 starlit crystal, 🦪 sea pearl — about 1,600 coins each). Bottles can also hold one of 5 **Messages in Bottles** (Tales page): notes that hint at Cinderpeak, Frosthold, Starfall Crater and the Primordial Rift.
- **📖 Settling In**: a 9-step starter questline for new players (copper for the bell, tin, first bronze, the inn's woodpile, shrimp for supper, cooking, a stone pickaxe, rats in the grain, and the road east at level 50). Each step has a Go button and a small reward. Saves already past the start skip it. Save version 16.

### Release 3a — built · v0.0.1.12
- **📋 Bounty Board** (Combat screen, `core/bounties.ts`): three bounties a day on regular monsters from towns you've discovered, up to ~10 levels above your best combat skill. Each pays coins (about 60% of the monster's coin drops for that many kills, plus level × 10) and a rare find (nest, geode or bottle). One free swap a day. Progress counts while idling and offline.
- **🪓 Seasoned tools**: every tool skill gets +1% speed per 2,500 actions, up to +10% (shown on the skill screen). Applies to idling and minigames and is included in time estimates. Save version 17.

### Release 3b — built · v0.0.1.13
- **🌿 Herblore** (new skill): forage one wild herb per town on location (Meadowsweet, Ironroot, Willowcap, Sea fennel, Moonpetal…; ~12% chance of a seed too), and dry herbs (2 → 1, works anywhere). Minigame **Ripe Picking**: tap herbs while they glow; 3 picks = one action, a clean set gives bonus XP (+1 herb when foraging). Pet 🐝 Bumble. No tool needed (for now).
- **🌱 Farming** (new skill): 4 garden plots (Pocketvale) that grow over real time, even while away (garlic 15 min, onion 30 min, carrot 1 h, potato 1.5 h, moon melon 2 h, …). Harvest = 3–6 crops (+ seeds back 60%) and big Farming XP; planting gives a little XP. Minigame **Garden Helpers**: tap pests/weeds that pop up on growing plots for XP and up to 25% faster growth. Seeds from foraging or each town's Trading Post. Pet 🐌 Shelly. "Crop is ready" notice while playing.
- **🍲 Cooking: Meals & Brews** tabs (fish recipes moved to a Fish tab). Meals (cooked fish + crops) = +6% speed to one skill for 30 min (Miner's pasty, Forager's salad, Woodsman's stew, Angler's chowder, Forge-hand pie, Hearth roast, Tinker's hotpot, Mystic broth). Brews (dried herbs) = +8% XP for 30 min (Meadow tea → Farming, Ironroot tonic → all combat, Willowcap brew → Cooking, Sea fennel tonic → Enhancing, Moonpetal tea → +4% all skills). Eat/drink from the bag; eating again adds time (max 2 h). Active buffs show on skill screens and count in XP/h and time estimates.
- Save version 18.

### Release 4 — built (the Cottage) · v0.0.1.14
- **🏡 Your Cottage** (Town → "Your Cottage", `core/cottage.ts`, `ui/CottageScreen.tsx`): a room in Pocketvale (window follows day/night, your pet visits) with 15 pieces of furniture across the five towns. Each is built from things your skills make (bag first, then bank), gives XP in its skill, appears in its spot in the room, and gives a small permanent perk:
  - Pocketvale: Pine bed (+1% all XP), Stone hearth (cooking fire +25% longer), Shrimp tank (+3% Fishing), Copper kettle (+3% Cooking), Herb rack (+3% Herblore), Flower box (+3% Farming).
  - Ironmoor: Oak table (+3% Crafting), Display anvil (+3% Smithing), Miner's lamp (+3% Mining).
  - Coalhaven: Willow rocking chair (+3% Woodcutting), Stargazing telescope (Lucky Stars 20% more often), Weapon rack (+3% combat).
  - Bluecliff: Maple bookcase (+3% Runecrafting), Rune mirror (+3% Enhancing).
  - Lunaria: Moonsilver chandelier (+2% all XP; needs Lunaria brought home).
- Links to your Garden (Farming). Save version 19.

### v0.0.1.15 — attack splashes
- Every attack in a fight plays a splash over the monster (`ui/AttackFx.tsx`): melee = sword slash (crit = double gold slash), ranged = an arrow flying in with an impact burst, magic = a bolt in the staff's element — air (whirling wind bolt), water (orb + droplets), earth (rock + chunks), fire (fireball + embers), nature (leaves), frost (ice shards), shadow (purple), light (gold rays). Misses get a faint grey whoosh; when a monster hits you the screen edges flash red.

### v0.0.1.16 — smithing & crafting
- **Anvil Rhythm (Smithing): every tap counts.** Three taps always finish the item; mistimed taps are "a bit rough" (grey pip, no bonus) instead of wasted. Clean taps add bonus XP; 3 perfect = masterwork (bonus item).
- **🧩 Joinery** (Crafting's second minigame, next to the Workbench): a resource-free wood-joining puzzle — tap pieces to turn them until every joint meets another (`core/joinery.ts`, always solvable). 4×4 / 5×5 / 6×6 boards give 16× / 26× / 38× the selected recipe's XP. Plays the calm café tune.

### v0.0.1.17 — sickle & trowel
- **Sickle (Herblore) and trowel (Farming)**, made in Crafting like every other tool and upgradable +1..+10. Tier N herbs (forage and dry) need a tier N sickle; tier N seeds need a tier N trowel to plant. Tier 0 needs none. Sickles speed up herb work; trowels make crops grow a little faster.
- **Town kit** (`docs/town-kit.md`): the checklist every new town is built against.

### v0.0.1.18 — Cinderpeak (town 6, level 320, Frontier)
- **The volcano village**: hot springs, the Ash Market, goats with glowing horns. Warm market music (hand drums, a plucked lute over a drone, ember crackle). Built against `docs/town-kit.md`.
- **🌋 The Mountain Stirs** (`core/cinderpeak.ts`): every 3 hours on the phone's clock (1:30, 4:30, 7:30 …) the volcano rumbles for 15 minutes. Mining Emberite in Cinderpeak gives ×2 XP and drops **ember geodes** (~1 in 40; open into emberite, fire runes, coins, sometimes a Heartfire ember — never gems). The town backdrop glows while it stirs; a chip shows on the Mining screen. Offline time uses the real time of each action, so it can't be gamed by coming back during an eruption.
- **♨️ Hot springs**: in Cinderpeak and not fighting, you heal 10× faster.
- **Monsters**: Ash Goat, Fire Salamander, Sooty Imp, Magma Tortoise; mini boss **The Kiln Wyrm** (a sleepy lava dragon) with the combat pet **Kindle** 🐉. New simple portraits (goat, lizard, tortoise, wyrm). Balance simulated: same feel as Lunaria.
- **The Traveller** (new Frontier lore thread): someone always one town ahead, heading for the Primordial Rift. Leaves a gift at Cinderpeak's well (once: coins, a Traveller's compass, ember pepper seeds, 2 ember geodes) and a card ("Left at the Well", lore trigger `gift`). Saved in `player.travellerGifts` (save v20).
- **Ember pepper** seeds in the Ash Market; **Fire-pepper chili** (+4% speed, all skills) and **Emberleaf chai** (+10% Smithing XP); Cottage pieces: Kiln-fired vase, Spice shelf, Emberite brazier.
- `npm run sounds -- <name>` now remakes just one sound file.

### v0.0.1.43 — the rest of the Frontier: every town is open
Five towns, each with its own backdrop, ~2-minute song, place names, 4 monsters + a mini boss (with a combat pet and its Pet Parade champion), loot, a treasure, a meal and a brew, 1–2 Cottage pieces, 3 rare fish, a Trading Post list, Hold the Wall / Lantern Watch colours, a vibe line and 4 lore notes (arrive, boss, find, and the Traveller's note at the well).
- **❄️ Frosthold** (level 400): snowed-in hamlet that sings to everything, even the stew. Snowdrift Hare, Frost Wisp, Snowball Bandit, Woolly Ram; mini boss **Old Rimeback** (pet 🐻‍❄️ Snowdrop). Music-box waltz with sleigh bells. Treasure 🧊 singing icicle.
- **🌌 Voidreach** (485): rope bridges over a chasm full of stars; shouts echo back a day later. Gloomburrow Mole, Echo Wisp, Ribbon Cutter, Chasm Crawler; mini boss **The Hollow Wyrm** (pet 🦇 Nib). Spacey echoing bells. Treasure 🐚 echo shell.
- **🌠 Starfall Crater** (570): farms around the fallen star, which hums; very calm cows. Crater Boar, Stardust Sprite, Comet Hawk, Starbloom Treant; mini boss **The Stargrown Elder** (pet 🌠 Nova). Folk guitar + fiddle over the star's hum. Treasure 🌟 star shard.
- **☁️ Celestine Spires** (660): towers above the clouds, fish swimming in the air. Cloud Ram, Chime Sprite, Sky Pirate, Storm Gryphon; mini boss **Aurelion, the Sky Sovereign** (pet 🕊️ Cirrus). Airy celesta and wind chimes. Treasure 🫧 cloud pearl.
- **🌀 The Primordial Rift** (750): giant ferns, the Worldtree and a humming crack in the sky. Fern Raptor, First Light, Thornback, Moss Colossus; mini boss **The First Wyrm** (pet 🦕 Pip). Frame drum, drone and wooden flute. Treasure 🦴 first fossil.
- **🎒 The Traveller's road ends**: a gift and note at every Frontier well, each pointing to the next town. At the Rift she's waiting in person: she is **Mira**, the girl who drew the bear in a flower crown in Pocketvale (Old Thornhide's shrine), who walked every road. She gives you her cloak and says the only road left is up — **the Ascension** (750 → 999, still to be designed). The Pedlar has new lines once you've met her.
- Balance: fighters at monster level + 15 in own-tier +5 gear kill about the same per hour in every town as in Cinderpeak; every mini boss can be beaten. Mini boss gem odds go up a step each town (93% → 98%).

### v0.0.1.19 — festivals & rare fish
- **🎪 Seasonal festivals** on the real calendar (`data/festivals.ts`, `core/festivals.ts`): Blossom Fair (Mar 20–Apr 15, Herblore), Midsummer Lanterns (Jun 15–Jul 10, Fishing), Harvest Festival (Oct 1–Nov 10, Farming), Winter Lights (Dec 10–Jan 6, Firemaking). While one is on: that skill gets +10% XP; every skilling action has a 1-in-60 chance of a festival token (kills 1-in-30, a garden harvest rolls 5 times); bunting over the town banner; a welcome toast + confetti once per festival each year (`player.festivalsSeen`). The **festival stall** (Town screen, any town) trades tokens: a treat (6, +5% XP to all for 30 min), a Cottage keepsake (80, +1% XP to all, forever) and a festival pet (150; Petal 🐇, Glimmer 🐞, Gourdie 🎃, Flurry ⛄). Tokens keep for next year.
- **🐟 Rare fish** (`data/rareFish.ts`): 3 per town, about 1 in 200 casts in that town's water (uncommon / rare / legendary), each with a random size. They're treasures to sell. The **Fishing Journal** (Journal → 🐟 FISH) shows how many you've caught and your biggest; toasts for a first catch or a new record. Saved in `player.fishJournal` (save v21).

### v0.0.1.20 — bag & bank quality of life
- **✋ Drag and drop** (`ui/useItemDrag.tsx`): on a phone, press and hold an item, then drag (a quick tap still opens it; a swipe still scrolls); with a mouse, just drag. Bag: swap slots, or drop on the same item to join stacks. Bank: move an item anywhere. A little pop + buzz on pick-up, a glow on the slot you're over.
- **Sorting** (`core/inventory.ts`): Bag → 🧹 Tidy (joins half stacks, 📌 kept items first, sorted by type, gaps at the end). Bank → ⇅ Sort: by type, A → Z, most first, total worth. **↶ Undo** shows for 8 seconds after a sort.
- The bank now **keeps your own order** (save v22 starts it in the old order, so nothing looks different until you sort or drag). A new kind of item lands next to items of the same kind.
- **📌 Keep in bag**: pin an item from its details; "Deposit all" leaves it in the bag (food, runes, arrows…). Pinned items show a 📌.
- Bank **filter chips** (Resources · Food & farm · Gear · Treasures) and the bank's **total worth** in coins.
- **✨ New-item dot** in the bag on things you didn't have the last time you opened it (remembered on this device only).

### v0.0.1.21 — new icon
- **App icon** for Ascension 999: a lantern-lit path winding up a mountain to a glowing summit star, "999" in gold. `public/icon-full.svg` is the master art; `icon.svg` (rounded, browser tab), `apple-touch-icon.png` (180, iPhone home screen — iPhones can't use SVG icons), `icon-192/512.png` and `icon-maskable-512.png` (Android round masks). To redraw it later, replace these files. The emblem also shows above the title screen logo.

### v0.0.1.22 — notifications & bigger stacks
- **Stacks of 999** per bag slot (was 500).
- **🔔 Notifications while the game is closed** (Settings → Notifications, per device, off by default; toggles for "Idling stops" and "Crops are ready"). When you leave the game, `core/notifySchedule.ts` simulates a copy of your save up to 24 h ahead and works out when each idle slot stops and why, when crops finish (grouped within a minute), and when 24 h of idling is used up. `core/push.ts` sends that list to the **notification server** (`push-server/`, a Cloudflare Worker + D1 database on the owner's free Cloudflare account, https://ascension-999-push.ascension-999-push.workers.dev). Every minute the server sends an empty "wake up" web push to phones with something due; `public/sw.js` fetches the text from `/inbox` and shows it. Opening the game cancels anything not yet sent. iPhone: only from the Home Screen app. The push key's private half is a Worker secret (`VAPID_PRIVATE`) and a git-ignored file `push-server/.vapid-private.json` — never commit it. Redeploy the server with `npx.cmd wrangler deploy` from `push-server/` (sign in with `npx.cmd wrangler login`, approving in the browser on the same computer).

### v0.0.1.23 — tidier skill screens
- **Recipe picker** (Smithing, Crafting, Cooking, Herblore, Runecrafting, Enhancing — every skill with tabs): the screen shows just the selected recipe as one bar (tap ⇅ to change), with the minigame and Idle button right below — no more scrolling past every town's recipes. The picker sheet groups recipes by town (where you are first), folds towns you haven't discovered into one line each (tap to peek), and has a **✅ Can make now** filter (level, town, tool and materials all OK). Each tab opens on the best recipe you can make right now (else the best one you've unlocked).

### v0.0.1.24 — Enhancing minigames (no bars needed)
Enhancing now has three minigames (tabs): **Rune Align** (the original, enhances real gear), **🃏 Spellcards** and **🎶 Runesong**. The last two need no bars or gear (so they work when everything is +10) and give **Enhancing XP + half as much Magic XP**.
- **Spellcards** (`core/spellcards.ts`, `ui/Spellcards.tsx`): a poker-roguelike of our own (owner's idea). 40 rune cards (Fire/Water/Earth/Air × 1–10), hold 8, cast up to 5 as a spell — Spark, Pair, Two Pair, Three of a Kind, Ley Line (straight), Pure Element (flush), Full House, Four of a Kind, Grand Ritual (straight flush). Score = Essence × Power. A run is **6 wards** (targets 300 / 500 / 800 / 1,300 / 2,000 / 3,200; wards 3 and 6 have a twist: Ashen, Drowned, Hasty or Still), 4 casts + 3 redraws each. Between wards **the Enchanter** sells **Charms** (17, up to 5 carried, sell for half) and **Scrolls** (Gild, Charge, Radiance, Attune, Uplift — read during a ward on picked cards; changes last the run) for **sparks** (3 per ward + 1 per cast left + interest). XP per ward scales with your Enhancing tier and how deep you are; the last ward doubles. Tuned with a bot over 1,500 runs: buying charms it clears ward 3 ~80% and all 6 ~35%; without charms it rarely passes ward 3. The run is kept on the device (you can step away mid-run).
- **Runesong** (`core/runesong.ts`, `ui/Runesong.tsx`): six singing runes play a spell; echo it back. Each echo adds a note (3–12), a wrong note fizzles and shortens the next one.

### v0.0.1.25 — Spellcards polish
- **Hold & redraw:** Redraw now keeps the cards you've picked and swaps all the others (nothing picked = a whole new hand). The kept cards stay picked so you can cast them next.
- **Tally animation:** after a cast, the cards fly up and the score adds up beat by beat — the spell's base, then each scoring card (+Essence / +Power pops, a `tick` that rises in pitch), then each charm that fires (it glows and bounces; `coin` for +Power, a magical `boom` for ×Power), then Essence × Power rolls up to the total and the ward bar fills. Breaking a ward glows gold. Tap to skip. New sounds: `card` (flick when picking/dealing), `tick`, `boom`. Cards deal in with a little animation.
- **Deep Wards:** after ward 6 you choose **Finish** or **🌀 Into the Deep Wards** — endless wards, each needing ~55% more score (5,000 / 7,700 / 11,900 / 18,500…), a twist every third (9, 12, 15…), and **15% more XP than the one before** (ward 6 doubles as before). Charms, scrolls and enchanted cards carry on. Breaking ward 6 and every Deep Ward gives confetti.

### v0.0.1.26 — Bluecliff's song
- The constant sea-wind noise drowned the music (owner). Now the ~100 s song has five separate sea moments, all softer than the harp: a long rolling swell (~6 s), a low breathy gust (~30 s), small waves lapping at the rocks (~44 s), a thin high whistle over the cliffs (~74 s) and a distant breaking wave with fizzing foam (~84 s). The bell buoy stays.
- **v0.0.1.27:** still too many waves (owner). The song is now ~3½ minutes (8 more sections of the same chords, new melody), so the same five sea moments come ~40 s apart (8 s, 48 s, 88 s, 128 s, 168 s; bell buoy at 28 / 108 / 188 s). The sea is 30% softer (`S` in the script) and the music 40% louder (`M`).

### v0.0.1.28 — Tinker's Tray, Pantry Prep fixes, Bluecliff without sea sounds
- **Bluecliff:** the owner still heard constant waves, so the sea sounds are switched off (`SEA = false` in the script; harp, melody and bell buoy stay). Sound files are now fetched with `?v=<game version>` so phones always get the new copy after an update (an old cached song was the likely reason the change didn't seem to land).
- **🧵 Tinker's Tray** (Crafting's third minigame, `core/tinkersTray.ts`, `ui/TinkersTray.tsx`): a cozy match-3 on a 7×7 workbench tray with six scraps (wood, thread, buttons, feathers, rivets, yarn). Tap a scrap then a neighbour, or swipe. Match 4 → 🔨 Mallet (clears its row/column), L or T → 🧰 Toolbox (clears around it), 5 in a row → ✨ Master's Touch (swap it to clear every scrap of that kind; two together clear the tray). Cascades chain with rising chimes. Each round is a townsperson's **order** (two scraps, 10–24 each) in 20 moves; filling it gives Crafting XP from the selected recipe (~38–48× its XP), running out of moves still pays for what you gathered (no loss). A hint glows after 7 s idle; a stuck tray reshuffles for free. Saved on the device. Bot test: a greedy bot fills ~55% of orders (avg 93% progress).
- **Pantry Prep:** ↶ Undo (one slide back; XP already earned stays, the fish still cooks only once per board), the board is saved on the device, and swiping no longer scrolls the page on iPhone (`ui/useNoScroll.ts`).

### v0.0.1.29 — Pantry Prep for long sessions (owner: "someone who will play it for an hour")
- **Two boards**, each saved separately: 🔪 4×4 Board and 🍽️ 5×5 Banquet (bot: ~220 vs ~900 moves per board, about 5 vs 20 minutes).
- **Dish ladder to 12:** 🎂 Festival Cake and 🏰 King's Banquet (only realistic on the banquet table; the 4×4 ladder shows 10).
- **Kitchen orders:** 3 tickets on a rail, each a dish near your best; making it pays bonus Cooking XP and 🪙 **Chef's Tips** (1 / 2 / 3 for dishes below 7 / 7–8 / 9+). Orders avoid repeats.
- **Kitchen tools** bought with tips (kept across boards): 🔪 Chop 8 (clear one ingredient), 🥄 Stir 10 (swap two), 🧂 Season 15 (raise one a step). They can rescue a full board. Tuned so a 4×4 board earns ~23 tips (2–3 tools). Tools can't be undone.
- **Score** (2^level per combine) and best score per board. Cooking remembers the last minigame tab while the app is open.

### v0.0.1.30 — The Traveller is easier to find
- `travellerWhereabouts(p)` (core/cinderpeak.ts): the first town in road order whose well gift you haven't taken (gift waiting), else the next town down the road after the last gift (they've moved on).
- **Travel card:** a dashed gold sighting line under 🗺️ TRAVEL ("The Traveller was seen in Cinderpeak — a gift waits by the well", or "has taken the road toward Frosthold"); tapping it opens the map. That town's row gets a 🎒 badge and a gold stripe.
- **In their town:** the gift is its own glowing "THE TRAVELLER WAS HERE" card near the top of the Town screen (`TravellerCard`, works for any future town in `TRAVELLER_GIFTS`), instead of the bottom of Cinderpeak's card.

### v0.0.1.31 — 🏮 Lantern Watch (survivor mode, owner's idea)
- A full-screen mode opened from the Combat screen (`ui/LanternWatch.tsx`, engine `core/lanternWatch.ts` — pure rules, testable without drawing). Night falls on the town you're in; that town's monsters (weakest first, newer kinds join every few minutes) swarm toward you. Drag anywhere for a floating joystick (WASD/arrows on a computer); attacks fire on their own.
- **A power-up every level** (owner's wish): each level-up pauses the night with 3 choices — new weapons (up to 5: 🗡️ Sword Sweep, 🏹 Arrow Volley, ✨ Spark Bolt, 🔥 Ember Ring, 🏮 Lantern Glow, ⚡ Storm Rune, 🐾 Loyal Companion (your active pet's emoji), ❄️ Frost Nova, 🪓 Tumbling Hatchet), weapon levels (max 5) or passives (up to 5: boots, stew, tonic, quick hands, magpie charm, shield, wide swing, herbs, clover). Your real weapon picks your starting weapon. A full night reaches level ~40.
- Every 90 s a big monster carries a 🎁 lantern chest (a free pick); every 2 min a ring of monsters closes in; rare 🍗 meals and 🧲 magnets. At 10:00 the town's mini boss arrives as the dawn beast; beating it wins.
- **Rewards** (`game.lanternWatchEnd`): combat XP for your style (+⅓ Health, +¼ Defense) paced on your tier (`nightXp`: time held ×1.4, + kills, ×1.5 for a win), coins, one roll of the town's monster loot per 40 kills (max 12, +3 for a win) — all through the loot system, never gems — and the reward pet **🦋 Lumen** on your first dawn. Knocked out or "Head home" still pays for the time held; so does leaving the screen.
- Balance (bot that kites and picks at random, ~8 nights per style): wins ~60–70% of nights, ~40–50 levels when it wins. Small head start from your real Health level (max HP) and style level (damage, max +25%).
- Drawing: emoji pre-rendered into sprite canvases, a dark radial "lantern light" overlay that flickers, dawn tint near 10:00. Sounds throttled so swarms never get noisy. Switching apps pauses.

### v0.0.1.32 — Sort the Catch, Mahjong-Blast style (owner's design)
- Rules in `core/sortCatch.ts` (the old `core/mahjong.ts` pairs game is no longer used). 36 tiles in 3 layers (6×4, 4×2, 2×2), 9 fish per board, built so every tile can be cleared in threes.
- Most tiles start **face-down** (top layer + ~1 in 5 others face-up). Tap a free face-down tile to flip it, then flip another: a **match** drops both into the basket; otherwise both **flip back** after ~0.85 s. A lone flipped tile can be tapped again to take it; face-up tiles go straight in.
- **Basket of 7**: three of a fish clear for 1.5× the recipe's Fishing XP; 7 with no three = **bust** (round over, XP kept). Clearing the whole board gives the old bonus (×2 XP + 2 bonus rolls).
- New sounds: `clack` (crisp tile flip) and `thud` (tile landing in the basket). Bot test: a perfect-memory player clears ~65% of boards; random tapping ~2%.
- Fishing remembers the last minigame tab while the app is open.

### The Ascension — design (agreed with the owner, 2026-10-29 · all 5 parts built in v0.0.1.44–49)
Everything past level 750 is called **the Ascension**. Story: Mira hands you "the road up" at the Rift; the Ascension is the sky above it, and **✨ Starlight** is bits of it drifting down.

**Core loop (owner's wish): chasing randomly rolled god loot, as a collection — hybrid of grinding and crafting.**
- **Ascended items drop** from any action or kill while that skill is 750+ (combat: any combat skill 750+). The chance is **per minute of work, not per action**, so slow and fast actions (and every town) are equally good.
- **Every slot can be Ascended** (owner's choice: all): the 5 armour slots and all 9 tools. A gathering/crafting action drops that skill's tool (or rarely armour); combat drops armour/weapons.
- **Random bonuses:** each item rolls 2–4 bonuses from its slot's pool (e.g. +% skill speed, double resource chance, +% XP, rare finds ×, rare fish chance, food heals more, +damage vs bosses, coins ×). Each bonus rolls a number inside a range.
- **Grades** from how well the bonuses rolled: **Fine → Blessed → Divine → ✨ Godforged** (every bonus at or near its max, plus a gold glow).
- **Level raises the ceiling:** a skill near 750 can reach Blessed; Divine opens around 850; **Godforged needs ~950+** (the climb to 999 is what makes the jackpot possible).
- **Target rarity (owner's choice): about one Godforged every ~2 weeks** of steady play once your levels allow it (drops + crafting together). Tune with a bot test like the Pedlar's.
- **✨ Starlight dust = the safety net (crafting):** earned slowly from all 750+ play and by **breaking down** unwanted Ascended items. Spend it to:
  - **Craft** a fresh Ascended item for a slot you choose (bonuses still random).
  - **Reforge** one bonus (rerolls that line only).
  - **Lock** a bonus so a reforge can't touch it (costs more).
  No bad-luck hour is ever wasted. Starlight can't be bought with coins and isn't sold by NPCs (no paying to skip).

**Getting to 750 stays worth it (owner: "not make getting there useless"):**
- **Every town has its own bonus family.** Some bonuses only roll on items found or crafted *in that town* (e.g. a Frosthold "hearthwarm" healing bonus, a Bluecliff tide bonus on rods). A best-in-slot piece means visiting the right town — the Heartland stays worth walking to.
- **Relics ascend:** each of the 11 Relics can be raised once more into an Ascended form with a fixed, unique power.
- **Ascension bosses:** 3–4 big endgame bosses beyond the Rift (the owner's earlier wish: "big bosses to chase"), the only source of the best gems and better Godforged odds. Gems still ONLY from bosses.
- **Mastery perks** stay a small side reward (the owner prefers goals to chase over passive bonuses).

**Collection, not achievements:** no checklists or "collect all" counters (owner isn't a completionist). A **🏛️ Hall of the Ascended** in the Cottage shows off your best pieces.

**Part 1 — built in v0.0.1.44:** `data/ascended.ts` (bases, bonus pools, grades, id format `asc.<base>.<grade>.<town>.<bonuses>`), `core/ascension.ts` (per-minute drops via `giveLoot` with overflow to the bank, `ascBonus`), items resolved on demand in `ITEMS` (a Proxy). One drop per ~3 h of 750+ work per idle slot. Grade odds: Blessed 25%, Divine 5% (850+), Godforged 1 in 250 (950+) → bot test: a heavy idler (3 slots × 16 h/day) gets ~200 drops and ~1 Godforged in 2 weeks. Bonuses: speed, double result, skill XP, rare finds, all-XP (tools); attack, mini-boss damage, coins, combat XP, all-XP (weapons); defense, HP, food heals, coins, combat XP, all-XP (armour). Ascended staffs cast with any rune. Not upgradable, not sold at the Trading Post (break them down instead).

**Part 2 — built in v0.0.1.45 (the ✨ Starforge, Gear screen):** Starlight is a purse like coins (`player.starlight`, item id `starlight` routed by `giveLoot`). Income: 10 per hour of 750+ work per idle slot, plus breaking down (Fine 10 · Blessed 30 · Divine 120 · Godforged 500; "Break down all Fine" skips 📌 kept items). Craft: 400 for any slot (grade rolled like a drop, capped by that skill's level). **Reforge = reroll every unlocked bonus** (which one + how strong, grade stays); cost Fine 40 · Blessed 80 · Divine 200 · Godforged 500, ×2 per locked bonus, at least one unlocked; works in the bag or on worn gear (in place), not in the bank. Rules in `core/starforge.ts`, UI in `ui/Starforge.tsx` (StarforgeCard + ReforgePanel, also in the Gear slot picker). Bot test (2 weeks at 960): heavy idler ~1 Godforged (drops + ~25 crafts), 8 h/day ~0.6.

**Part 3 — built in v0.0.1.47 (🗺️ town bonuses):** each town has one bonus that only rolls on Ascended items found (drop town = the action's/monster's region) or crafted (Starforge, your location) there. It joins that item's bonus pool when it fits the base, so reforging can roll it too; old items keep working. **Each town bonus counts once** (wearing two gives only the stronger) so they never pile up. 🏡 Pocketvale Homespun +5–15% XP in skills under 750 · ⚒️ Ironmoor Forge-thrift 3–10% no materials (hammer, knife, tinderbox, skillet, sickle) · ⚓ Coalhaven Bargeman's +5–15% sell coins · 🌊 Bluecliff Tidewise 30–90% extra rare-fish bite (rods) · 🏮 Lunaria Lantern-lit +10–40% Lucky Stars · 🌋 Cinderpeak Molten +3–10% damage (weapons) · ❄️ Frosthold Hearthwarm heal 20–60% faster (armour) · 🕳️ Voidreach Echoing +1–6 h time away · 🌠 Starfall Starcaught +10–25% Starlight from work · ☁️ Celestine Cloudfarer +10–40% pet chance · 🌳 Rift Primordial +5–15% Ascended finds. Roughly 1 in 3 to 1 in 2 items from a town carry its bonus.

**Part 4 — built in v0.0.1.48 (🌌 the Road Up):** four Ascension bosses above the Primordial Rift (Combat screen at the Rift, `ui/RoadUp.tsx`, `ASCENSION_BOSSES` in data/monsters.ts — kept out of `MONSTERS` so bounties, Lantern Watch and Hold the Wall don't use them): 🗿 the Skyward Warden (Lv 780, Melee), ☄️ Cometail (850, Ranged), 🏮 the Lantern Leviathan (920, Magic), ⭐ the Unlit Star (990, style changes every day). Open when any combat skill is 750; fought by hand (pause while away); **each beaten once a day, back at midnight**. Stats from one formula (hp 10×Lv +500 per step, attack Lv+197, defense Lv+76, max hit 0.27×Lv): bot test at the boss's own level with Blessed/Divine gear: 2–5 min, 0–15 food depending on style match; 25 levels below with the wrong style is a loss. Rewards (loot tables `boss_*`, source 'boss'): coins, Starlight (40–80 → 120–200), 2 gems (Unlit Star 3) with much better rarities, incl. the new **🌌 Starborn** rarity (14–20, only from these bosses; Warden 0.04 per kill → Unlit Star 0.3), plus **one Ascended item for any slot** with better grade odds (`ASC_BOSS_ODDS`: Godforged 1/400 → 1/120, still capped by level) — all four daily adds ≈ 0.27 Godforged per 2 weeks. Loot overflows to the bank. The Unlit Star can drop the pet ⭐ **Wishling** (1 in 20, Pet Parade champion `c_wishling`).

**Part 5 — built in v0.0.1.49:**
- **🌟 Ascended Relics:** any Relic you own (any town strength) can be ascended once at the Starforge for 2,500 ✨ (needs that Relic's skill at 750). It changes in place (worn/bag/bank) into `relic_<key>_11` (stats ≈ the Rift form ×1.6, needs 750) with a stronger fixed power (`ascTrait` in data/relics.ts, numbers in `RELIC_ASC`, checked with `relicAsc`): axe/pick/skillet 25% double (+ nests/geodes twice as often; skillet: logs keep the fire twice as long), rod rare fish ×3 + bottles twice as often, hammer 20% thrift + 10% second bar, blade +8%/swing up to +100%, bow 85% arrows back + 5% hit, staff any rune + 60% runes kept, shield wards the first blow and every 5th after, crown +8% XP, coat +25% coins and crates 20% cheaper. The Pedlar never replaces an Ascended Relic.
- **🏛️ Hall of the Ascended** (Cottage, `ui/Hall.tsx`): automatically shows your best Ascended piece of each kind (grade, then how well it rolled), your Ascended Relics and Starborn gems. Only what you have — no empty slots, no counters.
- **✦ Mastery perks** (`core/mastery.ts`, shown on a skill's screen once it's 750+, toast on reaching them): Adept (800) +5% Starlight from that skill · Expert (900) +5% Ascended finds from it · Master (999) +1% XP in every skill per mastered skill.

**Build order (suggested):** 1) Ascended items + bonus rolls + grades + drops (per-minute) for tools and armour; 2) Starlight: break down, craft, reforge, lock; 3) town bonus families; 4) Ascension bosses + gems; 5) Ascended Relics, Hall of the Ascended, mastery perks. Bot-test Godforged ≈ every 2 weeks after parts 1–2.

### Owner's notes for later
- **NEXT: build the Ascension (750 → 999)** — design agreed with the owner on 2026-10-29, see "The Ascension — design" above. Build it in the parts listed there, one at a time.
- **Lunaria = the ghost town** (region 5, two towns after Coalhaven): investigate what happened — the Silver Willow, the dark lights, the bell that rings with no one there. Lore threads from Ironmoor and Coalhaven lead here.
- **Every town needs its own vibe, theme, background music and lore** — a reason to love each town.
- **Fishing journal**: only worth doing if there are *many different random fish* to catch (rare/odd catches), not just one fish per tier — otherwise your level already shows them all.
- **No achievements** — the owner isn't a completionist.
- **Loot Belt** was an idea for *more incentives to use the skills* that make the game more fun and efficient — keep looking for features like that (skills feeding each other).
- Goal: build all 11 towns.

### Phase 4 — ideas for next
Ironmoor region, weekly boss with "Defeated" screen, NPC Trading Post and shops (coin sinks), more idle slots, Loot Belt (Enhancing 60).

### Later phases — not built
Everything else above.

## 👪 Family → 🏰 Guild (agreed with the owner, 2026-10-30; all 3 parts built in v0.0.1.55–57)

**Renamed "Guild" for players (owner, v0.0.1.56).** The code and saves still say "family".

**Why:** the game is a great companion game, but at home the owner and his family drift to other games.
Playing *together* is the strongest pull (owner: WoW, party games with family; brother: Path of Exile 2;
wife: a mahjong game). Family keeps it cozy: no strangers, no chat moderation, no passwords.

**Owner's choices:** join by **invite link** · first version has a **family board, weekly family goal,
gifts (any items and coins) and cheers & nudges** · a **small family XP bonus**.

**How joining works**
- Profile → **Family** tab → "Start a family" (pick a name, e.g. "The Oak Family"). The game makes a
  long random family id and an **invite link** (`…/ascension-999/?family=<id>`), shared with the phone's
  share sheet (text message, WhatsApp…).
- Opening the link opens the game; after picking a save slot it asks "Join The Oak Family?".
- Membership is **per save slot** (each slot is its own adventurer). Each member gets a secret token kept
  in the save; the server checks it on every write. Leaving is one tap; up to 8 members.
- No accounts: lose the save → rejoin from the link. Backup codes keep the membership.

**Family board** (Family tab)
- Everyone's avatar, name, town, total level, best skill, what they're idling and when they last played.
- A short **family feed** of big moments: a new town, every 10th level, a mini boss / Road Up boss down,
  an Ascended Divine/Godforged find, a new pet, a full Pet Parade, a rare fish. Tap a moment to 🎉 cheer it.
- The game sends a small snapshot while it's open (every few minutes and on big moments) and loads the
  board when the tab opens. Works offline: you just see the last board.

**Weekly family goal** (resets Monday)
- One goal a week from a list (chop 20,000 logs, cook 5,000 meals, defeat 2,000 monsters, win 15 Hold the
  Wall waves, catch 10 rare fish…), sized by family size and levels. Everyone's normal play counts.
- Three steps (🥉 🥈 🥇); each member claims each step's reward: coins scaled by their best skill, a rare
  find, and on 🥇 a family keepsake (a Cottage piece, once) — all through the loot system.

**Gifts** (owner: any items and coins)
- From a member's card: pick items from your bag/bank (or coins) and send. They leave your save at once
  and wait on the server; the other person gets a 🎁 on the Town screen and claims it next time they play
  (through `giveLoot`, overflow to the bank — never lost). Unclaimed gifts return after 14 days.
- Can't be sent: **gems** (gems only come from bosses — keeps that rule simple), Relics, pets, quest
  keys/lore items, Starlight. Ascended items and everything else can.
- Gifts are logged in the feed ("Brother sent you 500 Moonsilver ore").

**Cheers & nudges**
- 🎉 Cheer a moment: the other person gets a push notification ("Your wife cheered your new town!") and
  sees it in the feed.
- 👋 Nudge: "Come play!" push to a member, once a day per member. Uses the existing push system; only if
  that phone allowed notifications.

**Family bonus — 🔥 Hearth Together:** +5% XP in every skill on a day when someone *else* in your family has
also played (local day). Small, cozy, never required. (Counts with other boosts like the bonfire.)

**Server:** the existing Cloudflare Worker + D1 in `push-server/` gets new tables (families, members,
feed, cheers, gifts, goal progress) and routes. Payloads stay small; no personal data beyond the
adventurer name chosen in game.

**Build order:** Part 1 — server, join by link, family board + feed + cheers/nudges. Part 2 — weekly goal +
Hearth Together. Part 3 — gifts.

## 🧭 Expeditions — the at-home adventure (agreed with the owner, 2026-10-30)

**Why:** idling is great at work, but at home the game wasn't the one the owner reached for. Expeditions give the
idle game a purpose: **at work your skills stock the pantry, at home you go on the adventure you packed for.**

**Owner's choices:** fights where you **pick each move** (turn-based, never rushed) · **bring a guildmate's hero**
along as a helper · runs of **about 20–30 minutes** (can be paused and continued) · rewards: **boss gems & big
loot, lore & mysteries, lost recipes, rare Cottage pieces & pets**.

**Starting out** (Combat screen → 🧭 Expeditions card)
- Pick one of your discovered towns; each has its own wild place to explore (e.g. Pocketvale → the Whispering
  Woods). Its monsters, music colours and lore are that town's.
- **Pack your satchel**: 8 supply slots from bag + bank — food (heals), meals/brews (buffs for the run),
  arrows/runes for your style. Supplies are used up; nothing else can be lost.
- Optional: pick a **guildmate's hero** to come along (part 4).
- No energy, no limits: start as many as you like.

**The map** (Slay-the-Spire style): ~10 steps of branching paths, then the boss. You see the road ahead and
pick your way:
- ⚔️ **Fight** — 1–3 of the town's monsters. 💀 **Elite** — a tough one, better loot + a Boon.
- 🔥 **Camp** — rest (heal) *or* sharpen up (a small boost for the rest of the run).
- ❓ **Event** — a short scene with a choice, often a skill check using your real skill levels ("Mining 200:
  pry the vein open"). Many carry lore.
- 🧺 **Cache** — loot. ⛲ **Shrine** — a Boon for a price. 🛒 **Pedlar's cousin** — trade supplies.
- 👑 **Boss** at the end — the town's expedition boss.

**Fights (pick each move)**: you (+ helper) vs 1–3 monsters. Monsters show what they'll do next (attack,
big hit, guard…) so you can plan. Each turn: **Attack** · **Guard** (block most of the next hit, build Focus) ·
**Special** (spend Focus — Melee *Cleave* hits all, Ranged *Volley* uses arrows, Magic casts an element from
runes) · **Supply** (eat/drink something packed). Your strength comes from your real gear + combat levels;
fights last a few turns. **Boons** (pick 1 of 3 after elites, shrines and camps) shape each run.
Knocked out = you're carried home **with everything found so far**. Every tap makes a sound.

**Rewards** (all through `giveLoot`): combat XP per fight (like normal combat, a bit better per minute), the
town's monster loot, coins; **boss**: gems (bosses may drop gems), big loot, and rare finds below.
- 🏡 **Rare Cottage pieces** (one per town, from that town's expedition) and 🐾 **pets** (one per expedition boss,
  + a Pet Parade champion).
- 📜 **Lore**: expedition notes per town (the Traveller/Mira thread, Lunaria's bell, the Frontier).
- 📖 **Lost recipes**: new meals, brews and gear that your skills can then make at home (saved per save).

**Built so far:** Part 1 in v0.0.1.59 (map is 14 steps + boss so runs reach ~15–25 min). Part 2 in v0.0.1.60: 11 expedition bosses (The Whispering Oak, The Lamp-Eater, The Bog Lantern, Captain Barnacle, The Lamplighter, The Ashhorn Ram, The Yeti of the Pass, The Ribbon Heron, Starhorn, Old Nimbus, Old Tusk) — each a gem every win, a rare pet, a rare Cottage piece and a lore note. Part 3 in v0.0.1.61: 22 lost recipes (per town a stronger 1-hour meal or brew + a charm that brings a Boon on expeditions), taught by the boss (50%) or a cache (10%). Part 4 in v0.0.1.62: a guildmate's hero can come along (strikes your target every turn at a modest share of its strength; a thank-you gift goes to them, up to 3 a day). All four parts are built.

**Build order:** Part 1 — the expedition itself: map, turn-based fights, camps/events/caches/shrines, supplies,
Boons, XP + loot, knock-out home, pause & continue, one area per town using its monsters. Part 2 — expedition
bosses with gems, pets, Cottage pieces and lore. Part 3 — lost recipes. Part 4 — guildmate heroes (built from
their real gear/levels on the guild board; they get a small thank-you reward through the loot system).
