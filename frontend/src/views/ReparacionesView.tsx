import { useState, useEffect } from 'react';
import type { Reparacion, Bicicleta, Producto, DetalleReparacionItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function ReparacionesView() {
  const { user } = useAuth();

  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [bicicletas, setBicicletas] = useState<Bicicleta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [busquedaTaller, setBusquedaTaller] = useState<string>('');

  // Modal Alta
  const [mostrarModalAlta, setMostrarModalAlta] = useState<boolean>(false);
  const [nuevaReparacion, setNuevaReparacion] = useState<{
    id_bicicleta: number;
    descripcion: string;
    costo_mano_obra: number;
    estado: Reparacion['estado'];
  }>({
    id_bicicleta: 0,
    descripcion: '',
    costo_mano_obra: 0,
    estado: 'Recibida'
  });

  // Modal Edición
  const [ordenEditando, setOrdenEditando] = useState<Reparacion | null>(null);
  const [mostrarModalEditar, setMostrarModalEditar] = useState<boolean>(false);

  // Modal Detalle & Repuestos
  const [mostrarModalDetalle, setMostrarModalDetalle] = useState<boolean>(false);
  const [ordenDetalle, setOrdenDetalle] = useState<Reparacion | null>(null);
  const [repuestosUtilizados, setRepuestosUtilizados] = useState<DetalleReparacionItem[]>([]);
  const [cargandoRepuestos, setCargandoRepuestos] = useState<boolean>(false);

  // Selector de nuevo repuesto en modal
  const [repuestoSeleccionadoId, setRepuestoSeleccionadoId] = useState<number>(0);
  const [cantidadRepuesto, setCantidadRepuesto] = useState<number>(1);
  const [guardandoRepuesto, setGuardandoRepuesto] = useState<boolean>(false);

  // Drag state
  const [draggingId, setDraggingId] = useState<number | null>(null);

  // Columnas Kanban
  const columnas: { titulo: string; estado: Reparacion['estado']; colorBg: string }[] = [
    { titulo: 'Recibida', estado: 'Recibida', colorBg: '#f59e0b' },
    { titulo: 'En Reparación', estado: 'En Reparación', colorBg: '#ea580c' },
    { titulo: 'Lista', estado: 'Lista', colorBg: '#0d9488' },
    { titulo: 'Entregada', estado: 'Entregada', colorBg: '#64748b' }
  ];

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const [resRep, resBicis, resProds] = await Promise.all([
        api.reparaciones.getAll(),
        api.bicicletas.getAll(),
        api.productos.getAll()
      ]);
      setReparaciones(resRep.reparaciones || []);
      setBicicletas(resBicis.bicicletas || []);
      setProductos(resProds.productos || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar órdenes de taller');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleGuardarReparacion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nuevaReparacion.id_bicicleta === 0 || !nuevaReparacion.descripcion.trim()) {
      alert('Por favor selecciona una bicicleta y describe el trabajo a realizar.');
      return;
    }

    setGuardando(true);
    try {
      await api.reparaciones.create({
        id_bicicleta: nuevaReparacion.id_bicicleta,
        id_usuario: user?.id_usuario || 1,
        estado: nuevaReparacion.estado,
        descripcion: nuevaReparacion.descripcion.trim(),
        costo_mano_obra: Number(nuevaReparacion.costo_mano_obra) || 0
      });

      alert('¡Orden de reparación ingresada al taller con éxito!');
      setNuevaReparacion({ id_bicicleta: 0, descripcion: '', costo_mano_obra: 0, estado: 'Recibida' });
      setMostrarModalAlta(false);
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al registrar orden: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleAbrirDetalle = async (rep: Reparacion) => {
    setOrdenDetalle(rep);
    setMostrarModalDetalle(true);
    setCargandoRepuestos(true);
    setRepuestoSeleccionadoId(0);
    setCantidadRepuesto(1);

    try {
      if (rep.id_reparacion) {
        const res = await api.reparaciones.getById(rep.id_reparacion);
        setOrdenDetalle(res.reparacion);
        setRepuestosUtilizados(res.repuestos_utilizados || []);
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setCargandoRepuestos(false);
    }
  };

  const handleAgregarRepuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenDetalle || !ordenDetalle.id_reparacion) return;
    if (repuestoSeleccionadoId === 0) {
      alert('Selecciona un repuesto del inventario.');
      return;
    }

    const prod = productos.find(p => p.id_producto === repuestoSeleccionadoId);
    if (!prod) return;

    if (cantidadRepuesto > prod.cantidad) {
      alert(`Stock insuficiente de "${prod.nombre}". Disponible: ${prod.cantidad}`);
      return;
    }

    setGuardandoRepuesto(true);
    try {
      await api.reparaciones.agregarRepuesto({
        id_reparacion: ordenDetalle.id_reparacion,
        id_producto: prod.id_producto!,
        cantidad: cantidadRepuesto,
        precio_unitario: Number(prod.precio)
      });

      alert(`Repuesto "${prod.nombre}" asignado a la orden. Stock descontado.`);
      setRepuestoSeleccionadoId(0);
      setCantidadRepuesto(1);

      // Recargar detalle y listado
      const res = await api.reparaciones.getById(ordenDetalle.id_reparacion);
      setOrdenDetalle(res.reparacion);
      setRepuestosUtilizados(res.repuestos_utilizados || []);
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al agregar repuesto: ${err.message}`);
      }
    } finally {
      setGuardandoRepuesto(false);
    }
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenEditando || !ordenEditando.id_reparacion) return;

    setGuardando(true);
    try {
      await api.reparaciones.updateEstado(ordenEditando.id_reparacion, {
        estado: ordenEditando.estado,
        descripcion: ordenEditando.descripcion,
        costo_mano_obra: Number(ordenEditando.costo_mano_obra) || 0
      });

      alert('Orden actualizada con éxito');
      setMostrarModalEditar(false);
      setOrdenEditando(null);
      await cargarDatos();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Error al actualizar orden: ${err.message}`);
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (id: number, nuevoEstado: Reparacion['estado']) => {
    const reparacionActual = reparaciones.find(r => r.id_reparacion === id);
    if (!reparacionActual || reparacionActual.estado === nuevoEstado) return;

    const estadoPrevio = reparacionActual.estado;
    setReparaciones(prev => prev.map(r => r.id_reparacion === id ? { ...r, estado: nuevoEstado } : r));

    try {
      await api.reparaciones.updateEstado(id, { estado: nuevoEstado });
    } catch (err: unknown) {
      setReparaciones(prev => prev.map(r => r.id_reparacion === id ? { ...r, estado: estadoPrevio } : r));
      alert('No se pudo actualizar el estado de la orden en el servidor');
    }
  };

  const handleDropEnColumna = (nuevoEstado: Reparacion['estado'], idReparacionStr: string) => {
    const id = Number(idReparacionStr);
    if (id) {
      handleCambiarEstado(id, nuevoEstado);
    }
  };

  const reparacionesFiltradasPorBusqueda = reparaciones.filter(r => {
    const term = busquedaTaller.toLowerCase().trim();
    if (!term) return true;
    const desc = (r.descripcion || '').toLowerCase();
    const marca = (r.marca || '').toLowerCase();
    const modelo = (r.modelo || '').toLowerCase();
    const cliente = `${r.cliente_nombre || ''} ${r.cliente_apellido || ''}`.toLowerCase();
    const idStr = String(r.id_reparacion);
    return desc.includes(term) || marca.includes(term) || modelo.includes(term) || cliente.includes(term) || idStr.includes(term);
  });

  const repuestosDisponibles = productos.filter(p => (p.tipo_prod || '').toLowerCase() !== 'bicicleta');
  const productoRepuestoSeleccionado = productos.find(p => p.id_producto === repuestoSeleccionadoId);
  const totalRepuestosCosto = repuestosUtilizados.reduce((acc, item) => acc + Number(item.costo_total || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ENCABEZADO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)', margin: 0 }}>Gestión de Taller</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Control visual de services, asignación de repuestos y mano de obra</p>
        </div>

        <button
          onClick={() => {
            setNuevaReparacion({ id_bicicleta: 0, descripcion: '', costo_mano_obra: 0, estado: 'Recibida' });
            setMostrarModalAlta(true);
          }}
          style={{
            backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none',
            padding: '12px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          Registrar Nueva Reparación
        </button>
      </div>

      {/* CONTADORES Y BUSCADOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
        <div style={{
          backgroundColor: 'var(--naranja-notif)', padding: '12px 20px', borderRadius: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Órdenes Totales</span>
          <span style={{
            backgroundColor: '#ff9248', color: '#fff', padding: '2px 10px',
            borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem'
          }}>{reparaciones.length}</span>
        </div>

        <input
          type="text"
          placeholder="Buscar por orden #, cliente, bicicleta o descripción..."
          value={busquedaTaller}
          onChange={e => setBusquedaTaller(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid var(--borde-input)',
            backgroundColor: 'var(--bg-tarjeta)',
            color: 'var(--texto-principal)',
            width: '360px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* TABLERO KANBAN */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(260px, 1fr))',
        gap: '16px',
        alignItems: 'start',
        overflowX: 'auto',
        minHeight: '520px'
      }}>
        {columnas.map((col, colIdx) => {
          const reparacionesEnColumna = reparacionesFiltradasPorBusqueda.filter(r => r.estado === col.estado);

          return (
            <div
              key={col.titulo}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const idStr = e.dataTransfer.getData('text/plain');
                if (idStr) handleDropEnColumna(col.estado, idStr);
              }}
              style={{
                backgroundColor: 'var(--bg-tarjeta)',
                borderRadius: '14px',
                border: '1px solid var(--borde-input)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                paddingBottom: '16px',
                minHeight: '480px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
              }}
            >
              {/* Cabecera de Columna */}
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
                  {reparacionesEnColumna.length}
                </span>
              </div>

              {/* Lista de Tarjetas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 12px', flex: 1 }}>
                {cargando ? (
                  <p style={{ color: 'var(--texto-mutado)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                    Cargando...
                  </p>
                ) : reparacionesEnColumna.length === 0 ? (
                  <p style={{ color: 'var(--texto-mutado)', fontSize: '0.85rem', textAlign: 'center', padding: '40px 0', border: '1px dashed var(--borde-input)', borderRadius: '8px', margin: '8px 0' }}>
                    Arrastra aquí una orden
                  </p>
                ) : (
                  reparacionesEnColumna.map(rep => {
                    const montoTotal = Number(rep.costo_total || rep.costo_mano_obra || 0);

                    return (
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
                          padding: '14px',
                          border: '1px solid var(--borde-input)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          cursor: 'grab',
                          opacity: draggingId != null && draggingId === rep.id_reparacion ? 0.5 : 1,
                          transition: 'box-shadow 0.2s, transform 0.1s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: col.colorBg, textTransform: 'uppercase' }}>
                            Orden #{rep.id_reparacion}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAbrirDetalle(rep);
                              }}
                              title="Ver detalle, repuestos y talón de entrega"
                              style={{ background: 'none', border: 'none', color: 'var(--azul-oscuro)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', padding: '2px 4px' }}
                            >
                              🔍
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrdenEditando(rep);
                                setMostrarModalEditar(true);
                              }}
                              title="Editar orden"
                              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', padding: '2px 4px' }}
                            >
                              ✏️
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
                          🚲 {rep.marca || 'Bicicleta'} {rep.modelo || ''}
                        </div>

                        {rep.cliente_nombre && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>
                            Dueño: {rep.cliente_apellido}, {rep.cliente_nombre}
                          </div>
                        )}

                        <p style={{
                          margin: '4px 0',
                          fontSize: '0.85rem',
                          color: 'var(--texto-principal)',
                          backgroundColor: 'rgba(0,0,0,0.02)',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          borderLeft: `3px solid ${col.colorBg}`
                        }}>
                          {rep.descripcion}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', paddingTop: '6px', borderTop: '1px solid var(--borde-input)' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>Total Estimado</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#10b981' }}>
                            ${montoTotal.toLocaleString()}
                          </span>
                        </div>

                        {/* Botones de acción rápida */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed var(--borde-input)' }}>
                          {colIdx > 0 ? (
                            <button
                              type="button"
                              onClick={() => rep.id_reparacion && handleCambiarEstado(rep.id_reparacion, columnas[colIdx - 1].estado)}
                              style={{ background: 'none', border: '1px solid var(--borde-input)', borderRadius: '6px', padding: '3px 8px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}
                            >
                              ◀ {columnas[colIdx - 1].titulo}
                            </button>
                          ) : <div />}

                          {colIdx < columnas.length - 1 && (
                            <button
                              type="button"
                              onClick={() => rep.id_reparacion && handleCambiarEstado(rep.id_reparacion, columnas[colIdx + 1].estado)}
                              style={{ backgroundColor: columnas[colIdx + 1].colorBg, color: '#fff', border: 'none', borderRadius: '6px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                            >
                              {columnas[colIdx + 1].titulo} ▶
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* --- MODAL DETALLE COMPLETO Y ASIGNACIÓN DE REPUESTOS --- */}
      {mostrarModalDetalle && ordenDetalle && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
          <div className="imprimible" style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '740px', padding: '28px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 25px 30px -5px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
            color: 'var(--texto-principal)'
          }}>
            {/* MEMBRETE EXCLUSIVO PARA IMPRESIÓN */}
            <div className="imprimir-membrete">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800' }}>DN BIKE</h1>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#444' }}>Taller Especializado y Service de Bicicletas</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'monospace' }}>TALÓN DE TALLER</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#666' }}>ORDEN #{ordenDetalle.id_reparacion}</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--borde-input)', paddingBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--azul-oscuro)', textTransform: 'uppercase' }}>
                  Ficha Técnica de Taller
                </span>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '1.5rem', fontWeight: '800' }}>
                  Orden #{ordenDetalle.id_reparacion} — {ordenDetalle.marca} {ordenDetalle.modelo}
                </h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                  Dueño: {ordenDetalle.cliente_apellido}, {ordenDetalle.cliente_nombre} | Estado: <strong>{ordenDetalle.estado}</strong>
                </span>
              </div>

              <div className="no-imprimir" style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--borde-input)',
                    backgroundColor: 'var(--bg-principal)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600'
                  }}
                >
                  Imprimir Talón
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarModalDetalle(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* DESCRIPCIÓN DEL TRABAJO */}
            <div style={{ margin: '16px 0', padding: '12px', backgroundColor: 'var(--bg-principal)', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Diagnóstico / Tareas:</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.92rem' }}>{ordenDetalle.descripcion}</p>
            </div>

            {/* SECCIÓN DE REPUESTOS ASIGNADOS */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: '700' }}>Repuestos y Componentes Utilizados</h4>

              {/* Form para agregar repuesto (Oculto al imprimir) */}
              <form className="no-imprimir" onSubmit={handleAgregarRepuesto} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr auto', gap: '8px', marginBottom: '14px' }}>
                <select
                  value={repuestoSeleccionadoId}
                  onChange={e => setRepuestoSeleccionadoId(Number(e.target.value))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.88rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
                >
                  <option value={0}>-- Seleccionar repuesto del inventario --</option>
                  {repuestosDisponibles.map(p => (
                    <option key={p.id_producto} value={p.id_producto} disabled={p.cantidad <= 0}>
                      {p.nombre} {p.marca ? `(${p.marca})` : ''} - ${Number(p.precio).toLocaleString()} [Stock: {p.cantidad}]
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  max={productoRepuestoSeleccionado?.cantidad || 99}
                  value={cantidadRepuesto}
                  onChange={e => setCantidadRepuesto(Number(e.target.value))}
                  placeholder="Cant."
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.88rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
                />

                <button
                  type="submit"
                  disabled={guardandoRepuesto || repuestoSeleccionadoId === 0}
                  style={{
                    backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px 16px',
                    borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', cursor: guardandoRepuesto ? 'not-allowed' : 'pointer'
                  }}
                >
                  {guardandoRepuesto ? 'Sumando...' : '+ Asignar Repuesto'}
                </button>
              </form>

              {/* Tabla de repuestos de la orden */}
              <div style={{ border: '1px solid var(--borde-input)', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead style={{ backgroundColor: '#f8fafc' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', color: 'var(--texto-mutado)' }}>Repuesto</th>
                      <th style={{ padding: '8px 12px', color: 'var(--texto-mutado)', textAlign: 'center' }}>Cant.</th>
                      <th style={{ padding: '8px 12px', color: 'var(--texto-mutado)', textAlign: 'right' }}>Precio Unit.</th>
                      <th style={{ padding: '8px 12px', color: 'var(--texto-mutado)', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargandoRepuestos ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--texto-mutado)' }}>Cargando repuestos...</td>
                      </tr>
                    ) : repuestosUtilizados.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                          No se han registrado repuestos utilizados en esta orden aún.
                        </td>
                      </tr>
                    ) : (
                      repuestosUtilizados.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: '500' }}>
                            {item.nombre} {item.marca ? `(${item.marca})` : ''}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600' }}>{item.cantidad}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>${Number(item.precio_unitario).toLocaleString()}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>${Number(item.costo_total).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RESUMEN DE LIQUIDACIÓN */}
            <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '2px solid var(--borde-input)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-principal)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>Mano de Obra</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
                  ${Number(ordenDetalle.costo_mano_obra || 0).toLocaleString()}
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: 'var(--bg-principal)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>Total Repuestos</span>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#2563eb' }}>
                  ${totalRepuestosCosto.toLocaleString()}
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '700' }}>Total Liquidación</span>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#059669' }}>
                  ${Number(ordenDetalle.costo_total || (Number(ordenDetalle.costo_mano_obra || 0) + totalRepuestosCosto)).toLocaleString()}
                </div>
              </div>
            </div>

            {/* FIRMAS AL IMPRIMIR */}
            <div className="imprimir-membrete" style={{ marginTop: '24px', paddingTop: '12px', fontSize: '0.8rem', borderTop: '1px dashed #666', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <strong>Condiciones:</strong> Retirar el rodado dentro de los 30 días posteriores al aviso de finalización.<br />
                Garantía del service técnico: 30 días sobre trabajos realizados.
              </div>
              <div style={{ textAlign: 'center', width: '200px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                Firma de Conformidad
              </div>
            </div>

            <div className="no-imprimir" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setMostrarModalDetalle(false)}
                style={{ padding: '10px 22px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL ALTA DE REPARACIÓN --- */}
      {mostrarModalAlta && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '500px', padding: '30px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', color: 'var(--texto-principal)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Registrar Orden de Taller</h3>
              <button onClick={() => setMostrarModalAlta(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleGuardarReparacion} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Bicicleta a Reparar *</label>
                <select
                  value={nuevaReparacion.id_bicicleta}
                  onChange={e => setNuevaReparacion({ ...nuevaReparacion, id_bicicleta: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
                  required
                >
                  <option value={0}>-- Seleccione la bicicleta del cliente --</option>
                  {bicicletas.map(b => (
                    <option key={b.id_bicicleta} value={b.id_bicicleta}>
                      #{b.id_bicicleta} — {b.marca} {b.modelo} {b.nombre ? `(${b.apellido}, ${b.nombre})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Descripción del Trabajo / Falla *</label>
                <textarea
                  rows={3}
                  placeholder="Ej: Cambio de cámara y cubierta, regulación de cambios Shimano, centrado de llanta..."
                  value={nuevaReparacion.descripcion}
                  onChange={e => setNuevaReparacion({ ...nuevaReparacion, descripcion: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', resize: 'none', boxSizing: 'border-box' }}
                  required
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
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Costo Mano de Obra ($) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={nuevaReparacion.costo_mano_obra || ''}
                    onChange={e => setNuevaReparacion({ ...nuevaReparacion, costo_mano_obra: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setMostrarModalAlta(false)} style={{ flex: 1, padding: '12px', border: '1px solid var(--borde-input)', borderRadius: '10px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                <button type="submit" disabled={guardando} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Ingresando...' : 'Ingresar al Taller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDITAR ORDEN DE TALLER --- */}
      {mostrarModalEditar && ordenEditando && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-tarjeta)', width: '480px', padding: '28px',
            borderRadius: '16px', border: '1px solid var(--borde-input)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', color: 'var(--texto-principal)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>Editar Orden #{ordenEditando.id_reparacion}</h3>
              <button onClick={() => setMostrarModalEditar(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
            </div>

            <form onSubmit={handleGuardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Descripción del Trabajo</label>
                <textarea
                  rows={3}
                  value={ordenEditando.descripcion}
                  onChange={e => setOrdenEditando({ ...ordenEditando, descripcion: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', resize: 'none', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Estado</label>
                  <select
                    value={ordenEditando.estado}
                    onChange={e => setOrdenEditando({ ...ordenEditando, estado: e.target.value as Reparacion['estado'] })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
                  >
                    <option value="Recibida">Recibida</option>
                    <option value="En Reparación">En Reparación</option>
                    <option value="Lista">Lista</option>
                    <option value="Entregada">Entregada</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Costo Mano de Obra ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={ordenEditando.costo_mano_obra || ''}
                    onChange={e => setOrdenEditando({ ...ordenEditando, costo_mano_obra: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setMostrarModalEditar(false)} style={{ flex: 1, padding: '11px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
                <button type="submit" disabled={guardando} style={{ flex: 2, padding: '11px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
                  {guardando ? 'Guardando...' : 'Actualizar Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}