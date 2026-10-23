import type { SkillId } from '../../data/items';
import { SKILL_ORDER, SKILLS } from '../../data/skills';
import { skillLevel } from '../../core/idle';
import { useGame } from '../../core/store';
import { UiIcon } from '../icons';

function TownScene() {
  return (
    <svg className="town-scene" viewBox="0 0 360 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3c98b" />
          <stop offset="1" stopColor="#f7e2bb" />
        </linearGradient>
      </defs>
      <rect width="360" height="150" fill="url(#sky)" />
      <circle cx="290" cy="45" r="20" fill="#fff3d6" opacity="0.9" />
      <path d="M0 95 Q60 55 130 85 T260 75 T360 85 V150 H0 Z" fill="#9db37a" />
      <path d="M0 115 Q90 85 180 108 T360 100 V150 H0 Z" fill="#7c9a5c" />
      {/* houses */}
      <g>
        <rect x="70" y="92" width="34" height="26" fill="#e7d2ad" stroke="#6b4a2b" strokeWidth="2" />
        <path d="M65 94 L87 74 L109 94 Z" fill="#a8493a" stroke="#6b4a2b" strokeWidth="2" strokeLinejoin="round" />
        <rect x="82" y="104" width="9" height="14" fill="#6b4a2b" />
        <rect x="150" y="86" width="44" height="32" fill="#efdcb8" stroke="#6b4a2b" strokeWidth="2" />
        <path d="M144 88 L172 64 L200 88 Z" fill="#8c5a3c" stroke="#6b4a2b" strokeWidth="2" strokeLinejoin="round" />
        <rect x="158" y="96" width="9" height="9" fill="#f5c45e" stroke="#6b4a2b" strokeWidth="1.5" />
        <rect x="177" y="100" width="10" height="18" fill="#6b4a2b" />
        <rect x="186" y="66" width="7" height="14" fill="#7a6a5a" />
        <circle cx="191" cy="58" r="4" fill="#e9e4dc" opacity="0.7" />
        <circle cx="196" cy="49" r="5" fill="#e9e4dc" opacity="0.5" />
        <rect x="236" y="96" width="30" height="22" fill="#e7d2ad" stroke="#6b4a2b" strokeWidth="2" />
        <path d="M231 98 L251 80 L271 98 Z" fill="#a8493a" stroke="#6b4a2b" strokeWidth="2" strokeLinejoin="round" />
      </g>
      {/* trees */}
      <g fill="#5d7f45" stroke="#3f5a2e" strokeWidth="2">
        <circle cx="35" cy="100" r="14" />
        <circle cx="125" cy="104" r="11" />
        <circle cx="315" cy="98" r="15" />
      </g>
      <path d="M150 150 Q170 128 172 118" stroke="#d9bf8c" strokeWidth="8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function TownScreen({ onSkill, onBank, onGear }: { onSkill: (s: SkillId) => void; onBank: () => void; onGear: () => void }) {
  const { player } = useGame();
  return (
    <div className="screen">
      <div className="town-hero">
        <TownScene />
        <div className="town-title">
          <h1>Pocketvale</h1>
          <p>A quiet town at the edge of the hills</p>
        </div>
      </div>

      <h2 className="group-title">Places in town</h2>
      <div className="places">
        {SKILL_ORDER.map((s) => (
          <button key={s} className="place" onClick={() => onSkill(s)}>
            <span className={`skill-badge skill-${s}`}><UiIcon name={s} size={26} /></span>
            <span className="place-name">{SKILLS[s].place}</span>
            <span className="small muted">{SKILLS[s].name} · Lv {skillLevel(player, s)}</span>
          </button>
        ))}
        <button className="place" onClick={onBank}>
          <span className="skill-badge skill-bank"><UiIcon name="bank" size={26} /></span>
          <span className="place-name">The Bank</span>
          <span className="small muted">Store your items</span>
        </button>
        <button className="place" onClick={onGear}>
          <span className="skill-badge skill-gear"><UiIcon name="gear" size={26} /></span>
          <span className="place-name">Armoury</span>
          <span className="small muted">Equip your gear</span>
        </button>
      </div>
      <p className="small muted center">New roads to Ironmoor and beyond will open in future updates.</p>
    </div>
  );
}
