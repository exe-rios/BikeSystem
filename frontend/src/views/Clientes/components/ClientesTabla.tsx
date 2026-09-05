import type { Cliente } from '../types';

interface ClientesTablaProps {
  clientes: Cliente[];
  clientesFiltrados: Cliente[];
  cargando: boolean;
  onEditar: (cliente: Cliente) => void;
  onEliminar: (id_cliente: number, nombreCompleto: string) => void;
}

export function ClientesTabla({
  clientes,
  clientesFiltrados,
  cargando,
  onEditar,
  onEliminar
}: ClientesTablaProps) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-tarjeta)',
      borderRadius: '14px',
      border: '1px solid var(--borde-input)',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)',
      overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DNI</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Teléfono</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ width: '148px', textAlign: 'center', display: 'inline-block' }}>Acciones</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr>
              <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                Cargando clientes desde el servidor...
              </td>
            </tr>
          ) : clientesFiltrados.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                {clientes.length === 0 ? 'No hay clientes registrados en el sistema.' : 'No se encontraron clientes que coincidan con la búsqueda.'}
              </td>
            </tr>
          ) : (
            clientesFiltrados.map(c => (
              <tr key={c.id_cliente} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '500', color: 'var(--texto-principal)' }}>
                  {c.apellido}, {c.nombre}
                </td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.dni}</td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.telefono || '-'}</td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{c.email || '-'}</td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => onEditar(c)}
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
                    <button
                      type="button"
                      onClick={() => c.id_cliente && onEliminar(c.id_cliente, `${c.nombre} ${c.apellido}`)}
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
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
