// 🧪 The Apothecary (v0.0.2.39, Herblore's second game — owner: "a cozy game of all cozy games"). Engine only.
//  • A villager comes in with a small trouble; their remedy is a circle somewhere on the potion map.
//  • Your brew starts in the middle. Each herb nudges it a set way (its arrow); grinding it in the mortar first
//    (1–3 turns) decides how far. 💧 Water pulls the brew a quarter of the way back toward the middle — for fine
//    adjustments. Inside the circle? Cork it and hand it over. The closer to the centre, the more stars.
//  • No timers, nothing lost; 🫗 empty the cauldron to start again. Levels 1–999 (`apoSpec`): more remedies and
//    herbs, smaller circles.
export const MAX_APO_LEVEL = 999;

export interface Herb { id: string; emoji: string; name: string; dx: number; dy: number }
export const HERBS: Herb[] = [
  { id: 'mint', emoji: '🌿', name: 'Mint', dx: 0.28, dy: 0 },
  { id: 'chamomile', emoji: '🌼', name: 'Chamomile', dx: 0, dy: -0.26 },
  { id: 'sage', emoji: '🍁', name: 'Sage', dx: -0.28, dy: 0 },
  { id: 'rosehip', emoji: '🌹', name: 'Rosehip', dx: 0, dy: 0.27 },
  { id: 'ginger', emoji: '🫚', name: 'Ginger', dx: 0.2, dy: 0.2 },
  { id: 'lavender', emoji: '🪻', name: 'Lavender', dx: -0.2, dy: -0.2 },
  { id: 'oat', emoji: '🌾', name: 'Oat straw', dx: -0.2, dy: 0.2 },
  { id: 'cap', emoji: '🍄', name: 'Fairy cap', dx: 0.2, dy: -0.2 },
];

export interface Remedy { id: string; emoji: string; name: string; x: number; y: number; trouble: string }
export const REMEDIES: Remedy[] = [
  { id: 'sleep', emoji: '🌙', name: 'Sleep draught', x: 0, y: -0.62, trouble: "I can't sleep a wink these nights…" },
  { id: 'cough', emoji: '🍃', name: 'Cough syrup', x: 0.6, y: -0.3, trouble: 'This cough just won’t quit.' },
  { id: 'feet', emoji: '🦶', name: 'Foot balm', x: -0.6, y: -0.3, trouble: 'My feet ache from the long road.' },
  { id: 'warm', emoji: '🔥', name: 'Warming tonic', x: 0.58, y: 0.38, trouble: 'I’m chilled right to the bone.' },
  { id: 'vigour', emoji: '💪', name: 'Vigour brew', x: -0.58, y: 0.38, trouble: 'I’ve been so tired lately.' },
  { id: 'bright', emoji: '✨', name: 'Bright spirits', x: 0, y: 0.7, trouble: 'Feeling a little gloomy today.' },
  { id: 'clear', emoji: '🧠', name: 'Clear head', x: 0.78, y: 0.05, trouble: 'My head feels full of fog.' },
  { id: 'skin', emoji: '🌸', name: 'Soothing salve', x: -0.78, y: 0.05, trouble: 'This itchy rash is driving me batty.' },
];
const FACES = ['👵', '🧓', '👨‍🌾', '👩‍🌾', '🧒', '👧', '🧔', '👩‍🦰', '🧙', '🧝‍♀️', '👨‍🍳', '🧑‍🎤'];

export interface ApoSpec { remedies: number; herbs: number; radius: number }
export function apoSpec(level: number): ApoSpec {
  const L = Math.max(1, Math.min(MAX_APO_LEVEL, Math.floor(level)));
  const e = Math.pow((L - 1) / (MAX_APO_LEVEL - 1), 0.5);
  return {
    remedies: L < 3 ? 3 : L < 8 ? 5 : L < 15 ? 6 : 8,
    herbs: L < 5 ? 4 : L < 12 ? 6 : 8,
    radius: 0.2 - 0.11 * e,
  };
}

/** How far each grind setting sends a herb. */
export const GRIND = [0.5, 0.75, 1];

export interface Brew {
  level: number;
  remedy: string;
  face: string;
  /** Where the brew is on the map now, and every point it has been (for the drawn path). */
  x: number; y: number;
  path: [number, number][];
  steps: number;
}

export function newBrew(level: number, rng = Math.random): Brew {
  const spec = apoSpec(level);
  const r = REMEDIES[Math.floor(rng() * spec.remedies)];
  return { level, remedy: r.id, face: FACES[Math.floor(rng() * FACES.length)], x: 0, y: 0, path: [[0, 0]], steps: 0 };
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
export function addHerb(b: Brew, herb: Herb, grind: number) {
  const k = GRIND[Math.max(0, Math.min(2, grind - 1))];
  b.x = clamp(b.x + herb.dx * k);
  b.y = clamp(b.y + herb.dy * k);
  b.path.push([b.x, b.y]);
  b.steps++;
}
export function addWater(b: Brew) {
  b.x *= 0.75; b.y *= 0.75;
  b.path.push([b.x, b.y]);
  b.steps++;
}
export function emptyCauldron(b: Brew) { b.x = 0; b.y = 0; b.path = [[0, 0]]; b.steps = 0; }

export const remedyOf = (b: Brew) => REMEDIES.find((r) => r.id === b.remedy)!;
export const distTo = (b: Brew) => { const r = remedyOf(b); return Math.hypot(b.x - r.x, b.y - r.y); };
/** 0 = not there yet, 1–3 stars by how close to the circle's centre. */
export function brewStars(b: Brew): number {
  const R = apoSpec(b.level).radius, d = distTo(b);
  return d > R ? 0 : d <= R / 3 ? 3 : d <= (2 * R) / 3 ? 2 : 1;
}

/** Herblore XP for a remedy: ×10 the chosen herb's XP + ×5 per star, a little more at higher levels (then scaled to
 *  your own level by game.minigameXp). */
export function apoXp(level: number, stars: number, baseXp: number): number {
  const lv = 1 + (Math.max(1, level) - 1) / (MAX_APO_LEVEL - 1) * 0.6;
  return Math.max(1, Math.round(baseXp * (10 + 5 * stars) * lv));
}
