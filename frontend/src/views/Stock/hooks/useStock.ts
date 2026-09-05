import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import type { Producto, ResumenStock } from '../../../types';
import type { 
  FiltroTipoProducto, 
  FiltroEstadoProducto, 
  FiltroDisponibilidad, 
  FormProductoData 
} from '../types';

const INITIAL_FORM: FormProductoData = {
  nombre: '',
  marca: '',
  modelo: '',
  tipo_prod: 'repuesto',
  cantidad: '1',
  precio: '',
  stock_minimo: '5',
  color: '',
  rodado: '29',
  talle: 'M',
  activo: true
};

export function useStock() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [resumen, setResumen] = useState<ResumenStock>({
    total_articulos: 0,
    total_unidades: 0,
    bajo_stock_count: 0,
    inactivos_count: 0
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipoProducto>('todos');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoProducto>('todos');
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<FiltroDisponibilidad>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal de Formulario (Crear / Editar)
  const [mostrarModalForm, setMostrarModalForm] = useState(false);
  const [modoModal, setModoModal] = useState<'crear' | 'editar'>('crear');
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [formData, setFormData] = useState<FormProductoData>(INITIAL_FORM);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const cargarProductos = useCallback(async () => {
    setError(null);
    try {
      const data = await api.productos.getAll({
        tipo: filtroTipo,
        estado: filtroEstado,
        disponibilidad: filtroDisponibilidad,
        busqueda: busqueda
      });
      setProductos(Array.isArray(data?.productos) ? data.productos : []);
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
  }, [filtroTipo, filtroEstado, filtroDisponibilidad, busqueda]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarProductos();
  }, [cargarProductos]);

  const abrirModalCrear = useCallback(() => {
    setModoModal('crear');
    setProductoEditando(null);
    setFormData(INITIAL_FORM);
    setErrorForm(null);
    setMostrarModalForm(true);
  }, []);

  const abrirModalEditar = useCallback((p: Producto) => {
    setModoModal('editar');
    setProductoEditando(p);
    setFormData({
      nombre: p.nombre,
      marca: p.marca || '',
      modelo: p.modelo || '',
      tipo_prod: p.tipo_prod,
      cantidad: p.cantidad,
      precio: p.precio,
      stock_minimo: p.stock_minimo,
      color: p.color || '',
      rodado: p.rodado || '29',
      talle: p.talle || 'M',
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

    const precioNum = Number(formData.precio);
    if (!formData.nombre.trim()) {
      setErrorForm('Por favor ingresa un nombre para el artículo.');
      return false;
    }
    if (isNaN(precioNum) || precioNum < 0) {
      setErrorForm('El precio debe ser un número mayor o igual a 0.');
      return false;
    }

    setGuardando(true);
    try {
      const payload: Omit<Producto, 'id_producto'> = {
        nombre: formData.nombre.trim(),
        marca: formData.marca.trim() || undefined,
        modelo: formData.modelo.trim() || undefined,
        tipo_prod: formData.tipo_prod,
        precio: precioNum,
        cantidad: Number(formData.cantidad) || 0,
        stock_minimo: Number(formData.stock_minimo) || 0,
        color: formData.tipo_prod === 'bicicleta' ? (formData.color.trim() || undefined) : undefined,
        rodado: formData.tipo_prod === 'bicicleta' ? formData.rodado : undefined,
        talle: formData.tipo_prod === 'bicicleta' ? formData.talle : undefined,
        activo: formData.activo
      };

      if (modoModal === 'crear') {
        await api.productos.create(payload);
      } else if (modoModal === 'editar' && productoEditando?.id_producto) {
        await api.productos.update(productoEditando.id_producto, payload);
      }

      cerrarModalForm();
      await cargarProductos();
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
  }, [formData, modoModal, productoEditando, cerrarModalForm, cargarProductos]);

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
    resumen,
    cargando,
    guardando,
    error,
    filtroTipo,
    filtroEstado,
    filtroDisponibilidad,
    busqueda,
    mostrarModalForm,
    modoModal,
    productoEditando,
    formData,
    errorForm,
    setFiltroTipo,
    setFiltroEstado,
    setFiltroDisponibilidad,
    setBusqueda,
    setFormData,
    abrirModalCrear,
    abrirModalEditar,
    cerrarModalForm,
    guardarProducto,
    eliminarProducto,
    reactivarProducto,
    recargar: cargarProductos
  };
}
