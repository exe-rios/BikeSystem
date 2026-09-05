import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DashboardData, Venta, Reparacion } from '../types';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

export function useInicio() {
  const { user } = useAuth();
  const userRole = (user?.rol || 'EMPLEADO').toUpperCase();
  const esAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [ultimasVentas, setUltimasVentas] = useState<Venta[]>([]);
  const [ultimasReparaciones, setUltimasReparaciones] = useState<Reparacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDashboard = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [dataDashboard, dataVentas, dataRep] = await Promise.all([
        api.reportes.getDashboard().catch(() => null),
        api.ventas.getAll().catch(() => ({ total: 0, ventas: [] })),
        api.reparaciones.getAll().catch(() => ({ total: 0, reparaciones: [] }))
      ]);

      if (dataDashboard) {
        setDashboard(dataDashboard);
      }
      setUltimasVentas(dataVentas.ventas?.slice(0, 5) || []);
      setUltimasReparaciones(dataRep.reparaciones?.slice(0, 5) || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar el resumen del dashboard');
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  const totalReparacionesActivas = useMemo(() => {
    return dashboard?.taller_activo?.reduce((acc, t) => acc + Number(t.cantidad), 0) || 0;
  }, [dashboard?.taller_activo]);

  return {
    user,
    esAdmin,
    dashboard,
    ultimasVentas,
    ultimasReparaciones,
    totalReparacionesActivas,
    cargando,
    error,
    recargar: cargarDashboard
  };
}
