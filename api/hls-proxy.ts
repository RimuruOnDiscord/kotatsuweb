import { HttpsProxyAgent } from 'https-proxy-agent';

export const config = {
  runtime: 'nodejs',
};

const PROXIES = [
  'http://pubfjqal:v1aqmmstduee@31.59.20.176:6754',
  'http://pubfjqal:v1aqmmstduee@198.23.239.134:6540',
  'http://pubfjqal:v1aqmmstduee@45.38.107.97:6014',
  'http://pubfjqal:v1aqmmstduee@107.172.163.27:6543',
  'http://pubfjqal:v1aqmmstduee@198.105.121.200:6462',
  'http://pubfjqal:v1aqmmstduee@216.10.27.159:6837',
  'http://pubfjqal:v1aqmmstduee@142.111.67.146:5611',
  'http://pubfjqal:v1aqmmstduee@191.96.254.138:6185',
  'http://pubfjqal:v1aqmmstduee@31.58.9.4:6077',
  'http://pubfjqal:v1aqmmstduee@104.239.107.47:5699',
];

export default async function handler(req: any, res: any) {
  try {
    const targetUrl = req.query.url as string;
    const referer = (req.query.referer as string) || 'https://kwik.cx/';

    if (!targetUrl) return res.status(400).send('Missing url parameter');

    const randomProxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
    const agent = new HttpsProxyAgent(randomProxy);

    const upstreamHeaders: Record<string, string> = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': new URL(referer).origin,
      'Referer': referer,
    };

    if (req.headers.range) upstreamHeaders['Range'] = req.headers.range;

    const upstream = await fetch(targetUrl, {
      headers: upstreamHeaders,
      // @ts-ignore
      agent,
    });

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
