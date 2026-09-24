import os
import pty
import select
import termios
import struct
import fcntl
import asyncio
import subprocess
from fastapi import WebSocket, WebSocketDisconnect

async def run_pty_session(websocket: WebSocket):
    await websocket.accept()
    
    # Fork a pseudo-terminal
    pid, master_fd = pty.fork()
    
    if pid == 0:
        # Child process: exec shell
        env = os.environ.copy()
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        shell = os.environ.get("SHELL", "/bin/bash")
        if not os.path.exists(shell):
            shell = "/bin/sh"
        os.execvpe(shell, [shell], env)
    else:
        # Parent process: bridge WebSocket and master_fd
        loop = asyncio.get_event_loop()
        
        def read_from_pty():
            try:
                return os.read(master_fd, 1024)
            except (OSError, IOError):
                return b""

        async def pty_reader():
            while True:
                data = await loop.run_in_executor(None, read_from_pty)
                if not data:
                    break
                try:
                    await websocket.send_bytes(data)
                except Exception:
                    break

        reader_task = asyncio.create_task(pty_reader())
        
        try:
            while True:
                msg = await websocket.receive()
                if "bytes" in msg and msg["bytes"]:
                    os.write(master_fd, msg["bytes"])
                elif "text" in msg and msg["text"]:
                    text = msg["text"]
                    # Check if it's a resize command JSON
                    if text.startswith("{") and "cols" in text:
                        try:
                            import json
                            parsed = json.loads(text)
                            if parsed.get("type") == "resize":
                                cols = parsed.get("cols", 80)
                                rows = parsed.get("rows", 24)
                                winsize = struct.pack("HHHH", rows, cols, 0, 0)
                                fcntl.ioctl(master_fd, termios.TIOCSWINSZ, winsize)
                                continue
                        except Exception:
                            pass
                    os.write(master_fd, text.encode("utf-8"))
        except WebSocketDisconnect:
            pass
        finally:
            reader_task.cancel()
            try:
                os.close(master_fd)
                os.kill(pid, 9)
                os.waitpid(pid, 0)
            except Exception:
                pass

def exec_command_sync(command: str, cwd: str = None) -> dict:
    """Fallback command execution for quick scripts."""
    try:
        res = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=10,
            cwd=cwd or os.path.expanduser("~")
        )
        return {
            "stdout": res.stdout,
            "stderr": res.stderr,
            "exit_code": res.returncode
        }
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "Command timed out (10s)", "exit_code": 124}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": 1}
