// "Choose your saga" — three save slots.
import { useEffect, useState } from 'react';
import { sound } from '../audio/sound';
import { SAVE_SLOTS, slotSummary, type SlotId } from '../core/save';
import { game, useGame } from '../core/store';
import { UiIcon } from './icons';
import { fmtDuration } from './format';
import { PixelScene } from './PixelScene';
import { GAME_VERSION, VERSION_NOTE } from '../version';
import { RestoreForm } from './Backup';

export function TitleScreen() {
  useGame(); // re-render after deletes
  const [confirm, setConfirm] = useState<{ slot: SlotId; kind: 'new' | 'delete' } | null>(null);
  const [restoring, setRestoring] = useState<SlotId | null>(null);
  // 🌄 The title theme (starts after the first tap — a browser rule).
  useEffect(() => { sound.playMusic('music_title'); }, []);

  return (
    <div className="title-screen">
      <PixelScene scene="title" dim={0.18} className="screen-bg" />
      <div className="title-inner">
        <img className="title-emblem" src={`${import.meta.env.BASE_URL}icon.svg`} width={84} height={84} alt="" aria-hidden="true" />
        <h1 className="game-title">ASCENSION <span className="title-999">999</span></h1>
        <div className="game-sub">✦ CHOOSE YOUR SAGA ✦</div>

        {SAVE_SLOTS.map((slot) => {
          const s = slotSummary(slot);
          const asking = confirm?.slot === slot ? confirm.kind : null;
          return (
            <div key={slot} className="save-card">
              <div className="row-between">
                <span className="save-label">SAVE SLOT {slot}</span>
                {s && !asking && (
                  <button className="icon-btn" aria-label={`Delete save slot ${slot}`} onClick={() => setConfirm({ slot, kind: 'delete' })}>
                    <UiIcon name="trash" size={20} />
                  </button>
                )}
              </div>

              {asking ? (
                <>
                  <p className="small">{asking === 'delete' ? 'Delete this save for good?' : 'Start over in this slot? The old save will be deleted.'}</p>
                  <div className="row">
                    <button className="btn btn-danger grow" onClick={() => {
                      if (asking === 'delete') game.deleteSlot(slot); else game.newGameInSlot(slot);
                      setConfirm(null);
                    }}>{asking === 'delete' ? 'Yes, delete' : 'Yes, start over'}</button>
                    <button className="btn grow" onClick={() => setConfirm(null)}>Cancel</button>
                  </div>
                </>
              ) : s ? (
                <>
                  <div className="save-name">Adventurer</div>
                  <div className="mono small muted">
                    Total Lv {s.totalLevel} · Mining {s.levels.mining} · Smithing {s.levels.smithing}
                  </div>
                  <div className="mono small dim">
                    {s.activity ? `Idling: ${s.activity} · ` : ''}played {fmtDuration(Date.now() - s.lastActiveAt)} ago
                  </div>
                  <div className="row save-buttons">
                    <button className="btn btn-go btn-lg grow" onClick={() => game.playSlot(slot)}><UiIcon name="play" size={20} /> CONTINUE</button>
                    <button className="btn btn-lg" onClick={() => setConfirm({ slot, kind: 'new' })}><UiIcon name="refresh" size={18} /> NEW</button>
                  </div>
                </>
              ) : (
                <button className="btn btn-hero btn-lg btn-wide" onClick={() => game.newGameInSlot(slot)}>
                  <UiIcon name="play" size={20} /> START NEW GAME
                </button>
              )}
              {!asking && (
                restoring === slot
                  ? <RestoreForm slot={slot} hasSave={!!s} onDone={() => setRestoring(null)} />
                  : <button className="link-btn small" onClick={() => setRestoring(slot)}>📥 Restore from a backup code</button>
              )}
            </div>
          );
        })}
        <p className="mono small dim center">Progress saves on this device</p>
        <p className="version-tag center"><b>{GAME_VERSION}</b> · {VERSION_NOTE}</p>
      </div>
    </div>
  );
}
