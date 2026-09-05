import rateLimit from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';

// Limitar intentos de login: en producción 5 intentos / 15 min; en desarrollo permisivo para pruebas
export const loginLimiter = rateLimit({
  windowMs: isProd ? 15 * 60 * 1000 : 60 * 1000,
  max: isProd ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos. Esperá un momento e intentá de nuevo.'
  }
});

// Limiter general de API: 100 peticiones por minuto por IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Estás enviando demasiadas solicitudes. Esperá un momento.'
  }
});
