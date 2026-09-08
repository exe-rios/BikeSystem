import { contextBridge } from 'electron';

/** Expone de forma segura variables del entorno de Electron a la ventana de renderizado. */
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
