// ✨ Relics: one-of-a-kind named gear found only in the Wandering Pedlar's sealed crates (market/pedlar.ts).
// Each Relic exists once per save. Finding it again in a farther town's crate "awakens" it to that town's
// strength instead of giving a second copy. Their special traits are checked in core/relics.ts.
// Static data only — the items themselves are generated in data/items.ts (one per tier, `relic_<key>_<tier>`).

export type RelicKey =
  | 'whisperwood_axe' | 'deepdelver_pick' | 'tidecaller_rod' | 'hearthsong_hammer' | 'bramble_skillet'
  | 'emberheart_blade' | 'galewhisper_bow' | 'starweaver_staff'
  | 'oathkeeper_shield' | 'wanderers_crown' | 'patchwork_coat';

export interface RelicDef {
  key: RelicKey;
  name: string;
  emoji: string;
  /** What the relic is: a skilling tool, a weapon or a piece of armour. */
  kind: 'tool' | 'weapon' | 'armour';
  /** Gear slot it's worn in. */
  slot: 'axe' | 'pickaxe' | 'rod' | 'hammer' | 'skillet' | 'weapon' | 'shield' | 'head' | 'body';
  /** Its special trait, in plain words. */
  trait: string;
  /** A line of story. */
  lore: string;
}

export const RELICS: RelicDef[] = [
  { key: 'whisperwood_axe', name: 'Whisperwood Axe', emoji: '🪓', kind: 'tool', slot: 'axe',
    trait: '15% chance to cut a second log', lore: 'The trees lean in to listen when it swings.' },
  { key: 'deepdelver_pick', name: "Deepdelver's Pick", emoji: '⛏️', kind: 'tool', slot: 'pickaxe',
    trait: '15% chance to mine a second ore', lore: 'Its old owner dug so deep they found the bottom, and came back up.' },
  { key: 'tidecaller_rod', name: 'Tidecaller Rod', emoji: '🎣', kind: 'tool', slot: 'rod',
    trait: 'Rare fish bite twice as often', lore: 'The line hums a tune only the old fish remember.' },
  { key: 'hearthsong_hammer', name: 'Hearthsong Hammer', emoji: '🔨', kind: 'tool', slot: 'hammer',
    trait: '12% chance smithing uses no materials', lore: 'It rings like a bell. Metal seems happy to be shaped by it.' },
  { key: 'bramble_skillet', name: "Granny Bramble's Skillet", emoji: '🍳', kind: 'tool', slot: 'skillet',
    trait: '15% chance to cook a second one for free', lore: 'Seasoned by sixty years of Sunday suppers.' },
  { key: 'emberheart_blade', name: 'Emberheart Blade', emoji: '🗡️', kind: 'weapon', slot: 'weapon',
    trait: 'Hits 5% harder with every swing at the same foe (up to +50%)', lore: 'A coal glows in the hilt, brighter the longer the fight.' },
  { key: 'galewhisper_bow', name: 'Galewhisper Bow', emoji: '🏹', kind: 'weapon', slot: 'weapon',
    trait: 'Arrows come back 60% of the time', lore: 'The wind carries every arrow home.' },
  { key: 'starweaver_staff', name: 'Starweaver Staff', emoji: '🪄', kind: 'weapon', slot: 'weapon',
    trait: 'Casts with any runes in your bag (the strongest first)', lore: 'It doesn\'t care which star you wish on.' },
  { key: 'oathkeeper_shield', name: 'Oathkeeper Shield', emoji: '🛡️', kind: 'armour', slot: 'shield',
    trait: 'Wards off the first blow from every foe', lore: 'Sworn to one promise: the first strike never lands.' },
  { key: 'wanderers_crown', name: "Wanderer's Crown", emoji: '👑', kind: 'armour', slot: 'head',
    trait: '+5% XP in every skill', lore: 'A king who gave up his throne to see the world. He learned a lot.' },
  { key: 'patchwork_coat', name: "Pedlar's Patchwork Coat", emoji: '🧥', kind: 'armour', slot: 'body',
    trait: '+15% coins from monsters, and the Pedlar\'s crates cost 10% less', lore: 'Every patch is from a town he sold in. The Pedlar wants it back.' },
];

export const RELIC_MAP = Object.fromEntries(RELICS.map((r) => [r.key, r])) as Record<RelicKey, RelicDef>;
export const relicItemId = (key: RelicKey, tier: number) => `relic_${key}_${tier}`;
