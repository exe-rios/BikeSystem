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
  printWithPreview?: (options?: { title?: string; landscape?: boolean }) => Promise<boolean>;
  openLogsFolder?: () => Promise<boolean>;
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

  if (api.printWithPreview) {
    window.print = (): void => {
      void api.printWithPreview?.();
    };
  }
}

// Reporte silencioso de errores no controlados de interfaz hacia Log_Sistema (con throttle y tope por sesión)
if (typeof window !== 'undefined') {
  const API_BASE_LOGS = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  let ultimoEnvioLogMs = 0;
  let totalLogsEnviados = 0;

  const enviarErrorUiSilencioso = (mensaje: string, detalle?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const ahora = Date.now();
      if (totalLogsEnviados >= 10 || ahora - ultimoEnvioLogMs < 5000) return;

      ultimoEnvioLogMs = ahora;
      totalLogsEnviados++;

      void fetch(`${API_BASE_LOGS}/api/logs/cliente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          nivel: 'ERROR',
          mensaje: mensaje.slice(0, 500),
          detalle: detalle ? detalle.slice(0, 2500) : undefined
        }),
        keepalive: true
      }).catch(() => {});
    } catch {
      // Nunca interrumpir al usuario por fallos al reportar errores UI
    }
  };

  window.addEventListener('error', (event) => {
    const origen = event.filename ? `${event.filename}:${event.lineno || 0}` : '';
    const stack = event.error instanceof Error ? event.error.stack : origen;
    enviarErrorUiSilencioso(event.message || 'Error de ejecución en interfaz', stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const mensaje = reason instanceof Error ? reason.message : String(reason || 'Promesa rechazada sin capturar');
    const detalle = reason instanceof Error ? reason.stack : undefined;
    enviarErrorUiSilencioso(mensaje, detalle);
  });
}

/** Punto de entrada principal para el montaje del árbol React en el DOM. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)