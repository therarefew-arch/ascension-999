// 📖 "Settling In": the starter questline card on the Town screen.
import type { SkillId } from '../data/items';
import { currentStep, stepDone, stepGoal, stepProgress, TUTORIAL } from '../core/tutorial';
import { getItem } from '../data/items';
import { game, useGame } from '../core/store';

export function SettlingIn({ onSkill, onCombat }: { onSkill: (s: SkillId) => void; onCombat: () => void }) {
  const { player } = useGame();
  const step = currentStep(player);
  if (!step) return null;
  const goal = stepGoal(step);
  const progress = Math.min(goal, stepProgress(player));
  const done = stepDone(player);
  const go = () => {
    if (step.go === 'combat') onCombat();
    else if (step.go !== 'travel') onSkill(step.go);
  };
  const reward = step.reward.map((g) => (g.id === 'coins' ? `${g.qty} coins` : `${g.qty} ${getItem(g.id).name}`)).join(' + ');
  return (
    <section className="si-card">
      <div className="row-between">
        <h2 className="section-title">📖 SETTLING IN</h2>
        <span className="small mono muted">{player.tutorial.step + 1}/{TUTORIAL.length}</span>
      </div>
      <b className="si-title">{step.title}</b>
      <p className="small si-story">{step.story}</p>
      <div className="si-goal">
        <div className="grow">
          <div className="small"><b>{step.label}</b> <span className="muted">· reward {reward}</span></div>
          <div className="bar bar-thin"><div className="bar-fill tone-gold" style={{ width: `${(progress / goal) * 100}%` }} /></div>
        </div>
        <span className="mono small muted">{progress}/{goal}</span>
      </div>
      {done
        ? <button className="btn btn-hero btn-wide" onClick={() => game.claimTutorialStep()}>✨ Claim reward</button>
        : step.go !== 'travel' && <button className="btn btn-wide" onClick={go}>Go ›</button>}
    </section>
  );
}
