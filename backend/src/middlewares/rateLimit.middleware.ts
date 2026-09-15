import rateLimit from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';

/** Límite de tasa para endpoints de autenticación (previene ataques de fuerza bruta). */
export const loginLimiter = rateLimit({
  windowMs: isProd ? 15 * 60 * 1000 : 60 * 1000,
  max: isProd ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos. Esperá un momento e intentá de nuevo.'
  }
});

/** Límite general de peticiones por IP para salvaguardar el servidor. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Estás enviando demasiadas solicitudes. Esperá un momento.'
  }
});
