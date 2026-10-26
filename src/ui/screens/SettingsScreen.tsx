import { useEffect, useState } from 'react';
import { sound } from '../../audio/sound';
import { game, useGame } from '../../core/store';
import { UiIcon } from '../icons';
import { fmtDuration } from '../format';
import { GAME_VERSION } from '../../version';
import { BackupCard } from '../Backup';
import { pushStatus } from '../../core/push';

const SLIDERS: { key: 'master' | 'effects' | 'music'; label: string; icon: 'sound' | 'music' }[] = [
  { key: 'master', label: 'Master volume', icon: 'sound' },
  { key: 'effects', label: 'Effects volume', icon: 'sound' },
  { key: 'music', label: 'Music volume', icon: 'music' },
];

/** 🔔 Notifications while the game is closed (per device). */
function NotificationsCard() {
  const { settings } = useGame();
  const n = settings.notify;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const status = pushStatus();
  const toggle = async (on: boolean) => {
    setBusy(true);
    setMsg(await game.setNotifications(on));
    setBusy(false);
  };
  const setPart = (part: 'idle' | 'farm', v: boolean) => game.setSettings({ ...settings, notify: { ...n, [part]: v } });
  return (
    <div className="card">
      <h3>🔔 Notifications</h3>
      <label className="toggle-row">
        <span><b>Notify me while the game is closed</b><span className="small muted"> — on this device</span></span>
        <input type="checkbox" checked={n.on} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
      </label>
      {n.on && (
        <>
          <label className="toggle-row sub">
            <span><b>Idling stops</b><span className="small muted"> — and why (bag full, out of ore…)</span></span>
            <input type="checkbox" checked={n.idle} onChange={(e) => setPart('idle', e.target.checked)} />
          </label>
          <label className="toggle-row sub">
            <span><b>Crops are ready</b><span className="small muted"> — your garden is ready to harvest</span></span>
            <input type="checkbox" checked={n.farm} onChange={(e) => setPart('farm', e.target.checked)} />
          </label>
        </>
      )}
      {msg && <p className="small red">{msg}</p>}
      {!n.on && status === 'ios-home-screen' && <p className="small muted">On iPhone, notifications only work after you add the game to your Home Screen (Share → Add to Home Screen) and open it from there.</p>}
      {!n.on && status === 'blocked' && <p className="small muted">Notifications are blocked for this game — allow them in your phone or browser settings first.</p>}
      <p className="small muted">You only get notified about things that happen after you leave the game. Opening the game cancels anything not sent yet.</p>
    </div>
  );
}

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
        <label className="toggle-row">
          <span><b>Vibration</b><span className="small muted"> — gentle buzz on level-ups and good hits (Android)</span></span>
          <input type="checkbox" checked={settings.vibrate} onChange={(e) => game.setSettings({ ...settings, vibrate: e.target.checked })} />
        </label>
        <button className="btn" onClick={() => sound.play('levelup')}>Play a test sound</button>
        <p className="small muted">Sounds are quiet placeholders for now. Real sounds go in the assets/sounds folder.</p>
      </div>

      <NotificationsCard />

      <div className="card">
        <h3>Saving</h3>
        <p className="small">Your game saves automatically on this device.{lastSavedAt > 0 && <> Last saved <b>{fmtDuration(Date.now() - lastSavedAt)}</b> ago.</>}</p>
        <p className="small muted">Tip: add Ascension 999 to your home screen so your phone keeps the save safe.</p>
      </div>

      <BackupCard />

      <div className="card">
        <h3>Save slots</h3>
        <p className="small muted">You're playing save slot {slot}. Switch slots, start over or delete a save from the title screen.</p>
        <button className="btn btn-wide" onClick={() => game.backToTitle()}><UiIcon name="door" size={18} /> Save &amp; back to title screen</button>
      </div>
      <p className="small muted center">Ascension 999 · <span className="mono">{GAME_VERSION}</span></p>
    </div>
  );
}
