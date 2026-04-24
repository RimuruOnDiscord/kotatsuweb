export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');
    const referer = url.searchParams.get('referer') || 'https://kwik.cx/';

    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': new URL(referer).origin,
      'Referer': referer,
    };

    const range = req.headers.get('range');
    if (range) upstreamHeaders['Range'] = range;

    const upstream = await fetch(targetUrl, {
      headers: upstreamHeaders,
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`Stream error: ${upstream.status}`, { status: upstream.status });
    }

    const contentType = upstream.headers.get('content-type') || '';
    const isManifest = targetUrl.includes('.m3u8') || contentType.includes('mpegurl');

    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set('Cache-Control', isManifest ? 'no-cache' : 'public, max-age=3600');

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: responseHeaders });
    }

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

      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      return new Response(rewritten, { status: 200, headers: responseHeaders });
    } else {
      responseHeaders.set('Content-Type', contentType || 'video/mp2t');
      if (upstream.headers.get('content-range')) responseHeaders.set('Content-Range', upstream.headers.get('content-range')!);
      if (upstream.headers.get('content-length')) responseHeaders.set('Content-Length', upstream.headers.get('content-length')!);
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    }
  } catch (error: any) {
    return new Response(error.message || 'Internal Server Error', { status: 500 });
  }
}
