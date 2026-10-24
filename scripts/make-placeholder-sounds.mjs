// Makes quiet placeholder .wav sounds in public/assets/sounds/.
// Run with: npm run sounds   (only overwrites the .wav placeholders)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RATE = 22050;
const OUT = join(process.cwd(), 'public', 'assets', 'sounds');
mkdirSync(OUT, { recursive: true });

function wav(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, 44 + i * 2));
  return buf;
}

/** A soft note: frequencies (Hz), length (s), loudness, decay speed. */
function tone(freqs, len, amp = 0.15, decay = 8, attack = 0.005) {
  const n = Math.floor(len * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / attack) * Math.exp(-decay * t);
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t);
    out[i] = (v / freqs.length) * env * amp;
  }
  return out;
}

function noise(len, amp, decay) {
  const n = Math.floor(len * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (Math.random() * 2 - 1) * amp * Math.exp(-decay * (i / RATE));
  return out;
}

function mix(...parts) {
  const len = Math.max(...parts.map(([, p, off = 0]) => p.length + Math.floor(off * RATE)));
  const out = new Float32Array(len);
  for (const [, p, off = 0] of parts) {
    const o = Math.floor(off * RATE);
    p.forEach((s, i) => (out[i + o] += s));
  }
  return out;
}

// ---------- helpers for richer, "physical" sounds ----------
/** Simple one-pole low-pass filter (cutoff in Hz). */
function lowpass(s, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
  const out = new Float32Array(s.length);
  let y = 0;
  for (let i = 0; i < s.length; i++) { y += a * (s[i] - y); out[i] = y; }
  return out;
}
/** High-pass = signal minus its low-pass. */
function highpass(s, cutoff) {
  const lp = lowpass(s, cutoff);
  return s.map((v, i) => v - lp[i]);
}
/** Band-pass: high-pass then low-pass. */
function bandpass(s, lo, hi) { return lowpass(highpass(s, lo), hi); }
/** Multiply a sound by a shape over time: env(t) → 0..1. */
function shape(s, env) { return s.map((v, i) => v * env(i / RATE)); }
/** Struck metal/wood: a few inharmonic partials, each with its own decay. */
function strike(f0, ratios, decays, amps, len, amp = 0.2) {
  const n = Math.floor(len * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let v = 0;
    ratios.forEach((r, k) => { v += amps[k] * Math.sin(2 * Math.PI * f0 * r * t + k) * Math.exp(-decays[k] * t); });
    out[i] = v * amp * Math.min(1, t / 0.0015);
  }
  return out;
}
/** A pitch sweep (Hz from → to), sine. */
function sweep(from, to, len, amp, decay) {
  const n = Math.floor(len * RATE);
  const out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const f = from + (to - from) * (t / len);
    ph += (2 * Math.PI * f) / RATE;
    out[i] = Math.sin(ph) * amp * Math.exp(-decay * t) * Math.min(1, t / 0.004);
  }
  return out;
}
/** Sparse pops (fire): count pops spread over len seconds. */
function pops(len, count, amp, seed = 1) {
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const n = Math.floor(len * RATE);
  const out = new Float32Array(n);
  for (let k = 0; k < count; k++) {
    const at = Math.floor(r() * (n - 400));
    const a = amp * (0.3 + r() * 0.7);
    const d = 300 + r() * 900;
    for (let i = 0; i < 300; i++) out[at + i] += (r() * 2 - 1) * a * Math.exp(-d * (i / RATE));
  }
  return highpass(out, 900);
}
/** Normalise so the loudest point is `peak`. */
function norm(s, peak) {
  let m = 0;
  for (const v of s) m = Math.max(m, Math.abs(v));
  return m ? s.map((v) => (v / m) * peak) : s;
}
/** Make a loop seamless by fading both ends. */
function loopFade(s, sec = 0.03) {
  const f = Math.floor(sec * RATE);
  const out = Float32Array.from(s);
  for (let i = 0; i < f; i++) { out[i] *= i / f; out[out.length - 1 - i] *= i / f; }
  return out;
}

const sounds = {
  // Soft wooden "tock" for every button: a woody knock with a tiny click on top.
  click: norm(mix(['', strike(820, [1, 2.3], [70, 120], [1, 0.4], 0.07, 1)], ['', bandpass(noise(0.012, 1, 300), 1500, 5000)]), 0.16),
  mine: mix(['', noise(0.05, 0.06, 80)], ['', tone([900, 1350], 0.18, 0.1, 25)]),
  smith: tone([1500, 2260, 3100], 0.35, 0.09, 12),
  // Hammer on anvil: bright inharmonic ring + the thud of the hammer.
  anvil: norm(mix(
    ['', strike(640, [1, 2.76, 5.4, 8.93], [5, 8, 14, 22], [1, 0.7, 0.45, 0.25], 1.1, 1)],
    ['', lowpass(noise(0.03, 1, 120), 1800)],
    ['', strike(110, [1], [40], [1], 0.12, 0.8)],
  ), 0.3),
  // Pickaxe on stone: hard short chink + gravel.
  pickaxe: norm(mix(
    ['', strike(1850, [1, 1.7, 2.9], [30, 45, 60], [1, 0.6, 0.3], 0.25, 1)],
    ['', bandpass(noise(0.08, 1, 40), 600, 4000)],
    ['', strike(140, [1], [45], [1], 0.1, 0.6)],
  ), 0.26),
  // Axe into wood: woody thunk (body resonance) + splintery crack.
  chop: norm(mix(
    ['', strike(150, [1, 2.1, 3.6], [28, 40, 60], [1, 0.5, 0.25], 0.25, 1)],
    ['', bandpass(noise(0.05, 1, 70), 400, 3000)],
    ['', bandpass(noise(0.015, 0.8, 250), 2500, 7000)],
  ), 0.3),
  // The tree falls: creak, then a heavy thud.
  timber: norm(mix(
    ['', shape(sweep(260, 120, 0.5, 1, 1.5), (t) => 0.4 + 0.6 * Math.abs(Math.sin(t * 60)))],
    ['', strike(70, [1, 1.9], [12, 20], [1, 0.4], 0.5, 1.4), 0.5],
    ['', lowpass(noise(0.3, 0.8, 12), 700), 0.5],
  ), 0.3),
  // Snapping a twig of kindling.
  kindle: norm(mix(
    ['', bandpass(noise(0.02, 1, 200), 1200, 6000)],
    ['', bandpass(noise(0.015, 0.7, 260), 1500, 6000), 0.025],
    ['', pops(0.25, 4, 0.5, 7), 0.02],
  ), 0.22),
  // Fire catching: soft "whoomp" then crackles.
  ignite: norm(mix(
    ['', shape(lowpass(noise(0.6, 1, 0), 500), (t) => Math.min(1, t / 0.12) * Math.exp(-5 * t))],
    ['', pops(0.7, 10, 0.6, 3), 0.1],
  ), 0.3),
  splash: norm(mix(
    ['', shape(bandpass(noise(0.35, 1, 0), 300, 2500), (t) => Math.min(1, t / 0.01) * Math.exp(-11 * t))],
    ['', sweep(500, 1100, 0.06, 0.5, 30), 0.05],
    ['', sweep(650, 1400, 0.05, 0.4, 35), 0.12],
  ), 0.24),
  // Meat on a hot pan: bright hiss that flutters.
  sizzle: norm(shape(highpass(noise(0.7, 1, 0), 3000), (t) => Math.min(1, t / 0.02) * Math.exp(-3.5 * t) * (0.6 + 0.4 * Math.abs(Math.sin(t * 90) * Math.sin(t * 37)))), 0.16),
  crackle: norm(pops(0.45, 9, 1, 11), 0.22),
  // Reel winding: a ratchet loop (played over and over while you hold).
  reel: (() => {
    const len = 0.36;
    const out = new Float32Array(Math.floor(len * RATE));
    for (let k = 0; k < 10; k++) {
      const tick = strike(2600 + (k % 2) * 300, [1, 1.6], [180, 260], [1, 0.4], 0.03, 1);
      const at = Math.floor(k * (len / 10) * RATE);
      tick.forEach((v, i) => { if (at + i < out.length) out[at + i] += v; });
    }
    return norm(mix(['', out], ['', lowpass(noise(len, 0.08, 0), 900)]), 0.13);
  })(),
  // Knife carving wood.
  carve: norm(mix(
    ['', shape(bandpass(noise(0.16, 1, 0), 1800, 6000), (t) => Math.sin(Math.PI * Math.min(1, t / 0.16)))],
    ['', strike(900, [1, 2.4], [60, 90], [1, 0.3], 0.08, 0.5), 0.12],
  ), 0.18),
  // A soft magical chime (played at higher notes as you trace).
  rune: norm(mix(
    ['', strike(784, [1, 2, 3.01], [5, 9, 14], [1, 0.35, 0.15], 0.9, 1)],
    ['', strike(1568, [1], [10], [0.3], 0.5, 1), 0.02],
  ), 0.16),
  // A gentle "nope" swish for a miss — never harsh.
  whoosh: norm(shape(bandpass(noise(0.22, 1, 0), 500, 2200), (t) => Math.sin(Math.PI * Math.min(1, t / 0.22)) ** 2), 0.07),
  // Water hitting fire: steam hiss.
  douse: norm(mix(
    ['', shape(highpass(noise(0.45, 1, 0), 2200), (t) => Math.min(1, t / 0.01) * Math.exp(-6 * t))],
    ['', sweep(700, 1300, 0.05, 0.4, 30)],
  ), 0.2),
  // Coins: two little bright pings.
  coin: norm(mix(
    ['', strike(1976, [1, 2.7], [14, 22], [1, 0.3], 0.35, 1)],
    ['', strike(2637, [1, 2.7], [12, 20], [1, 0.3], 0.45, 1), 0.07],
  ), 0.16),
  // Combat: blade "shing" when charging a strike, shield thud on block, munch when eating.
  shing: norm(mix(
    ['', strike(2300, [1, 1.52, 2.4], [6, 9, 14], [1, 0.6, 0.3], 0.6, 1)],
    ['', shape(highpass(noise(0.15, 1, 0), 3000), (t) => Math.exp(-20 * t))],
  ), 0.16),
  block: norm(mix(
    ['', strike(180, [1, 2.4, 3.9], [25, 35, 50], [1, 0.5, 0.3], 0.3, 1)],
    ['', lowpass(noise(0.05, 1, 60), 1500)],
  ), 0.28),
  eat: norm(mix(
    ['', bandpass(noise(0.06, 1, 40), 500, 3000)],
    ['', bandpass(noise(0.06, 0.8, 40), 500, 3000), 0.12],
  ), 0.18),
  levelup: mix(
    ['', tone([523], 0.3, 0.1, 6)], ['', tone([659], 0.3, 0.1, 6), 0.1],
    ['', tone([784], 0.3, 0.1, 6), 0.2], ['', tone([1047], 0.6, 0.1, 4), 0.3],
  ),
  equip: mix(['', tone([180, 270], 0.15, 0.14, 20)], ['', noise(0.04, 0.03, 60)]),
  deposit: mix(['', tone([660], 0.12, 0.08, 18)], ['', tone([880], 0.18, 0.08, 14), 0.08]),
  error: tone([220, 233], 0.2, 0.08, 14),
  craft: mix(['', tone([480], 0.08, 0.08, 30)], ['', noise(0.05, 0.03, 60), 0.05]),
  enchant: mix(['', tone([880, 1320], 0.4, 0.07, 6)], ['', tone([1175, 1760], 0.4, 0.06, 6), 0.12]),
  fail: mix(['', tone([392], 0.25, 0.06, 8)], ['', tone([330], 0.35, 0.06, 6), 0.12]),
  hit: mix(['', noise(0.04, 0.07, 70)], ['', tone([300, 450], 0.12, 0.09, 28)]),
  hurt: mix(['', tone([180, 160], 0.18, 0.09, 16)], ['', noise(0.05, 0.04, 50)]),
  tile: mix(['', tone([140, 95], 0.12, 0.16, 30)], ['', noise(0.025, 0.08, 120)]),
  match: mix(['', tone([1046, 1568], 0.35, 0.07, 9)], ['', tone([1318, 1976], 0.45, 0.06, 7), 0.09]),
  welcome: mix(['', tone([392], 0.5, 0.08, 4)], ['', tone([523], 0.5, 0.08, 4), 0.15], ['', tone([659], 0.8, 0.08, 3), 0.3]),
};

for (const [name, s] of Object.entries(sounds)) writeFileSync(join(OUT, `${name}.wav`), wav(Array.from(s)));

// Cozy fire ambience (loops quietly in the kitchen while the fire is lit): low rumble + crackles.
{
  const len = 6;
  const rumble = lowpass(noise(len, 1, 0), 220);
  const out = mix(['', norm(rumble, 0.05)], ['', norm(pops(len, 40, 1, 5), 0.12)]);
  writeFileSync(join(OUT, 'fire_loop.wav'), wav(Array.from(loopFade(out, 0.15))));
}

// A slow, quiet 16-second loop of soft chords (Am – F – C – G).
const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [130.8, 196, 261.6], [196, 246.9, 293.7]];
const loopLen = 16 * RATE;
const music = new Float32Array(loopLen);
chords.forEach((chord, ci) => {
  const start = ci * 4 * RATE;
  for (let i = 0; i < 4 * RATE; i++) {
    const t = i / RATE;
    const env = Math.sin(Math.PI * (i / (4 * RATE))) ** 1.5; // fades in and out, so the loop is seamless
    let v = 0;
    for (const f of chord) v += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    music[start + i] += (v / chord.length) * env * 0.06;
  }
});
writeFileSync(join(OUT, 'music_town.wav'), wav(Array.from(music)));

// Calm lofi loop for the Mahjong tile game: 72 bpm, jazzy 7th chords, soft kick + brush, vinyl crackle. 4 bars × 2 = ~26.7s.
{
  const bpm = 72;
  const beat = 60 / bpm;
  const bars = 8;
  const len = Math.floor(bars * 4 * beat * RATE);
  const out = new Float32Array(len);
  const chordsL = [[146.8, 174.6, 220, 261.6], [98, 123.5, 174.6, 220], [130.8, 164.8, 196, 246.9], [110, 130.8, 164.8, 196]]; // Dm7 G7 Cmaj7 Am7
  for (let b = 0; b < bars; b++) {
    const chord = chordsL[b % 4];
    const start = Math.floor(b * 4 * beat * RATE);
    const n = Math.floor(4 * beat * RATE);
    for (let i = 0; i < n && start + i < len; i++) {
      const t = i / RATE;
      const env = Math.min(1, t / 0.08) * Math.exp(-0.35 * t);
      const trem = 0.85 + 0.15 * Math.sin(2 * Math.PI * 4.2 * t);
      let v = 0;
      for (const f of chord) v += Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t + 0.3);
      out[start + i] += (v / chord.length) * env * trem * 0.07;
    }
    // soft bass note on beat 1 and 3
    for (const bt of [0, 2]) {
      const s = start + Math.floor(bt * beat * RATE);
      for (let i = 0; i < beat * RATE * 1.5 && s + i < len; i++) {
        const t = i / RATE;
        out[s + i] += Math.sin(2 * Math.PI * (chord[0] / 2) * t) * Math.exp(-2.5 * t) * 0.09;
      }
    }
    // gentle kick on 1 and 3, brushy snare on 2 and 4
    for (let bt = 0; bt < 4; bt++) {
      const s = start + Math.floor(bt * beat * RATE);
      if (bt % 2 === 0) for (let i = 0; i < 0.18 * RATE && s + i < len; i++) { const t = i / RATE; out[s + i] += Math.sin(2 * Math.PI * (70 - 40 * t) * t) * Math.exp(-18 * t) * 0.16; }
      else for (let i = 0; i < 0.15 * RATE && s + i < len; i++) { const t = i / RATE; out[s + i] += (Math.random() * 2 - 1) * Math.exp(-22 * t) * 0.035; }
    }
  }
  // vinyl crackle + hiss
  for (let i = 0; i < len; i++) {
    out[i] += (Math.random() * 2 - 1) * 0.004;
    if (Math.random() < 0.0006) out[i] += (Math.random() * 2 - 1) * 0.06;
  }
  // fade the loop ends a touch so it repeats smoothly
  const fade = Math.floor(0.05 * RATE);
  for (let i = 0; i < fade; i++) { out[i] *= i / fade; out[len - 1 - i] *= i / fade; }
  writeFileSync(join(OUT, 'music_mahjong.wav'), wav(Array.from(out)));
}

console.log('Placeholder sounds written to', OUT);
