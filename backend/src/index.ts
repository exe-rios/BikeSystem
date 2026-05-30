import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import usuarioRoutes from './routes/usuario.routes.js'; // Nota el uso de .js o .ts dependiendo de tu config de tsx, usualmente con tsx puedes importar indicando el archivo o .js directo. Pon './routes/usuario.routes.js' si usas la convención ESM nativa.

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ENLAZAMOS LAS RUTAS DEL SISTEMA
app.use('/api', authRoutes);         // Las rutas de auth sumarán /api/login, /api/health, etc.
app.use('/api/usuarios', usuarioRoutes); // Las rutas de usuario sumarán /api/usuarios/ y /api/usuarios/registrados

app.listen(PORT, () => {
  console.log(`[Server]: 🚴 Backend de BikeSystem corriendo ordenadamente en http://localhost:${PORT}`);
});