// Reserved for the NPC Trading Post (not built yet — see docs/design.md).
// Kept separate from player data and loot so it can later move to a server for multiplayer.
// The market will only ever talk to the player through functions like these:

export interface MarketPrice {
  itemId: string;
  buy: number;
  sell: number;
}

export interface MarketService {
  getPrices(): MarketPrice[];
}
