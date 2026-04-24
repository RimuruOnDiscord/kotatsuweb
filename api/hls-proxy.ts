import { HttpsProxyAgent } from 'https-proxy-agent';

export const config = {
  runtime: 'nodejs',
};

const PROXIFY_URL = 'https://authentic-miracle-production.up.railway.app';

async function getProxifiedUrl(targetUrl: string, referer: string): Promise<string> {
  try {
    const res = await fetch(`${PROXIFY_URL}/proxy?data=${encodeURIComponent(targetUrl + '|' + referer)}`);
    const data = await res.json();
    const sources = data?.proxifiedSource;
    // Try each provider in order of reliability
    return sources?.miruro || sources?.lunaranime || sources?.anikuro || sources?.animanga || targetUrl;
  } catch {
    return targetUrl;
  }
}

export default async function handler(req: any, res: any) {
  try {
    const targetUrl = req.query.url as string;
    const referer = (req.query.referer as string) || 'https://kwik.cx/';

    if (!targetUrl) return res.status(400).send('Missing url parameter');

    // Get proxified URL from Railway
    const proxifiedUrl = await getProxifiedUrl(targetUrl, referer);

    const upstreamHeaders: Record<string, string> = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': new URL(referer).origin,
      'Referer': referer,
    };

    if (req.headers.range) upstreamHeaders['Range'] = req.headers.range;

    const upstream = await fetch(proxifiedUrl, { headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send(`Stream error: ${upstream.status}`);
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isManifest = targetUrl.includes('.m3u8') || contentType.includes('mpegurl');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(204).end();

    if (isManifest) {
      const text = await upstream.text();
      const encodedReferer = encodeURIComponent(referer);

      const rewritten = text.split('\n').map(line => {
        const trimmed = line.trim();

        const tagLine = line.replace(/URI="([^"]+)"/g, (_, uri) => {
          const absolute = new URL(uri, targetUrl).toString();
          return `URI="/api/hls-proxy?url=${encodeURIComponent(absolute)}&referer=${encodedReferer}"`;
        });
        if (tagLine !== line) return tagLine;

        if (!trimmed || trimmed.startsWith('#')) return line;

        const absolute = new URL(trimmed, targetUrl).toString();
        return `/api/hls-proxy?url=${encodeURIComponent(absolute)}&referer=${encodedReferer}`;
      }).join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).send(rewritten);
    } else {
      res.setHeader('Content-Type', contentType || 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Accept-Ranges', 'bytes');
      if (upstream.headers.get('content-range')) res.setHeader('Content-Range', upstream.headers.get('content-range')!);
      if (upstream.headers.get('content-length')) res.setHeader('Content-Length', upstream.headers.get('content-length')!);

      const buffer = await upstream.arrayBuffer();
      return res.status(upstream.status).send(Buffer.from(buffer));
    }
  } catch (error: any) {
    return res.status(500).send(error.message || 'Internal Server Error');
  }
}
