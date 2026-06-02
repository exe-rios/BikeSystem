import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import usuarioRoutes from './routes/usuario.routes.js';
import clienteRoutes from './routes/cliente.routes.js';
import productoRoutes from './routes/producto.routes.js';
import tallerRoutes from './routes/taller.routes.js';
import ventaRoutes from './routes/venta.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ENLAZAMOS LAS RUTAS DEL SISTEMA
app.use('/api', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/talleres', tallerRoutes);
app.use('/api/ventas', ventaRoutes);

app.listen(PORT, () => {
  console.log(`[Server]: 🚴 Backend de BikeSystem corriendo ordenadamente en http://localhost:${PORT}`);
});