import { useState } from 'react';
import {
  ARMOUR_SLOTS, getItem, ITEM_LIST, SLOT_LABELS, STAT_LABELS, TOOL_SLOTS, type EquipSlot, type ItemStats,
} from '../../data/items';
import { canEquip, equipmentStats, SOCKET_SLOTS } from '../../core/equipment';
import { toolSpeedMult } from '../../core/idle';
import { RARITY_COLORS } from '../../data/items';
import { BONUSES } from '../../data/ascended';
import { SKILLS } from '../../data/skills';
import { UiIcon } from '../icons';
import { countInBag, countInBank } from '../../core/inventory';
import { game, useGame } from '../../core/store';
import { DiffChips, Sheet, StatCompare } from '../components';
import { ItemIcon } from '../icons';
import { ReforgePanel, StarforgeCard } from '../Starforge';

const WHERE_TO_GET: Partial<Record<EquipSlot, string>> = {
  pickaxe: 'Craft one at the Workshop.',
  hammer: 'Craft one at the Workshop.',
  knife: 'Craft one at the Workshop.',
  axe: 'Craft one at the Workshop.',
  rod: 'Craft one at the Workshop.',
  tinderbox: 'Craft one at the Workshop.',
  skillet: 'Craft one at the Workshop.',
};

function SlotPicker({ slot, onClose }: { slot: EquipSlot; onClose: () => void }) {
  const { player } = useGame();
  const wornId = player.equipment[slot];
  const worn = wornId ? getItem(wornId) : null;
  // 🌟 Ascended items aren't in the item list (each one is different), so add the ones you have.
  const ascIds = Array.from(new Set([...player.inventory, ...player.bank].filter((s) => s && s.id.startsWith('asc.')).map((s) => s!.id)));
  const options = [...ITEM_LIST, ...ascIds.map((id) => getItem(id))].filter((it) => it.equip?.slot === slot)
    .map((it) => ({ item: it, bag: countInBag(player.inventory, it.id), bank: countInBank(player, it.id) }))
    .filter((o) => o.bag + o.bank > 0);

  return (
    <Sheet title={`${SLOT_LABELS[slot]} slot`} onClose={onClose}>
      {SOCKET_SLOTS.includes(slot) && <SocketPanel slot={slot} />}
      {worn ? (
        <section className="block">
          <h3>Wearing</h3>
          <div className="row">
            <ItemIcon id={worn.id} size={44} />
            <div className="grow"><b>{worn.name}</b></div>
            <button className="btn" onClick={() => { game.unequip(slot); }}>Unequip</button>
          </div>
          <StatCompare next={worn.equip!.stats} current={null} />
          {worn.ascended && (
            <ul className="asc-bonuses" style={{ ['--grade' as string]: worn.ascended.grade.color }}>
              {worn.ascended.bonuses.filter((b) => !['at', 'df', 'hp', 'sp'].includes(b.key)).map((b) => <li key={b.key}>{BONUSES[b.key].text(b.value, SKILLS[worn.ascended!.base.skill].name)}</li>)}
            </ul>
          )}
        </section>
      ) : <p className="muted">Nothing equipped here yet.</p>}
      {worn?.ascended && <ReforgePanel id={worn.id} from="worn" />}

      <h3>Your {SLOT_LABELS[slot].toLowerCase()} items</h3>
      {options.length === 0 && <p className="small muted">You don't have any. {WHERE_TO_GET[slot] ?? 'Smith some at the Forge!'}</p>}
      <div className="list">
        {options.map(({ item, bag, bank }) => {
          const problem = canEquip(player, item);
          return (
            <button key={item.id} className="list-row" disabled={!!problem}
              onClick={() => { game.equip(item.id); onClose(); }}>
              <ItemIcon id={item.id} size={40} />
              <div className="grow">
                <div><b>{item.name}</b> <span className="small muted">{bag > 0 ? `bag ${bag}` : ''}{bag > 0 && bank > 0 ? ' · ' : ''}{bank > 0 ? `bank ${bank}` : ''}</span></div>
                {problem ? <span className="small bad-text">{problem}</span> : <DiffChips next={item.equip!.stats} current={worn?.equip?.stats ?? null} />}
              </div>
              {!problem && <span className="start-pill">Equip</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

/** The gem socket of a gear slot. The gem stays in the slot when you swap gear. */
function SocketPanel({ slot }: { slot: EquipSlot }) {
  const { player } = useGame();
  const gem = player.sockets[slot];
  const gems = player.inventory.filter((s): s is NonNullable<typeof s> => !!s && !!getItem(s.id).gem);
  const ids = Array.from(new Set(gems.map((g) => g.id)));
  return (
    <section className="block socket-panel">
      <h3><UiIcon name="gem" size={16} /> Gem socket</h3>
      {gem ? (
        <div className="row">
          <ItemIcon id={gem} size={40} />
          <div className="grow"><b>{getItem(gem).name}</b><div className="small green">{getItem(gem).description.split('.')[0]}</div></div>
          <button className="btn" onClick={() => game.unsocketGem(slot)}>Remove</button>
        </div>
      ) : <p className="small muted">Empty socket. Gems drop from mini bosses. The gem stays here even when you swap gear.</p>}
      {ids.length > 0 && (
        <div className="gem-pick">
          {ids.map((id) => (
            <button key={id} className="list-row" onClick={() => game.socketGem(slot, id)}>
              <ItemIcon id={id} size={34} />
              <div className="grow"><b>{getItem(id).name}</b><div className="small green">{getItem(id).description.split('.')[0]}</div></div>
              <span className="start-pill">{gem ? 'Swap' : 'Socket'}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function SlotGrid({ slots, onPick }: { slots: EquipSlot[]; onPick: (s: EquipSlot) => void }) {
  const { player } = useGame();
  return (
    <div className="gear-grid">
      {slots.map((slot) => {
        const id = player.equipment[slot];
        const gem = player.sockets[slot];
        return (
          <button key={slot} className={`gear-slot ${id ? 'filled' : ''}`} onClick={() => onPick(slot)}>
            {SOCKET_SLOTS.includes(slot) && (
              <span className={`socket-dot ${gem ? 'full' : ''}`} style={gem ? { background: RARITY_COLORS[getItem(gem).gem!.rarity] } : undefined} title={gem ? getItem(gem).name : 'Empty socket'} />
            )}
            {id ? <ItemIcon id={id} size={48} /> : <span className="gear-empty" />}
            <span className="gear-label">{SLOT_LABELS[slot]}</span>
            {id && <span className="gear-name small">{getItem(id).name}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Save up to 3 gear setups and switch with one tap. */
function Loadouts() {
  const { player } = useGame();
  const [naming, setNaming] = useState<number | null>(null);
  const [name, setName] = useState('');
  return (
    <section className="block">
      <h2 className="section-title">LOADOUTS</h2>
      <div className="loadout-grid">
        {player.loadouts.map((l, i) => (
          <div key={i} className={`loadout ${l ? 'saved' : ''}`}>
            {naming === i ? (
              <>
                <input className="name-input" value={name} maxLength={20} placeholder={`Loadout ${i + 1}`} onChange={(e) => setName(e.target.value)} autoFocus />
                <button className="btn btn-primary" onClick={() => { game.saveLoadout(i, name); setNaming(null); }}>Save current gear</button>
                <button className="link-btn" onClick={() => setNaming(null)}>Cancel</button>
              </>
            ) : l ? (
              <>
                <b>{l.name}</b>
                <div className="loadout-icons">{Object.values(l.equipment).slice(0, 6).map((id) => id && <ItemIcon key={id} id={id} size={22} />)}</div>
                <button className="btn btn-hero" onClick={() => game.applyLoadout(i)}>EQUIP</button>
                <div className="row-between">
                  <button className="link-btn small" onClick={() => { setNaming(i); setName(l.name); }}>Overwrite</button>
                  <button className="link-btn small red" onClick={() => game.deleteLoadout(i)}>Delete</button>
                </div>
              </>
            ) : (
              <button className="btn btn-outline" onClick={() => { setNaming(i); setName(''); }}>+ Save current gear</button>
            )}
          </div>
        ))}
      </div>
      <p className="small muted">Equipping a loadout takes items from your bag or bank. Gems stay in their slots.</p>
    </section>
  );
}

export function GearScreen() {
  const { player } = useGame();
  const [picking, setPicking] = useState<EquipSlot | null>(null);
  const stats = equipmentStats(player);

  return (
    <div className="screen">
      <h1 className="screen-title">GEAR</h1>
      <Loadouts />
      <h2 className="section-title">ARMOUR &amp; WEAPONS</h2>
      <SlotGrid slots={ARMOUR_SLOTS} onPick={setPicking} />
      <h2 className="section-title">SKILLING TOOLS</h2>
      <SlotGrid slots={TOOL_SLOTS} onPick={setPicking} />
      <StarforgeCard />
      <div className="card">
        <h3>Total stats</h3>
        <div className="stat-list">
          {(Object.keys(STAT_LABELS) as (keyof ItemStats)[]).map((k) => (
            <div key={k} className="stat-line"><span>{STAT_LABELS[k]}</span><b>{stats[k] ?? 0}{k.endsWith('Speed') && (stats[k] ?? 0) > 0 ? <span className="muted"> · {(1 / toolSpeedMult(stats[k] ?? 0)).toFixed(1)}× as fast</span> : null}</b></div>
          ))}
        </div>
        <p className="small muted">Includes socketed gems. Tools make their skill faster (past 30%, each extra % counts a little less). Attack, Defense and Max HP help in combat.</p>
      </div>
      {picking && <SlotPicker slot={picking} onClose={() => setPicking(null)} />}
    </div>
  );
}
