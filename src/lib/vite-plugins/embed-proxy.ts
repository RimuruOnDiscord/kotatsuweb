/**
 * vite-plugins/embed-proxy.ts
 *
 * Dev-server middleware that proxies external embed iframes (Hanime, HentaiHaven, etc.)
 * allowing the app to embed NSFW providers through the proxy.
 */
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type',
  'X-Frame-Options': 'ALLOWALL',
};

function setCorsHeaders(res: ServerResponse) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
}

const ALLOWED_EMBED_HOSTS = [
  'hanime.tv',
  'hanime1.me',
  'hanime3.me',
  'hentaihaven.xxx',
  'hentaihaven.to',
  'hentaicasts.com',
];

export function embedProxyPlugin(): Plugin {
  return {
    name: 'embed-proxy',
    configureServer(server) {
      server.middlewares.use('/api/embed-proxy', async (req: IncomingMessage, res: ServerResponse, next) => {
        try {
          const { searchParams } = new URL(req.url ?? '', 'http://localhost');
          const target = searchParams.get('url');

          if (!target) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Missing url');
            return;
          }

          setCorsHeaders(res);

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          try {
            const parsedUrl = new URL(target);
            const host = parsedUrl.hostname.replace(/^www\./, '').toLowerCase();
            const isAllowed = ALLOWED_EMBED_HOSTS.some(h => host.includes(h));
            if (!isAllowed) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'text/plain');
              res.end('Embed not allowed for this host');
              return;
            }
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Invalid URL');
            return;
          }

          const upstreamHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: target,
          };

          const upstream = await fetch(target, { headers: upstreamHeaders });
          const contentType = upstream.headers.get('content-type') ?? 'text/html';

          res.setHeader('Content-Type', contentType);
          res.setHeader('X-Frame-Options', 'ALLOWALL');
          res.setHeader('Content-Security-Policy', "frame-ancestors *");
          res.statusCode = upstream.status;

          if (upstream.body) {
            const reader = upstream.body.getReader();
            const chunks: Uint8Array[] = [];
            let totalSize = 0;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              totalSize += value.length;
              if (totalSize > 5 * 1024 * 1024) break;
            }

            const buffer = Buffer.concat(chunks);
            res.setHeader('Content-Length', buffer.length.toString());
            res.end(buffer);
          } else {
            res.end();
          }
        } catch (err) {
          console.error('[embed-proxy] Error:', err);
          next(err);
        }
      });
    },
  };
}