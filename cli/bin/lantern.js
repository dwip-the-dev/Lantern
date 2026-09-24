#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const http = require('http');

// Locate directories
const ROOT_DIR = path.resolve(__dirname, '../..');
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');

// Read /etc/lantern/lantern.conf if present
let envConf = {};
const SYS_CONF_FILE = '/etc/lantern/lantern.conf';
if (fs.existsSync(SYS_CONF_FILE)) {
  try {
    const lines = fs.readFileSync(SYS_CONF_FILE, 'utf8').split('\n');
    for (const l of lines) {
      const trimmed = l.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        envConf[k.trim()] = v.join('=').trim();
      }
    }
  } catch (_) {}
}

const DEFAULT_PORT = parseInt(process.env.LANTERN_PORT || envConf.LANTERN_PORT || '8080', 10);
const DEFAULT_HOST = process.env.LANTERN_HOST || envConf.LANTERN_HOST || '0.0.0.0';

// Priority order for data dir:
// 1. LANTERN_DATA_DIR env
// 2. /var/lib/lantern (if exists and writable)
// 3. ~/.lantern
function resolveDataDir() {
  if (process.env.LANTERN_DATA_DIR) return process.env.LANTERN_DATA_DIR;
  if (envConf.LANTERN_DATA_DIR && fs.existsSync(envConf.LANTERN_DATA_DIR)) return envConf.LANTERN_DATA_DIR;
  try {
    if (fs.existsSync('/var/lib/lantern') && fs.accessSync('/var/lib/lantern', fs.constants.W_OK) === undefined) {
      return '/var/lib/lantern';
    }
  } catch (_) {}
  return path.join(os.homedir(), '.lantern');
}

const LANTERN_DATA_DIR = resolveDataDir();
const PID_FILE = path.join(LANTERN_DATA_DIR, 'lantern.pid');
const LOG_FILE = envConf.LANTERN_LOG_DIR ? path.join(envConf.LANTERN_LOG_DIR, 'lantern.log') : path.join(LANTERN_DATA_DIR, 'lantern.log');

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  gold: '\x1b[38;5;220m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[97m'
};

function printBanner() {
  console.log(`
${colors.gold}${colors.bold}  🏮  LANTERN${colors.reset} ${colors.gray}— Your Home Server Enlightened${colors.reset}
  ${colors.dim}Lightweight self-hosted home server dashboard & management layer${colors.reset}
`);
}

function ensureDataDir() {
  if (!fs.existsSync(LANTERN_DATA_DIR)) {
    fs.mkdirSync(LANTERN_DATA_DIR, { recursive: true });
  }
}

function getRunningPid() {
  if (!fs.existsSync(PID_FILE)) return null;
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    process.kill(pid, 0);
    return pid;
  } catch (err) {
    try { fs.unlinkSync(PID_FILE); } catch (_) {}
    return null;
  }
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function requestJson(method, endpoint, body = null, port = DEFAULT_PORT) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: port,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (_) {
          resolve(data);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ---------------- COMMAND HANDLERS ---------------- //

async function cmdInstall() {
  printBanner();
  console.log(`${colors.cyan}► Checking prerequisites...${colors.reset}`);
  
  try {
    const pyVer = execSync('python3 --version', { encoding: 'utf8' }).trim();
    console.log(`  ✔ Found ${pyVer}`);
  } catch (_) {
    console.error(`  ${colors.red}✖ python3 is required.${colors.reset}`);
    process.exit(1);
  }

  console.log(`  ✔ Found Node.js ${process.version}`);
  ensureDataDir();

  const venvDir = path.join(SERVER_DIR, 'venv');
  if (!fs.existsSync(venvDir)) {
    execSync(`python3 -m venv "${venvDir}"`, { stdio: 'inherit' });
  }
  const pipPath = path.join(venvDir, 'bin', 'pip');
  execSync(`"${pipPath}" install -r "${path.join(SERVER_DIR, 'requirements.txt')}"`, { stdio: 'inherit' });

  if (!fs.existsSync(path.join(CLIENT_DIR, 'dist'))) {
    console.log(`\n${colors.cyan}► Compiling client UI bundle...${colors.reset}`);
    execSync(`npm --prefix "${CLIENT_DIR}" install`, { stdio: 'inherit' });
    execSync(`npm --prefix "${CLIENT_DIR}" run build`, { stdio: 'inherit' });
  }

  console.log(`\n${colors.green}${colors.bold}✔ Lantern installation ready!${colors.reset}`);
  console.log(`Run ${colors.gold}lantern start${colors.reset} to ignite dashboard on port ${DEFAULT_PORT}.`);
}

async function cmdStart(args) {
  printBanner();
  const existingPid = getRunningPid();
  if (existingPid) {
    console.log(`${colors.gold}🏮 Lantern is already running (PID: ${existingPid})${colors.reset}`);
    console.log(`Local:   ${colors.cyan}http://localhost:${DEFAULT_PORT}${colors.reset}`);
    console.log(`Wi-Fi:   ${colors.cyan}http://${getLocalIp()}:${DEFAULT_PORT}${colors.reset}`);
    return;
  }

  ensureDataDir();

  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 ? parseInt(args[portIndex + 1], 10) : DEFAULT_PORT;
  const hostIndex = args.indexOf('--host');
  const host = hostIndex !== -1 ? args[hostIndex + 1] : DEFAULT_HOST;
  const isForeground = args.includes('--foreground') || args.includes('-f');

  const venvPython = path.join(SERVER_DIR, 'venv', 'bin', 'python');
  const pythonBin = fs.existsSync(venvPython) ? venvPython : 'python3';
  const runScript = path.join(SERVER_DIR, 'run.py');

  console.log(`${colors.cyan}► Igniting Lantern server on ${host}:${port}...${colors.reset}`);

  const env = {
    ...process.env,
    LANTERN_PORT: String(port),
    LANTERN_HOST: host,
    LANTERN_DATA_DIR
  };

  if (isForeground) {
    const child = spawn(pythonBin, [runScript, '--port', String(port), '--host', host], {
      cwd: SERVER_DIR,
      env,
      stdio: 'inherit'
    });
    child.on('exit', (code) => process.exit(code || 0));
  } else {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    const outLog = fs.openSync(LOG_FILE, 'a');
    const errLog = fs.openSync(LOG_FILE, 'a');

    const child = spawn(pythonBin, [runScript, '--port', String(port), '--host', host], {
      cwd: SERVER_DIR,
      env,
      detached: true,
      stdio: ['ignore', outLog, errLog]
    });

    child.unref();
    fs.writeFileSync(PID_FILE, String(child.pid), 'utf8');

    await new Promise(r => setTimeout(r, 1200));
    const activePid = getRunningPid();

    if (activePid) {
      console.log(`${colors.green}${colors.bold}✔ Lantern running in background!${colors.reset}`);
      console.log(`  ${colors.bold}PID:${colors.reset}     ${activePid}`);
      console.log(`  ${colors.bold}Local:${colors.reset}   ${colors.cyan}http://localhost:${port}${colors.reset}`);
      console.log(`  ${colors.bold}Wi-Fi LAN:${colors.reset} ${colors.cyan}http://${getLocalIp()}:${port}${colors.reset}`);
      console.log(`  ${colors.bold}Logs:${colors.reset}    lantern logs -f\n`);
    } else {
      console.error(`${colors.red}✖ Failed to start. Check logs:${colors.reset} ${LOG_FILE}`);
    }
  }
}

async function cmdStop() {
  printBanner();
  const pid = getRunningPid();
  if (!pid) {
    console.log(`${colors.gold}Lantern is not currently running.${colors.reset}`);
    return;
  }

  console.log(`${colors.cyan}► Stopping Lantern daemon (PID: ${pid})...${colors.reset}`);
  try {
    process.kill(pid, 'SIGTERM');
    let waited = 0;
    while (waited < 5) {
      try {
        process.kill(pid, 0);
        await new Promise(r => setTimeout(r, 500));
        waited += 0.5;
      } catch (_) {
        break;
      }
    }
    try { fs.unlinkSync(PID_FILE); } catch (_) {}
    console.log(`${colors.green}✔ Lantern stopped gracefully.${colors.reset}`);
  } catch (err) {
    console.error(`${colors.red}Failed to stop process ${pid}: ${err.message}${colors.reset}`);
  }
}

async function cmdRestart(args) {
  await cmdStop();
  await new Promise(r => setTimeout(r, 1000));
  await cmdStart(args);
}

async function cmdStatus() {
  printBanner();
  const pid = getRunningPid();
  const isRunning = Boolean(pid);

  console.log(`  ${colors.bold}Status:${colors.reset}       ${isRunning ? `${colors.green}● RUNNING${colors.reset} (PID ${pid})` : `${colors.red}○ STOPPED${colors.reset}`}`);
  console.log(`  ${colors.bold}Local URL:${colors.reset}    ${isRunning ? `${colors.cyan}http://localhost:${DEFAULT_PORT}${colors.reset}` : `${colors.gray}Offline${colors.reset}`}`);
  console.log(`  ${colors.bold}Wi-Fi LAN:${colors.reset}    ${isRunning ? `${colors.cyan}http://${getLocalIp()}:${DEFAULT_PORT}${colors.reset}` : `${colors.gray}Offline${colors.reset}`}`);
  console.log(`  ${colors.bold}Data Path:${colors.reset}    ${LANTERN_DATA_DIR}`);

  if (isRunning) {
    try {
      const stats = await requestJson('GET', '/api/system/stats');
      const info = await requestJson('GET', '/api/system/info');
      const cont = await requestJson('GET', '/api/containers');

      console.log(`\n${colors.bold}  Server Telemetry:${colors.reset}`);
      console.log(`  Host:        ${info.hostname} (${info.os})`);
      console.log(`  Uptime:      ${info.uptime_human}`);
      console.log(`  CPU:         ${Math.round(stats.cpu.percent)}% (${info.cpu_count_logical} cores)`);
      console.log(`  Memory:      ${Math.round(stats.memory.percent)}% (${(stats.memory.used / (1024**3)).toFixed(1)} / ${(stats.memory.total / (1024**3)).toFixed(1)} GB)`);
      if (stats.disks && stats.disks[0]) {
        console.log(`  Disk:        ${Math.round(stats.disks[0].percent)}% used (${(stats.disks[0].free / (1024**3)).toFixed(1)} GB free)`);
      }
      console.log(`  Docker:      ${info.docker_running ? `${colors.green}Active Engine${colors.reset}` : `${colors.gold}Sandbox Engine${colors.reset}`}`);
      console.log(`  Services:    ${cont.containers.length} total (${cont.containers.filter(c => c.status === 'running').length} running)`);
    } catch (_) {
      console.log(`  ${colors.dim}(Server warming up...)${colors.reset}`);
    }
  }
  console.log();
}

async function cmdLogs(args) {
  const follow = args.includes('-f') || args.includes('--follow');
  const numLines = 40;

  if (!fs.existsSync(LOG_FILE)) {
    console.log(`${colors.gold}No log file found at ${LOG_FILE}.${colors.reset}`);
    return;
  }

  if (follow) {
    const tail = spawn('tail', ['-n', String(numLines), '-f', LOG_FILE], { stdio: 'inherit' });
    tail.on('exit', () => process.exit(0));
  } else {
    try {
      const content = execSync(`tail -n ${numLines} "${LOG_FILE}"`, { encoding: 'utf8' });
      console.log(content);
    } catch (_) {
      console.log(fs.readFileSync(LOG_FILE, 'utf8'));
    }
  }
}

async function cmdApps(args) {
  printBanner();
  const subCmd = args[0] || 'list';

  if (subCmd === 'list') {
    try {
      const res = await requestJson('GET', '/api/apps/store');
      console.log(`${colors.bold}Available Apps in Lantern Store:${colors.reset}\n`);
      for (const app of res.catalog) {
        const status = app.is_installed ? `${colors.green}[INSTALLED]${colors.reset}` : `${colors.gray}[Available]${colors.reset}`;
        console.log(`  ${app.icon}  ${colors.bold}${app.name.padEnd(20)}${colors.reset} ${status.padEnd(20)} Port: ${String(app.port).padEnd(6)} ${colors.dim}${app.category}${colors.reset}`);
      }
      console.log(`\nTo install an app: ${colors.gold}lantern apps install <slug>${colors.reset}`);
    } catch (err) {
      console.error(`${colors.red}Could not connect to Lantern server. Ensure 'lantern start' is running.${colors.reset}`);
    }
  } else if (subCmd === 'install') {
    const slug = args[1];
    if (!slug) {
      console.log(`Usage: lantern apps install <slug> (e.g. jellyfin, nextcloud)`);
      return;
    }
    try {
      console.log(`${colors.cyan}► Installing ${slug} via 1-click installer...${colors.reset}`);
      const res = await requestJson('POST', '/api/apps/install', { slug });
      console.log(`${colors.green}✔ ${res.name} installed and running on port ${res.port}!${colors.reset}`);
    } catch (err) {
      console.error(`${colors.red}Install failed: ${err.message}${colors.reset}`);
    }
  }
}

async function cmdExpose(args) {
  printBanner();
  const target = args[0];
  if (!target) {
    console.log(`Usage: lantern expose <port|app-name>`);
    return;
  }
  const port = parseInt(target, 10);
  const name = isNaN(port) ? target : `service-${port}`;
  const targetPort = isNaN(port) ? 8080 : port;

  try {
    const res = await requestJson('POST', '/api/expose/create', {
      name,
      target_port: targetPort,
      subdomain: name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    });
    console.log(`\n${colors.green}${colors.bold}✔ Service Exposed to Internet!${colors.reset}`);
    console.log(`  ${colors.bold}Public URL:${colors.reset} ${colors.gold}${res.public_url}${colors.reset}`);
    console.log(`  ${colors.bold}Local Port:${colors.reset} ${res.target_port}`);
  } catch (err) {
    console.error(`${colors.red}Failed: ${err.message}${colors.reset}`);
  }
}

function printHelp() {
  printBanner();
  console.log(`Usage: ${colors.gold}lantern${colors.reset} <command> [options]

${colors.bold}Commands:${colors.reset}
  ${colors.cyan}start${colors.reset} [--port <port>]    Start Lantern server daemon on 0.0.0.0 (Wi-Fi/LAN)
  ${colors.cyan}start -f${colors.reset}                 Run Lantern server in foreground
  ${colors.cyan}stop${colors.reset}                     Stop Lantern daemon
  ${colors.cyan}restart${colors.reset}                  Restart Lantern daemon
  ${colors.cyan}status${colors.reset}                   View telemetry, IP, PID, and running services
  ${colors.cyan}logs [-f]${colors.reset}                View or stream server logs
  ${colors.cyan}apps list${colors.reset}                List available applications
  ${colors.cyan}apps install <slug>${colors.reset}    1-Click install application
  ${colors.cyan}expose <port|app>${colors.reset}        Publish service to internet with tunnel & SSL
  ${colors.cyan}install${colors.reset}                  Setup dependencies and compile UI bundle

${colors.bold}Examples:${colors.reset}
  lantern start
  lantern status
  lantern expose 8080
  lantern apps install jellyfin
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '-h' || command === '--help') {
    printHelp();
    return;
  }
  if (command === '-v' || command === '--version') {
    console.log('Lantern v0.1.0');
    return;
  }

  switch (command) {
    case 'install':
      await cmdInstall();
      break;
    case 'start':
      await cmdStart(args.slice(1));
      break;
    case 'stop':
      await cmdStop();
      break;
    case 'restart':
      await cmdRestart(args.slice(1));
      break;
    case 'status':
      await cmdStatus();
      break;
    case 'logs':
      await cmdLogs(args.slice(1));
      break;
    case 'apps':
      await cmdApps(args.slice(1));
      break;
    case 'expose':
      await cmdExpose(args.slice(1));
      break;
    default:
      console.log(`${colors.red}Unknown command:${colors.reset} ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
