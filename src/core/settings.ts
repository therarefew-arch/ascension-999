// Player preferences (not part of the game save, so they never affect progress).
export interface Settings {
  master: number;
  effects: number;
  music: number;
  /** 🔉 The sounds idling makes (each chop, swing, hit…), on top of the effects volume. */
  idle: number;
  /** Gentle vibration on level-ups and good hits (phones that support it). */
  vibrate: boolean;
  /** 🔔 Notifications on this device while the game is closed. */
  notify: { on: boolean; idle: boolean; farm: boolean };
}

export const DEFAULT_SETTINGS: Settings = {
  master: 0.8, effects: 0.7, music: 0.4, idle: 1, vibrate: true,
  notify: { on: false, idle: true, farm: true },
};
