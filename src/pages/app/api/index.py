from flask import Flask, request, Response
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

OFFICIAL_REFERER = "https://miruro.to/"

@app.route('/api/proxy-m3u8') # Vercel routes usually start with /api
def proxy_m3u8():
    video_url = request.args.get('url')
    headers = {
        "Referer": OFFICIAL_REFERER,
        "User-Agent": "Mozilla/5.0..."
    }
    
    # We use stream=True to try and pipe the data
    response = requests.get(video_url, headers=headers, stream=True)
    
    return Response(
        response.iter_content(chunk_size=1024),
        content_type=response.headers.get('Content-Type'),
        status=response.status_code
    )