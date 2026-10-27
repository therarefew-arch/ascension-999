// Ascension 999 — notification server (a Cloudflare Worker, free tier).
//
// - POST /schedule   the game sends a phone's upcoming notifications when you leave it ([] = cancel).
// - GET  /inbox      the phone's background helper (public/sw.js) picks up messages after a push wakes it.
// - every minute     sends a "wake up" push to each phone that has something due.
//
// Pushes carry no data (so no encryption is needed): the phone fetches the text from /inbox.
// Nothing personal is stored — just the phone's push address and the next few game messages.

interface D1Result<T> { results: T[] }
interface D1Stmt { bind(...v: unknown[]): D1Stmt; all<T = Record<string, unknown>>(): Promise<D1Result<T>>; first<T = Record<string, unknown>>(): Promise<T | null>; run(): Promise<unknown> }
interface D1Database { prepare(sql: string): D1Stmt; batch(s: D1Stmt[]): Promise<unknown> }
interface Env { DB: D1Database; VAPID_PUBLIC: string; VAPID_PRIVATE: string; VAPID_SUBJECT: string }
interface PushSub { endpoint: string }
interface Note { at: number; title: string; body: string; tag: string }

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const MAX_NOTES = 12;
const DAY = 86_400_000;

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const empty = (status = 204) => new Response(null, { status, headers: CORS });

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256hex(text: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Checks what the game sent. Returns null if it doesn't look right. */
function parseSchedule(raw: string, now: number): { sub: PushSub; notes: Note[] } | null {
  let data: { sub?: { endpoint?: unknown }; notes?: unknown };
  try { data = JSON.parse(raw); } catch { return null; }
  const endpoint = data.sub?.endpoint;
  if (typeof endpoint !== 'string' || endpoint.length > 1000 || !endpoint.startsWith('https://')) return null;
  if (!Array.isArray(data.notes)) return null;
  const notes: Note[] = [];
  for (const n of data.notes.slice(0, MAX_NOTES) as Record<string, unknown>[]) {
    const at = Number(n?.at);
    if (!Number.isFinite(at) || at < now - 60_000 || at > now + 25 * 3_600_000) continue;
    const title = str(n.title, 120);
    if (!title) continue;
    notes.push({ at: Math.round(at), title, body: str(n.body, 300), tag: str(n.tag, 60) || 'a999' });
  }
  return { sub: { endpoint }, notes };
}

// ----- Web push (VAPID) -----
let signingKey: CryptoKey | null = null;
async function vapidJwt(env: Env, audience: string): Promise<string> {
  // The secret may carry an invisible "byte order mark" from Windows — strip it before reading.
  signingKey ??= await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE.replace(/^﻿/, '').trim()), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT })}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64url(sig)}`;
}

/** Sends an empty "wake up" push. Returns the push service's status code. */
async function wakePhone(env: Env, sub: PushSub): Promise<number> {
  const jwt = await vapidJwt(env, new URL(sub.endpoint).origin);
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { TTL: '3600', Urgency: 'normal', Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}` },
  });
  if (res.status >= 300) console.log('push failed', res.status, new URL(sub.endpoint).host, (await res.text()).slice(0, 300));
  return res.status;
}

async function sendDue(env: Env): Promise<void> {
  const now = Date.now();
  const { results } = await env.DB.prepare('SELECT DISTINCT device FROM notes WHERE sent = 0 AND at <= ? LIMIT 200').bind(now).all<{ device: string }>();
  for (const { device } of results) {
    const row = await env.DB.prepare('SELECT sub FROM devices WHERE id = ?').bind(device).first<{ sub: string }>();
    if (!row) { await env.DB.prepare('DELETE FROM notes WHERE device = ?').bind(device).run(); continue; }
    let status = 0;
    try { status = await wakePhone(env, JSON.parse(row.sub)); } catch (e) { status = 0; console.log('push error', (e as Error).message); }
    if (status >= 200 && status < 300) {
      await env.DB.prepare('UPDATE notes SET sent = 1 WHERE device = ? AND sent = 0 AND at <= ?').bind(device, now).run();
    } else if (status === 404 || status === 410) {
      // That phone unsubscribed or reinstalled — forget it.
      await env.DB.batch([env.DB.prepare('DELETE FROM notes WHERE device = ?').bind(device), env.DB.prepare('DELETE FROM devices WHERE id = ?').bind(device)]);
    } else {
      // Try again next minute, but give up on anything over an hour late.
      await env.DB.prepare('DELETE FROM notes WHERE device = ? AND sent = 0 AND at < ?').bind(device, now - 3_600_000).run();
    }
  }
  // Tidy up old things.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM notes WHERE sent = 1 AND at < ?').bind(now - 2 * DAY),
    env.DB.prepare('DELETE FROM devices WHERE updated < ?').bind(now - 60 * DAY),
  ]);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return empty();

    if (req.method === 'POST' && url.pathname === '/schedule') {
      const raw = await req.text();
      if (raw.length > 20_000) return empty(413);
      const now = Date.now();
      const data = parseSchedule(raw, now);
      if (!data) return empty(400);
      const device = await sha256hex(data.sub.endpoint);
      await env.DB.batch([
        env.DB.prepare('INSERT OR REPLACE INTO devices (id, sub, updated) VALUES (?, ?, ?)').bind(device, JSON.stringify(data.sub), now),
        env.DB.prepare('DELETE FROM notes WHERE device = ? AND sent = 0').bind(device),
        ...data.notes.map((n) => env.DB.prepare('INSERT INTO notes (device, at, title, body, tag) VALUES (?, ?, ?, ?, ?)').bind(device, n.at, n.title, n.body, n.tag)),
      ]);
      return empty();
    }

    if (req.method === 'GET' && url.pathname === '/inbox') {
      const device = url.searchParams.get('device') ?? '';
      if (!/^[0-9a-f]{64}$/.test(device)) return json([]);
      const now = Date.now();
      const { results } = await env.DB.prepare('SELECT id, title, body, tag FROM notes WHERE device = ? AND (sent = 1 OR at <= ?) ORDER BY at LIMIT 6').bind(device, now)
        .all<{ id: number; title: string; body: string; tag: string }>();
      if (results.length) await env.DB.batch(results.map((r) => env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(r.id)));
      return json(results.map(({ title, body, tag }) => ({ title, body, tag })));
    }

    if (url.pathname === '/') return new Response('Ascension 999 notification server is running.', { headers: CORS });
    return empty(404);
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await sendDue(env);
  },
};
