/**
 * BC Container Manager - Electron Main Process
 *
 * This is the main entry point for the Electron app.
 * It creates the browser window and handles IPC communication.
 */

const { app, BrowserWindow, ipcMain, shell, dialog, protocol, net } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const url = require('url');

// Import IPC handlers
const { registerIpcHandlers } = require('./ipc-handlers');

// Keep a global reference of the window object
let mainWindow = null;

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Get the correct path for app resources
 */
function getAppPath() {
  if (isDev) {
    return path.join(__dirname, '..');
  }
  // In production, app.getAppPath() returns the path to the app.asar or unpacked directory
  return app.getAppPath();
}

/**
 * Register custom protocol for serving static files
 * This allows Next.js absolute paths to work in Electron
 */
function registerCustomProtocol() {
  protocol.handle('app', (request) => {
    // Parse the URL and get the path
    const urlObj = new URL(request.url);
    let filePath = urlObj.pathname;

    // Handle root path
    if (filePath === '/' || filePath === '') {
      filePath = '/index.html';
    }

    // Build the full file path
    const outDir = path.join(getAppPath(), 'out');
    let fullPath = path.join(outDir, filePath);

    // Handle directory requests - append index.html
    try {
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        fullPath = path.join(fullPath, 'index.html');
      }
    } catch (e) {
      // File doesn't exist, will be handled below
    }

    // Convert to file:// URL for net.fetch
    const fileUrl = url.pathToFileURL(fullPath).href;

    return net.fetch(fileUrl);
  });
}

/**
 * Creates the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 400,
    title: 'BC Container Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for dockerode
    },
    show: false, // Don't show until ready
    backgroundColor: '#1f2937', // Match app background
  });

  // Load the app
  if (isDev) {
    // In development, load from Next.js dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, use custom protocol for proper path resolution
    mainWindow.loadURL('app://./index.html');
  }

  // Log any load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation to BC web client
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow internal navigation, open BC URLs externally
    if (url.includes('/BC/') || url.includes(':443')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

/**
 * Register all IPC handlers for communication with renderer
 */
function setupIpcHandlers() {
  registerIpcHandlers(ipcMain);

  // Handle PowerShell script execution (for Install-BC-Helper)
  // SECURITY: Whitelist of allowed scripts to prevent path traversal attacks
  const ALLOWED_SCRIPTS = [
    'scripts/Install-BC-Helper.ps1',
    'scripts/Backup-BC-Container.ps1',
    'scripts/Restore-BC-Container.ps1',
  ];

  ipcMain.handle('run-powershell', async (event, { script, args }) => {
    return new Promise((resolve, reject) => {
      // SECURITY: Validate script is in whitelist
      if (!ALLOWED_SCRIPTS.includes(script)) {
        mainWindow?.webContents.send('powershell-output', {
          type: 'stderr',
          data: `[ERROR] Script not allowed: ${script}\n`
        });
        resolve({ stdout: '', stderr: `Script not allowed: ${script}`, exitCode: 1 });
        return;
      }

      // Resolve script path based on dev/prod environment
      let scriptPath;
      if (isDev) {
        scriptPath = path.join(__dirname, '..', script);
      } else {
        // In production, scripts are in extraResources
        scriptPath = path.join(process.resourcesPath, script);
      }

      // Mask sensitive args in debug output
      const safeArgs = args.map((arg, i) => {
        if (i > 0 && args[i - 1] === '-Password') return '********';
        return arg;
      });

      // Log script path for debugging (not args to avoid exposing passwords)
      console.log('PowerShell script path:', scriptPath);
      console.log('Script exists:', require('fs').existsSync(scriptPath));
      mainWindow?.webContents.send('powershell-output', {
        type: 'stdout',
        data: `[DEBUG] Script path: ${scriptPath}\n`
      });
      mainWindow?.webContents.send('powershell-output', {
        type: 'stdout',
        data: `[DEBUG] Args: ${safeArgs.join(' ')}\n`
      });

      // Check if script exists
      if (!require('fs').existsSync(scriptPath)) {
        mainWindow?.webContents.send('powershell-output', {
          type: 'stderr',
          data: `[ERROR] Script not found at: ${scriptPath}\n`
        });
        resolve({ stdout: '', stderr: `Script not found: ${scriptPath}`, exitCode: 1 });
        return;
      }

      const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath,
        ...args
      ]);

      let stdout = '';
      let stderr = '';

      ps.stdout.on('data', (data) => {
        stdout += data.toString();
        // Send real-time output to renderer
        mainWindow?.webContents.send('powershell-output', {
          type: 'stdout',
          data: data.toString()
        });
      });

      ps.stderr.on('data', (data) => {
        stderr += data.toString();
        mainWindow?.webContents.send('powershell-output', {
          type: 'stderr',
          data: data.toString()
        });
      });

      ps.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code });
      });

      ps.on('error', (err) => {
        reject(err);
      });
    });
  });

  // Handle file/folder dialogs
  ipcMain.handle('show-open-dialog', async (event, options) => {
    return dialog.showOpenDialog(mainWindow, options);
  });

  ipcMain.handle('show-save-dialog', async (event, options) => {
    return dialog.showSaveDialog(mainWindow, options);
  });

  // Handle opening external URLs
  ipcMain.handle('open-external', async (event, url) => {
    return shell.openExternal(url);
  });

  // Get app info
  ipcMain.handle('get-app-info', async () => {
    return {
      version: app.getVersion(),
      name: app.getName(),
      platform: process.platform,
      arch: process.arch,
    };
  });
}

// Register the app:// protocol scheme as privileged (must be done before app ready)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// App lifecycle events

app.whenReady().then(() => {
  // Register custom protocol for static file serving
  registerCustomProtocol();

  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep app running until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle certificate errors for self-signed BC containers
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // Allow self-signed certs for local BC containers
  if (url.includes('localhost') || url.includes('bcserver')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus existing window if user tries to open another instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
