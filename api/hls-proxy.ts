import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const targetUrl = req.query.url as string;
    const referer = (req.query.referer as string) || 'https://kwik.cx/';

    if (!targetUrl) {
      return res.status(400).send('Missing url parameter');
    }

    const upstreamHeaders: Record<string, string> = {
      'User-Agent': req.headers['user-agent'] as string || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': new URL(referer).origin,
      'Referer': referer,
      'X-Forwarded-For': req.headers['x-forwarded-for'] as string || '8.8.8.8',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site'
    };

    if (req.headers['range']) {
      upstreamHeaders['Range'] = Array.isArray(req.headers['range']) ? req.headers['range'][0] : req.headers['range'];
    }

    const upstream = await fetch(targetUrl, { headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send(`Stream error: ${upstream.status}`);
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isManifest = new URL(targetUrl).pathname.endsWith('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegURL');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    if (req.method === 'HEAD') {
      const isM3u8 = targetUrl.includes('.m3u8');
      res.setHeader('Content-Type', isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/mp2t');
      res.setHeader('Accept-Ranges', 'bytes');
      const cl = upstream.headers.get('content-length');
      if (cl) res.setHeader('Content-Length', cl);
      return res.status(200).end();
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
            const absolute = new URL(uri, targetUrl).toString();
            return `URI="/api/hls-proxy?url=${encodeURIComponent(absolute)}&referer=${encodedReferer}"`;
          });
          if (tagLine !== line) return tagLine;

          if (!trimmed || trimmed.startsWith('#')) return line;

          const absolute = new URL(trimmed, targetUrl).toString();
          return `/api/hls-proxy?url=${encodeURIComponent(absolute)}&referer=${encodedReferer}`;
        })
        .join('\n');

      return res.status(200).send(rewritten);
    } else {
      res.status(upstream.status);
      res.setHeader('Content-Type', contentType || 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Accept-Ranges', 'bytes');

      const contentRange = upstream.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);

      const arrayBuffer = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Length', buffer.length.toString());

      return res.send(buffer);
    }
  } catch (error: any) {
    console.error('HLS Proxy Error:', error);
    return res.status(500).send(error.message || 'Internal Server Error');
  }
}
