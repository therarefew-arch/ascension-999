// 🤝 Co-op dungeon party rooms (v0.0.2.0). One Durable Object per party code: it holds up to two live
// connections (the leader, then the friend) and passes every message from one to the other. It never looks
// inside the messages and stores nothing — when both leave, the room is simply empty again.
//
// Uses the WebSocket Hibernation API, so an idle room costs nothing.

interface DOState {
  acceptWebSocket(ws: WebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): WebSocket[];
  getTags(ws: WebSocket): string[];
}

/** The biggest message passed on (a room picture is a few KB). */
const MAX_MSG = 64_000;

export class PartyRoom {
  constructor(private state: DOState) {}

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a websocket', { status: 426 });
    const url = new URL(req.url);
    const want = url.searchParams.get('as') === 'lead' ? 'lead' : 'friend';
    const open = this.state.getWebSockets();
    const taken = open.map((w) => this.state.getTags(w)[0]);
    // A party holds two. The leader makes it; one friend can join.
    if (open.length >= 2 || taken.includes(want) || (want === 'friend' && !taken.includes('lead'))) {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      server.accept();
      server.send(JSON.stringify({ t: 'nope', why: want === 'friend' && !taken.includes('lead') ? 'No party with that code' : 'That party is full' }));
      server.close(4000, 'nope');
      return new Response(null, { status: 101, webSocket: client } as ResponseInit);
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.state.acceptWebSocket(server, [want]);
    server.send(JSON.stringify({ t: 'hello', as: want, peer: taken.length > 0 }));
    for (const w of open) w.send(JSON.stringify({ t: 'peer', on: true }));
    return new Response(null, { status: 101, webSocket: client } as ResponseInit);
  }

  async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer) {
    const size = typeof msg === 'string' ? msg.length : msg.byteLength;
    if (size > MAX_MSG) return;
    for (const w of this.state.getWebSockets()) if (w !== ws) { try { w.send(msg); } catch { /* gone */ } }
  }

  async webSocketClose(ws: WebSocket) {
    for (const w of this.state.getWebSockets()) if (w !== ws) { try { w.send(JSON.stringify({ t: 'peer', on: false })); } catch { /* gone */ } }
    try { ws.close(1000, 'bye'); } catch { /* already closed */ }
  }

  async webSocketError(ws: WebSocket) { await this.webSocketClose(ws); }
}

/** Letters that can't be mixed up when read out (no O/0, I/1, L). */
const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newPartyCode = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => CODE_ABC[b % CODE_ABC.length]).join('');
export const validCode = (c: string) => /^[A-HJKMNP-Z2-9]{5}$/.test(c);
