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

const sounds = {
  click: tone([1100], 0.05, 0.08, 60),
  mine: mix(['', noise(0.05, 0.06, 80)], ['', tone([900, 1350], 0.18, 0.1, 25)]),
  smith: tone([1500, 2260, 3100], 0.35, 0.09, 12),
  levelup: mix(
    ['', tone([523], 0.3, 0.1, 6)], ['', tone([659], 0.3, 0.1, 6), 0.1],
    ['', tone([784], 0.3, 0.1, 6), 0.2], ['', tone([1047], 0.6, 0.1, 4), 0.3],
  ),
  equip: mix(['', tone([180, 270], 0.15, 0.14, 20)], ['', noise(0.04, 0.03, 60)]),
  deposit: mix(['', tone([660], 0.12, 0.08, 18)], ['', tone([880], 0.18, 0.08, 14), 0.08]),
  error: tone([220, 233], 0.2, 0.08, 14),
  chop: mix(['', noise(0.06, 0.08, 50)], ['', tone([220, 330], 0.15, 0.1, 22)]),
  splash: mix(['', noise(0.25, 0.05, 12)], ['', tone([700, 520], 0.12, 0.04, 25)]),
  sizzle: noise(0.35, 0.035, 6),
  crackle: mix(['', noise(0.03, 0.06, 90)], ['', noise(0.03, 0.05, 90), 0.09], ['', noise(0.03, 0.04, 90), 0.2]),
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
