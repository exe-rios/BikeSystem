import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import type { Producto, ResumenStock, Proveedor, CotizacionDolarInfo } from '../../../types';
import type { 
  FiltroTipoProducto, 
  FiltroEstadoProducto, 
  FiltroDisponibilidad, 
  FormProductoData 
} from '../types';

import { useDebounce } from '../../../hooks/useDebounce';

const INITIAL_FORM: FormProductoData = {
  id_proveedor: '',
  codigo: '',
  nombre: '',
  marca: '',
  modelo: '',
  tipo_prod: 'repuesto',
  cantidad: '1',
  moneda: 'ARS',
  costo_usd: '',
  porcentaje_ganancia: '',
  porcentaje_reventa: '',
  precio_reventa: '',
  precio_reventa_usd: '',
  precio: '',
  precio_usd: '',
  stock_minimo: '',
  color: '',
  rodado: '29',
  talle: 'M',
  genero: '',
  activo: true
};

/** Hook de administración de catálogo de productos, proveedores, cotización USD, filtros y paginación. */
export function useStock() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cotizacionInfo, setCotizacionInfo] = useState<CotizacionDolarInfo>({
    cotizacion_dolar: 1,
    updated_at: null,
    updated_by_nombre: null,
    productos_usd_count: 0
  });
  const [resumen, setResumen] = useState<ResumenStock>({
    total_articulos: 0,
    total_unidades: 0,
    bajo_stock_count: 0,
    sin_stock_count: 0,
    inactivos_count: 0
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paginación
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [totalRegistros, setTotalRegistros] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const limite = 10;

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoProducto>('todos');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoProducto>('todos');
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<FiltroDisponibilidad>('todos');
  const [filtroProveedor, setFiltroProveedor] = useState<string>('todos');
  const [filtroMoneda, setFiltroMoneda] = useState<'todos' | 'ARS' | 'USD'>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const busquedaDebounced = useDebounce(busqueda, 300);

  // Reiniciar a la primera página cuando cambian los filtros
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaginaActual(1);
  }, [filtroTipo, filtroEstado, filtroDisponibilidad, filtroProveedor, filtroMoneda, busquedaDebounced]);

  // Modal de Formulario (Crear / Editar)
  const [mostrarModalForm, setMostrarModalForm] = useState(false);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [formData, setFormData] = useState<FormProductoData>(INITIAL_FORM);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargarMetadatos = useCallback(async () => {
    try {
      const [resProv, resDolar] = await Promise.all([
        api.proveedores.getAll().catch(() => ({ total: 0, proveedores: [] })),
        api.configuracion.getDolar().catch(() => null)
      ]);
      setProveedores(resProv?.proveedores || []);
      if (resDolar) {
        setCotizacionInfo(resDolar);
      }
    } catch {
      // Silencioso para no bloquear catálogo
    }
  }, []);

  const cargarProductos = useCallback(async () => {
    setError(null);
    try {
      const data = await api.productos.getAll({
        tipo: filtroTipo,
        estado: filtroEstado,
        disponibilidad: filtroDisponibilidad,
        id_proveedor: filtroProveedor,
        moneda: filtroMoneda,
        busqueda: busquedaDebounced,
        limite,
        pagina: paginaActual
      });
      setProductos(Array.isArray(data?.productos) ? data.productos : []);
      const total = data?.total || 0;
      setTotalRegistros(total);
      setTotalPaginas(data?.totalPaginas || Math.ceil(total / limite) || 1);
      if (data?.resumen) {
        setResumen(data.resumen);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar el inventario');
      }
    } finally {
      setCargando(false);
    }
  }, [filtroTipo, filtroEstado, filtroDisponibilidad, filtroProveedor, filtroMoneda, busquedaDebounced, paginaActual, limite]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarMetadatos();
  }, [cargarMetadatos]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarProductos();
  }, [cargarProductos]);

  const abrirModalCrear = useCallback(() => {
    setModoModal('crear');
    setProductoEditando(null);
    setFormData({
      ...INITIAL_FORM,
      id_proveedor: filtroProveedor !== 'todos' && filtroProveedor !== 'sin_proveedor' ? filtroProveedor : ''
    });
    setErrorForm(null);
    setMostrarModalForm(true);
  }, [filtroProveedor]);

  const abrirModalEditar = useCallback((p: Producto) => {
    const rawGanancia =
      p.porcentaje_ganancia !== null &&
      p.porcentaje_ganancia !== undefined &&
      p.porcentaje_ganancia !== ''
        ? Number(p.porcentaje_ganancia)
        : null;
    const gananciaUI =
      rawGanancia !== null && !isNaN(rawGanancia)
        ? rawGanancia <= 10
          ? Math.round(rawGanancia * 10000) / 100
          : Math.round(rawGanancia * 100) / 100
        : '';

    const rawReventa =
      p.porcentaje_reventa !== null &&
      p.porcentaje_reventa !== undefined &&
      p.porcentaje_reventa !== ''
        ? Number(p.porcentaje_reventa)
        : null;
    const reventaUI =
      rawReventa !== null && !isNaN(rawReventa)
        ? rawReventa <= 10
          ? Math.round(rawReventa * 10000) / 100
          : Math.round(rawReventa * 100) / 100
        : '';

    setModoModal('editar');
    setProductoEditando(p);
    setFormData({
      id_proveedor: p.id_proveedor ?? '',
      codigo: p.codigo || '',
      nombre: p.nombre,
      marca: p.marca || '',
      modelo: p.modelo || '',
      tipo_prod: p.tipo_prod,
      cantidad: p.cantidad,
      moneda: p.moneda === 'USD' ? 'USD' : 'ARS',
      costo_usd: p.costo_usd ?? '',
      porcentaje_ganancia: gananciaUI,
      porcentaje_reventa: reventaUI,
      precio_reventa: p.precio_reventa ?? '',
      precio_reventa_usd: p.precio_reventa_usd ?? '',
      precio: p.precio,
      precio_usd: p.precio_usd ?? '',
      stock_minimo: p.stock_minimo,
      color: p.color || '',
      rodado: p.rodado || '29',
      talle: p.talle || 'M',
      genero: (p.genero as FormProductoData['genero']) || '',
      activo: p.activo !== false
    });
    setErrorForm(null);
    setMostrarModalForm(true);
  }, []);

  const cerrarModalForm = useCallback(() => {
    setMostrarModalForm(false);
    setProductoEditando(null);
    setErrorForm(null);
  }, []);

  const guardarProducto = useCallback(async () => {
    setErrorForm(null);

    if (!formData.nombre.trim()) {
      setErrorForm('Por favor ingresa un nombre para el artículo.');
      return false;
    }

    const esUsd = formData.moneda === 'USD';
    const costoNum =
      formData.costo_usd !== '' && !isNaN(Number(formData.costo_usd))
        ? Math.round(Number(formData.costo_usd) * 100) / 100
        : null;
    if (costoNum !== null && costoNum < 0) {
      setErrorForm('El costo no puede ser negativo.');
      return false;
    }

    const gananciaPctNum =
      formData.porcentaje_ganancia !== '' && !isNaN(Number(formData.porcentaje_ganancia))
        ? Number(formData.porcentaje_ganancia)
        : null;
    if (gananciaPctNum !== null && gananciaPctNum < 0) {
      setErrorForm('El porcentaje de ganancia no puede ser negativo.');
      return false;
    }
    const factorGanancia =
      gananciaPctNum !== null ? Math.round((gananciaPctNum / 100) * 10000) / 10000 : null;

    const reventaPctNum =
      formData.porcentaje_reventa !== '' && !isNaN(Number(formData.porcentaje_reventa))
        ? Number(formData.porcentaje_reventa)
        : null;
    if (reventaPctNum !== null && reventaPctNum < 0) {
      setErrorForm('El porcentaje de reventa no puede ser negativo.');
      return false;
    }
    const factorReventa =
      reventaPctNum !== null ? Math.round((reventaPctNum / 100) * 10000) / 10000 : null;

    const reventaIngresado = esUsd ? formData.precio_reventa_usd : formData.precio_reventa;
    let precioReventaFinalArs: number | null = null;
    let precioReventaFinalUsd: number | null = null;
    if (reventaIngresado !== '' && !isNaN(Number(reventaIngresado))) {
      const valRev = Math.round(Number(reventaIngresado) * 100) / 100;
      if (valRev < 0) {
        setErrorForm('El precio de reventa no puede ser negativo.');
        return false;
      }
      if (esUsd) {
        precioReventaFinalUsd = valRev;
      } else {
        precioReventaFinalArs = valRev;
      }
    } else if (costoNum !== null && costoNum > 0 && factorReventa !== null) {
      const calcRev = Math.round(costoNum * (1 + factorReventa) * 100) / 100;
      if (esUsd) {
        precioReventaFinalUsd = calcRev;
      } else {
        precioReventaFinalArs = calcRev;
      }
    }

    const precioIngresado = esUsd ? Number(formData.precio_usd) : Number(formData.precio);
    const precioCalculado =
      costoNum !== null && costoNum > 0
        ? Math.round(costoNum * (1 + (factorGanancia || 0)) * 100) / 100
        : NaN;
    const precioNum =
      (esUsd ? formData.precio_usd !== '' : formData.precio !== '') && !isNaN(precioIngresado)
        ? precioIngresado
        : precioCalculado;

    if (isNaN(precioNum) || precioNum < 0) {
      setErrorForm(esUsd ? 'El precio en dólares debe ser mayor o igual a 0.' : 'El precio debe ser un número mayor o igual a 0.');
      return false;
    }

    const provSeleccionado = formData.id_proveedor !== ''
      ? proveedores.find(pr => String(pr.id_proveedor) === String(formData.id_proveedor))
      : undefined;
    const cotizacionEfectiva =
      provSeleccionado?.cotizacion_dolar && Number(provSeleccionado.cotizacion_dolar) > 0
        ? Number(provSeleccionado.cotizacion_dolar)
        : cotizacionInfo.cotizacion_dolar;

    const stockMinNum = Number(formData.stock_minimo);
    if (formData.stock_minimo === '' || isNaN(stockMinNum) || stockMinNum < 0 || !Number.isInteger(stockMinNum)) {
      setErrorForm('Ingresa un stock mínimo de alerta válido (número entero mayor o igual a 0).');
      return false;
    }

    if (formData.tipo_prod === 'bicicleta' && !formData.genero) {
      setErrorForm('Por favor selecciona el género de la bicicleta (Hombre, Mujer, Unisex o Niño/a).');
      return false;
    }

    setGuardando(true);
    try {
      const payload: Omit<Producto, 'id_producto'> = {
        id_proveedor: formData.id_proveedor !== '' ? Number(formData.id_proveedor) : null,
        codigo: formData.codigo.trim() || null,
        nombre: formData.nombre.trim(),
        marca: formData.marca.trim() || undefined,
        modelo: formData.modelo.trim() || undefined,
        tipo_prod: formData.tipo_prod,
        moneda: formData.moneda,
        costo_usd: costoNum,
        porcentaje_ganancia: factorGanancia,
        porcentaje_reventa: factorReventa,
        precio_reventa: esUsd
          ? (precioReventaFinalUsd !== null ? Math.round(precioReventaFinalUsd * cotizacionEfectiva * 100) / 100 : null)
          : precioReventaFinalArs,
        precio_reventa_usd: esUsd ? precioReventaFinalUsd : null,
        precio: esUsd ? Math.round(precioNum * cotizacionEfectiva * 100) / 100 : precioNum,
        precio_usd: esUsd ? precioNum : null,
        cantidad: Number(formData.cantidad) || 0,
        stock_minimo: stockMinNum,
        color: formData.tipo_prod === 'bicicleta' ? (formData.color.trim() || undefined) : undefined,
        rodado: formData.tipo_prod === 'bicicleta' ? formData.rodado : undefined,
        talle: formData.tipo_prod === 'bicicleta' ? formData.talle : undefined,
        genero: formData.tipo_prod === 'bicicleta' ? formData.genero : undefined,
        activo: formData.activo
      };

      if (modoModal === 'crear') {
        await api.productos.create(payload);
      } else if (modoModal === 'editar' && productoEditando?.id_producto) {
        await api.productos.update(productoEditando.id_producto, payload);
      }

      cerrarModalForm();
      await Promise.all([cargarProductos(), cargarMetadatos()]);
      return true;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'data' in err && (err as { data?: { detalles?: string[] } }).data?.detalles) {
        const detalles = (err as { data?: { detalles?: string[] } }).data?.detalles;
        if (Array.isArray(detalles)) {
          setErrorForm(detalles.join(' '));
          return false;
        }
      }
      if (err instanceof Error) {
        setErrorForm(err.message);
      } else {
        setErrorForm('Error al guardar el producto');
      }
      return false;
    } finally {
      setGuardando(false);
    }
  }, [formData, modoModal, productoEditando, cotizacionInfo.cotizacion_dolar, proveedores, cerrarModalForm, cargarProductos, cargarMetadatos]);

  const actualizarCotizacionDolar = useCallback(async (nuevaCotizacion: number) => {
    const res = await api.configuracion.updateDolar(nuevaCotizacion);
    await Promise.all([cargarMetadatos(), cargarProductos()]);
    return res;
  }, [cargarMetadatos, cargarProductos]);

  const actualizarCotizacionProveedor = useCallback(async (idProveedor: number, nuevaCotizacion: number | null) => {
    const res = await api.proveedores.updateDolar(idProveedor, nuevaCotizacion);
    await Promise.all([cargarMetadatos(), cargarProductos()]);
    return res;
  }, [cargarMetadatos, cargarProductos]);

  const eliminarProducto = useCallback(async (id: number) => {
    try {
      await api.productos.delete(id);
      await cargarProductos();
      return true;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo procesar la baja del producto');
      }
      return false;
    }
  }, [cargarProductos]);

  const reactivarProducto = useCallback(async (id: number) => {
    try {
      await api.productos.reactivate(id);
      await cargarProductos();
      return true;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo reactivar el producto');
      }
      return false;
    }
  }, [cargarProductos]);

  return {
    productos,
    productosFiltrados: productos,
    proveedores,
    cotizacionInfo,
    resumen,
    cargando,
    guardando,
    error,
    filtroTipo,
    filtroEstado,
    filtroDisponibilidad,
    filtroProveedor,
    filtroMoneda,
    busqueda,
    mostrarModalForm,
    modoModal,
    productoEditando,
    formData,
    errorForm,
    setFiltroTipo,
    setFiltroEstado,
    setFiltroDisponibilidad,
    setFiltroProveedor,
    setFiltroMoneda,
    setBusqueda,
    setFormData,
    abrirModalCrear,
    abrirModalEditar,
    cerrarModalForm,
    guardarProducto,
    eliminarProducto,
    reactivarProducto,
    actualizarCotizacionDolar,
    actualizarCotizacionProveedor,
    paginaActual,
    totalPaginas,
    totalRegistros,
    limite,
    setPaginaActual,
    recargar: () => Promise.all([cargarProductos(), cargarMetadatos()])
  };
}
