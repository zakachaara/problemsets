import webbrowser
import http.server
import socketserver

PORT = 5500
URL = f"http://localhost:{PORT}"

webbrowser.open(URL)

Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"🚀 Frontend running at: {URL}")
    httpd.serve_forever()
