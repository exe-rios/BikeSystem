import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Cliente, ClienteFormData, ErroresFormulario } from '../types';
import { api } from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';

const INITIAL_FORM: ClienteFormData = {
  nombre: '',
  apellido: '',
  dni: '',
  telefono: '',
  email: '',
  direccion: ''
};

/** Hook para la administración del listado de clientes, validación de formularios y CRUD. */
export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const busquedaDebounced = useDebounce(busqueda, 300);

  // Paginación de 10 en 10
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const [totalRegistros, setTotalRegistros] = useState<number>(0);
  const limite = 10;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaginaActual(1);
  }, [busquedaDebounced]);

  // Modal State
  const [mostrarModal, setMostrarModal] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>(INITIAL_FORM);
  const [erroresForm, setErroresForm] = useState<ErroresFormulario>({});

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.clientes.getAll({
        busqueda: busquedaDebounced,
        limite,
        pagina: paginaActual
      });
      const lista = Array.isArray(data) ? data : (data?.clientes || []);
      const total = !Array.isArray(data) && typeof data?.total === 'number' ? data.total : lista.length;
      const totalP = !Array.isArray(data) && typeof data?.totalPaginas === 'number' ? data.totalPaginas : Math.ceil(total / limite) || 1;

      setClientes(lista);
      setTotalRegistros(total);
      setTotalPaginas(totalP);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar la lista de clientes');
      }
    } finally {
      setCargando(false);
    }
  }, [busquedaDebounced, paginaActual, limite]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarClientes();
  }, [cargarClientes]);

  const resetFormulario = useCallback(() => {
    setFormData(INITIAL_FORM);
    setErroresForm({});
    setErrorModal(null);
  }, []);

  const abrirModalNuevo = useCallback(() => {
    setClienteEditando(null);
    resetFormulario();
    setMostrarModal(true);
  }, [resetFormulario]);

  const abrirModalEditar = useCallback((cliente: Cliente) => {
    setClienteEditando(cliente);
    setFormData({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      dni: cliente.dni,
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || ''
    });
    setErroresForm({});
    setErrorModal(null);
    setMostrarModal(true);
  }, []);

  const cerrarModal = useCallback(() => {
    setMostrarModal(false);
    setClienteEditando(null);
    resetFormulario();
  }, [resetFormulario]);

  /** Valida los campos del formulario y persiste el alta o actualización del cliente. */
  const handleGuardar = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);
    setErroresForm({});

    const nuevosErrores: ErroresFormulario = {};
    const nombreLimpio = formData.nombre.trim();
    if (!nombreLimpio || nombreLimpio.length < 2) {
      nuevosErrores.nombre = 'El nombre es obligatorio (mínimo 2 caracteres).';
    } else if (nombreLimpio.length > 50) {
      nuevosErrores.nombre = 'El nombre no puede superar los 50 caracteres.';
    }

    const apellidoLimpio = formData.apellido.trim();
    if (!apellidoLimpio || apellidoLimpio.length < 2) {
      nuevosErrores.apellido = 'El apellido es obligatorio (mínimo 2 caracteres).';
    } else if (apellidoLimpio.length > 50) {
      nuevosErrores.apellido = 'El apellido no puede superar los 50 caracteres.';
    }

    const dniLimpio = formData.dni.trim();
    if (!/^\d{7,10}$/.test(dniLimpio)) {
      nuevosErrores.dni = 'El DNI debe tener entre 7 y 10 dígitos sin puntos.';
    }

    if (formData.email && formData.email.trim()) {
      const emailLimpio = formData.email.trim();
      if (emailLimpio.length > 100) {
        nuevosErrores.email = 'El correo no puede superar los 100 caracteres.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
        nuevosErrores.email = 'El formato de correo no es válido.';
      }
    }

    if (formData.telefono && formData.telefono.trim()) {
      const telLimpio = formData.telefono.trim();
      const digitos = telLimpio.replace(/\D/g, '');
      if (telLimpio.length > 20 || !/^[+\d\s()-]+$/.test(telLimpio) || digitos.length < 7) {
        nuevosErrores.telefono = 'Ingrese un número válido (7 a 20 caracteres).';
      }
    }

    if (formData.direccion && formData.direccion.trim().length > 150) {
      nuevosErrores.direccion = 'La dirección no puede superar los 150 caracteres.';
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErroresForm(nuevosErrores);
      return;
    }

    setGuardando(true);
    try {
      if (clienteEditando?.id_cliente) {
        await api.clientes.update(clienteEditando.id_cliente, formData);
      } else {
        await api.clientes.create(formData);
      }
      setMostrarModal(false);
      await cargarClientes();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'data' in err && (err as { data?: { detalles?: string[] } }).data?.detalles) {
        const detalles = (err as { data?: { detalles?: string[] } }).data?.detalles;
        if (Array.isArray(detalles)) {
          setErrorModal(detalles.join(' '));
          return;
        }
      }
      if (err instanceof Error) {
        setErrorModal(err.message);
      } else {
        setErrorModal('Ocurrió un error inesperado al guardar el cliente');
      }
    } finally {
      setGuardando(false);
    }
  }, [formData, clienteEditando, cargarClientes]);

  /** Confirma y ejecuta la eliminación del cliente seleccionado. */
  const handleEliminar = useCallback(async (id_cliente: number, nombreCompleto: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al cliente "${nombreCompleto}"?`)) {
      return;
    }

    try {
      await api.clientes.delete(id_cliente);
      await cargarClientes();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`No se pudo eliminar: ${err.message}`);
      }
    }
  }, [cargarClientes]);

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.toLowerCase().trim();
    if (!termino || termino === busquedaDebounced.toLowerCase().trim()) return clientes;
    const cleanId = termino.replace(/^#/, '');
    return clientes.filter(c => {
      const nombreApellido = `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase();
      const apellidoNombre = `${c.apellido || ''} ${c.nombre || ''}`.toLowerCase();
      const idStr = String(c.id_cliente || '');
      return (
        (c.nombre && c.nombre.toLowerCase().includes(termino)) ||
        (c.apellido && c.apellido.toLowerCase().includes(termino)) ||
        nombreApellido.includes(termino) ||
        apellidoNombre.includes(termino) ||
        (c.dni && c.dni.toLowerCase().includes(termino)) ||
        (c.telefono && c.telefono.toLowerCase().includes(termino)) ||
        (c.email && c.email.toLowerCase().includes(termino)) ||
        idStr.includes(cleanId)
      );
    });
  }, [clientes, busqueda, busquedaDebounced]);

  return {
    clientes,
    clientesFiltrados,
    totalClientes: totalRegistros,
    paginaActual,
    setPaginaActual,
    totalPaginas,
    totalRegistros,
    limite,
    cargando,
    guardando,
    error,
    errorModal,
    busqueda,
    mostrarModal,
    clienteEditando,
    formData,
    erroresForm,
    setBusqueda,
    setFormData,
    abrirModalNuevo,
    abrirModalEditar,
    cerrarModal,
    handleGuardar,
    handleEliminar,
    recargar: cargarClientes
  };
}
