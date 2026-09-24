# 🏮 Lantern — The Enlightened Home Cloud & Media OS

<div align="center">

```
  ██╗      █████╗ ███╗   ██╗████████╗███████╗██████╗ ███╗   ██╗
  ██║     ██╔══██╗████╗  ██║╚══██╔══╝██╔════╝██╔══██╗████╗  ██║
  ██║     ███████║██╔██╗ ██║   ██║   █████╗  ██████╔╝██╔██╗ ██║
  ██║     ██╔══██║██║╚██╗██║   ██║   ██╔══╝  ██╔══██╗██║╚██╗██║
  ███████╗██║  ██║██║ ╚████║   ██║   ███████╗██║  ██║██║ ╚████║
  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝
```

### *A modern, VisionOS-inspired private cloud, cinema hub, and self-hosted operating platform.*

[![Release](https://img.shields.io/badge/Release-v1.0.0-amber.svg?style=for-the-badge&logo=rocket)](https://github.com/dwip-the-dev/Lantern/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blueviolet.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20Tailwind-38bdf8.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Backend-Python%20%7C%20FastAPI%20%7C%20Uvicorn-10b981.svg?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Containers](https://img.shields.io/badge/Containers-Docker%20%7C%20Compose-2563eb.svg?style=for-the-badge&logo=docker)](https://www.docker.com/)

[**Features**](#-key-features) • [**Quickstart**](#-quickstart) • [**Architecture**](#-architecture) • [**CLI Commands**](#-cli-reference) • [**Storage**](#-media-storage-structure)

</div>

---

## 🌟 Key Features

### 🪟 Fluid VisionOS & Apple Glassmorphic Aesthetics
- **Multi-layer Glassmorphism**: Tailored HSL color gradients, dynamic backdrop filters (`backdrop-blur-3xl`), specular edge highlights, and fluid hover physics.
- **Dark-First Modern Theme**: Crafted for OLED and high-resolution displays with curated typography, zero visual clutter, and accessible contrast.
- **Cross-Platform Responsive**: Flawless experience across desktop browsers, mobile touch devices, tablets, and smart TV home setups.

### 🎥 Hardware Video & Audio Probing Engine
- **Real Stream Telemetry**: Probes exact video and audio stream parameters directly from storage using `ffprobe` (Resolution, FPS, Channels, Sample Rate, Codecs).
- **Sub-Millisecond 2-Tier Caching**: Media metadata is cached on disk (`~/.lantern/video_meta_cache.json`) and in memory for instantaneous rendering across massive libraries.

### 🎵 Self-Hosted Hi-Fi Music (Navidrome)
- **Drop-and-Play Storage**: Drop any audio file (`.mp3`, `.wav`, `.flac`, `.m4a`, `.ogg`) into `~/Music`. Navidrome indexes albums, artists, tracks, and embedded covers on the fly.
- **Universal Streaming**: Built-in web player with queue management, lyrics support, and Subsonic API compatibility with mobile apps like **Feishin**, **Symfonium**, **Substreamer**, and **Tempo**.

### 🎬 Self-Hosted Cinema Hub (Jellyfin)
- **Full Media Server**: Powered by Jellyfin 12.1.0 with seamless library mapping for personal videos and downloads.
- **Hardware Transcoding**: Supports Intel QuickSync, VA-API, and NVIDIA NVENC hardware acceleration.

### 🛡️ Strict Zero-Boot-Autostart Guarantee
- **No Background Resource Leaks**: All Docker containers (Jellyfin, Navidrome, etc.) run with `--restart no`.
- **Zero Systemd Traps**: Absolutely zero background services start on boot without explicit user instruction. You maintain 100% control over system startup.

### 📦 CasaOS-Grade App Catalog
- **1-Click Container Deployment**: Pre-configured manifests for 40+ popular self-hosted services (Jellyfin, Navidrome, Transmission, Plex, Audiobookshelf, Calibre-Web, Nextcloud, Home Assistant, etc.).
- **Container Lifecycle Controls**: Start, stop, restart, delete, and stream live Docker logs directly from the web dashboard.

### 🌐 Instant Internet Exposure (Cloudflare & Caddy)
- **1-Click Tunnels**: Expose local ports or containers to the internet with automated Cloudflare Tunnels or Caddy reverse proxies with automated SSL certificates.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Lantern Client (React 19)                       │
│     VisionOS Glassmorphism · Spotlight ⌘K · Cinema · Apps · Files      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ REST APIs & WebSockets (Port 8080)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Lantern Server (FastAPI / Python)                 │
│  Hardware Telemetry · Video Prober · App Store Engine · Auth & RBAC   │
└────────┬───────────────────┬───────────────────┬───────────────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌────────────────────────────────┐
│  Docker Engine  │ │  ffprobe Audio/ │ │   Host Storage Direct Mount    │
│  (--restart no) │ │  Video Prober   │ │   ~/Videos   ~/Downloads       │
│  Container Apps │ │  2-Tier Cache   │ │   ~/Music    ~/.lantern        │
└────────┬────────┘ └─────────────────┘ └────────────────────────────────┘
         │
         ├───► Port 8096: Jellyfin Media Server (Movies, TV Shows, Home Videos)
         ├───► Port 4533: Navidrome Music Server (MP3, WAV, FLAC, Subsonic API)
         └───► Port 9091: Transmission BitTorrent Client
```

---

## 🚀 Quickstart

### Prerequisites
- **Linux** (Tested on CachyOS, Arch, Ubuntu 22.04+, Debian 12+, Fedora)
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Docker** (Optional, recommended for app containers)
- **ffmpeg / ffprobe** (For real hardware video inspection)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/dwip-the-dev/Lantern.git
cd Lantern

# 2. Run the automated installer
chmod +x install.sh
./install.sh
```

### Manual Setup

```bash
# 1. Install CLI and client dependencies
npm install
npm --prefix client install
npm --prefix client run build

# 2. Setup Python backend virtual environment
python3 -m venv server/venv
server/venv/bin/pip install -r server/requirements.txt

# 3. Launch Lantern
server/venv/bin/python3 server/run.py --host 0.0.0.0 --port 8080
```

Open **`http://localhost:8080`** (or `http://<your-lan-ip>:8080`) in any browser!

---

## ⌨️ CLI Reference

Lantern includes a first-class companion CLI:

```bash
# Start Lantern daemon
lantern start

# Check real-time status and telemetry
lantern status

# View live server logs
lantern logs -f

# Manage installed apps
lantern apps list
lantern apps install jellyfin
lantern apps install navidrome

# Stop or restart Lantern
lantern restart
lantern stop
```

---

## 📂 Media Storage Structure

Lantern automatically links your home directories:

| Directory | Purpose | Service Mapped |
| :--- | :--- | :--- |
| **`~/Videos`** | Personal videos, screencasts, home clips | Jellyfin (`/media/videos`) |
| **`~/Downloads`** | Downloaded media, movies, series | Jellyfin (`/media/downloads`) |
| **`~/Music`** | Audio tracks (`.mp3`, `.wav`, `.flac`) | Navidrome (`/music`) |
| **`~/.lantern`** | Database, persistent configs, and app caches | Lantern Internal |

---

## 📜 License

Lantern is open-source software licensed under the **[MIT License](LICENSE)**.

---

<div align="center">

Crafted with ❤️ by **[Dwip (dwip-the-dev)](https://github.com/dwip-the-dev)** and the Lantern Community.

*Enlighten your home server.*

</div>
