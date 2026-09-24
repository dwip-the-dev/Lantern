import subprocess
import json
import os
import time
import shutil
import socket
from typing import List, Dict, Any, Optional
from pathlib import Path
import psutil
from .database import get_db, add_activity

DOCKER_AVAILABLE = shutil.which("docker") is not None
BASE_DIR = Path(os.environ.get("LANTERN_DATA_DIR", os.path.expanduser("~/.lantern")))
PIDS_DIR = BASE_DIR / "pids"
LOGS_DIR = BASE_DIR / "logs"

RUNNER_BIN = Path(__file__).resolve().parent.parent / "bin" / "lantern-runner"

# Ensure directories exist
PIDS_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# Default definitions of native managed services
MANAGED_SERVICES: Dict[str, Dict[str, Any]] = {
    "jellyfin": {
        "id": "svc-jellyfin",
        "name": "jellyfin",
        "title": "Jellyfin Media Server",
        "port": 8096,
        "category": "Media",
        "image": "native-c (lantern-runner)",
        "description": "The Free Software Media System"
    },
    "uptime-kuma": {
        "id": "svc-uptime-kuma",
        "name": "uptime-kuma",
        "title": "Uptime Kuma",
        "port": 3001,
        "category": "Monitoring",
        "image": "native-c (lantern-runner)",
        "description": "Self-hosted monitoring tool"
    },
    "nextcloud": {
        "id": "svc-nextcloud",
        "name": "nextcloud",
        "title": "Nextcloud Hub",
        "port": 8081,
        "category": "Cloud",
        "image": "native-c (lantern-runner)",
        "description": "Productivity platform for private cloud"
    },
    "qbittorrent": {
        "id": "svc-qbittorrent",
        "name": "qbittorrent",
        "title": "qBittorrent WebUI",
        "port": 8085,
        "category": "Browse",
        "image": "native-c (lantern-runner)",
        "description": "High performance torrent client"
    },
    "pihole": {
        "id": "svc-pihole",
        "name": "pihole",
        "title": "Pi-hole DNS Sinkhole",
        "port": 8088,
        "category": "Browse",
        "image": "native-c (lantern-runner)",
        "description": "Network-wide ad and tracker blocking"
    },
    "minecraft": {
        "id": "svc-minecraft",
        "name": "minecraft",
        "title": "Minecraft Server",
        "port": 25565,
        "category": "Games",
        "image": "native-c (lantern-runner)",
        "description": "Survival multiplayer server"
    }
}

def is_docker_running() -> bool:
    if not DOCKER_AVAILABLE:
        return False
    try:
        res = subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=2)
        return res.returncode == 0
    except Exception:
        return False

def is_port_listening(port: int, host: str = "127.0.0.1") -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.2):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

def get_service_pid(name: str) -> Optional[int]:
    pid_file = PIDS_DIR / f"{name}.pid"
    if pid_file.exists():
        try:
            with open(pid_file, "r") as f:
                pid = int(f.read().strip())
                if psutil.pid_exists(pid):
                    return pid
                else:
                    # Stale PID file
                    pid_file.unlink(missing_ok=True)
        except Exception:
            pass
    return None

def get_process_metrics(pid: Optional[int]) -> tuple[float, str, str]:
    if not pid:
        return 0.0, "0MB / 16GB", "Stopped"
    try:
        proc = psutil.Process(pid)
        cpu = proc.cpu_percent(interval=None)
        mem_bytes = proc.memory_info().rss
        mem_mb = round(mem_bytes / (1024 * 1024), 1)
        
        # Calculate human-readable uptime
        create_time = proc.create_time()
        uptime_seconds = int(time.time() - create_time)
        if uptime_seconds < 60:
            uptime_str = f"{uptime_seconds}s"
        elif uptime_seconds < 3600:
            uptime_str = f"{uptime_seconds // 60}m"
        elif uptime_seconds < 86400:
            hrs = uptime_seconds // 3600
            mins = (uptime_seconds % 3600) // 60
            uptime_str = f"{hrs}h {mins}m"
        else:
            days = uptime_seconds // 86400
            hrs = (uptime_seconds % 86400) // 3600
            uptime_str = f"{days}d {hrs}h"

        return cpu, f"{mem_mb}MB", uptime_str
    except Exception:
        return 0.0, "0MB", "Stopped"

def read_service_logs(name: str, max_lines: int = 50) -> List[str]:
    log_file = LOGS_DIR / f"{name}.log"
    if log_file.exists():
        try:
            with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
                return [line.rstrip() for line in lines[-max_lines:]]
        except Exception as e:
            return [f"[ERR] Failed to read logs: {e}"]
    return [f"[INF] No log entries yet for {name}"]

def execute_runner(action: str, name: str, port: int) -> bool:
    runner = str(RUNNER_BIN)
    if not RUNNER_BIN.exists():
        # Fallback to PATH
        found = shutil.which("lantern-runner")
        if found:
            runner = found
        else:
            return False

    cmd = [runner, action, name]
    if action in ("start", "restart"):
        cmd.append(str(port))

    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        return res.returncode == 0
    except Exception as e:
        print(f"Error running lantern-runner: {e}")
        return False

def list_containers() -> List[Dict[str, Any]]:
    # 1. If real Docker is active, return real docker containers
    if is_docker_running():
        try:
            cmd = ["docker", "ps", "-a", "--format", "{{json .}}"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=4)
            if res.returncode == 0 and res.stdout.strip():
                containers = []
                for line in res.stdout.strip().split("\n"):
                    if not line:
                        continue
                    c = json.loads(line)
                    status = "running" if "Up" in c.get("Status", "") else "stopped"
                    containers.append({
                        "id": c.get("ID", ""),
                        "name": c.get("Names", ""),
                        "image": c.get("Image", ""),
                        "status": status,
                        "created": c.get("CreatedAt", ""),
                        "ports": [p.strip() for p in c.get("Ports", "").split(",") if p.strip()],
                        "uptime": c.get("Status", ""),
                        "is_real_docker": True,
                        "logs": []
                    })
                return containers
        except Exception:
            pass

    # 2. Return real Linux native managed processes
    results = []
    for name, conf in MANAGED_SERVICES.items():
        pid = get_service_pid(name)
        listening = is_port_listening(conf["port"])
        
        is_running = (pid is not None) and listening
        cpu, mem, uptime = get_process_metrics(pid) if is_running else (0.0, "0MB / 16GB", "Stopped")
        logs = read_service_logs(name)

        results.append({
            "id": conf["id"],
            "name": name,
            "title": conf.get("title", name),
            "image": conf["image"],
            "status": "running" if is_running else "stopped",
            "pid": pid,
            "port": conf["port"],
            "ports": [f"{conf['port']}:{conf['port']}"],
            "category": conf["category"],
            "cpu_percent": cpu,
            "memory_usage": mem,
            "uptime": uptime,
            "is_real_docker": False,
            "is_native_process": True,
            "is_listening": listening,
            "logs": logs
        })

    return results

def get_container(name_or_id: str) -> Optional[Dict[str, Any]]:
    containers = list_containers()
    for c in containers:
        if c["id"] == name_or_id or c["name"] == name_or_id:
            return c
    return None

def start_container(name_or_id: str) -> bool:
    if is_docker_running():
        try:
            res = subprocess.run(["docker", "start", name_or_id], capture_output=True, timeout=10)
            if res.returncode == 0:
                add_activity("triangle", "emerald", f"Docker container {name_or_id} started", "Just now")
                return True
        except Exception:
            pass

    # Find service in MANAGED_SERVICES
    clean_name = name_or_id.replace("svc-", "")
    if clean_name in MANAGED_SERVICES:
        svc = MANAGED_SERVICES[clean_name]
        ok = execute_runner("start", clean_name, svc["port"])
        if ok:
            add_activity("triangle", "emerald", f"Native service {clean_name} started (port {svc['port']})", "Just now")
            return True
    return False

def stop_container(name_or_id: str) -> bool:
    if is_docker_running():
        try:
            res = subprocess.run(["docker", "stop", name_or_id], capture_output=True, timeout=10)
            if res.returncode == 0:
                add_activity("square", "rose", f"Docker container {name_or_id} stopped", "Just now")
                return True
        except Exception:
            pass

    clean_name = name_or_id.replace("svc-", "")
    if clean_name in MANAGED_SERVICES:
        ok = execute_runner("stop", clean_name, MANAGED_SERVICES[clean_name]["port"])
        if ok:
            add_activity("square", "rose", f"Native service {clean_name} stopped", "Just now")
            return True
    return False

def restart_container(name_or_id: str) -> bool:
    if is_docker_running():
        try:
            res = subprocess.run(["docker", "restart", name_or_id], capture_output=True, timeout=15)
            if res.returncode == 0:
                add_activity("refresh-cw", "blue", f"Docker container {name_or_id} restarted", "Just now")
                return True
        except Exception:
            pass

    clean_name = name_or_id.replace("svc-", "")
    if clean_name in MANAGED_SERVICES:
        svc = MANAGED_SERVICES[clean_name]
        ok = execute_runner("restart", clean_name, svc["port"])
        if ok:
            add_activity("refresh-cw", "blue", f"Native service {clean_name} restarted", "Just now")
            return True
    return False

def remove_container(name_or_id: str) -> bool:
    if is_docker_running():
        try:
            subprocess.run(["docker", "rm", "-f", name_or_id], capture_output=True, timeout=10)
            add_activity("trash", "rose", f"Container {name_or_id} removed", "Just now")
            return True
        except Exception:
            pass

    stop_container(name_or_id)
    clean_name = name_or_id.replace("svc-", "")
    MANAGED_SERVICES.pop(clean_name, None)
    add_activity("trash", "rose", f"Service {clean_name} removed", "Just now")
    return True

def get_container_logs(name_or_id: str, tail: int = 50) -> List[str]:
    if is_docker_running():
        try:
            res = subprocess.run(["docker", "logs", "--tail", str(tail), name_or_id], capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                return res.stdout.split("\n") + res.stderr.split("\n")
        except Exception:
            pass

    clean_name = name_or_id.replace("svc-", "")
    return read_service_logs(clean_name, max_lines=tail)

def list_systemd_services() -> List[Dict[str, Any]]:
    """Enumerate real host systemd units for the homelab manager"""
    units_to_track = [
        ("NetworkManager.service", "Network Manager", "Networking"),
        ("avahi-daemon.service", "Avahi mDNS/DNS-SD (lantern.local)", "Discovery"),
        ("systemd-resolved.service", "systemd DNS Resolver", "Networking"),
        ("proton.VPN.service", "Proton VPN Daemon", "Security"),
        ("playit.service", "Playit Tunnel Agent", "Network"),
        ("ananicy-cpp.service", "Ananicy-Cpp Auto NICe", "System"),
        ("systemd-timesyncd.service", "NTP Time Synchronization", "System"),
        ("cups.service", "CUPS Print Spooler", "Hardware")
    ]

    results = []
    for unit, desc, category in units_to_track:
        try:
            res = subprocess.run(
                ["systemctl", "is-active", unit],
                capture_output=True,
                text=True,
                timeout=1
            )
            state = res.stdout.strip()
            is_active = (state == "active")

            results.append({
                "unit": unit,
                "name": desc,
                "category": category,
                "status": "running" if is_active else state or "inactive",
                "is_active": is_active,
                "type": "systemd"
            })
        except Exception:
            pass
    return results

def create_container_from_manifest(manifest: Dict[str, Any]) -> Dict[str, Any]:
    name = manifest.get("slug", manifest.get("name", "app")).lower().replace(" ", "-")
    port = manifest.get("port", 8080)
    cid = f"svc-{name}"

    MANAGED_SERVICES[name] = {
        "id": cid,
        "name": name,
        "title": manifest.get("name", name),
        "port": port,
        "category": manifest.get("category", "General"),
        "image": manifest.get("image", "native-c (lantern-runner)"),
        "description": manifest.get("description", "")
    }

    execute_runner("start", name, port)
    add_activity("package", "emerald", f"Service {name} deployed on port {port}", "Just now")

    return {
        "id": cid,
        "name": name,
        "status": "running",
        "port": port
    }

