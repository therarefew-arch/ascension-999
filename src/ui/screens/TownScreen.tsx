import type { SkillId } from '../../data/items';
import { SKILL_ORDER, SKILLS } from '../../data/skills';
import { skillLevel } from '../../core/idle';
import { useGame } from '../../core/store';
import { UiIcon } from '../icons';
import { PixelScene } from '../PixelScene';

export function TownScreen({ onSkill, onBank, onGear, onIdle, onCombat }: { onSkill: (s: SkillId) => void; onBank: () => void; onGear: () => void; onIdle: () => void; onCombat: () => void }) {
  const { player } = useGame();
  return (
    <div className="screen">
      <div className="town-hero">
        <PixelScene scene="town" dim={0} />
        <div className="town-title">
          <h1>POCKETVALE</h1>
          <p>A quiet town at the edge of the hills</p>
        </div>
      </div>

      <h2 className="section-title">PLACES IN TOWN</h2>
      <div className="places">
        {SKILL_ORDER.map((s) => (
          <button key={s} className="place" onClick={() => onSkill(s)}>
            <span className={`tile-icon big skill-${s}`}><UiIcon name={s} size={26} /></span>
            <span className="place-name">{SKILLS[s].place}</span>
            <span className="mono small muted">{SKILLS[s].name} · Lv {skillLevel(player, s)}</span>
          </button>
        ))}
        <button className="place" onClick={onCombat}>
          <span className="tile-icon big skill-combat"><UiIcon name="combat" size={26} /></span>
          <span className="place-name">Training Grounds</span>
          <span className="mono small muted">Fight monsters</span>
        </button>
        <button className="place" onClick={onBank}>
          <span className="tile-icon big skill-bank"><UiIcon name="bank" size={26} /></span>
          <span className="place-name">The Bank</span>
          <span className="mono small muted">Store your items</span>
        </button>
        <button className="place" onClick={onGear}>
          <span className="tile-icon big skill-gear"><UiIcon name="gear" size={26} /></span>
          <span className="place-name">Armoury</span>
          <span className="mono small muted">Equip your gear</span>
        </button>
      </div>
      <button className="btn btn-idle btn-lg btn-wide" onClick={onIdle}><UiIcon name="clock" size={18} /> Idle skill slots</button>
      <p className="small dim center">New roads to Ironmoor and beyond will open in future updates.</p>
    </div>
  );
}
