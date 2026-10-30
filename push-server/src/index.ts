// Ascension 999 — notification server (a Cloudflare Worker, free tier).
//
// - POST /schedule   the game sends a phone's upcoming notifications when you leave it ([] = cancel).
// - GET  /inbox      the phone's background helper (public/sw.js) picks up messages after a push wakes it.
// - every minute     sends a "wake up" push to each phone that has something due.
// - /family/*        👪 Family (v0.0.1.55): create / join by invite link, the family board + feed, cheers, nudges.
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
    headers: { TTL: '3600', Urgency: 'high', Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC}` },
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
    env.DB.prepare('DELETE FROM nudges WHERE day < ?').bind(new Date(now - 3 * DAY).toISOString().slice(0, 10)),
    // 👪 Adventurers who haven't opened the game in 90 days leave their family quietly; empty families close.
    env.DB.prepare('DELETE FROM members WHERE updated < ?').bind(now - 90 * DAY),
    env.DB.prepare('DELETE FROM feed WHERE family NOT IN (SELECT DISTINCT family FROM members)'),
    env.DB.prepare('DELETE FROM families WHERE id NOT IN (SELECT DISTINCT family FROM members) AND created < ?').bind(now - DAY),
    env.DB.prepare('DELETE FROM cheers WHERE feed NOT IN (SELECT id FROM feed)'),
  ]);
}

// ----- 👪 Family -----
// A family is a long random id (in the invite link) plus a name. Each member gets a secret token,
// kept in their save, which every write must show. Nothing personal: just the adventurer's name and a
// small summary of their game (town, levels, idle) for the family board.
const MAX_MEMBERS = 8;
const FEED_KEEP = 60;
interface Member { id: string; family: string; token: string; name: string; snap: string; device: string | null; updated: number; joined: number }

function randomId(bytes: number): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}
const cleanName = (v: unknown, fallback: string) => str(v, 24).replace(/[\u0000-\u001f<>]/g, '').trim() || fallback;

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  const raw = await req.text();
  if (raw.length > 12_000) return null;
  try { const d = JSON.parse(raw); return d && typeof d === 'object' ? d : null; } catch { return null; }
}

/** The member making the request, if their family / id / token match. */
async function who(env: Env, d: Record<string, unknown>): Promise<Member | null> {
  const f = str(d.f, 40), m = str(d.m, 40), t = str(d.t, 60);
  if (!f || !m || !t) return null;
  return env.DB.prepare('SELECT * FROM members WHERE id = ? AND family = ? AND token = ?').bind(m, f, t).first<Member>();
}

/** Queues a push for a member's phone (sent by the every-minute job, text picked up from /inbox). */
function pushTo(env: Env, device: string | null, title: string, body: string): D1Stmt[] {
  if (!device) return [];
  return [env.DB.prepare("INSERT INTO notes (device, at, title, body, tag) VALUES (?, ?, ?, ?, 'a999family')").bind(device, Date.now(), title.slice(0, 120), body.slice(0, 300))];
}

/** Everything the Family tab shows. */
async function board(env: Env, family: string) {
  const fam = await env.DB.prepare('SELECT name FROM families WHERE id = ?').bind(family).first<{ name: string }>();
  const { results: members } = await env.DB.prepare('SELECT id, name, snap, updated, joined FROM members WHERE family = ? ORDER BY joined').bind(family)
    .all<{ id: string; name: string; snap: string; updated: number; joined: number }>();
  const { results: feed } = await env.DB.prepare('SELECT id, member, kind, text, at FROM feed WHERE family = ? ORDER BY at DESC LIMIT 40').bind(family)
    .all<{ id: number; member: string; kind: string; text: string; at: number }>();
  const ids = feed.map((e) => e.id);
  const cheers = ids.length
    ? (await env.DB.prepare(`SELECT feed, member FROM cheers WHERE feed IN (${ids.map(() => '?').join(',')})`).bind(...ids).all<{ feed: number; member: string }>()).results
    : [];
  return {
    name: fam?.name ?? 'Family',
    members: members.map((m) => ({ id: m.id, name: m.name, updated: m.updated, snap: safeJson(m.snap) })),
    feed: feed.map((e) => ({ ...e, cheers: cheers.filter((c) => c.feed === e.id).map((c) => c.member) })),
    now: Date.now(),
  };
}
function safeJson(s: string): unknown { try { return JSON.parse(s); } catch { return {}; } }

async function family(req: Request, url: URL, env: Env): Promise<Response> {
  const path = url.pathname.slice('/family/'.length);
  const now = Date.now();

  // Who's this invite from? (shown before joining)
  if (req.method === 'GET' && path === 'info') {
    const f = str(url.searchParams.get('f'), 40);
    const fam = f ? await env.DB.prepare('SELECT name FROM families WHERE id = ?').bind(f).first<{ name: string }>() : null;
    if (!fam) return json({ error: 'gone' }, 404);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM members WHERE family = ?').bind(f).first<{ n: number }>();
    const { results } = await env.DB.prepare('SELECT name FROM members WHERE family = ? ORDER BY joined LIMIT 8').bind(f).all<{ name: string }>();
    return json({ name: fam.name, count: n?.n ?? 0, full: (n?.n ?? 0) >= MAX_MEMBERS, members: results.map((r) => r.name) });
  }
  if (req.method !== 'POST') return empty(405);
  const d = await readBody(req);
  if (!d) return empty(400);

  if (path === 'create') {
    const f = randomId(16), m = randomId(9), t = randomId(24);
    const name = cleanName(d.family, 'Our Family');
    await env.DB.batch([
      env.DB.prepare('INSERT INTO families (id, name, created) VALUES (?, ?, ?)').bind(f, name, now),
      env.DB.prepare('INSERT INTO members (id, family, token, name, updated, joined) VALUES (?, ?, ?, ?, ?, ?)').bind(m, f, t, cleanName(d.name, 'Adventurer'), now, now),
    ]);
    return json({ f, m, t, name });
  }

  if (path === 'join') {
    const f = str(d.f, 40);
    const fam = f ? await env.DB.prepare('SELECT name FROM families WHERE id = ?').bind(f).first<{ name: string }>() : null;
    if (!fam) return json({ error: 'That family no longer exists' }, 404);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM members WHERE family = ?').bind(f).first<{ n: number }>();
    if ((n?.n ?? 0) >= MAX_MEMBERS) return json({ error: `That family is full (${MAX_MEMBERS} members)` }, 409);
    const m = randomId(9), t = randomId(24);
    const name = cleanName(d.name, 'Adventurer');
    await env.DB.batch([
      env.DB.prepare('INSERT INTO members (id, family, token, name, updated, joined) VALUES (?, ?, ?, ?, ?, ?)').bind(m, f, t, name, now, now),
      env.DB.prepare('INSERT INTO feed (family, member, kind, text, at) VALUES (?, ?, ?, ?, ?)').bind(f, m, 'join', 'joined the family!', now),
    ]);
    return json({ f, m, t, name: fam.name });
  }

  const me = await who(env, d);
  if (!me) return json({ error: 'not a member' }, 403);

  // The game's regular check-in: its summary, any big moments, its phone's push id. Answers with the board.
  if (path === 'sync') {
    const stmts: D1Stmt[] = [];
    const snap = typeof d.snap === 'object' && d.snap ? JSON.stringify(d.snap) : '{}';
    let device = me.device;
    const endpoint = (d.sub as { endpoint?: unknown } | undefined)?.endpoint;
    if (typeof endpoint === 'string' && endpoint.startsWith('https://') && endpoint.length < 1000) {
      device = await sha256hex(endpoint);
      stmts.push(env.DB.prepare('INSERT OR REPLACE INTO devices (id, sub, updated) VALUES (?, ?, ?)').bind(device, JSON.stringify({ endpoint }), now));
    }
    stmts.push(env.DB.prepare('UPDATE members SET snap = ?, name = ?, device = ?, updated = ? WHERE id = ?')
      .bind(snap.length <= 4000 ? snap : '{}', cleanName(d.name, me.name), device, now, me.id));
    const events = Array.isArray(d.events) ? (d.events as Record<string, unknown>[]).slice(0, 8) : [];
    for (const e of events) {
      const text = str(e?.text, 140);
      const at = Number(e?.at);
      if (!text) continue;
      stmts.push(env.DB.prepare('INSERT INTO feed (family, member, kind, text, at) VALUES (?, ?, ?, ?, ?)')
        .bind(me.family, me.id, str(e.kind, 20) || 'moment', text, Number.isFinite(at) && at <= now && at > now - 2 * DAY ? Math.round(at) : now));
    }
    await env.DB.batch(stmts);
    if (events.length) {
      // Keep the feed short.
      await env.DB.prepare('DELETE FROM feed WHERE family = ? AND id NOT IN (SELECT id FROM feed WHERE family = ? ORDER BY at DESC LIMIT ?)').bind(me.family, me.family, FEED_KEEP).run();
    }
    return json(await board(env, me.family));
  }

  if (path === 'cheer') {
    const id = Number(d.feed);
    const ev = await env.DB.prepare('SELECT member, text FROM feed WHERE id = ? AND family = ?').bind(id, me.family).first<{ member: string; text: string }>();
    if (!ev || ev.member === me.id) return empty(400);
    const done = await env.DB.prepare('SELECT 1 AS x FROM cheers WHERE feed = ? AND member = ?').bind(id, me.id).first();
    if (done) return json(await board(env, me.family));
    const owner = await env.DB.prepare('SELECT device FROM members WHERE id = ?').bind(ev.member).first<{ device: string | null }>();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO cheers (feed, member) VALUES (?, ?)').bind(id, me.id),
      ...pushTo(env, owner?.device ?? null, `🎉 ${me.name} cheered for you!`, `You ${ev.text}`),
    ]);
    return json(await board(env, me.family));
  }

  if (path === 'nudge') {
    const to = await env.DB.prepare('SELECT id, device FROM members WHERE id = ? AND family = ?').bind(str(d.to, 40), me.family).first<{ id: string; device: string | null }>();
    if (!to || to.id === me.id) return empty(400);
    const day = new Date(now).toISOString().slice(0, 10);
    const done = await env.DB.prepare('SELECT 1 AS x FROM nudges WHERE from_m = ? AND to_m = ? AND day = ?').bind(me.id, to.id, day).first();
    if (done) return json({ ok: false, why: 'Already nudged today' });
    await env.DB.batch([
      env.DB.prepare('INSERT INTO nudges (from_m, to_m, day) VALUES (?, ?, ?)').bind(me.id, to.id, day),
      ...pushTo(env, to.device, `👋 ${me.name} says come play!`, 'Your family is out adventuring in Ascension 999.'),
    ]);
    return json({ ok: true, push: !!to.device });
  }

  if (path === 'leave') {
    await env.DB.prepare('DELETE FROM members WHERE id = ?').bind(me.id).run();
    const left = await env.DB.prepare('SELECT COUNT(*) AS n FROM members WHERE family = ?').bind(me.family).first<{ n: number }>();
    if (!left?.n) {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM cheers WHERE feed IN (SELECT id FROM feed WHERE family = ?)').bind(me.family),
        env.DB.prepare('DELETE FROM feed WHERE family = ?').bind(me.family),
        env.DB.prepare('DELETE FROM families WHERE id = ?').bind(me.family),
      ]);
    } else {
      await env.DB.prepare('INSERT INTO feed (family, member, kind, text, at) VALUES (?, ?, ?, ?, ?)').bind(me.family, me.id, 'leave', 'left the family.', now).run();
    }
    return json({ ok: true });
  }

  return empty(404);
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

    // Settings → "Send a test": wakes the phone right now with a test message. Only real push services.
    if (req.method === 'POST' && url.pathname === '/test') {
      const raw = await req.text();
      if (raw.length > 5_000) return empty(413);
      const now = Date.now();
      let parsed: { sub?: unknown } = {};
      try { parsed = JSON.parse(raw); } catch { /* checked below */ }
      const data = parseSchedule(JSON.stringify({ sub: parsed.sub, notes: [] }), now);
      if (!data) return empty(400);
      const host = new URL(data.sub.endpoint).host;
      if (!/(^|\.)(googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/.test(host)) return empty(400);
      const device = await sha256hex(data.sub.endpoint);
      await env.DB.batch([
        env.DB.prepare('INSERT OR REPLACE INTO devices (id, sub, updated) VALUES (?, ?, ?)').bind(device, JSON.stringify(data.sub), now),
        env.DB.prepare("DELETE FROM notes WHERE device = ? AND tag = 'a999test'").bind(device),
        env.DB.prepare("INSERT INTO notes (device, at, title, body, tag, sent) VALUES (?, ?, '🔔 Notifications work!', 'This is a test from Ascension 999.', 'a999test', 1)").bind(device, now),
      ]);
      let status = 0;
      try { status = await wakePhone(env, data.sub); } catch (e) { console.log('test push error', (e as Error).message); }
      return json({ status });
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

    if (url.pathname.startsWith('/family/')) return family(req, url, env);

    if (url.pathname === '/') return new Response('Ascension 999 notification server is running.', { headers: CORS });
    return empty(404);
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await sendDue(env);
  },
};
