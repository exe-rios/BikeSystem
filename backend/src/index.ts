import 'dotenv/config'; // <-- ESTO CARGA EL .ENV ANTES QUE CUALQUIER OTRO IMPORT
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// RUTAS DEL NEGOCIO
import authRoutes from './routes/auth.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import clienteRoutes from './routes/cliente.routes.js';
import productoRoutes from './routes/producto.routes.js';
import ventaRoutes from './routes/venta.routes.js';
import bicicletaRoutes from './routes/bicicleta.routes.js';
import reparacionRoutes from './routes/reparacion.routes.js';
import detalleReparacionRoutes from './routes/detalleReparacion.routes.js';
import proveedorRoutes from './routes/proveedor.routes.js';
import pagoProveedorRoutes from './routes/pagoProveedor.routes.js';
import reporteRoutes from './routes/reporte.routes.js';
import bitacoraRoutes from './routes/bitacora.routes.js';
import backupRoutes from './routes/backup.routes.js';
import configuracionRoutes from './routes/configuracion.routes.js';
import logsRoutes from './routes/logs.routes.js';

import { manejarErrores } from './middlewares/error.middleware.js';
import { apiLimiter } from './middlewares/rateLimit.middleware.js';
import { escribirLog, registrarPersistenciaLogRemoto } from './utils/logger.js';
import { LogSistemaService } from './services/logSistema.service.js';

import compression from 'compression';
import { cerrarPool } from './config/db.js';
import { asegurarConsumidorFinal } from './crear_consumidor_final.js';
import { asegurarEsquemaProveedoresYMoneda } from './utils/ensureSchema.js';

// Validación de variables de entorno obligatorias (fail-fast)
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Variable de entorno "${key}" no definida. Abortando.`);
    escribirLog('ERROR', 'FATAL', `Variable de entorno "${key}" no definida. Abortando.`);
    process.exit(1);
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// Cabeceras de seguridad HTTP
app.use(helmet());

// Compresión HTTP Gzip/Deflate para optimizar transferencias de payloads
app.use(compression());

// CONFIGURACIÓN DE SEGURIDAD CORS
const ALLOWED_ORIGINS = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:4173',  // Vite preview
  'app://-',                // Electron producción
  'null',                   // Electron file:// en producción
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (Electron, Postman, cURL en dev) o autorizadas
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por política CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para entender JSON (ampliado a 5MB para soportar lotes de carga masiva)
app.use(express.json({ limit: '5mb' }));

// Límite de tasa general para proteger la API
app.use('/api', apiLimiter);

// ENLAZAMOS LAS RUTAS DEL SISTEMA
app.use('/api', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/bicicletas', bicicletaRoutes);
app.use('/api/reparaciones', reparacionRoutes);
app.use('/api/detalle-reparacion', detalleReparacionRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/pagos-proveedores', pagoProveedorRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/bitacora', bitacoraRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/logs', logsRoutes);

// Middleware de captura global de errores
app.use(manejarErrores);

let server: ReturnType<typeof app.listen> | null = null;

async function iniciarServidor() {
  try {
    await asegurarEsquemaProveedoresYMoneda();
    registrarPersistenciaLogRemoto((entrada) => LogSistemaService.guardarLogRemoto(entrada));
    await asegurarConsumidorFinal();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Startup DB]: Error al inicializar esquema/consumidor final:', msg);
    escribirLog('ERROR', 'STARTUP_DB', 'Error al inicializar esquema/consumidor final', err);
  }

  server = app.listen(PORT, HOST, () => {
    console.log(`[Server]: Backend de BikeSystem corriendo en http://${HOST}:${PORT}`);
    escribirLog('INFO', 'SERVER', `Backend iniciado en http://${HOST}:${PORT}`);
  });
}

void iniciarServidor();

// Cierre ordenado (Graceful Shutdown)
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[Server]: Recibida señal ${signal}. Cerrando servidor HTTP y conexiones a PostgreSQL...`);
  escribirLog('INFO', 'SERVER', `Recibida señal ${signal}. Cerrando servidor.`);
  if (server) {
    server.close(async () => {
      console.log('[Server]: Servidor HTTP cerrado.');
      await cerrarPool();
      process.exit(0);
    });
  } else {
    await cerrarPool();
    process.exit(0);
  }
};

process.on('uncaughtException', (err) => {
  console.error('[PROCESS uncaughtException]:', err);
  escribirLog('ERROR', 'PROCESS', 'Excepción no capturada en proceso Node', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[PROCESS unhandledRejection]:', reason);
  escribirLog('ERROR', 'PROCESS', 'Promesa rechazada no manejada', reason);
});

process.on('SIGINT', () => { void gracefulShutdown('SIGINT'); });
process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
