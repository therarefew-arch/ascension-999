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
| Mining | **Strike Vein** — tap when the marker is in the gold zone; perfect hits and 5-hit combos give bonus ore | Built |
| Smithing | **Anvil Rhythm** — tap as the glowing ring lands on the anvil; 3 hits finish an item; all-perfect = masterwork bonus | Built |
| Woodcutting | e.g. swing timing / chop rhythm | Later |
| Firemaking | Stick shaving, kindling meter (Immersive XP mode); Wildfire Piano Tiles boss | Later |
| Fishing | e.g. reel tension | Later |
| Cooking | e.g. heat precision ("sear in the golden zone"), stoke the fire | Later |
| Crafting, Enhancing | To be designed | Later |

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

### Later phases — not built
Everything else above.
