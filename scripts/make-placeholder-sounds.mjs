// Makes the game's placeholder sounds in public/assets/sounds/.
// Run with: npm run sounds
// Short effects are .wav (tiny, and loops stay perfectly seamless). Songs are compressed to .mp3
// (about 5× smaller, so the game loads fast on mobile data). Every song starts and ends in silence,
// so the MP3's tiny padding never makes the loop click.
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Mp3Encoder } from '@breezystack/lamejs';

const RATE = 22050;
const OUT = join(process.cwd(), 'public', 'assets', 'sounds');
// `npm run sounds -- music_cinderpeak` remakes just that one file (so the others stay exactly as they are).
const ONLY = process.argv[2];
const want = (name) => !ONLY || name === ONLY;
mkdirSync(OUT, { recursive: true });

function wav(samples, rate = RATE) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, 44 + i * 2));
  return buf;
}

/** Saves a song as a mono MP3 (and removes an old .wav copy so the game uses the small file). */
function writeMusic(name, samples, rate = RATE) {
  if (!want(name)) return;
  const kbps = rate <= 12000 ? 40 : 56;
  const enc = new Mp3Encoder(1, rate, kbps);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-1, Math.min(1, samples[i])) * 32767;
  const parts = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const buf = enc.encodeBuffer(pcm.subarray(i, i + 1152));
    if (buf.length) parts.push(Buffer.from(buf));
  }
  const end = enc.flush();
  if (end.length) parts.push(Buffer.from(end));
  writeFileSync(join(OUT, `${name}.mp3`), Buffer.concat(parts));
  const oldWav = join(OUT, `${name}.wav`);
  if (existsSync(oldWav)) unlinkSync(oldWav);
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
  // One crisp, short twig snap (short so fast tapping stays clean).
  kindle: norm(mix(
    ['', bandpass(noise(0.018, 1, 260), 1400, 6500)],
    ['', strike(1250, [1, 2.2], [120, 180], [1, 0.4], 0.05, 0.6)],
  ), 0.16),
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
  // Sort the Catch: a crisp tile "clack" (flipping a tile — two hard ceramic knocks, very close together)…
  clack: norm(mix(
    ['', strike(2300, [1, 2.71, 5.2], [85, 120, 170], [1, 0.45, 0.25], 0.09, 1)],
    ['', strike(1900, [1, 2.6], [100, 150], [0.55, 0.25], 0.07, 1), 0.014],
    ['', bandpass(noise(0.01, 1, 500), 2500, 8000)],
  ), 0.2),
  // …and a solid wooden "thud" as a tile lands in the basket.
  thud: norm(mix(
    ['', strike(150, [1, 2.3, 3.9], [26, 40, 60], [1, 0.4, 0.15], 0.28, 1)],
    ['', lowpass(noise(0.05, 1, 70), 1200)],
    ['', strike(640, [1, 2.2], [55, 85], [0.45, 0.2], 0.12, 1), 0.004],
  ), 0.3),
  // 🧺 The Pedlar's crates: a wooden lid creaking as it's pried open, then a little knock as it gives.
  creak: norm(mix(
    ['', shape(sweep(170, 310, 0.5, 1, 0), (t) => (0.3 + 0.7 * Math.abs(Math.sin(t * 38))) * Math.sin(Math.PI * Math.min(1, t / 0.5)) ** 0.7)],
    ['', bandpass(noise(0.5, 0.35, 3), 700, 2600)],
    ['', strike(210, [1, 2.4], [30, 45], [1, 0.4], 0.18, 0.9), 0.48],
  ), 0.22),
  // Spellcards: a papery card flick (dealing/picking a card).
  card: norm(mix(
    ['', shape(bandpass(noise(0.05, 1, 0), 1800, 7000), (t) => Math.min(1, t / 0.003) * Math.exp(-70 * t))],
    ['', strike(1400, [1, 2.3], [90, 140], [0.5, 0.2], 0.04, 1), 0.006],
  ), 0.15),
  // Tally tick: a small glassy pluck (played higher and higher as the score counts up).
  tick: norm(mix(
    ['', strike(1318, [1, 3.01], [22, 40], [1, 0.25], 0.3, 1)],
    ['', bandpass(noise(0.008, 1, 400), 3000, 8000)],
  ), 0.13),
  // Power multiplies: a soft magical whoomp rising into a shimmer.
  boom: norm(mix(
    ['', shape(lowpass(noise(0.5, 1, 0), 320), (t) => Math.min(1, t / 0.02) * Math.exp(-7 * t))],
    ['', sweep(90, 55, 0.45, 1, 6)],
    ['', sweep(600, 1500, 0.35, 0.35, 5), 0.04],
    ['', strike(1760, [1, 2], [6, 10], [0.4, 0.15], 0.6, 1), 0.08],
  ), 0.26),
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

for (const [name, s] of Object.entries(sounds)) if (want(name)) writeFileSync(join(OUT, `${name}.wav`), wav(Array.from(s)));

// Cozy fire ambience (loops quietly in the kitchen while the fire is lit): low rumble + crackles.
{
  const len = 6;
  const rumble = lowpass(noise(len, 1, 0), 220);
  const out = mix(['', norm(rumble, 0.05)], ['', norm(pops(len, 40, 1, 5), 0.12)]);
  if (want('fire_loop')) writeFileSync(join(OUT, 'fire_loop.wav'), wav(Array.from(loopFade(out, 0.15))));
}

// Town music: the same soft swelling chords the owner likes, grown into a ~2-minute song
// so the loop doesn't repeat every 16 seconds. 8 sections × 4 chords × 4 s = 128 s.
// Saved at 11,025 Hz (plenty for soft, mellow tones) to keep the file small for phones.
{
  const MR = 11025; // eslint-disable-line no-shadow
  const CH = 4; // seconds per chord
  const N = {
    Am: [220, 261.6, 329.6], F: [174.6, 220, 261.6], C: [130.8, 196, 261.6], G: [196, 246.9, 293.7],
    Em: [164.8, 196, 246.9], Dm: [146.8, 174.6, 220], Fmaj7: [174.6, 220, 261.6, 329.6], Am7: [220, 261.6, 329.6, 392],
  };
  // Each section: 4 chords + which layers play (melody, bass, arpeggio).
  const sections = [
    { chords: ['Am', 'F', 'C', 'G'], mel: false, bass: false, arp: false }, // the original loop
    { chords: ['Am', 'F', 'C', 'G'], mel: true, bass: false, arp: false },
    { chords: ['F', 'G', 'Em', 'Am'], mel: false, bass: true, arp: false },
    { chords: ['F', 'G', 'C', 'Am7'], mel: true, bass: true, arp: false },
    { chords: ['Dm', 'Am', 'Fmaj7', 'G'], mel: false, bass: true, arp: true },
    { chords: ['Dm', 'Am', 'F', 'G'], mel: true, bass: true, arp: true },
    { chords: ['F', 'G', 'Em', 'Am'], mel: true, bass: false, arp: false },
    { chords: ['Am', 'F', 'C', 'G'], mel: false, bass: false, arp: false }, // calm return to the start
  ];
  // A minor pentatonic for the little bell melody.
  const SCALE = [440, 523.3, 587.3, 659.3, 784, 880];
  let seed = 42;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const total = sections.length * 4 * CH * MR;
  const out = new Float32Array(total);
  const add = (start, len, fn) => { for (let i = 0; i < len && start + i < total; i++) out[start + i] += fn(i / MR); };

  sections.forEach((sec, si) => {
    sec.chords.forEach((name, ci) => {
      const chord = N[name];
      const start = (si * 4 + ci) * CH * MR;
      const len = CH * MR;
      // The swelling pad (same sound as before: sine + soft octave, fading in and out each chord).
      add(start, len, (t) => {
        const env = Math.sin(Math.PI * (t / CH)) ** 1.5;
        let v = 0;
        for (const f of chord) v += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
        return (v / chord.length) * env * 0.06;
      });
      // Soft bass: the chord's root an octave down, gently swelling.
      if (sec.bass) add(start, len, (t) => Math.sin(2 * Math.PI * (chord[0] / 2) * t) * Math.sin(Math.PI * (t / CH)) ** 2 * 0.035);
      // Arpeggio: chord notes an octave up, one every half second, like a music box.
      if (sec.arp) {
        for (let k = 0; k < 7; k++) {
          const f = chord[k % chord.length] * 2;
          add(start + Math.floor((0.25 + k * 0.5) * MR), Math.floor(1.2 * MR), (t) =>
            Math.sin(2 * Math.PI * f * t) * Math.exp(-3.2 * t) * Math.min(1, t / 0.01) * 0.016);
        }
      }
      // Melody: two or three soft bell notes per chord, picked to fit the chord.
      if (sec.mel) {
        const times = rnd() < 0.5 ? [0.4, 1.9] : [0.4, 1.4, 2.6];
        for (const at of times) {
          const near = SCALE.filter((f) => chord.some((c) => Math.abs(Math.log2(f / (c * 2))) % 1 < 0.02 || Math.abs(Math.log2(f / c) % 1) < 0.02));
          const pool = near.length && rnd() < 0.7 ? near : SCALE;
          const f = pool[Math.floor(rnd() * pool.length)];
          add(start + Math.floor(at * MR), Math.floor(1.4 * MR), (t) =>
            (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * Math.exp(-2.6 * t) * Math.min(1, t / 0.015) * 0.022);
        }
      }
    });
  });
  writeMusic('music_town', out, MR);
}

// ---------- Town themes: every town has its own ~2-minute song ----------
const MR = 11025;
function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
/** Adds fn(t) into out from `start` (samples) for `len` samples. */
function addTo(out, start, len, fn) { for (let i = 0; i < len && start + i < out.length; i++) out[start + i] += fn(i / MR); }

// Lunaria (saved for later): deep, slow, minor. Low pad with a soft fifth, a drone, and distant chimes.
// (This was Ironmoor's first theme — the owner felt it suits a foggy sea-cliff town, so it's kept for Lunaria.)
{
  const CH = 4.5;
  const N = {
    Dm: [146.8, 174.6, 220], Bb: [116.5, 146.8, 174.6], F: [130.8, 174.6, 220], C: [130.8, 164.8, 196],
    Gm: [98, 146.8, 196], A: [110, 138.6, 164.8], Am: [110, 130.8, 164.8],
  };
  const sections = [
    { chords: ['Dm', 'Bb', 'F', 'C'], chime: false, hum: false },
    { chords: ['Dm', 'Bb', 'F', 'C'], chime: true, hum: false },
    { chords: ['Dm', 'Gm', 'Bb', 'A'], chime: true, hum: true },
    { chords: ['F', 'C', 'Dm', 'A'], chime: false, hum: true },
    { chords: ['Bb', 'F', 'Gm', 'A'], chime: true, hum: true },
    { chords: ['Dm', 'Am', 'Bb', 'C'], chime: true, hum: false },
    { chords: ['Dm', 'Bb', 'F', 'C'], chime: false, hum: false },
  ];
  const rnd = seeded(7);
  const total = Math.floor(sections.length * 4 * CH * MR);
  const out = new Float32Array(total);
  // A low drone on D the whole way (fades at both ends so the loop is seamless).
  addTo(out, 0, total, (t) => Math.sin(2 * Math.PI * 73.4 * t) * 0.022 * Math.min(1, t / 3, (total / MR - t) / 3));
  sections.forEach((sec, si) => sec.chords.forEach((name, ci) => {
    const chord = N[name];
    const start = Math.floor((si * 4 + ci) * CH * MR);
    const len = Math.floor(CH * MR);
    addTo(out, start, len, (t) => {
      const env = Math.sin(Math.PI * (t / CH)) ** 1.8;
      let v = 0;
      for (const f of chord) v += Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(2 * Math.PI * f * 1.5 * t) + 0.12 * Math.sin(4 * Math.PI * f * t);
      return (v / chord.length) * env * 0.06;
    });
    // Miners humming the root, an octave up, very softly.
    if (sec.hum) addTo(out, start, len, (t) => Math.sin(2 * Math.PI * chord[0] * 2 * t + 0.3 * Math.sin(2 * Math.PI * 5 * t)) * Math.sin(Math.PI * (t / CH)) ** 3 * 0.012);
    // Distant anvil chimes: an inharmonic "ting" with a long tail, echoing once.
    if (sec.chime && rnd() < 0.75) {
      const f = chord[Math.floor(rnd() * chord.length)] * 4;
      const at = start + Math.floor((0.6 + rnd() * 2) * MR);
      for (const [delay, amp] of [[0, 0.02], [0.45, 0.008]]) {
        addTo(out, at + Math.floor(delay * MR), Math.floor(2.5 * MR), (t) =>
          (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-6 * t)) * Math.exp(-2.2 * t) * Math.min(1, t / 0.003) * amp);
      }
    }
  }));
  writeMusic('music_lunaria', out, MR);
}

// Ironmoor: a warm, steady miners' work song. Pickaxe "tinks" on the off-beats, a soft drum like boots
// on a mine floor, a plucky walking bass, woody mallet chords, a whistled tune and a low miners' hum.
{
  const bpm = 96;
  const beat = 60 / bpm;
  const BAR = 4 * beat;
  const N = {
    Am: [110, 130.8, 164.8], G: [98, 123.5, 146.8], Em: [82.4, 98, 123.5], F: [87.3, 110, 130.8],
    C: [130.8 / 2 * 2, 164.8, 196], D: [146.8 / 2, 92.5 * 2, 110 * 2], E: [82.4, 103.8, 123.5],
  };
  // A dorian work-song progression, 4 bars a line.
  const lines = [
    { bars: ['Am', 'G', 'Am', 'Em'], whistle: false, hum: false },
    { bars: ['F', 'G', 'Am', 'Am'], whistle: false, hum: true },
    { bars: ['Am', 'G', 'Am', 'Em'], whistle: true, hum: false },
    { bars: ['F', 'G', 'E', 'Am'], whistle: true, hum: true },
    { bars: ['C', 'G', 'D', 'Am'], whistle: true, hum: false },
    { bars: ['F', 'G', 'Am', 'Em'], whistle: true, hum: true },
    { bars: ['Am', 'D', 'Am', 'G'], whistle: false, hum: true },
    { bars: ['F', 'G', 'E', 'Am'], whistle: true, hum: true },
    { bars: ['Am', 'G', 'Am', 'Em'], whistle: false, hum: false },
  ];
  const rnd = seeded(31);
  const SCALE = [440, 493.9, 523.3, 587.3, 659.3, 740, 784, 880]; // A dorian
  const totalBars = lines.length * 4;
  const total = Math.floor(totalBars * BAR * MR);
  const out = new Float32Array(total);
  const mallet = (f, t) => (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 4 * t) * Math.exp(-20 * t)) * Math.exp(-5 * t) * Math.min(1, t / 0.003);
  let b = 0;
  let lastNote = 3;
  for (const line of lines) {
    for (const name of line.bars) {
      const chord = N[name];
      const start = Math.floor(b * BAR * MR);
      for (let k = 0; k < 4; k++) {
        const at = start + Math.floor(k * beat * MR);
        // Boots on the mine floor: soft low drum on 1 and 3.
        if (k % 2 === 0) addTo(out, at, Math.floor(0.25 * MR), (t) => Math.sin(2 * Math.PI * (75 - 35 * t) * t) * Math.exp(-14 * t) * 0.09);
        // Pickaxe "tink" on 2 and 4 (far away, echoing a little).
        else {
          for (const [d, amp] of [[0, 0.016], [0.18, 0.006]]) {
            addTo(out, at + Math.floor(d * MR), Math.floor(0.5 * MR), (t) =>
              (Math.sin(2 * Math.PI * 1850 * t) + 0.5 * Math.sin(2 * Math.PI * 1850 * 2.7 * t)) * Math.exp(-14 * t) * Math.min(1, t / 0.002) * amp);
          }
        }
        // Walking bass: root, fifth, root, a step.
        const bassF = [chord[0], chord[2] / 2 * 2 > 200 ? chord[2] / 2 : chord[2], chord[0], chord[1]][k] / (chord[0] > 100 ? 2 : 1);
        addTo(out, at, Math.floor(beat * 0.95 * MR), (t) => (Math.sin(2 * Math.PI * bassF * t) + 0.3 * Math.sin(4 * Math.PI * bassF * t)) * Math.exp(-4 * t) * Math.min(1, t / 0.005) * 0.06);
        // Woody mallet chords on the off-beats ("and").
        addTo(out, at + Math.floor((beat / 2) * MR), Math.floor(0.6 * MR), (t) => {
          let v = 0;
          for (const f of chord) v += mallet(f * 2, t);
          return (v / chord.length) * 0.03;
        });
      }
      // A low miners' hum holding the root through the bar.
      if (line.hum) addTo(out, start, Math.floor(BAR * MR), (t) =>
        (Math.sin(2 * Math.PI * chord[0] * t) + 0.4 * Math.sin(2 * Math.PI * chord[0] * 2 * t) + 0.2 * Math.sin(2 * Math.PI * chord[0] * 3 * t))
        * Math.sin(Math.PI * (t / BAR)) ** 2 * 0.022);
      // Whistled tune: steps around the scale, landing on chord notes.
      if (line.whistle) {
        for (const k of [0, 1, 2, 3]) {
          if (rnd() < 0.25) continue;
          lastNote = Math.max(0, Math.min(SCALE.length - 1, lastNote + [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)]));
          const f = SCALE[lastNote];
          const len = k === 3 ? beat * 1.6 : beat * 0.95;
          addTo(out, start + Math.floor(k * beat * MR), Math.floor(len * MR), (t) =>
            Math.sin(2 * Math.PI * f * t + 0.006 * f * Math.sin(2 * Math.PI * 6 * t)) * Math.min(1, t / 0.03, (len - t) / 0.06) * 0.02);
        }
      }
      b++;
    }
  }
  const f = Math.floor(0.3 * MR);
  for (let i = 0; i < f; i++) { out[i] *= i / f; out[total - 1 - i] *= i / f; }
  writeMusic('music_ironmoor', out, MR);
}

// Kitchen (Pantry Prep): a cosy café tune — soft electric-piano chords with tremolo, a walking upright bass,
// brushed snare, and a pot gently bubbling now and then.
{
  const bpm = 84;
  const beat = 60 / bpm;
  const BAR = 4 * beat;
  const N = {
    Fmaj7: [174.6, 220, 261.6, 329.6], Em7: [164.8, 196, 246.9, 293.7], Dm7: [146.8, 174.6, 220, 261.6],
    G7: [196, 246.9, 293.7, 349.2], Cmaj7: [130.8, 164.8, 196, 246.9], Am7: [110, 130.8, 164.8, 196],
  };
  const prog = ['Fmaj7', 'Em7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7'];
  const loops = 6; // 6 × 8 bars ≈ 2 min 17 s
  const rnd = seeded(5);
  const total = Math.floor(loops * prog.length * BAR * MR);
  const out = new Float32Array(total);
  const keys = (f, t) => (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t) * Math.exp(-3 * t)) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 4.5 * t));
  for (let l = 0; l < loops; l++) {
    prog.forEach((name, bi) => {
      const chord = N[name];
      const start = Math.floor((l * prog.length + bi) * BAR * MR);
      // Soft chords on beat 1 and the "and" of 2 (a little swing).
      for (const at of [0, 1.66]) {
        addTo(out, start + Math.floor(at * beat * MR), Math.floor(beat * 2.2 * MR), (t) => {
          let v = 0;
          for (const f of chord) v += keys(f * 2, t);
          return (v / chord.length) * Math.exp(-1.6 * t) * Math.min(1, t / 0.01) * (at ? 0.022 : 0.03);
        });
      }
      // Walking bass, one note per beat.
      for (let k = 0; k < 4; k++) {
        const f = [chord[0], chord[1], chord[2], chord[1] * 1.06][k] / 2;
        addTo(out, start + Math.floor(k * beat * MR), Math.floor(beat * 0.9 * MR), (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-3.2 * t) * Math.min(1, t / 0.008) * 0.065);
        // Brushed snare: soft swish on 2 and 4, light tap on 1 and 3.
        addTo(out, start + Math.floor(k * beat * MR), Math.floor(0.2 * MR), (t) => (rnd() * 2 - 1) * Math.exp(-(k % 2 ? 16 : 40) * t) * (k % 2 ? 0.022 : 0.01));
      }
      // Now and then, the pot bubbles (little rising blips).
      if (rnd() < 0.3) {
        for (let n = 0; n < 4; n++) {
          const f0 = 500 + rnd() * 400;
          addTo(out, start + Math.floor((1 + rnd() * 2.5) * beat * MR), Math.floor(0.06 * MR), (t) => Math.sin(2 * Math.PI * (f0 + 3000 * t) * t) * Math.exp(-50 * t) * 0.01);
        }
      }
    });
  }
  const f = Math.floor(0.3 * MR);
  for (let i = 0; i < f; i++) { out[i] *= i / f; out[total - 1 - i] *= i / f; }
  writeMusic('music_kitchen', out, MR);
}

// Coalhaven: a gentle harbour waltz (3/4). Reedy accordion-like chords, soft waves, a far-off foghorn.
{
  const beat = 60 / 84;
  const bar = 3 * beat;
  const N = {
    G: [196, 246.9, 293.7], Em: [164.8, 196, 246.9], C: [130.8, 164.8, 196], D: [146.8, 185, 220],
    Am: [110, 130.8, 164.8], Bm: [123.5, 146.8, 185],
  };
  // 4 bars per line, 2 lines per section.
  const sections = [
    { bars: ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D'], mel: false },
    { bars: ['G', 'Em', 'C', 'D', 'G', 'C', 'D', 'G'], mel: true },
    { bars: ['Em', 'C', 'G', 'D', 'Em', 'Bm', 'C', 'D'], mel: true },
    { bars: ['C', 'G', 'Am', 'D', 'C', 'G', 'D', 'G'], mel: false },
    { bars: ['G', 'Em', 'C', 'D', 'G', 'C', 'D', 'G'], mel: true },
    { bars: ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D'], mel: false },
  ];
  const rnd = seeded(11);
  const SCALE = [392, 440, 493.9, 587.3, 659.3, 784];
  const totalBars = sections.reduce((n, s) => n + s.bars.length, 0);
  const total = Math.floor(totalBars * bar * MR);
  const out = new Float32Array(total);
  // Reedy "accordion" tone with a slow wobble.
  const reed = (f, t) => (Math.sin(2 * Math.PI * f * t) + 0.45 * Math.sin(4 * Math.PI * f * t) + 0.22 * Math.sin(6 * Math.PI * f * t)) * (0.9 + 0.1 * Math.sin(2 * Math.PI * 5.5 * t));
  let b = 0;
  for (const sec of sections) {
    for (const name of sec.bars) {
      const chord = N[name];
      const start = Math.floor(b * bar * MR);
      // Oom (bass on beat 1)…
      addTo(out, start, Math.floor(beat * 1.6 * MR), (t) => Math.sin(2 * Math.PI * (chord[0] / 2) * t) * Math.exp(-2.4 * t) * Math.min(1, t / 0.01) * 0.07);
      // …pah-pah (soft chords on beats 2 and 3).
      for (const k of [1, 2]) {
        addTo(out, start + Math.floor(k * beat * MR), Math.floor(beat * 0.95 * MR), (t) => {
          let v = 0;
          for (const f of chord) v += reed(f, t);
          return (v / chord.length) * Math.min(1, t / 0.03) * Math.exp(-3 * t) * 0.03;
        });
      }
      // A sea-shanty-ish melody on some lines.
      if (sec.mel) {
        const times = rnd() < 0.5 ? [0, 2] : [0, 1, 2];
        for (const k of times) {
          const near = SCALE.filter((f) => chord.some((c) => Math.abs(Math.log2(f / c) - Math.round(Math.log2(f / c))) < 0.02));
          const pool = near.length && rnd() < 0.75 ? near : SCALE;
          const f = pool[Math.floor(rnd() * pool.length)];
          addTo(out, start + Math.floor(k * beat * MR), Math.floor(beat * 1.3 * MR), (t) => reed(f, t) * Math.min(1, t / 0.02) * Math.exp(-2.2 * t) * 0.022);
        }
      }
      b++;
    }
  }
  // Waves: only TWO per loop, and each one different (owner: constant waves got annoying).
  // Placed so they never overlap the foghorns (~24 s and ~70 s).
  {
    const wr = seeded(77);
    const lowNoise = (cutoff) => { let y = 0; const a = 1 - Math.exp((-2 * Math.PI * cutoff) / MR); return () => { y += a * ((wr() * 2 - 1) - y); return y; }; };
    // Wave 1 (~10 s): one long, slow wave rolling up the shingle and sliding back — "shhhhh…".
    {
      const n = lowNoise(260); const hiss = lowNoise(1400);
      const len = 6.5;
      addTo(out, Math.floor(10 * MR), Math.floor(len * MR), (t) => {
        const rise = Math.min(1, t / 2.2) ** 2;            // rolls in
        const fall = Math.max(0, 1 - Math.max(0, t - 2.4) / (len - 2.4)); // slides back out
        const env = rise * fall * fall;
        return (n() * 0.05 + hiss() * 0.012 * fall) * env;
      });
    }
    // Wave 2 (~48 s): small waves lapping against the wooden pier — a few short, gentle splashes.
    {
      const laps = [0, 0.9, 1.7, 2.8, 3.5];
      laps.forEach((at, k) => {
        const n = lowNoise(700 + k * 60); const thud = lowNoise(160);
        const amp = 0.035 * (1 - k * 0.12);
        addTo(out, Math.floor((48 + at) * MR), Math.floor(0.9 * MR), (t) => {
          const env = Math.min(1, t / 0.04) * Math.exp(-5.5 * t);
          return (n() * amp + thud() * amp * 1.4 * Math.exp(-14 * t)) * env;
        });
      });
    }
  }
  // A far-off foghorn twice in the song.
  for (const at of [24, 70]) {
    addTo(out, Math.floor(at * MR), Math.floor(3.2 * MR), (t) =>
      (Math.sin(2 * Math.PI * 82 * t) + 0.5 * Math.sin(2 * Math.PI * 164 * t)) * Math.sin(Math.PI * Math.min(1, t / 3.2)) ** 2 * 0.03);
  }
  // Fade the very ends so the loop is seamless.
  const f = Math.floor(0.4 * MR);
  for (let i = 0; i < f; i++) { out[i] *= i / f; out[total - 1 - i] *= i / f; }
  writeMusic('music_coalhaven', out, MR);
}

// Bluecliff: airy and open. Rippling harp arpeggios, a soft high pad, sea wind, and a bell buoy far out on the water.
{
  const bpm = 76;
  const beat = 60 / bpm;
  const BAR = 4 * beat;
  const N = {
    D: [146.8, 185, 220], A: [110, 138.6, 164.8], Bm: [123.5, 146.8, 185], G: [98, 123.5, 146.8],
    Em: [164.8 / 2, 98, 123.5], Fsm: [92.5, 110, 138.6], Gmaj7: [98, 123.5, 146.8, 185], Asus: [110, 146.8, 164.8],
  };
  const sections = [
    { bars: ['D', 'A', 'Bm', 'G'], harp: true, pad: false, mel: false },
    { bars: ['D', 'A', 'Bm', 'G'], harp: true, pad: true, mel: false },
    { bars: ['G', 'D', 'Em', 'Asus'], harp: true, pad: true, mel: true },
    { bars: ['Bm', 'G', 'D', 'A'], harp: true, pad: true, mel: true },
    { bars: ['Gmaj7', 'D', 'Fsm', 'Bm'], harp: false, pad: true, mel: true },
    { bars: ['G', 'D', 'Em', 'Asus'], harp: true, pad: true, mel: false },
    { bars: ['D', 'A', 'Bm', 'G'], harp: true, pad: false, mel: true },
    { bars: ['D', 'A', 'G', 'D'], harp: true, pad: true, mel: false },
    // Second half (owner: space the sea sounds out — a longer song lets them come ~40 s apart).
    { bars: ['Bm', 'G', 'D', 'A'], harp: true, pad: false, mel: true },
    { bars: ['G', 'D', 'Em', 'Asus'], harp: true, pad: true, mel: true },
    { bars: ['Gmaj7', 'D', 'Fsm', 'Bm'], harp: true, pad: true, mel: false },
    { bars: ['D', 'A', 'Bm', 'G'], harp: false, pad: true, mel: true },
    { bars: ['G', 'D', 'Em', 'Asus'], harp: true, pad: true, mel: true },
    { bars: ['Bm', 'G', 'D', 'A'], harp: true, pad: true, mel: false },
    { bars: ['D', 'A', 'Bm', 'G'], harp: true, pad: false, mel: true },
    { bars: ['D', 'A', 'G', 'D'], harp: true, pad: true, mel: false },
  ];
  const rnd = seeded(23);
  /** The music itself, a little louder than before (owner: turn the music up). */
  const M = 1.4;
  const SCALE = [587.3, 659.3, 740, 880, 987.8, 1174.7]; // D major pentatonic, up high
  const totalBars = sections.reduce((n, s) => n + s.bars.length, 0);
  const total = Math.floor(totalBars * BAR * MR);
  const out = new Float32Array(total);
  const pluck = (f, t) => (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t) * Math.exp(-6 * t)) * Math.exp(-3.4 * t) * Math.min(1, t / 0.004);
  let b = 0;
  for (const sec of sections) {
    for (const name of sec.bars) {
      const chord = N[name];
      const start = Math.floor(b * BAR * MR);
      // Harp: chord notes rising and falling in eighth notes, two octaves up.
      if (sec.harp) {
        const up = [...chord.map((f) => f * 2), ...chord.map((f) => f * 4)];
        const pattern = [0, 1, 2, 3, 4, 3, 2, 1].map((k) => up[Math.min(k, up.length - 1)]);
        pattern.forEach((f, k) => addTo(out, start + Math.floor(k * (beat / 2) * MR), Math.floor(1.6 * MR), (t) => pluck(f, t) * 0.02 * M));
      }
      // Low root, gently.
      addTo(out, start, Math.floor(BAR * MR), (t) => Math.sin(2 * Math.PI * (chord[0] / 2 < 60 ? chord[0] : chord[0] / 2) * t) * Math.sin(Math.PI * (t / BAR)) ** 2 * 0.04 * M);
      // Soft high pad that breathes with the bar.
      if (sec.pad) addTo(out, start, Math.floor(BAR * MR), (t) => {
        let v = 0;
        for (const f of chord) v += Math.sin(2 * Math.PI * f * 2 * t) + 0.25 * Math.sin(2 * Math.PI * f * 3 * t);
        return (v / chord.length) * Math.sin(Math.PI * (t / BAR)) ** 1.6 * 0.03 * M;
      });
      // A few long, singing melody notes.
      if (sec.mel && rnd() < 0.85) {
        const near = SCALE.filter((f) => chord.some((c) => Math.abs(Math.log2(f / c) - Math.round(Math.log2(f / c))) < 0.02));
        const f = (near.length ? near : SCALE)[Math.floor(rnd() * (near.length || SCALE.length))];
        addTo(out, start + Math.floor(beat * MR * (rnd() < 0.5 ? 0 : 2)), Math.floor(2.4 * MR), (t) =>
          Math.sin(2 * Math.PI * f * t + 0.004 * Math.sin(2 * Math.PI * 5 * t) * f) * Math.min(1, t / 0.08) * Math.exp(-1.1 * t) * 0.018 * M);
      }
      b++;
    }
  }
  // Sea sounds: no constant noise any more (owner: it drowned the music). Instead, five separate
  // moments in the ~200 s song, about 40 s apart — three different waves and two different wind
  // gusts — all kept well under the music, with long music-only stretches in between.
  // v0.0.1.28: owner asked to take the sea sounds out entirely — kept here, switched off.
  const SEA = false;
  if (SEA) {
    const wr = seeded(91);
    /** Overall sea volume (owner: fewer, softer waves). */
    const S = 0.7;
    /** When each sea moment starts (s). */
    const AT = { wave1: 8, wind1: 48, wave2: 88, wind2: 128, wave3: 168 };
    /** Smoothed noise source: a one-pole low-pass at `cutoff` Hz. */
    const lowNoise = (cutoff) => { let y = 0; const a = 1 - Math.exp((-2 * Math.PI * cutoff) / MR); return () => { y += a * ((wr() * 2 - 1) - y); return y; }; };
    /** Band of noise between lo and hi Hz. */
    const bandNoise = (lo, hi) => { const a = lowNoise(hi); const b = lowNoise(lo); return () => a() - b(); };
    // Wave 1 (~6 s): one long, slow swell rolling in and sliding back out over the shingle.
    {
      const body = lowNoise(300); const hiss = bandNoise(900, 2600);
      const len = 7;
      addTo(out, Math.floor(AT.wave1 * MR), Math.floor(len * MR), (t) => {
        const rise = Math.min(1, t / 2.6) ** 2;
        const fall = Math.max(0, 1 - Math.max(0, t - 2.8) / (len - 2.8));
        return (body() * 0.045 + hiss() * 0.03 * fall * fall) * rise * fall * S;
      });
    }
    // Wind 1 (~30 s): a low, breathy gust that swells up and dies away.
    {
      const gust = bandNoise(220, 800);
      const len = 6;
      addTo(out, Math.floor(AT.wind1 * MR), Math.floor(len * MR), (t) => {
        const env = Math.sin(Math.PI * (t / len)) ** 2;
        const flutter = 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.7 * t);
        return gust() * 0.05 * env * flutter * S;
      });
    }
    // Wave 2 (~44 s): small waves lapping at the rocks — a few short, gentle splashes.
    {
      [0, 1.1, 2.0, 3.3].forEach((at, k) => {
        const n = bandNoise(500, 1800 + k * 150); const thud = lowNoise(170);
        const amp = 0.03 * (1 - k * 0.15) * S;
        addTo(out, Math.floor((AT.wave2 + at) * MR), Math.floor(1 * MR), (t) => {
          const env = Math.min(1, t / 0.05) * Math.exp(-5 * t);
          return (n() * amp + thud() * amp * 1.6 * Math.exp(-12 * t)) * env;
        });
      });
    }
    // Wind 2 (~74 s): a thin, high whistle over the cliff top, rising and falling in pitch.
    {
      const len = 5;
      let ph = 0;
      const air = bandNoise(1500, 3500);
      addTo(out, Math.floor(AT.wind2 * MR), Math.floor(len * MR), (t) => {
        const env = Math.sin(Math.PI * (t / len)) ** 3;
        ph += (2 * Math.PI * (620 + 140 * Math.sin(2 * Math.PI * 0.35 * t))) / MR;
        return (Math.sin(ph) * 0.006 + air() * 0.022) * env * S;
      });
    }
    // Wave 3 (~84 s): a wave breaking further out — a soft distant crash, then foam fizzing away.
    {
      const crash = lowNoise(450); const foam = bandNoise(2000, 5000);
      const len = 5;
      addTo(out, Math.floor(AT.wave3 * MR), Math.floor(len * MR), (t) => {
        const hit = Math.min(1, t / 0.6) * Math.exp(-1.6 * Math.max(0, t - 0.6));
        const fizz = Math.min(1, Math.max(0, t - 0.5) / 0.8) * Math.exp(-0.9 * Math.max(0, t - 1.3));
        return (crash() * 0.05 * hit + foam() * 0.018 * fizz * (0.7 + 0.3 * wr())) * S;
      });
    }
  }
  // A bell buoy far out on the water, rocking with the waves (rings twice, softly).
  for (const at of [28, 108, 188]) {
    for (const [d, amp] of [[0, 0.02], [1.6, 0.012]]) {
      addTo(out, Math.floor((at + d) * MR), Math.floor(4 * MR), (t) =>
        (Math.sin(2 * Math.PI * 392 * t) + 0.6 * Math.sin(2 * Math.PI * 392 * 2.4 * t) * Math.exp(-3 * t) + 0.3 * Math.sin(2 * Math.PI * 392 * 0.5 * t)) * Math.exp(-1.2 * t) * Math.min(1, t / 0.004) * amp);
    }
  }
  const f = Math.floor(0.4 * MR);
  for (let i = 0; i < f; i++) { out[i] *= i / f; out[total - 1 - i] *= i / f; }
  writeMusic('music_bluecliff', out, MR);
}

// Cinderpeak: a warm market song on the volcano. Hand drums (a deep "dum" and a bright "tek" in a
// lilting market rhythm), a low drone like a bowed string, a plucked lute melody in a warm, spicy
// scale, a soft shaker, and the odd crackle of embers.
{
  const bpm = 100;
  const beat = 60 / bpm;
  const BAR = 4 * beat;
  const E8 = beat / 2;
  // E "hijaz" — the bright, spicy market scale.
  const SCALE = [329.6, 349.2, 415.3, 440, 493.9, 523.3, 587.3, 659.3];
  const ROOTS = { E: 82.4, F: 87.3, Dm: 73.4, G: 98, A: 110 };
  const lines = [
    { bars: ['E', 'E', 'F', 'E'], lute: false, shaker: false },
    { bars: ['E', 'F', 'E', 'E'], lute: true, shaker: false },
    { bars: ['Dm', 'E', 'F', 'E'], lute: true, shaker: true },
    { bars: ['A', 'G', 'F', 'E'], lute: true, shaker: true },
    { bars: ['E', 'F', 'E', 'E'], lute: false, shaker: true },
    { bars: ['Dm', 'E', 'G', 'F'], lute: true, shaker: true },
    { bars: ['A', 'G', 'F', 'E'], lute: true, shaker: false },
    { bars: ['E', 'F', 'E', 'E'], lute: false, shaker: false },
  ];
  const rnd = seeded(77);
  const totalBars = lines.length * 4;
  const total = Math.floor(totalBars * BAR * MR);
  const out = new Float32Array(total);
  // Market rhythm (in eighths): DUM tek . tek DUM . tek .
  const PATTERN = ['D', 'T', '', 'T', 'D', '', 'T', ''];
  const pluck = (f, t) => {
    let v = 0;
    for (let h = 1; h <= 5; h++) v += Math.sin(2 * Math.PI * f * h * t) * Math.exp(-(3 + h * 2.5) * t) / h;
    return v * Math.min(1, t / 0.002);
  };
  let b = 0;
  let note = 4;
  for (const line of lines) {
    for (const name of line.bars) {
      const root = ROOTS[name];
      const start = Math.floor(b * BAR * MR);
      // Hand drums.
      PATTERN.forEach((hit, k) => {
        const at = start + Math.floor(k * E8 * MR);
        if (hit === 'D') addTo(out, at, Math.floor(0.35 * MR), (t) => Math.sin(2 * Math.PI * (120 - 55 * Math.min(1, t * 8)) * t) * Math.exp(-11 * t) * 0.11);
        if (hit === 'T') {
          const r2 = seeded(1000 + k);
          addTo(out, at, Math.floor(0.09 * MR), (t) => ((r2() * 2 - 1) * 0.6 + Math.sin(2 * Math.PI * 1300 * t) * 0.4) * Math.exp(-45 * t) * 0.035);
        }
        // A soft shaker on every eighth.
        if (line.shaker) {
          const r3 = seeded(2000 + k + b);
          addTo(out, at + Math.floor(0.01 * MR), Math.floor(0.06 * MR), (t) => (r3() * 2 - 1) * Math.exp(-60 * t) * (k % 2 ? 0.008 : 0.012));
        }
      });
      // Low drone: root + fifth, swelling through the bar.
      addTo(out, start, Math.floor(BAR * MR), (t) =>
        (Math.sin(2 * Math.PI * root * t) + 0.5 * Math.sin(2 * Math.PI * root * 1.5 * t) + 0.25 * Math.sin(2 * Math.PI * root * 2 * t))
        * Math.sin(Math.PI * (t / BAR)) ** 2 * 0.03);
      // Plucked lute: a little run of eighths that steps around the scale.
      if (line.lute) {
        for (let k = 0; k < 8; k++) {
          if (rnd() < (k % 2 ? 0.45 : 0.15)) continue;
          note = Math.max(0, Math.min(SCALE.length - 1, note + [-2, -1, -1, 0, 1, 1, 2][Math.floor(rnd() * 7)]));
          const f = SCALE[note] / 2;
          addTo(out, start + Math.floor(k * E8 * MR), Math.floor(0.9 * MR), (t) => pluck(f, t) * 0.035);
        }
      }
      // Ember crackle: a few tiny pops now and then.
      for (let i = 0; i < 3; i++) {
        if (rnd() < 0.5) continue;
        const at = start + Math.floor(rnd() * BAR * MR);
        const amp = 0.01 + rnd() * 0.015;
        const r4 = seeded(3000 + b * 7 + i);
        addTo(out, at, Math.floor(0.012 * MR), (t) => (r4() * 2 - 1) * Math.exp(-300 * t) * amp);
      }
      b++;
    }
  }
  // Start and end in silence.
  const f = Math.floor(0.4 * MR);
  for (let i = 0; i < f; i++) { out[i] *= i / f; out[total - 1 - i] *= i / f; }
  writeMusic('music_cinderpeak', out, MR);
}

// ---------- The far Frontier: Frosthold, Voidreach, Starfall Crater, Celestine Spires, the Primordial Rift ----------
// Shared little instruments for these songs (all at MR = 11,025 Hz to keep the files small).
const fx = {
  /** A soft held chord: each note a sine with a gentle 2nd harmonic, swelling in and out. */
  pad(out, start, len, freqs, amp, vib = 0) {
    addTo(out, start, len, (t) => {
      let v = 0;
      for (const f of freqs) v += Math.sin(2 * Math.PI * f * t + vib * Math.sin(2 * Math.PI * 5 * t)) + 0.2 * Math.sin(4 * Math.PI * f * t);
      return (v / freqs.length) * Math.sin(Math.PI * Math.min(1, t / (len / MR))) ** 2 * amp;
    });
  },
  /** Music box / celesta: bright, bell-like, quick to fade. */
  bell(out, at, f, amp, decay = 3.5) {
    addTo(out, at, Math.floor(2.2 * MR), (t) => (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 4.01 * t) * Math.exp(-6 * t)) * Math.exp(-decay * t) * Math.min(1, t / 0.003) * amp);
  },
  /** Plucked string (guitar / lute). */
  pluck(out, at, f, amp) {
    addTo(out, at, Math.floor(1.1 * MR), (t) => {
      let v = 0;
      for (let h = 1; h <= 5; h++) v += Math.sin(2 * Math.PI * f * h * t) * Math.exp(-(2.5 + h * 2) * t) / h;
      return v * Math.min(1, t / 0.002) * amp;
    });
  },
  /** A bowed / breathy melody note with vibrato (fiddle when bright, flute when soft). */
  bow(out, at, f, len, amp, bright = 0.5, breath = 0) {
    const rb = seeded(Math.floor(f * 100 + at));
    addTo(out, at, len, (t) => {
      const vib = Math.sin(2 * Math.PI * 5.2 * t) * 0.006 * Math.min(1, t / 0.25);
      const ph = 2 * Math.PI * f * t * (1 + vib);
      const tone = Math.sin(ph) + bright * 0.5 * Math.sin(2 * ph) + bright * 0.25 * Math.sin(3 * ph);
      const env = Math.min(1, t / 0.08) * Math.min(1, (len / MR - t) / 0.12);
      return (tone + breath * (rb() * 2 - 1)) * env * amp;
    });
  },
  /** Low drum: a pitch-dropping thump. */
  drum(out, at, amp, pitch = 90) {
    addTo(out, at, Math.floor(0.45 * MR), (t) => Math.sin(2 * Math.PI * (pitch - pitch * 0.5 * Math.min(1, t * 6)) * t) * Math.exp(-8 * t) * amp);
  },
  /** Little bells shaken (sleigh bells / chimes). */
  jingle(out, at, amp, seed) {
    const rj = seeded(seed);
    for (let k = 0; k < 4; k++) {
      const f = 2600 + rj() * 1800;
      addTo(out, at + Math.floor(k * 0.012 * MR), Math.floor(0.25 * MR), (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-18 * t) * amp);
    }
  },
  /** Turn a whole song up or down (to sit level with the other town songs). */
  gain(out, g) { for (let i = 0; i < out.length; i++) out[i] *= g; },
  /** Fade the ends so every song starts and ends in silence. */
  ends(out) {
    const f = Math.floor(0.5 * MR);
    for (let i = 0; i < f; i++) { out[i] *= i / f; out[out.length - 1 - i] *= i / f; }
  },
};
const N = (name) => 440 * Math.pow(2, ({ C: -9, Db: -8, D: -7, Eb: -6, E: -5, F: -4, Gb: -3, G: -2, Ab: -1, A: 0, Bb: 1, B: 2 })[name.replace(/\d/, '')] / 12) * Math.pow(2, Number(name.slice(-1)) - 4);

// Frosthold: a snowy lullaby in 3/4 — a music box tune, a soft "ooh" choir, sleigh bells, a slow waltz bass.
{
  const bpm = 84, beat = 60 / bpm, BAR = 3 * beat;
  const fix = { 'F#3': N('Gb3'), 'C#3': N('Db3') };
  const ch = [['D3', 'F#3', 'A3'], ['B2', 'D3', 'F#3'], ['G2', 'B2', 'D3'], ['A2', 'C#3', 'E3']].map((c) => c.map((n) => fix[n] ?? N(n)));
  const tune = ['A5', 'F#5', 'D5', 'E5', 'F#5', 'G5', 'F#5', 'E5', 'D5', 'B4', 'C#5', 'D5', 'E5', 'A4', 'B4', 'C#5', 'D5', 'F#5', 'E5', 'D5'].map((n) => ({ 'F#5': N('Gb5'), 'C#5': N('Db5') })[n] ?? N(n));
  const bars = 48;
  const out = new Float32Array(Math.floor(bars * BAR * MR) + MR * 2);
  let k = 0;
  for (let b = 0; b < bars; b++) {
    const c = ch[b % 4];
    const start = Math.floor(b * BAR * MR);
    const section = Math.floor(b / 8);
    fx.pad(out, start, Math.floor(BAR * MR * 1.05), c.map((f) => f * 2), 0.028, 0.002);
    // waltz bass: root on 1, chord softly on 2 and 3
    fx.pluck(out, start, c[0] / 2, 0.05);
    fx.pluck(out, start + Math.floor(beat * MR), c[1], 0.018); fx.pluck(out, start + Math.floor(2 * beat * MR), c[2], 0.018);
    // music box tune (rests in the 1st and 5th sections)
    if (section !== 0 && section !== 4) for (let i = 0; i < 3; i++) if ((b + i) % 5 !== 4) { fx.bell(out, start + Math.floor(i * beat * MR), tune[k++ % tune.length], 0.03); }
    // sleigh bells on the downbeat in the busier sections
    if (section >= 2 && section <= 4) fx.jingle(out, start, 0.006, 500 + b);
  }
  fx.gain(out, 1.55);
  fx.ends(out);
  writeMusic('music_frosthold', out, MR);
}

// Voidreach: slow and spacey. Deep drone, glassy bells that echo back (quieter each time), and soft swells.
{
  const beat = 60 / 64, BAR = 4 * beat;
  const roots = [N('D2'), N('Bb1'), N('F2'), N('C2')];
  const scale = [N('D5'), N('E5'), N('F5'), N('A5'), N('C6'), N('D6'), N('A4')];
  const bars = 32;
  const out = new Float32Array(Math.floor(bars * BAR * MR) + MR * 3);
  const rnd = seeded(91);
  for (let b = 0; b < bars; b++) {
    const root = roots[Math.floor(b / 2) % 4];
    const start = Math.floor(b * BAR * MR);
    if (b % 2 === 0) fx.pad(out, start, Math.floor(BAR * 2 * MR), [root * 2, root * 3, root * 4.5], 0.03, 0.003);
    addTo(out, start, Math.floor(BAR * MR), (t) => Math.sin(2 * Math.PI * root * t) * 0.025 * (0.7 + 0.3 * Math.sin(2 * Math.PI * 0.25 * t)));
    // a bell or two each bar, each with three echoes a beat apart
    for (let i = 0; i < 2; i++) {
      if (rnd() < 0.35) continue;
      const f = scale[Math.floor(rnd() * scale.length)];
      const at = start + Math.floor((i * 2 + (rnd() < 0.5 ? 0 : 1)) * beat * MR);
      for (let e = 0; e < 4; e++) fx.bell(out, at + Math.floor(e * beat * 0.75 * MR), f, 0.03 * Math.pow(0.45, e), 2.2);
    }
  }
  fx.gain(out, 1.35);
  fx.ends(out);
  writeMusic('music_voidreach', out, MR);
}

// Starfall Crater: a gentle folk tune — fingerpicked guitar, a sweet fiddle, a soft foot-tap, and the star's low hum.
{
  const beat = 60 / 92, BAR = 4 * beat, E8 = beat / 2;
  const ch = [['G2', 'B2', 'D3', 'G3'], ['C3', 'E3', 'G3', 'C4'], ['D3', 'Gb3', 'A3', 'D4'], ['G2', 'B2', 'D3', 'G3'],
    ['E2', 'G2', 'B2', 'E3'], ['C3', 'E3', 'G3', 'C4'], ['D3', 'Gb3', 'A3', 'D4'], ['G2', 'B2', 'D3', 'G3']].map((c) => c.map(N));
  const tune = ['B4', 'D5', 'E5', 'D5', 'B4', 'A4', 'G4', 'A4', 'B4', 'D5', 'G5', 'Gb5', 'E5', 'D5', 'B4', 'A4'].map(N);
  const bars = 48;
  const out = new Float32Array(Math.floor(bars * BAR * MR) + MR * 2);
  const HUM = N('G2');
  let k = 0;
  for (let b = 0; b < bars; b++) {
    const c = ch[b % 8];
    const start = Math.floor(b * BAR * MR);
    const section = Math.floor(b / 8);
    // the star's hum, always there
    addTo(out, start, Math.floor(BAR * MR), (t) => (Math.sin(2 * Math.PI * HUM * t) + 0.4 * Math.sin(2 * Math.PI * HUM * 2 * t)) * 0.012);
    // fingerpicking: root, 3rd, 5th, octave, 5th, 3rd, 5th, octave
    [0, 1, 2, 3, 2, 1, 2, 3].forEach((n, i) => fx.pluck(out, start + Math.floor(i * E8 * MR), c[n], i === 0 ? 0.045 : 0.025));
    // a soft foot-tap on 1 and 3
    if (section >= 1) { fx.drum(out, start, 0.05, 70); fx.drum(out, start + Math.floor(2 * beat * MR), 0.04, 70); }
    // the fiddle: two long notes a bar, rests in the 1st and last section
    if (section >= 1 && section <= 4) for (let i = 0; i < 2; i++) fx.bow(out, start + Math.floor(i * 2 * beat * MR), tune[k++ % tune.length], Math.floor(beat * 1.9 * MR), 0.022, 0.7);
  }
  fx.ends(out);
  writeMusic('music_starfall', out, MR);
}

// Celestine Spires: airy and bright — rippling celesta arpeggios, a high pad, and wind chimes on the breeze. No drums.
{
  const beat = 60 / 76, BAR = 4 * beat, E8 = beat / 2;
  const ch = [['F3', 'A3', 'C4', 'E4'], ['D3', 'F3', 'A3', 'C4'], ['Bb2', 'D3', 'F3', 'A3'], ['C3', 'E3', 'G3', 'Bb3']].map((c) => c.map(N));
  const bars = 36;
  const out = new Float32Array(Math.floor(bars * BAR * MR) + MR * 3);
  const rnd = seeded(33);
  for (let b = 0; b < bars; b++) {
    const c = ch[b % 4];
    const start = Math.floor(b * BAR * MR);
    fx.pad(out, start, Math.floor(BAR * MR * 1.1), c.map((f) => f * 2), 0.022, 0.004);
    // arpeggio up and back down, an octave up
    [0, 1, 2, 3, 2, 3, 1, 2].forEach((n, i) => fx.bell(out, start + Math.floor(i * E8 * MR), c[n] * 2, 0.022, 4.5));
    // wind chimes: a few random high notes drifting in
    for (let i = 0; i < 3; i++) if (rnd() < 0.5) fx.bell(out, start + Math.floor(rnd() * BAR * MR), [N('C6'), N('E6'), N('G6'), N('A6'), N('D7')][Math.floor(rnd() * 5)], 0.012, 2.5);
  }
  fx.gain(out, 2.1);
  fx.ends(out);
  writeMusic('music_celestine', out, MR);
}

// The Primordial Rift: old and wild — a deep frame drum, a buzzing low drone, a breathy wooden flute,
// and the slow "first song" hum that every other town has been echoing.
{
  const beat = 60 / 70, BAR = 4 * beat;
  const pent = ['D4', 'F4', 'G4', 'A4', 'C5', 'D5'].map(N);
  const bars = 34;
  const out = new Float32Array(Math.floor(bars * BAR * MR) + MR * 3);
  const rnd = seeded(7);
  const D = N('D2');
  let note = 2;
  for (let b = 0; b < bars; b++) {
    const start = Math.floor(b * BAR * MR);
    const section = Math.floor(b / 8);
    // drone with a slow "wah" like a didgeridoo
    addTo(out, start, Math.floor(BAR * MR), (t) => {
      const w = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * t);
      return (Math.sin(2 * Math.PI * D * t) + w * 0.45 * Math.sin(2 * Math.PI * D * 3 * t) + (1 - w) * 0.3 * Math.sin(2 * Math.PI * D * 5 * t)) * 0.026;
    });
    // frame drum: DUM . . dum | DUM . dum .
    if (section >= 1) { fx.drum(out, start, 0.09, 75); fx.drum(out, start + Math.floor(1.5 * beat * MR), 0.04, 95); fx.drum(out, start + Math.floor(2 * beat * MR), 0.07, 75); fx.drum(out, start + Math.floor(3 * beat * MR), 0.035, 95); }
    // the first song: a slow hummed melody every other bar
    if (b % 2 === 0) fx.pad(out, start, Math.floor(BAR * 2 * MR), [N('D3'), N('A3')], 0.02, 0.004);
    // wooden flute phrases in the middle sections
    if (section >= 1 && section <= 3) {
      for (let i = 0; i < 4; i++) {
        if (rnd() < 0.3) continue;
        note = Math.max(0, Math.min(pent.length - 1, note + [-2, -1, 0, 1, 1, 2][Math.floor(rnd() * 6)]));
        fx.bow(out, start + Math.floor(i * beat * MR), pent[note], Math.floor(beat * 0.95 * MR), 0.024, 0.15, 0.25);
      }
    }
  }
  fx.ends(out);
  writeMusic('music_rift', out, MR);
}

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
  writeMusic('music_mahjong', out);
}

console.log('Placeholder sounds written to', OUT);
