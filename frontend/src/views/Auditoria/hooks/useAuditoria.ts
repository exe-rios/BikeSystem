import { useState, useEffect, useCallback } from 'react';
import type { BitacoraActividad, ModuloFiltro, BadgeModuloStyle } from '../types';
import { api } from '../../../services/api';

export const MODULOS_AUDITORIA: ModuloFiltro[] = ['todos', 'Ventas', 'Stock', 'Taller', 'Usuarios', 'Clientes'];

export function useAuditoria() {
  const [registros, setRegistros] = useState<BitacoraActividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduloFiltro, setModuloFiltro] = useState<ModuloFiltro>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  const cargarBitacora = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.bitacora.getAll({
        modulo: moduloFiltro !== 'todos' ? moduloFiltro : undefined,
        busqueda: busqueda.trim() || undefined,
        limite: 150
      });
      setRegistros(data.registros || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al consultar la bitácora de auditoría');
      }
    } finally {
      setCargando(false);
    }
  }, [moduloFiltro, busqueda]);

  useEffect(() => {
    cargarBitacora();
  }, [moduloFiltro]);

  const handleBuscar = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    cargarBitacora();
  }, [cargarBitacora]);

  const getModuloBadge = useCallback((modulo: string): BadgeModuloStyle => {
    const mod = (modulo || '').toLowerCase();
    if (mod.includes('venta')) {
      return { bg: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', border: 'rgba(22, 163, 74, 0.25)' };
    }
    if (mod.includes('stock') || mod.includes('producto')) {
      return { bg: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: 'rgba(37, 99, 235, 0.25)' };
    }
    if (mod.includes('taller') || mod.includes('reparaci')) {
      return { bg: 'rgba(147, 51, 234, 0.1)', color: '#9333ea', border: 'rgba(147, 51, 234, 0.25)' };
    }
    if (mod.includes('usuario')) {
      return { bg: 'rgba(245, 158, 11, 0.1)', color: '#b45309', border: 'rgba(245, 158, 11, 0.25)' };
    }
    return { bg: 'rgba(100, 116, 139, 0.1)', color: '#475569', border: 'rgba(100, 116, 139, 0.25)' };
  }, []);

  return {
    registros,
    cargando,
    error,
    moduloFiltro,
    busqueda,
    modulos: MODULOS_AUDITORIA,
    setModuloFiltro,
    setBusqueda,
    handleBuscar,
    getModuloBadge,
    recargar: cargarBitacora
  };
}
