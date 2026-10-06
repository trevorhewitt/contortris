#!/usr/bin/env python3
"""
Local Extris server: serves the game and the block designer, and lets the designer
save straight into your files (no downloads).

    python3 serve.py            # then open http://localhost:8000/block_designer.html
    python3 serve.py 8080       # another port

Only the data files the designer edits can be written (shapes/main_shapes.js and
shapes/achievements.js). Before every save, the old version is copied to
shapes/.backups/ (the newest 30 per file are kept). It only listens on this computer
(127.0.0.1), so nobody else on your network can reach it.
"""
import json
import os
import shutil
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
WRITABLE = {"shapes/main_shapes.js", "shapes/achievements.js"}
BACKUP_DIR = os.path.join(ROOT, "shapes", ".backups")
KEEP_BACKUPS = 30
MAX_BYTES = 50 * 1024 * 1024


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # always serve fresh files while editing
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json(self, code, data):
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split("?")[0] == "/api/ping":
            return self._json(200, {"ok": True, "writable": sorted(WRITABLE)})
        return super().do_GET()

    def do_POST(self):
        if self.path.split("?")[0] != "/api/save":
            return self._json(404, {"ok": False, "error": "unknown endpoint"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BYTES:
                return self._json(400, {"ok": False, "error": "bad size"})
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            rel = str(data.get("path", "")).lstrip("./").replace("\\", "/")
            text = data.get("text")
            if rel not in WRITABLE or not isinstance(text, str):
                return self._json(403, {"ok": False, "error": f"not allowed to write {rel!r}"})
            target = os.path.join(ROOT, rel)
            # back up the current version first
            if os.path.exists(target):
                os.makedirs(BACKUP_DIR, exist_ok=True)
                stamp = time.strftime("%Y%m%d-%H%M%S")
                base = os.path.basename(rel)
                shutil.copy2(target, os.path.join(BACKUP_DIR, f"{base}.{stamp}.bak"))
                olds = sorted(f for f in os.listdir(BACKUP_DIR) if f.startswith(base + "."))
                for f in olds[:-KEEP_BACKUPS]:
                    os.remove(os.path.join(BACKUP_DIR, f))
            # write atomically (a crash mid-save never leaves half a file)
            tmp = target + ".tmp"
            with open(tmp, "w", encoding="utf-8", newline="") as fh:
                fh.write(text)
            os.replace(tmp, target)
            self.log_message("saved %s (%d bytes)", rel, len(text))
            return self._json(200, {"ok": True, "path": rel, "bytes": len(text)})
        except Exception as e:  # noqa: BLE001
            return self._json(500, {"ok": False, "error": str(e)})


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Extris on http://localhost:{port}/  (designer: http://localhost:{port}/block_designer.html)")
    print("Saves from the designer go straight into shapes/*.js (backups in shapes/.backups/). Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
