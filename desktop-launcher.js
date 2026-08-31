const os = require('os');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');

// Determine execution root
const appDir = path.resolve(__dirname);
const backendDir = path.join(appDir, 'backend');

// Automatically configure environment if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '5000';

function getLocalIpAddress() {
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

const localIp = getLocalIpAddress();
const port = process.env.PORT;

console.log('================================================================');
console.log('        HANARA Schools Management System — Desktop Server       ');
console.log('================================================================');
console.log(` [Local Access]       : http://localhost:${port}`);
console.log(` [School Wi-Fi / LAN] : http://${localIp}:${port}`);
console.log('================================================================');

// Launch Backend API & Static Frontend Server
let backendProcess = null;
try {
  const serverEntry = path.join(backendDir, 'src', 'server.js');
  const env = {
    ...process.env,
    PORT: String(port),
    NODE_ENV: process.env.NODE_ENV || 'production',
  };

  // Spawn node in backend working directory so backend dependencies (dotenv, mongoose, etc.) resolve properly
  backendProcess = spawn('node', [serverEntry], {
    cwd: backendDir,
    env,
    stdio: 'inherit',
    shell: true,
  });

  backendProcess.on('error', () => {
    // Fallback to bun if node is not directly in PATH
    backendProcess = spawn('bun', ['src/server.js'], {
      cwd: backendDir,
      env,
      stdio: 'inherit',
      shell: true,
    });
    backendProcess.on('error', (err) => {
      console.error('❌ Failed to launch backend server:', err);
    });
  });
} catch (err) {
  console.error('❌ Failed to launch backend server:', err);
}

process.on('SIGINT', () => {
  if (backendProcess) {
    try { backendProcess.kill(); } catch (_) {}
  }
  process.exit();
});

process.on('exit', () => {
  if (backendProcess) {
    try { backendProcess.kill(); } catch (_) {}
  }
});

// Launch Desktop Application Window
function openDesktopApp() {
  const targetUrl = `http://localhost:${port}`;
  console.log(`[Desktop] Opening application window at: ${targetUrl}`);

  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  let launched = false;
  for (const exePath of edgePaths) {
    if (fs.existsSync(exePath)) {
      try {
        spawn(exePath, [
          `--app=${targetUrl}`,
          '--window-size=1440,900',
          '--start-maximized',
        ], {
          detached: true,
          stdio: 'ignore',
        }).unref();
        launched = true;
        break;
      } catch (_) {}
    }
  }

  // Fallback to default browser
  if (!launched) {
    exec(`start "" "${targetUrl}"`);
  }
}

// Allow server 1.5 seconds to initialize database connection, then open UI
setTimeout(openDesktopApp, 1500);

// Prevent console from exiting
process.stdin.resume();
