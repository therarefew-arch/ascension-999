// Every sound the game knows about. Files live in public/assets/sounds/.
// To use a real sound, add e.g. "mine.mp3" there — it is used instead of the placeholder "mine.wav".

export type SoundKey =
  | 'click' | 'mine' | 'smith' | 'levelup' | 'equip' | 'deposit' | 'error' | 'welcome'
  | 'chop' | 'splash' | 'sizzle' | 'crackle' | 'craft' | 'enchant' | 'fail' | 'hit' | 'hurt' | 'tile' | 'match'
  // per-tap minigame sounds
  | 'anvil' | 'pickaxe' | 'timber' | 'kindle' | 'ignite' | 'reel' | 'carve' | 'rune' | 'whoosh' | 'douse'
  | 'coin' | 'shing' | 'block' | 'eat' | 'fire_loop';
export type MusicKey = 'music_town' | 'music_mahjong' | 'music_ironmoor' | 'music_coalhaven' | 'music_bluecliff'
  | 'music_kitchen' | 'music_lunaria' | 'music_cinderpeak';

export const EFFECT_SOUNDS: SoundKey[] = [
  'click', 'mine', 'smith', 'levelup', 'equip', 'deposit', 'error', 'welcome',
  'chop', 'splash', 'sizzle', 'crackle', 'craft', 'enchant', 'fail', 'hit', 'hurt', 'tile', 'match',
  'anvil', 'pickaxe', 'timber', 'kindle', 'ignite', 'reel', 'carve', 'rune', 'whoosh', 'douse',
  'coin', 'shing', 'block', 'eat', 'fire_loop',
];
export const MUSIC_TRACKS: MusicKey[] = ['music_town', 'music_mahjong', 'music_ironmoor', 'music_coalhaven', 'music_bluecliff', 'music_kitchen', 'music_lunaria', 'music_cinderpeak'];

/** Each town's own background theme (Pocketvale keeps the original town song). */
const TOWN_MUSIC: Record<string, MusicKey> = { Ironmoor: 'music_ironmoor', Coalhaven: 'music_coalhaven', Bluecliff: 'music_bluecliff', Lunaria: 'music_lunaria', Cinderpeak: 'music_cinderpeak' };
export const musicFor = (town: string): MusicKey => TOWN_MUSIC[town] ?? 'music_town';

/** File types tried in order. The first one that loads wins. */
export const SOUND_EXTENSIONS = ['mp3', 'ogg', 'm4a', 'wav'];
