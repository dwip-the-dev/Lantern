import psutil
import time
import os
import platform
import socket
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Store previous network and disk IO for calculating rates
_prev_net_time = time.time()
_prev_net_io = psutil.net_io_counters() if hasattr(psutil, "net_io_counters") else None

_prev_disk_time = time.time()
_prev_disk_io = psutil.disk_io_counters() if hasattr(psutil, "disk_io_counters") else None

def get_human_uptime(boot_timestamp: float) -> str:
    diff = time.time() - boot_timestamp
    uptime_delta = timedelta(seconds=int(diff))
    days = uptime_delta.days
    hours, remainder = divmod(uptime_delta.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0 or days > 0:
        parts.append(f"{hours}h")
    parts.append(f"{minutes}m")
    return " ".join(parts)

def get_server_info() -> Dict[str, Any]:
    boot_time = psutil.boot_time()
    
    # Try finding local network IP
    local_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    uname = platform.uname()
    return {
        "hostname": platform.node(),
        "os": f"{uname.system} {uname.release}",
        "kernel": uname.version.split(" ")[0] if uname.version else uname.release,
        "arch": uname.machine,
        "local_ip": local_ip,
        "boot_time": boot_time,
        "uptime_human": get_human_uptime(boot_time),
        "uptime_seconds": int(time.time() - boot_time),
        "cpu_model": platform.processor() or uname.machine,
        "cpu_count_logical": psutil.cpu_count(logical=True),
        "cpu_count_physical": psutil.cpu_count(logical=False) or psutil.cpu_count(logical=True)
    }

def get_system_stats(warning_threshold: float = 85.0, critical_threshold: float = 95.0) -> Dict[str, Any]:
    global _prev_net_time, _prev_net_io, _prev_disk_time, _prev_disk_io
    
    # 1. CPU
    cpu_percent = psutil.cpu_percent(interval=None)
    cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)
    cpu_freq = psutil.cpu_freq()
    
    load_avg = [0.0, 0.0, 0.0]
    if hasattr(os, "getloadavg"):
        try:
            load_avg = list(os.getloadavg())
        except Exception:
            pass

    # 2. Memory
    vm = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    # 3. Disks
    disks = []
    disk_alerts = []
    seen_mounts = set()
    
    for part in psutil.disk_partitions(all=False):
        # Ignore pseudo filesystems
        if part.mountpoint in seen_mounts or "loop" in part.device or part.fstype in ("squashfs", "tmpfs", "overlay"):
            continue
        seen_mounts.add(part.mountpoint)
        try:
            usage = psutil.disk_usage(part.mountpoint)
            disk_info = {
                "device": part.device,
                "mountpoint": part.mountpoint,
                "fstype": part.fstype,
                "total": usage.total,
                "used": usage.used,
                "free": usage.free,
                "percent": usage.percent
            }
            disks.append(disk_info)
            
            # Check thresholds
            if usage.percent >= critical_threshold:
                disk_alerts.append({
                    "severity": "critical",
                    "mountpoint": part.mountpoint,
                    "percent": usage.percent,
                    "message": f"CRITICAL: {part.mountpoint} is {usage.percent}% full! Only {round(usage.free / (1024**3), 1)}GB remaining."
                })
            elif usage.percent >= warning_threshold:
                disk_alerts.append({
                    "severity": "warning",
                    "mountpoint": part.mountpoint,
                    "percent": usage.percent,
                    "message": f"WARNING: {part.mountpoint} is {usage.percent}% full."
                })
        except (PermissionError, OSError):
            continue

    # 4. Network Rates
    curr_time = time.time()
    curr_net_io = psutil.net_io_counters()
    net_speed_rx = 0.0
    net_speed_tx = 0.0
    
    if _prev_net_io and curr_time > _prev_net_time:
        dt = curr_time - _prev_net_time
        net_speed_rx = max(0.0, (curr_net_io.bytes_recv - _prev_net_io.bytes_recv) / dt)
        net_speed_tx = max(0.0, (curr_net_io.bytes_sent - _prev_net_io.bytes_sent) / dt)
        
    _prev_net_time = curr_time
    _prev_net_io = curr_net_io

    # 5. Disk IO Rates
    curr_disk_io = psutil.disk_io_counters() if hasattr(psutil, "disk_io_counters") else None
    disk_read_speed = 0.0
    disk_write_speed = 0.0
    if curr_disk_io and _prev_disk_io and curr_time > _prev_disk_time:
        dt = curr_time - _prev_disk_time
        disk_read_speed = max(0.0, (curr_disk_io.read_bytes - _prev_disk_io.read_bytes) / dt)
        disk_write_speed = max(0.0, (curr_disk_io.write_bytes - _prev_disk_io.write_bytes) / dt)
        
    _prev_disk_time = curr_time
    _prev_disk_io = curr_disk_io

    # 6. Temperatures (if available)
    temperatures = {}
    if hasattr(psutil, "sensors_temperatures"):
        try:
            temps = psutil.sensors_temperatures()
            for name, entries in temps.items():
                if entries:
                    temperatures[name] = [
                        {"label": e.label or f"Core {idx}", "current": e.current, "high": e.high, "critical": e.critical}
                        for idx, e in enumerate(entries)
                    ]
        except Exception:
            pass

    # Active connections count
    connections_count = 0
    try:
        connections_count = len(psutil.net_connections(kind="inet"))
    except Exception:
        pass

    return {
        "timestamp": curr_time,
        "cpu": {
            "percent": cpu_percent,
            "cores": cpu_per_core,
            "frequency_mhz": round(cpu_freq.current, 1) if cpu_freq else None,
            "load_avg": load_avg
        },
        "memory": {
            "total": vm.total,
            "available": vm.available,
            "used": vm.used,
            "free": vm.free,
            "percent": vm.percent,
            "cached": getattr(vm, "cached", 0),
            "buffers": getattr(vm, "buffers", 0)
        },
        "swap": {
            "total": swap.total,
            "used": swap.used,
            "free": swap.free,
            "percent": swap.percent
        },
        "disks": disks,
        "disk_alerts": disk_alerts,
        "network": {
            "bytes_sent": curr_net_io.bytes_sent,
            "bytes_recv": curr_net_io.bytes_recv,
            "speed_rx_bytes": round(net_speed_rx),
            "speed_tx_bytes": round(net_speed_tx),
            "connections": connections_count
        },
        "disk_io": {
            "read_speed_bytes": round(disk_read_speed),
            "write_speed_bytes": round(disk_write_speed)
        },
        "temperatures": temperatures
    }
