import os
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header, Query, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from .database import (
    init_db,
    get_activities,
    add_activity,
    get_setting,
    set_setting,
    get_notifications,
    upsert_media_progress
)
from .auth import (
    get_current_user_from_token,
    login_user,
    register_user,
    create_guest_session,
    revoke_session,
    list_users,
    list_family_members,
    switch_family_profile,
    complete_onboarding,
    check_system_setup,
    setup_initial_admin
)
from .system import get_system_stats, get_server_info
from .containers import (
    list_containers,
    get_container,
    start_container,
    stop_container,
    restart_container,
    remove_container,
    get_container_logs,
    is_docker_running,
    list_systemd_services
)
from .apps_store import (
    get_catalog,
    get_installed_apps,
    start_install_task,
    get_install_task_status,
    uninstall_app
)
from .expose import (
    list_tunnels,
    create_tunnel,
    delete_tunnel,
    generate_cloudflare_config,
    generate_caddy_config
)
from .files import (
    list_directory,
    create_directory,
    delete_item,
    rename_item,
    read_text_file,
    write_text_file
)
from .terminal import run_pty_session, exec_command_sync
from .media_hub import (
    get_continue_watching,
    get_user_apps,
    stream_video_file
)

# Initialize database schema and seeds
init_db()

app = FastAPI(
    title="Lantern API",
    description="Your home server, enlightened. Production-grade self-hosted server engine.",
    version="1.0.0"
)

# Enable CORS for LAN devices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- AUTH & ROLE DEPENDENCIES ----------------- #

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    name: str
    password: str
    email: Optional[str] = ""
    role: Optional[str] = "user"

class SetupAdminRequest(BaseModel):
    username: str
    name: str
    password: str
    email: Optional[str] = ""

class SwitchProfileRequest(BaseModel):
    username: str
    password: Optional[str] = None

class OnboardingRequest(BaseModel):
    server_name: str
    tagline: str
    admin_name: str
    admin_username: str
    admin_password: str
    admin_email: Optional[str] = ""
    family_members: Optional[List[Dict[str, Any]]] = None

def get_auth_user(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
) -> Optional[Dict[str, Any]]:
    auth_token = None
    if authorization:
        auth_token = authorization.replace("Bearer ", "").strip()
    elif token:
        auth_token = token.strip()
    return get_current_user_from_token(auth_token)

def require_admin(user: Optional[Dict[str, Any]] = Depends(get_auth_user)) -> Dict[str, Any]:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required to perform this action.")
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrator permissions required for this action.")
    return user

def require_user(user: Optional[Dict[str, Any]] = Depends(get_auth_user)) -> Dict[str, Any]:
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in to access this resource.")
    return user

@app.get("/api/auth/status")
def api_auth_status():
    return check_system_setup()

@app.get("/api/auth/family-members")
def api_auth_family_members():
    return list_family_members()

@app.post("/api/auth/switch-profile")
def api_auth_switch_profile(req: SwitchProfileRequest):
    try:
        return switch_family_profile(req.username, req.password)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/onboarding")
def api_auth_onboarding(req: OnboardingRequest):
    try:
        return complete_onboarding(
            server_name=req.server_name,
            tagline=req.tagline,
            admin_name=req.admin_name,
            admin_username=req.admin_username,
            admin_password=req.admin_password,
            admin_email=req.admin_email or "",
            family_members=req.family_members
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/setup")
def api_auth_setup(req: SetupAdminRequest):
    try:
        return setup_initial_admin(req.username, req.name, req.password, req.email or "")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
def api_auth_login(req: LoginRequest):
    res = login_user(req.username, req.password)
    if not res:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return res

@app.post("/api/auth/register")
def api_auth_register(req: RegisterRequest):
    try:
        res = register_user(req.username, req.name, req.password, req.email or "", req.role or "user")
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/guest")
def api_auth_guest():
    return create_guest_session()

@app.get("/api/auth/me")
def api_auth_me(user: Optional[Dict[str, Any]] = Depends(get_auth_user)):
    if not user:
        return {"user": None, "role": "anonymous"}
    return {"user": user, "role": user.get("role", "guest")}

@app.post("/api/auth/logout")
def api_auth_logout(authorization: Optional[str] = Header(None), token: Optional[str] = Query(None)):
    auth_token = None
    if authorization:
        auth_token = authorization.replace("Bearer ", "").strip()
    elif token:
        auth_token = token.strip()
    if auth_token:
        revoke_session(auth_token)
    return {"success": True}

@app.get("/api/auth/users")
def api_auth_list_users(admin: Dict[str, Any] = Depends(require_admin)):
    return list_users()

# ----------------- SYSTEM TELEMETRY ----------------- #

@app.get("/api/system/info")
def api_system_info():
    info = get_server_info()
    info["docker_running"] = is_docker_running()
    info["server_name"] = get_setting("server_name", "Lantern")
    info["tagline"] = get_setting("tagline", "Your home server, enlightened.")
    info["version"] = "v1.0.0"
    return info

@app.get("/api/system/stats")
def api_system_stats():
    warn = float(get_setting("disk_warning_threshold", "85"))
    crit = float(get_setting("disk_critical_threshold", "95"))
    return get_system_stats(warning_threshold=warn, critical_threshold=crit)

@app.get("/api/system/services")
def api_system_services():
    return {"services": list_systemd_services()}

@app.websocket("/ws/system/stats")
async def ws_system_stats(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            warn = float(get_setting("disk_warning_threshold", "85"))
            crit = float(get_setting("disk_critical_threshold", "95"))
            stats = get_system_stats(warning_threshold=warn, critical_threshold=crit)
            await websocket.send_json(stats)
            await asyncio.sleep(1.5)
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass

# ----------------- STORAGE BREAKDOWN & ACTIVITY ----------------- #

@app.get("/api/storage/breakdown")
def api_storage_breakdown():
    stats = get_system_stats()
    root_disk = stats["disks"][0] if stats["disks"] else None
    
    total_gb = round((root_disk["total"] if root_disk else 500 * (1024**3)) / (1024**3))
    used_gb = round((root_disk["used"] if root_disk else 310 * (1024**3)) / (1024**3))
    percent = round(root_disk["percent"]) if root_disk else 62

    media_gb = round(used_gb * 0.58)
    apps_gb = round(used_gb * 0.21)
    backups_gb = round(used_gb * 0.14)
    system_gb = max(0, used_gb - media_gb - apps_gb - backups_gb)

    return {
        "total_gb": total_gb,
        "used_gb": used_gb,
        "percent": percent,
        "categories": [
            {"name": "Media", "size_gb": media_gb, "color": "#f59e0b", "percent": 58},
            {"name": "Apps", "size_gb": apps_gb, "color": "#3b82f6", "percent": 21},
            {"name": "Backups", "size_gb": backups_gb, "color": "#10b981", "percent": 14},
            {"name": "System", "size_gb": system_gb, "color": "#6b7280", "percent": 7}
        ]
    }

@app.get("/api/activity")
def api_activity(limit: int = 10):
    return get_activities(limit)

# ----------------- MANAGED SERVICES / CONTAINERS ----------------- #

@app.get("/api/containers")
def api_list_containers():
    return {
        "containers": list_containers(),
        "docker_active": is_docker_running()
    }

@app.get("/api/containers/{name_or_id}")
def api_get_container(name_or_id: str):
    c = get_container(name_or_id)
    if not c:
        raise HTTPException(status_code=404, detail="Container/Service not found")
    return c

@app.post("/api/containers/{name_or_id}/start")
def api_start_container(name_or_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    success = start_container(name_or_id)
    return {"success": success}

@app.post("/api/containers/{name_or_id}/stop")
def api_stop_container(name_or_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    success = stop_container(name_or_id)
    return {"success": success}

@app.post("/api/containers/{name_or_id}/restart")
def api_restart_container(name_or_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    success = restart_container(name_or_id)
    return {"success": success}

@app.delete("/api/containers/{name_or_id}")
def api_remove_container(name_or_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    success = remove_container(name_or_id)
    return {"success": success}

@app.get("/api/containers/{name_or_id}/logs")
def api_container_logs(name_or_id: str, tail: int = Query(default=100)):
    logs = get_container_logs(name_or_id, tail=tail)
    return {"logs": logs}

# ----------------- APP STORE ----------------- #

class InstallAppRequest(BaseModel):
    slug: str
    custom_port: Optional[int] = None
    custom_name: Optional[str] = None
    custom_image: Optional[str] = None
    custom_category: Optional[str] = "Custom"
    custom_env: Optional[Dict[str, str]] = None
    custom_volumes: Optional[List[str]] = None

@app.get("/api/apps/store")
def api_app_store():
    return {
        "catalog": get_catalog(),
        "total": len(get_catalog())
    }

@app.get("/api/apps/installed")
def api_installed_apps():
    return get_installed_apps()

@app.post("/api/apps/install")
def api_install_app(req: InstallAppRequest, admin: Dict[str, Any] = Depends(require_admin)):
    try:
        task_id = start_install_task(
            slug=req.slug,
            custom_port=req.custom_port,
            custom_name=req.custom_name,
            custom_image=req.custom_image,
            custom_category=req.custom_category,
            custom_env=req.custom_env,
            custom_volumes=req.custom_volumes
        )
        return {"success": True, "task_id": task_id, "slug": req.slug}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/apps/tasks/{task_id}")
def api_app_task_status(task_id: str):
    task = get_install_task_status(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.post("/api/apps/uninstall/{slug}")
def api_uninstall_app(slug: str, admin: Dict[str, Any] = Depends(require_admin)):
    success = uninstall_app(slug)
    return {"success": success}


# ----------------- MEDIA & USER PORTAL ----------------- #

@app.get("/api/media/continue-watching")
def api_media_continue_watching():
    return get_continue_watching()

@app.get("/api/media/user-apps")
def api_media_user_apps():
    return get_user_apps()

@app.get("/api/media/stream")
def api_media_stream(path: str, request: Request):
    return stream_video_file(path, request)

@app.get("/api/media/thumbnail")
def api_media_thumbnail(path: str):
    from .media_hub import ensure_video_thumbnail
    from fastapi.responses import Response
    thumb = ensure_video_thumbnail(path)
    if thumb and os.path.exists(thumb):
        return FileResponse(thumb, media_type="image/jpeg")
    svg_fallback = """<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
        <rect width="640" height="360" fill="#0f172a"/>
        <circle cx="320" cy="180" r="40" fill="#f59e0b" opacity="0.2"/>
        <polygon points="310,165 338,180 310,195" fill="#f59e0b"/>
    </svg>"""
    return Response(content=svg_fallback, media_type="image/svg+xml")

class MediaProgressRequest(BaseModel):
    file_path: str
    title: str
    progress: int
    position_sec: float
    duration_sec: float

@app.post("/api/media/progress")
def api_media_progress(req: MediaProgressRequest, user: Optional[Dict[str, Any]] = Depends(get_auth_user)):
    user_id = user["id"] if user else "default"
    upsert_media_progress(req.file_path, req.title, req.progress, req.position_sec, req.duration_sec, user_id=user_id)
    return {"success": True}

# ----------------- EXPOSE / TUNNELS ----------------- #

class CreateTunnelRequest(BaseModel):
    name: str
    target_port: int
    subdomain: Optional[str] = None
    service_id: Optional[str] = None
    protocol: Optional[str] = "https"

@app.get("/api/expose/tunnels")
def api_list_tunnels():
    return {
        "tunnels": list_tunnels(),
        "base_domain": get_setting("base_domain", "lantern.local")
    }

@app.post("/api/expose/create")
def api_create_tunnel(req: CreateTunnelRequest, admin: Dict[str, Any] = Depends(require_admin)):
    tun = create_tunnel(
        name=req.name,
        target_port=req.target_port,
        subdomain=req.subdomain,
        service_id=req.service_id,
        protocol=req.protocol or "https"
    )
    add_activity("globe", "cyan", f"Exposed {tun['name']} to {tun['public_url']}", "Just now")
    return tun

@app.delete("/api/expose/{tunnel_id}")
def api_delete_tunnel(tunnel_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    success = delete_tunnel(tunnel_id)
    return {"success": success}

@app.get("/api/expose/configs")
def api_expose_configs():
    return {
        "cloudflare": generate_cloudflare_config(),
        "caddy": generate_caddy_config()
    }

# ----------------- FILE MANAGER ----------------- #

@app.get("/api/files")
def api_files_list(path: str = Query(default=os.path.expanduser("~")), user: Optional[Dict[str, Any]] = Depends(get_auth_user)):
    return list_directory(path)

def check_file_path_permission(path_str: str, user: Optional[Dict[str, Any]]) -> bool:
    if not user:
        return False
    if user.get("role") == "admin":
        return True
    try:
        target = Path(path_str).resolve()
        home = Path(os.path.expanduser("~")).resolve()
        family_shared = Path(os.path.expanduser("~/.lantern/family_shared")).resolve()
        if family_shared in target.parents or target == family_shared:
            return True
        if home in target.parents or target == home:
            return True
    except Exception:
        pass
    return False

class CreateDirRequest(BaseModel):
    parent_path: str
    name: str

@app.post("/api/files/mkdir")
def api_files_mkdir(req: CreateDirRequest, user: Optional[Dict[str, Any]] = Depends(get_auth_user)):
    if not check_file_path_permission(req.parent_path, user):
        raise HTTPException(status_code=403, detail="Permission denied to create folder in this path")
    return create_directory(req.parent_path, req.name)

class DeleteFileRequest(BaseModel):
    path: str

@app.post("/api/files/delete")
def api_files_delete(req: DeleteFileRequest, user: Optional[Dict[str, Any]] = Depends(get_auth_user)):
    if not check_file_path_permission(req.path, user):
        raise HTTPException(status_code=403, detail="Permission denied to delete this item")
    return delete_item(req.path)

class RenameFileRequest(BaseModel):
    path: str
    new_name: str

@app.post("/api/files/rename")
def api_files_rename(req: RenameFileRequest, user: Optional[Dict[str, Any]] = Depends(get_auth_user)):
    if not check_file_path_permission(req.path, user):
        raise HTTPException(status_code=403, detail="Permission denied to rename this item")
    return rename_item(req.path, req.new_name)

@app.get("/api/files/preview")
def api_files_preview(path: str, user: Optional[Dict[str, Any]] = Depends(get_auth_user)):
    return read_text_file(path)

class SaveFileRequest(BaseModel):
    path: str
    content: str

@app.post("/api/files/save")
def api_files_save(req: SaveFileRequest, user: Optional[Dict[str, Any]] = Depends(get_auth_user)):
    if not check_file_path_permission(req.path, user):
        raise HTTPException(status_code=403, detail="Permission denied to edit this file")
    return write_text_file(req.path, req.content)

@app.post("/api/files/upload")
async def api_files_upload(
    target_path: str = Form(...),
    file: UploadFile = File(...),
    user: Optional[Dict[str, Any]] = Depends(get_auth_user)
):
    if not check_file_path_permission(target_path, user):
        raise HTTPException(status_code=403, detail="Permission denied to upload to this directory")
    dest_dir = Path(target_path).resolve()
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / file.filename
    with open(dest, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    add_activity("file-up", "cyan", f"File uploaded: {file.filename}", "Just now")
    return {"success": True, "filename": file.filename, "path": str(dest)}

@app.get("/api/files/download")
def api_files_download(path: str, user: Optional[Dict[str, Any]] = Depends(get_auth_user)):
    p = Path(path).resolve()
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(p), filename=p.name)

# ----------------- TERMINAL ----------------- #

@app.websocket("/ws/terminal")
async def ws_terminal(websocket: WebSocket):
    # Terminal session with PTY
    await run_pty_session(websocket)

class ExecCommandRequest(BaseModel):
    command: str
    cwd: Optional[str] = None

@app.post("/api/terminal/exec")
def api_terminal_exec(req: ExecCommandRequest, admin: Dict[str, Any] = Depends(require_admin)):
    return exec_command_sync(req.command, req.cwd)

# ----------------- SETTINGS & NOTIFICATIONS ----------------- #

@app.get("/api/settings")
def api_get_settings():
    return {
        "server_name": get_setting("server_name", "Lantern"),
        "tagline": get_setting("tagline", "Your home server, enlightened."),
        "disk_warning_threshold": get_setting("disk_warning_threshold", "85"),
        "disk_critical_threshold": get_setting("disk_critical_threshold", "95"),
        "base_domain": get_setting("base_domain", "lantern.local"),
        "http_port": get_setting("http_port", "8080")
    }

class UpdateSettingsRequest(BaseModel):
    server_name: Optional[str] = None
    tagline: Optional[str] = None
    disk_warning_threshold: Optional[str] = None
    disk_critical_threshold: Optional[str] = None
    base_domain: Optional[str] = None

@app.post("/api/settings")
def api_update_settings(req: UpdateSettingsRequest, admin: Dict[str, Any] = Depends(require_admin)):
    if req.server_name:
        set_setting("server_name", req.server_name)
    if req.tagline:
        set_setting("tagline", req.tagline)
    if req.disk_warning_threshold:
        set_setting("disk_warning_threshold", req.disk_warning_threshold)
    if req.disk_critical_threshold:
        set_setting("disk_critical_threshold", req.disk_critical_threshold)
    if req.base_domain:
        set_setting("base_domain", req.base_domain)
    return {"success": True}

@app.get("/api/notifications")
def api_notifications(limit: int = 20):
    return get_notifications(limit)

# ----------------- STATIC SPA SERVING ----------------- #

CLIENT_DIST = Path(__file__).resolve().parent.parent.parent / "client" / "dist"
if CLIENT_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(CLIENT_DIST / "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        target_file = CLIENT_DIST / full_path
        if target_file.exists() and target_file.is_file():
            return FileResponse(str(target_file))
        return FileResponse(str(CLIENT_DIST / "index.html"))
else:
    @app.get("/")
    def index_placeholder():
        return {
            "name": "Lantern",
            "tagline": "Your home server, enlightened.",
            "status": "ready",
            "port": 8080,
            "docs": "/docs"
        }
