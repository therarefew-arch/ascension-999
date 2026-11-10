// 🎪 The festival stall (Town screen, any town) while a seasonal festival is on.
import { FESTIVAL_PRICES, TREAT_BUFF } from '../data/festivals';
import { FoldHead, useFold } from './Fold';
import { SKILLS } from '../data/skills';
import { activeFestival, festivalEndsAt, tokensHave, whyCantBuy, type StallItem } from '../core/festivals';
import { game, useGame } from '../core/store';
import { fmtDuration } from './format';
import { PrizeWheel } from './PrizeWheel';
import { QtySlider } from './QtySlider';
import { useState } from 'react';

/** Little flags over the town banner during a festival. */
export function FestivalBunting() {
  const f = activeFestival();
  if (!f) return null;
  return <div className="festival-bunting" aria-hidden="true">{f.bunting}</div>;
}

export function FestivalStall() {
  const { player } = useGame();
  const [open, toggle] = useFold('festival', false);
  const [more, setMore] = useState(false);
  const f = activeFestival();
  if (!f) return null;
  const have = tokensHave(player, f);
  const rows: { what: StallItem; emoji: string; name: string; detail: string; owned: boolean }[] = [
    { what: 'treat', emoji: f.treat.emoji, name: f.treat.name, detail: `+${TREAT_BUFF.pct}% XP to everything for ${TREAT_BUFF.minutes} min · stacks with brews`, owned: false },
    { what: 'decoration', emoji: f.decoration.emoji, name: f.decoration.name, detail: 'Cottage keepsake · +1% XP to everything, forever', owned: player.cottage.includes(f.decoration.id) },
    { what: 'pet', emoji: f.pet.emoji, name: f.pet.name, detail: `Festival pet · +2% ${SKILLS[f.skill].name} XP while following you`, owned: player.pets.includes(f.pet.id) },
  ];
  const left = fmtDuration(festivalEndsAt(f) - Date.now());
  return (
    <section className={`festival-card fest-${f.id}`}>
      <FoldHead title={<>{f.emoji} {f.name.toUpperCase()}</>} open={open} onToggle={toggle}
        summary={open ? `ends in ${left}` : <>{f.token.emoji} <b className="mono">{have}</b> · {left}</>} />
      {open && <>
      <p className="small">{f.blurb}</p>
      <p className="small muted">
        Everything you do can turn up a <b>{f.token.emoji} {f.token.name.toLowerCase()}</b> · <b>{SKILLS[f.skill].name} +10% XP</b> all festival long.
      </p>
      <div className="festival-have"><span>{f.token.emoji}</span> <b className="mono">{have}</b> <span className="small muted">{f.token.name.toLowerCase()}s</span></div>
      <div className="festival-stall">
        {rows.map((r) => {
          const why = r.owned ? null : whyCantBuy(player, r.what);
          return (
            <div key={r.what} className={`festival-item ${r.owned ? 'owned' : ''}`}>
              <span className="festival-emoji">{r.emoji}</span>
              <div className="grow"><b>{r.name}</b><div className="small muted">{r.detail}</div></div>
              {r.owned
                ? <span className="chip up">Yours</span>
                : <div className="market-btns">
                    <button className="btn btn-primary btn-sm" disabled={!!why} title={why ?? undefined} onClick={() => game.buyAtStall(r.what)}>{f.token.emoji} {FESTIVAL_PRICES[r.what]}</button>
                    {r.what === 'treat' && Math.floor(have / FESTIVAL_PRICES.treat) > 1 && (
                      <button className={`btn btn-sm ${more ? 'on' : ''}`} onClick={() => setMore((m) => !m)}>🎚️</button>
                    )}
                  </div>}
              {r.what === 'treat' && more && !why && (
                <div className="market-more">
                  <QtySlider max={Math.floor(have / FESTIVAL_PRICES.treat)} unit={(n) => `${f.token.emoji} ${n * FESTIVAL_PRICES.treat}`}
                    onBuy={(n) => game.buyAtStall('treat', n)} start={Math.min(5, Math.floor(have / FESTIVAL_PRICES.treat))} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <PrizeWheel f={f} />
      </>}
    </section>
  );
}
