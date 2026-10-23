// Hand-drawn SVG icons. Item icons are tinted per metal tier so every tier looks unique.
import { getItem, TIER_COLORS, type IconKind } from '../data/items';

interface Palette { main: string; light: string; dark: string }

const WOOD = { main: '#9a6a3c', dark: '#5e3d1f' };
const ROCK = { main: '#6d6458', light: '#8b8174', dark: '#423b33' };

function ItemShape({ kind, c }: { kind: IconKind; c: Palette }) {
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
  }
}

export function ItemIcon({ id, size = 40 }: { id: string; size?: number }) {
  const item = getItem(id);
  const c = TIER_COLORS[item.tier] ?? TIER_COLORS.iron;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="item-icon">
      <ItemShape kind={item.icon} c={c} />
    </svg>
  );
}

export type UiIconName =
  | 'town' | 'skills' | 'bag' | 'bank' | 'gear' | 'settings' | 'close' | 'search'
  | 'stop' | 'clock' | 'up' | 'down' | 'lock' | 'mining' | 'smithing' | 'sound' | 'music'
  | 'trash' | 'play' | 'refresh' | 'trophy' | 'pin' | 'bolt' | 'door';

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
