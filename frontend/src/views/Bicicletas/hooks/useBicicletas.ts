import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  Bicicleta, 
  Cliente, 
  NuevaBicicletaData, 
  BicicletaEditData, 
  FichaHistorialBicicleta 
} from '../types';
import { api } from '../../../services/api';

const INITIAL_NUEVA_BICI: NuevaBicicletaData = {
  id_cliente: 0,
  marca: '',
  modelo: ''
};

export function useBicicletas() {
  const [bicicletas, setBicicletas] = useState<Bicicleta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Modal Alta
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaBici, setNuevaBici] = useState<NuevaBicicletaData>(INITIAL_NUEVA_BICI);

  // Modal Edición (CU07)
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [biciAEditar, setBiciAEditar] = useState<BicicletaEditData | null>(null);

  // Modal Ficha Técnica / Historial (CU08)
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [datosHistorial, setDatosHistorial] = useState<FichaHistorialBicicleta | null>(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resBicis, resClientes] = await Promise.all([
        api.bicicletas.getAll(),
        api.clientes.getAll()
      ]);
      const listaClientes = Array.isArray(resClientes) ? resClientes : (resClientes?.clientes || []);
      setBicicletas(resBicis.bicicletas || []);
      setClientes(listaClientes);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar datos de bicicletas');
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleGuardarBici = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (nuevaBici.id_cliente === 0 || !nuevaBici.marca.trim() || !nuevaBici.modelo.trim()) {
      alert('Por favor selecciona un cliente y completa la marca y modelo.');
      return;
    }

    setGuardando(true);
    try {
      await api.bicicletas.create({
        id_cliente: nuevaBici.id_cliente,
        marca: nuevaBici.marca.trim(),
        modelo: nuevaBici.modelo.trim()
      });
      alert('Bicicleta registrada con éxito');
      setNuevaBici(INITIAL_NUEVA_BICI);
      setMostrarModal(false);
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al registrar bicicleta: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  }, [nuevaBici, cargarDatos]);

  const handleAbrirEditar = useCallback((bici: Bicicleta) => {
    if (!bici.id_bicicleta) return;
    setBiciAEditar({
      id_bicicleta: bici.id_bicicleta,
      marca: bici.marca,
      modelo: bici.modelo || ''
    });
    setMostrarModalEditar(true);
  }, []);

  const handleGuardarEdicion = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biciAEditar || !biciAEditar.marca.trim()) {
      alert('La marca de la bicicleta es requerida.');
      return;
    }

    setGuardando(true);
    try {
      await api.bicicletas.update(biciAEditar.id_bicicleta, {
        marca: biciAEditar.marca.trim(),
        modelo: biciAEditar.modelo.trim()
      });
      alert('Bicicleta actualizada con éxito');
      setMostrarModalEditar(false);
      setBiciAEditar(null);
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al actualizar bicicleta: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  }, [biciAEditar, cargarDatos]);

  const handleVerHistorial = useCallback(async (idBici: number) => {
    setCargandoHistorial(true);
    setMostrarModalHistorial(true);
    try {
      const data = await api.bicicletas.getHistorial(idBici);
      setDatosHistorial(data as FichaHistorialBicicleta);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al cargar ficha de la bicicleta: ${err.message}`);
      }
      setMostrarModalHistorial(false);
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  const handleEliminarBici = useCallback(async (id: number) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta bicicleta del sistema?')) {
      return;
    }

    try {
      await api.bicicletas.delete(id);
      alert('Bicicleta eliminada');
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`No se pudo eliminar: ${err.message}`);
      }
    }
  }, [cargarDatos]);

  const bicicletasFiltradas = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino) return bicicletas;
    return bicicletas.filter(b => {
      const nombreDueno = `${b.nombre || ''} ${b.apellido || ''}`.toLowerCase();
      return (
        b.marca.toLowerCase().includes(termino) ||
        (b.modelo || '').toLowerCase().includes(termino) ||
        nombreDueno.includes(termino)
      );
    });
  }, [bicicletas, busqueda]);

  return {
    bicicletas,
    clientes,
    bicicletasFiltradas,
    totalBicicletas: bicicletas.length,
    cargando,
    guardando,
    error,
    busqueda,
    mostrarModal,
    nuevaBici,
    mostrarModalEditar,
    biciAEditar,
    mostrarModalHistorial,
    cargandoHistorial,
    datosHistorial,
    setBusqueda,
    setMostrarModal,
    setNuevaBici,
    setMostrarModalEditar,
    setBiciAEditar,
    setMostrarModalHistorial,
    handleGuardarBici,
    handleAbrirEditar,
    handleGuardarEdicion,
    handleVerHistorial,
    handleEliminarBici,
    recargar: cargarDatos
  };
}
