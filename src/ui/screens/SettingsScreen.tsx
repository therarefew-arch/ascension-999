import { useEffect, useState } from 'react';
import { sound } from '../../audio/sound';
import { game, useGame } from '../../core/store';
import type { Settings } from '../../core/settings';
import { UiIcon } from '../icons';
import { fmtDuration } from '../format';

const SLIDERS: { key: keyof Settings; label: string; icon: 'sound' | 'music' }[] = [
  { key: 'master', label: 'Master volume', icon: 'sound' },
  { key: 'effects', label: 'Effects volume', icon: 'sound' },
  { key: 'music', label: 'Music volume', icon: 'music' },
];

export function SettingsScreen() {
  const { settings, lastSavedAt, slot } = useGame();
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);

  return (
    <div className="screen">
      <h1 className="screen-title">SETTINGS</h1>
      <div className="card">
        <h3>Sound</h3>
        {SLIDERS.map((s) => (
          <label key={s.key} className="slider">
            <span className="slider-label"><UiIcon name={s.icon} size={18} /> {s.label}<b>{Math.round(settings[s.key] * 100)}%</b></span>
            <input type="range" min={0} max={100} value={Math.round(settings[s.key] * 100)}
              onChange={(e) => game.setSettings({ ...settings, [s.key]: Number(e.target.value) / 100 })} />
          </label>
        ))}
        <button className="btn" onClick={() => sound.play('levelup')}>Play a test sound</button>
        <p className="small muted">Sounds are quiet placeholders for now. Real sounds go in the assets/sounds folder.</p>
      </div>

      <div className="card">
        <h3>Saving</h3>
        <p className="small">Your game saves automatically on this device.{lastSavedAt > 0 && <> Last saved <b>{fmtDuration(Date.now() - lastSavedAt)}</b> ago.</>}</p>
        <p className="small muted">Tip: add Pocketvale to your home screen so your phone keeps the save safe.</p>
      </div>

      <div className="card">
        <h3>Save slots</h3>
        <p className="small muted">You're playing save slot {slot}. Switch slots, start over or delete a save from the title screen.</p>
        <button className="btn btn-wide" onClick={() => game.backToTitle()}><UiIcon name="door" size={18} /> Save &amp; back to title screen</button>
      </div>
      <p className="small muted center">Pocketvale · Phase 1</p>
    </div>
  );
}
