// 🧰 The helper line on a skill screen: the helper this skill uses (tap to pause/resume), and the one it turns up.
import { HELPER_FOR, HELPER_FROM, helperText } from '../data/helpers';
import type { SkillId } from '../data/items';
import { SKILLS } from '../data/skills';
import { helperCount, helperPaused } from '../core/helpers';
import { game, useGame } from '../core/store';
import { fmtNum } from './format';

export function HelperRow({ skill }: { skill: SkillId }) {
  const { player } = useGame();
  const uses = HELPER_FOR[skill];
  const makes = HELPER_FROM[skill];
  if (!uses && !makes) return null;
  const n = uses ? helperCount(player, uses) : 0;
  const paused = uses ? helperPaused(player, uses) : false;
  return (
    <div className="hl-row">
      {uses && (n > 0 ? (
        <button className={`hl-chip use ${paused ? 'off' : ''}`} onClick={() => game.toggleHelper(uses.id)}
          title={paused ? 'Paused — tap to use them again' : 'Used up 1 per action — tap to save them for later'}>
          {uses.emoji} {uses.name} ×{fmtNum(n)} · {paused ? 'paused' : helperText(uses)}
        </button>
      ) : (
        <span className="hl-chip none" title={`Train ${SKILLS[uses.from].name} to find them`}>
          {uses.emoji} {uses.name} help here · from {SKILLS[uses.from].name}
        </span>
      ))}
      {makes && (
        <span className="hl-chip make" title={`${makes.name} turn up now and then while you train ${SKILLS[skill].name}. ${makes.blurb}`}>
          Turns up {makes.emoji} for {SKILLS[makes.helps].name}
        </span>
      )}
    </div>
  );
}
