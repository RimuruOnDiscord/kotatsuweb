import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Readable } from 'stream' // ADDED FOR TRUE STREAMING

const imageProxyPlugin = () => ({
  name: 'manga-image-proxy',
  configureServer(server: any) {
    server.middlewares.use('/api/image', async (req: any, res: any, next: any) => {
      try {
        const requestUrl = new URL(req.url || '', 'http://localhost');
        const target = requestUrl.searchParams.get('url');

        if (!target) {
          res.statusCode = 400;
          res.end('Missing url');
          return;
        }

        const upstreamUrl = new URL(target);
        const isAllowedHost = (hostname: string) =>
          hostname === 'cdn.readdetectiveconan.com'
          || hostname === 'mangaread.org'
          || hostname === 'www.mangaread.org';

        if (!isAllowedHost(upstreamUrl.hostname)) {
          res.statusCode = 400;
          res.end('Invalid host');
          return;
        }

        const referer = upstreamUrl.hostname === 'cdn.readdetectiveconan.com'
          ? 'https://mangapill.com/'
          : 'https://asuracomic.net/';

        const upstream = await fetch(upstreamUrl.toString(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
            'Referer': referer,
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        if (!upstream.ok) {
          res.statusCode = upstream.status;
          res.end(`Upstream image error: ${upstream.status}`);
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', upstream.headers.get('cache-control') || 'public, max-age=86400');

        if (upstream.body) {
          Readable.fromWeb(upstream.body as any).pipe(res);
        } else {
          res.end();
        }
      } catch (error) {
        next(error);
      }
    });
  },
});

// ─── HLS Stream Proxy ────────────────────────────────────────────────────────
const hlsStreamProxyPlugin = () => ({
  name: 'hls-stream-proxy',
  configureServer(server: any) {
    server.middlewares.use('/api/hls-proxy', async (req: any, res: any, next: any) => {
      try {
        const requestUrl = new URL(req.url || '', 'http://localhost');
        const target = requestUrl.searchParams.get('url');
        const referer = requestUrl.searchParams.get('referer') || 'https://kwik.cx/';

        if (!target) {
          res.statusCode = 400;
          res.end('Missing url');
          return;
        }

        // Build upstream headers, forwarding Range so the player gets proper 206 responses
        const upstreamHeaders: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'identity',
          'Origin': new URL(referer).origin,
          'Referer': referer,
        };

        if (req.headers['range']) {
          upstreamHeaders['Range'] = req.headers['range'];
        }

        const upstream = await fetch(target, { headers: upstreamHeaders });

        if (!upstream.ok && upstream.status !== 206) {
          res.statusCode = upstream.status;
          res.end(`Stream error: ${upstream.status}`);
          return;
        }

        const contentType = upstream.headers.get('content-type') || '';
        const isManifest =
          new URL(target).pathname.endsWith('.m3u8') ||
          contentType.includes('mpegurl') ||
          contentType.includes('x-mpegURL');

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === 'HEAD') {
          const isM3u8 = target.includes('.m3u8');
          res.setHeader('Content-Type', isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/mp2t');
          res.setHeader('Accept-Ranges', 'bytes');
          // Forward Content-Length on HEAD so the player knows the segment size upfront
          const cl = upstream.headers.get('content-length');
          if (cl) res.setHeader('Content-Length', cl);
          res.statusCode = 200;
          res.end();
          return;
        }

        if (isManifest) {
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.setHeader('Cache-Control', 'no-cache');

          const text = await upstream.text();
          const encodedReferer = encodeURIComponent(referer);

          const rewritten = text
            .split('\n')
            .map(line => {
              const trimmed = line.trim();

              const tagLine = line.replace(/URI="([^"]+)"/g, (_, uri) => {
                const absolute = new URL(uri, target).toString();
                return `URI="/api/hls-proxy?url=${encodeURIComponent(absolute)}&referer=${encodedReferer}"`;
              });
              if (tagLine !== line) return tagLine;

              if (!trimmed || trimmed.startsWith('#')) return line;

              const absolute = new URL(trimmed, target).toString();
              return `/api/hls-proxy?url=${encodeURIComponent(absolute)}&referer=${encodedReferer}`;
            })
            .join('\n');

          res.statusCode = 200;
          res.end(rewritten);
        } else {
          // Forward status (200 or 206 Partial Content), Content-Length, Content-Range,
          // and Accept-Ranges so the player stops waiting and knows exactly what it's getting
          res.statusCode = upstream.status; // preserve 206
          res.setHeader('Content-Type', contentType || 'video/mp2t');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.setHeader('Accept-Ranges', 'bytes');

          const contentLength = upstream.headers.get('content-length');
          if (contentLength) res.setHeader('Content-Length', contentLength);

          const contentRange = upstream.headers.get('content-range');
          if (contentRange) res.setHeader('Content-Range', contentRange);

          const arrayBuffer = await upstream.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          res.setHeader('Content-Length', buffer.length.toString());
          res.end(buffer);
        }
      } catch (error) {
        next(error);
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), imageProxyPlugin(), hlsStreamProxyPlugin()],
  server: {
    proxy: {
      '/manga-scrapers': {
        target: 'https://manga-scrapers-xi.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/manga-scrapers/, ''),
      },
      '/api': {
        target: 'https://miruoapi.vercel.app',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
          });
        },
      },
    },
  },
})
