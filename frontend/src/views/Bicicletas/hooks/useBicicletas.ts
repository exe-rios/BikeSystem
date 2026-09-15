import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  Bicicleta, 
  Cliente, 
  NuevaBicicletaData, 
  BicicletaEditData, 
  FichaHistorialBicicleta 
} from '../types';
import { api } from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';

const INITIAL_NUEVA_BICI: NuevaBicicletaData = {
  id_cliente: 0,
  marca: '',
  modelo: ''
};

/** Hook para la gestión del catálogo de bicicletas, paginación, edición e historial. */
export function useBicicletas() {
  const [bicicletas, setBicicletas] = useState<Bicicleta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const busquedaDebounced = useDebounce(busqueda, 300);

  // Paginación de 10 en 10
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const [totalRegistros, setTotalRegistros] = useState<number>(0);
  const limite = 10;

  useEffect(() => {
    setPaginaActual(1);
  }, [busquedaDebounced]);

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
        api.bicicletas.getAll({
          busqueda: busquedaDebounced,
          limite,
          pagina: paginaActual
        }),
        api.clientes.getAll()
      ]);
      const listaClientes = Array.isArray(resClientes) ? resClientes : (resClientes?.clientes || []);
      setBicicletas(resBicis.bicicletas || []);
      setTotalRegistros(resBicis.total || 0);
      setTotalPaginas(resBicis.totalPaginas || 1);
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
  }, [busquedaDebounced, paginaActual, limite]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
  }, [cargarDatos]);

  /** Registra una nueva bicicleta asignada a un cliente. */
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

  /** Abre el modal de edición para la bicicleta seleccionada. */
  const handleAbrirEditar = useCallback((bici: Bicicleta) => {
    if (!bici.id_bicicleta) return;
    setBiciAEditar({
      id_bicicleta: bici.id_bicicleta,
      marca: bici.marca,
      modelo: bici.modelo || ''
    });
    setMostrarModalEditar(true);
  }, []);

  /** Envía los cambios de edición de la bicicleta al servidor. */
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

  /** Consulta y abre la ficha técnica e historial de reparaciones. */
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

  /** Elimina lógicamente o físicamente la bicicleta del sistema. */
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
    totalBicicletas: totalRegistros,
    paginaActual,
    setPaginaActual,
    totalPaginas,
    totalRegistros,
    limite,
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
