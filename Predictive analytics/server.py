import http.server
import socketserver
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_ROOT, **kwargs)

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.path = "/Predictive analytics/index.html"
        elif not self.path.startswith("/Predictive analytics") and not self.path.startswith("/ad_images") and not self.path.startswith("/dataset"):
            # If requesting relative assets like styles.css or app.js directly
            target = os.path.join(BASE_DIR, self.path.lstrip("/"))
            if os.path.exists(target):
                self.path = "/Predictive analytics" + self.path
        return super().do_GET()

def start_server():
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"[START] Telecom ML Web Application server running at http://localhost:{PORT}")
        print(f"[INFO] Serving project from: {PROJECT_ROOT}")
        sys.stdout.flush()
        httpd.serve_forever()

if __name__ == "__main__":
    start_server()
