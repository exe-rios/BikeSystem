import type { Bicicleta } from '../types';

interface BicicletasTablaProps {
  bicicletas: Bicicleta[];
  bicicletasFiltradas: Bicicleta[];
  cargando: boolean;
  onVerHistorial: (idBici: number) => void;
  onEditar: (bici: Bicicleta) => void;
  onEliminar: (idBici: number) => void;
}

export function BicicletasTabla({
  bicicletas,
  bicicletasFiltradas,
  cargando,
  onVerHistorial,
  onEditar,
  onEliminar
}: BicicletasTablaProps) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-tarjeta)',
      borderRadius: '14px',
      border: '1px solid var(--borde-input)',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Dueño / Cliente</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Marca</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Modelo</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ width: '280px', textAlign: 'center', display: 'inline-block' }}>Acciones</span>
              </div>
            </th>
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
                  <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-principal)', fontWeight: '600' }}>
                    {b.marca}
                  </td>
                  <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>
                    {b.modelo || 'Sin modelo'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {/* Botón Ver Ficha / Historial (CU08) */}
                    <button
                      type="button"
                      onClick={() => b.id_bicicleta && onVerHistorial(b.id_bicicleta)}
                      style={{
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        color: 'var(--azul-oscuro)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Historial
                    </button>

                    {/* Botón Editar (CU07) */}
                    <button
                      type="button"
                      onClick={() => onEditar(b)}
                      style={{
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        color: 'var(--azul-oscuro)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Editar
                    </button>

                    {/* Botón Eliminar */}
                    <button
                      type="button"
                      onClick={() => b.id_bicicleta && onEliminar(b.id_bicicleta)}
                      style={{
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        color: 'var(--azul-oscuro)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
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
  );
}
