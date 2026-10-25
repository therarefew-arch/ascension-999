// Hand-drawn SVG icons. Item icons are tinted per metal tier so every tier looks unique.
import { getItem, RARITY_COLORS, TIER_COLORS, type IconKind } from '../data/items';

interface Palette { main: string; light: string; dark: string }

const WOOD = { main: '#9a6a3c', dark: '#5e3d1f' };
const ROCK = { main: '#6d6458', light: '#8b8174', dark: '#423b33' };

function ItemShape({ kind, c }: { kind: IconKind; c: Palette }): JSX.Element {
  switch (kind) {
    case 'ore':
      return (
        <g>
          <path d="M8 34 L12 18 L24 10 L37 14 L42 30 L33 40 L15 41 Z" fill={ROCK.main} stroke={ROCK.dark} strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 18 L24 10 L37 14 L30 20 L18 22 Z" fill={ROCK.light} opacity="0.6" />
          <circle cx="19" cy="28" r="4" fill={c.main} stroke={c.dark} strokeWidth="1.2" />
          <circle cx="30" cy="25" r="3.2" fill={c.main} stroke={c.dark} strokeWidth="1.2" />
          <circle cx="27" cy="34" r="2.6" fill={c.main} stroke={c.dark} strokeWidth="1.2" />
          <circle cx="18" cy="27" r="1.2" fill={c.light} />
          <circle cx="29" cy="24" r="1" fill={c.light} />
        </g>
      );
    case 'bar':
      return (
        <g strokeLinejoin="round">
          <path d="M6 32 L14 20 L42 20 L42 22 L36 34 L6 34 Z" fill={c.dark} />
          <path d="M6 32 L12 22 L40 22 L34 32 Z" fill={c.light} stroke={c.dark} strokeWidth="2" />
          <path d="M6 32 L34 32 L34 37 L6 37 Z" fill={c.main} stroke={c.dark} strokeWidth="2" />
          <path d="M34 32 L40 22 L40 27 L34 37 Z" fill={c.main} stroke={c.dark} strokeWidth="2" />
          <path d="M14 25 L22 25" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case 'pickaxe':
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 40 L32 14" stroke={WOOD.dark} strokeWidth="6" />
          <path d="M14 40 L32 14" stroke={WOOD.main} strokeWidth="3.4" />
          <path d="M10 14 Q24 2 42 16 Q30 10 32 14 Q22 8 10 14 Z" fill={c.main} stroke={c.dark} strokeWidth="2" />
          <path d="M16 11 Q24 7 32 10" stroke={c.light} strokeWidth="1.6" fill="none" />
        </g>
      );
    case 'sword':
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M36 6 L40 8 L20 30 L17 27 Z" fill={c.light} stroke={c.dark} strokeWidth="2" />
          <path d="M37 8 L19 28" stroke={c.main} strokeWidth="1.5" />
          <path d="M12 24 L24 36" stroke={c.dark} strokeWidth="5" />
          <path d="M12 24 L24 36" stroke={c.main} strokeWidth="2.6" />
          <path d="M17 32 L10 39" stroke={WOOD.dark} strokeWidth="5" />
          <path d="M17 32 L10 39" stroke={WOOD.main} strokeWidth="2.6" />
          <circle cx="9" cy="40" r="2.6" fill={c.main} stroke={c.dark} strokeWidth="1.4" />
        </g>
      );
    case 'shield':
      return (
        <g strokeLinejoin="round">
          <path d="M24 5 L40 10 Q40 32 24 43 Q8 32 8 10 Z" fill={c.main} stroke={c.dark} strokeWidth="2.2" />
          <path d="M24 10 L35 13.5 Q35 30 24 37.5 Q13 30 13 13.5 Z" fill={c.dark} opacity="0.35" />
          <path d="M24 10 L24 37" stroke={c.light} strokeWidth="2" opacity="0.7" />
          <circle cx="24" cy="21" r="4" fill={c.light} stroke={c.dark} strokeWidth="1.5" />
        </g>
      );
    case 'helmet':
      return (
        <g strokeLinejoin="round">
          <path d="M9 30 Q9 9 24 8 Q39 9 39 30 L39 38 L9 38 Z" fill={c.main} stroke={c.dark} strokeWidth="2.2" />
          <path d="M14 23 L34 23 L34 27 L14 27 Z" fill={c.dark} />
          <path d="M24 8 L24 22" stroke={c.light} strokeWidth="2.4" />
          <path d="M14 14 Q18 10 22 10" stroke={c.light} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'chest':
      return (
        <g strokeLinejoin="round">
          <path d="M14 7 L20 9 Q24 12 28 9 L34 7 L42 13 L38 22 L36 20 L36 41 L12 41 L12 20 L10 22 L6 13 Z" fill={c.main} stroke={c.dark} strokeWidth="2.2" />
          <path d="M24 13 L24 40" stroke={c.dark} strokeWidth="1.6" opacity="0.6" />
          <path d="M16 18 Q24 22 32 18" stroke={c.light} strokeWidth="1.8" fill="none" />
          <path d="M15 30 L33 30" stroke={c.dark} strokeWidth="1.6" opacity="0.5" />
        </g>
      );
    case 'legs':
      return (
        <g strokeLinejoin="round">
          <path d="M11 7 L37 7 L39 42 L28 42 L24 18 L20 42 L9 42 Z" fill={c.main} stroke={c.dark} strokeWidth="2.2" />
          <path d="M11 12 L37 12" stroke={c.dark} strokeWidth="2" />
          <path d="M14 18 L13 38 M34 18 L35 38" stroke={c.light} strokeWidth="1.6" opacity="0.7" strokeLinecap="round" />
        </g>
      );
    case 'gem':
      return (
        <g strokeLinejoin="round">
          <path d="M12 16 L18 9 L30 9 L36 16 L24 40 Z" fill={c.main} stroke={c.dark} strokeWidth="2" />
          <path d="M12 16 L36 16 M18 9 L22 16 L24 40 L26 16 L30 9" stroke={c.light} strokeWidth="1.2" fill="none" />
        </g>
      );
    case 'rock':
      return (
        <g strokeLinejoin="round">
          <path d="M7 36 L11 20 L22 12 L36 15 L42 31 L34 40 L14 41 Z" fill={c.main} stroke={c.dark} strokeWidth="2" />
          <path d="M11 20 L22 12 L36 15 L28 21 L17 23 Z" fill={c.light} opacity="0.7" />
          <path d="M20 30 L26 27 M30 33 L34 30" stroke={c.dark} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    case 'log':
      return (
        <g strokeLinejoin="round">
          <path d="M10 18 L36 12 Q42 11 43 20 Q44 28 38 29 L12 35 Z" fill={c.main} stroke={c.dark} strokeWidth="2" />
          <ellipse cx="11" cy="26.5" rx="5.5" ry="8.5" transform="rotate(-13 11 26.5)" fill={c.light} stroke={c.dark} strokeWidth="2" />
          <ellipse cx="11" cy="26.5" rx="2.4" ry="4" transform="rotate(-13 11 26.5)" fill="none" stroke={c.dark} strokeWidth="1.2" />
          <path d="M18 21 L33 17.5 M20 28 L36 24" stroke={c.dark} strokeWidth="1.3" opacity="0.6" strokeLinecap="round" />
          <path d="M30 13 Q32 8 36 7" stroke="#5d8f45" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'fish':
      return (
        <g strokeLinejoin="round">
          <path d="M6 24 Q16 12 30 16 Q36 18 38 24 Q36 30 30 32 Q16 36 6 24 Z" fill={c.main} stroke={c.dark} strokeWidth="2" />
          <path d="M37 24 L45 16 L44 32 Z" fill={c.main} stroke={c.dark} strokeWidth="2" />
          <path d="M12 23 Q20 18 30 20" stroke={c.light} strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="12" cy="22" r="1.8" fill="#1a1a1a" />
          <path d="M20 26 Q24 30 28 26" stroke={c.dark} strokeWidth="1.4" fill="none" />
        </g>
      );
    case 'cooked':
      return (
        <g strokeLinejoin="round">
          <ellipse cx="24" cy="32" rx="19" ry="7" fill="#e9e1d1" stroke="#8a7f6c" strokeWidth="2" />
          <path d="M9 28 Q18 18 30 21 Q35 23 36 27 Q34 31 29 32 Q17 34 9 28 Z" fill={c.dark} stroke="#3a2412" strokeWidth="1.8" />
          <path d="M35 27 L42 21 L41 32 Z" fill={c.dark} stroke="#3a2412" strokeWidth="1.8" />
          <path d="M14 26 L18 23 M19 28 L24 24 M25 29 L29 25" stroke="#3a2412" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 14 Q14 10 17 7 M23 14 Q21 10 24 7" stroke="#c9c2b5" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      );
    case 'bow':
      return (
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M14 6 Q40 10 40 34" stroke={c.dark} strokeWidth="6" />
          <path d="M14 6 Q40 10 40 34" stroke={c.main} strokeWidth="3.5" />
          <path d="M14 6 L40 34" stroke="#e8e2d4" strokeWidth="1.2" />
          <path d="M8 40 L30 18" stroke="#9a6a3c" strokeWidth="2" />
          <path d="M30 18 L26 18 M30 18 L30 22" stroke="#8b949c" strokeWidth="2" />
          <path d="M8 40 L11 36 M8 40 L12 40" stroke="#f9fafb" strokeWidth="1.6" />
        </g>
      );
    case 'staff': {
      const blank = c === TIER_COLORS.pine || c === TIER_COLORS.oak;
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 44 L32 14" stroke={WOOD.dark} strokeWidth="6" />
          <path d="M12 44 L32 14" stroke={blank ? c.main : WOOD.main} strokeWidth="3.4" />
          {blank
            ? <circle cx="34" cy="11" r="5" fill={c.light} stroke={c.dark} strokeWidth="2" />
            : <>
              <circle cx="35" cy="10" r="9" fill={c.main} opacity="0.3" />
              <circle cx="35" cy="10" r="7" fill={c.main} stroke={c.dark} strokeWidth="2" />
              <circle cx="33" cy="8" r="2.4" fill={c.light} />
            </>}
          <path d="M28 16 Q34 18 38 14" stroke={WOOD.dark} strokeWidth="2" fill="none" />
        </g>
      );
    }
    case 'talisman':
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 6 Q24 16 34 6" stroke="#a8a29e" strokeWidth="2" fill="none" />
          <circle cx="24" cy="28" r="15" fill={c.dark} stroke={c.main} strokeWidth="2.5" />
          <circle cx="24" cy="28" r="10" fill={c.main} opacity="0.45" />
          <path d="M24 20 L24 36 M17 24 L31 32 M31 24 L17 32" stroke={c.light} strokeWidth="2.2" />
          <circle cx="24" cy="13" r="2.5" fill="#d6d3d1" stroke="#78716c" strokeWidth="1" />
        </g>
      );
    case 'arrows':
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          {[0, 7, 14].map((d) => (
            <g key={d} transform={`translate(${d - 7} ${d / 2 - 3})`}>
              <path d="M12 38 L34 12" stroke="#9a6a3c" strokeWidth="2.4" />
              <path d="M34 12 L36 6 L40 10 Z" fill={c.main} stroke={c.dark} strokeWidth="1.2" />
              <path d="M12 38 L9 36 M12 38 L11 41 M15 35 L12 33 M15 35 L14 38" stroke="#f3f4f6" strokeWidth="1.6" />
            </g>
          ))}
        </g>
      );
    case 'rune':
      return (
        <g strokeLinejoin="round">
          <path d="M24 5 L40 14 L40 34 L24 43 L8 34 L8 14 Z" fill={c.dark} stroke={c.main} strokeWidth="2.2" />
          <path d="M24 12 L33 18 L33 30 L24 36 L15 30 L15 18 Z" fill={c.main} opacity="0.35" />
          <path d="M24 15 L24 33 M18 21 L30 27 M30 21 L18 27" stroke={c.light} strokeWidth="2.2" strokeLinecap="round" />
        </g>
      );
    case 'coins':
      return (
        <g>
          <ellipse cx="20" cy="32" rx="12" ry="5" fill="#92610f" />
          <ellipse cx="20" cy="30" rx="12" ry="5" fill="#fbbf24" stroke="#92610f" strokeWidth="1.5" />
          <ellipse cx="29" cy="22" rx="12" ry="5" fill="#92610f" />
          <ellipse cx="29" cy="20" rx="12" ry="5" fill="#fcd34d" stroke="#92610f" strokeWidth="1.5" />
          <path d="M26 19 Q29 17 32 19" stroke="#92610f" strokeWidth="1.4" fill="none" />
        </g>
      );
    case 'shrimp':
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* curled body made of segments, fan tail, legs and long feelers */}
          <path d="M14 14 Q30 6 38 18 Q42 28 32 34 Q26 37 22 33" fill="none" stroke={c.dark} strokeWidth="11" />
          <path d="M14 14 Q30 6 38 18 Q42 28 32 34 Q26 37 22 33" fill="none" stroke={c.main} strokeWidth="8" />
          <path d="M23 9 Q24 13 22 15 M30 9 Q30 13 28 16 M36 14 Q34 17 32 18 M39 22 Q36 23 34 23 M38 29 Q35 28 33 27" stroke={c.dark} strokeWidth="1.4" fill="none" />
          <path d="M22 33 L14 38 L18 30 Z M22 33 L16 42 L24 36 Z" fill={c.light} stroke={c.dark} strokeWidth="1.4" />
          <circle cx="14" cy="13" r="2" fill="#1a1a1a" />
          <path d="M12 12 Q4 6 3 2 M12 14 Q3 12 1 8" stroke={c.dark} strokeWidth="1.2" fill="none" />
          <path d="M20 18 L18 24 M25 17 L24 23 M30 19 L30 25" stroke={c.dark} strokeWidth="1.3" />
          <path d="M18 12 Q28 7 35 15" stroke={c.light} strokeWidth="1.8" fill="none" opacity="0.8" />
        </g>
      );
    case 'cooked_shrimp':
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="24" cy="33" rx="19" ry="7" fill="#e9e1d1" stroke="#8a7f6c" strokeWidth="2" />
          <path d="M14 22 Q24 14 32 22 Q35 28 29 31 Q26 32 24 30" fill="none" stroke="#9a3412" strokeWidth="8" />
          <path d="M14 22 Q24 14 32 22 Q35 28 29 31 Q26 32 24 30" fill="none" stroke={c.main} strokeWidth="5.5" />
          <path d="M24 30 L18 33 L21 27 Z" fill={c.light} stroke="#9a3412" strokeWidth="1.2" />
          <path d="M20 19 L21 23 M25 17 L25 21 M30 19 L28 23" stroke="#9a3412" strokeWidth="1.2" />
          <path d="M33 12 Q31 8 34 5 M27 12 Q25 8 28 5" stroke="#c9c2b5" strokeWidth="1.6" fill="none" opacity="0.8" />
          <circle cx="37" cy="30" r="2.5" fill="#86efac" stroke="#166534" strokeWidth="1" />
        </g>
      );
    case 'hammer':
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 42 L28 18" stroke={WOOD.dark} strokeWidth="6" />
          <path d="M12 42 L28 18" stroke={WOOD.main} strokeWidth="3.4" />
          <path d="M20 10 L36 4 L42 18 L26 24 Z" fill={c.main} stroke={c.dark} strokeWidth="2" />
          <path d="M23 11 L35 6.5" stroke={c.light} strokeWidth="1.6" />
        </g>
      );
    case 'knife':
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 40 L20 30" stroke={WOOD.dark} strokeWidth="7" />
          <path d="M10 40 L20 30" stroke={WOOD.main} strokeWidth="4.4" />
          <path d="M19 31 L40 6 Q42 12 36 20 L23 33 Z" fill={c.light} stroke={c.dark} strokeWidth="2" />
          <path d="M22 29 L38 10" stroke={c.main} strokeWidth="1.4" />
        </g>
      );
    case 'axe':
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 42 L30 10" stroke={WOOD.dark} strokeWidth="6" />
          <path d="M14 42 L30 10" stroke={WOOD.main} strokeWidth="3.4" />
          <path d="M26 12 Q34 4 42 10 Q42 22 33 24 Q32 18 26 12 Z" fill={c.main} stroke={c.dark} strokeWidth="2" />
          <path d="M33 10 Q38 9 40 12" stroke={c.light} strokeWidth="1.6" fill="none" />
        </g>
      );
    case 'rod':
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 42 L38 8" stroke={c.dark} strokeWidth="4" />
          <path d="M8 42 L38 8" stroke={c.main} strokeWidth="2" />
          <path d="M8 42 L14 35" stroke="#3a2412" strokeWidth="5" />
          <circle cx="16" cy="34" r="3" fill="#aab6bd" stroke="#5f6a70" strokeWidth="1.2" />
          <path d="M38 8 Q42 20 40 30" stroke="#e8e2d4" strokeWidth="1" fill="none" />
          <path d="M40 30 Q41 34 38 34" stroke="#aab6bd" strokeWidth="1.6" fill="none" />
        </g>
      );
    case 'tinderbox':
      return (
        <g strokeLinejoin="round">
          <rect x="9" y="20" width="30" height="18" rx="3" fill={c.main} stroke={c.dark} strokeWidth="2" />
          <path d="M9 24 H39" stroke={c.dark} strokeWidth="1.6" />
          <path d="M24 18 Q19 12 23 6 Q24 11 28 10 Q31 15 24 18 Z" fill="#f5a742" stroke="#c2410c" strokeWidth="1.4" />
          <path d="M24 16 Q22 13 24 10 Q26 14 24 16 Z" fill="#ffe08a" />
          <rect x="13" y="28" width="22" height="5" rx="2" fill={TIER_COLORS.stone.main} stroke={TIER_COLORS.stone.dark} strokeWidth="1.2" />
        </g>
      );
    case 'skillet':
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M30 27 L44 21" stroke={c.dark} strokeWidth="6" />
          <path d="M30 27 L44 21" stroke={c.main} strokeWidth="3.4" />
          <ellipse cx="18" cy="29" rx="14" ry="8" fill={TIER_COLORS.stone.dark} stroke="#2a2724" strokeWidth="2" />
          <ellipse cx="18" cy="27.5" rx="11" ry="5.5" fill={TIER_COLORS.stone.main} />
          <ellipse cx="15" cy="26.5" rx="4" ry="2" fill={TIER_COLORS.stone.light} opacity="0.6" />
        </g>
      );
  }
}

export function ItemIcon({ id, size = 40 }: { id: string; size?: number }) {
  const item = getItem(id);
  const c = TIER_COLORS[item.tier] ?? TIER_COLORS.iron;
  const plus = item.upgrade?.level ?? 0;
  const great = item.id.startsWith('great_');
  const rarity = item.gem ? RARITY_COLORS[item.gem.rarity] : null;
  if (item.emoji) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="item-icon">
        {item.value !== undefined && <circle cx="24" cy="25" r="21" fill="#fbbf24" opacity="0.16" stroke="#fbbf24" strokeWidth="1.5" />}
        <text x="24" y="34" textAnchor="middle" fontSize="28">{item.emoji}</text>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="item-icon">
      {rarity && <circle cx="24" cy="25" r="21" fill={rarity} opacity="0.18" stroke={rarity} strokeWidth="2" />}
      <ItemShape kind={item.icon} c={c} />
      {great && <path d="M38 4 L40 9 L45 9 L41 12 L43 17 L38 14 L33 17 L35 12 L31 9 L36 9 Z" fill="#fbbf24" stroke="#92610f" strokeWidth="1" />}
      {plus > 0 && (
        <g>
          <rect x="27" y="35" width="20" height="12" rx="4" fill="#1a1206" stroke="#f59e0b" strokeWidth="1.2" />
          <text x="37" y="44.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fbbf24" fontFamily="system-ui, sans-serif">+{plus}</text>
        </g>
      )}
    </svg>
  );
}

export type UiIconName =
  | 'town' | 'skills' | 'bag' | 'bank' | 'gear' | 'settings' | 'close' | 'search'
  | 'stop' | 'clock' | 'up' | 'down' | 'lock' | 'mining' | 'smithing' | 'sound' | 'music'
  | 'trash' | 'play' | 'refresh' | 'trophy' | 'pin' | 'bolt' | 'door'
  | 'woodcutting' | 'firemaking' | 'fishing' | 'cooking' | 'crafting' | 'enhancing' | 'sword' | 'shield'
  | 'melee' | 'ranged' | 'magic' | 'defense' | 'health' | 'combat' | 'coin' | 'heart' | 'gem' | 'ammo' | 'runecrafting' | 'profile'
  | 'herblore' | 'farming';

/** Simple line icons for buttons and navigation. */
export function UiIcon({ name, size = 24 }: { name: UiIconName; size?: number }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let body: JSX.Element;
  switch (name) {
    case 'town': body = <g {...common}><path d="M3 11 L12 4 L21 11" /><path d="M5 10 V20 H19 V10" /><path d="M10 20 V14 H14 V20" /></g>; break;
    case 'skills': body = <g {...common}><path d="M12 3 L14.6 8.6 L20.6 9.3 L16.2 13.4 L17.4 19.4 L12 16.4 L6.6 19.4 L7.8 13.4 L3.4 9.3 L9.4 8.6 Z" /></g>; break;
    case 'bag': body = <g {...common}><path d="M8 8 V6 A4 4 0 0 1 16 6 V8" /><path d="M5 8 H19 L20 20 A1 1 0 0 1 19 21 H5 A1 1 0 0 1 4 20 Z" /><path d="M9 13 H15" /></g>; break;
    case 'bank': body = <g {...common}><path d="M3 10 Q3 5 12 5 Q21 5 21 10 V19 H3 Z" /><path d="M3 11 H21" /><path d="M11 10 H13 V14 H11 Z" /></g>; break;
    case 'gear': body = <g {...common}><path d="M5 15 Q5 4 12 4 Q19 4 19 15 V19 H5 Z" /><path d="M8 11 H16" /><path d="M12 4 V10" /></g>; break;
    case 'settings': body = <g {...common}><circle cx="12" cy="12" r="3" /><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9" /></g>; break;
    case 'close': body = <g {...common}><path d="M6 6 L18 18 M18 6 L6 18" /></g>; break;
    case 'search': body = <g {...common}><circle cx="11" cy="11" r="6" /><path d="M16 16 L20 20" /></g>; break;
    case 'stop': body = <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />; break;
    case 'clock': body = <g {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8 V12 L15 14" /></g>; break;
    case 'up': body = <path d="M12 6 L18 15 H6 Z" fill="currentColor" />; break;
    case 'down': body = <path d="M12 18 L18 9 H6 Z" fill="currentColor" />; break;
    case 'lock': body = <g {...common}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11 V8 A4 4 0 0 1 16 8 V11" /></g>; break;
    case 'mining': body = <g {...common}><path d="M6 20 L16 8" /><path d="M5 8 Q12 1 21 9 Q15 6 12 7" /></g>; break;
    case 'smithing': body = <g {...common}><path d="M4 10 H16 Q16 14 12 14 V17 H15 V20 H7 V17 H10 V14 Q4 14 4 10 Z" /><path d="M16 10 L21 9" /></g>; break;
    case 'sound': body = <g {...common}><path d="M4 10 V14 H8 L13 18 V6 L8 10 Z" /><path d="M16 9 Q18 12 16 15" /><path d="M18.5 6.5 Q22 12 18.5 17.5" /></g>; break;
    case 'woodcutting': body = <g {...common}><path d="M12 21 V14" /><path d="M12 3 L18 12 H15 L19 17 H5 L9 12 H6 Z" /></g>; break;
    case 'firemaking': body = <g {...common}><path d="M12 21 Q5 19 6 13 Q7 9 10 7 Q10 11 13 11 Q12 6 15 3 Q19 8 19 13 Q19 19 12 21 Z" /><path d="M12 21 Q9.5 19 10.5 16 Q12 17.5 13 15.5 Q15 18 12 21 Z" /></g>; break;
    case 'fishing': body = <g {...common}><path d="M3 12 Q8 6 15 8 Q18 9 19 12 Q18 15 15 16 Q8 18 3 12 Z" /><path d="M19 12 L22 9 V15 Z" /><circle cx="7" cy="11" r="0.6" fill="currentColor" /></g>; break;
    case 'cooking': body = <g {...common}><path d="M3 13 H17 Q17 19 10 19 Q3 19 3 13 Z" /><path d="M17 14 L21 12" /><path d="M8 9 Q7 7 8.5 5 M12 9 Q11 7 12.5 5" /></g>; break;
    case 'crafting': body = <g {...common}><path d="M4 20 L13 11" /><path d="M11 6 L16 3 L21 8 L18 13 Z" /><path d="M3 4 L8 9" /><path d="M2 7 L5 4" /></g>; break;
    case 'enhancing': body = <g {...common}><path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z" /><circle cx="12" cy="12" r="2" /></g>; break;
    case 'herblore': body = <g {...common}><path d="M12 21 V9" /><path d="M12 13 Q6 13 4 7 Q10 7 12 13" /><path d="M12 10 Q18 10 20 4 Q14 4 12 10" /><path d="M12 17 Q8 16 7 13" /></g>; break;
    case 'farming': body = <g {...common}><path d="M3 20 H21" /><path d="M7 20 V15 M12 20 V12 M17 20 V15" /><path d="M12 12 Q9 11 9 8 Q12 8 12 12 Q12 8 15 7 Q15 11 12 12" /><path d="M7 15 Q5 14 5 12 Q7 12 7 15 Q8 13 9 13 Q9 15 7 15" /><path d="M17 15 Q15 14 15 12 Q17 12 17 15 Q18 13 19 13 Q19 15 17 15" /></g>; break;
    case 'profile': body =<g {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21 Q4 14 12 14 Q20 14 20 21" /></g>; break;
    case 'runecrafting': body = <g {...common}><circle cx="12" cy="12" r="9" /><path d="M12 6 V18 M7 9 L17 15 M17 9 L7 15" /></g>; break;
    case 'melee': case 'combat': body = <g {...common}><path d="M4 4 L14 14 M20 4 L10 14" /><path d="M12 16 L8 20 M12 16 L16 20" /><path d="M6 12 L12 18 L18 12" /></g>; break;
    case 'ranged': case 'ammo': body = <g {...common}><path d="M6 3 Q20 6 21 18" /><path d="M6 3 L21 18" strokeWidth="1" /><path d="M3 21 L16 8" /><path d="M16 8 L13 8 M16 8 L16 11" /></g>; break;
    case 'magic': body = <g {...common}><path d="M5 21 L15 9" /><circle cx="17" cy="7" r="3" /><path d="M20 2 L21 4 M22 8 L23 8 M13 3 L13 2" /></g>; break;
    case 'defense': body = <g {...common}><path d="M12 3 L20 6 Q20 15 12 21 Q4 15 4 6 Z" /><path d="M12 8 V16 M8 11 H16" /></g>; break;
    case 'health': case 'heart': body = <g {...common}><path d="M12 20 Q3 13 4 8 Q5 4 9 4 Q11 4 12 7 Q13 4 15 4 Q19 4 20 8 Q21 13 12 20 Z" /></g>; break;
    case 'coin': body = <g {...common}><ellipse cx="12" cy="12" rx="8" ry="8" /><path d="M12 7 V17 M9.5 9.5 Q12 8 14.5 9.5 M9.5 14.5 Q12 16 14.5 14.5" /></g>; break;
    case 'gem': body = <g {...common}><path d="M6 9 L9 5 H15 L18 9 L12 20 Z" /><path d="M6 9 H18 M10 5 L12 9 L14 5 M12 9 V20" /></g>; break;
    case 'sword': body = <g {...common}><path d="M20 4 L20 8 L9 19 L5 15 L16 4 Z" /><path d="M4 20 L7 17" /><path d="M5 13 L11 19" /></g>; break;
    case 'shield': body = <g {...common}><path d="M12 3 L20 6 Q20 15 12 21 Q4 15 4 6 Z" /></g>; break;
    case 'trash': body = <g {...common}><path d="M4 7 H20" /><path d="M9 7 V4 H15 V7" /><path d="M6 7 L7 20 H17 L18 7" /><path d="M10 11 V16 M14 11 V16" /></g>; break;
    case 'play': body = <g {...common}><path d="M8 5 L19 12 L8 19 Z" /></g>; break;
    case 'refresh': body = <g {...common}><path d="M20 11 A8 8 0 0 0 5.5 7" /><path d="M5 3 V7.5 H9.5" /><path d="M4 13 A8 8 0 0 0 18.5 17" /><path d="M19 21 V16.5 H14.5" /></g>; break;
    case 'trophy': body = <g {...common}><path d="M8 4 H16 V10 A4 4 0 0 1 8 10 Z" /><path d="M8 6 H4 Q4 11 8 11 M16 6 H20 Q20 11 16 11" /><path d="M12 14 V18 M8 20 H16" /></g>; break;
    case 'pin': body = <g {...common}><path d="M12 21 Q5 13 5 9 A7 7 0 0 1 19 9 Q19 13 12 21 Z" /><circle cx="12" cy="9" r="2.5" /></g>; break;
    case 'bolt': body = <g {...common}><path d="M13 2 L5 14 H11 L10 22 L19 9 H13 Z" /></g>; break;
    case 'door': body = <g {...common}><path d="M6 21 V4 H15 V21" /><path d="M15 6 L19 7 V21 H3" /><circle cx="12.5" cy="13" r="0.8" fill="currentColor" /></g>; break;
    case 'music': body =<g {...common}><path d="M9 18 V6 L19 4 V16" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="16" r="2" /></g>; break;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {body}
    </svg>
  );
}
