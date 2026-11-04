// 🌦️ Weather (v0.0.2.21, owner picked "daily weather"): every town has its own climate, and the sky changes
// every few hours on the phone's real clock. The weather where you are gives a couple of skills a little XP.
// Rules live in core/weather.ts. Never negative — bad weather is still cozy, it just favours other skills.
import type { SkillId } from './items';
import type { Region } from './tiers';

export type WeatherId =
  | 'sunny' | 'rain' | 'fog' | 'breezy' | 'grey' | 'storm' | 'snow' | 'heat' | 'ash' | 'starry' | 'aurora';

export interface WeatherDef {
  id: WeatherId;
  emoji: string;
  name: string;
  /** A short cozy line shown on the Town screen. */
  line: string;
  /** XP bonus (0.15 = +15%) for these skills while you're in a town with this weather. */
  boost: Partial<Record<SkillId, number>>;
  /** Lucky Stars come this many times as often. */
  stars?: number;
  /** Only at night (20:00–04:00 windows). */
  night?: boolean;
  /** What the town picture shows (CSS layer in ui/Weather.tsx). */
  sky: 'none' | 'rain' | 'fog' | 'wind' | 'snow' | 'storm' | 'heat' | 'ash' | 'stars' | 'aurora' | 'sun' | 'grey';
}

export const WEATHER_XP = 0.15;

export const WEATHER: Record<WeatherId, WeatherDef> = {
  sunny: { id: 'sunny', emoji: '☀️', name: 'Sunny', line: 'Warm light on the rooftops — a fine day to be outside.', boost: { farming: WEATHER_XP, woodcutting: WEATHER_XP }, sky: 'sun' },
  rain: { id: 'rain', emoji: '🌧️', name: 'Rain', line: 'Soft rain on the gardens. The fish are biting.', boost: { fishing: WEATHER_XP, farming: WEATHER_XP }, sky: 'rain' },
  fog: { id: 'fog', emoji: '🌫️', name: 'Fog', line: 'A thick fog rolls in. Herbs love the damp; runes hum in the hush.', boost: { herblore: WEATHER_XP, runecrafting: WEATHER_XP }, sky: 'fog' },
  breezy: { id: 'breezy', emoji: '💨', name: 'Breezy', line: 'A brisk wind fans every fire and shakes loose the branches.', boost: { firemaking: WEATHER_XP, woodcutting: WEATHER_XP }, sky: 'wind' },
  grey: { id: 'grey', emoji: '☁️', name: 'Grey skies', line: 'A grey, quiet day. Good for staying in at the workbench and the stove.', boost: { crafting: WEATHER_XP, cooking: WEATHER_XP }, sky: 'grey' },
  storm: { id: 'storm', emoji: '⛈️', name: 'Thunderstorm', line: 'Thunder rolls overhead. The air crackles with magic.', boost: { runecrafting: WEATHER_XP, enhancing: WEATHER_XP }, sky: 'storm' },
  snow: { id: 'snow', emoji: '❄️', name: 'Snow', line: 'Snow drifts down. Everyone crowds around the forge and the stew pot.', boost: { smithing: WEATHER_XP, cooking: WEATHER_XP }, sky: 'snow' },
  heat: { id: 'heat', emoji: '🥵', name: 'Heatwave', line: 'The air shimmers. Forges run hot and the ore glows.', boost: { smithing: WEATHER_XP, mining: WEATHER_XP }, sky: 'heat' },
  ash: { id: 'ash', emoji: '🌋', name: 'Ashfall', line: 'Fine ash drifts down from the peak. The rock splits easily today.', boost: { mining: WEATHER_XP, firemaking: WEATHER_XP }, sky: 'ash' },
  starry: { id: 'starry', emoji: '🌌', name: 'Starry night', line: 'Not a cloud in the sky. Lucky Stars fall twice as often.', boost: { enhancing: WEATHER_XP }, stars: 2, night: true, sky: 'stars' },
  aurora: { id: 'aurora', emoji: '🌠', name: 'Northern lights', line: 'Ribbons of light dance overhead. Everything feels possible.', boost: { enhancing: WEATHER_XP, runecrafting: WEATHER_XP, herblore: WEATHER_XP }, stars: 1.5, night: true, sky: 'aurora' },
};

/** Each town's climate: how often each weather comes (bigger = more often). */
export const CLIMATE: Record<Region, Partial<Record<WeatherId, number>>> = {
  'Pocketvale': { sunny: 4, rain: 3, breezy: 2, grey: 2, fog: 1, starry: 3 },
  'Ironmoor': { grey: 4, rain: 2, fog: 2, sunny: 1, storm: 1, starry: 1 },
  'Coalhaven': { fog: 4, rain: 3, grey: 2, storm: 1, starry: 1 },
  'Bluecliff': { breezy: 4, sunny: 2, storm: 2, rain: 2, starry: 2 },
  'Lunaria': { fog: 5, rain: 2, grey: 1, starry: 2 },
  'Cinderpeak': { heat: 4, ash: 4, sunny: 1, storm: 1, starry: 1 },
  'Frosthold': { snow: 5, breezy: 2, sunny: 1, aurora: 3, starry: 1 },
  'Voidreach': { fog: 2, storm: 2, grey: 1, starry: 5, aurora: 3 },
  'Starfall Crater': { sunny: 3, breezy: 1, heat: 1, starry: 6, aurora: 1 },
  'Celestine Spires': { breezy: 5, sunny: 2, storm: 1, aurora: 2, starry: 1 },
  'Primordial Rift': { rain: 4, fog: 2, sunny: 2, storm: 2, starry: 1 },
};
