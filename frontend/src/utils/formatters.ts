/**
 * Utilidades centralizadas de formateo de datos para BikeSystem (Moneda argentina y Fechas).
 */

/**
 * Formatea un valor numérico como moneda en pesos argentinos ($).
 * Soporta números, strings numéricos, null o undefined de forma segura.
 * Por defecto formatea sin decimales (ej: "$1.500") o con 2 decimales si se solicita (ej: "$1.500,00").
 */
export function formatearMoneda(
  monto: number | string | null | undefined,
  opciones?: { conDecimales?: boolean; espacio?: boolean }
): string {
  if (monto === null || monto === undefined || monto === '') {
    return opciones?.espacio ? '$ 0' : '$0';
  }

  const num = typeof monto === 'number' ? monto : Number(monto);
  if (isNaN(num)) {
    return opciones?.espacio ? '$ 0' : '$0';
  }

  const textoNumero = opciones?.conDecimales
    ? num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : num.toLocaleString('es-AR');

  return opciones?.espacio ? `$ ${textoNumero}` : `$${textoNumero}`;
}

/**
 * Formatea una fecha a formato local argentino corto (dd/mm/aaaa).
 * Si la fecha es nula, vacía o inválida, devuelve el texto de fallback provisto.
 */
export function formatearFecha(
  fecha: string | Date | null | undefined,
  fallback = 'N/D'
): string {
  if (!fecha) return fallback;
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('es-AR');
}

/**
 * Formatea fecha y hora combinadas en formato local argentino.
 */
export function formatearFechaHora(
  fecha: string | Date | null | undefined,
  fallback = 'N/D',
  opciones?: Intl.DateTimeFormatOptions
): string {
  if (!fecha) return fallback;
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString('es-AR', opciones || { dateStyle: 'short', timeStyle: 'medium' });
}
