/**
 * vite-plugins/image-proxy.ts
 *
 * Dev-server middleware that proxies manga cover images from upstream CDNs,
 * adding the correct Referer header to bypass hotlink protection.
 */
import type { Plugin } from 'vite';
import { Readable } from 'stream';

const ALLOWED_HOSTS = new Set([
  'cdn.readdetectiveconan.com',
  'mangaread.org',
  'www.mangaread.org',
]);

const REFERER_MAP: Record<string, string> = {
  'cdn.readdetectiveconan.com': 'https://mangapill.com/',
};
const DEFAULT_REFERER = 'https://asuracomic.net/';

export function imageProxyPlugin(): Plugin {
  return {
    name: 'manga-image-proxy',
    configureServer(server) {
      server.middlewares.use('/api/image', async (req, res, next) => {
        try {
          const { searchParams } = new URL(req.url ?? '', 'http://localhost');
          const target = searchParams.get('url');

          if (!target) { res.statusCode = 400; res.end('Missing url'); return; }

          const upstreamUrl = new URL(target);
          if (!ALLOWED_HOSTS.has(upstreamUrl.hostname)) {
            res.statusCode = 400; res.end('Invalid host'); return;
          }

          const referer = REFERER_MAP[upstreamUrl.hostname] ?? DEFAULT_REFERER;
          const upstream = await fetch(upstreamUrl.toString(), {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Referer: referer,
              Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });

          if (!upstream.ok) { res.statusCode = upstream.status; res.end(`Upstream error: ${upstream.status}`); return; }

          res.statusCode = 200;
          res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'image/jpeg');
          res.setHeader('Cache-Control', upstream.headers.get('cache-control') ?? 'public, max-age=86400');
          if (upstream.body) Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
          else res.end();
        } catch (err) { next(err); }
      });
    },
  };
}
