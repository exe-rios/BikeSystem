import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../../services/api';
import type { Venta, Cliente, Producto, GarantiaBicicleta, MetodoPago } from '../../../types';
import type { TabVentasTipo, FiltroGarantia, VentaDetallada, GarantiaConEstado } from '../types';

import { useDebounce } from '../../../hooks/useDebounce';

/** Hook para la gestión del historial de facturación, detalle y seguimiento de garantías. */
export function useVentas() {
  const [tabActiva, setTabActiva] = useState<TabVentasTipo>('ventas');

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [totalVentas, setTotalVentas] = useState<number>(0);
  const [paginaVentas, setPaginaVentas] = useState<number>(1);
  const [totalPaginasVentas, setTotalPaginasVentas] = useState<number>(1);
  const limiteVentas = 10;

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [garantias, setGarantias] = useState<GarantiaBicicleta[]>([]);
  const [resumenGarantias, setResumenGarantias] = useState({
    total: 0,
    vigentes: 0,
    por_vencer: 0,
    vencidas: 0
  });
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);

  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [anulando, setAnulando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros - Ventas
  const [busquedaVenta, setBusquedaVenta] = useState<string>('');
  const busquedaVentaDebounced = useDebounce(busquedaVenta, 300);

  // Reiniciar a página 1 al cambiar el término de búsqueda
  useEffect(() => {
    setPaginaVentas(1);
  }, [busquedaVentaDebounced]);

  // Filtros - Garantías
  const [busquedaGarantia, setBusquedaGarantia] = useState<string>('');
  const [filtroGarantia, setFiltroGarantia] = useState<FiltroGarantia>('todas');

  // Modales
  const [mostrarModalNuevaVenta, setMostrarModalNuevaVenta] = useState(false);
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaDetallada | null>(null);

  // Carga inicial y recarga de datos con extracción segura de arrays
  const cargarDatos = useCallback(async () => {
    try {
      const [dataVentas, dataClientes, dataProds, dataGarantias, dataMetodos] = await Promise.all([
        api.ventas.getAll({
          busqueda: busquedaVentaDebounced,
          limite: limiteVentas,
          pagina: paginaVentas
        }),
        api.clientes.getAll(),
        api.productos.getAll(),
        api.ventas.getGarantias(),
        api.pagosProveedores.getMetodosPago()
      ]);

      const listaVentas = Array.isArray(dataVentas) ? dataVentas : (dataVentas?.ventas || []);
      const totalV = !Array.isArray(dataVentas) && typeof dataVentas?.total === 'number' ? dataVentas.total : listaVentas.length;
      const totalP = !Array.isArray(dataVentas) && typeof dataVentas?.totalPaginas === 'number' ? dataVentas.totalPaginas : Math.ceil(totalV / limiteVentas) || 1;

      const listaClientes = Array.isArray(dataClientes) ? dataClientes : (dataClientes?.clientes || []);
      const listaProductos = Array.isArray(dataProds) ? dataProds : (dataProds?.productos || []);
      const listaGarantias = Array.isArray(dataGarantias) ? dataGarantias : (dataGarantias?.garantias || []);
      const listaMetodos = Array.isArray(dataMetodos) ? dataMetodos : [];

      setVentas(listaVentas);
      setTotalVentas(totalV);
      setTotalPaginasVentas(totalP);
      setClientes(listaClientes);
      setProductos(listaProductos);
      setGarantias(listaGarantias);
      if (dataGarantias?.resumen) {
        setResumenGarantias(dataGarantias.resumen);
      }
      setMetodosPago(listaMetodos);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar la información del módulo de ventas');
      }
    } finally {
      setCargando(false);
    }
  }, [busquedaVentaDebounced, paginaVentas, limiteVentas]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
  }, [cargarDatos]);

  // Ver Detalle / Factura
  const handleVerDetalleVenta = async (idVenta: number) => {
    setCargandoDetalle(true);
    setMostrarModalDetalle(true);
    try {
      const data = await api.ventas.getById(idVenta);
      const prods = data?.productos_vendidos || [];
      const normalizedProds = prods.map(p => ({
        id_detalle_venta: p.id_detalle_venta || 0,
        id_producto: p.id_producto || 0,
        nombre: p.nombre || 'Artículo',
        marca: p.marca || '',
        modelo: p.modelo || '',
        tipo_prod: p.tipo_prod || '',
        numero_serie: p.numero_serie || '',
        color: p.color || '',
        rodado: p.rodado || '',
        talle: p.talle || '',
        cantidad: Number(p.cantidad) || 1,
        precio_unitario: Number(p.precio_unitario) || 0,
        costo_total: Number(p.costo_total || ((Number(p.cantidad) || 1) * (Number(p.precio_unitario) || 0)))
      }));

      setVentaSeleccionada({
        venta: data.venta,
        productos_vendidos: normalizedProds
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al cargar detalle del comprobante: ${err.message}`);
      }
      setMostrarModalDetalle(false);
    } finally {
      setCargandoDetalle(false);
    }
  };

  // Anular Venta
  const handleAnularVenta = async (idVenta: number, motivoIngresado?: string) => {
    if (!idVenta) return;
    const motivoFinal = (motivoIngresado || '').trim() || 'Anulada por administración';

    setAnulando(true);
    try {
      const res = await api.ventas.anular(idVenta, motivoFinal);
      alert(res.message || 'Venta anulada con éxito y stock repuesto al inventario.');
      setMostrarModalDetalle(false);
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al anular la venta: ${err.message}`);
      } else {
        alert('Error inesperado al anular la venta.');
      }
    } finally {
      setAnulando(false);
    }
  };

  // Enviar Venta (sin enviar id_usuario ni forzar precio, el backend usa el token y catálogo oficial)
  const finalizarVenta = async (
    clienteId: number,
    metodoPagoId: number,
    items: { id_producto: number; cantidad: number }[]
  ) => {
    setGuardando(true);
    try {
      const payload = {
        id_cliente: clienteId,
        id_metodo_pago: metodoPagoId,
        detalles: items
      };

      const res = await api.ventas.create(payload);
      alert('Venta completada y stock descontado exitosamente.');
      setMostrarModalNuevaVenta(false);
      await cargarDatos();

      // Abrir el detalle / factura de la venta recién creada
      if (res?.venta?.id_venta) {
        handleVerDetalleVenta(res.venta.id_venta);
      }
      return true;
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al procesar la venta: ${err.message}`);
      } else {
        alert('Error inesperado al procesar la venta.');
      }
      return false;
    } finally {
      setGuardando(false);
    }
  };

  // Listado filtrado de Ventas
  const ventasFiltradas = useMemo(() => {
    if (!busquedaVenta.trim()) return ventas;
    const term = busquedaVenta.toLowerCase().trim();
    return ventas.filter(v => {
      const idStr = String(v.id_venta);
      const facStr = 'fac-' + String(v.id_venta).padStart(6, '0');
      const cliente = `${v.cliente_nombre || ''} ${v.cliente_apellido || ''}`.toLowerCase();
      const vendedor = (v.vendedor || '').toLowerCase();
      const metodo = (v.metodo_pago_nombre || '').toLowerCase();
      const estado = (v.estado || '').toLowerCase();
      return idStr.includes(term) ||
        facStr.includes(term) ||
        cliente.includes(term) ||
        vendedor.includes(term) ||
        metodo.includes(term) ||
        estado.includes(term);
    });
  }, [ventas, busquedaVenta]);

  // Enriquecer visualmente las garantías con la información provista por PostgreSQL
  const todasLasGarantiasConEstado = useMemo<GarantiaConEstado[]>(() => {
    return garantias.map(g => {
      const estado = g.estado_garantia || 'vigente';
      const dias = g.dias_restantes ?? 0;

      let colorBg = '#dcfce7';
      let colorText = '#15803d';
      let label = `Vigente (${dias} días)`;

      if (estado === 'vencida') {
        colorBg = '#f1f5f9';
        colorText = '#64748b';
        label = `Vencida (${Math.abs(dias)} d)`;
      } else if (estado === 'por_vencer') {
        colorBg = '#fef3c7';
        colorText = '#b45309';
        label = `Por vencer (${dias} días)`;
      }

      return {
        ...g,
        infoGarantia: {
          estado,
          diasRestantes: dias,
          label,
          colorBg,
          colorText,
          fechaVencimiento: g.fecha_vencimiento
        }
      };
    });
  }, [garantias]);

  // Listado filtrado de Garantías
  const garantiasFiltradas = useMemo(() => {
    return todasLasGarantiasConEstado.filter(g => {
      // 1. Filtro por vigencia temporal
      if (filtroGarantia !== 'todas' && g.infoGarantia.estado !== filtroGarantia) {
        return false;
      }

      // 2. Filtro por búsqueda
      if (!busquedaGarantia.trim()) return true;
      const term = busquedaGarantia.toLowerCase().trim();
      const idStr = String(g.id_venta);
      const cliente = `${g.cliente_nombre || ''} ${g.cliente_apellido || ''}`.toLowerCase();
      const dni = (g.cliente_dni || '').toLowerCase();
      const producto = `${g.marca || ''} ${g.modelo || ''} ${g.producto_nombre || ''}`.toLowerCase();
      return idStr.includes(term) ||
        cliente.includes(term) ||
        dni.includes(term) ||
        producto.includes(term);
    });
  }, [todasLasGarantiasConEstado, filtroGarantia, busquedaGarantia]);

  return {
    tabActiva,
    setTabActiva,
    ventas: ventasFiltradas,
    totalVentas,
    paginaVentas,
    totalPaginasVentas,
    limiteVentas,
    setPaginaVentas,
    garantias: garantiasFiltradas,
    countTotalGarantias: resumenGarantias.total,
    countVigentes: resumenGarantias.vigentes,
    countPorVencer: resumenGarantias.por_vencer,
    countVencidas: resumenGarantias.vencidas,
    clientes,
    productos,
    metodosPago,
    cargando,
    guardando,
    anulando,
    error,
    busquedaVenta,
    setBusquedaVenta,
    busquedaGarantia,
    setBusquedaGarantia,
    filtroGarantia,
    setFiltroGarantia,
    mostrarModalNuevaVenta,
    setMostrarModalNuevaVenta,
    mostrarModalDetalle,
    setMostrarModalDetalle,
    cargandoDetalle,
    ventaSeleccionada,
    handleVerDetalleVenta,
    handleAnularVenta,
    finalizarVenta,
    recargar: cargarDatos
  };
}
