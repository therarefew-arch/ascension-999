// 🎶 Runesong — Enhancing's second minigame (no bars, no gear needed).
// Six runes sing a short spell; echo it back in the same order. Every echoed spell gives
// Enhancing XP and some Magic XP. A wrong note just fizzles: the next spell is one note shorter.
import { gatherXpPerHour, tierForLevel } from '../data/tiers';

export const RUNES = [
  { key: 'air', name: 'Air', emoji: '🌬️', color: '#bae6fd', rate: 1 },
  { key: 'water', name: 'Water', emoji: '💧', color: '#60a5fa', rate: 1.125 },
  { key: 'earth', name: 'Earth', emoji: '🪨', color: '#a3e635', rate: 1.25 },
  { key: 'fire', name: 'Fire', emoji: '🔥', color: '#fb923c', rate: 1.5 },
  { key: 'nature', name: 'Nature', emoji: '🌿', color: '#4ade80', rate: 1.667 },
  { key: 'moon', name: 'Moon', emoji: '🌙', color: '#c4b5fd', rate: 2 },
] as const;

export const MIN_LENGTH = 3;
export const MAX_LENGTH = 12;
/** How long each rune glows while the spell plays (ms). */
export const NOTE_MS = 520;
/** Magic gets this share of the Enhancing XP. */
export const MAGIC_SHARE = 0.5;

/** A new spell: `length` runes, never the same rune twice in a row. */
export function newSpell(length: number, rng: () => number = Math.random): number[] {
  const out: number[] = [];
  while (out.length < length) {
    const r = Math.floor(rng() * RUNES.length);
    if (r !== out[out.length - 1]) out.push(r);
  }
  return out;
}

/**
 * XP for echoing a spell of `length` runes at your Enhancing level.
 * Paced on your tier's gathering rate (about 1.3 seconds per note), times 3 because you're playing
 * instead of idling — but still slower than enhancing real gear with bars.
 */
export function runesongXp(enhancingLevel: number, length: number): { enhancing: number; magic: number } {
  const perSecond = gatherXpPerHour(tierForLevel(enhancingLevel)) / 3600;
  const enhancing = Math.max(1, Math.round(perSecond * 1.3 * length * 3));
  return { enhancing, magic: Math.max(1, Math.round(enhancing * MAGIC_SHARE)) };
}

/** Next spell length: one longer after a success, one shorter after a fizzle. */
export const nextLength = (length: number, success: boolean) =>
  Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, length + (success ? 1 : -1)));
