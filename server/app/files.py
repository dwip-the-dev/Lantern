import os
import shutil
import stat
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

FAMILY_SHARED_PATH = os.path.expanduser("~/.lantern/family_shared")
for _sub in ["Photos", "Movies", "Documents", "Music", "Kids"]:
    os.makedirs(os.path.join(FAMILY_SHARED_PATH, _sub), exist_ok=True)

DEFAULT_ROOTS = [
    {"name": "Family Shared", "path": FAMILY_SHARED_PATH, "icon": "users"},
    {"name": "Home", "path": os.path.expanduser("~"), "icon": "home"},
    {"name": "Videos", "path": os.path.expanduser("~/Videos"), "icon": "film"},
    {"name": "Downloads", "path": os.path.expanduser("~/Downloads"), "icon": "download"},
    {"name": "Documents", "path": os.path.expanduser("~/Documents"), "icon": "file-text"},
    {"name": "Projects", "path": os.path.expanduser("~/Projects"), "icon": "folder-code"},
    {"name": "System Root", "path": "/", "icon": "hard-drive"}
]

def format_size(size_bytes: int) -> str:
    if size_bytes == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    size = float(size_bytes)
    while size >= 1024.0 and i < len(units) - 1:
        size /= 1024.0
        i += 1
    return f"{round(size, 1)} {units[i]}"

def get_bookmarks() -> List[Dict[str, str]]:
    roots = []
    for r in DEFAULT_ROOTS:
        if os.path.exists(r["path"]):
            roots.append(r)
    return roots

def list_directory(target_path: str) -> Dict[str, Any]:
    expanded = os.path.expanduser(target_path)
    p = Path(expanded).resolve()
    if not p.exists():
        p = Path(os.path.expanduser("~")).resolve()

    items = []
    parent = str(p.parent) if p != p.parent else None

    try:
        with os.scandir(p) as entries:
            for entry in entries:
                try:
                    s = entry.stat(follow_symlinks=False)
                    is_dir = entry.is_dir(follow_symlinks=False)
                    ext = entry.name.split(".")[-1].lower() if not is_dir and "." in entry.name else ""
                    
                    items.append({
                        "name": entry.name,
                        "path": entry.path,
                        "is_dir": is_dir,
                        "size": s.st_size if not is_dir else 0,
                        "size_human": format_size(s.st_size) if not is_dir else "--",
                        "modified": s.st_mtime,
                        "modified_human": datetime.fromtimestamp(s.st_mtime).strftime("%b %d, %Y %H:%M"),
                        "extension": ext
                    })
                except (PermissionError, OSError):
                    continue
    except PermissionError:
        return {
            "current_path": str(p),
            "parent_path": parent,
            "error": "Permission denied reading this directory",
            "items": []
        }

    # Sort directories first, then alphabetical
    items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

    return {
        "current_path": str(p),
        "parent_path": parent,
        "items": items,
        "bookmarks": get_bookmarks()
    }

def create_directory(parent_path: str, name: str) -> Dict[str, Any]:
    p = Path(parent_path).resolve() / name.strip()
    p.mkdir(parents=True, exist_ok=True)
    return {"success": True, "path": str(p)}

def delete_item(item_path: str) -> Dict[str, Any]:
    p = Path(item_path).resolve()
    if not p.exists():
        return {"success": False, "error": "Item does not exist"}
    
    # Safety: don't allow deleting root or home dir itself
    if p in [Path("/"), Path(os.path.expanduser("~"))]:
        return {"success": False, "error": "Cannot delete root system or home directory"}

    if p.is_dir():
        shutil.rmtree(p)
    else:
        p.unlink()
    return {"success": True}

def rename_item(item_path: str, new_name: str) -> Dict[str, Any]:
    p = Path(item_path).resolve()
    if not p.exists():
        return {"success": False, "error": "Item not found"}
    dest = p.parent / new_name.strip()
    p.rename(dest)
    return {"success": True, "new_path": str(dest)}

def read_text_file(file_path: str, max_bytes: int = 1024 * 1024) -> Dict[str, Any]:
    p = Path(file_path).resolve()
    if not p.exists() or not p.is_file():
        return {"error": "File does not exist"}
    
    if p.stat().st_size > max_bytes:
        return {"error": "File too large to preview in editor (limit 1MB)"}

    try:
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return {"content": content, "path": str(p), "name": p.name}
    except Exception as e:
        return {"error": str(e)}

def write_text_file(file_path: str, content: str) -> Dict[str, Any]:
    p = Path(file_path).resolve()
    with open(p, "w", encoding="utf-8") as f:
        f.write(content)
    return {"success": True, "path": str(p)}
