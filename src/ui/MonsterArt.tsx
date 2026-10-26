// Cozy monster portraits, drawn in code.
import type { MonsterDef } from '../data/monsters';

export function MonsterArt({ monster, size = 96, hurt = false }: { monster: MonsterDef; size?: number; hurt?: boolean }) {
  const { body, dark, accent } = monster.colors;
  const eye = <><circle cx="0" cy="0" r="3.2" fill="#1a1410" /><circle cx="-1" cy="-1" r="1" fill="#fff" /></>;
  let art: JSX.Element;
  switch (monster.art) {
    case 'rat':
      art = (
        <g>
          <path d="M70 70 Q92 66 88 50" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx="48" cy="62" rx="26" ry="18" fill={body} stroke={dark} strokeWidth="3" />
          <circle cx="28" cy="48" r="14" fill={body} stroke={dark} strokeWidth="3" />
          <circle cx="22" cy="34" r="7" fill={accent} stroke={dark} strokeWidth="2.5" />
          <circle cx="36" cy="34" r="7" fill={accent} stroke={dark} strokeWidth="2.5" />
          <g transform="translate(24 47)">{eye}</g>
          <circle cx="15" cy="53" r="3" fill={accent} />
          <path d="M14 57 L4 55 M14 59 L5 61" stroke={dark} strokeWidth="1.5" />
        </g>
      );
      break;
    case 'sprite':
      art = (
        <g>
          <ellipse cx="30" cy="40" rx="16" ry="24" fill={accent} opacity="0.5" transform="rotate(-25 30 40)" />
          <ellipse cx="66" cy="40" rx="16" ry="24" fill={accent} opacity="0.5" transform="rotate(25 66 40)" />
          <circle cx="48" cy="52" r="22" fill={body} stroke={dark} strokeWidth="3" />
          <path d="M40 30 Q48 14 56 30" fill={dark} />
          <g transform="translate(40 50)">{eye}</g>
          <g transform="translate(56 50)">{eye}</g>
          <path d="M42 62 Q48 67 54 62" stroke={dark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="20" cy="74" r="3" fill={accent} /><circle cx="78" cy="22" r="2.5" fill={accent} /><circle cx="82" cy="70" r="2" fill={accent} />
        </g>
      );
      break;
    case 'bandit':
      art = (
        <g>
          <path d="M22 88 Q24 60 48 58 Q72 60 74 88 Z" fill={body} stroke={dark} strokeWidth="3" />
          <circle cx="48" cy="40" r="18" fill="#e8c4a0" stroke={dark} strokeWidth="3" />
          <path d="M28 36 Q48 8 68 36 Q60 28 48 28 Q36 28 28 36 Z" fill={dark} />
          <rect x="31" y="38" width="34" height="8" rx="3" fill={accent} />
          <g transform="translate(41 42)">{eye}</g>
          <g transform="translate(55 42)">{eye}</g>
          <path d="M80 30 Q92 56 80 82" stroke="#9a6a3c" strokeWidth="3.5" fill="none" />
          <path d="M80 30 L80 82" stroke="#e8e2d4" strokeWidth="1" />
        </g>
      );
      break;
    case 'boar':
      art = (
        <g>
          <ellipse cx="54" cy="58" rx="32" ry="22" fill={body} stroke={dark} strokeWidth="3" />
          <path d="M30 40 Q50 26 76 40" stroke={accent} strokeWidth="9" fill="none" strokeLinecap="round" />
          <circle cx="40" cy="36" r="3" fill="#f9a8d4" /><circle cx="60" cy="31" r="3" fill="#fde68a" /><circle cx="70" cy="37" r="2.5" fill="#f9a8d4" />
          <circle cx="26" cy="58" r="16" fill={body} stroke={dark} strokeWidth="3" />
          <ellipse cx="14" cy="62" rx="7" ry="6" fill="#d6b49a" stroke={dark} strokeWidth="2" />
          <path d="M17 68 Q12 76 8 72" stroke="#f5f0e6" strokeWidth="3" fill="none" strokeLinecap="round" />
          <g transform="translate(26 52)">{eye}</g>
          <path d="M34 80 V88 M50 80 V88 M66 80 V88 M78 76 V86" stroke={dark} strokeWidth="5" strokeLinecap="round" />
        </g>
      );
      break;
    case 'treant':
      art = (
        <g>
          {/* mossy crown */}
          <circle cx="30" cy="20" r="14" fill={accent} opacity="0.85" />
          <circle cx="50" cy="12" r="15" fill={accent} />
          <circle cx="68" cy="22" r="13" fill={accent} opacity="0.85" />
          <circle cx="44" cy="8" r="3" fill="#f9a8d4" /><circle cx="62" cy="14" r="2.5" fill="#fde68a" /><circle cx="28" cy="16" r="2.5" fill="#fde68a" />
          {/* trunk body */}
          <path d="M26 92 Q22 50 34 30 L62 30 Q74 50 70 92 Z" fill={body} stroke={dark} strokeWidth="3" />
          <path d="M40 40 Q38 60 42 88 M56 40 Q58 62 54 88" stroke={dark} strokeWidth="2" fill="none" opacity="0.6" />
          {/* face */}
          <ellipse cx="40" cy="48" rx="5" ry="4" fill="#1a1410" /><circle cx="39" cy="47" r="1.3" fill="#d9f99d" />
          <ellipse cx="56" cy="48" rx="5" ry="4" fill="#1a1410" /><circle cx="55" cy="47" r="1.3" fill="#d9f99d" />
          <path d="M34 42 L45 45 M62 42 L51 45" stroke={dark} strokeWidth="3" strokeLinecap="round" />
          <path d="M42 62 Q48 58 54 62" stroke="#1a1410" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* branch arms */}
          <path d="M28 54 Q12 50 8 36 M68 54 Q84 50 88 36" stroke={body} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M28 54 Q12 50 8 36 M68 54 Q84 50 88 36" stroke={dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
          <circle cx="8" cy="34" r="5" fill={accent} /><circle cx="88" cy="34" r="5" fill={accent} />
        </g>
      );
      break;
    case 'crab':
      art = (
        <g>
          {/* legs */}
          <path d="M26 66 L12 76 L8 88 M30 70 L20 82 L18 92 M70 66 L84 76 L88 88 M66 70 L76 82 L78 92" stroke={dark} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* claws */}
          <path d="M26 54 Q14 44 16 30" stroke={body} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M70 54 Q82 44 80 30" stroke={body} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M8 26 Q14 12 26 22 L18 28 Z" fill={body} stroke={dark} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M88 26 Q82 12 70 22 L78 28 Z" fill={body} stroke={dark} strokeWidth="2.5" strokeLinejoin="round" />
          {/* shell */}
          <ellipse cx="48" cy="62" rx="30" ry="18" fill={body} stroke={dark} strokeWidth="3" />
          <path d="M26 58 Q48 46 70 58" stroke={accent} strokeWidth="2.5" fill="none" opacity="0.8" />
          <circle cx="36" cy="66" r="2.5" fill={dark} opacity="0.5" /><circle cx="58" cy="68" r="2" fill={dark} opacity="0.5" /><circle cx="48" cy="72" r="1.8" fill={dark} opacity="0.5" />
          {/* eye stalks */}
          <path d="M40 48 L38 36 M56 48 L58 36" stroke={dark} strokeWidth="3" strokeLinecap="round" />
          <g transform="translate(38 34)">{eye}</g>
          <g transform="translate(58 34)">{eye}</g>
          <path d="M42 58 Q48 62 54 58" stroke={dark} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="30" cy="76" r="2" fill={accent} /><circle cx="68" cy="50" r="1.6" fill={accent} />
        </g>
      );
      break;
    case 'bird':
      art = (
        <g>
          {/* tail + far wing */}
          <path d="M70 62 L92 54 L88 70 Z" fill={dark} opacity="0.85" />
          <path d="M58 46 Q78 22 92 30 Q80 44 66 58 Z" fill={dark} opacity="0.7" />
          {/* body */}
          <ellipse cx="50" cy="60" rx="28" ry="20" fill={body} stroke={dark} strokeWidth="3" />
          {/* near wing */}
          <path d="M40 54 Q60 44 78 58 Q62 72 44 68 Z" fill="#cbd5e1" stroke={dark} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M60 62 L74 60 M58 66 L70 66" stroke={dark} strokeWidth="1.5" opacity="0.6" />
          {/* head */}
          <circle cx="26" cy="40" r="15" fill={body} stroke={dark} strokeWidth="3" />
          <g transform="translate(24 37)">{eye}</g>
          <path d="M18 31 L30 33" stroke={dark} strokeWidth="2.5" strokeLinecap="round" />
          {/* beak */}
          <path d="M12 42 L2 46 L12 49 Z" fill={accent} stroke={dark} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="6.5" cy="46.5" r="1.5" fill="#ef4444" />
          {/* feet */}
          <path d="M42 78 L40 90 M56 78 L58 90 M36 90 L44 90 M54 90 L62 90" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
      break;
    case 'ghost':
      art = (
        <g>
          {/* misty glow */}
          <ellipse cx="48" cy="52" rx="40" ry="38" fill={accent} opacity="0.12" />
          {/* body: a soft sheet with a wavy hem */}
          <path d="M18 88 L18 46 Q18 12 48 12 Q78 12 78 46 L78 88 Q71 80 64 88 Q56 80 48 88 Q40 80 32 88 Q25 80 18 88 Z" fill={body} stroke={dark} strokeWidth="3" strokeLinejoin="round" opacity="0.92" />
          {/* little arms */}
          <path d="M18 54 Q8 58 10 66 M78 54 Q88 58 86 66" stroke={body} strokeWidth="6" fill="none" strokeLinecap="round" />
          {/* glowing eyes and a small 'o' mouth */}
          <ellipse cx="38" cy="42" rx="5" ry="6.5" fill={accent} /><ellipse cx="58" cy="42" rx="5" ry="6.5" fill={accent} />
          <circle cx="38" cy="43" r="2" fill={dark} /><circle cx="58" cy="43" r="2" fill={dark} />
          <ellipse cx="48" cy="58" rx="4" ry="5" fill={dark} opacity="0.8" />
          {/* wisps */}
          <circle cx="12" cy="24" r="2.5" fill={accent} opacity="0.7" /><circle cx="84" cy="18" r="2" fill={accent} opacity="0.7" /><circle cx="86" cy="76" r="1.6" fill={accent} opacity="0.6" />
        </g>
      );
      break;
    case 'goat':
      art = (
        <g>
          <ellipse cx="56" cy="58" rx="28" ry="18" fill={body} stroke={dark} strokeWidth="3" />
          <path d="M36 72 V88 M48 74 V88 M66 74 V88 M78 70 V86" stroke={dark} strokeWidth="5" strokeLinecap="round" />
          <path d="M84 52 Q92 48 90 58" stroke={body} strokeWidth="5" fill="none" strokeLinecap="round" />
          <ellipse cx="28" cy="46" rx="13" ry="15" fill={body} stroke={dark} strokeWidth="3" />
          {/* glowing curled horns */}
          <path d="M26 33 Q30 14 44 18 Q50 24 42 28" stroke={accent} strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M20 34 Q14 18 4 24" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M22 58 Q24 70 30 60" fill="#e7e5e4" stroke={dark} strokeWidth="2" />
          <g transform="translate(26 44)">{eye}</g>
          <circle cx="17" cy="51" r="2" fill={dark} />
        </g>
      );
      break;
    case 'lizard':
      art = (
        <g>
          <path d="M70 62 Q92 60 88 44 Q86 36 80 40" stroke={body} strokeWidth="8" fill="none" strokeLinecap="round" />
          <ellipse cx="52" cy="62" rx="24" ry="13" fill={body} stroke={dark} strokeWidth="3" />
          <path d="M36 72 L30 84 M48 74 L46 86 M60 74 L64 86 M70 70 L76 82" stroke={dark} strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="26" cy="54" rx="15" ry="11" fill={body} stroke={dark} strokeWidth="3" />
          <circle cx="44" cy="58" r="3" fill={accent} /><circle cx="56" cy="56" r="3.5" fill={accent} /><circle cx="66" cy="62" r="2.5" fill={accent} />
          <g transform="translate(24 50)">{eye}</g>
          <path d="M12 58 Q18 61 24 59" stroke={dark} strokeWidth="2" fill="none" strokeLinecap="round" />
          {/* little flame on its back */}
          <path d="M50 49 Q52 38 58 44 Q60 36 64 46 Z" fill={accent} opacity="0.9" />
        </g>
      );
      break;
    case 'tortoise':
      art = (
        <g>
          <path d="M28 76 V86 M44 78 V88 M60 78 V88 M74 74 V84" stroke={dark} strokeWidth="7" strokeLinecap="round" />
          <path d="M18 72 Q20 32 52 30 Q84 32 86 72 Z" fill={body} stroke={dark} strokeWidth="3" />
          {/* glowing cracks in the shell */}
          <path d="M34 46 L44 54 L40 66 M52 36 L56 50 L66 56 M70 48 L76 62" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="14" cy="64" rx="11" ry="9" fill={dark} stroke={dark} strokeWidth="2" />
          <ellipse cx="13" cy="63" rx="9" ry="7" fill="#78716c" />
          <g transform="translate(10 61)">{eye}</g>
        </g>
      );
      break;
    case 'wyrm':
      art = (
        <g>
          {/* curled-up sleepy dragon */}
          <path d="M30 30 Q14 18 18 40 M66 30 Q82 18 78 40" fill={accent} opacity="0.55" stroke={dark} strokeWidth="2" />
          <ellipse cx="50" cy="66" rx="34" ry="22" fill={body} stroke={dark} strokeWidth="3" />
          <path d="M80 70 Q92 80 78 86 Q70 88 66 82" stroke={body} strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M28 56 Q50 46 72 56" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx="38" cy="44" rx="20" ry="14" fill={body} stroke={dark} strokeWidth="3" />
          <path d="M30 32 L26 22 M44 31 L46 21" stroke={dark} strokeWidth="3" strokeLinecap="round" />
          {/* closed sleepy eyes */}
          <path d="M28 42 Q32 45 36 42 M42 42 Q46 45 50 42" stroke="#1a1410" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="22" cy="50" r="2" fill={dark} />
          {/* smoke puff and a Z */}
          <circle cx="14" cy="40" r="3" fill="#a8a29e" opacity="0.6" /><circle cx="8" cy="32" r="4" fill="#a8a29e" opacity="0.45" />
          <path d="M60 16 H68 L60 24 H68" stroke={accent} strokeWidth="2" fill="none" />
        </g>
      );
      break;
    case 'bear':
      art = (
        <g>
          <circle cx="26" cy="22" r="10" fill={body} stroke={dark} strokeWidth="3" />
          <circle cx="70" cy="22" r="10" fill={body} stroke={dark} strokeWidth="3" />
          <path d="M14 92 Q10 50 48 46 Q86 50 82 92 Z" fill={body} stroke={dark} strokeWidth="3" />
          <circle cx="48" cy="38" r="26" fill={body} stroke={dark} strokeWidth="3" />
          <ellipse cx="48" cy="48" rx="12" ry="9" fill="#a8896d" stroke={dark} strokeWidth="2" />
          <ellipse cx="48" cy="44" rx="4" ry="3" fill="#1a1410" />
          <g transform="translate(38 33)">{eye}</g>
          <g transform="translate(58 33)">{eye}</g>
          <path d="M30 16 L34 22 M64 16 L60 22 M20 60 L26 56 M76 60 L70 56 M30 78 L36 74 M66 78 L60 74" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          <circle cx="24" cy="70" r="3" fill="#f472b6" /><circle cx="72" cy="66" r="3" fill="#fde68a" />
        </g>
      );
      break;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" className={`monster-art ${hurt ? 'hurt' : ''}`}>
      {art}
    </svg>
  );
}
