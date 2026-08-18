import { useState, useEffect } from 'react';
import type { Proveedor } from '../types';
import { api } from '../services/api';

export function ProveedoresView() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');

  // Modal State
  const [mostrarModal, setMostrarModal] = useState<boolean>(false);
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState<Omit<Proveedor, 'id_proveedor'>>({
    nombre_empresa: '',
    cuit: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  const cargarProveedores = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await api.proveedores.getAll();
      setProveedores(data.proveedores || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar proveedores desde el servidor.');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  const handleAbrirCrear = () => {
    setProveedorEditando(null);
    setFormData({ nombre_empresa: '', cuit: '', telefono: '', email: '', direccion: '' });
    setMostrarModal(true);
  };

  const handleAbrirEditar = (prov: Proveedor) => {
    setProveedorEditando(prov);
    setFormData({
      nombre_empresa: prov.nombre_empresa || '',
      cuit: prov.cuit || '',
      telefono: prov.telefono || '',
      email: prov.email || '',
      direccion: prov.direccion || ''
    });
    setMostrarModal(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre_empresa.trim()) {
      alert('El nombre o razón social de la empresa es obligatorio.');
      return;
    }

    setGuardando(true);
    try {
      if (proveedorEditando && proveedorEditando.id_proveedor) {
        await api.proveedores.update(proveedorEditando.id_proveedor, formData);
        alert('Proveedor actualizado con éxito.');
      } else {
        await api.proveedores.create(formData);
        alert('Proveedor registrado exitosamente.');
      }
      setMostrarModal(false);
      await cargarProveedores();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al guardar proveedor: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al proveedor "${nombre}"?`)) {
      return;
    }
    try {
      await api.proveedores.delete(id);
      alert('Proveedor eliminado correctamente.');
      await cargarProveedores();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`No se pudo eliminar: ${err.message}`);
      }
    }
  };

  const proveedoresFiltrados = proveedores.filter(p => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return true;
    const nombre = (p.nombre_empresa || '').toLowerCase();
    const cuit = (p.cuit || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const tel = (p.telefono || '').toLowerCase();
    return nombre.includes(term) || cuit.includes(term) || email.includes(term) || tel.includes(term);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)', margin: 0 }}>
            Directorio de Proveedores
          </h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Gestión de empresas mayoristas, distribuidores y contactos comerciales
          </p>
        </div>

        <button
          onClick={handleAbrirCrear}
          style={{
            backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none',
            padding: '12px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          Nuevo Proveedor
        </button>
      </div>

      {/* CONTADOR Y BUSCADOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
        <div style={{
          backgroundColor: 'var(--naranja-notif)', padding: '12px 20px', borderRadius: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Proveedores Registrados</span>
          <span style={{
            backgroundColor: '#ff9248', color: '#fff', padding: '2px 10px',
            borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem'
          }}>{proveedores.length}</span>
        </div>

        <input
          type="text"
          placeholder="Buscar por razón social, CUIT o teléfono..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--borde-input)',
            backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', width: '340px', fontSize: '0.9rem'
          }}
        />
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* TABLA DE PROVEEDORES */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Empresa / Razón Social</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>CUIT</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Teléfono</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Email</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Dirección</th>
              <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  Cargando directorio de proveedores...
                </td>
              </tr>
            ) : proveedoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  {proveedores.length === 0 ? 'No hay proveedores registrados.' : 'No se encontraron proveedores con ese término.'}
                </td>
              </tr>
            ) : (
              proveedoresFiltrados.map(p => (
                <tr key={p.id_proveedor} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                  <td style={{ padding: '16px', fontWeight: '700', color: 'var(--texto-principal)', fontSize: '0.95rem' }}>
                    {p.nombre_empresa}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--texto-mutado)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {p.cuit || '-'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--texto-principal)', fontSize: '0.9rem' }}>
                    {p.telefono ? `${p.telefono}` : '-'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--texto-mutado)', fontSize: '0.9rem' }}>
                    {p.email || '-'}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--texto-mutado)', fontSize: '0.88rem' }}>
                    {p.direccion || '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleAbrirEditar(p)}
                        style={{
                          backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--azul-oscuro)',
                          border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '6px', padding: '6px 12px',
                          fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer'
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => p.id_proveedor && handleEliminar(p.id_proveedor, p.nombre_empresa)}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '6px 12px',
                          fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer'
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR / EDITAR PROVEEDOR */}
      {mostrarModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '500px', padding: '28px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', color: 'var(--texto-principal)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
                {proveedorEditando ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
              </h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Razón Social / Empresa *</label>
                <input
                  type="text"
                  placeholder="Ej: Distribuidora Shimano Argentina"
                  value={formData.nombre_empresa}
                  onChange={e => setFormData({ ...formData, nombre_empresa: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>CUIT</label>
                  <input
                    type="text"
                    placeholder="30-12345678-9"
                    value={formData.cuit}
                    onChange={e => setFormData({ ...formData, cuit: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Teléfono</label>
                  <input
                    type="text"
                    placeholder="011-4567-8900"
                    value={formData.telefono}
                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="ventas@proveedor.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Dirección / Localidad</label>
                <input
                  type="text"
                  placeholder="Av. Corrientes 1234, CABA"
                  value={formData.direccion}
                  onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setMostrarModal(false)} style={{ flex: 1, padding: '11px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                <button type="submit" disabled={guardando} style={{ flex: 2, padding: '11px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Guardando...' : (proveedorEditando ? 'Guardar Cambios' : 'Registrar Proveedor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
