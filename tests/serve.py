"""Local static preview with the production response policy; no external services."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1] / 'site'
HEADERS = []
for line in (ROOT / '_headers').read_text().splitlines()[1:]:
    if line and not line.startswith(' '):
        break
    if ':' in line:
        name, value = line.strip().split(':', 1)
        HEADERS.append((name, value.strip()))

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        for name, value in HEADERS:
            self.send_header(name, value)
        super().end_headers()

    def log_message(self, format, *args):
        pass

port = int(os.environ.get('CASE_PREVIEW_PORT', '8765'))
print(f'Case-file preview: http://127.0.0.1:{port}', flush=True)
ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(ROOT))).serve_forever()
