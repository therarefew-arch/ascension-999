// Profile: your character wearing your gear, your stats, your pets, and settings.
import { useState } from 'react';
import { ARMOUR_SLOTS, getItem, SLOT_LABELS } from '../../data/items';
import { PETS, PET_XP_BONUS } from '../../data/pets';
import { ALL_SKILLS, COMBAT_SKILLS, SKILL_ORDER, SKILLS } from '../../data/skills';
import { combatStats, maxHp } from '../../core/combat';
import { skillLevel } from '../../core/idle';
import { game, useGame } from '../../core/store';
import { levelProgress, MAX_LEVEL } from '../../core/xp';
import { Avatar } from '../Avatar';
import { ItemIcon, UiIcon } from '../icons';
import { fmtDuration, fmtNum } from '../format';
import { PixelScene } from '../PixelScene';
import { SettingsScreen } from './SettingsScreen';
import { hasSavedParade, PetParade } from '../PetParade';

export type ProfileTab = 'character' | 'stats' | 'pets' | 'settings';

function Character({ onGear }: { onGear: () => void }) {
  const { player } = useGame();
  const s = combatStats(player);
  const total = ALL_SKILLS.reduce((sum, k) => sum + skillLevel(player, k), 0);
  return (
    <>
      <div className="profile-hero">
        <Avatar player={player} size={200} />
        <div className="profile-name">Adventurer</div>
        <div className="mono small muted">Total level {fmtNum(total)} · {fmtNum(player.coins)} coins</div>
      </div>
      <div className="card">
        <div className="row-between"><h3>Equipped</h3><button className="btn btn-outline" onClick={onGear}><UiIcon name="gear" size={14} /> Change gear</button></div>
        <div className="equip-list">
          {ARMOUR_SLOTS.map((slot) => {
            const id = player.equipment[slot];
            const gem = player.sockets[slot];
            return (
              <div key={slot} className="equip-row">
                <span className="small muted equip-slot">{SLOT_LABELS[slot]}</span>
                {id ? <ItemIcon id={id} size={28} /> : <span className="gear-empty small-empty" />}
                <span className="grow small">{id ? getItem(id).name : <span className="dim">Nothing</span>}</span>
                {gem && <ItemIcon id={gem} size={22} />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <h3>Combat</h3>
        <div className="stat-list">
          <div className="stat-line"><span>Style</span><b>{s.style[0].toUpperCase() + s.style.slice(1)}</b></div>
          <div className="stat-line"><span>Hit points</span><b>{player.hp}/{maxHp(player)}</b></div>
          <div className="stat-line"><span>Attack bonus</span><b>{s.attack}</b></div>
          <div className="stat-line"><span>Defense bonus</span><b>{s.defense}</b></div>
          <div className="stat-line"><span>Max hit</span><b>{s.maxHit}</b></div>
          <div className="stat-line"><span>Attack speed</span><b>{(s.speedMs / 1000).toFixed(1)}s</b></div>
        </div>
      </div>
    </>
  );
}

function SkillRow({ skill }: { skill: (typeof ALL_SKILLS)[number] }) {
  const { player } = useGame();
  const prog = levelProgress(player.skills[skill].xp);
  return (
    <div className="stats-skill">
      <span className={`tile-icon skill-${skill} cs-${skill}`}><UiIcon name={skill as 'mining'} size={18} /></span>
      <div className="grow">
        <div className="row-between"><b className="small">{SKILLS[skill].name}</b><span className="mono small gold">{prog.level}<span className="dim">/{MAX_LEVEL}</span></span></div>
        <div className="cskill-bar wide"><div style={{ width: `${prog.fraction * 100}%` }} /></div>
        <div className="mono tiny muted">{fmtNum(player.skills[skill].xp)} XP</div>
      </div>
    </div>
  );
}

function Stats() {
  const { player } = useGame();
  const total = ALL_SKILLS.reduce((sum, k) => sum + skillLevel(player, k), 0);
  const found = Object.keys(player.collection).length;
  return (
    <>
      <div className="stat-tiles">
        <div className="stat-tile"><b>{fmtNum(total)}</b><span>Total level</span></div>
        <div className="stat-tile"><b>{fmtNum(player.coins)}</b><span>Coins</span></div>
        <div className="stat-tile"><b>{player.pets.length}/{PETS.length}</b><span>Pets</span></div>
        <div className="stat-tile"><b>{fmtNum(found)}</b><span>Items found</span></div>
        <div className="stat-tile"><b>{fmtDuration(Date.now() - player.createdAt)}</b><span>Adventuring</span></div>
        <div className="stat-tile"><b>{player.unlockedSlots}/3</b><span>Idle slots</span></div>
        <div className="stat-tile"><b>{fmtNum(player.starsCaught)}</b><span>Lucky Stars</span></div>
        <div className="stat-tile"><b>{player.daily.streak}</b><span>Day streak</span></div>
        <div className="stat-tile"><b>{Object.keys(player.goals).length}</b><span>Goals set</span></div>
      </div>
      <h2 className="section-title">SKILLS</h2>
      <div className="stats-grid">{SKILL_ORDER.map((s) => <SkillRow key={s} skill={s} />)}</div>
      <h2 className="section-title">COMBAT</h2>
      <div className="stats-grid">{COMBAT_SKILLS.map((s) => <SkillRow key={s} skill={s} />)}</div>
    </>
  );
}

function Pets() {
  const { player, slot } = useGame();
  const [parade, setParade] = useState(false);
  return (
    <>
      <button className="lw-launch pp-launch" onClick={() => setParade(true)}>
        <span className="lw-launch-emoji">🎪</span>
        <span className="grow"><b>Pet Parade</b><span className="small muted">{hasSavedParade(slot)
          ? '💾 Your parade is waiting — tap to carry on.'
          : 'Line up 5 critters and march against rival parades. Your pets join the stall as champions!'}</span></span>
        <span className="lw-launch-go">▶</span>
      </button>
      {parade && <PetParade onClose={() => setParade(false)} />}
      <p className="small muted">Tap a pet to have it follow you (+{PET_XP_BONUS * 100}% XP in its skill). Pets are rare finds while skilling and from bosses.</p>
      <div className="pet-grid">
        {PETS.map((pet) => {
          const owned = player.pets.includes(pet.id);
          const active = player.activePet === pet.id;
          return (
            <button key={pet.id} className={`pet-card ${owned ? 'owned' : ''} ${active ? 'active' : ''}`} disabled={!owned}
              onClick={() => game.setActivePet(active ? null : pet.id)}>
              <span className="pet-emoji">{owned ? pet.emoji : '❔'}</span>
              <b>{owned ? pet.name : '???'}</b>
              <span className="small muted">{pet.skill === 'combat' ? 'Combat' : SKILLS[pet.skill].name}</span>
              {owned && <span className={`start-pill ${active ? 'on' : ''}`}>{active ? 'Equipped' : 'Equip'}</span>}
              {!owned && <span className="small dim">{pet.odds > 0 ? `1 in ${fmtNum(pet.odds)}` : 'A special reward'}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}

export function ProfileScreen({ onGear, startTab = 'character' }: { onGear: () => void; startTab?: ProfileTab }) {
  const [tab, setTab] = useState<ProfileTab>(startTab);
  return (
    <div className="skill-screen">
      <PixelScene scene="town" dim={0.75} className="screen-bg" />
      <div className="screen">
        <h1 className="screen-title">PROFILE</h1>
        <div className="tab-row no-pad">
          <button className={`tab-pill ${tab === 'character' ? 'on' : ''}`} onClick={() => setTab('character')}><UiIcon name="gear" size={14} /> CHARACTER</button>
          <button className={`tab-pill ${tab === 'stats' ? 'on' : ''}`} onClick={() => setTab('stats')}><UiIcon name="trophy" size={14} /> STATS</button>
          <button className={`tab-pill ${tab === 'pets' ? 'on' : ''}`} onClick={() => setTab('pets')}><UiIcon name="heart" size={14} /> PETS</button>
          <button className={`tab-pill ${tab === 'settings' ? 'on' : ''}`} onClick={() => setTab('settings')}><UiIcon name="settings" size={14} /> SETTINGS</button>
        </div>
        {tab === 'character' && <Character onGear={onGear} />}
        {tab === 'stats' && <Stats />}
        {tab === 'pets' && <Pets />}
      </div>
      {tab === 'settings' && <SettingsScreen />}
    </div>
  );
}
