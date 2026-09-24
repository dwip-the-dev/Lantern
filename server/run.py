import os
import sys
import argparse
import uvicorn

def main():
    parser = argparse.ArgumentParser(description="Lantern Home Server Daemon")
    parser.add_argument("--host", default=os.environ.get("LANTERN_HOST", "0.0.0.0"), help="Host IP to bind (default: 0.0.0.0 for LAN access)")
    parser.add_argument("--port", type=int, default=int(os.environ.get("LANTERN_PORT", 8080)), help="Port to listen on (default: 8080)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    args = parser.parse_args()

    print(f"🏮 Igniting Lantern on http://{args.host}:{args.port}")
    uvicorn.run("app.main:app", host=args.host, port=args.port, reload=args.reload)

if __name__ == "__main__":
    main()
