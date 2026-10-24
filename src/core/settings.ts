// Player preferences (not part of the game save, so they never affect progress).
export interface Settings {
  master: number;
  effects: number;
  music: number;
  /** Gentle vibration on level-ups and good hits (phones that support it). */
  vibrate: boolean;
}

export const DEFAULT_SETTINGS: Settings = { master: 0.8, effects: 0.7, music: 0.4, vibrate: true };
