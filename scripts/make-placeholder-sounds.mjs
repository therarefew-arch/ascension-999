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

console.log('Placeholder sounds written to', OUT);
