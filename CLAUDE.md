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
