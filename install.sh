#!/usr/bin/env bash
set -e

# Terminal Colors
GOLD='\033[38;5;220m'
CYAN='\033[36m'
GREEN='\033[32m'
RED='\033[31m'
AMBER='\033[38;5;214m'
NC='\033[0m'

echo -e "${GOLD}"
cat << "EOF"
  🏮  LANTERN — Your Home Server Enlightened
  Production Homelab OS & Management Layer
EOF
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IS_ROOT=0
if [ "$EUID" -eq 0 ]; then
  IS_ROOT=1
fi

echo -e "${CYAN}► Checking runtime prerequisites...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}✖ Node.js is required (v18+). Please install Node.js.${NC}"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo -e "${RED}✖ Python 3 is required. Please install Python 3.${NC}"; exit 1; }
echo -e "  ✔ Found $(node --version)"
echo -e "  ✔ Found $(python3 --version)"

# Check Docker availability
if command -v docker >/dev/null 2>&1; then
  echo -e "  ✔ Docker CLI detected"
else
  echo -e "  ${AMBER}! Docker not detected. Lantern will use native process sandbox runner.${NC}"
fi

# Directory paths setup
if [ "$IS_ROOT" -eq 1 ]; then
  SYS_CONF_DIR="/etc/lantern"
  SYS_DATA_DIR="/var/lib/lantern"
  SYS_LOG_DIR="/var/log/lantern"
  SYS_BIN="/usr/local/bin/lantern"

  echo -e "\n${CYAN}► Creating system service directories...${NC}"
  mkdir -p "${SYS_CONF_DIR}"
  mkdir -p "${SYS_DATA_DIR}"
  mkdir -p "${SYS_LOG_DIR}"

  # Default config
  cat > "${SYS_CONF_DIR}/lantern.conf" << EOF
# Lantern Home Server Configuration
LANTERN_HOST=0.0.0.0
LANTERN_PORT=8080
LANTERN_DATA_DIR=${SYS_DATA_DIR}
LANTERN_LOG_DIR=${SYS_LOG_DIR}
EOF
  echo -e "  ✔ Configuration: ${SYS_CONF_DIR}/lantern.conf"
  echo -e "  ✔ Data Storage:  ${SYS_DATA_DIR}"
  echo -e "  ✔ Logs Path:     ${SYS_LOG_DIR}"

else
  SYS_CONF_DIR="${HOME}/.config/lantern"
  SYS_DATA_DIR="${HOME}/.lantern"
  SYS_LOG_DIR="${HOME}/.lantern/logs"
  SYS_BIN="${HOME}/.local/bin/lantern"

  echo -e "\n${AMBER}! Running without sudo. Installing in user profile...${NC}"
  echo -e "${AMBER}  (Tip: Run 'sudo ./install.sh' for full system-wide /etc, /var/lib, and systemd service)${NC}\n"
  mkdir -p "${SYS_CONF_DIR}"
  mkdir -p "${SYS_DATA_DIR}"
  mkdir -p "${SYS_LOG_DIR}"
  mkdir -p "${HOME}/.local/bin"
fi

# Set up Python venv
echo -e "\n${CYAN}► Setting up Python virtual environment...${NC}"
VENV_DIR="${SCRIPT_DIR}/server/venv"
if [ ! -d "${VENV_DIR}" ]; then
  python3 -m venv "${VENV_DIR}"
fi
"${VENV_DIR}/bin/pip" install -q --upgrade pip
"${VENV_DIR}/bin/pip" install -q -r "${SCRIPT_DIR}/server/requirements.txt"
echo -e "  ✔ Backend dependencies ready."

# Compile React Client
echo -e "\n${CYAN}► Verifying production client bundle...${NC}"
if [ ! -d "${SCRIPT_DIR}/client/dist" ]; then
  npm --prefix "${SCRIPT_DIR}/client" install
  npm --prefix "${SCRIPT_DIR}/client" run build
fi
echo -e "  ✔ Client UI bundle ready."

# Install CLI symlink
echo -e "\n${CYAN}► Linking 'lantern' CLI command...${NC}"
CLI_EXEC="${SCRIPT_DIR}/cli/bin/lantern.js"
chmod +x "${CLI_EXEC}"
ln -sf "${CLI_EXEC}" "${SYS_BIN}"
echo -e "  ✔ Linked executable to ${SYS_BIN}"

# Systemd Service Installation
if [ "$IS_ROOT" -eq 1 ] && command -v systemctl >/dev/null 2>&1; then
  echo -e "\n${CYAN}► Installing systemd service: lantern.service...${NC}"
  cat > /etc/systemd/system/lantern.service << EOF
[Unit]
Description=Lantern Home Server OS & Dashboard
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=-/etc/lantern/lantern.conf
ExecStart=/usr/local/bin/lantern start -f --port 8080 --host 0.0.0.0
Restart=always
RestartSec=3
WorkingDirectory=${SCRIPT_DIR}

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now lantern.service
  echo -e "  ✔ Enabled and started lantern.service via systemd"
fi

# Discover LAN IP
LAN_IP=$(ip -4 route get 8.8.8.8 2>/dev/null | awk '{print $7}' || echo "127.0.0.1")

echo -e "\n${GREEN}${GOLD}====================================================${NC}"
echo -e "${GREEN}${GOLD}  🏮  LANTERN INSTALLED & ENLIGHTENED SUCCESSFULLY!  ${NC}"
echo -e "${GREEN}${GOLD}====================================================${NC}"
echo -e "  ${GOLD}Local Dashboard:${NC}   http://localhost:8080"
echo -e "  ${GOLD}Wi-Fi / LAN Access:${NC} http://${LAN_IP}:8080"
echo -e "  ${GOLD}Default Login:${NC}     admin / admin123 (or Guest Mode)"
echo -e "  ${GOLD}CLI Commands:${NC}      lantern status, lantern apps, lantern expose"
echo -e "${GREEN}${GOLD}====================================================${NC}\n"
