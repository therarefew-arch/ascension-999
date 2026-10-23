// Rules for the skill minigames. They are optional and forgiving:
// a good tap earns the normal reward, a great tap earns a bonus, a miss just means "try again".
// Idling never needs them.

export type HitGrade = 'perfect' | 'good' | 'miss';

/** Mining — Strike Vein: tap while the marker is in the gold zone. */
export const STRIKE_VEIN = {
  /** Width of the gold zone, as a fraction of the bar. */
  zone: 0.26,
  /** The centre part of the zone that counts as perfect. */
  perfectZone: 0.08,
  /** Seconds for the marker to cross the bar once. Slow and relaxed. */
  sweepSeconds: 1.5,
  rewards: {
    good: { xpMult: 1, bonusRolls: 0 },
    perfect: { xpMult: 1.5, bonusRolls: 1 },
  },
  /** Every N hits in a row without a miss gives combo bonus ore. */
  comboEvery: 5,
  comboBonusRolls: 2,
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

/** Safety caps so a minigame can never give silly rewards. */
export function clampReward(r: { xpMult: number; bonusRolls: number }) {
  return {
    xpMult: Math.min(2, Math.max(1, r.xpMult)),
    bonusRolls: Math.min(3, Math.max(0, Math.floor(r.bonusRolls))),
  };
}
