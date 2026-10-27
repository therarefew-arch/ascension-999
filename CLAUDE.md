# Ascension 999 — rules for every session

Ascension 999 (formerly "Pocketvale"; Pocketvale is now just the starting town) is a cozy medieval idle skilling RPG, built as a mobile-first (portrait) web game. Save keys in localStorage still start with `pocketvale.` — never rename them (it would lose saves).
The owner has no coding experience: explain things simply and ask when something is unclear.
Full game vision: `docs/design.md`. Build only the phase that is asked for.

## Permanent rules (from the owner — never break these)

- Single-player for now, but keep **player data**, **market**, and **loot** logic separate so multiplayer can be added later.
- **All loot goes through one central loot system** (`src/core/loot.ts`). Never add items to a player any other way.
- **Gems can ONLY drop from bosses and mini bosses.** The loot system enforces this; never weaken that check.
- **All skills cap at level 999**, with **front-loaded resource and region tiers: 1, 50, 110, 175, 245, 320, 400, 485, 570, 660, 750** — one tier per region (`TIER_LEVELS` in `src/data/tiers.ts`). The first 4 towns are **the Heartland** (cozy, close together, short walks); the rest are **the Frontier** (far-flung expeditions — longer walks, wilder and stranger the further out). **Every town is open by 750; 750 → 999 is the endgame** (the Ascension: mastery perks, Ascended crafting, endgame bosses — to be designed). Tiers of regions that aren't built yet are locked (`OPEN_REGIONS`). (Owner's choices: every-90 → every-75 in v0.0.1.5 → front-loaded in v0.0.1.6.)
- **Pacing** (`src/core/xp.ts`): the XP table is paced against every-75 tiers and must not change below 750 (that keeps everyone's levels where they are); towns opening earlier make the real pace: town 2 ≈ 2.5 h, town 3 ≈ 12 h, town 4 ≈ 27 h, all towns ≈ 505 h (one skill, no boosts), then **endgame 750 → 999 ≈ 520 h — the owner wants it a little LONGER than the journey**. Boosts (`src/core/boosts.ts`): 🌱 ×3 below 90 fading to ×1 at 180; 🧭 catch-up +10% per 10 levels behind your highest skill (max +100%); combined max ×4. Early levels never cost more than the old curve, so levels never drop.
- **No energy limits and no paying to skip the grind.**
- **Cozy medieval fantasy style; clean, uncluttered UI.**
- **Never remove or change existing features unless the owner asks.**
- **After each change, summarize what you did in plain English.**

## Decisions already made (Phase 1)

- Inventory full while idling → idling **stops** (owner's choice). The offline summary must say when and why it stopped. **Exception (v0.0.1.11): the 🎒 Satchel** (Trading Post → Upgrades, needs any skill 110 + 25,000 coins, can be toggled) sends whatever doesn't fit to the bank instead (`satchelOn` in `core/loot.ts`).
- **Rare finds** while gathering (~1 in 250 actions, `find_*` loot tables): 🪺 bird's nest (Woodcutting), 🪨 geode (Mining), 🍶 corked bottle (Fishing). Opened from the bag (`core/finds.ts`) for coins/resources of your best reached area + a small chance of a treasure (golden egg, starlit crystal, sea pearl — sell high). Never gems. Bottles can hold the 5 "Messages in Bottles" tales (hints of Frontier towns).
- **Bounty Board** (`core/bounties.ts`, Combat screen): 3 daily monster bounties + 1 free swap; reward coins + a rare find. **Seasoned tools** (`seasonedPercent` in `core/idle.ts`): +1% speed per 2,500 actions per tool skill, max +10%.
- **Herblore** (forage herbs on location + dry them; `HERBS` in tiers.ts; minigame Ripe Picking in `ui/HerbloreGame.tsx`) and **Farming** (4 real-time garden plots, `core/farming.ts`, `ui/FarmScreen.tsx`, minigame Garden Helpers; `CROPS` in tiers.ts) are skills since v0.0.1.13. Brewing lives in **Cooking** (Meals & Brews tabs, `MEALS` in items.ts) — owner's choice. Buffs: `core/buffs.ts` (speed for meals, XP for brews, 30 min, max 2 h). Herblore uses a crafted **sickle**, Farming a **trowel** (v0.0.1.17; tier N herbs/seeds need a tier N tool).
- **The Cottage** (`core/cottage.ts`): furniture built from every skill's materials (bag then bank), each a small permanent perk (XP %, fire length, Lucky Star rate). When a new town is built, give it 1–3 Cottage pieces.
- **"Settling In"** (`core/tutorial.ts`): 9-step starter questline on the Town screen for new players (skipped for saves already past the start).
- Offline progress counts up to **24 hours** away.
- XP curve: see **Pacing** above (the old "800–1,000 hours to 500" target is replaced).
- Iron bars use **iron ore only** for now; coal arrives with the Coalhaven region.
- Smithing uses materials from the **inventory** (not the bank).
- **Every skill gets a fun, optional minigame.** The game is cozy and laid back: misses never cost anything, idling never needs the minigame. Rules live in `src/core/minigames.ts`.
- **Crafting makes every skill's tool** (pickaxe, axe, rod, hammer, knife, tinderbox, skillet) — Smithing does NOT make pickaxes. Tools gate higher-tier resources (tier N tool for tier N resources; tier 0 needs none). Each tool tier is made from the previous tier's materials (no dead ends).
- Upgrades +1..+10: Crafting upgrades tools (always succeeds, works on the equipped tool in place). Enhancing upgrades weapons/armour; failure only uses bars, **never destroys the item**. Minigame bonus copies are never given for crafted tools or upgrades.
- Cooking needs a fire fed with logs (stoking gives Firemaking XP; flame colour per log). Cooked food is stored for future combat; "Great" food comes only from the Cooking minigame.
- Woodcutting minigame stays simple: tap 5 times for a log. Fishing has Reel It In and Tile Match (mahjong, always solvable).
- Combat (see docs/design.md Phase 3): weapon sets style; bows need arrows and staffs need runes (from the bag). Fights use the idle slot and run offline, except mini bosses (by hand only, respawn timer). Being knocked out or retreating never loses items. Gems: only from mini bosses/bosses; one socket per weapon/armour slot, gem stays in the slot; reroll costs coins. Coins go to `player.coins` via the loot system.
- Runes belong to **Runecrafting** (not Crafting): rune essence (Mining) + an element talisman in the bag (never used up). Crafting makes blank staffs; Runecrafting makes elemental staffs from a blank staff + runes. Staffs cast only with their own element's runes.
- Idle: `player.slots` (3 entries, `unlockedSlots` usable). Use `runningSlots`/`slotOf`/`chooseSlot` from core/idle — never assume a single idle. Only one fight slot at a time.
- Economy lives in `src/market/` (Trading Post, rotating shop, unlock costs). Gems are never sold by NPCs. Coins are in-game only — no real-money purchases ever.
- Tiered items/recipes are generated from `src/data/tiers.ts` (METALS, WOODS, FISH). Keep tier-0/1 ids and numbers stable. When a region is built, add it to `OPEN_REGIONS`.
- Regions: built regions are in `OPEN_REGIONS` + `REGION_INFO` (tiers.ts). A player must **discover** (walk to) a region to use its tier; gathering (`LOCAL_SKILLS`) and fights must be started in that region; idle slots keep running after travelling. Monsters have a `region`. To add a region: add it to OPEN_REGIONS/REGION_INFO, give it monsters + a mini boss (with a `pet`), a scene, local place names + training area (`data/places.ts`), a Trading Post buy list, **its own vibe + 3 lore notes** (`data/lore.ts`: arrive / boss / find) and **its own music theme** (`musicFor` in soundList + the generator script). Simulate combat balance against the previous town (fighter = monster level + 15, own-tier gear).
- **Build every new town against `docs/town-kit.md`** (the checklist).
- **Every town must have its own vibe, theme, background music and lore** (owner's wish). Lunaria (region 5) is planned as a **ghost town** to investigate — keep the lore thread consistent: the barge Silver Willow, the lights going out all at once, the bell that rings with no one there, the LUNARIA BELL TOWER key (from Galewing's nest) and the silver-ink note "we are not gone… please do not ring the bell. — L." The owner is not a completionist: **no achievements**.
- The top-right button is **Profile** (Character with avatar + gear, Stats, Pets, Settings).
- Minigame names must fit the world and their skill (no "Tile Match"-style names): Fishing has **Sort the Catch** (mahjong rules, its own lofi track `music_mahjong`, `tile` thud and `match` sound); Cooking has **Pantry Prep** (2048-style, `music_kitchen`). Crafting has **Joinery** (rotate-the-pieces puzzle, XP only) and **Tinker's Tray** (match-3 with crafting scraps and customer orders, `core/tinkersTray.ts`, XP only). Board games that swipe use `useNoScroll` (iPhone ignores `touch-action`); Pantry Prep and Tinker's Tray save their board per save slot on the device (`ui.pantry.<slot>`, `ui.tray.<slot>`), Pantry Prep has a 1-step undo. Enhancing has **Spellcards** (poker-roguelike, 6 wards then optional endless Deep Wards, redraw keeps the picked cards, step-by-step tally with `card`/`tick`/`boom` sounds, `core/spellcards.ts`) and **Runesong** (memory, `core/runesong.ts`) next to Rune Align — both give Enhancing + half Magic XP with no bars. Smithing's Anvil Rhythm: every tap counts (owner's wish — never make timing minigames block progress).
- `music_lunaria` (the first Ironmoor song) is Lunaria's theme — the owner said it suits a foggy sea-cliff/harbour town.
- Lunaria's mystery ("The Silent Bell", `src/core/lunaria.ts`) is solved per save (`player.lunaria`). Its market is empty until solved (`buyListFor(where, player)`). Reward pets have `odds: 0` and are given with `grantPet` — never rolled.
- **Notifications** (v0.0.1.22): `core/notifySchedule.ts` (predicts idle stops + crops from a copy of the save), `core/push.ts` + `public/sw.js` (web push), server in `push-server/` (Cloudflare Worker + D1, cron every minute, payload-less pushes + `/inbox`). Never commit `push-server/.vapid-private.json`. Opening the game cancels pending notes.
- Seasonal festivals (`src/data/festivals.ts`, `src/core/festivals.ts`) follow the phone's real calendar; tokens/treats go through loot tables, festival pets are reward pets (odds 0), keepsakes are Cottage pieces with `festival` set (`FESTIVAL_FURNITURE`). Rare fish (`src/data/rareFish.ts`) roll per fishing action in that water and are recorded in `player.fishJournal`.
- Cinderpeak (`src/core/cinderpeak.ts`): "The Mountain Stirs" runs on the phone's clock (every 3h from 1:30, 15 min) — pass the action's own time (`completeAction(..., { at })`) so offline catch-up can't be gamed. Hot springs = faster healing there. **The Traveller** is the Frontier lore thread: always one town ahead, one gift per town's well (`TRAVELLER_GIFTS` + a `gift` lore note), met at the Primordial Rift.
- Town is opened from the location chip in the top bar (bottom nav: Skills, Combat, Bag, Bank, Gear).
- **Efficiency: no duplicate buttons.** Every screen should only show things you can't already reach in one tap. Town = daily gift + requests (tap a request to go there), Trading Post, Journal, Travel. Skills live only in the Skills tab; local place names show on each skill screen (`src/data/places.ts`).
- Cozy daily features live in `src/core/cozy.ts`: daily gift (streak, 7-day cycle) and 3 Town Requests a day + bonus; rewards go through `giveLoot`. Outdoor scenes follow the phone's real clock (dawn/day/dusk/night). Confetti on every 10th level, new towns and bonus claims. Vibration can be switched off in Settings. Loot is not toasted per kill (keep toasts few). Lucky Stars (cozy.ts `STAR`, spawned in store `tick`) and 🎯 skill goals (`player.goals`, `timeToLevel` in rates.ts) also live here.
- The owner likes the town music's soft swelling chords — keep that sound; it's a 2-minute song so the loop isn't noticeable.
- **Every minigame tap makes a sound** (owner's request): use `sound.play(key, { rate, volume })` for per-tap feedback and `sound.loop(key)` for held/ambient sounds. Good hits sound brighter (higher rate); misses use the soft `whoosh`. New sounds go in `soundList.ts` + the generator script.
- When testing in the browser pane, only run scripts on `localhost` — never on the live site (it holds real saves).
- Combat skills (Melee, Ranged, Magic, Defense, Health) are the next update.
- **🏮 Lantern Watch** (v0.0.1.31): survivor mode from the Combat screen — `core/lanternWatch.ts` (engine, no drawing) + `ui/LanternWatch.tsx` (canvas). **A power-up choice on every level-up** (owner's wish). Rewards only through `game.lanternWatchEnd` (combat XP, coins, the town's monster loot tables — never gems; reward pet `pet_lumen` on the first dawn).
- **3 save slots** with a title screen. Big Bag button stays centred in the bottom nav.
- Visual style follows the "Visual style guide" in `docs/design.md` (dark, gold/orange glow, monospace numbers, pixel-art backdrops).

## How the code is organised

- `src/data/` — static game data (items, skills/actions, loot tables). No player state here.
- `src/core/` — game rules as plain functions: XP, loot, inventory/bank, idle/offline, save/load, store.
- `src/market/` — reserved for the NPC Trading Post (not built yet). Keep it separate from player data.
- `src/audio/` — sound system. Files live in `public/assets/sounds/`. A real `.mp3`/`.ogg` with the same name as a placeholder `.wav` replaces it automatically.
- `src/ui/` — React screens and components. UI reads state from the store and calls actions; it never changes player data directly.
- **Save safety**: backup codes (`exportSave`/`importSave` in `src/core/save.ts`, "A999z:" + gzip + base64) — made in Profile → Settings, restorable there or from any title-screen slot. A gentle Town reminder asks to add the game to the Home Screen (iPhone Safari can wipe site data after ~7 days otherwise) or to make a backup when the last one is over 7 days old.
- **Audio**: songs are generated as compressed `.mp3` (via `@breezystack/lamejs` in `scripts/make-placeholder-sounds.mjs`, dev-only); short effects stay `.wav`. Songs must start and end in silence so MP3 padding never clicks at the loop.
- Player save data has a `version` number. When the save shape changes, add a migration in `src/core/save.ts` — never break old saves.

## Working habits

- Tech: React + TypeScript + Vite. Run with `npm run dev`; check with `npm run build`.
- Layout must respect phone safe areas (`env(safe-area-inset-*)`) and work down to 320px wide.
- Make a Git commit after each finished change, with a clear message.
- **Bump the game version with every update that goes live** (`src/version.ts`: last number +1, e.g. v0.0.1.3 → v0.0.1.4) and update `VERSION_NOTE`. It shows on the title screen and in Settings. Mention the new version in the summary.
- Pushing to `main` on GitHub auto-deploys to GitHub Pages (`.github/workflows/deploy.yml`). Repo: `therarefew-arch/ascension-999`; live game: https://therarefew-arch.github.io/ascension-999/ (renamed from `pocketvale` on 2026-10-24; saves live in the browser per site, so they carried over).
