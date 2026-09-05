import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PagoProveedor, Proveedor, MetodoPago, NuevoPagoData } from '../types';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

const INITIAL_NUEVO_PAGO: NuevoPagoData = {
  nombre_proveedor: '',
  id_metodo_pago: 0,
  monto_total: '',
  observaciones: ''
};

export function usePagoProveedores() {
  const { user } = useAuth();

  const [pagos, setPagos] = useState<PagoProveedor[]>([]);
  const [totalMontoBackend, setTotalMontoBackend] = useState<number>(0);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');

  const [mostrarModal, setMostrarModal] = useState<boolean>(false);
  const [nuevoPago, setNuevoPago] = useState<NuevoPagoData>(INITIAL_NUEVO_PAGO);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resPagos, resProv, resMetodos] = await Promise.all([
        api.pagosProveedores.getAll(),
        api.proveedores.getAll(),
        api.pagosProveedores.getMetodosPago()
      ]);

      setPagos(resPagos.pagos || []);
      if (resPagos.total_monto !== undefined) {
        setTotalMontoBackend(resPagos.total_monto);
      }
      setProveedores(resProv.proveedores || []);
      setMetodosPago(resMetodos || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar pagos y proveedores');
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleGuardar = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nuevoPago.nombre_proveedor.trim()) {
      alert('Por favor ingresa el nombre del proveedor.');
      return;
    }

    const montoNum = Number(nuevoPago.monto_total);
    if (!nuevoPago.id_metodo_pago || isNaN(montoNum) || montoNum <= 0) {
      alert('Por favor selecciona un método de pago y un monto mayor a cero.');
      return;
    }

    setGuardando(true);
    try {
      await api.pagosProveedores.create({
        nombre_proveedor: nuevoPago.nombre_proveedor.trim(),
        id_usuario: user?.id_usuario || 1,
        id_metodo_pago: nuevoPago.id_metodo_pago,
        monto_total: montoNum,
        observaciones: nuevoPago.observaciones
      });

      alert('Pago a proveedor registrado exitosamente');
      setMostrarModal(false);
      setNuevoPago(INITIAL_NUEVO_PAGO);
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al registrar pago: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  }, [nuevoPago, user, cargarDatos]);

  const pagosFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return pagos;
    return pagos.filter(p => {
      const prov = (p.proveedor_nombre || '').toLowerCase();
      const metodo = (p.metodo_pago_nombre || '').toLowerCase();
      const obs = (p.observaciones || '').toLowerCase();
      const usuario = (p.usuario_nombre || '').toLowerCase();
      return prov.includes(term) || metodo.includes(term) || obs.includes(term) || usuario.includes(term);
    });
  }, [pagos, busqueda]);

  return {
    pagos,
    pagosFiltrados,
    totalPagos: pagos.length,
    totalMontoBackend,
    proveedores,
    metodosPago,
    cargando,
    guardando,
    error,
    busqueda,
    mostrarModal,
    nuevoPago,
    setBusqueda,
    setMostrarModal,
    setNuevoPago,
    handleGuardar,
    recargar: cargarDatos
  };
}
