import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db';

import usuarioRoutes from './routes/usuario';
import clienteRoutes from './routes/cliente';
import proveedorRoutes from './routes/proveedor';
import productoRoutes from './routes/producto';
import bicicletaRoutes from './routes/bicicleta';
import ventaRoutes from './routes/venta';
import reparacionRoutes from './routes/reparacion';
import ingresoRoutes from './routes/ingreso';
import pagoRoutes from './routes/pago';
import metodoPagoRoutes from './routes/metodoPago';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BikeSystem API is running' });
});

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/bicicletas', bicicletaRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/reparaciones', reparacionRoutes);
app.use('/api/ingresos', ingresoRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/metodos-pago', metodoPagoRoutes);

app.listen(PORT, () => {
  console.log(`[Server]: 🚴 Backend corriendo en http://localhost:${PORT}`);
});
