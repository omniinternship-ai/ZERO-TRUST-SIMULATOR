"""Local-only, fixed-origin BlockTown server. No account or gameplay data is stored here."""
import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

class GameHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        route = unquote(urlsplit(self.path).path)
        aliases = {"/": "/BlockTown/menu.html", "/menu.html": "/BlockTown/menu.html", "/game.html": "/BlockTown/game.html", "/index.html": "/ZERO-TRUST-SIMULATOR-with-statistics/index.html"}
        if route in aliases:
            self.send_response(302)
            self.send_header("Location", aliases[route])
            self.end_headers()
            return
        resolved = Path(self.translate_path(self.path)).resolve()
        root = Path(self.directory).resolve()
        allowed = any(resolved.is_relative_to(root / folder) for folder in ("BlockTown", "ZERO-TRUST-SIMULATOR-with-statistics", "ZERO TRUST SIMULATOR", "ZERO TRUST SIMULATOR.V0.0.3"))
        if route != "/__blocktown_health" and (not allowed or any(part.startswith(".") for part in resolved.relative_to(root).parts) or resolved.suffix.lower() not in (".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".woff", ".woff2", ".mp3", ".wav", ".ogg", ".ico")):
            self.send_error(404)
            return
        if route == "/__blocktown_health":
            body = json.dumps({"app": "blocktown", "root": str(Path(self.directory).resolve())}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--directory", required=True)
    parser.add_argument("--port", type=int, default=8766)
    args = parser.parse_args()
    root = Path(args.directory).resolve()
    for relative in ("BlockTown/menu.html", "BlockTown/game.html", "BlockTown/js/world3d.js", "BlockTown/js/avatar.js", "BlockTown/js/vendor/three.min.js"):
        if not (root / relative).is_file():
            parser.error("Missing game file: " + relative)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), partial(GameHandler, directory=str(root)))
    print("BlockTown ready: http://127.0.0.1:" + str(args.port) + "/BlockTown/menu.html", flush=True)
    server.serve_forever()
