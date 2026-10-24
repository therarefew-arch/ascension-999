# Pocketvale — Game Design

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

### Phase 4 — ideas for next
Ironmoor region, weekly boss with "Defeated" screen, NPC Trading Post and shops (coin sinks), more idle slots, Loot Belt (Enhancing 60).

### Later phases — not built
Everything else above.
