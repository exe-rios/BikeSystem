import { contextBridge, ipcRenderer } from 'electron';

export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning';
  title?: string;
  message: string;
  buttons?: string[];
  defaultId?: number;
  cancelId?: number;
}

/** Expone de forma segura variables del entorno de Electron a la ventana de renderizado. */
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  showMessageBoxSync: (options: MessageBoxOptions): number => {
    return ipcRenderer.sendSync('dialog:showMessageBoxSync', options);
  },
  refocus: (): void => {
    ipcRenderer.send('window:refocus');
  }
});
