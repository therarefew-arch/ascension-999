import { Fragment, useEffect, useState } from 'react';
import type { SkillId } from '../../data/items';
import { ACTION_LIST } from '../../data/skills';
import { HEARTLAND_TOWNS, OPEN_REGIONS, REGION_INFO, REGIONS, tierLevel } from '../../data/tiers';
import type { TownRequest } from '../../core/cozy';
import { highestSkill, whyCantTravel } from '../../core/travel';
import { game, useGame } from '../../core/store';
import { UiIcon } from '../icons';
import { PixelScene } from '../PixelScene';
import { PET_MAP } from '../../data/pets';
import { fmtDuration } from '../format';
import { PettablePet, TodayCard } from '../Cozy';
import { SilentBell } from '../SilentBell';
import { CinderpeakCard, TravellerCard } from '../Cinderpeak';
import { FestivalBunting, FestivalStall } from '../Festival';
import { mountainStirs, travellerWhereabouts } from '../../core/cinderpeak';
import { SaveSafetyHint } from '../Backup';
import { SettlingIn } from '../SettlingIn';
import { PedlarCard } from '../Pedlar';
import { GiftsCard } from '../Family';
import { dayPhase } from '../PixelScene';

function greeting() {
  return { dawn: 'Good morning', day: 'Good day', dusk: 'Good evening', night: 'A quiet night' }[dayPhase()];
}


/** Map of the realm: walk (free) or fast travel (coins) between towns. */
function TravelMap() {
  const { player } = useGame();
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const best = highestSkill(player);
  const [open, setOpen] = useState(false);
  const next = REGIONS.find((r) => OPEN_REGIONS.includes(r) && r !== player.location);
  // 🎒 Where the Traveller is (shown on the map so you always know which town to visit).
  const tr = travellerWhereabouts(player);
  const trHere = tr?.gift && tr.town === player.location;
  return (
    <section className="block today-card">
      <button className="collapse-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <h2 className="section-title">🗺️ TRAVEL</h2>
        <span className="small muted">{open ? 'Hide ▲' : `${next ? `Walk to ${next}` : 'Open map'} ▼`}</span>
      </button>
      {tr && !trHere && (
        <button className="traveller-sighting" onClick={() => setOpen(true)}>
          <span className="traveller-emoji small-e">🎒</span>
          <span className="small">
            {tr.gift
              ? <>The Traveller was seen in <b>{tr.town}</b> — a gift waits by the well{player.regions.includes(tr.town) ? '' : ' (once you get there)'}.</>
              : <>The Traveller has taken the road toward <b>{tr.town}</b>{OPEN_REGIONS.includes(tr.town) ? '' : ' — a town not yet open'}.</>}
          </span>
        </button>
      )}
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
      {open && <div className="region-list">
        {REGIONS.map((r, i) => {
          const built = OPEN_REGIONS.includes(r);
          const info = REGION_INFO[r];
          const here = player.location === r;
          const visited = player.regions.includes(r);
          const level = tierLevel(i);
          const heading = i === 0
            ? <div className="region-band"><b>🏡 The Heartland</b><span className="small muted">Cozy neighbouring towns, a short walk apart</span></div>
            : i === HEARTLAND_TOWNS
              ? <div className="region-band frontier"><b>🧭 The Frontier</b><span className="small muted">Far-flung, wilder places — each one an expedition</span></div>
              : null;
          if (!built) {
            return (
              <Fragment key={r}>
                {heading}
                <div className="region-row locked">
                  <span className="region-num mono">{level}</span>
                  <div className="grow"><b>{r}</b> {tr?.town === r && <span className="chip traveller-chip">🎒 Traveller</span>}<div className="small dim">Coming in a future update{tr?.town === r ? ' · the Traveller went this way' : ''}</div></div>
                  <UiIcon name="lock" size={16} />
                </div>
              </Fragment>
            );
          }
          const roadOpen = best >= (info?.unlockLevel ?? 1);
          return (
            <Fragment key={r}>
            {heading}
            <div className={`region-row ${here ? 'here' : ''} ${tr?.town === r && tr.gift ? 'traveller' : ''}`}>
              <span className="region-num mono">{level}</span>
              <div className="grow">
                <b>{r}</b> {here && <span className="chip up">You are here</span>} {tr?.town === r && <span className="chip traveller-chip">🎒 {tr.gift ? 'Traveller · gift' : 'Traveller'}</span>}
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
            </Fragment>
          );
        })}
      </div>}
    </section>
  );
}

/** Which skill makes an item (for "Collect X" requests). */
function skillForItem(id: string): SkillId | null {
  return ACTION_LIST.find((a) => a.output?.item === id && !a.kind)?.skill ?? null;
}

// Town only shows what you can't reach from the bottom bar:
// the daily gift + requests, the Journal, the Trading Post and travel.
export function TownScreen({ onSkill, onSkills, onCombat, onMarket, onJournal, onSettings, onCottage }: { onSkill: (s: SkillId) => void; onSkills: () => void; onCombat: () => void; onMarket: () => void; onJournal: () => void; onSettings: () => void; onCottage: () => void }) {
  const { player } = useGame();
  const here = player.location;
  const info = REGION_INFO[here];
  const goTo = (r: TownRequest) => {
    if (r.kind === 'kills') return onCombat();
    const s = r.kind === 'xp' ? (r.target as SkillId) : r.kind === 'item' ? skillForItem(r.target!) : null;
    if (s) onSkill(s); else onSkills();
  };
  return (
    <div className="screen">
      <div className="town-hero compact">
        <PixelScene scene={here === 'Lunaria' && player.lunaria.restored ? 'lunaria_restored' : here === 'Cinderpeak' && mountainStirs().active ? 'cinderpeak_stirring' : info?.scene ?? 'town'} dim={0} />
        <div className="town-title">
          <h1>{here.toUpperCase()}</h1>
          <p>{here === 'Lunaria' && player.lunaria.restored ? 'Lanterns lit, bell ringing — a town come home' : `${greeting()} · ${info?.blurb}`}</p>
        </div>
        <FestivalBunting />
        {player.activePet && PET_MAP[player.activePet] && (
          <PettablePet emoji={PET_MAP[player.activePet].emoji} name={PET_MAP[player.activePet].name} />
        )}
      </div>

      <SettlingIn onSkill={onSkill} onCombat={onCombat} />

      <SaveSafetyHint onSettings={onSettings} />

      <TravellerCard />

      {here === 'Lunaria' && <SilentBell onJournal={onJournal} onCombat={onCombat} />}
      {here === 'Cinderpeak' && <CinderpeakCard onMining={() => onSkill('mining')} />}

      <FestivalStall />

      <GiftsCard />

      <TodayCard onGo={goTo} />

      <PedlarCard />

      <div className="services">
        <button className="service" onClick={onMarket}>
          <span className="tile-icon skill-market"><UiIcon name="coin" size={20} /></span>
          <span><b>Trading Post</b><span className="small muted">Sell, buy, deals</span></span>
        </button>
        <button className="service" onClick={onJournal}>
          <span className="tile-icon skill-journal"><UiIcon name="bolt" size={20} /></span>
          <span><b>Journal</b><span className="small muted">XP, log, pets</span></span>
        </button>
        <button className="service service-wide" onClick={onCottage}>
          <span className="tile-icon skill-farming">🏡</span>
          <span><b>Your Cottage</b><span className="small muted">Furniture, perks &amp; your garden · {player.cottage.length} built</span></span>
        </button>
      </div>

      <TravelMap />
    </div>
  );
}
