import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Desactivar aceleración por hardware para prevenir congelamientos de pantalla por GPU/drivers en Windows
app.disableHardwareAcceleration();

// Evitar que Chromium suspenda el repintado al calcular oclusión de ventanas en Windows
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

// Definir __dirname manualmente para entornos de módulos ES (ESM)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determinar el entorno
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const preloadMjs = path.join(__dirname, 'preload.mjs');
  const preloadPath = fs.existsSync(preloadMjs) ? preloadMjs : path.join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../src/assets/Fotinhos/iconoDnBike.jpeg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: preloadPath,
      webSecurity: true,
      backgroundThrottling: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // Si estamos en desarrollo, carga la URL del servidor local de Vite
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    // Abre las herramientas del desarrollador por defecto
    win.webContents.openDevTools();
  } else {
    // En producción, carga el archivo HTML empaquetado
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});