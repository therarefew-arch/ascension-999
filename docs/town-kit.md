# Town kit — the checklist every new town is built against

So no town feels thinner than the others. Tick every box before publishing a town.

## World & feel
- [ ] **Vibe line** (`TOWN_VIBE` in `src/data/lore.ts`) — one sentence that makes you want to visit.
- [ ] **Blurb, unlock level, walk time, fast-travel price** (`REGION_INFO` in `src/data/tiers.ts`). Heartland walks ~1.5–2.5 min; Frontier walks 4+ min and grow further out.
- [ ] Add it to **`OPEN_REGIONS`**.
- [ ] **Pixel scene** (`src/ui/PixelScene.tsx`) + its banner focus (`FOCUS`). Outdoor scenes follow day/night.
- [ ] **Music theme** (`scripts/make-placeholder-sounds.mjs` → MP3, `musicFor` in `soundList.ts`). Starts and ends in silence.
- [ ] **Local place names** for every skill + the training area (`src/data/places.ts`).

## Story
- [ ] **3+ lore notes** (`src/data/lore.ts`): arrive, mini boss, a rare find while skilling. Keep the current Frontier thread going (see "Lore threads" below).
- [ ] Optional: a **signature event or quest** (Lunaria: the Silent Bell; Cinderpeak: the Mountain Stirs).

## Combat
- [ ] **4 monsters** written on the old 90-level scale (the re-fit in `monsters.ts` moves them into the town's band): one each of melee / magic / ranged + one tougher melee or magic.
- [ ] **Mini boss** with a gem table (rarities a step better than the previous town) and a **combat pet**.
- [ ] Monster **loot tables** using the town's tier items. Never gems outside bosses.
- [ ] A **portrait** that fits (reuse art types or add one in `MonsterArt.tsx`).
- [ ] **Simulate** balance vs the previous town (fighter = monster level + 15, own-tier gear).
- [ ] Bounties pick the town's monsters up automatically.

## Skills (most is generated from the tier tables — check it shows up)
- [ ] Ore/bar/gear, logs, fish, **herb** (`HERBS`), **crop** (`CROPS`) for the tier.
- [ ] **Trading Post buy list** (`BUY_LISTS`) incl. the town's **seed**.
- [ ] A **meal or brew** using the town's crop/herb (`MEALS` in `items.ts`).
- [ ] **1–3 Cottage pieces** made from the town's materials (`FURNITURE` in `core/cottage.ts`).
- [ ] **Rare fish** for the Fishing Journal (3–5 per town).

## Finish
- [ ] Tests: loot validation, location rules, lore triggers, save/load.
- [ ] Bump `src/version.ts`, update `docs/design.md`, publish.

## Lore threads
- Heartland → Lunaria: the Silver Willow and the Silent Bell (solved).
- Frontier (from Cinderpeak): **the Traveller** — someone walking every road to the Primordial Rift, always one town ahead of you, leaving a small gift at each town's well and a note in the Messages in Bottles ("A traveller, at the end of the world"). Each town has one of their notes; they're met at the Rift.
