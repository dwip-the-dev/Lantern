import uuid
import secrets
from typing import Optional, Dict, Any, List
from .database import (
    get_db,
    hash_password,
    verify_password,
    add_activity,
    save_db_session,
    get_db_session,
    delete_db_session,
    is_system_configured
)

# In-memory cache for quick token resolution: token -> user dict
SESSIONS: Dict[str, Dict[str, Any]] = {}

def get_current_user_from_token(token: Optional[str]) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    # 1. Check in-memory cache
    if token in SESSIONS:
        return SESSIONS[token]
    # 2. Check persistent DB session
    db_user = get_db_session(token)
    if db_user:
        safe_user = {k: v for k, v in db_user.items() if k not in ("password_hash", "salt")}
        SESSIONS[token] = safe_user
        return safe_user
    return None

def create_session(user_dict: Dict[str, Any]) -> str:
    token = secrets.token_urlsafe(32)
    safe_user = {k: v for k, v in user_dict.items() if k not in ("password_hash", "salt")}
    SESSIONS[token] = safe_user
    save_db_session(token, safe_user["id"], safe_user.get("role", "user"))
    return token

def revoke_session(token: str):
    SESSIONS.pop(token, None)
    delete_db_session(token)

def login_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", (username.strip(),)).fetchone()
        if not row:
            return None
        user = dict(row)
        if verify_password(password, user["password_hash"], user["salt"]):
            token = create_session(user)
            add_activity("user", "emerald", f"{user['name']} logged in", "Just now")
            safe_user = {k: v for k, v in user.items() if k not in ("password_hash", "salt")}
            return {
                "token": token,
                "user": safe_user
            }
    return None

def register_user(username: str, name: str, password: str, email: str = "", role: str = "user") -> Dict[str, Any]:
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", (username.strip(),)).fetchone()
        if existing:
            raise ValueError("Username already taken")
        
        user_id = f"user-{uuid.uuid4().hex[:8]}"
        pw_hash, salt = hash_password(password)
        avatar_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={username}"

        conn.execute("""
            INSERT INTO users (id, username, name, email, password_hash, salt, role, avatar_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, username.strip(), name.strip(), email.strip(), pw_hash, salt, role, avatar_url))
        conn.commit()

        user = {
            "id": user_id,
            "username": username.strip(),
            "name": name.strip(),
            "email": email.strip(),
            "role": role,
            "avatar_url": avatar_url
        }
        token = create_session(user)
        add_activity("user-plus", "blue", f"New user {name} registered", "Just now")
        return {"token": token, "user": user}

def setup_initial_admin(username: str, name: str, password: str, email: str = "") -> Dict[str, Any]:
    with get_db() as conn:
        # Check if an admin exists
        admin_count = conn.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'").fetchone()[0]
        if admin_count > 0:
            # If default user-admin-1 exists and was unmodified, replace with real admin
            default_admin = conn.execute("SELECT id FROM users WHERE id = 'user-admin-1'").fetchone()
            if default_admin:
                conn.execute("DELETE FROM users WHERE id = 'user-admin-1'")
                conn.commit()
            else:
                raise ValueError("System is already configured with an administrator")

        user_id = f"admin-{uuid.uuid4().hex[:8]}"
        pw_hash, salt = hash_password(password)
        avatar_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={username}"

        conn.execute("""
            INSERT INTO users (id, username, name, email, password_hash, salt, role, avatar_url)
            VALUES (?, ?, ?, ?, ?, ?, 'admin', ?)
        """, (user_id, username.strip(), name.strip(), email.strip(), pw_hash, salt, avatar_url))
        
        # Mark initialized in settings
        conn.execute("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('system_configured', 'true', CURRENT_TIMESTAMP)")
        conn.commit()

        user = {
            "id": user_id,
            "username": username.strip(),
            "name": name.strip(),
            "email": email.strip(),
            "role": "admin",
            "avatar_url": avatar_url
        }
        token = create_session(user)
        add_activity("shield", "amber", f"Administrator {name} setup completed", "Just now")
        return {"token": token, "user": user}

def create_guest_session() -> Dict[str, Any]:
    guest_id = f"guest-{secrets.token_hex(4)}"
    guest_user = {
        "id": guest_id,
        "username": "guest",
        "name": "Guest Visitor",
        "email": "",
        "role": "guest",
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=guest"
    }
    token = create_session(guest_user)
    add_activity("eye", "cyan", "Guest visitor joined homelab", "Just now")
    return {"token": token, "user": guest_user}

def list_users() -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT id, username, name, email, role, avatar_url, created_at FROM users").fetchall()
        return [dict(r) for r in rows]

def list_family_members() -> List[Dict[str, Any]]:
    with get_db() as conn:
        rows = conn.execute("SELECT id, username, name, email, role, avatar_url, created_at FROM users ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, id ASC").fetchall()
        members = []
        color_palette = {
            "dwip": "#f59e0b",
            "sarah": "#ec4899",
            "leo": "#3b82f6",
            "livingroom": "#10b981",
        }
        icon_palette = {
            "dwip": "crown",
            "sarah": "heart",
            "leo": "gamepad",
            "livingroom": "tv",
        }
        for r in rows:
            u = dict(r)
            uname = u["username"].lower()
            u["avatar_color"] = color_palette.get(uname, "#8b5cf6")
            u["avatar_icon"] = icon_palette.get(uname, "user")
            u["is_admin"] = u["role"] == "admin"
            members.append(u)
        return members

def switch_family_profile(target_username: str, password: Optional[str] = None) -> Dict[str, Any]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", (target_username.strip(),)).fetchone()
        if not row:
            raise ValueError("Family member profile not found")
        target_user = dict(row)
        
        # If switching to an administrator account, authentication is strictly required
        if target_user["role"] == "admin":
            if not password:
                raise ValueError("Password required to switch to Administrator account")
            if not verify_password(password, target_user["password_hash"], target_user["salt"]):
                raise ValueError("Invalid administrator password")
        
        # For member accounts, verify password if provided, or allow seamless LAN switching
        elif password:
            if not verify_password(password, target_user["password_hash"], target_user["salt"]):
                raise ValueError("Invalid password")

        token = create_session(target_user)
        safe_user = {k: v for k, v in target_user.items() if k not in ("password_hash", "salt")}
        add_activity("user", "emerald", f"Switched active profile to {safe_user['name']}", "Just now")
        return {
            "token": token,
            "user": safe_user
        }

def complete_onboarding(
    server_name: str,
    tagline: str,
    admin_name: str,
    admin_username: str,
    admin_password: str,
    admin_email: str = "",
    family_members: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    import os
    from pathlib import Path
    from .database import set_setting

    # 1. Update settings
    set_setting("server_name", server_name.strip() or "Lantern Family Server")
    set_setting("tagline", tagline.strip() or "Your home server, enlightened.")
    set_setting("system_configured", "true")

    # 2. Update or create primary admin
    with get_db() as conn:
        pw_hash, salt = hash_password(admin_password)
        conn.execute("""
            INSERT OR REPLACE INTO users (id, username, name, email, password_hash, salt, role, avatar_url)
            VALUES ('user-admin-dwip', ?, ?, ?, ?, ?, 'admin', '')
        """, (admin_username.strip(), admin_name.strip(), admin_email.strip(), pw_hash, salt))

        # 3. Create family members
        if family_members:
            for member in family_members:
                m_user = member.get("username", "").strip()
                m_name = member.get("name", "").strip() or m_user
                m_role = member.get("role", "user")
                m_pass = member.get("password", "family123")
                if not m_user or m_user.lower() == admin_username.lower():
                    continue
                exists = conn.execute("SELECT COUNT(*) FROM users WHERE LOWER(username) = LOWER(?)", (m_user,)).fetchone()[0]
                if exists == 0:
                    mp_hash, mp_salt = hash_password(m_pass)
                    conn.execute("""
                        INSERT INTO users (id, username, name, email, password_hash, salt, role, avatar_url)
                        VALUES (?, ?, ?, ?, ?, ?, ?, '')
                    """, (f"user-fam-{m_user}", m_user, m_name, f"{m_user}@lantern.local", mp_hash, mp_salt, m_role))

        conn.commit()

    # 4. Create shared family directories
    base_data = Path(os.path.expanduser("~/.lantern/family_shared"))
    for sub in ["Photos", "Movies", "Documents", "Music", "Kids"]:
        (base_data / sub).mkdir(parents=True, exist_ok=True)

    # 5. Log in admin
    admin_user = {
        "id": "user-admin-dwip",
        "username": admin_username.strip(),
        "name": admin_name.strip(),
        "email": admin_email.strip(),
        "role": "admin",
        "avatar_url": ""
    }
    token = create_session(admin_user)
    add_activity("sparkles", "amber", f"First-time onboarding completed for {admin_name}", "Just now")
    return {
        "token": token,
        "user": admin_user,
        "configured": True
    }

def check_system_setup() -> Dict[str, Any]:
    configured = is_system_configured()
    users = list_users()
    return {
        "configured": configured,
        "user_count": len(users)
    }
