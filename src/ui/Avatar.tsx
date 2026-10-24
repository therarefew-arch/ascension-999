// Your adventurer, drawn wearing whatever you have equipped (colours follow each item's tier).
import { getItem, TIER_COLORS, type EquipSlot } from '../data/items';
import { PET_MAP } from '../data/pets';
import type { PlayerState } from '../core/player';

function colorsFor(p: PlayerState, slot: EquipSlot) {
  const id = p.equipment[slot];
  if (!id) return null;
  const item = getItem(id);
  return { item, c: TIER_COLORS[item.tier] ?? TIER_COLORS.iron };
}

export function Avatar({ player, size = 220 }: { player: PlayerState; size?: number }) {
  const head = colorsFor(player, 'head');
  const body = colorsFor(player, 'body');
  const legs = colorsFor(player, 'legs');
  const weapon = colorsFor(player, 'weapon');
  const shield = colorsFor(player, 'shield');
  const pet = player.activePet ? PET_MAP[player.activePet] : null;
  const skin = '#f2c9a0';
  const skinDark = '#c99a72';

  return (
    <div className="avatar" style={{ width: size, height: size * 1.1 }}>
      <svg viewBox="0 0 200 220" width={size} height={size * 1.1} aria-label="Your character">
        {/* ground shadow */}
        <ellipse cx="100" cy="205" rx="55" ry="9" fill="#000" opacity="0.35" />

        {/* legs */}
        {legs ? (
          <g stroke={legs.c.dark} strokeWidth="3" strokeLinejoin="round">
            <path d="M76 140 L98 140 L96 196 L76 196 Z" fill={legs.c.main} />
            <path d="M102 140 L124 140 L124 196 L104 196 Z" fill={legs.c.main} />
            <path d="M80 150 L80 188 M120 150 L120 188" stroke={legs.c.light} strokeWidth="2" />
          </g>
        ) : (
          <g stroke="#3f2a18" strokeWidth="3">
            <path d="M78 140 L98 140 L96 194 L78 194 Z" fill="#6b4a2b" />
            <path d="M102 140 L122 140 L122 194 L104 194 Z" fill="#6b4a2b" />
          </g>
        )}
        <path d="M72 194 L98 194 L98 202 L70 202 Z M102 194 L128 194 L130 202 L102 202 Z" fill="#3f2a18" />

        {/* body */}
        {body ? (
          <g stroke={body.c.dark} strokeWidth="3" strokeLinejoin="round">
            <path d="M66 86 Q100 74 134 86 L130 144 L70 144 Z" fill={body.c.main} />
            <path d="M80 96 Q100 104 120 96" stroke={body.c.light} strokeWidth="2.5" fill="none" />
            <path d="M100 92 L100 140" stroke={body.c.dark} strokeWidth="2" opacity="0.6" />
          </g>
        ) : (
          <path d="M68 88 Q100 78 132 88 L128 144 L72 144 Z" fill="#2f6e5a" stroke="#1d4237" strokeWidth="3" strokeLinejoin="round" />
        )}
        <rect x="70" y="136" width="60" height="9" rx="3" fill="#5b3d22" stroke="#3f2a18" strokeWidth="2" />

        {/* arms */}
        <path d="M66 90 Q52 112 58 132" stroke={body ? body.c.main : '#2f6e5a'} strokeWidth="13" strokeLinecap="round" fill="none" />
        <path d="M134 90 Q148 112 142 132" stroke={body ? body.c.main : '#2f6e5a'} strokeWidth="13" strokeLinecap="round" fill="none" />
        <circle cx="58" cy="134" r="7" fill={skin} stroke={skinDark} strokeWidth="2" />
        <circle cx="142" cy="134" r="7" fill={skin} stroke={skinDark} strokeWidth="2" />

        {/* weapon in the right hand */}
        {weapon?.item.icon === 'sword' && (
          <g strokeLinecap="round">
            <path d="M146 130 L172 62" stroke={weapon.c.dark} strokeWidth="9" />
            <path d="M146 130 L172 62" stroke={weapon.c.light} strokeWidth="5" />
            <path d="M136 124 L156 132" stroke={weapon.c.dark} strokeWidth="6" />
          </g>
        )}
        {weapon?.item.icon === 'bow' && (
          <g fill="none" strokeLinecap="round">
            <path d="M158 70 Q186 130 158 190" stroke={weapon.c.dark} strokeWidth="7" />
            <path d="M158 70 Q186 130 158 190" stroke={weapon.c.main} strokeWidth="4" />
            <path d="M158 70 L158 190" stroke="#e8e2d4" strokeWidth="1.5" />
          </g>
        )}
        {weapon?.item.icon === 'staff' && (
          <g strokeLinecap="round">
            <path d="M144 196 L156 56" stroke="#5e3d1f" strokeWidth="7" />
            <circle cx="157" cy="50" r="11" fill={weapon.c.main} opacity="0.35" />
            <circle cx="157" cy="50" r="8" fill={weapon.c.main} stroke={weapon.c.dark} strokeWidth="2.5" />
          </g>
        )}

        {/* shield on the left arm */}
        {shield && (
          <g strokeLinejoin="round">
            <path d="M34 104 L60 98 L64 132 Q50 152 38 146 Q30 128 34 104 Z" fill={shield.c.main} stroke={shield.c.dark} strokeWidth="3" />
            <circle cx="48" cy="122" r="5" fill={shield.c.light} stroke={shield.c.dark} strokeWidth="1.5" />
          </g>
        )}

        {/* head */}
        <circle cx="100" cy="58" r="27" fill={skin} stroke={skinDark} strokeWidth="3" />
        {!head && <path d="M74 54 Q78 26 100 28 Q124 26 127 52 Q118 40 100 42 Q84 40 74 54 Z" fill="#6b3f1f" />}
        <circle cx="91" cy="60" r="3.2" fill="#2a1f17" />
        <circle cx="109" cy="60" r="3.2" fill="#2a1f17" />
        <path d="M93 71 Q100 76 107 71" stroke="#a0522d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="84" cy="68" r="3.5" fill="#f9a8a8" opacity="0.6" />
        <circle cx="116" cy="68" r="3.5" fill="#f9a8a8" opacity="0.6" />
        {head && (
          <g strokeLinejoin="round">
            <path d="M70 60 Q70 24 100 22 Q130 24 130 60 L124 60 Q122 38 100 36 Q78 38 76 60 Z" fill={head.c.main} stroke={head.c.dark} strokeWidth="3" />
            <path d="M100 22 L100 36" stroke={head.c.light} strokeWidth="3" />
          </g>
        )}
      </svg>
      {pet && <span className="avatar-pet bob" title={pet.name}>{pet.emoji}</span>}
    </div>
  );
}
