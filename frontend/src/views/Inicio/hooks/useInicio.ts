import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DashboardData, Venta, Reparacion } from '../types';
import type { PagoProveedorPendiente, MetodoPago } from '../../../types';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

/** Hook para la carga y agregación de indicadores del dashboard de inicio. */
export function useInicio() {
  const { user } = useAuth();
  const userRole = (user?.rol || 'EMPLEADO').toUpperCase();
  const esAdmin = userRole === 'ADMIN' || userRole === 'SUPERADMIN';

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [ultimasVentas, setUltimasVentas] = useState<Venta[]>([]);
  const [ultimasReparaciones, setUltimasReparaciones] = useState<Reparacion[]>([]);
  const [pagosPendientes, setPagosPendientes] = useState<PagoProveedorPendiente[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDashboard = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resDashboard, resVentas, resRep, resPendientes, resMetodos] = await Promise.allSettled([
        api.reportes.getDashboard(),
        api.ventas.getAll({ limite: 5 }),
        api.reparaciones.getAll({ limite: 5 }),
        esAdmin ? api.pagosProveedores.getPendientes() : Promise.resolve({ total: 0, pendientes: [] as PagoProveedorPendiente[] }),
        esAdmin ? api.pagosProveedores.getMetodosPago() : Promise.resolve([] as MetodoPago[])
      ]);

      setDashboard(resDashboard.status === 'fulfilled' ? resDashboard.value : null);
      setUltimasVentas(resVentas.status === 'fulfilled' ? (resVentas.value.ventas?.slice(0, 5) || []) : []);
      setUltimasReparaciones(resRep.status === 'fulfilled' ? (resRep.value.reparaciones?.slice(0, 5) || []) : []);
      setPagosPendientes(
        resPendientes.status === 'fulfilled' && Array.isArray(resPendientes.value?.pendientes)
          ? resPendientes.value.pendientes
          : []
      );
      setMetodosPago(
        resMetodos.status === 'fulfilled' && Array.isArray(resMetodos.value)
          ? resMetodos.value
          : []
      );

      if (resDashboard.status === 'rejected') {
        const reason = resDashboard.reason;
        setError(
          reason instanceof Error
            ? reason.message
            : 'No se pudo conectar con el servidor backend. Verificá que el servicio esté iniciado.'
        );
      } else {
        const fallosSecundarios = [resVentas, resRep, resPendientes, resMetodos].filter(
          (r): r is PromiseRejectedResult => r.status === 'rejected'
        );
        if (fallosSecundarios.length > 0) {
          const primerError = fallosSecundarios[0]?.reason;
          setError(
            primerError instanceof Error
              ? `Algunos datos del panel no pudieron cargarse: ${primerError.message}`
              : 'Algunos datos del panel no pudieron cargarse. Presioná Reintentar.'
          );
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar el resumen del dashboard');
    } finally {
      setCargando(false);
    }
  }, [esAdmin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDashboard();
  }, [cargarDashboard]);

  const totalReparacionesActivas = useMemo(() => {
    if (dashboard?.total_taller_activo !== undefined) {
      return dashboard.total_taller_activo;
    }
    return dashboard?.taller_activo?.reduce((acc, t) => acc + Number(t.cantidad), 0) || 0;
  }, [dashboard?.total_taller_activo, dashboard?.taller_activo]);

  return {
    user,
    esAdmin,
    dashboard,
    ultimasVentas,
    ultimasReparaciones,
    pagosPendientes,
    metodosPago,
    totalReparacionesActivas,
    cargando,
    error,
    recargar: cargarDashboard
  };
}
