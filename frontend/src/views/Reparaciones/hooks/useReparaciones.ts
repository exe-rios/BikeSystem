import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  Reparacion, 
  Bicicleta, 
  Producto, 
  DetalleReparacionItem, 
  VistaTabReparaciones, 
  NuevaReparacionData, 
  ColumnaKanban 
} from '../types';
import { api } from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatearMoneda } from '../../../utils/formatters';

export const COLUMNAS_KANBAN: ColumnaKanban[] = [
  { titulo: 'Recibida', estado: 'Recibida', colorBg: '#f59e0b' },
  { titulo: 'En Reparación', estado: 'En Reparación', colorBg: '#ea580c' },
  { titulo: 'Lista para Entrega', estado: 'Lista', colorBg: '#0d9488' }
];

/** Hook de gestión del taller mecánico, drag and drop en Kanban, repuestos e historial. */
export function useReparaciones() {
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [resumen, setResumen] = useState<{
    total_activas: number;
    recibidas_count: number;
    en_reparacion_count: number;
    listas_count: number;
    total_entregadas: number;
    total_historico: number | string;
    promedio_historico: number | string;
  }>({
    total_activas: 0,
    recibidas_count: 0,
    en_reparacion_count: 0,
    listas_count: 0,
    total_entregadas: 0,
    total_historico: 0,
    promedio_historico: 0
  });

  const [bicicletas, setBicicletas] = useState<Bicicleta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Navegación de pestañas: 'activo' (Kanban) o 'historial' (Tabla de entregadas)
  const [vistaTab, setVistaTab] = useState<VistaTabReparaciones>('activo');
  const [busquedaTaller, setBusquedaTaller] = useState<string>('');
  const [busquedaHistorial, setBusquedaHistorial] = useState<string>('');
  const busquedaHistorialDebounced = useDebounce(busquedaHistorial, 300);

  // Paginación Historial
  const [paginaHistorial, setPaginaHistorial] = useState<number>(1);
  const [totalPaginasHistorial, setTotalPaginasHistorial] = useState<number>(1);
  const [totalHistorial, setTotalHistorial] = useState<number>(0);
  const limiteHistorial = 10;

  useEffect(() => {
    setPaginaHistorial(1);
  }, [busquedaHistorialDebounced]);

  // Modal Alta
  const [mostrarModalAlta, setMostrarModalAlta] = useState<boolean>(false);
  const [nuevaReparacion, setNuevaReparacion] = useState<NuevaReparacionData>({
    id_bicicleta: 0,
    descripcion: '',
    costo_mano_obra: '',
    estado: 'Recibida'
  });

  // Modal Edición
  const [ordenEditando, setOrdenEditando] = useState<Reparacion | null>(null);
  const [mostrarModalEditar, setMostrarModalEditar] = useState<boolean>(false);

  // Modal Detalle & Repuestos
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState<boolean>(false);
  const [ordenDetalle, setOrdenDetalle] = useState<Reparacion | null>(null);
  const [repuestosUtilizados, setRepuestosUtilizados] = useState<DetalleReparacionItem[]>([]);
  const [cargandoRepuestos, setCargandoRepuestos] = useState<boolean>(false);

  // Selector de nuevo repuesto en modal
  const [repuestoSeleccionadoId, setRepuestoSeleccionadoId] = useState<number>(0);
  const [cantidadRepuesto, setCantidadRepuesto] = useState<number | string>(1);
  const [guardandoRepuesto, setGuardandoRepuesto] = useState<boolean>(false);
  const [mensajeRepuesto, setMensajeRepuesto] = useState<{ texto: string; tipo: 'exito' | 'error' } | null>(null);

  // Drag state
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resRepActivas, resRepHistorial, resBicis, resProds] = await Promise.all([
        api.reparaciones.getAll({ estado: 'activas', limite: 100 }),
        api.reparaciones.getAll({
          estado: 'Entregada',
          limite: limiteHistorial,
          pagina: paginaHistorial,
          busqueda: busquedaHistorialDebounced
        }),
        api.bicicletas.getAll(),
        api.productos.getAll()
      ]);

      const activas = resRepActivas.reparaciones || [];
      const entregadas = resRepHistorial.reparaciones || [];
      setReparaciones([...activas, ...entregadas]);
      setTotalHistorial(resRepHistorial.total || 0);
      setTotalPaginasHistorial(resRepHistorial.totalPaginas || 1);

      if (resRepHistorial.resumen) {
        setResumen(resRepHistorial.resumen);
      } else if (resRepActivas.resumen) {
        setResumen(resRepActivas.resumen);
      }
      setBicicletas(resBicis.bicicletas || []);
      setProductos(resProds.productos || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar órdenes de taller');
      }
    } finally {
      setCargando(false);
    }
  }, [paginaHistorial, busquedaHistorialDebounced, limiteHistorial]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
  }, [cargarDatos]);

  /** Registra el ingreso de una nueva orden de servicio técnico al taller. */
  const handleGuardarReparacion = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (nuevaReparacion.id_bicicleta === 0 || !nuevaReparacion.descripcion.trim()) {
      alert('Por favor selecciona una bicicleta y describe el trabajo a realizar.');
      return;
    }

    setGuardando(true);
    try {
      await api.reparaciones.create({
        id_bicicleta: nuevaReparacion.id_bicicleta,
        estado: nuevaReparacion.estado,
        descripcion: nuevaReparacion.descripcion.trim(),
        costo_mano_obra: Number(nuevaReparacion.costo_mano_obra) || 0
      });

      alert('¡Orden de reparación ingresada al taller con éxito!');
      setNuevaReparacion({ id_bicicleta: 0, descripcion: '', costo_mano_obra: '', estado: 'Recibida' });
      setMostrarModalAlta(false);
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al registrar orden: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  }, [nuevaReparacion, cargarDatos]);

  /** Abre el modal de detalle de la orden y carga sus repuestos asociados. */
  const handleAbrirDetalle = useCallback(async (rep: Reparacion) => {
    setOrdenDetalle(rep);
    setMostrarModalDetalle(true);
    setCargandoRepuestos(true);
    setRepuestoSeleccionadoId(0);
    setCantidadRepuesto(1);
    setMensajeRepuesto(null);

    try {
      if (rep.id_reparacion) {
        const res = await api.reparaciones.getById(rep.id_reparacion);
        setOrdenDetalle(res.reparacion);
        setRepuestosUtilizados(res.repuestos_utilizados || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setCargandoRepuestos(false);
    }
  }, []);

  /** Asocia un repuesto a la orden descontando automáticamente su stock en bodega. */
  const handleAgregarRepuesto = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenDetalle || !ordenDetalle.id_reparacion) return;
    if (repuestoSeleccionadoId === 0) {
      setMensajeRepuesto({ texto: 'Por favor selecciona un repuesto del inventario.', tipo: 'error' });
      return;
    }

    const prod = productos.find(p => p.id_producto === repuestoSeleccionadoId);
    if (!prod) return;

    const cantRep = Number(cantidadRepuesto) || 1;

    setGuardandoRepuesto(true);
    setMensajeRepuesto(null);
    try {
      await api.reparaciones.agregarRepuesto({
        id_reparacion: ordenDetalle.id_reparacion,
        id_producto: prod.id_producto!,
        cantidad: cantRep
      });

      // Recargar datos actualizados de la orden y repuestos
      const res = await api.reparaciones.getById(ordenDetalle.id_reparacion);
      setOrdenDetalle(res.reparacion);
      setRepuestosUtilizados(res.repuestos_utilizados || []);

      // Resetear campos del selector
      setRepuestoSeleccionadoId(0);
      setCantidadRepuesto(1);

      // Feedback visual sin congelar el event loop de Electron
      setMensajeRepuesto({
        texto: `✓ Repuesto "${prod.nombre}" asignado a la orden con éxito. Stock descontado.`,
        tipo: 'exito'
      });

      // Sincronizar catálogo global de fondo sin bloquear el modal
      void cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMensajeRepuesto({ texto: err.message, tipo: 'error' });
      } else {
        setMensajeRepuesto({ texto: 'Error al asignar repuesto a la orden', tipo: 'error' });
      }
    } finally {
      setGuardandoRepuesto(false);
    }
  }, [ordenDetalle, repuestoSeleccionadoId, productos, cantidadRepuesto, cargarDatos]);

  /** Remueve un repuesto de la orden y reintegra las unidades al stock disponible. */
  const handleEliminarRepuesto = useCallback(async (idDetalle: number) => {
    if (!ordenDetalle || !ordenDetalle.id_reparacion) return;

    setCargandoRepuestos(true);
    setMensajeRepuesto(null);
    try {
      await api.reparaciones.eliminarRepuesto(idDetalle);
      const res = await api.reparaciones.getById(ordenDetalle.id_reparacion);
      setOrdenDetalle(res.reparacion);
      setRepuestosUtilizados(res.repuestos_utilizados || []);
      setMensajeRepuesto({ texto: '✓ Repuesto retirado de la orden y devuelto al inventario.', tipo: 'exito' });
      void cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMensajeRepuesto({ texto: `Error al eliminar repuesto: ${err.message}`, tipo: 'error' });
      } else {
        setMensajeRepuesto({ texto: 'Error al eliminar repuesto', tipo: 'error' });
      }
    } finally {
      setCargandoRepuestos(false);
    }
  }, [ordenDetalle, cargarDatos]);

  const handleGuardarEdicion = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenEditando || !ordenEditando.id_reparacion) return;

    setGuardando(true);
    try {
      await api.reparaciones.updateEstado(ordenEditando.id_reparacion, {
        estado: ordenEditando.estado,
        descripcion: ordenEditando.descripcion,
        costo_mano_obra: Number(ordenEditando.costo_mano_obra) || 0
      });

      alert('Orden actualizada con éxito');
      setMostrarModalEditar(false);
      setOrdenEditando(null);
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al actualizar orden: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  }, [ordenEditando, cargarDatos]);

  const handleCambiarEstado = useCallback(async (id: number, nuevoEstado: Reparacion['estado']) => {
    const reparacionActual = reparaciones.find(r => r.id_reparacion === id);
    if (!reparacionActual || reparacionActual.estado === nuevoEstado) return;

    const estadoPrevio = reparacionActual.estado;
    setReparaciones(prev => prev.map(r => r.id_reparacion === id ? { ...r, estado: nuevoEstado } : r));

    try {
      await api.reparaciones.updateEstado(id, { estado: nuevoEstado });
      await cargarDatos();
    } catch {
      setReparaciones(prev => prev.map(r => r.id_reparacion === id ? { ...r, estado: estadoPrevio } : r));
      alert('No se pudo actualizar el estado de la orden en el servidor');
    }
  }, [reparaciones, cargarDatos]);

  const handleEntregarOrden = useCallback(async (id: number) => {
    const orden = reparaciones.find(r => r.id_reparacion === id);
    const monto = Number(orden?.costo_total || orden?.costo_mano_obra || 0);
    const confirmacion = window.confirm(
      `¿Confirmar la ENTREGA de la Orden #${id}?\n\nTotal a liquidar: ${formatearMoneda(monto)}\n\nLa orden se registrará con fecha de egreso de hoy y se trasladará a la pestaña 'Historial de Entregas'.`
    );
    if (!confirmacion) return;

    await handleCambiarEstado(id, 'Entregada');
  }, [reparaciones, handleCambiarEstado]);

  const handleDropEnColumna = useCallback((nuevoEstado: Reparacion['estado'], idReparacionStr: string) => {
    const id = Number(idReparacionStr);
    if (id) {
      handleCambiarEstado(id, nuevoEstado);
    }
  }, [handleCambiarEstado]);

  // Separación de activas e históricas
  const reparacionesActivas = useMemo(() => reparaciones.filter(r => r.estado !== 'Entregada'), [reparaciones]);
  const reparacionesEntregadas = useMemo(() => reparaciones.filter(r => r.estado === 'Entregada'), [reparaciones]);

  // Filtros de búsqueda reactivos en memoria
  const reparacionesActivasFiltradas = useMemo(() => {
    return reparacionesActivas.filter(r => {
      const term = busquedaTaller.toLowerCase().trim();
      if (!term) return true;
      const desc = (r.descripcion || '').toLowerCase();
      const marca = (r.marca || '').toLowerCase();
      const modelo = (r.modelo || '').toLowerCase();
      const cliente = `${r.cliente_nombre || ''} ${r.cliente_apellido || ''}`.toLowerCase();
      const idStr = String(r.id_reparacion);
      return desc.includes(term) || marca.includes(term) || modelo.includes(term) || cliente.includes(term) || idStr.includes(term);
    });
  }, [reparacionesActivas, busquedaTaller]);

  const reparacionesEntregadasFiltradas = useMemo(() => {
    return reparacionesEntregadas.filter(r => {
      const term = busquedaHistorial.toLowerCase().trim();
      if (!term) return true;
      const desc = (r.descripcion || '').toLowerCase();
      const marca = (r.marca || '').toLowerCase();
      const modelo = (r.modelo || '').toLowerCase();
      const cliente = `${r.cliente_nombre || ''} ${r.cliente_apellido || ''}`.toLowerCase();
      const idStr = String(r.id_reparacion);
      const fechaIng = r.fecha_ingreso ? String(r.fecha_ingreso).toLowerCase() : '';
      const fechaEg = r.fecha_egreso ? String(r.fecha_egreso).toLowerCase() : '';
      return desc.includes(term) || marca.includes(term) || modelo.includes(term) || cliente.includes(term) || idStr.includes(term) || fechaIng.includes(term) || fechaEg.includes(term);
    });
  }, [reparacionesEntregadas, busquedaHistorial]);

  // Métricas calculadas por el Backend
  const totalMontoHistorico = useMemo(() => {
    return Number(resumen.total_historico) || 0;
  }, [resumen.total_historico]);

  const promedioPorOrden = useMemo(() => {
    return Number(resumen.promedio_historico) || 0;
  }, [resumen.promedio_historico]);

  const repuestosDisponibles = useMemo(() => {
    return productos.filter(p => p.activo !== false && (p.tipo_prod || '').toLowerCase() !== 'bicicleta');
  }, [productos]);

  const productoRepuestoSeleccionado = useMemo(() => {
    return productos.find(p => p.id_producto === repuestoSeleccionadoId);
  }, [productos, repuestoSeleccionadoId]);

  const totalRepuestosCosto = useMemo(() => {
    return repuestosUtilizados.reduce((acc, item) => acc + Number(item.costo_total || 0), 0);
  }, [repuestosUtilizados]);

  return {
    reparaciones,
    bicicletas,
    productos,
    cargando,
    guardando,
    error,
    vistaTab,
    busquedaTaller,
    busquedaHistorial,
    mostrarModalAlta,
    nuevaReparacion,
    ordenEditando,
    mostrarModalEditar,
    mostrarModalDetalle,
    ordenDetalle,
    repuestosUtilizados,
    cargandoRepuestos,
    repuestoSeleccionadoId,
    cantidadRepuesto,
    guardandoRepuesto,
    mensajeRepuesto,
    draggingId,
    reparacionesActivas,
    reparacionesEntregadas,
    reparacionesActivasFiltradas,
    reparacionesEntregadasFiltradas,
    paginaHistorial,
    totalPaginasHistorial,
    totalHistorial,
    limiteHistorial,
    setPaginaHistorial,
    resumen,
    totalMontoHistorico,
    promedioPorOrden,
    repuestosDisponibles,
    productoRepuestoSeleccionado,
    totalRepuestosCosto,
    setVistaTab,
    setBusquedaTaller,
    setBusquedaHistorial,
    setMostrarModalAlta,
    setNuevaReparacion,
    setOrdenEditando,
    setMostrarModalEditar,
    setMostrarModalDetalle,
    setRepuestoSeleccionadoId,
    setCantidadRepuesto,
    setDraggingId,
    handleGuardarReparacion,
    handleAbrirDetalle,
    handleAgregarRepuesto,
    handleEliminarRepuesto,
    handleGuardarEdicion,
    handleCambiarEstado,
    handleEntregarOrden,
    handleDropEnColumna,
    recargar: cargarDatos
  };
}
