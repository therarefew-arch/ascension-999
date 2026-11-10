// 🏡 Little Homestead (v0.0.2.40, Farming's second game — owner: "like stardew valley where you have your own little
// plot of land you can till, seed, water, tend, harvest, sell, continue to grow, automate" — but not a full RPG).
// Engine only; everything takes `now` so time away counts (growth is worked out when you look).
//  • A field (3×3 → 6×6). Tap a square: wild → tilled → sown (your chosen seed) → water it → ready → harvest.
//  • Crops only grow while the soil is wet: watering keeps a square wet for WET_MS. Some crops regrow.
//  • Harvests go to your basket (+ Farming XP, given by the store); sell the basket at the stall for market coins
//    (a purse just for the homestead) to buy seeds and upgrades: a bigger field, sprinklers (water their 8
//    neighbours forever), a beehive (+25% growth), a hen house (eggs to sell), a farmhand (harvests and re-sows).
export const WET_MS = 15 * 60_000;
export const EGG_MS = 10 * 60_000;
export const EGG_CAP = 6;
export const EGG_PRICE = 18;

export interface HomeCrop { id: string; emoji: string; name: string; level: number; seed: number; growMin: number; sell: number; regrow?: boolean }
export const HOME_CROPS: HomeCrop[] = [
  { id: 'lettuce', emoji: '🥬', name: 'Lettuce', level: 1, seed: 4, growMin: 3, sell: 10 },
  { id: 'carrot', emoji: '🥕', name: 'Carrot', level: 20, seed: 8, growMin: 6, sell: 22 },
  { id: 'tomato', emoji: '🍅', name: 'Tomato', level: 50, seed: 30, growMin: 10, sell: 14, regrow: true },
  { id: 'corn', emoji: '🌽', name: 'Corn', level: 110, seed: 25, growMin: 20, sell: 70 },
  { id: 'berry', emoji: '🍓', name: 'Strawberry', level: 175, seed: 90, growMin: 15, sell: 38, regrow: true },
  { id: 'pumpkin', emoji: '🎃', name: 'Pumpkin', level: 245, seed: 70, growMin: 45, sell: 230 },
  { id: 'sunflower', emoji: '🌻', name: 'Sunflower', level: 320, seed: 100, growMin: 60, sell: 330 },
];
export const CROP_MAP: Record<string, HomeCrop> = Object.fromEntries(HOME_CROPS.map((c) => [c.id, c]));

export interface Tile {
  s: 'wild' | 'tilled' | 'sown';
  crop?: string;
  /** Growth so far (ms of wet time), wet until (timestamp), when growth was last counted. */
  grown?: number;
  wetUntil?: number;
  at?: number;
  /** A sprinkler stands here (waters its neighbours; can't be planted). */
  sprinkler?: boolean;
}

export interface Homestead {
  size: number;
  tiles: Tile[];
  coins: number;
  basket: Record<string, number>;
  eggs: { since: number } | null;
  hive: boolean;
  hand: boolean;
  sprinklers: number;
  /** The farmhand's choice of seed for empty tilled squares. */
  seed: string;
  sold: number;
}

export function newHomestead(now = Date.now()): Homestead {
  const size = 3;
  return { size, tiles: Array.from({ length: size * size }, () => ({ s: 'wild' as const })), coins: 30, basket: {}, eggs: null, hive: false, hand: false, sprinklers: 0, seed: 'lettuce', sold: 0 };
  void now;
}

export const growMsOf = (c: HomeCrop) => c.growMin * 60_000;

/** Squares next to a sprinkler stay wet. */
export function sprinkled(h: Homestead, i: number): boolean {
  const x = i % h.size, y = Math.floor(i / h.size);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = x + dx, ny = y + dy;
    if ((dx || dy) && nx >= 0 && ny >= 0 && nx < h.size && ny < h.size && h.tiles[ny * h.size + nx].sprinkler) return true;
  }
  return false;
}
export const isWet = (h: Homestead, i: number, now: number) => sprinkled(h, i) || (h.tiles[i].wetUntil ?? 0) > now;
const speed = (h: Homestead) => (h.hive ? 1.25 : 1);

/** Count the growth since we last looked (only the wet time counts). */
export function catchUp(h: Homestead, now: number) {
  h.tiles.forEach((t, i) => {
    if (t.s !== 'sown' || !t.crop) return;
    const from = t.at ?? now;
    const until = sprinkled(h, i) ? now : Math.min(now, t.wetUntil ?? 0);
    if (until > from) t.grown = Math.min(growMsOf(CROP_MAP[t.crop]), (t.grown ?? 0) + (until - from) * speed(h));
    t.at = now;
  });
}
export const ready = (t: Tile) => t.s === 'sown' && !!t.crop && (t.grown ?? 0) >= growMsOf(CROP_MAP[t.crop]);

export const eggsReady = (h: Homestead, now: number) => (h.eggs ? Math.min(EGG_CAP, Math.floor((now - h.eggs.since) / EGG_MS)) : 0);

export type TapResult = 'till' | 'sow' | 'water' | 'harvest' | 'nothing' | 'poor' | 'locked';

/** The one-tap "do the obvious thing" for a square. Returns what happened (and the crop if harvested). */
export function tapTile(h: Homestead, i: number, seed: HomeCrop, farmingLevel: number, now: number): { r: TapResult; crop?: HomeCrop } {
  catchUp(h, now);
  const t = h.tiles[i];
  if (!t || t.sprinkler) return { r: 'nothing' };
  if (t.s === 'wild') { t.s = 'tilled'; return { r: 'till' }; }
  if (t.s === 'tilled') {
    if (farmingLevel < seed.level) return { r: 'locked' };
    if (h.coins < seed.seed) return { r: 'poor' };
    h.coins -= seed.seed;
    Object.assign(t, { s: 'sown', crop: seed.id, grown: 0, at: now, wetUntil: t.wetUntil ?? 0 });
    return { r: 'sow' };
  }
  if (ready(t)) return { r: 'harvest', crop: harvestTile(h, i, now) };
  if (!isWet(h, i, now)) { t.wetUntil = now + WET_MS; t.at = now; return { r: 'water' }; }
  return { r: 'nothing' };
}

/** Pick a ripe crop into the basket: regrowing crops start again, others leave the square tilled. */
export function harvestTile(h: Homestead, i: number, now: number): HomeCrop {
  const t = h.tiles[i];
  const c = CROP_MAP[t.crop!];
  h.basket[c.id] = (h.basket[c.id] ?? 0) + 1;
  if (c.regrow) { t.grown = 0; t.at = now; }
  else { t.s = 'tilled'; delete t.crop; delete t.grown; }
  return c;
}

/** 🧑‍🌾 The farmhand: harvests ripe squares and re-sows empty tilled ones with your chosen seed (paying for it). */
export function farmhand(h: Homestead, farmingLevel: number, now: number): HomeCrop[] {
  if (!h.hand) return [];
  catchUp(h, now);
  const got: HomeCrop[] = [];
  h.tiles.forEach((t, i) => {
    if (ready(t)) got.push(harvestTile(h, i, now));
    const seed = CROP_MAP[h.seed];
    if (t.s === 'tilled' && !t.sprinkler && seed && farmingLevel >= seed.level && h.coins >= seed.seed) {
      h.coins -= seed.seed;
      Object.assign(t, { s: 'sown', crop: seed.id, grown: 0, at: now });
    }
  });
  return got;
}

/** Sell everything in the basket (and the eggs) at your stall. Returns coins earned. */
export function sellBasket(h: Homestead): number {
  let coins = 0;
  for (const [id, n] of Object.entries(h.basket)) coins += (id === 'egg' ? EGG_PRICE : CROP_MAP[id]?.sell ?? 0) * n;
  h.basket = {};
  h.coins += coins;
  h.sold += coins;
  return coins;
}
export function collectEggs(h: Homestead, now: number): number {
  const n = eggsReady(h, now);
  if (!h.eggs || n <= 0) return 0;
  h.basket.egg = (h.basket.egg ?? 0) + n;
  h.eggs.since += n * EGG_MS;
  if (now - h.eggs.since > EGG_MS * EGG_CAP) h.eggs.since = now - EGG_MS * EGG_CAP;
  return n;
}

// ----- Upgrades (market coins) -----
export type Upgrade = 'field' | 'sprinkler' | 'hive' | 'hens' | 'hand';
export function upgradeCost(h: Homestead, u: Upgrade): number | null {
  switch (u) {
    case 'field': return h.size >= 6 ? null : [0, 0, 0, 300, 1200, 4000][h.size];
    case 'sprinkler': return h.sprinklers >= 4 ? null : [250, 900, 2500, 6000][h.sprinklers];
    case 'hive': return h.hive ? null : 1500;
    case 'hens': return h.eggs ? null : 600;
    case 'hand': return h.hand ? null : 8000;
  }
}
export function buyUpgrade(h: Homestead, u: Upgrade, now: number): boolean {
  const cost = upgradeCost(h, u);
  if (cost === null || h.coins < cost) return false;
  catchUp(h, now);
  h.coins -= cost;
  if (u === 'field') {
    const old = h.size, size = old + 1;
    const tiles: Tile[] = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) tiles.push(x < old && y < old ? h.tiles[y * old + x] : { s: 'wild' });
    h.size = size; h.tiles = tiles;
  }
  if (u === 'sprinkler') h.sprinklers++; // placed with placeSprinkler
  if (u === 'hive') h.hive = true;
  if (u === 'hens') h.eggs = { since: now };
  if (u === 'hand') h.hand = true;
  return true;
}
export const sprinklersPlaced = (h: Homestead) => h.tiles.filter((t) => t.sprinkler).length;
/** Put an owned sprinkler on an empty (wild or tilled) square. */
export function placeSprinkler(h: Homestead, i: number, now: number): boolean {
  const t = h.tiles[i];
  if (!t || t.sprinkler || t.s === 'sown' || sprinklersPlaced(h) >= h.sprinklers) return false;
  catchUp(h, now);
  h.tiles[i] = { s: 'tilled', sprinkler: true };
  return true;
}

/** Farming XP for one harvest: scaled to your level (a share of a garden harvest of your best crop, by grow time). */
export function homesteadXp(c: HomeCrop, bestHarvestXp: number, bestGrowMin: number): number {
  return Math.max(1, Math.round(bestHarvestXp * (c.growMin / Math.max(1, bestGrowMin)) * 0.15));
}

/** Clean up a saved homestead (keeps only what makes sense). */
export function loadHomestead(raw: unknown): Homestead | null {
  const r = raw as Homestead;
  if (!r || typeof r !== 'object' || !Array.isArray(r.tiles)) return null;
  const size = Math.max(3, Math.min(6, Math.floor(Number(r.size) || 3)));
  if (r.tiles.length !== size * size) return null;
  const n = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));
  const tiles: Tile[] = r.tiles.map((t) => {
    if (!t || typeof t !== 'object') return { s: 'wild' };
    const s = t.s === 'tilled' || t.s === 'sown' ? t.s : 'wild';
    const out: Tile = { s };
    if (t.sprinkler) { out.s = 'tilled'; out.sprinkler = true; return out; }
    if (s === 'sown' && t.crop && CROP_MAP[t.crop]) { out.crop = t.crop; out.grown = n(t.grown); out.at = n(t.at) || Date.now(); out.wetUntil = n(t.wetUntil); }
    else if (s === 'sown') out.s = 'tilled';
    return out;
  });
  const basket: Record<string, number> = {};
  for (const [k, v] of Object.entries(r.basket ?? {})) if ((k === 'egg' || CROP_MAP[k]) && n(v) > 0) basket[k] = n(v);
  return {
    size, tiles, coins: n(r.coins), basket, eggs: r.eggs && Number(r.eggs.since) ? { since: Number(r.eggs.since) } : null,
    hive: !!r.hive, hand: !!r.hand, sprinklers: Math.min(4, n(r.sprinklers)), seed: CROP_MAP[r.seed] ? r.seed : 'lettuce', sold: n(r.sold),
  };
}
