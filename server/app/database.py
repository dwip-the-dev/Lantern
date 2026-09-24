import sqlite3
import os
import json
import hashlib
import secrets
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List

# Priority order for data dir:
# 1. LANTERN_DATA_DIR env
# 2. /var/lib/lantern (if writable or root)
# 3. ~/.lantern
def resolve_data_dir() -> Path:
    if os.environ.get("LANTERN_DATA_DIR"):
        return Path(os.environ["LANTERN_DATA_DIR"])
    var_lib = Path("/var/lib/lantern")
    if os.path.exists("/var/lib/lantern") and os.access("/var/lib/lantern", os.W_OK):
        return var_lib
    return Path(os.path.expanduser("~/.lantern"))

DB_DIR = resolve_data_dir()
DB_PATH = DB_DIR / "lantern.db"

def get_db():
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    if not salt:
        salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return pw_hash, salt

def verify_password(password: str, password_hash: str, salt: str) -> bool:
    expected_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(expected_hash, password_hash)

def init_db():
    DB_DIR.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Users Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                role TEXT DEFAULT 'admin',
                avatar_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 2. Installed Apps Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS installed_apps (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                icon TEXT,
                category TEXT,
                image TEXT NOT NULL,
                port INTEGER,
                container_id TEXT,
                status TEXT DEFAULT 'running',
                volumes TEXT,
                env TEXT,
                exposed INTEGER DEFAULT 0,
                public_url TEXT,
                installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 3. Tunnels / Expose Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tunnels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                target_port INTEGER NOT NULL,
                subdomain TEXT NOT NULL UNIQUE,
                public_url TEXT NOT NULL,
                service_id TEXT,
                status TEXT DEFAULT 'active',
                ssl_enabled INTEGER DEFAULT 1,
                protocol TEXT DEFAULT 'https',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 4. System Settings Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 5. Activity Feed Table (as shown in prototype)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                icon TEXT NOT NULL,
                color TEXT NOT NULL,
                title TEXT NOT NULL,
                time_ago TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 6. Notifications Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                severity TEXT DEFAULT 'info',
                read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 7. Real Persistent Sessions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            )
        """)

        # 8. Real Media Playback Progress Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS media_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                file_path TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                progress INTEGER DEFAULT 0,
                position_sec REAL DEFAULT 0,
                duration_sec REAL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        
        # Seed initial admin user if table empty
        admin_count = cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'").fetchone()[0]
        if admin_count == 0:
            pw_hash, salt = hash_password("1234dwip1234")
            cursor.execute("""
                INSERT INTO users (id, username, name, email, password_hash, salt, role, avatar_url)
                VALUES ('user-admin-dwip', 'dwip', 'Dwip', 'dwip@lantern.local', ?, ?, 'admin', '')
            """, (pw_hash, salt))

        # Seed demo family accounts if not present
        family_seed = [
            ("user-fam-sarah", "sarah", "Sarah", "sarah@lantern.local", "user", "family123"),
            ("user-fam-leo", "leo", "Leo", "leo@lantern.local", "user", "family123"),
            ("user-fam-tv", "livingroom", "Living Room TV", "tv@lantern.local", "user", "family123"),
        ]
        for fid, fuser, fname, femail, frole, fpass in family_seed:
            exists = cursor.execute("SELECT COUNT(*) FROM users WHERE LOWER(username) = LOWER(?)", (fuser,)).fetchone()[0]
            if exists == 0:
                p_hash, p_salt = hash_password(fpass)
                cursor.execute("""
                    INSERT INTO users (id, username, name, email, password_hash, salt, role, avatar_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?, '')
                """, (fid, fuser, fname, femail, p_hash, p_salt, frole))

        # Seed initial activity if empty
        act_count = cursor.execute("SELECT COUNT(*) FROM activity_log").fetchone()[0]
        if act_count == 0:
            cursor.execute(
                "INSERT INTO activity_log (icon, color, title, time_ago) VALUES (?, ?, ?, ?)",
                ("server", "emerald", "Lantern Server initialized and ready", "Just now")
            )

        # Seed settings
        default_settings = {
            "server_name": "Lantern",
            "tagline": "Your home server, enlightened.",
            "disk_warning_threshold": "85",
            "disk_critical_threshold": "95",
            "base_domain": "lantern.local",
            "lan_bind": "0.0.0.0",
            "http_port": "8080"
        }
        for k, v in default_settings.items():
            cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))
            
        conn.commit()

def get_setting(key: str, default: str = "") -> str:
    with get_db() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else default

def set_setting(key: str, value: str):
    with get_db() as conn:
        conn.execute("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (key, value))
        conn.commit()

def add_activity(icon: str, color: str, title: str, time_ago: str = "Just now"):
    with get_db() as conn:
        conn.execute("INSERT INTO activity_log (icon, color, title, time_ago) VALUES (?, ?, ?, ?)", (icon, color, title, time_ago))
        conn.commit()

def get_activities(limit: int = 10):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

def add_notification(ntype: str, title: str, message: str, severity: str = "info"):
    with get_db() as conn:
        conn.execute("INSERT INTO notifications (type, title, message, severity) VALUES (?, ?, ?, ?)", (ntype, title, message, severity))
        conn.commit()

def get_notifications(limit: int = 20):
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

def is_system_configured() -> bool:
    with get_db() as conn:
        row = conn.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").fetchone()
        return bool(row and row["count"] > 0)

def save_db_session(token: str, user_id: str, role: str):
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO sessions (token, user_id, role) VALUES (?, ?, ?)",
            (token, user_id, role)
        )
        conn.commit()

def get_db_session(token: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute("""
            SELECT s.token, s.role, u.id, u.username, u.name, u.email, u.avatar_url
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ?
        """, (token,)).fetchone()
        if row:
            return dict(row)
        # Check if guest session
        guest_row = conn.execute("SELECT token, user_id, role FROM sessions WHERE token = ? AND role = 'guest'", (token,)).fetchone()
        if guest_row:
            return {
                "id": guest_row["user_id"],
                "username": "guest",
                "name": "Guest Visitor",
                "email": "",
                "role": "guest",
                "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=guest"
            }
        return None

def delete_db_session(token: str):
    with get_db() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()

def upsert_media_progress(file_path: str, title: str, progress: int, position_sec: float, duration_sec: float, user_id: str = "default"):
    with get_db() as conn:
        conn.execute("""
            INSERT INTO media_progress (user_id, file_path, title, progress, position_sec, duration_sec, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(file_path) DO UPDATE SET
                progress = excluded.progress,
                position_sec = excluded.position_sec,
                duration_sec = excluded.duration_sec,
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, file_path, title, progress, position_sec, duration_sec))
        conn.commit()

def get_media_progress(file_path: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM media_progress WHERE file_path = ?", (file_path,)).fetchone()
        return dict(row) if row else None

def get_all_media_progress() -> dict[str, dict]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM media_progress ORDER BY updated_at DESC").fetchall()
        return {r["file_path"]: dict(r) for r in rows}

