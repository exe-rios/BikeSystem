import { useState, useEffect } from 'react';
import type { Bicicleta, Cliente } from '../types';
import { api } from '../services/api';

export function BicicletasView() {
  const [bicicletas, setBicicletas] = useState<Bicicleta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevaBici, setNuevaBici] = useState<{
    id_cliente: number;
    marca: string;
    modelo: string;
  }>({
    id_cliente: 0,
    marca: '',
    modelo: ''
  });

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const [resBicis, resClientes] = await Promise.all([
        api.bicicletas.getAll(),
        api.clientes.getAll()
      ]);
      setBicicletas(resBicis.bicicletas || []);
      setClientes(resClientes.clientes || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar datos de bicicletas');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleGuardarBici = async (e: React.FormEvent) => {
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
      setNuevaBici({ id_cliente: 0, marca: '', modelo: '' });
      setMostrarModal(false);
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al registrar bicicleta: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarBici = async (id: number) => {
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
  };

  const bicicletasFiltradas = bicicletas.filter(b => {
    const termino = busqueda.toLowerCase();
    const nombreDueno = `${b.nombre || ''} ${b.apellido || ''}`.toLowerCase();
    return (
      b.marca.toLowerCase().includes(termino) ||
      b.modelo.toLowerCase().includes(termino) ||
      nombreDueno.includes(termino)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* HEADER SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Gestión de Bicicletas</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', marginTop: '2px' }}>Registro de rodados asociados a clientes para servicios y taller</p>
        </div>

        <button
          onClick={() => setMostrarModal(true)}
          style={{
            backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none',
            padding: '12px 20px', borderRadius: '10px', fontWeight: '600',
            fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          Registrar Bicicleta
        </button>
      </div>

      {/* BLOQUE DE CONTADORES Y BUSCADOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
        <div style={{
          backgroundColor: 'var(--naranja-notif)', padding: '12px 20px', borderRadius: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Bicicletas de Clientes</span>
          <span style={{
            backgroundColor: '#ff9248', color: '#fff', padding: '2px 10px',
            borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem'
          }}>{bicicletas.length}</span>
        </div>

        <input
          type="text"
          placeholder="Buscar por dueño, marca, modelo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid var(--borde-input)',
            backgroundColor: 'var(--bg-tarjeta)',
            color: 'var(--texto-principal)',
            width: '320px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* TABLA DE CONTENIDO */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Dueño / Cliente</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Marca</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Modelo</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  Cargando bicicletas registradas...
                </td>
              </tr>
            ) : bicicletasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  {bicicletas.length === 0 ? 'No hay bicicletas de clientes registradas en el sistema.' : 'No se encontraron bicicletas con ese criterio de búsqueda.'}
                </td>
              </tr>
            ) : (
              bicicletasFiltradas.map(b => {
                const nombreDueno = b.nombre ? `${b.apellido}, ${b.nombre}` : `Cliente #${b.id_cliente}`;
                return (
                  <tr key={b.id_bicicleta} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '600', color: 'var(--texto-principal)' }}>
                      {nombreDueno}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-principal)', fontWeight: '500' }}>
                      {b.marca}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>
                      {b.modelo}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button
                        onClick={() => b.id_bicicleta && handleEliminarBici(b.id_bicicleta)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL REGISTRAR BICICLETA */}
      {mostrarModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '500px', padding: '30px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Registrar Bicicleta de Cliente</h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleGuardarBici} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Asignar Dueño / Cliente *</label>
                <select
                  value={nuevaBici.id_cliente}
                  onChange={e => setNuevaBici({ ...nuevaBici, id_cliente: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
                  required
                >
                  <option value={0}>-- Seleccionar Cliente --</option>
                  {clientes.map(c => (
                    <option key={c.id_cliente} value={c.id_cliente}>{c.apellido}, {c.nombre} (DNI: {c.dni})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Marca *</label>
                <input
                  type="text"
                  placeholder="Ej: Trek, Specialized, Vairo, Venzo..."
                  value={nuevaBici.marca}
                  onChange={e => setNuevaBici({ ...nuevaBici, marca: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Modelo *</label>
                <input
                  type="text"
                  placeholder="Ej: Marlin 7, Rockhopper, XR 3.8..."
                  value={nuevaBici.modelo}
                  onChange={e => setNuevaBici({ ...nuevaBici, modelo: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setMostrarModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid var(--borde-input)', borderRadius: '10px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                <button type="submit" disabled={guardando} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Guardando...' : 'Guardar Bicicleta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}