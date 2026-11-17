"""Serve this package on localhost and open the game in the default browser."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
url = f'http://127.0.0.1:{server.server_port}/index.html'
print(f'Stem Flow: {url}\nPress Ctrl+C to stop.', flush=True)
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
