import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import type { 
  DashboardData, 
  ReporteKPIs, 
  ReporteEstadisticasTaller, 
  Venta, 
  Reparacion, 
  PagoProveedor 
} from '../../../types';
import type { TabTipo, RangoRapido } from '../types';
import { exportarCSV } from '../utils/exportarCSV';
import { useDebounce } from '../../../hooks/useDebounce';

const getMesActualFechas = () => {
  const hoy = new Date();
  const formatoFecha = (d: Date) => {
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  };
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  return {
    desde: formatoFecha(primerDia),
    hasta: formatoFecha(ultimoDia)
  };
};

/** Hook para la consulta de métricas contables, balance de ingresos/egresos y rankings. */
export function useReportes() {
  const [activeTab, setActiveTab] = useState<TabTipo>('general');
  const [rangoRapido, setRangoRapido] = useState<RangoRapido>('mes');
  const [fechaDesde, setFechaDesde] = useState<string>(() => getMesActualFechas().desde);
  const [fechaHasta, setFechaHasta] = useState<string>(() => getMesActualFechas().hasta);
  const [searchTerm, setSearchTerm] = useState('');
  const searchTermDebounced = useDebounce(searchTerm, 300);
  const [estadoTallerFiltro, setEstadoTallerFiltro] = useState<string>('TODOS');

  // Paginación de 10 en 10 por pestaña
  const [paginaVentas, setPaginaVentas] = useState<number>(1);
  const [totalPaginasVentas, setTotalPaginasVentas] = useState<number>(1);
  const [totalVentasRegistros, setTotalVentasRegistros] = useState<number>(0);

  const [paginaReparaciones, setPaginaReparaciones] = useState<number>(1);
  const [totalPaginasReparaciones, setTotalPaginasReparaciones] = useState<number>(1);
  const [totalReparacionesRegistros, setTotalReparacionesRegistros] = useState<number>(0);

  const [paginaPagos, setPaginaPagos] = useState<number>(1);
  const [totalPaginasPagos, setTotalPaginasPagos] = useState<number>(1);
  const [totalPagosRegistros, setTotalPagosRegistros] = useState<number>(0);

  const limitePaginacion = 10;

  useEffect(() => {
    setPaginaVentas(1);
    setPaginaReparaciones(1);
    setPaginaPagos(1);
  }, [fechaDesde, fechaHasta, searchTermDebounced, estadoTallerFiltro]);

  // Datos del backend
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [kpis, setKpis] = useState<ReporteKPIs>({
    total_ingresos: 0,
    total_ventas_monto: 0,
    total_ventas_cantidad: 0,
    total_reparaciones_monto: 0,
    total_reparaciones_cantidad: 0,
    total_mano_obra_monto: 0,
    total_egresos_monto: 0,
    total_egresos_cantidad: 0,
    balance_neto: 0,
    margen_rentabilidad: 0,
    total_operaciones_cobradas: 0,
    ticket_promedio: 0,
    porcentaje_ventas: 0,
    porcentaje_taller: 0,
    monto_estimado_en_proceso: 0,
    total_ordenes_en_proceso: 0
  });
  const [estadisticasTaller, setEstadisticasTaller] = useState<ReporteEstadisticasTaller>({
    recibidas: 0,
    en_reparacion: 0,
    listas: 0,
    entregadas: 0
  });
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [ventasResumen, setVentasResumen] = useState({
    totalFacturado: 0,
    cobradas: 0,
    anuladas: 0
  });

  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [reparacionesResumen, setReparacionesResumen] = useState({
    totalRecaudado: 0,
    totalManoObra: 0,
    entregadas: 0,
    enProceso: 0,
    montoEnProceso: 0
  });

  const [pagos, setPagos] = useState<PagoProveedor[]>([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Aplicar rangos rápidos de fechas
  const aplicarRangoRapido = useCallback((rango: RangoRapido) => {
    setRangoRapido(rango);
    const hoy = new Date();
    const formatoFecha = (d: Date) => {
      const anio = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${anio}-${mes}-${dia}`;
    };

    if (rango === 'hoy') {
      const hoyStr = formatoFecha(hoy);
      setFechaDesde(hoyStr);
      setFechaHasta(hoyStr);
    } else if (rango === 'semana') {
      const sieteDiasAtras = new Date();
      sieteDiasAtras.setDate(hoy.getDate() - 7);
      setFechaDesde(formatoFecha(sieteDiasAtras));
      setFechaHasta(formatoFecha(hoy));
    } else if (rango === 'mes') {
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      setFechaDesde(formatoFecha(primerDia));
      setFechaHasta(formatoFecha(ultimoDia));
    } else if (rango === 'mes_anterior') {
      const primerDiaMesAnt = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const ultimoDiaMesAnt = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
      setFechaDesde(formatoFecha(primerDiaMesAnt));
      setFechaHasta(formatoFecha(ultimoDiaMesAnt));
    } else if (rango === 'anio') {
      const primerDiaAnio = new Date(hoy.getFullYear(), 0, 1);
      setFechaDesde(formatoFecha(primerDiaAnio));
      setFechaHasta(formatoFecha(hoy));
    } else if (rango === 'todo') {
      setFechaDesde('');
      setFechaHasta('');
    }
  }, []);

  // Cargar datos consolidados desde la API de backend
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resDash, resKpis, resVentas, resReparaciones, resPagos] = await Promise.all([
        api.reportes.getDashboard().catch(() => null),
        api.reportes.getEstadisticas({
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined
        }).catch(() => null),
        api.reportes.getVentas({
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
          busqueda: searchTermDebounced || undefined,
          limite: limitePaginacion,
          pagina: paginaVentas
        }).catch(() => ({ total: 0, total_facturado: 0, ventas_cobradas: 0, ventas_anuladas: 0, ventas: [], totalPaginas: 1 })),
        api.reportes.getReparaciones({
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
          estado: estadoTallerFiltro !== 'TODOS' ? estadoTallerFiltro : undefined,
          busqueda: searchTermDebounced || undefined,
          limite: limitePaginacion,
          pagina: paginaReparaciones
        }).catch(() => ({ total: 0, entregadas_count: 0, en_proceso_count: 0, total_recaudado: 0, total_mano_obra: 0, monto_estimado_en_proceso: 0, reparaciones: [], totalPaginas: 1 })),
        api.reportes.getEgresos({
          fechaDesde: fechaDesde || undefined,
          fechaHasta: fechaHasta || undefined,
          busqueda: searchTermDebounced || undefined,
          limite: limitePaginacion,
          pagina: paginaPagos
        }).catch(() => ({ total: 0, total_egresos: 0, pagos: [], totalPaginas: 1 }))
      ]);

      if (resDash) {
        setDashboard(resDash);
      }

      if (resKpis) {
        setKpis(resKpis.kpis);
        setEstadisticasTaller(resKpis.estadisticas_taller);
      }

      setVentas(resVentas.ventas || []);
      setTotalVentasRegistros(resVentas.total || 0);
      setTotalPaginasVentas(resVentas.totalPaginas || 1);
      setVentasResumen({
        totalFacturado: resVentas.total_facturado || 0,
        cobradas: resVentas.ventas_cobradas || 0,
        anuladas: resVentas.ventas_anuladas || 0
      });

      setReparaciones(resReparaciones.reparaciones || []);
      setTotalReparacionesRegistros(resReparaciones.total || 0);
      setTotalPaginasReparaciones(resReparaciones.totalPaginas || 1);
      setReparacionesResumen({
        totalRecaudado: resReparaciones.total_recaudado || 0,
        totalManoObra: resReparaciones.total_mano_obra || 0,
        entregadas: resReparaciones.entregadas_count || 0,
        enProceso: resReparaciones.en_proceso_count || 0,
        montoEnProceso: resReparaciones.monto_estimado_en_proceso || 0
      });

      setPagos(resPagos.pagos || []);
      setTotalPagosRegistros(resPagos.total || 0);
      setTotalPaginasPagos(resPagos.totalPaginas || 1);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al cargar la información consolidada de reportes.');
      }
    } finally {
      setCargando(false);
    }
  }, [fechaDesde, fechaHasta, estadoTallerFiltro, searchTermDebounced, paginaVentas, paginaReparaciones, paginaPagos, limitePaginacion]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
  }, [cargarDatos]);

  const topProductosList = dashboard?.top_productos || [];
  const maxVentasProducto = topProductosList.length
    ? Math.max(...topProductosList.map(p => Number(p.total_vendido || 0)), 1)
    : 1;

  const handleExportar = () => {
    exportarCSV({
      activeTab,
      kpis,
      ventas,
      reparaciones,
      pagos,
      topProductos: topProductosList
    });
  };

  const handleImprimir = () => {
    window.print();
  };

  return {
    activeTab,
    setActiveTab,
    rangoRapido,
    fechaDesde,
    fechaHasta,
    searchTerm,
    estadoTallerFiltro,
    setFechaDesde,
    setFechaHasta,
    setSearchTerm,
    setEstadoTallerFiltro,
    setRangoRapido,
    aplicarRangoRapido,
    dashboard,
    kpis,
    estadisticasTaller,
    ventas,
    ventasResumen,
    paginaVentas,
    setPaginaVentas,
    totalPaginasVentas,
    totalVentasRegistros,
    reparaciones,
    reparacionesResumen,
    paginaReparaciones,
    setPaginaReparaciones,
    totalPaginasReparaciones,
    totalReparacionesRegistros,
    pagos,
    paginaPagos,
    setPaginaPagos,
    totalPaginasPagos,
    totalPagosRegistros,
    limitePaginacion,
    topProductosList,
    maxVentasProducto,
    cargando,
    error,
    handleExportar,
    handleImprimir,
    recargar: cargarDatos
  };
}
