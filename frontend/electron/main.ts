import { app, BrowserWindow, shell, Menu, utilityProcess, dialog, ipcMain } from 'electron';
import type { UtilityProcess } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Switches de Chromium para prevenir congelamientos de repintado y pérdida de foco en Windows
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// Definir __dirname manualmente para entornos de módulos ES (ESM)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let backendProcess: UtilityProcess | null = null;

/** Resuelve la ruta al script server.cjs compilado según el entorno. */
function getBackendPath(): string | null {
  // 1. En producción empaquetado (resources/backend/server.cjs)
  const prodPath = path.join(process.resourcesPath, 'backend', 'server.cjs');
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  // 2. En modo monorepo local
  const devPath = path.resolve(__dirname, '../../backend/dist/server.cjs');
  if (fs.existsSync(devPath)) {
    return devPath;
  }

  return null;
}

/** Inicia el servidor Express en un subproceso de Node gestionado por Electron. */
function startBackendServer() {
  const serverPath = getBackendPath();
  if (!serverPath) {
    console.warn('[Electron] Binario del backend no encontrado. Omitiendo arranque automático.');
    return;
  }

  try {
    const backendDir = path.dirname(serverPath);
    backendProcess = utilityProcess.fork(serverPath, [], {
      cwd: backendDir,
      env: {
        ...process.env,
        PORT: '3000'
      }
    });

    backendProcess.on('spawn', () => {
      console.log('[Electron] Servidor Express iniciado con éxito en segundo plano.');
    });

    backendProcess.on('exit', (code: number) => {
      console.log(`[Electron] Servidor Express finalizó con código: ${code}`);
      backendProcess = null;
    });
  } catch (error) {
    console.error('[Electron] Error al iniciar el servidor Express:', error);
  }
}

/** Termina el subproceso del servidor Express al cerrar la aplicación. */
function stopBackendServer() {
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch {
      // Ignorar errores al matar proceso
    }
    backendProcess = null;
  }
}

/** Resuelve la ruta al ícono de la aplicación según el entorno (producción empaquetada o desarrollo). */
function getAppIcon(): string {
  // 1. En producción empaquetada (dist/icon.ico)
  const prodPath = path.join(__dirname, '../dist/icon.ico');
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  // 2. En modo desarrollo (public/icon.ico)
  const devPath = path.join(__dirname, '../public/icon.ico');
  if (fs.existsSync(devPath)) {
    return devPath;
  }

  // 3. Fallback a la imagen original
  return path.join(__dirname, '../src/assets/Fotinhos/iconoDnBike.jpeg');
}

/** Inicializa y configura la ventana principal de escritorio con restricciones de seguridad. */
function createWindow() {
  const preloadMjs = path.join(__dirname, 'preload.mjs');
  const preloadPath = fs.existsSync(preloadMjs) ? preloadMjs : path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    icon: getAppIcon(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: preloadPath,
      webSecurity: true,
      backgroundThrottling: false,
      devTools: false
    }
  });

  const win = mainWindow;

  // Garantizar que Chromium reciba el foco al activar o restaurar la ventana en Windows
  win.on('focus', () => {
    win.webContents.focus();
  });

  win.on('restore', () => {
    win.webContents.invalidate();
    win.webContents.focus();
  });

  win.on('show', () => {
    win.webContents.focus();
  });

  win.on('closed', () => {
    mainWindow = null;
  });

  // Remover la barra de menú superior por defecto de Windows
  win.setMenu(null);

  // Prevenir creación no autorizada de nuevas ventanas emergentes y delegar links externos al navegador del sistema
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevenir navegación fuera de la aplicación autorizada
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (process.env.VITE_DEV_SERVER_URL) {
        const devServerUrl = new URL(process.env.VITE_DEV_SERVER_URL);
        if (parsedUrl.origin !== devServerUrl.origin) {
          event.preventDefault();
        }
      } else if (parsedUrl.protocol !== 'file:') {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  // Bloquear recarga accidental y atajos de DevTools (F12, Ctrl+Shift+I)
  win.webContents.on('before-input-event', (event, input) => {
    const esRecarga = input.key === 'F5' || ((input.control || input.meta) && input.key.toLowerCase() === 'r');
    const esDevTools = input.key === 'F12' || ((input.control || input.meta) && input.shift && (input.key.toLowerCase() === 'i' || input.key.toLowerCase() === 'j'));

    if (esDevTools) {
      event.preventDefault();
    } else if (esRecarga && !process.env.VITE_DEV_SERVER_URL) {
      event.preventDefault();
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // En desarrollo, carga la URL del servidor local de Vite
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // En producción, carga el archivo HTML empaquetado
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Handlers IPC para diálogos nativos seguros que no rompen el foco de entrada en Windows
ipcMain.on('dialog:showMessageBoxSync', (event, options) => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    event.returnValue = 0;
    return;
  }

  const result = dialog.showMessageBoxSync(mainWindow, {
    type: options?.type || 'info',
    title: options?.title || 'BikeSystem',
    message: options?.message || '',
    buttons: options?.buttons && options.buttons.length > 0 ? options.buttons : ['Aceptar'],
    defaultId: options?.defaultId ?? 0,
    cancelId: options?.cancelId ?? 0,
    noLink: true
  });

  // Forzar restitución inmediata del foco de entrada tras el cierre del diálogo
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    mainWindow.webContents.focus();
  }

  event.returnValue = result;
});

ipcMain.on('window:refocus', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    mainWindow.webContents.focus();
  }
});

app.whenReady().then(() => {
  // Desactivar el menú global de la aplicación
  Menu.setApplicationMenu(null);

  // En producción (cuando no hay servidor Vite de desarrollo), iniciar el backend local en segundo plano
  if (!process.env.VITE_DEV_SERVER_URL) {
    startBackendServer();
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  stopBackendServer();
});

app.on('window-all-closed', () => {
  stopBackendServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});