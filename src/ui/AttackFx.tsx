// ⚔️ Attack splashes in combat: a sword slash, an arrow, or a spell bolt that matches your staff's element.
// Pure decoration — drawn over the monster for a moment, then gone.
import type { CombatStyle, Element } from '../data/items';

export interface Fx {
  id: number;
  style: CombatStyle;
  element?: Element;
  crit: boolean;
  miss: boolean;
}

/** Colours for each magic element: [core, glow, particle]. */
const ELEMENT_COLORS: Record<string, [string, string, string]> = {
  air: ['#f0f9ff', '#a5f3fc', '#e0f2fe'],
  water: ['#38bdf8', '#0ea5e9', '#bae6fd'],
  earth: ['#a16207', '#78350f', '#d6a66b'],
  fire: ['#fde047', '#f97316', '#ef4444'],
  nature: ['#bef264', '#22c55e', '#4ade80'],
  frost: ['#e0f2fe', '#7dd3fc', '#ffffff'],
  shadow: ['#c4b5fd', '#6d28d9', '#a78bfa'],
  light: ['#fef9c3', '#facc15', '#fde68a'],
};

/** Little particles that burst out on impact. */
function Burst({ color, shape, count = 7 }: { color: string; shape: 'dot' | 'shard' | 'leaf' | 'drop' | 'rock' | 'ray'; count?: number }) {
  return (
    <g className="fx-burst">
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + 0.3;
        const dx = Math.cos(a) * 34;
        const dy = Math.sin(a) * 34;
        const style = { ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`, animationDelay: `${(i % 3) * 20}ms` };
        const rot = `rotate(${(a * 180) / Math.PI})`;
        switch (shape) {
          case 'shard': return <path key={i} className="fx-p" style={style} d="M0 -6 L2 0 L0 6 L-2 0 Z" fill={color} transform={rot} />;
          case 'leaf': return <path key={i} className="fx-p" style={style} d="M0 -5 Q4 0 0 5 Q-4 0 0 -5 Z" fill={color} transform={rot} />;
          case 'drop': return <path key={i} className="fx-p" style={style} d="M0 -5 Q3 0 0 3 Q-3 0 0 -5 Z" fill={color} />;
          case 'rock': return <rect key={i} className="fx-p" style={style} x={-3} y={-3} width={6} height={5} rx={1} fill={color} transform={rot} />;
          case 'ray': return <rect key={i} className="fx-p" style={style} x={-1} y={-7} width={2} height={14} fill={color} transform={rot} />;
          default: return <circle key={i} className="fx-p" style={style} r={2.5} fill={color} />;
        }
      })}
    </g>
  );
}

function Slash({ crit }: { crit: boolean }) {
  const c = crit ? '#fde047' : '#ffffff';
  return (
    <g className="fx-slash">
      <path d="M-46 -40 Q0 -8 46 40" stroke={c} strokeWidth={crit ? 7 : 5} fill="none" strokeLinecap="round" className="fx-stroke" />
      <path d="M-40 -34 Q0 -6 40 34" stroke={crit ? '#f97316' : '#cbd5e1'} strokeWidth="2" fill="none" strokeLinecap="round" className="fx-stroke" opacity="0.7" />
      {crit && <path d="M46 -40 Q0 -8 -46 40" stroke={c} strokeWidth="6" fill="none" strokeLinecap="round" className="fx-stroke second" />}
      <Burst color={c} shape="dot" count={crit ? 10 : 5} />
    </g>
  );
}

function Arrow({ crit }: { crit: boolean }) {
  return (
    <g>
      <g className="fx-fly">
        <line x1="-22" y1="0" x2="10" y2="0" stroke="#8a5a2b" strokeWidth="3" strokeLinecap="round" />
        <path d="M10 -5 L20 0 L10 5 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
        <path d="M-22 0 L-28 -5 M-22 0 L-28 5 M-17 0 L-23 -5 M-17 0 L-23 5" stroke="#f1f5f9" strokeWidth="2" />
      </g>
      <g className="fx-impact"><Burst color={crit ? '#fde047' : '#e2e8f0'} shape="dot" count={crit ? 9 : 5} /></g>
    </g>
  );
}

function Bolt({ element, crit }: { element: string; crit: boolean }) {
  const [core, glow, part] = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.air;
  const r = crit ? 13 : 10;
  const shape = element === 'frost' ? 'shard' : element === 'nature' ? 'leaf' : element === 'water' ? 'drop' : element === 'earth' ? 'rock' : element === 'light' ? 'ray' : 'dot';
  return (
    <g>
      <g className="fx-fly">
        {element === 'air' ? (
          // a little whirling wind bolt
          <g className="spin-fast">
            <path d="M-12 0 A12 12 0 0 1 12 0" stroke={core} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M10 4 A8 8 0 0 1 -8 4" stroke={glow} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M-5 -2 A4 4 0 0 1 5 -2" stroke={core} strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        ) : element === 'earth' ? (
          <path d="M-10 -6 L4 -10 L11 -2 L7 9 L-6 8 L-11 2 Z" fill={core} stroke={glow} strokeWidth="2" className="spin" />
        ) : (
          <>
            <circle r={r + 6} fill={glow} opacity="0.35" />
            <circle r={r} fill={glow} />
            <circle r={r * 0.55} fill={core} />
            {element === 'fire' && <ellipse cx={-r - 8} rx={11} ry={5} fill={part} opacity="0.7" />}
          </>
        )}
        <circle className="fx-trail" cx="-14" r="4" fill={glow} opacity="0.5" />
        <circle className="fx-trail" cx="-24" r="3" fill={glow} opacity="0.3" />
      </g>
      <g className="fx-impact">
        <circle className="fx-ring" r="8" fill="none" stroke={glow} strokeWidth="3" />
        <Burst color={part} shape={shape} count={crit ? 11 : 8} />
      </g>
    </g>
  );
}

function Whiff() {
  return <path className="fx-whiff fx-stroke" d="M-30 10 Q0 -14 30 10" stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round" />;
}

/** All the splashes currently playing over the monster. */
export function AttackFxLayer({ fx }: { fx: Fx[] }) {
  return (
    <div className="fx-layer" aria-hidden="true">
      {fx.map((e) => (
        <svg key={e.id} className={`fx ${e.crit ? 'crit' : ''}`} viewBox="-60 -60 120 120">
          {e.miss ? <Whiff /> : e.style === 'melee' ? <Slash crit={e.crit} /> : e.style === 'ranged' ? <Arrow crit={e.crit} /> : <Bolt element={e.element ?? 'air'} crit={e.crit} />}
        </svg>
      ))}
    </div>
  );
}
