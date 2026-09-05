import type { Reparacion, ColumnaKanban } from '../types';

interface ReparacionesKanbanProps {
  columnas: ColumnaKanban[];
  reparacionesActivas: Reparacion[];
  reparacionesActivasFiltradas: Reparacion[];
  busquedaTaller: string;
  setBusquedaTaller: (v: string) => void;
  cargando: boolean;
  draggingId: number | null;
  setDraggingId: (id: number | null) => void;
  handleDropEnColumna: (estado: Reparacion['estado'], idStr: string) => void;
  handleAbrirDetalle: (rep: Reparacion) => void;
  setOrdenEditando: (rep: Reparacion) => void;
  setMostrarModalEditar: (v: boolean) => void;
  handleCambiarEstado: (id: number, nuevoEstado: Reparacion['estado']) => void;
  handleEntregarOrden: (id: number) => void;
}

export function ReparacionesKanban({
  columnas,
  reparacionesActivas,
  reparacionesActivasFiltradas,
  busquedaTaller,
  setBusquedaTaller,
  cargando,
  draggingId,
  setDraggingId,
  handleDropEnColumna,
  handleAbrirDetalle,
  setOrdenEditando,
  setMostrarModalEditar,
  handleCambiarEstado,
  handleEntregarOrden
}: ReparacionesKanbanProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
        <div style={{
          backgroundColor: 'var(--naranja-notif)', padding: '10px 18px', borderRadius: '12px',
          display: 'inline-flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Bicicletas en Servicio</span>
          <span style={{
            backgroundColor: '#ff9248', color: '#fff', padding: '2px 10px',
            borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem'
          }}>{reparacionesActivas.length}</span>
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
            width: '380px',
            fontSize: '0.9rem'
          }}
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(300px, 1fr))',
        gap: '18px',
        alignItems: 'start',
        overflowX: 'auto',
        minHeight: '520px'
      }}>
        {columnas.map((col, colIdx) => {
          const reparacionesEnColumna = reparacionesActivasFiltradas.filter(r => r.estado === col.estado);

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
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>{col.titulo}</span>
                <span style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  padding: '2px 10px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '700'
                }}>
                  {reparacionesEnColumna.length}
                </span>
              </div>

              {/* Lista de Tarjetas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 14px', flex: 1 }}>
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
                          gap: '8px',
                          cursor: 'grab',
                          opacity: draggingId != null && draggingId === rep.id_reparacion ? 0.5 : 1,
                          transition: 'box-shadow 0.2s, transform 0.1s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: col.colorBg, textTransform: 'uppercase' }}>
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
                              style={{ background: 'none', border: 'none', color: 'var(--azul-oscuro)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', padding: '2px 4px' }}
                            >
                              Agregar Repuestos
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrdenEditando(rep);
                                setMostrarModalEditar(true);
                              }}
                              title="Editar orden"
                              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', padding: '2px 4px' }}
                            >
                              Editar
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
                          {rep.marca || 'Bicicleta'} {rep.modelo || ''}
                        </div>

                        {rep.cliente_nombre && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)' }}>
                            Dueño: <strong>{rep.cliente_apellido}, {rep.cliente_nombre}</strong>
                          </div>
                        )}

                        <p style={{
                          margin: '2px 0',
                          fontSize: '0.85rem',
                          color: 'var(--texto-principal)',
                          backgroundColor: 'rgba(0,0,0,0.02)',
                          padding: '8px 10px',
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

                        {/* Botones de avance y entrega rápida */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed var(--borde-input)' }}>
                          {colIdx > 0 ? (
                            <button
                              type="button"
                              onClick={() => rep.id_reparacion && handleCambiarEstado(rep.id_reparacion, columnas[colIdx - 1].estado)}
                              style={{ background: 'none', border: '1px solid var(--borde-input)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}
                            >
                              ◀ {columnas[colIdx - 1].titulo}
                            </button>
                          ) : <div />}

                          {col.estado === 'Lista' ? (
                            <button
                              type="button"
                              onClick={() => rep.id_reparacion && handleEntregarOrden(rep.id_reparacion)}
                              style={{
                                backgroundColor: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '5px 12px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(16,185,129,0.2)'
                              }}
                            >
                              ✓ Entregar a Cliente
                            </button>
                          ) : (
                            colIdx < columnas.length - 1 && (
                              <button
                                type="button"
                                onClick={() => rep.id_reparacion && handleCambiarEstado(rep.id_reparacion, columnas[colIdx + 1].estado)}
                                style={{ backgroundColor: columnas[colIdx + 1].colorBg, color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                              >
                                {columnas[colIdx + 1].titulo} ▶
                              </button>
                            )
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
    </div>
  );
}
