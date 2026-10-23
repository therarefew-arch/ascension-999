// Sound system. Uses the Web Audio API so volume works on iPhones too.
// Volume chain: each sound → effects or music volume → master volume → speakers.
import { EFFECT_SOUNDS, MUSIC_TRACKS, SOUND_EXTENSIONS, type MusicKey, type SoundKey } from './soundList';
import type { Settings } from '../core/settings';

const SOUND_DIR = `${import.meta.env.BASE_URL}assets/sounds/`;

class SoundSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private effects: GainNode | null = null;
  private music: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer | null>();
  private loading = new Map<string, Promise<AudioBuffer | null>>();
  private musicSource: AudioBufferSourceNode | null = null;
  private wantedMusic: MusicKey | null = null;
  private volumes: Settings = { master: 0.8, effects: 0.7, music: 0.4 };
  private lastPlayed = new Map<SoundKey, number>();

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

  play(key: SoundKey): void {
    if (!this.ctx || !this.effects || this.ctx.state !== 'running') return;
    // Avoid the same sound stacking up if many happen at once.
    const now = performance.now();
    if (now - (this.lastPlayed.get(key) ?? 0) < 60) return;
    this.lastPlayed.set(key, now);
    const buf = this.buffers.get(key);
    if (!buf) { void this.load(key); return; }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.effects);
    src.start();
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
