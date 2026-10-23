// Every sound the game knows about. Files live in public/assets/sounds/.
// To use a real sound, add e.g. "mine.mp3" there — it is used instead of the placeholder "mine.wav".

export type SoundKey = 'click' | 'mine' | 'smith' | 'levelup' | 'equip' | 'deposit' | 'error' | 'welcome';
export type MusicKey = 'music_town';

export const EFFECT_SOUNDS: SoundKey[] = ['click', 'mine', 'smith', 'levelup', 'equip', 'deposit', 'error', 'welcome'];
export const MUSIC_TRACKS: MusicKey[] = ['music_town'];

/** File types tried in order. The first one that loads wins. */
export const SOUND_EXTENSIONS = ['mp3', 'ogg', 'm4a', 'wav'];
