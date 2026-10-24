// Sound system. Uses the Web Audio API so volume works on iPhones too.
// Volume chain: each sound → effects or music volume → master volume → speakers.
import { EFFECT_SOUNDS, MUSIC_TRACKS, SOUND_EXTENSIONS, type MusicKey, type SoundKey } from './soundList';
import type { Settings } from '../core/settings';

/** How many copies of one sound may overlap. */
const MAX_VOICES = 3;

const SOUND_DIR =`${import.meta.env.BASE_URL}assets/sounds/`;

class SoundSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private effects: GainNode | null = null;
  private music: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer | null>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private musicSource: AudioBufferSourceNode | null = null;
  private wantedMusic: MusicKey | null = null;
  private volumes: Settings = { master: 0.8, effects: 0.7, music: 0.4, vibrate: true };
  private lastPlayed = new Map<SoundKey, number>();
  private voices = new Map<SoundKey, { src: AudioBufferSourceNode; gain: GainNode }[]>();

  /** Browsers only allow sound after the player taps something, so this runs on the first tap. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.effects = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.effects.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
      for (const key of [...EFFECT_SOUNDS, ...MUSIC_TRACKS]) void this.load(key);
      if (this.wantedMusic) void this.startMusic(this.wantedMusic);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(v: Settings): void {
    this.volumes = v;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx || !this.master || !this.effects || !this.music) return;
    const t = this.ctx.currentTime;
    // Squared so the sliders feel natural to the ear.
    this.master.gain.setTargetAtTime(this.volumes.master ** 2, t, 0.05);
    this.effects.gain.setTargetAtTime(this.volumes.effects ** 2, t, 0.05);
    this.music.gain.setTargetAtTime(this.volumes.music ** 2, t, 0.05);
  }

  /** Tries name.mp3, name.ogg, name.m4a, then name.wav. Missing files are simply skipped. */
  private load(key: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(key)) return Promise.resolve(this.buffers.get(key)!);
    const existing = this.loading.get(key);
    if (existing) return existing;
    const p = (async () => {
      for (const ext of SOUND_EXTENSIONS) {
        try {
          const res = await fetch(`${SOUND_DIR}${key}.${ext}`);
          if (!res.ok) continue;
          const type = res.headers.get('content-type') ?? '';
          if (type.includes('text/html')) continue; // dev server answers missing files with the page
          const data = await res.arrayBuffer();
          const buf = await this.ctx!.decodeAudioData(data);
          this.buffers.set(key, buf);
          return buf;
        } catch {
          // try the next file type
        }
      }
      this.buffers.set(key, null);
      return null;
    })();
    this.loading.set(key, p);
    return p;
  }

  /**
   * Plays a sound effect.
   * - rate: pitch/speed (1 = normal, 1.12 ≈ two notes higher)
   * - volume: 0..1 (default 1)
   * Every play gets a tiny random pitch change so repeated taps never sound robotic.
   */
  play(key: SoundKey, opts: { rate?: number; volume?: number; exact?: boolean } = {}): void {
    if (!this.ctx || !this.effects || this.ctx.state !== 'running') return;
    // Avoid the same sound stacking up if many happen at once.
    const now = performance.now();
    if (now - (this.lastPlayed.get(key) ?? 0) < 35) return;
    this.lastPlayed.set(key, now);
    const buf = this.buffers.get(key);
    if (!buf) { void this.load(key); return; }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const vary = opts.exact ? 1 : 1 + (Math.random() - 0.5) * 0.07;
    src.playbackRate.value = (opts.rate ?? 1) * vary;
    const g = this.ctx.createGain();
    g.gain.value = opts.volume ?? 1;
    src.connect(g);
    g.connect(this.effects);
    // At most a few copies of the same sound at once: fast tapping fades out the oldest
    // instead of piling up into noise.
    const voices = this.voices.get(key) ?? [];
    while (voices.length >= MAX_VOICES) {
      const old = voices.shift()!;
      old.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
      try { old.src.stop(this.ctx.currentTime + 0.08); } catch { /* already stopped */ }
    }
    const voice = { src, gain: g };
    voices.push(voice);
    this.voices.set(key, voices);
    src.onended = () => {
      const list = this.voices.get(key);
      if (list) this.voices.set(key, list.filter((v) => v !== voice));
    };
    src.start();
  }

  /**
   * Starts a looping effect (reel winding, fire ambience).
   * Returns a function that stops it; `.setVolume(v)` changes its loudness smoothly.
   */
  loop(key: SoundKey, volume = 1): (() => void) & { setVolume: (v: number) => void } {
    let src: AudioBufferSourceNode | null = null;
    let gain: GainNode | null = null;
    let stopped = false;
    const begin = (buf: AudioBuffer | null) => {
      if (stopped || !buf || !this.ctx || !this.effects) return;
      src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      gain = this.ctx.createGain();
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.04);
      src.connect(gain);
      gain.connect(this.effects);
      src.start();
    };
    if (this.ctx && this.ctx.state === 'running') {
      const buf = this.buffers.get(key);
      if (buf) begin(buf); else void this.load(key).then(begin);
    }
    const stop = () => {
      stopped = true;
      if (src && gain && this.ctx) {
        gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        const s = src;
        setTimeout(() => { try { s.stop(); } catch { /* already stopped */ } }, 300);
      }
      src = null;
    };
    return Object.assign(stop, {
      setVolume: (v: number) => {
        volume = v;
        if (gain && this.ctx) gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.08);
      },
    });
  }

  playMusic(key: MusicKey): void {
    if (this.wantedMusic === key && this.musicSource) return;
    this.wantedMusic = key;
    if (this.ctx) void this.startMusic(key);
  }

  private async startMusic(key: MusicKey) {
    const buf = await this.load(key);
    if (!buf || !this.ctx || !this.music || this.wantedMusic !== key) return;
    this.musicSource?.stop();
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.music);
    src.start();
    this.musicSource = src;
  }

  /** Pause everything when the app goes to the background. */
  suspend(): void {
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }
}

export const sound = new SoundSystem();
