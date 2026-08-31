const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron');
const path = require('path');
const os = require('os');
const http = require('http');
const { spawn, fork } = require('child_process');

let mainWindow = null;
let backendProcess = null;
const BACKEND_PORT = process.env.PORT || 5000;

/**
 * Find the primary non-internal IPv4 LAN address of this computer
 */
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

/**
 * Poll the backend server until it responds to HTTP requests
 */
function waitForBackend(url, timeoutMs = 30000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve(true);
        } else {
          retry();
        }
      });

      req.on('error', () => {
        retry();
      });

      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`Backend at ${url} did not respond within ${timeoutMs}ms`));
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

/**
 * Start the Express backend server
 */
function startBackendServer() {
  const serverPath = path.resolve(__dirname, '../backend/src/server.js');
  const backendCwd = path.resolve(__dirname, '../backend');

  console.log(`[Electron Main] Starting backend server from: ${serverPath}`);

  // Inherit environment variables and ensure PORT is set
  const env = {
    ...process.env,
    PORT: String(BACKEND_PORT),
    NODE_ENV: app.isPackaged ? 'production' : (process.env.NODE_ENV || 'development'),
  };

  try {
    backendProcess = fork(serverPath, [], {
      cwd: backendCwd,
      env,
      silent: false,
    });

    backendProcess.on('error', (err) => {
      console.error('[Electron Backend Process Error]:', err);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`[Electron Backend Process Exited] code: ${code}, signal: ${signal}`);
    });
  } catch (err) {
    console.error('[Electron] Failed to fork backend process:', err);
  }
}

/**
 * Stop the Express backend server
 */
function stopBackendServer() {
  if (backendProcess) {
    console.log('[Electron Main] Terminating backend process...');
    try {
      backendProcess.kill('SIGTERM');
    } catch (_) {}
    backendProcess = null;
  }
}

/**
 * Create the primary desktop window
 */
async function createMainWindow() {
  const localIp = getLocalIpAddress();
  const iconPath = path.resolve(__dirname, '../frontend/public/logo.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: `HANARA SMS — Local Server: http://${localIp}:${BACKEND_PORT}`,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
  });

  // Create standard native menu with Reload and DevTools shortcuts
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: `Open in Browser (http://${localIp}:${BACKEND_PORT})`,
          click: () => shell.openExternal(`http://${localIp}:${BACKEND_PORT}`),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About HANARA SMS',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About HANARA SMS',
              message: 'HANARA Schools Management System',
              detail: `Desktop Edition v1.0.0\nServer IP: http://${localIp}:${BACKEND_PORT}\nAll rights reserved.`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Target URL to load
  const isDev = !app.isPackaged && process.env.VITE_DEV_SERVER_URL;
  const targetUrl = isDev ? process.env.VITE_DEV_SERVER_URL : `http://localhost:${BACKEND_PORT}`;

  try {
    // Wait for backend to respond before opening UI
    await waitForBackend(`http://localhost:${BACKEND_PORT}/api/sync/ping`, 35000).catch(() => {
      console.warn('[Electron Main] Backend ping timed out, attempting to load directly...');
    });

    await mainWindow.loadURL(targetUrl);
  } catch (err) {
    console.error('[Electron Main] Failed to load URL:', err);
    // If initial load failed, retry once after 2 seconds
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(targetUrl);
      }
    }, 2000);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links (target="_blank" or external URLs) in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-local-ip', () => getLocalIpAddress());
ipcMain.handle('open-external', (_event, url) => shell.openExternal(url));

// ── App Lifecycle ─────────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    startBackendServer();
    await createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    stopBackendServer();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    stopBackendServer();
  });
}
