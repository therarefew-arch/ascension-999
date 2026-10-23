# Pocketvale — rules for every session

Pocketvale is a cozy medieval idle skilling RPG, built as a mobile-first (portrait) web game.
The owner has no coding experience: explain things simply and ask when something is unclear.
Full game vision: `docs/design.md`. Build only the phase that is asked for.

## Permanent rules (from the owner — never break these)

- Single-player for now, but keep **player data**, **market**, and **loot** logic separate so multiplayer can be added later.
- **All loot goes through one central loot system** (`src/core/loot.ts`). Never add items to a player any other way.
- **Gems can ONLY drop from bosses and mini bosses.** The loot system enforces this; never weaken that check.
- **All skills cap at level 500**, with **resource tiers every 50 levels**.
- **No energy limits and no paying to skip the grind.**
- **Cozy medieval fantasy style; clean, uncluttered UI.**
- **Never remove or change existing features unless the owner asks.**
- **After each change, summarize what you did in plain English.**

## Decisions already made (Phase 1)

- Inventory full while idling → idling **stops** (owner's choice). The offline summary must say when and why it stopped.
- Offline progress counts up to **24 hours** away.
- XP curve target: roughly **800–1,000 hours** per skill to reach 500 once all tiers exist (see `src/core/xp.ts`).
- Iron bars use **iron ore only** for now; coal arrives with the Coalhaven region.
- Smithing uses materials from the **inventory** (not the bank).
- **Every skill gets a fun, optional minigame.** The game is cozy and laid back: misses never cost anything, idling never needs the minigame. Rules live in `src/core/minigames.ts`.
- **Crafting makes every skill's tool** (pickaxe, axe, rod, hammer, knife, tinderbox, skillet) — Smithing does NOT make pickaxes. Tools gate higher-tier resources (tier N tool for tier N resources; tier 0 needs none). Each tool tier is made from the previous tier's materials (no dead ends).
- Upgrades +1..+10: Crafting upgrades tools (always succeeds, works on the equipped tool in place). Enhancing upgrades weapons/armour; failure only uses bars, **never destroys the item**. Minigame bonus copies are never given for crafted tools or upgrades.
- Cooking needs a fire fed with logs (stoking gives Firemaking XP; flame colour per log). Cooked food is stored for future combat; "Great" food comes only from the Cooking minigame.
- Woodcutting minigame stays simple: tap 5 times for a log. Fishing has Reel It In and Tile Match (mahjong, always solvable).
- Combat (see docs/design.md Phase 3): weapon sets style; bows need arrows and staffs need runes (from the bag). Fights use the idle slot and run offline, except mini bosses (by hand only, respawn timer). Being knocked out or retreating never loses items. Gems: only from mini bosses/bosses; one socket per weapon/armour slot, gem stays in the slot; reroll costs coins. Coins go to `player.coins` via the loot system.
- Runes belong to **Runecrafting** (not Crafting): rune essence (Mining) + an element talisman in the bag (never used up). Crafting makes blank staffs; Runecrafting makes elemental staffs from a blank staff + runes. Staffs cast only with their own element's runes.
- Town is opened from the "Pocketvale" chip in the top bar (bottom nav: Skills, Combat, Bag, Bank, Gear).
- When testing in the browser pane, only run scripts on `localhost` — never on the live site (it holds real saves).
- Combat skills (Melee, Ranged, Magic, Defense, Health) are the next update.
- **3 save slots** with a title screen. Big Bag button stays centred in the bottom nav.
- Visual style follows the "Visual style guide" in `docs/design.md` (dark, gold/orange glow, monospace numbers, pixel-art backdrops).

## How the code is organised

- `src/data/` — static game data (items, skills/actions, loot tables). No player state here.
- `src/core/` — game rules as plain functions: XP, loot, inventory/bank, idle/offline, save/load, store.
- `src/market/` — reserved for the NPC Trading Post (not built yet). Keep it separate from player data.
- `src/audio/` — sound system. Files live in `public/assets/sounds/`. A real `.mp3`/`.ogg` with the same name as a placeholder `.wav` replaces it automatically.
- `src/ui/` — React screens and components. UI reads state from the store and calls actions; it never changes player data directly.
- Player save data has a `version` number. When the save shape changes, add a migration in `src/core/save.ts` — never break old saves.

## Working habits

- Tech: React + TypeScript + Vite. Run with `npm run dev`; check with `npm run build`.
- Layout must respect phone safe areas (`env(safe-area-inset-*)`) and work down to 320px wide.
- Make a Git commit after each finished change, with a clear message.
- Pushing to `main` on GitHub auto-deploys to GitHub Pages (`.github/workflows/deploy.yml`).
