/**
 * vite-plugins/hls-proxy.ts
 *
 * Dev-server middleware that proxies HLS streams (m3u8 manifests + ts segments),
 * rewriting manifest URLs so every segment is also routed through the proxy.
 */
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
};

function setCorsHeaders(res: ServerResponse) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v);
}

function isHlsManifest(target: string, contentType: string) {
  return target.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('x-mpegURL');
}

async function rewriteManifest(text: string, target: string, referer: string): Promise<string> {
  const encodedReferer = encodeURIComponent(referer);
  return text
    .split('\n')
    .map(line => {
      const tagLine = line.replace(/URI="([^"]+)"/g, (_, uri) => {
        const absolute = new URL(uri, target).toString();
        return `URI="/api/hls-proxy?url=${encodeURIComponent(absolute)}&referer=${encodedReferer}"`;
      });
      if (tagLine !== line) return tagLine;

      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;

      const absolute = new URL(trimmed, target).toString();
      return `/api/hls-proxy?url=${encodeURIComponent(absolute)}&referer=${encodedReferer}`;
    })
    .join('\n');
}

export function hlsProxyPlugin(): Plugin {
  return {
    name: 'hls-stream-proxy',
    configureServer(server) {
      server.middlewares.use('/api/hls-proxy', async (req: IncomingMessage, res: ServerResponse, next) => {
        try {
          const { searchParams } = new URL(req.url ?? '', 'http://localhost');
          const target = searchParams.get('url');
          const referer = searchParams.get('referer') ?? 'https://kwik.cx/';

          if (!target) { res.statusCode = 400; res.end('Missing url'); return; }

          setCorsHeaders(res);

          if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

          const upstreamHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Accept: '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            Origin: new URL(referer).origin,
            Referer: referer,
          };
          const range = (req.headers as Record<string, string>)['range'];
          if (range) upstreamHeaders['Range'] = range;

          const upstream = await fetch(target, { headers: upstreamHeaders });
          const contentType = upstream.headers.get('content-type') ?? '';

          if (req.method === 'HEAD') {
            res.setHeader('Content-Type', target.includes('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t');
            res.setHeader('Accept-Ranges', 'bytes');
            const cl = upstream.headers.get('content-length');
            if (cl) res.setHeader('Content-Length', cl);
            res.statusCode = 200; res.end(); return;
          }

          if (isHlsManifest(target, contentType)) {
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Cache-Control', 'no-cache');
            const rewritten = await rewriteManifest(await upstream.text(), target, referer);
            res.statusCode = 200; res.end(rewritten);
          } else {
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', contentType || 'video/mp2t');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('Accept-Ranges', 'bytes');
            const cl = upstream.headers.get('content-length');
            if (cl) res.setHeader('Content-Length', cl);
            const cr = upstream.headers.get('content-range');
            if (cr) res.setHeader('Content-Range', cr);
            const buf = Buffer.from(await upstream.arrayBuffer());
            res.setHeader('Content-Length', buf.length.toString());
            res.end(buf);
          }
        } catch (err) { next(err); }
      });
    },
  };
}
