// Rules for the skill minigames. They are optional and forgiving:
// a good tap earns the normal reward, a great tap earns a bonus, a miss just means "try again".
// Idling never needs them.

export type HitGrade = 'perfect' | 'good' | 'miss';

/** Mining — Strike Vein: tap while the marker is in the gold zone. */
export const STRIKE_VEIN = {
  /** Width of the gold zone, as a fraction of the bar. */
  zone: 0.3,
  /** The centre part of the zone that counts as perfect. */
  perfectZone: 0.1,
  /** Seconds for the marker to cross the bar once. Quick and snappy. */
  sweepSeconds: 0.9,
  /** Short pause after each tap (ms). */
  pauseMs: 120,
  rewards: {
    good: { xpMult: 1, bonusRolls: 1 }, // 2 ore
    perfect: { xpMult: 1.5, bonusRolls: 2 }, // 3 ore
  },
  /** Every N hits in a row without a miss gives combo bonus ore. */
  comboEvery: 5,
  comboBonusRolls: 3,
};

/** Smithing — Anvil Rhythm: tap as the glowing ring lands on the anvil. Three good taps finish the item. */
export const ANVIL_RHYTHM = {
  hitsNeeded: 3,
  /** Seconds for the ring to shrink onto the target. */
  ringSeconds: 1.3,
  goodWindow: 0.16,
  perfectWindow: 0.06,
  /** Extra XP for each perfect hit in an item. */
  xpPerPerfect: 0.25,
  /** All perfect = a masterwork: one extra item. */
  masterworkBonusRolls: 1,
};

/** Woodcutting — Chop!: simply tap the tree. Every 5 taps gives a log. */
export const CHOP = {
  tapsNeeded: 5,
};

/** Fishing — Reel It In: hold to reel; keep the hook in the fish's green zone until the catch bar fills. */
export const REEL = {
  riseSpeed: 1.5,
  fallSpeed: 1.2,
  zone: 0.3,
  fillPerSecond: 0.5,
  /** Out of the zone the catch bar only drains gently — you can never lose the fish. */
  drainPerSecond: 0.12,
  /** Stayed in the zone the whole time = bonus fish. */
  cleanCatchBonusRolls: 1,
};

/** Cooking — Heat Precision: sear twice; both in the golden zone = Great food. Food never burns. */
export const HEAT = {
  sweepSeconds: 1.3,
  zone: 0.24,
  searsNeeded: 2,
  greatXpMult: 1.25,
};

/** Firemaking — Kindle: tap to add kindling; fill the meter to light the fire. */
export const KINDLE = {
  perTap: 0.13,
  coolPerSecond: 0.22,
  /** Light it within this many seconds for a "quick spark" XP bonus. */
  quickSeconds: 2.5,
  quickXpMult: 1.3,
};

/** Crafting — Steady Hands: the blade passes once; tap at each carving notch. */
export const STEADY_HANDS = {
  passSeconds: 2.6,
  notches: 3,
  goodDistance: 0.05,
  perfectDistance: 0.018,
  xpPerHit: 0.1,
  xpPerPerfect: 0.1,
};

/** Enhancing — Rune Align: tap when the rune passes the top for extra luck on the attempt. */
export const RUNE_ALIGN = {
  spinSeconds: 1.8,
  goodDegrees: 16,
  perfectDegrees: 5,
  goodLuck: 0.05,
  perfectLuck: 0.1,
};

/** Runecrafting — Rune Trace: tap the glowing points of the rune in number order. */
export const RUNE_TRACE = {
  nodes: 6,
  traceLength: 4,
  /** A clean trace (no wrong taps) gives bonus XP and, for runes, a bonus batch. */
  cleanXpMult: 1.3,
  cleanBonusRolls: 1,
};

/** Safety caps so a minigame can never give silly rewards. */
export function clampReward(r: { xpMult: number; bonusRolls: number }) {
  return {
    xpMult: Math.min(2, Math.max(1, r.xpMult)),
    bonusRolls: Math.min(5, Math.max(0, Math.floor(r.bonusRolls))),
  };
}
