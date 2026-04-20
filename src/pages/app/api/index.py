from flask import Flask, request, Response
from flask_cors import CORS
import requests
import urllib.parse

app = Flask(__name__)
CORS(app)

OFFICIAL_REFERER = "https://kwik.cx/" # Make sure this matches the provider!

@app.route('/api/proxy-m3u8') # Make sure your frontend calls this exact route
def proxy_m3u8():
    video_url = request.args.get('url')
    
    headers = {
        "Referer": OFFICIAL_REFERER,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    # We fetch the target URL
    response = requests.get(video_url, headers=headers, stream=True)
    
    # Check if the file is an M3U8 Playlist
    is_m3u8 = ".m3u8" in video_url or "mpegurl" in response.headers.get('Content-Type', '').lower()
    
    if is_m3u8:
        # 1. Read the raw M3U8 text
        text = response.text
        lines = text.split('\n')
        rewritten_lines = []
        
        # 2. Loop through and intercept the relative chunk paths
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#'):
                # This is a relative URL (e.g., '360/index.m3u8' or 'seg-1.ts')
                # Convert it to the true absolute URL of the video server
                absolute_url = urllib.parse.urljoin(video_url, line)
                
                # Wrap it back into our proxy!
                # (Ensure the route matches your frontend proxy setup, e.g., /hls-proxy or /api/proxy-m3u8)
                proxy_wrapped_url = f"/hls-proxy?url={urllib.parse.quote(absolute_url)}"
                rewritten_lines.append(proxy_wrapped_url)
            else:
                # Keep #EXTINF metadata tags untouched
                rewritten_lines.append(line)
                
        # 3. Send the modified playlist back to Vidstack
        return Response(
            "\n".join(rewritten_lines), 
            content_type=response.headers.get('Content-Type', 'application/vnd.apple.mpegurl'), 
            status=response.status_code
        )
    else:
        # If it's a .ts chunk or .key file, stream the raw bytes normally
        return Response(
            response.iter_content(chunk_size=8192),
            content_type=response.headers.get('Content-Type'),
            status=response.status_code
        )