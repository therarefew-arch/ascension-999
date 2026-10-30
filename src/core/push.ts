// 🔔 Notifications while the game is closed.
// The phone signs up for "web push" once. Each time you leave the game, it sends the notification server
// a short list of upcoming moments (idle stopping, crops ready); the server sends each one at the right time.
// Coming back to the game cancels whatever hasn't been sent (you're already here).
import type { Note } from './notifySchedule';

/** The notification server (push-server/ in this project). */
export const PUSH_SERVER = 'https://ascension-999-push.ascension-999-push.workers.dev';
/** Public half of the game's push key (the private half lives only on the server). */
const VAPID_PUBLIC = 'BAFKw6uDLzETHFFqSKx2euv83rctLVU6ISpeVinYreZOBpJ6VLvGAxrKv1HS86kB9NDG1GUlYP5HIwKLo2ibxf4';
const SUB_KEY = 'push.subscription';

export type PushStatus = 'ok' | 'unsupported' | 'ios-home-screen' | 'blocked';

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

/** Can this phone/browser get notifications? */
export function pushStatus(): PushStatus {
  if (isIos() && !standalone()) return 'ios-home-screen';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return 'ok';
}

function keyBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64url.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function worker(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL });
  await navigator.serviceWorker.ready;
  return reg;
}

/** Turn notifications on (asks permission). Returns a message if it didn't work. */
export async function enablePush(): Promise<string | null> {
  const status = pushStatus();
  if (status === 'ios-home-screen') return 'On iPhone, add the game to your Home Screen first, then turn this on from there.';
  if (status === 'unsupported') return "This browser can't show notifications.";
  if (status === 'blocked') return 'Notifications are blocked for this site — allow them in your browser or phone settings.';
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'Notifications were not allowed.';
    const reg = await worker();
    const sub = (await reg.pushManager.getSubscription())
      ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) as BufferSource });
    localStorage.setItem(SUB_KEY, JSON.stringify(sub.toJSON()));
    sendNotes([]); // introduces this device to the server straight away
    return null;
  } catch (e) {
    return `Couldn't turn on notifications (${(e as Error).message || 'unknown error'}).`;
  }
}

/** Turn notifications off on this device (and clear anything waiting on the server). */
export async function disablePush(): Promise<void> {
  sendNotes([]);
  try {
    localStorage.removeItem(SUB_KEY);
    const reg = await navigator.serviceWorker?.getRegistration(import.meta.env.BASE_URL);
    await (await reg?.pushManager.getSubscription())?.unsubscribe();
  } catch { /* ignore */ }
}

/** Replaces this device's upcoming notifications on the server ([] cancels them). Safe to call while the page is closing. */
export function sendNotes(notes: Note[]): void {
  let sub: string | null = null;
  try { sub = localStorage.getItem(SUB_KEY); } catch { /* ignore */ }
  if (!sub) return;
  const body = JSON.stringify({ sub: JSON.parse(sub), notes });
  // sendBeacon still gets through when the app is being closed. (Plain text, so no extra permission request.)
  const sent = navigator.sendBeacon?.(`${PUSH_SERVER}/schedule`, new Blob([body], { type: 'text/plain' }));
  if (!sent) fetch(`${PUSH_SERVER}/schedule`, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
}

/** Opening the game: make sure the stored sign-up matches the phone's current one (phones sometimes renew it). */
export async function refreshPush(): Promise<void> {
  try {
    if (pushStatus() !== 'ok' || Notification.permission !== 'granted') return;
    const reg = await worker();
    const sub = (await reg.pushManager.getSubscription())
      ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) as BufferSource });
    localStorage.setItem(SUB_KEY, JSON.stringify(sub.toJSON()));
  } catch { /* try again next time */ }
}

/** Which push service this device signed up with (shown in Settings to help with problems). */
export function pushService(): string | null {
  try {
    const raw = localStorage.getItem(SUB_KEY);
    if (!raw) return null;
    const host = new URL(JSON.parse(raw).endpoint).host;
    if (host.includes('apple')) return 'Apple';
    if (host.includes('google')) return 'Google';
    if (host.includes('mozilla')) return 'Firefox';
    if (host.includes('windows')) return 'Windows';
    return host;
  } catch { return null; }
}

/** Sends a notification right now. Returns a friendly message about what happened. */
export async function sendTestPush(): Promise<{ ok: boolean; msg: string }> {
  await refreshPush();
  let sub: string | null = null;
  try { sub = localStorage.getItem(SUB_KEY); } catch { /* ignore */ }
  if (!sub) return { ok: false, msg: 'This device isn’t signed up yet — turn notifications off and on again.' };
  try {
    const res = await fetch(`${PUSH_SERVER}/test`, { method: 'POST', body: JSON.stringify({ sub: JSON.parse(sub) }), headers: { 'Content-Type': 'text/plain' } });
    const { status } = (await res.json()) as { status: number };
    if (status >= 200 && status < 300) return { ok: true, msg: 'Test sent! It should pop up within a few seconds. If it doesn’t, check your phone’s settings: notifications must be allowed for this app/browser, and Focus / Do Not Disturb / battery saver can hide them.' };
    if (status === 404 || status === 410) return { ok: false, msg: 'This device’s sign-up has expired — turn notifications off and on again.' };
    return { ok: false, msg: `The ${pushService() ?? 'push'} service refused the test (code ${status}). Try turning notifications off and on again.` };
  } catch {
    return { ok: false, msg: 'Couldn’t reach the notification server — check your internet connection.' };
  }
}

/** This phone's push address (sent with the Family check-in so cheers and nudges can reach you). */
export function pushSubscription(): { endpoint: string } | null {
  try { const raw = localStorage.getItem(SUB_KEY); return raw ? { endpoint: JSON.parse(raw).endpoint } : null; } catch { return null; }
}

export const hasPushSubscription =() => { try { return !!localStorage.getItem(SUB_KEY); } catch { return false; } };
