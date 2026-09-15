import { BadRequestError } from './errors.js';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DNI_REGEX = /^\d{7,10}$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valida y convierte un identificador numérico (ID) proveniente de parámetros de ruta o body.
 * Lanza BadRequestError si el valor no es un número válido o es menor o igual a cero.
 */
export const validarId = (valor: unknown, mensajeError = 'ID no válido'): number => {
  const num = Number(valor);
  if (isNaN(num) || num <= 0) {
    throw new BadRequestError(mensajeError);
  }
  return num;
};

/**
 * Valida un ID numérico opcional. Retorna undefined si el valor es nulo o no está definido.
 */
export const validarIdOpcional = (valor: unknown, mensajeError = 'ID no válido'): number | undefined => {
  if (valor === undefined || valor === null || valor === '') {
    return undefined;
  }
  return validarId(valor, mensajeError);
};

/**
 * Valida el formato de un correo electrónico si está presente.
 */
export const validarEmail = (email: unknown, mensajeError = 'El email no es válido. Ejemplo: nombre@correo.com'): string | undefined => {
  if (email === undefined || email === null || email === '') return undefined;
  const emailLimpio = String(email).trim();
  if (!EMAIL_REGEX.test(emailLimpio)) {
    throw new BadRequestError(mensajeError);
  }
  return emailLimpio;
};

/**
 * Valida que una cadena cumpla con el formato de DNI argentino (7 a 10 dígitos numéricos).
 */
export const validarDni = (dni: unknown, mensajeError = 'El DNI debe tener entre 7 y 10 números, sin puntos ni espacios.'): string => {
  if (!dni || typeof dni !== 'string' || !DNI_REGEX.test(dni.trim())) {
    throw new BadRequestError(mensajeError);
  }
  return dni.trim();
};
