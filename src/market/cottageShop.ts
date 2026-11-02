// 🛍️ The Cottage decor shop (v0.0.2.5): what decorations cost. Just for looks — no perks — so they're cheap; selling one
// back gives half. Coins only, never real money.
export const DECOR_PRICE: Record<string, number> = {
  rug_cream: 150, rug_green: 150, rug_red: 150, plant_fern: 120, plant_tall: 250, plant_cactus: 80, floor_lamp: 300,
  sofa: 900, coffee_table: 400, side_table: 200, desk: 500, wardrobe: 800, dining_set: 600, book_stack: 60, crates: 120,
  laundry_basket: 80, pet_bed: 150, frame_land: 150, frame_tall: 150, wall_clock: 200, wall_shelf: 200,
};
export const decorPrice = (kind: string) => DECOR_PRICE[kind] ?? 100;
export const decorRefund = (kind: string) => Math.floor(decorPrice(kind) / 2);
