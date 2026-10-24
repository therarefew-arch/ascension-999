import { useCallback, useEffect, useState } from 'react';
import { sound } from '../audio/sound';
import { ACTIONS, ALL_SKILLS } from '../data/skills';
import type { SkillId } from '../data/items';
import { runningSlots, skillLevel } from '../core/idle';
import { fightMonster, isFightId, maxHp } from '../core/combat';
import { CombatScreen } from './screens/CombatScreen';
import { TradingPostScreen } from './screens/TradingPostScreen';
import { JournalScreen } from './screens/JournalScreen';
import { usedSlots } from '../core/inventory';
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
import { ProfileScreen } from './screens/ProfileScreen';
import { PET_MAP } from '../data/pets';
import { SkillScreen, SkillStrip } from './screens/SkillScreen';
import { TownScreen } from './screens/TownScreen';
import { fmtNum } from './format';
import { cozyBadge } from '../core/cozy';
import { Confetti, LuckyStar } from './Cozy';

type Tab = 'town' | 'skills' | 'combat' | 'bank' | 'gear' | 'profile' | 'market' | 'journal';

function StatusBar({ onIdle, onSettings, settingsOn, onTown, townOn }: {
  onIdle: () => void; onSettings: () => void; settingsOn: boolean; onTown: () => void; townOn: boolean;
}) {
  const { player } = useGame();
  const total = ALL_SKILLS.reduce((sum, s) => sum + skillLevel(player, s), 0);
  return (
    <header className="topbar">
      <div className="topbar-chips">
      <span className="stat-chip gold-chip" title="Total level"><UiIcon name="trophy" size={14} /> {total}</span>
      <span className="stat-chip coin-chip" title="Coins"><UiIcon name="coin" size={14} /> {fmtNum(player.coins)}</span>
      {player.bonfire && player.bonfire.until > Date.now() && (
        <span className="stat-chip fire-chip" title="Bonfire: +5% XP to all skills">🔥 {Math.ceil((player.bonfire.until - Date.now()) / 60000)}m</span>
      )}
      <button className={`stat-chip gold-chip ${townOn ? 'chip-on' : ''} ${cozyBadge(player) ? 'badge-dot' : ''}`} onClick={onTown} aria-label={`Open ${player.location} town`}>
        {player.travel
          ? <>🚶 → {player.travel.to} {Math.max(0, Math.ceil((player.travel.arriveAt - Date.now()) / 1000))}s</>
          : <><UiIcon name="pin" size={14} /> {player.location}</>}
      </button>
      <button className={`stat-chip blue-chip ${runningSlots(player).length ? 'live' : ''}`} onClick={onIdle} aria-label="Idle slots">
        <UiIcon name="clock" size={14} /> {runningSlots(player).length}/{player.unlockedSlots}
      </button>
      </div>
      <button className={`profile-btn ${settingsOn ? 'on' : ''}`} onClick={onSettings} aria-label="Profile (stats, gear, pets, settings)">
        {player.activePet && PET_MAP[player.activePet] ? <span className="profile-pet">{PET_MAP[player.activePet].emoji}</span> : <UiIcon name="profile" size={22} />}
      </button>
    </header>
  );
}

function IdleLine({ onOpen, onFight }: { onOpen: () => void; onFight: () => void }) {
  const { player } = useGame();
  const running = runningSlots(player);
  if (running.length > 1) {
    return (
      <button className="idle-line" onClick={onOpen}>
        <span className="ellipsis"><UiIcon name="bolt" size={14} /> {running.map((r) => isFightId(r.slot.actionId) ? `⚔ ${fightMonster(r.slot.actionId).name}` : ACTIONS[r.slot.actionId]?.name).join(' · ')}</span>
        <span className="mono blue">{running.length}/{player.unlockedSlots} slots</span>
      </button>
    );
  }
  const only = running[0]?.slot;
  if (only && isFightId(only.actionId) && player.fight) {
    const m = fightMonster(only.actionId);
    return (
      <button className="idle-line" onClick={onFight}>
        <span className="ellipsis"><UiIcon name="combat" size={14} /> Fighting {m.name}</span>
        <span className="mono red"><UiIcon name="heart" size={13} /> {player.hp}/{maxHp(player)}</span>
        <span className="mono gold">{player.fight.kills} kills</span>
      </button>
    );
  }
  const action = only ? ACTIONS[only.actionId] : null;
  if (!action) {
    return (
      <button className={`idle-line ${player.lastStop ? 'stopped' : ''}`} onClick={onOpen}>
        {player.lastStop
          ? <><span className="red">Idle stopped:</span> <span className="ellipsis">{player.lastStop.reason}</span></>
          : <><span className="muted">Not idling.</span> <span className="gold">Tap to choose an idle skill ›</span></>}
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

// Town moved to the "Pocketvale" chip in the top bar to make room for Combat.
const NAV: { tab: Tab; label: string; icon: UiIconName }[] = [
  { tab: 'skills', label: 'Skills', icon: 'skills' },
  { tab: 'combat', label: 'Combat', icon: 'combat' },
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
      if (!el || el.disabled || el.dataset.silent !== undefined) return;
      // A woody "tock": deeper for the big nav buttons, brighter for main action buttons.
      const c = el.classList;
      if (c.contains('bag-btn')) sound.play('click', { rate: 0.7 });
      else if (c.contains('nav-btn')) sound.play('click', { rate: 0.85 });
      else if (c.contains('btn-primary') || c.contains('btn-hero')) sound.play('click', { rate: 1.12 });
      else sound.play('click');
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
      <StatusBar onIdle={() => setIdleOpen(true)} onSettings={() => go(tab === 'profile' ? 'town' : 'profile')} settingsOn={tab === 'profile'}
        onTown={() => go('town')} townOn={tab === 'town'} />
      <IdleLine onOpen={() => setIdleOpen(true)} onFight={() => go('combat')} />

      <main className={`content ${tab === 'skills' ? 'content-skill' : ''}`}>
        {tab === 'town' && <TownScreen onSkill={openSkill} onSkills={() => go('skills')} onCombat={() => go('combat')} onMarket={() => go('market')} onJournal={() => go('journal')} />}
        {tab === 'market' && <TradingPostScreen />}
        {tab === 'journal' && <JournalScreen />}
        {tab === 'skills' && <SkillScreen skill={skill} />}
        {tab === 'combat' && <CombatScreen onItem={(id) => setItemView({ id, from: 'bag' })} />}
        {tab === 'bank' && <BankScreen onItem={(id) => setItemView({ id, from: 'bank' })} />}
        {tab === 'gear' && <GearScreen />}
        {tab === 'profile' && <ProfileScreen onGear={() => go('gear')} />}
      </main>
      {tab === 'skills' && <SkillStrip selected={skill} onSelect={setSkill} />}

      <nav className="bottomnav" aria-label="Main">
        {NAV.slice(0, 2).map((n) => (
          <button key={n.tab} className={`nav-btn ${tab === n.tab ? 'on' : ''}`} onClick={() => go(n.tab)} aria-current={tab === n.tab}>
            <UiIcon name={n.icon} /><span>{n.label}</span>
          </button>
        ))}
        <button className={`bag-btn ${used >= player.inventory.length ? 'full' : used >= player.inventory.length - 3 ? 'nearly' : ''}`} onClick={() => setBagOpen(true)} aria-label={`Open bag, ${used} of ${player.inventory.length} slots used`}>
          <UiIcon name="bag" size={30} />
          <span className="bag-count">{used}/{player.inventory.length}</span>
        </button>
        {NAV.slice(2).map((n) => (
          <button key={n.tab} className={`nav-btn ${tab === n.tab ? 'on' : ''}`} onClick={() => go(n.tab)} aria-current={tab === n.tab}>
            <UiIcon name={n.icon} /><span>{n.label}</span>
          </button>
        ))}
      </nav>

      {toasts_}
      <Confetti />
      <LuckyStar />
      {bagOpen && <BagSheet onClose={closeBag} onItem={(id) => setItemView({ id, from: 'bag' })} />}
      {itemView && <ItemSheet id={itemView.id} from={itemView.from} onClose={closeItem} onReroll={(next) => setItemView({ id: next, from: 'bag' })} />}
      {idleOpen && <IdleSlots onClose={() => setIdleOpen(false)} />}
      {away && <AwayCard away={away} />}
    </div>
  );
}
