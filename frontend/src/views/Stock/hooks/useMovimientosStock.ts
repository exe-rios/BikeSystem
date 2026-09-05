import { useState, useCallback } from 'react';
import { api } from '../../../services/api';
import type { MovimientoStock, Producto } from '../../../types';
import type { FormMovimientoData } from '../types';

const INITIAL_MOVIMIENTO: FormMovimientoData = {
  id_producto: 0,
  tipo_movimiento: 'INGRESO',
  cantidad: 1,
  motivo: 'Compra / Reposición',
  observaciones: ''
};

export function useMovimientosStock() {
  const [mostrarModalMovimiento, setMostrarModalMovimiento] = useState(false);
  const [mostrarModalHistorialMov, setMostrarModalHistorialMov] = useState(false);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);
  const [historialMovimientos, setHistorialMovimientos] = useState<MovimientoStock[]>([]);
  const [nuevoMovimiento, setNuevoMovimiento] = useState<FormMovimientoData>(INITIAL_MOVIMIENTO);
  const [errorMovimiento, setErrorMovimiento] = useState<string | null>(null);

  const abrirAjuste = useCallback((p?: Producto) => {
    setErrorMovimiento(null);
    setNuevoMovimiento({
      id_producto: p?.id_producto || 0,
      tipo_movimiento: 'INGRESO',
      cantidad: 1,
      motivo: 'Compra / Reposición',
      observaciones: ''
    });
    setMostrarModalMovimiento(true);
  }, []);

  const cerrarModalAjuste = useCallback(() => {
    setMostrarModalMovimiento(false);
    setErrorMovimiento(null);
  }, []);

  const cerrarModalHistorial = useCallback(() => {
    setMostrarModalHistorialMov(false);
  }, []);

  const verHistorialMovimientos = useCallback(async (idProducto?: number) => {
    setCargandoMovimientos(true);
    setMostrarModalHistorialMov(true);
    try {
      const data = await api.productos.getMovimientos(idProducto);
      setHistorialMovimientos(Array.isArray(data?.movimientos) ? data.movimientos : []);
    } catch {
      setHistorialMovimientos([]);
    } finally {
      setCargandoMovimientos(false);
    }
  }, []);

  const guardarMovimiento = useCallback(async (onSuccess?: () => Promise<void> | void) => {
    setErrorMovimiento(null);

    if (!nuevoMovimiento.id_producto || nuevoMovimiento.id_producto <= 0) {
      setErrorMovimiento('Por favor selecciona un producto válido.');
      return false;
    }

    const cantNum = Number(nuevoMovimiento.cantidad);
    if (isNaN(cantNum) || cantNum <= 0) {
      setErrorMovimiento('La cantidad debe ser un número entero mayor a 0.');
      return false;
    }

    if (!nuevoMovimiento.motivo.trim()) {
      setErrorMovimiento('Debes indicar el motivo del movimiento.');
      return false;
    }

    setGuardandoMovimiento(true);
    try {
      await api.productos.registrarMovimiento({
        id_producto: nuevoMovimiento.id_producto,
        tipo_movimiento: nuevoMovimiento.tipo_movimiento,
        cantidad: cantNum,
        motivo: nuevoMovimiento.motivo.trim(),
        observaciones: nuevoMovimiento.observaciones.trim() || undefined
      });

      setMostrarModalMovimiento(false);
      setNuevoMovimiento(INITIAL_MOVIMIENTO);
      if (onSuccess) {
        await onSuccess();
      }
      return true;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMovimiento(err.message);
      } else {
        setErrorMovimiento('Error al registrar el movimiento de stock');
      }
      return false;
    } finally {
      setGuardandoMovimiento(false);
    }
  }, [nuevoMovimiento]);

  return {
    mostrarModalMovimiento,
    mostrarModalHistorialMov,
    cargandoMovimientos,
    guardandoMovimiento,
    historialMovimientos,
    nuevoMovimiento,
    errorMovimiento,
    setNuevoMovimiento,
    abrirAjuste,
    cerrarModalAjuste,
    cerrarModalHistorial,
    verHistorialMovimientos,
    guardarMovimiento
  };
}
