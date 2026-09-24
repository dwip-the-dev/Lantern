import json
import os
import time
import uuid
import shutil
import threading
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

from .database import get_db, add_notification, add_activity
from .containers import is_docker_running, execute_runner

# In-memory store for tracking live installation logs and progress
# task_id -> { "status": "running" | "completed" | "error", "logs": [...], "app_id": str, "port": int, "error": str }
INSTALL_TASKS: Dict[str, Dict[str, Any]] = {}

# Rich CasaOS-grade App Catalog (40+ real self-hosted apps)
APP_CATALOG: List[Dict[str, Any]] = [
    # --- MEDIA & STREAMING ---
    {
        "id": "jellyfin",
        "slug": "jellyfin",
        "name": "Jellyfin",
        "category": "Media",
        "developer": "Jellyfin Project",
        "tagline": "The Free Software Media System",
        "description": "Stream movies, TV shows, and music to any device with hardware acceleration support and zero tracking.",
        "icon": "film",
        "icon_url": "/icons/jellyfin.svg",
        "image": "jellyfin/jellyfin:latest",
        "port": 8096,
        "container_port": 8096,
        "volumes": ["/media:/media", "/var/lib/lantern/apps/jellyfin/config:/config"],
        "env": {"JELLYFIN_PublishedServerUrl": "http://localhost:8096"},
        "featured": True,
        "badge": "Popular"
    },
    {
        "id": "plex",
        "slug": "plex",
        "name": "Plex",
        "category": "Media",
        "developer": "Plex, Inc.",
        "tagline": "Stream your media collection anywhere",
        "description": "Powerful media organizer and streaming server with automatic metadata matching, remote access, and mobile apps.",
        "icon": "popcorn",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/plex.svg",
        "image": "plexinc/pms-docker:latest",
        "port": 32400,
        "container_port": 32400,
        "volumes": ["/var/lib/lantern/apps/plex/config:/config", "/media:/data"],
        "env": {},
        "featured": True,
        "badge": "Popular"
    },
    {
        "id": "audiobookshelf",
        "slug": "audiobookshelf",
        "name": "Audiobookshelf",
        "category": "Media",
        "developer": "Advplyr",
        "tagline": "Self-hosted audiobook and podcast server",
        "description": "Open-source audiobook and podcast streaming server with mobile apps, progress sync, multi-user support, and sleep timers.",
        "icon": "headphones",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/audiobookshelf.svg",
        "image": "ghcr.io/advplyr/audiobookshelf:latest",
        "port": 13378,
        "container_port": 80,
        "volumes": ["/var/lib/lantern/apps/audiobookshelf/config:/config", "/media/audiobooks:/audiobooks"],
        "env": {},
        "featured": True,
        "badge": "Featured"
    },
    {
        "id": "navidrome",
        "slug": "navidrome",
        "name": "Navidrome",
        "category": "Media",
        "developer": "Deluan",
        "tagline": "Modern, lightweight music streaming server",
        "description": "Ultra-lightweight Subsonic-compatible music server and streamer. Plays any audio format and uses almost zero RAM.",
        "icon": "music",
        "icon_url": "/icons/navidrome.svg",
        "image": "deluan/navidrome:latest",
        "port": 4533,
        "container_port": 4533,
        "volumes": ["/media/music:/music", "/var/lib/lantern/apps/navidrome/data:/data"],
        "env": {"ND_SCANSCHEDULE": "1h", "ND_LOGLEVEL": "info"},
        "featured": False,
        "badge": "Audio"
    },
    {
        "id": "calibre-web",
        "slug": "calibre-web",
        "name": "Calibre-Web",
        "category": "Media",
        "developer": "Jan Bludau",
        "tagline": "Clean web interface for eBook library",
        "description": "Browse, read and download eBooks using a valid Calibre database with built-in in-browser reader and Kindle sync.",
        "icon": "book",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/calibre-web.svg",
        "image": "linuxserver/calibre-web:latest",
        "port": 8083,
        "container_port": 8083,
        "volumes": ["/var/lib/lantern/apps/calibre-web/config:/config", "/media/books:/books"],
        "env": {"DOCKER_MODS": "linuxserver/mods:universal-calibre"},
        "featured": False,
        "badge": "Books"
    },

    # --- CLOUD & FILES ---
    {
        "id": "nextcloud",
        "slug": "nextcloud",
        "name": "Nextcloud Hub",
        "category": "Cloud",
        "developer": "Nextcloud GmbH",
        "tagline": "Private cloud storage & collaboration",
        "description": "Self-hosted alternative to Google Drive / Dropbox. Includes file sync, office document editing, contacts, and calendar.",
        "icon": "cloud",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/nextcloud.svg",
        "image": "nextcloud:stable",
        "port": 8081,
        "container_port": 80,
        "volumes": ["/var/lib/lantern/apps/nextcloud/data:/var/www/html/data"],
        "env": {},
        "featured": True,
        "badge": "Essential"
    },
    {
        "id": "filebrowser",
        "slug": "filebrowser",
        "name": "FileBrowser",
        "category": "Cloud",
        "developer": "FileBrowser Team",
        "tagline": "Fast, web-based file manager",
        "description": "Lightweight, beautiful web file manager. Create users, browse directories, edit text files, upload and download files.",
        "icon": "folder",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/filebrowser.svg",
        "image": "filebrowser/filebrowser:latest",
        "port": 8082,
        "container_port": 80,
        "volumes": ["/srv:/srv", "/var/lib/lantern/apps/filebrowser/database.db:/database.db"],
        "env": {},
        "featured": True,
        "badge": "Lightweight"
    },
    {
        "id": "syncthing",
        "slug": "syncthing",
        "name": "Syncthing",
        "category": "Cloud",
        "developer": "Syncthing Foundation",
        "tagline": "Continuous decentralized peer-to-peer file sync",
        "description": "Sync files between computers, phones, and servers securely without passing through third-party servers.",
        "icon": "refresh-cw",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/syncthing.svg",
        "image": "syncthing/syncthing:latest",
        "port": 8384,
        "container_port": 8384,
        "volumes": ["/var/lib/lantern/apps/syncthing/data:/var/syncthing"],
        "env": {},
        "featured": False,
        "badge": "Sync"
    },

    # --- NETWORK & DNS ---
    {
        "id": "pihole",
        "slug": "pihole",
        "name": "Pi-hole",
        "category": "Network",
        "developer": "Pi-hole, LLC",
        "tagline": "Network-wide ad & tracker blocking",
        "description": "DNS sinkhole that protects your entire home Wi-Fi from ads, malicious domains, and telemetry trackers without client software.",
        "icon": "shield",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/pi-hole.svg",
        "image": "pihole/pihole:latest",
        "port": 8088,
        "container_port": 80,
        "volumes": ["/var/lib/lantern/apps/pihole/etc-pihole:/etc/pihole", "/var/lib/lantern/apps/pihole/etc-dnsmasq.d:/etc/dnsmasq.d"],
        "env": {"TZ": "UTC", "WEBPASSWORD": "admin"},
        "featured": True,
        "badge": "Network"
    },
    {
        "id": "adguard-home",
        "slug": "adguard-home",
        "name": "AdGuard Home",
        "category": "Network",
        "developer": "AdGuard",
        "tagline": "Ad and tracker blocking DNS server",
        "description": "Network-wide software for blocking ads, phishing, and tracking across all devices. Modern dashboard with parental controls.",
        "icon": "shield-check",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/adguard-home.svg",
        "image": "adguard/adguardhome:latest",
        "port": 3000,
        "container_port": 3000,
        "volumes": ["/var/lib/lantern/apps/adguard/work:/opt/adguardhome/work", "/var/lib/lantern/apps/adguard/conf:/opt/adguardhome/conf"],
        "env": {},
        "featured": True,
        "badge": "Security"
    },
    {
        "id": "nginx-proxy-manager",
        "slug": "nginx-proxy-manager",
        "name": "Nginx Proxy Manager",
        "category": "Network",
        "developer": "jc21",
        "tagline": "Expose your homelab services with free SSL",
        "description": "Expose your homelab web services easily and securely with automatic Let's Encrypt SSL certificates and access lists.",
        "icon": "globe",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/nginx-proxy-manager.svg",
        "image": "jc21/nginx-proxy-manager:latest",
        "port": 81,
        "container_port": 81,
        "volumes": ["/var/lib/lantern/apps/npm/data:/data", "/var/lib/lantern/apps/npm/letsencrypt:/etc/letsencrypt"],
        "env": {},
        "featured": False,
        "badge": "Proxy"
    },

    # --- SECURITY & PRIVACY ---
    {
        "id": "vaultwarden",
        "slug": "vaultwarden",
        "name": "Vaultwarden",
        "category": "Security",
        "developer": "Dani García",
        "tagline": "Self-hosted Bitwarden password vault",
        "description": "Lightweight, ultra-fast Bitwarden-compatible password manager written in Rust. Compatible with official Bitwarden apps.",
        "icon": "lock",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/vaultwarden.svg",
        "image": "vaultwarden/server:latest",
        "port": 8089,
        "container_port": 80,
        "volumes": ["/var/lib/lantern/apps/vaultwarden/data:/data"],
        "env": {"SIGNUPS_ALLOWED": "true"},
        "featured": True,
        "badge": "Privacy"
    },
    {
        "id": "wireguard",
        "slug": "wireguard",
        "name": "WireGuard Easy",
        "category": "Security",
        "developer": "wg-easy",
        "tagline": "Simple WireGuard VPN with Web UI",
        "description": "Fast and modern VPN with automatic QR code generation for connecting phones and laptops to your home network remotely.",
        "icon": "lock",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/wireguard.svg",
        "image": "ghcr.io/wg-easy/wg-easy:latest",
        "port": 51821,
        "container_port": 51821,
        "volumes": ["/var/lib/lantern/apps/wgeasy:/etc/wireguard"],
        "env": {"PASSWORD": "admin"},
        "featured": False,
        "badge": "VPN"
    },

    # --- DOWNLOADERS ---
    {
        "id": "qbittorrent",
        "slug": "qbittorrent",
        "name": "qBittorrent",
        "category": "Downloaders",
        "developer": "qBittorrent Team",
        "tagline": "Fast, feature-rich BitTorrent client",
        "description": "High performance torrent client with clean web interface, RSS automation, search engine plugins, and bandwidth scheduling.",
        "icon": "zap",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/qbittorrent.svg",
        "image": "linuxserver/qbittorrent:latest",
        "port": 8085,
        "container_port": 8080,
        "volumes": ["/var/lib/lantern/apps/qbittorrent/config:/config", "/downloads:/downloads"],
        "env": {"WEBUI_PORT": "8080"},
        "featured": True,
        "badge": "Fast"
    },
    {
        "id": "transmission",
        "slug": "transmission",
        "name": "Transmission",
        "category": "Downloaders",
        "developer": "Transmission Project",
        "tagline": "Lightweight BitTorrent client",
        "description": "Fast, easy, and extremely low resource torrent client with a minimalist WebUI and RPC API.",
        "icon": "download",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/transmission.svg",
        "image": "linuxserver/transmission:latest",
        "port": 9091,
        "container_port": 9091,
        "volumes": ["/var/lib/lantern/apps/transmission/config:/config", "/downloads:/downloads"],
        "env": {"USER": "admin", "PASS": "admin123"},
        "featured": False,
        "badge": "Light"
    },

    # --- SMART HOME & IOT ---
    {
        "id": "home-assistant",
        "slug": "home-assistant",
        "name": "Home Assistant",
        "category": "Smart Home",
        "developer": "Nabu Casa",
        "tagline": "Open source home automation hub",
        "description": "Control lights, switches, thermostats, cameras, and automations locally without reliance on cloud ecosystems.",
        "icon": "home",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/home-assistant.svg",
        "image": "ghcr.io/home-assistant/home-assistant:stable",
        "port": 8123,
        "container_port": 8123,
        "volumes": ["/var/lib/lantern/apps/homeassistant:/config"],
        "env": {},
        "featured": True,
        "badge": "IoT"
    },
    {
        "id": "node-red",
        "slug": "node-red",
        "name": "Node-RED",
        "category": "Smart Home",
        "developer": "OpenJS Foundation",
        "tagline": "Low-code visual flow-based automation",
        "description": "Visual programming tool for wiring together hardware devices, APIs, and online services in the browser.",
        "icon": "activity",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/node-red.svg",
        "image": "nodered/node-red:latest",
        "port": 1880,
        "container_port": 1880,
        "volumes": ["/var/lib/lantern/apps/nodered/data:/data"],
        "env": {},
        "featured": False,
        "badge": "Automation"
    },

    # --- MONITORING & UTILITIES ---
    {
        "id": "uptime-kuma",
        "slug": "uptime-kuma",
        "name": "Uptime Kuma",
        "category": "Utilities",
        "developer": "Louis Lam",
        "tagline": "Fancy self-hosted monitoring tool",
        "description": "Monitor uptime of HTTP, TCP, Ping, DNS, and Docker containers with beautiful public status pages and push notifications.",
        "icon": "gauge",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/uptime-kuma.svg",
        "image": "louislam/uptime-kuma:1",
        "port": 3001,
        "container_port": 3001,
        "volumes": ["/var/lib/lantern/apps/uptime-kuma:/app/data"],
        "env": {},
        "featured": True,
        "badge": "Recommended"
    },
    {
        "id": "portainer",
        "slug": "portainer",
        "name": "Portainer CE",
        "category": "Utilities",
        "developer": "Portainer.io",
        "tagline": "Powerful Docker & Container Manager",
        "description": "Visual container management platform. Deploy, configure, inspect, and troubleshoot Docker containers, images, networks, and volumes.",
        "icon": "layers",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/portainer.svg",
        "image": "portainer/portainer-ce:latest",
        "port": 9000,
        "container_port": 9000,
        "volumes": ["/var/run/docker.sock:/var/run/docker.sock", "/var/lib/lantern/apps/portainer/data:/data"],
        "env": {},
        "featured": True,
        "badge": "DevOps"
    },
    {
        "id": "stirling-pdf",
        "slug": "stirling-pdf",
        "name": "Stirling PDF",
        "category": "Utilities",
        "developer": "Stirling-Tools",
        "tagline": "Complete local web-based PDF suite",
        "description": "Merge, split, compress, convert, OCR, sign, encrypt, and edit PDF files completely offline on your home server.",
        "icon": "file-text",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/stirling-pdf.svg",
        "image": "frooodle/s-pdf:latest",
        "port": 8087,
        "container_port": 8080,
        "volumes": ["/var/lib/lantern/apps/stirling-pdf/trainingData:/usr/share/tessdata"],
        "env": {},
        "featured": True,
        "badge": "Productivity"
    },
    {
        "id": "it-tools",
        "slug": "it-tools",
        "name": "IT-Tools",
        "category": "Utilities",
        "developer": "Corentin Thomasset",
        "tagline": "Useful online tools for developers",
        "description": "Collection of handy online tools for developers and geeks: token generators, hash checkers, regex testers, converters, and QR generators.",
        "icon": "tool",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/it-tools.svg",
        "image": "corentinth/it-tools:latest",
        "port": 8084,
        "container_port": 80,
        "volumes": [],
        "env": {},
        "featured": False,
        "badge": "DevTools"
    },
    {
        "id": "speedtest-tracker",
        "slug": "speedtest-tracker",
        "name": "Speedtest Tracker",
        "category": "Utilities",
        "developer": "Alexander Wagner",
        "tagline": "Automated internet speed test history",
        "description": "Self-hosted internet performance tracker. Runs speed tests on a schedule and graphs ping, jitter, download, and upload speeds over time.",
        "icon": "activity",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/speedtest-tracker.svg",
        "image": "alexjustesen/speedtest-tracker:latest",
        "port": 8086,
        "container_port": 80,
        "volumes": ["/var/lib/lantern/apps/speedtest/config:/config"],
        "env": {},
        "featured": False,
        "badge": "Network"
    },

    # --- PHOTOS & DOCUMENTS ---
    {
        "id": "immich",
        "slug": "immich",
        "name": "Immich",
        "category": "Photos",
        "developer": "Immich Team",
        "tagline": "High-performance self-hosted photo & video backup",
        "description": "Direct replacement for Google Photos / Apple iCloud. Machine learning facial recognition, object search, timeline, and mobile auto-backup.",
        "icon": "camera",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/immich.svg",
        "image": "ghcr.io/immich-app/immich-server:release",
        "port": 2283,
        "container_port": 2283,
        "volumes": ["/media/photos:/usr/src/app/upload"],
        "env": {},
        "featured": True,
        "badge": "Photos"
    },
    {
        "id": "paperless-ngx",
        "slug": "paperless-ngx",
        "name": "Paperless-ngx",
        "category": "Photos",
        "developer": "Paperless-ngx",
        "tagline": "OCR document archive and indexing system",
        "description": "Scan and archive bills, receipts, and documents. Uses automated OCR, tag matching, and full-text search to go completely paperless.",
        "icon": "file-text",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/paperless-ngx.svg",
        "image": "ghcr.io/paperless-ngx/paperless-ngx:latest",
        "port": 8000,
        "container_port": 8000,
        "volumes": ["/var/lib/lantern/apps/paperless/data:/usr/src/paperless/data"],
        "env": {"PAPERLESS_TIME_ZONE": "UTC"},
        "featured": False,
        "badge": "Documents"
    },

    # --- GAMING ---
    {
        "id": "minecraft",
        "slug": "minecraft",
        "name": "Minecraft Paper Server",
        "category": "Gaming",
        "developer": "itzg",
        "tagline": "High performance Minecraft Java server",
        "description": "Ready-to-play Minecraft multiplayer server running optimized PaperMC. Automatic updates, customizable worlds, and plugin support.",
        "icon": "gamepad-2",
        "icon_url": "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/minecraft.svg",
        "image": "itzg/minecraft-server:latest",
        "port": 25565,
        "container_port": 25565,
        "volumes": ["/var/lib/lantern/apps/minecraft/data:/data"],
        "env": {"EULA": "TRUE", "TYPE": "PAPER", "MEMORY": "2G"},
        "featured": True,
        "badge": "Multiplayer"
    }
]

def get_catalog() -> List[Dict[str, Any]]:
    # Merge installed status
    installed = {a["slug"]: a for a in get_installed_apps()}
    catalog_copy = []
    for item in APP_CATALOG:
        is_inst = item["slug"] in installed
        catalog_copy.append({
            **item,
            "is_installed": is_inst,
            "installed_id": installed[item["slug"]]["id"] if is_inst else None,
            "active_port": installed[item["slug"]]["port"] if is_inst else item["port"],
            "status": installed[item["slug"]]["status"] if is_inst else "not_installed"
        })
    return catalog_copy

def get_installed_apps() -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM installed_apps ORDER BY installed_at DESC").fetchall()
        apps = []
        for r in rows:
            d = dict(r)
            d["volumes"] = json.loads(d["volumes"]) if d["volumes"] else []
            d["env"] = json.loads(d["env"]) if d["env"] else {}
            if is_docker_running() and d.get("slug"):
                try:
                    res = subprocess.run(
                        ["docker", "inspect", "--format", "{{.State.Status}}", d["slug"]],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.DEVNULL,
                        text=True,
                        timeout=1.5
                    )
                    if res.returncode == 0:
                        d["status"] = res.stdout.strip() or "running"
                    else:
                        d["status"] = "stopped"
                except Exception:
                    pass
            if d.get("status") != "running" and d.get("port"):
                try:
                    import socket
                    with socket.create_connection(("127.0.0.1", int(d["port"])), timeout=0.15):
                        d["status"] = "running"
                except Exception:
                    pass
            apps.append(d)
        return apps

def execute_docker_install(task_id: str, manifest: Dict[str, Any], port: int):
    task = INSTALL_TASKS[task_id]
    image = manifest["image"]
    slug = manifest["slug"]
    app_name = manifest["name"]

    task["logs"].append(f"[{time.strftime('%X')}] [INFO] Starting deployment of {app_name}...")
    task["logs"].append(f"[{time.strftime('%X')}] [CONFIG] Target image: {image}")
    task["logs"].append(f"[{time.strftime('%X')}] [CONFIG] Assigned host port: {port}")

    if not is_docker_running():
        # Fallback to native runner
        task["logs"].append(f"[{time.strftime('%X')}] [INFO] Launching via Lantern Native Process Runner...")
        ok = execute_runner("start", slug, port)
        if ok:
            _register_app_in_db(slug, manifest, port, f"native-{slug}")
            task["status"] = "completed"
            task["logs"].append(f"[{time.strftime('%X')}] [OK] Native service {app_name} is active and listening on port {port}!")
            add_activity("package", "emerald", f"Installed {app_name} on port {port}", "Just now")
            add_notification("app_install", f"{app_name} Installed", f"Listening on port {port}", "success")
        else:
            task["status"] = "error"
            task["error"] = "Failed to launch native service runner"
            task["logs"].append(f"[{time.strftime('%X')}] [ERROR] Failed to start service process.")
        return

    # 1. Pull Docker Image with live log streaming
    task["logs"].append(f"[{time.strftime('%X')}] [1/3] Downloading container image from registry...")
    try:
        pull_proc = subprocess.Popen(
            ["docker", "pull", image],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        for line in iter(pull_proc.stdout.readline, ''):
            clean_line = line.strip()
            if clean_line:
                task["logs"].append(f"  {clean_line}")

        pull_proc.wait()
        if pull_proc.returncode != 0:
            task["status"] = "error"
            task["error"] = f"Docker pull failed with exit code {pull_proc.returncode}"
            task["logs"].append(f"[{time.strftime('%X')}] [ERROR] Docker image download failed.")
            return

        task["logs"].append(f"[{time.strftime('%X')}] [OK] Image successfully downloaded!")

        # 2. Prepare volume mounts on host
        task["logs"].append(f"[{time.strftime('%X')}] [2/3] Initializing persistent volume storage...")
        vol_args = []
        for vol in manifest.get("volumes", []):
            if ":" in vol:
                host_path, container_path = vol.split(":", 1)
                Path(host_path).mkdir(parents=True, exist_ok=True)
                vol_args.extend(["-v", f"{host_path}:{container_path}"])

        # 3. Clean up any existing container with same name
        subprocess.run(["docker", "rm", "-f", slug], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 4. Construct and execute docker run
        task["logs"].append(f"[{time.strftime('%X')}] [3/3] Launching Docker container on port {port}...")
        container_port = manifest.get("container_port", port)
        cmd = [
            "docker", "run", "-d",
            "--name", slug,
            "-p", f"{port}:{container_port}",
            "--restart", "no"
        ]
        cmd.extend(vol_args)

        for env_k, env_v in manifest.get("env", {}).items():
            cmd.extend(["-e", f"{env_k}={env_v}"])

        cmd.append(image)

        run_res = subprocess.run(cmd, capture_output=True, text=True)
        if run_res.returncode != 0:
            task["status"] = "error"
            task["error"] = run_res.stderr.strip()
            task["logs"].append(f"[{time.strftime('%X')}] [ERROR] Container launch failed: {run_res.stderr.strip()}")
            return

        container_id = run_res.stdout.strip()[:12]
        task["logs"].append(f"[{time.strftime('%X')}] [OK] Container started with ID {container_id}!")
        task["logs"].append(f"[{time.strftime('%X')}] [SUCCESS] {app_name} is live at http://localhost:{port}")
        
        # Register in database
        _register_app_in_db(slug, manifest, port, container_id)
        task["status"] = "completed"
        add_activity("package", "emerald", f"Installed {app_name} on port {port}", "Just now")
        add_notification("app_install", f"{app_name} Installed", f"Now running on port {port}", "success")

    except Exception as e:
        task["status"] = "error"
        task["error"] = str(e)
        task["logs"].append(f"[{time.strftime('%X')}] [ERROR] Unexpected exception: {e}")

def _register_app_in_db(slug: str, manifest: Dict[str, Any], port: int, container_id: str):
    app_id = f"app-{slug}"
    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO installed_apps 
            (id, name, slug, icon, category, image, port, container_id, status, volumes, env, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (
            app_id,
            manifest["name"],
            slug,
            manifest.get("icon", "package"),
            manifest.get("category", "General"),
            manifest["image"],
            port,
            container_id,
            "running",
            json.dumps(manifest.get("volumes", [])),
            json.dumps(manifest.get("env", {}))
        ))
        conn.commit()

def start_install_task(
    slug: str,
    custom_port: Optional[int] = None,
    custom_name: Optional[str] = None,
    custom_image: Optional[str] = None,
    custom_category: Optional[str] = "Custom",
    custom_env: Optional[Dict[str, str]] = None,
    custom_volumes: Optional[List[str]] = None
) -> str:
    # Find in catalog or build custom manifest
    manifest = next((a for a in APP_CATALOG if a["slug"] == slug), None)
    if not manifest:
        if not custom_image:
            raise ValueError(f"App '{slug}' not found in catalog and no custom image provided.")
        manifest = {
            "id": slug,
            "slug": slug,
            "name": custom_name or slug.capitalize(),
            "category": custom_category or "Custom",
            "image": custom_image,
            "port": custom_port or 8080,
            "container_port": custom_port or 8080,
            "volumes": custom_volumes or [],
            "env": custom_env or {},
            "icon": "package"
        }

    port = custom_port or manifest.get("port", 8080)
    task_id = f"task-{uuid.uuid4().hex[:8]}"

    INSTALL_TASKS[task_id] = {
        "task_id": task_id,
        "status": "running",
        "logs": [],
        "app_id": f"app-{slug}",
        "slug": slug,
        "port": port,
        "error": None
    }

    # Start installation in background thread
    t = threading.Thread(target=execute_docker_install, args=(task_id, manifest, port), daemon=True)
    t.start()

    return task_id

def get_install_task_status(task_id: str) -> Optional[Dict[str, Any]]:
    return INSTALL_TASKS.get(task_id)

def uninstall_app(slug: str) -> bool:
    if is_docker_running():
        try:
            subprocess.run(["docker", "rm", "-f", slug], capture_output=True, timeout=10)
        except Exception:
            pass

    with get_db() as conn:
        conn.execute("DELETE FROM installed_apps WHERE slug = ?", (slug,))
        conn.commit()

    add_activity("trash", "amber", f"Uninstalled application {slug}", "Just now")
    return True
