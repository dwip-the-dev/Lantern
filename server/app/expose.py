import uuid
import time
from typing import List, Dict, Any, Optional
from .database import get_db, get_setting, add_notification

def list_tunnels() -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM tunnels ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]

def create_tunnel(name: str, target_port: int, subdomain: Optional[str] = None, service_id: Optional[str] = None, protocol: str = "https") -> Dict[str, Any]:
    base_domain = get_setting("base_domain", "lantern.network")
    sub = (subdomain or name).strip().lower().replace(" ", "-")
    
    # Generate public URL
    public_url = f"{protocol}://{sub}.{base_domain}"
    tunnel_id = f"tun-{uuid.uuid4().hex[:8]}"

    with get_db() as conn:
        # Check if subdomain already taken
        existing = conn.execute("SELECT id FROM tunnels WHERE subdomain = ?", (sub,)).fetchone()
        if existing:
            sub = f"{sub}-{uuid.uuid4().hex[:4]}"
            public_url = f"{protocol}://{sub}.{base_domain}"

        conn.execute("""
            INSERT INTO tunnels (id, name, target_port, subdomain, public_url, service_id, status, ssl_enabled, protocol)
            VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?)
        """, (tunnel_id, name, target_port, sub, public_url, service_id, protocol))
        
        # If linked to an installed app, update that app
        if service_id:
            conn.execute("UPDATE installed_apps SET exposed = 1, public_url = ? WHERE slug = ? OR id = ?", (public_url, service_id, service_id))
            
        conn.commit()

    add_notification("tunnel_created", f"{name} Exposed", f"Live at {public_url} (Forwarding to local port {target_port})", "success")

    return {
        "id": tunnel_id,
        "name": name,
        "target_port": target_port,
        "subdomain": sub,
        "public_url": public_url,
        "service_id": service_id,
        "status": "active",
        "ssl_enabled": True,
        "protocol": protocol
    }

def delete_tunnel(tunnel_id: str) -> bool:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM tunnels WHERE id = ?", (tunnel_id,)).fetchone()
        if not row:
            return False
        
        service_id = row["service_id"]
        tunnel_name = row["name"]
        
        conn.execute("DELETE FROM tunnels WHERE id = ?", (tunnel_id,))
        if service_id:
            conn.execute("UPDATE installed_apps SET exposed = 0, public_url = NULL WHERE slug = ? OR id = ?", (service_id, service_id))
        conn.commit()

    add_notification("tunnel_deleted", f"Tunnel Removed", f"Service '{tunnel_name}' is no longer exposed to internet.", "info")
    return True

def generate_cloudflare_config() -> str:
    """Generate a Cloudflare Tunnel ingress configuration file."""
    tunnels = list_tunnels()
    base_domain = get_setting("base_domain", "lantern.network")
    
    lines = [
        "# Lantern Cloudflare Tunnel Config (Generated automatically)",
        "tunnel: <your-tunnel-uuid>",
        "credentials-file: /etc/cloudflared/creds.json",
        "",
        "ingress:"
    ]
    for t in tunnels:
        lines.append(f"  - hostname: {t['subdomain']}.{base_domain}")
        lines.append(f"    service: http://localhost:{t['target_port']}")
    lines.append("  - service: http_status:404")
    return "\n".join(lines)

def generate_caddy_config() -> str:
    """Generate a Caddyfile reverse-proxy configuration."""
    tunnels = list_tunnels()
    base_domain = get_setting("base_domain", "lantern.network")
    
    lines = ["# Lantern Caddy Reverse Proxy Configuration", ""]
    for t in tunnels:
        lines.append(f"{t['subdomain']}.{base_domain} {{")
        lines.append(f"    reverse_proxy localhost:{t['target_port']}")
        lines.append("    tls internal")
        lines.append("}")
        lines.append("")
    return "\n".join(lines)
