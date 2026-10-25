// Adventurer's Journal: XP tracker, collection log and pets.
import { useEffect, useState } from 'react';
import { ITEM_LIST, type ItemCategory } from '../../data/items';
import { PETS, PET_XP_BONUS } from '../../data/pets';
import { OPEN_REGIONS, regionOpen } from '../../data/tiers';
import { LORE, TOWN_VIBE, type LoreTrigger } from '../../data/lore';
import { MONSTER_MAP } from '../../data/monsters';
import { SKILLS } from '../../data/skills';
import { trackerGains } from '../../core/qol';
import { game, useGame } from '../../core/store';
import { ItemIcon, UiIcon } from '../icons';
import { fmtDuration, fmtNum } from '../format';
import { PixelScene } from '../PixelScene';

type JournalTab = 'tracker' | 'collection' | 'pets' | 'tales';

function Tracker() {
  const { player } = useGame();
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 2000); return () => clearInterval(t); }, []);
  const gains = trackerGains(player);
  const total = gains.reduce((a, g) => a + g.gained, 0);
  return (
    <>
      <div className="row-between">
        <p className="small muted">Tracking for <b className="gold">{fmtDuration(Date.now() - player.tracker.since)}</b> · {fmtNum(total)} XP total</p>
        <button className="btn btn-outline" onClick={() => game.resetTracker()}><UiIcon name="refresh" size={14} /> Reset</button>
      </div>
      {gains.length === 0 && <div className="empty">No XP gained yet since the last reset. Go do something cozy!</div>}
      <div className="list">
        {gains.map((g) => (
          <div key={g.skill} className="market-row">
            <span className={`tile-icon skill-${g.skill} cs-${g.skill}`}><UiIcon name={g.skill as 'mining'} size={20} /></span>
            <div className="grow"><b>{SKILLS[g.skill].name}</b></div>
            <div className="mono small right">
              <div className="gold">+{fmtNum(g.gained)} XP</div>
              <div className="green">{fmtNum(g.perHour)} XP/hr</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const COLLECTION_GROUPS: { name: string; cats: ItemCategory[] }[] = [
  { name: 'Resources', cats: ['ore', 'bar', 'log', 'material', 'fish'] },
  { name: 'Food', cats: ['food'] },
  { name: 'Tools', cats: ['tool'] },
  { name: 'Weapons & armour', cats: ['weapon', 'armour'] },
  { name: 'Ammo & runes', cats: ['ammo'] },
  { name: 'Gems', cats: ['gem'] },
];

function Collection() {
  const { player } = useGame();
  // Only +0 versions of upgradable items, so the log isn't 11× too long.
  // Items from regions that aren't built yet are left out until those regions open.
  const all = ITEM_LIST.filter((it) => it.category !== 'currency' && (!it.upgrade || it.upgrade.level === 0) && regionOpen(it.region));
  const found = all.filter((it) => (player.collection[it.id] ?? 0) > 0 || Object.keys(player.collection).some((id) => id.startsWith(it.id + '_p')));
  return (
    <>
      <p className="small muted">You've found <b className="gold">{found.length}</b> of {all.length} items. Gems count each roll separately.</p>
      {COLLECTION_GROUPS.map((g) => {
        const items = all.filter((it) => g.cats.includes(it.category));
        const have = items.filter((it) => found.includes(it));
        return (
          <section key={g.name} className="block">
            <h3>{g.name} <span className="mono small muted">{have.length}/{items.length}</span></h3>
            <div className="grid">
              {items.map((it) => {
                const n = player.collection[it.id] ?? 0;
                const got = found.includes(it);
                return (
                  <div key={it.id} className={`slot ${got ? '' : 'unfound'}`} title={got ? `${it.name} × ${n}` : '???'}>
                    <ItemIcon id={it.id} size={36} />
                    {got && n > 0 && <span className="slot-qty">{n >= 1000 ? fmtNum(n) : n}</span>}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}

function Pets() {
  const { player } = useGame();
  return (
    <>
      <p className="small muted">Pets are rare finds while skilling (about 1 in 3,000 actions) — Bramble comes from Old Thornhide. Your active pet follows you and gives <b className="green">+{PET_XP_BONUS * 100}% XP</b> in its skill.</p>
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
              {owned && <span className="small">{pet.blurb}</span>}
              {owned && <span className={`start-pill ${active ? 'on' : ''}`}>{active ? 'Following you' : 'Choose'}</span>}
              {!owned && <span className="small dim">1 in {fmtNum(pet.odds)}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}

const HOW_FOUND: Record<LoreTrigger, string> = {
  arrive: 'Found by arriving in town',
  boss: 'Found by defeating the mini boss',
  find: 'Found by chance while skilling here',
};

/** 📜 Tales: short notes found in each town. */
function Tales() {
  const { player } = useGame();
  const towns = OPEN_REGIONS.filter((r) => LORE.some((n) => n.region === r));
  const total = LORE.filter((n) => regionOpen(n.region)).length;
  const found = player.lore.length;
  return (
    <>
      <p className="small muted">Little stories hidden in every town. {found}/{total} found.</p>
      {towns.map((r) => {
        const notes = LORE.filter((n) => n.region === r);
        const visited = player.regions.includes(r);
        return (
          <section key={r} className="tale-town">
            <div className="row-between">
              <h3>{r}</h3>
              <span className="small mono muted">{notes.filter((n) => player.lore.includes(n.id)).length}/{notes.length}</span>
            </div>
            <p className="small tale-vibe">{visited ? TOWN_VIBE[r] : 'You haven’t been here yet.'}</p>
            {notes.map((n) => player.lore.includes(n.id) ? (
              <article key={n.id} className="tale">
                <b>📜 {n.title}</b>
                <p>{n.text}</p>
              </article>
            ) : (
              <div key={n.id} className="tale locked">
                <b>??? </b><span className="small dim">{n.trigger === 'boss' && n.boss ? `Found by defeating ${MONSTER_MAP[n.boss]?.name ?? 'the mini boss'}` : HOW_FOUND[n.trigger]}</span>
              </div>
            ))}
          </section>
        );
      })}
      {player.lore.includes('ch_letter') && player.lore.includes('ch_clawsoot') && !player.lore.includes('bc_bottle') && (
        <p className="small center tale-tease">🌫️ Across the black water, the lights of Lunaria stay dark…</p>
      )}
      {player.lore.includes('bc_bottle') && player.lore.includes('bc_galewing') && (
        <p className="small center tale-tease">🔑 You have the bell tower key. Lunaria is waiting… (a future update)</p>
      )}
    </>
  );
}

export function JournalScreen() {
  const [tab, setTab] = useState<JournalTab>('tracker');
  return (
    <div className="skill-screen">
      <PixelScene scene="workshop" dim={0.75} className="screen-bg" />
      <div className="screen">
        <h1 className="screen-title">JOURNAL</h1>
        <div className="tab-row no-pad">
          <button className={`tab-pill ${tab === 'tracker' ? 'on' : ''}`} onClick={() => setTab('tracker')}><UiIcon name="bolt" size={14} /> XP TRACKER</button>
          <button className={`tab-pill ${tab === 'collection' ? 'on' : ''}`} onClick={() => setTab('collection')}><UiIcon name="bank" size={14} /> COLLECTION</button>
          <button className={`tab-pill ${tab === 'pets' ? 'on' : ''}`} onClick={() => setTab('pets')}><UiIcon name="heart" size={14} /> PETS</button>
          <button className={`tab-pill ${tab === 'tales' ? 'on' : ''}`} onClick={() => setTab('tales')}>📜 TALES</button>
        </div>
        {tab === 'tracker' && <Tracker />}
        {tab === 'collection' && <Collection />}
        {tab === 'pets' && <Pets />}
        {tab === 'tales' && <Tales />}
      </div>
    </div>
  );
}
