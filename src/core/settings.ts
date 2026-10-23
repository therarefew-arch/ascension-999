// Player preferences (not part of the game save, so they never affect progress).
export interface Settings {
  master: number;
  effects: number;
  music: number;
}

export const DEFAULT_SETTINGS: Settings = { master: 0.8, effects: 0.7, music: 0.4 };
