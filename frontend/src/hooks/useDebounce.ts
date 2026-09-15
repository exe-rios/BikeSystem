import { useState, useEffect } from 'react';

/**
 * Retrasa la actualización de un valor hasta que haya transcurrido un tiempo de espera especificado (delay).
 * Ideal para búsquedas en tiempo real para evitar solicitudes excesivas por cada pulsación de tecla.
 * 
 * @param value Valor reactivo a amortiguar
 * @param delay Tiempo de espera en milisegundos (por defecto 300ms)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
