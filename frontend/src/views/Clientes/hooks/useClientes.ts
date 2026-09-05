import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Cliente, ClienteFormData, ErroresFormulario } from '../types';
import { api } from '../../../services/api';

const INITIAL_FORM: ClienteFormData = {
  nombre: '',
  apellido: '',
  dni: '',
  telefono: '',
  email: '',
  direccion: ''
};

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Modal State
  const [mostrarModal, setMostrarModal] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<ClienteFormData>(INITIAL_FORM);
  const [erroresForm, setErroresForm] = useState<ErroresFormulario>({});

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.clientes.getAll();
      const lista = Array.isArray(data) ? data : (data?.clientes || []);
      setClientes(lista);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar la lista de clientes');
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
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

  const handleGuardar = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);
    setErroresForm({});

    const nuevosErrores: ErroresFormulario = {};
    if (!formData.nombre.trim() || formData.nombre.trim().length < 2) {
      nuevosErrores.nombre = 'El nombre es obligatorio (mínimo 2 caracteres).';
    }
    if (!formData.apellido.trim() || formData.apellido.trim().length < 2) {
      nuevosErrores.apellido = 'El apellido es obligatorio (mínimo 2 caracteres).';
    }
    const dniLimpio = formData.dni.trim();
    if (!/^\d{7,8}$/.test(dniLimpio)) {
      nuevosErrores.dni = 'El DNI debe tener 7 u 8 dígitos sin puntos.';
    }
    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nuevosErrores.email = 'El formato de correo no es válido.';
    }
    if (formData.telefono && formData.telefono.trim() && !/^\+?\d{7,15}$/.test(formData.telefono.trim())) {
      nuevosErrores.telefono = 'Ingrese un número válido (7 a 15 dígitos).';
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
    if (!termino) return clientes;
    return clientes.filter(c => {
      return (
        (c.nombre && c.nombre.toLowerCase().includes(termino)) ||
        (c.apellido && c.apellido.toLowerCase().includes(termino)) ||
        (c.dni && c.dni.toLowerCase().includes(termino)) ||
        (c.telefono && c.telefono.toLowerCase().includes(termino)) ||
        (c.email && c.email.toLowerCase().includes(termino))
      );
    });
  }, [clientes, busqueda]);

  return {
    clientes,
    clientesFiltrados,
    totalClientes: clientes.length,
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
