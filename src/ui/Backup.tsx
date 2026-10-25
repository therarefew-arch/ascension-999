// 🛟 Save safety: backup codes, restoring them, and a gentle reminder to keep the save safe.
import { useEffect, useState } from 'react';
import { lastBackupAt, type SlotId } from '../core/save';
import { game, useGame } from '../core/store';
import { fmtDuration } from './format';

/** Paste a backup code to restore it into a slot. */
export function RestoreForm({ slot, hasSave, onDone }: { slot: SlotId; hasSave: boolean; onDone?: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restore = async () => {
    setBusy(true); setError(null);
    const err = await game.restoreBackup(slot, code);
    setBusy(false);
    if (err) setError(err); else { setCode(''); onDone?.(); }
  };
  return (
    <div className="backup-form">
      <textarea className="backup-code" placeholder="Paste your backup code here (it starts with A999)" value={code}
        onChange={(e) => setCode(e.target.value)} rows={3} spellCheck={false} autoCapitalize="off" autoCorrect="off" />
      {hasSave && <p className="small red">This replaces the game in slot {slot}.</p>}
      {error && <p className="small red">{error}</p>}
      <button className="btn btn-primary btn-wide" disabled={busy || code.trim().length < 10} onClick={restore}>
        {busy ? 'Restoring…' : `📥 Restore into slot ${slot}`}
      </button>
    </div>
  );
}

/** Settings card: make a backup code (copy / share / download) or restore one. */
export function BackupCard() {
  const { slot } = useGame();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const last = slot ? lastBackupAt(slot) : 0;
  if (slot === null) return null;

  const make = async () => { setCopied(false); setCode(await game.backupCode()); };
  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setCopied(true); } catch { setCopied(false); }
  };
  const share = async () => { if (code) { try { await navigator.share({ title: 'Ascension 999 backup', text: code }); } catch { /* cancelled */ } } };
  const download = () => {
    if (!code) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    a.download = `ascension999-slot${slot}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="card">
      <h3>🛟 Back up your save</h3>
      <p className="small">Phones sometimes clear a website's data. A backup code keeps your progress safe — paste it into Notes or email it to yourself.</p>
      <p className="small muted">Last backup: <b>{last ? `${fmtDuration(Date.now() - last)} ago` : 'never'}</b></p>
      {!code ? (
        <button className="btn btn-primary btn-wide" onClick={make}>Make a backup code</button>
      ) : (
        <>
          <textarea className="backup-code" readOnly value={code} rows={3} onFocus={(e) => e.currentTarget.select()} />
          <div className="row">
            <button className="btn grow" onClick={copy}>{copied ? '✅ Copied' : '📋 Copy'}</button>
            {canShare && <button className="btn grow" onClick={share}>📤 Share</button>}
            <button className="btn grow" onClick={download}>💾 File</button>
          </div>
        </>
      )}
      <button className="btn btn-wide" onClick={() => setShowRestore((s) => !s)}>{showRestore ? 'Hide restore' : '📥 Restore a backup into this slot'}</button>
      {showRestore && <RestoreForm slot={slot} hasSave onDone={() => setShowRestore(false)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The gentle reminder on the Town screen
// ---------------------------------------------------------------------------

const HINT_KEY = 'pocketvale.safetyHintUntil';
const isInstalled = () =>
  (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches)
  || (navigator as unknown as { standalone?: boolean }).standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Android/Chrome lets us offer a real "Install" button. */
let installEvent: { prompt: () => void } | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e as unknown as { prompt: () => void }; });
}

export function SaveSafetyHint({ onSettings }: { onSettings: () => void }) {
  const { slot, player } = useGame();
  const [hiddenUntil, setHiddenUntil] = useState(() => { try { return Number(localStorage.getItem(HINT_KEY)) || 0; } catch { return 0; } });
  const [, force] = useState(0);
  useEffect(() => { const t = setTimeout(() => force((n) => n + 1), 1500); return () => clearTimeout(t); }, []);
  if (slot === null || Date.now() < hiddenUntil) return null;
  const total = Object.values(player.skills).reduce((s, v) => s + (v.xp > 0 ? 1 : 0), 0);
  const last = lastBackupAt(slot);
  const needsInstall = !isInstalled();
  const needsBackup = total >= 3 && Date.now() - last > 7 * 24 * 3600e3;
  if (!needsInstall && !needsBackup) return null;
  const dismiss = () => {
    const until = Date.now() + 3 * 24 * 3600e3;
    try { localStorage.setItem(HINT_KEY, String(until)); } catch { /* ignore */ }
    setHiddenUntil(until);
  };
  return (
    <section className="safety-hint">
      <div className="grow">
        <b>🛟 Keep your save safe</b>
        {needsInstall ? (
          <p className="small">{isIOS()
            ? 'Tap the Share button, then "Add to Home Screen". Your phone then keeps the save safe for good.'
            : 'Add Ascension 999 to your Home Screen so your phone keeps the save safe.'}</p>
        ) : (
          <p className="small">It's been a while since your last backup code. It only takes a moment.</p>
        )}
        <div className="row">
          {needsInstall && installEvent && <button className="btn btn-primary" onClick={() => installEvent?.prompt()}>📲 Install</button>}
          <button className="btn" onClick={onSettings}>Make a backup</button>
          <button className="btn" onClick={dismiss}>Later</button>
        </div>
      </div>
    </section>
  );
}
