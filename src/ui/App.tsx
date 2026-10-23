import { useCallback, useEffect, useState } from 'react';
import { sound } from '../audio/sound';
import { SKILL_ORDER, ACTIONS } from '../data/skills';
import type { SkillId } from '../data/items';
import { skillLevel } from '../core/idle';
import { usedSlots } from '../core/inventory';
import { INVENTORY_SLOTS } from '../core/player';
import { timeToNextLevel, xpPerHour } from '../core/rates';
import { useGame } from '../core/store';
import { UiIcon, type UiIconName } from './icons';
import { AwayCard } from './AwayCard';
import { BagSheet } from './BagSheet';
import { IdleSlots } from './IdleSlots';
import { ItemSheet, type ItemPlace } from './ItemSheet';
import { TitleScreen } from './TitleScreen';
import { BankScreen } from './screens/BankScreen';
import { GearScreen } from './screens/GearScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SkillScreen, SkillStrip } from './screens/SkillScreen';
import { TownScreen } from './screens/TownScreen';
import { fmtNum } from './format';

type Tab = 'town' | 'skills' | 'bank' | 'gear' | 'settings';

function StatusBar({ onIdle, onSettings, settingsOn }: { onIdle: () => void; onSettings: () => void; settingsOn: boolean }) {
  const { player } = useGame();
  const total = SKILL_ORDER.reduce((sum, s) => sum + skillLevel(player, s), 0);
  return (
    <header className="topbar">
      <span className="stat-chip gold-chip"><UiIcon name="trophy" size={16} /> LV {total}</span>
      <span className="stat-chip gold-chip"><UiIcon name="pin" size={16} /> Pocketvale</span>
      <button className={`stat-chip blue-chip ${player.idle ? 'live' : ''}`} onClick={onIdle}>
        <UiIcon name="clock" size={16} /> IDLE ({player.idle ? 1 : 0}/1)
      </button>
      <button className={`icon-btn ${settingsOn ? 'on' : ''}`} onClick={onSettings} aria-label="Settings"><UiIcon name="settings" /></button>
    </header>
  );
}

function IdleLine({ onOpen }: { onOpen: () => void }) {
  const { player } = useGame();
  const action = player.idle ? ACTIONS[player.idle.actionId] : null;
  if (!action) {
    return (
      <button className={`idle-line ${player.lastStop ? 'stopped' : ''}`} onClick={onOpen}>
        {player.lastStop
          ? <><span className="red">Idle stopped:</span> <span className="ellipsis">{player.lastStop.reason}</span></>
          : <><span className="muted">Not idling.</span> <span className="gold">Tap to choose an idle skill â€º</span></>}
      </button>
    );
  }
  const eta = timeToNextLevel(player, action.skill);
  return (
    <button className="idle-line" onClick={onOpen}>
      <span className="ellipsis"><UiIcon name="bolt" size={14} /> {action.name}</span>
      <span className="mono green">{fmtNum(xpPerHour(player, action))} XP/h</span>
      {eta && <span className="mono blue"><UiIcon name="clock" size={13} /> ~{Math.max(1, Math.round(eta.ms / 60000))}m</span>}
    </button>
  );
}

const NAV: { tab: Tab; label: string; icon: UiIconName }[] = [
  { tab: 'town', label: 'Town', icon: 'town' },
  { tab: 'skills', label: 'Skills', icon: 'skills' },
  { tab: 'bank', label: 'Bank', icon: 'bank' },
  { tab: 'gear', label: 'Gear', icon: 'gear' },
];

export function App() {
  const { slot, player, away, toasts } = useGame();
  const [tab, setTab] = useState<Tab>('town');
  const [skill, setSkill] = useState<SkillId>('mining');
  const [bagOpen, setBagOpen] = useState(false);
  const [idleOpen, setIdleOpen] = useState(false);
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

  // Light click sound on button presses.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('button');
      if (el && !el.disabled && el.dataset.silent === undefined) sound.play('click');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Back on the title screen: reset to Town for next time.
  useEffect(() => { if (slot === null) { setTab('town'); setBagOpen(false); setIdleOpen(false); setItemView(null); } }, [slot]);

  const toasts_ = (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.text}</div>)}
    </div>
  );

  if (slot === null) return <div className="app">{<TitleScreen />}{toasts_}</div>;

  const go = (t: Tab) => { setTab(t); document.querySelector('.content')?.scrollTo(0, 0); };
  const openSkill = (s: SkillId) => { setSkill(s); setTab('skills'); document.querySelector('.content')?.scrollTo(0, 0); };
  const used = usedSlots(player.inventory);

  return (
    <div className="app">
      <StatusBar onIdle={() => setIdleOpen(true)} onSettings={() => go(tab === 'settings' ? 'town' : 'settings')} settingsOn={tab === 'settings'} />
      <IdleLine onOpen={() => setIdleOpen(true)} />

      <main className={`content ${tab === 'skills' ? 'content-skill' : ''}`}>
        {tab === 'town' && <TownScreen onSkill={openSkill} onBank={() => go('bank')} onGear={() => go('gear')} onIdle={() => setIdleOpen(true)} />}
        {tab === 'skills' && <SkillScreen skill={skill} />}
        {tab === 'bank' && <BankScreen onItem={(id) => setItemView({ id, from: 'bank' })} />}
        {tab === 'gear' && <GearScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>
      {tab === 'skills' && <SkillStrip selected={skill} onSelect={setSkill} />}

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

      {toasts_}
      {bagOpen && <BagSheet onClose={closeBag} onItem={(id) => setItemView({ id, from: 'bag' })} />}
      {itemView && <ItemSheet id={itemView.id} from={itemView.from} onClose={closeItem} />}
      {idleOpen && <IdleSlots onClose={() => setIdleOpen(false)} />}
      {away && <AwayCard away={away} />}
    </div>
  );
}
