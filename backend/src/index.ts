import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Inicializamos dotenv lo antes posible
dotenv.config();

// RUTAS DEL NEGOCIO
import authRoutes from './routes/auth.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import clienteRoutes from './routes/cliente.routes.js';
import productoRoutes from './routes/producto.routes.js';
import ventaRoutes from './routes/venta.routes.js';
import bicicletaRoutes from './routes/bicicleta.routes.js';
import reparacionRoutes from './routes/reparacion.routes.js';
import tallerRoutes from './routes/taller.routes.js';
import detalleReparacionRoutes from './routes/detalleReparacion.routes.js';
import proveedorRoutes from './routes/proveedor.routes.js';
import ingresoRoutes from './routes/ingreso.routes.js';
import pagoProveedorRoutes from './routes/pagoProveedor.routes.js';
import reporteRoutes from './routes/reporte.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURACIÓN DE SEGURIDAD CORS
// ==========================================
app.use(cors({
    origin: '*', // Permite conexiones desde el frontend de tu compañero en desarrollo
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para entender JSON
app.use(express.json());

// ==========================================
// ENLAZAMOS LAS RUTAS DEL SISTEMA
// ==========================================
app.use('/api', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/bicicletas', bicicletaRoutes);
app.use('/api/reparaciones', reparacionRoutes);
app.use('/api/talleres', tallerRoutes);
app.use('/api/detalle-reparacion', detalleReparacionRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/ingresos', ingresoRoutes);
app.use('/api/pagos-proveedores', pagoProveedorRoutes);
app.use('/api/reportes', reporteRoutes);
app.listen(PORT, () => {
  console.log(`[Server]: 🚴 Backend de BikeSystem corriendo ordenadamente en http://localhost:${PORT}`);
});