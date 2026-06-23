import { useState, useEffect } from 'react';
import type { Reparacion } from '../types';

type ReparacionConDescripcion = Omit<Reparacion, 'descripcion_falla' | 'costo_estimado'> & { descripcion: string; costo: number };

export function ReparacionesView() {
  // Estado real conectado a tus tipos de la aplicación
  const [reparaciones, setReparaciones] = useState<ReparacionConDescripcion[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [bicicletas, setBicicletas] = useState<Array<{ id_bicicleta: number; marca?: string; modelo?: string; cliente_nombre?: string; cliente_apellido?: string }>>([]);

  // Estado del formulario mapeado uno a uno con la estructura de tu tabla/tipo Reparacion
  const [nuevaReparacion, setNuevaReparacion] = useState<{
    id_bicicleta: string;
    descripcion: string;
    costo: string;
    estado: Reparacion['estado'];
  }>({
    id_bicicleta: '',
    descripcion: '',
    costo: '',
    estado: 'Recibida'
  });
  

  // Configuración de las 4 columnas requeridas del tablero Kanban
  const columnas: { titulo: string; estado: Reparacion['estado']; colorBg: string }[] = [
    { titulo: 'Recibida', estado: 'Recibida', colorBg: '#f59e0b' },
    { titulo: 'En Reparación', estado: 'En Reparación', colorBg: '#ea580c' },
    { titulo: 'Lista', estado: 'Lista', colorBg: '#0d9488' },
    { titulo: 'Entregada', estado: 'Entregada', colorBg: '#64748b' }
  ];

  // Drag state
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const handleGuardarReparacion = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nuevaReparacion.id_bicicleta || !nuevaReparacion.descripcion.trim()) {
      alert('Por favor, completa los campos obligatorios.');
      return;
    }

    // TODO: Reemplazar por POST /api/talleres real
    const nueva: ReparacionConDescripcion = {
      id_reparacion: reparaciones.length + 1, // Simulación de Autoincrementable temporal
      id_bicicleta: Number(nuevaReparacion.id_bicicleta),
      fecha_ingreso: new Date().toLocaleDateString('es-AR'),
      descripcion: nuevaReparacion.descripcion,
      estado: nuevaReparacion.estado,
      costo: Number(nuevaReparacion.costo) || 0
    };

    setReparaciones([...reparaciones, nueva]);

    // Resetear formulario a su estado vacío inicial
    setNuevaReparacion({ id_bicicleta: '', descripcion: '', costo: '', estado: 'Recibida' });
    setMostrarModal(false);
  };

  // Cargar lista completa de bicicletas cuando se abre el modal
  useEffect(() => {
    if (!mostrarModal) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/bicicletas');
        if (!res.ok) return;
        const data = await res.json();
        const lista = Array.isArray(data.bicicletas) ? data.bicicletas : data;
        if (!mounted) return;
        setBicicletas(lista.map((b: any) => ({ id_bicicleta: b.id_bicicleta, marca: b.marca, modelo: b.modelo, cliente_nombre: b.nombre, cliente_apellido: b.apellido })));
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [mostrarModal]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px' }}>

      {/* Encabezado de la Sección */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)', margin: 0 }}>Gestión de Reparaciones</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Administre el taller y seguimiento de reparaciones</p>
        </div>

        <button
          onClick={() => setMostrarModal(true)}
          style={{
            backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none',
            padding: '12px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer'
          }}
        >
          ➕ Registrar Nueva Reparación
        </button>
      </div>

      {/* Contenedor del Tablero (Grid de 4 columnas) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(250px, 1fr))',
        gap: '16px',
        alignItems: 'start',
        overflowX: 'auto'
      }}>
          {columnas.map(col => {
          const reparacionesFiltradas = reparaciones.filter(r => r.estado === col.estado);

          return (
            <div key={col.titulo} style={{
              backgroundColor: 'var(--bg-tarjeta)',
              borderRadius: '14px',
              border: '1px solid var(--borde-input)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              paddingBottom: '16px',
              minHeight: '400px'
            }}>

              {/* Cabecera de la Columna */}
              <div style={{
                backgroundColor: col.colorBg,
                color: '#fff',
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>{col.titulo}</span>
                <span style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '700'
                }}>
                  {reparacionesFiltradas.length}
                </span>
              </div>

              {/* Listado de Tarjetas dentro de la columna */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={async e => {
                  e.preventDefault();
                  const idStr = e.dataTransfer.getData('text/plain');
                  if (!idStr) return;
                  const id = Number(idStr);
                  const reparacion = reparaciones.find(r => r.id_reparacion === id);
                  if (!reparacion) return;

                  // Optimistic UI update
                  setReparaciones(prev => prev.map(r => r.id_reparacion === id ? ({ ...r, estado: col.estado as Reparacion['estado'] }) : r));

                  // Persist change to backend
                  try {
                    await fetch(`/reparacion/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ estado: col.estado })
                    });
                  } catch (err) {
                    // Revert UI on error
                    setReparaciones(prev => prev.map(r => r.id_reparacion === id ? ({ ...r, estado: reparacion.estado }) : r));
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 12px' }}
              >
                {reparacionesFiltradas.length === 0 ? (
                  <p style={{ color: 'var(--texto-mutado)', fontSize: '0.85rem', textAlign: 'center', padding: '30px 0' }}>
                    No hay reparaciones
                  </p>
                ) : (
                  reparacionesFiltradas.map(rep => (
                    <div
                      key={rep.id_reparacion}
                      draggable
                      onDragStart={e => {
                        if (rep.id_reparacion != null) setDraggingId(rep.id_reparacion);
                        e.dataTransfer.setData('text/plain', String(rep.id_reparacion));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      style={{
                        backgroundColor: draggingId === rep.id_reparacion ? 'rgba(0,0,0,0.03)' : 'var(--bg-principal)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid var(--borde-input)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        opacity: draggingId != null && draggingId === rep.id_reparacion ? 0.6 : 1
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: col.colorBg, textTransform: 'uppercase' }}>
                          Orden #{rep.id_reparacion}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>🚲 Bici ID: {rep.id_bicicleta}</span>
                      </div>

                      <p style={{ margin: '6px 0', fontSize: '0.9rem', color: 'var(--texto-principal)', backgroundColor: 'rgba(0,0,0,0.01)', padding: '8px', borderRadius: '6px', borderLeft: `3px solid ${col.colorBg}` }}>
                        {rep.descripcion}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--borde-input)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>📅 {rep.fecha_ingreso}</span>
                        {rep.costo > 0 && (
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#10b981' }}>${rep.costo}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* --- MODAL FLOTANTE DE REGISTRO REAL --- */}
      {mostrarModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '450px', padding: '30px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', color: 'var(--texto-principal)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Registrar Orden de Taller</h3>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleGuardarReparacion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Bicicleta *</label>
                <select
                  value={nuevaReparacion.id_bicicleta}
                  onChange={e => setNuevaReparacion({ ...nuevaReparacion, id_bicicleta: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
                >
                  <option value="">-- Seleccione una bicicleta --</option>
                  {bicicletas.map(b => (
                    <option key={b.id_bicicleta} value={String(b.id_bicicleta)}>{`${b.id_bicicleta} — ${b.marca || ''} ${b.modelo || ''} ${b.cliente_nombre ? `(${b.cliente_nombre} ${b.cliente_apellido || ''})` : ''}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Descripción del Trabajo / Falla *</label>
                <textarea
                  rows={3}
                  placeholder="Ej: Cambio de transmisión, Service completo, Ajuste de frenos..."
                  value={nuevaReparacion.descripcion}
                  onChange={e => setNuevaReparacion({ ...nuevaReparacion, descripcion: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Estado Inicial</label>
                  <select
                    value={nuevaReparacion.estado}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNuevaReparacion({ ...nuevaReparacion, estado: e.target.value as Reparacion['estado'] })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
                  >
                    <option value="Recibida">Recibida</option>
                    <option value="En Reparación">En Reparación</option>
                    <option value="Lista">Lista</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Costo Presupuestado ($)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={nuevaReparacion.costo}
                    onChange={e => setNuevaReparacion({ ...nuevaReparacion, costo: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setMostrarModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid var(--borde-input)', borderRadius: '10px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Ingresar al Taller</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}