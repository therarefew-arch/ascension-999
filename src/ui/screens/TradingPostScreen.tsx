// The Trading Post: sell anything, buy basic materials, rotating deals, and coin upgrades.
import { useEffect, useState } from 'react';
import { getItem } from '../../data/items';
import { ALL_SKILLS } from '../../data/skills';
import { skillLevel } from '../../core/idle';
import { countInBag } from '../../core/inventory';
import { MAX_BAG_SLOTS, MAX_IDLE_SLOTS } from '../../core/player';
import { game, useGame } from '../../core/store';
import {
  bagUpgradeCost, buyListFor, buyPrice, msUntilNextPrices, priceTrend, sellable, sellPrice, shopDeals, shopRotation,
  SHOP_ROTATION_MS, SLOT_UNLOCKS,
} from '../../market/market';
import { ItemIcon, UiIcon } from '../icons';
import { fmtDuration, fmtNum } from '../format';
import { PixelScene } from '../PixelScene';

type MarketTab = 'sell' | 'buy' | 'shop' | 'upgrades';

function Trend({ id }: { id: string }) {
  const t = priceTrend(id);
  return t > 0 ? <span className="green"><UiIcon name="up" size={12} /></span> : t < 0 ? <span className="red"><UiIcon name="down" size={12} /></span> : <span className="dim">–</span>;
}

function SellTab() {
  const { player } = useGame();
  const [q, setQ] = useState('');
  const list = sellable(player).filter((s) => !q || getItem(s.id).name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="search">
        <UiIcon name="search" size={20} />
        <input type="search" placeholder="Search your items…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search your items" />
      </div>
      <p className="small muted">Sells from your bag first, then your bank. Worn gear isn't listed.</p>
      {list.length === 0 && <div className="empty">Nothing to sell yet.</div>}
      <div className="list">
        {list.map(({ id, qty }) => {
          const price = sellPrice(id);
          return (
            <div key={id} className="market-row">
              <ItemIcon id={id} size={36} />
              <div className="grow">
                <div><b>{getItem(id).name}</b> <span className="small muted">× {fmtNum(qty)}</span></div>
                <div className="mono small gold">{fmtNum(price)}g each <Trend id={id} /></div>
              </div>
              <div className="market-btns">
                <button className="btn" onClick={() => game.sell(id, 1)}>1</button>
                {qty > 1 && <button className="btn btn-primary" onClick={() => game.sell(id, qty)}>All · {fmtNum(price * qty)}g</button>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function BuyTab() {
  const { player } = useGame();
  return (
    <>
      <p className="small muted">Local goods from {player.location}. Each town sells different things. Gems can never be bought — they only drop from bosses.</p>
      {player.location === 'Lunaria' && !player.lunaria.restored && (
        <div className="empty">🌫️ The market stalls stand empty, wrapped in fog. A pale shopkeeper waves sadly. (Bring Lunaria home and the market returns.)</div>
      )}
      <div className="list">
        {buyListFor(player.location, player).map((id) => {
          const price = buyPrice(id);
          return (
            <div key={id} className="market-row">
              <ItemIcon id={id} size={36} />
              <div className="grow">
                <div><b>{getItem(id).name}</b> <span className="small muted">in bag {fmtNum(countInBag(player.inventory, id))}</span></div>
                <div className="mono small gold">{fmtNum(price)}g each <Trend id={id} /></div>
              </div>
              <div className="market-btns">
                <button className="btn" disabled={player.coins < price} onClick={() => game.buy(id, 1)}>1</button>
                <button className="btn btn-primary" disabled={player.coins < price * 10} onClick={() => game.buy(id, 10)}>10 · {fmtNum(price * 10)}g</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ShopTab() {
  const { player } = useGame();
  const deals = shopDeals();
  const r = shopRotation();
  const bought = player.shop.rotation === r ? player.shop.bought : [];
  const left = SHOP_ROTATION_MS - (Date.now() % SHOP_ROTATION_MS);
  return (
    <>
      <p className="small muted">New deals in <b className="gold">{fmtDuration(left)}</b>. Each deal can be bought once.</p>
      <div className="deal-grid">
        {deals.map((d) => {
          const done = bought.includes(d.index);
          const off = Math.round((1 - d.price / d.normal) * 100);
          return (
            <div key={d.index} className={`deal ${done ? 'done' : ''}`}>
              <span className="deal-off">-{off}%</span>
              <ItemIcon id={d.id} size={48} />
              <b className="small">{d.qty}× {getItem(d.id).name}</b>
              <span className="mono small dim strike">{fmtNum(d.normal)}g</span>
              <button className="btn btn-hero" disabled={done || player.coins < d.price} onClick={() => game.buyDeal(d.index)}>
                {done ? 'SOLD' : `${fmtNum(d.price)}g`}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function UpgradesTab() {
  const { player } = useGame();
  const total = ALL_SKILLS.reduce((sum, s) => sum + skillLevel(player, s), 0);
  const nextSlot = SLOT_UNLOCKS[player.unlockedSlots];
  const bagCost = bagUpgradeCost(player.inventory.length);
  return (
    <>
      <div className="card upgrade-card">
        <div className="row"><UiIcon name="clock" size={22} /><b className="grow">Idle slots: {player.unlockedSlots}/{MAX_IDLE_SLOTS}</b></div>
        <p className="small muted">Each slot runs its own skill at the same time. Your total level is <b className="gold">{total}</b>.</p>
        {nextSlot ? (
          <button className="btn btn-hero btn-wide" disabled={total < nextSlot.level && player.coins < nextSlot.coins} onClick={() => game.unlockSlot()}>
            {total >= nextSlot.level ? `Unlock slot ${player.unlockedSlots + 1} (free — level ${nextSlot.level} reached)` : `Unlock slot ${player.unlockedSlots + 1}: ${fmtNum(nextSlot.coins)} coins (or total level ${nextSlot.level})`}
          </button>
        ) : <p className="small green">All idle slots unlocked!</p>}
      </div>
      <div className="card upgrade-card">
        <div className="row"><UiIcon name="bag" size={22} /><b className="grow">Bag: {player.inventory.length}/{MAX_BAG_SLOTS} slots</b></div>
        {bagCost !== null ? (
          <button className="btn btn-hero btn-wide" disabled={player.coins < bagCost} onClick={() => game.upgradeBag()}>
            +5 bag slots: {fmtNum(bagCost)} coins
          </button>
        ) : <p className="small green">Your bag is as big as it gets!</p>}
      </div>
    </>
  );
}

export function TradingPostScreen() {
  const { player } = useGame();
  const [tab, setTab] = useState<MarketTab>('sell');
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  return (
    <div className="skill-screen">
      <PixelScene scene="town" dim={0.7} className="screen-bg" />
      <div className="screen">
        <div className="row-between">
          <h1 className="screen-title">TRADING POST</h1>
          <span className="stat-chip coin-chip"><UiIcon name="coin" size={16} /> {fmtNum(player.coins)}</span>
        </div>
        <p className="small muted">Prices shift every 30 minutes — next change in {fmtDuration(msUntilNextPrices())}.</p>
        <div className="tab-row no-pad">
          {(['sell', 'buy', 'shop', 'upgrades'] as MarketTab[]).map((t) => (
            <button key={t} className={`tab-pill ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{t.toUpperCase()}</button>
          ))}
        </div>
        {tab === 'sell' && <SellTab />}
        {tab === 'buy' && <BuyTab />}
        {tab === 'shop' && <ShopTab />}
        {tab === 'upgrades' && <UpgradesTab />}
      </div>
    </div>
  );
}
