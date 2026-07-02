import type { Server as HttpServer } from 'http';
import type { IncomingMessage } from 'http';
import type { Socket } from 'net';
import { WebSocket, WebSocketServer, type RawData } from 'ws';

const HBBS_WS = process.env.PROMIX_RUSTDESK_HBBS_WS || 'ws://127.0.0.1:21118';
const HBBR_WS = process.env.PROMIX_RUSTDESK_HBBR_WS || 'ws://127.0.0.1:21119';

/** /ws/id, /ws/relay, and tenant-prefixed /t/<slug>/ws/* */
function matchWsPath(url: string): { relay: boolean; path: string } | null {
  const bare = url.match(/^\/ws\/(id|relay)(\?.*)?$/);
  if (bare) {
    return { relay: bare[1] === 'relay', path: `/ws/${bare[1]}${bare[2] || ''}` };
  }
  const tenant = url.match(/^\/t\/[^/]+\/ws\/(id|relay)(\?.*)?$/);
  if (tenant) {
    return { relay: tenant[1] === 'relay', path: `/ws/${tenant[1]}${tenant[2] || ''}` };
  }
  return null;
}

function pipeRelay(client: WebSocket, upstreamUrl: string, req: IncomingMessage): void {
  const upstream = new WebSocket(upstreamUrl, {
    headers: {
      Connection: 'Upgrade',
      Upgrade: 'websocket',
      Host: new URL(upstreamUrl).host,
      'Sec-WebSocket-Version': req.headers['sec-websocket-version'] as string || '13',
      'Sec-WebSocket-Key': req.headers['sec-websocket-key'] as string || '',
    },
  });

  const pending: { data: RawData; isBinary: boolean }[] = [];

  client.on('message', (data, isBinary) => {
    if (upstream.readyState === WebSocket.OPEN) {
      upstream.send(data, { binary: isBinary });
    } else {
      pending.push({ data, isBinary });
    }
  });

  upstream.on('open', () => {
    for (const msg of pending) {
      upstream.send(msg.data, { binary: msg.isBinary });
    }
    pending.length = 0;

    upstream.on('message', (data, isBinary) => {
      if (client.readyState === WebSocket.OPEN) client.send(data, { binary: isBinary });
    });
  });

  const closeBoth = (reason?: string) => {
    if (reason) console.warn('[rustdesk-ws]', reason);
    try { client.close(); } catch { /* ignore */ }
    try { upstream.close(); } catch { /* ignore */ }
  };
  client.on('close', () => closeBoth());
  client.on('error', (e) => closeBoth(`client error: ${e.message}`));
  upstream.on('close', () => closeBoth());
  upstream.on('error', (e) => closeBoth(`upstream error: ${e.message}`));
}

/**
 * Proxies RustDesk web viewer WebSockets through the Automatix HTTPS origin so
 * browsers on app.automatix.online can use wss://<app-host>/ws/id and /ws/relay
 * without mixed-content or extra DNS.
 */
export function attachRustDeskWsProxy(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const matched = matchWsPath(req.url || '');
    if (!matched) return;

    const targetBase = matched.relay ? HBBR_WS : HBBS_WS;
    const upstreamUrl = `${targetBase.replace(/\/+$/, '')}${matched.path}`;

    wss.handleUpgrade(req, socket, head, (ws) => {
      pipeRelay(ws, upstreamUrl, req);
    });
  });
}

export function rustdeskViewerHost(): string | null {
  const explicit = (process.env.PROMIX_RUSTDESK_VIEWER_HOST || '').trim();
  if (explicit) return explicit.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  const appHost = (process.env.PROMIX_APP_HOST || '').trim();
  if (appHost) return appHost.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  const publicUrl = (process.env.PROMIX_PUBLIC_URL || '').trim();
  if (publicUrl) {
    try {
      return new URL(publicUrl).hostname;
    } catch { /* fall through */ }
  }
  return null;
}
