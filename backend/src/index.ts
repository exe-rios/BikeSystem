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

import { manejarErrores } from './middlewares/error.middleware.js';

// Validación de variables de entorno obligatorias (fail-fast)
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[FATAL] Variable de entorno "${key}" no definida. Abortando.`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Cabeceras de seguridad HTTP
app.use(helmet());

// CONFIGURACIÓN DE SEGURIDAD CORS
const ALLOWED_ORIGINS = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:4173',  // Vite preview
  'app://-',                // Electron producción
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (Electron, Postman, cURL en dev)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por política CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para entender JSON (limitado a 1MB para prevenir payloads excesivos)
app.use(express.json({ limit: '1mb' }));

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

// Middleware de captura global de errores
app.use(manejarErrores);

app.listen(PORT, () => {
  console.log(`[Server]: Backend de BikeSystem corriendo en http://localhost:${PORT}`);
});