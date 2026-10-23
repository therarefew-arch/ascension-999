import { useCallback, useEffect, useState } from 'react';
import { sound } from '../audio/sound';
import type { SkillId } from '../data/items';
import { ACTIONS, SKILLS } from '../data/skills';
import { usedSlots } from '../core/inventory';
import { INVENTORY_SLOTS } from '../core/player';
import { game, useGame } from '../core/store';
import { ActionProgress } from './components';
import { ItemIcon, UiIcon, type UiIconName } from './icons';
import { AwayCard } from './AwayCard';
import { BagSheet } from './BagSheet';
import { ItemSheet, type ItemPlace } from './ItemSheet';
import { BankScreen } from './screens/BankScreen';
import { GearScreen } from './screens/GearScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SkillDetail, SkillsScreen } from './screens/SkillsScreen';
import { TownScreen } from './screens/TownScreen';

type Tab = 'town' | 'skills' | 'bank' | 'gear' | 'settings';

function ActivityStrip({ onOpen }: { onOpen: (s: SkillId) => void }) {
  const { player } = useGame();
  const action = player.idle ? ACTIONS[player.idle.actionId] : null;
  if (action) {
    return (
      <div className="activity">
        <button className="activity-main" onClick={() => onOpen(action.skill)}>
          <ItemIcon id={action.iconItem} size={30} />
          <div className="grow">
            <div className="activity-text"><span className="muted">{SKILLS[action.skill].verb}</span> {action.name}</div>
            <ActionProgress player={player} thin />
          </div>
        </button>
        <button className="icon-btn stop" onClick={() => game.stopAction()} aria-label="Stop"><UiIcon name="stop" size={20} /></button>
      </div>
    );
  }
  if (player.lastStop) {
    const stopped = ACTIONS[player.lastStop.actionId];
    return (
      <div className="activity stopped">
        <button className="activity-main" onClick={() => onOpen(stopped.skill)}>
          <ItemIcon id={stopped.iconItem} size={30} />
          <div className="activity-text"><span className="bad-text">Stopped:</span> {player.lastStop.reason}</div>
        </button>
        <button className="icon-btn" onClick={() => game.clearLastStop()} aria-label="Dismiss"><UiIcon name="close" size={18} /></button>
      </div>
    );
  }
  return (
    <div className="activity idle-hint">
      <button className="activity-main" onClick={() => onOpen('mining')}>
        <span className="muted">Not doing anything.</span> <b>Choose an activity ›</b>
      </button>
    </div>
  );
}

const NAV: { tab: Tab; label: string; icon: UiIconName }[] = [
  { tab: 'town', label: 'Town', icon: 'town' },
  { tab: 'skills', label: 'Skills', icon: 'skills' },
  { tab: 'bank', label: 'Bank', icon: 'bank' },
  { tab: 'gear', label: 'Gear', icon: 'gear' },
];

export function App() {
  const { player, away, toasts } = useGame();
  const [tab, setTab] = useState<Tab>('town');
  const [skill, setSkill] = useState<SkillId | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const [itemView, setItemView] = useState<{ id: string; from: ItemPlace } | null>(null);
  const closeItem = useCallback(() => setItemView(null), []);
  const closeBag = useCallback(() => setBagOpen(false), []);

  // Sound can only start after the first tap (browser rule).
  useEffect(() => {
    sound.playMusic('music_town');
    const unlock = () => sound.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
  }, []);

  // Light click sound on every button press.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('button');
      if (el && !el.disabled && el.dataset.silent === undefined) sound.play('click');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  const go = (t: Tab) => { setTab(t); setSkill(null); window.scrollTo(0, 0); document.querySelector('.content')?.scrollTo(0, 0); };
  const openSkill = (s: SkillId) => { setTab('skills'); setSkill(s); document.querySelector('.content')?.scrollTo(0, 0); };
  const used = usedSlots(player.inventory);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Pocketvale</div>
        <button className={`icon-btn ${tab === 'settings' ? 'on' : ''}`} onClick={() => go('settings')} aria-label="Settings">
          <UiIcon name="settings" />
        </button>
      </header>
      <ActivityStrip onOpen={openSkill} />

      <main className="content">
        {tab === 'town' && <TownScreen onSkill={openSkill} onBank={() => go('bank')} onGear={() => go('gear')} />}
        {tab === 'skills' && (skill ? <SkillDetail skill={skill} onBack={() => setSkill(null)} /> : <SkillsScreen onOpen={openSkill} />)}
        {tab === 'bank' && <BankScreen onItem={(id) => setItemView({ id, from: 'bank' })} />}
        {tab === 'gear' && <GearScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      <nav className="bottomnav" aria-label="Main">
        {NAV.slice(0, 2).map((n) => (
          <button key={n.tab} className={`nav-btn ${tab === n.tab ? 'on' : ''}`} onClick={() => go(n.tab)} aria-current={tab === n.tab}>
            <UiIcon name={n.icon} /><span>{n.label}</span>
          </button>
        ))}
        <button className={`bag-btn ${used >= INVENTORY_SLOTS ? 'full' : ''}`} onClick={() => setBagOpen(true)} aria-label={`Open bag, ${used} of ${INVENTORY_SLOTS} slots used`}>
          <UiIcon name="bag" size={30} />
          <span className="bag-count">{used}/{INVENTORY_SLOTS}</span>
        </button>
        {NAV.slice(2).map((n) => (
          <button key={n.tab} className={`nav-btn ${tab === n.tab ? 'on' : ''}`} onClick={() => go(n.tab)} aria-current={tab === n.tab}>
            <UiIcon name={n.icon} /><span>{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.text}</div>)}
      </div>

      {bagOpen && <BagSheet onClose={closeBag} onItem={(id) => setItemView({ id, from: 'bag' })} />}
      {itemView && <ItemSheet id={itemView.id} from={itemView.from} onClose={closeItem} />}
      {away && <AwayCard away={away} />}
    </div>
  );
}
