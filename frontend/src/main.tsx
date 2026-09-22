import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Interceptar llamadas nativas de confirm y alert en Electron para evitar el congelamiento de foco en Windows
interface ElectronAPI {
  platform: string;
  showMessageBoxSync: (options: {
    type?: 'none' | 'info' | 'error' | 'question' | 'warning';
    title?: string;
    message: string;
    buttons?: string[];
    defaultId?: number;
    cancelId?: number;
  }) => number;
  refocus: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

if (typeof window !== 'undefined' && window.electronAPI?.showMessageBoxSync) {
  const api = window.electronAPI;

  window.confirm = (message?: string): boolean => {
    const result = api.showMessageBoxSync({
      type: 'question',
      title: 'Confirmación - BikeSystem',
      message: message || '¿Deseas continuar?',
      buttons: ['Aceptar', 'Cancelar'],
      defaultId: 0,
      cancelId: 1
    });
    return result === 0;
  };

  window.alert = (message?: string): void => {
    api.showMessageBoxSync({
      type: 'info',
      title: 'BikeSystem',
      message: message || '',
      buttons: ['Aceptar'],
      defaultId: 0
    });
  };

  window.addEventListener('focus', () => {
    api.refocus();
  });
}

/** Punto de entrada principal para el montaje del árbol React en el DOM. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)