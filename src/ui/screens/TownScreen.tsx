import { useEffect, useState } from 'react';
import type { SkillId } from '../../data/items';
import { SKILL_ORDER, SKILLS } from '../../data/skills';
import { OPEN_REGIONS, REGION_INFO, REGIONS, type Region } from '../../data/tiers';
import { skillLevel } from '../../core/idle';
import { highestSkill, whyCantTravel } from '../../core/travel';
import { game, useGame } from '../../core/store';
import { UiIcon } from '../icons';
import { PixelScene } from '../PixelScene';
import { PET_MAP } from '../../data/pets';
import { fmtDuration } from '../format';

/** Some places have a local name in each town. */
const PLACE_NAMES: Partial<Record<Region, Partial<Record<SkillId, string>>>> = {
  Ironmoor: {
    mining: 'The Deep Mine', smithing: 'Ironworks Forge', woodcutting: 'Oakwood Grove', fishing: 'Rushwater Falls',
    cooking: 'Miners’ Canteen', firemaking: 'The Ember Pit', crafting: 'Tinker’s Bench', runecrafting: 'Stone Circle', enhancing: 'Rune Anvil',
  },
};
const TRAINING: Partial<Record<Region, string>> = { Pocketvale: 'Training Grounds', Ironmoor: 'Mine Tunnels' };

/** Map of the realm: walk (free) or fast travel (coins) between towns. */
function TravelMap() {
  const { player } = useGame();
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const best = highestSkill(player);
  return (
    <section className="block">
      <h2 className="section-title">TRAVEL</h2>
      {player.travel && (
        <div className="travel-card on-road">
          <span className="travel-walker bob">🚶</span>
          <div className="grow">
            <b>On the road to {player.travel.to}</b>
            <div className="bar bar-thin"><div className="bar-fill tone-gold" style={{ width: `${Math.min(100, ((Date.now() - player.travel.startedAt) / (player.travel.arriveAt - player.travel.startedAt)) * 100)}%` }} /></div>
            <div className="small muted">Arriving in {fmtDuration(Math.max(0, player.travel.arriveAt - Date.now()))} · your idle slots keep working</div>
          </div>
          <button className="icon-btn" aria-label="Turn back" onClick={() => game.cancelTravel()}><UiIcon name="close" size={18} /></button>
        </div>
      )}
      <div className="region-list">
        {REGIONS.map((r, i) => {
          const built = OPEN_REGIONS.includes(r);
          const info = REGION_INFO[r];
          const here = player.location === r;
          const visited = player.regions.includes(r);
          const level = i === 0 ? 1 : i * 90;
          if (!built) {
            return (
              <div key={r} className="region-row locked">
                <span className="region-num mono">{level}</span>
                <div className="grow"><b>{r}</b><div className="small dim">Coming in a future update</div></div>
                <UiIcon name="lock" size={16} />
              </div>
            );
          }
          const roadOpen = best >= (info?.unlockLevel ?? 1);
          return (
            <div key={r} className={`region-row ${here ? 'here' : ''}`}>
              <span className="region-num mono">{level}</span>
              <div className="grow">
                <b>{r}</b> {here && <span className="chip up">You are here</span>}
                <div className="small muted">{info?.blurb}{!visited && roadOpen ? ' · not yet discovered' : ''}</div>
                {!roadOpen && <div className="small red">Road opens when any skill reaches level {info?.unlockLevel}</div>}
              </div>
              {!here && roadOpen && (
                <div className="travel-btns">
                  <button className="btn" disabled={!!whyCantTravel(player, r, false)} onClick={() => game.walkTo(r)}>🚶 Walk {fmtDuration(info!.walkMs)}</button>
                  {visited && <button className="btn btn-primary" disabled={!!whyCantTravel(player, r, true)} onClick={() => game.fastTravel(r)}>✨ {info!.fastTravelCoins}g</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TownScreen({ onSkill, onBank, onGear, onIdle, onCombat, onMarket, onJournal }: { onSkill: (s: SkillId) => void; onBank: () => void; onGear: () => void; onIdle: () => void; onCombat: () => void; onMarket: () => void; onJournal: () => void }) {
  const { player } = useGame();
  const here = player.location;
  const info = REGION_INFO[here];
  const names = PLACE_NAMES[here] ?? {};
  return (
    <div className="screen">
      <div className="town-hero">
        <PixelScene scene={info?.scene ?? 'town'} dim={0} />
        <div className="town-title">
          <h1>{here.toUpperCase()}</h1>
          <p>{info?.blurb}</p>
        </div>
        {player.activePet && PET_MAP[player.activePet] && (
          <button className="town-pet" onClick={onJournal} aria-label={`${PET_MAP[player.activePet].name} follows you`}>
            <span className="pet-emoji bob">{PET_MAP[player.activePet].emoji}</span>
            <span className="small">{PET_MAP[player.activePet].name}</span>
          </button>
        )}
      </div>

      <h2 className="section-title">PLACES IN TOWN</h2>
      <div className="places">
        {SKILL_ORDER.map((s) => (
          <button key={s} className="place" onClick={() => onSkill(s)}>
            <span className={`tile-icon big skill-${s}`}><UiIcon name={s} size={26} /></span>
            <span className="place-name">{names[s] ?? SKILLS[s].place}</span>
            <span className="mono small muted">{SKILLS[s].name} · Lv {skillLevel(player, s)}</span>
          </button>
        ))}
        <button className="place" onClick={onJournal}>
          <span className="tile-icon big skill-journal"><UiIcon name="bolt" size={26} /></span>
          <span className="place-name">Adventurer's Journal</span>
          <span className="mono small muted">XP tracker · collection · pets</span>
        </button>
        <button className="place" onClick={onMarket}>
          <span className="tile-icon big skill-market"><UiIcon name="coin" size={26} /></span>
          <span className="place-name">Trading Post</span>
          <span className="mono small muted">Sell, buy, deals</span>
        </button>
        <button className="place" onClick={onCombat}>
          <span className="tile-icon big skill-combat"><UiIcon name="combat" size={26} /></span>
          <span className="place-name">{TRAINING[here] ?? 'Training Grounds'}</span>
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
      <TravelMap />
    </div>
  );
}
