import type { Usuario, BadgeRolInfo } from '../types';

interface UsuariosTablaProps {
  usuarios: Usuario[];
  usuariosFiltrados: Usuario[];
  cargando: boolean;
  usuarioActualId?: number;
  getBadgeRol: (rol: string) => BadgeRolInfo;
  onEditar: (usuario: Usuario) => void;
  onEliminar: (id: number, nombre: string) => void;
}

export function UsuariosTabla({
  usuarios,
  usuariosFiltrados,
  cargando,
  usuarioActualId,
  getBadgeRol,
  onEditar,
  onEliminar
}: UsuariosTablaProps) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden'
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>ID</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Nombre de Usuario</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Rol en el Sistema</th>
            <th style={{ padding: '16px', textAlign: 'right', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ width: '148px', textAlign: 'center', display: 'inline-block' }}>Acciones</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr>
              <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                Cargando usuarios...
              </td>
            </tr>
          ) : usuariosFiltrados.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                {usuarios.length === 0 ? 'No hay usuarios registrados en el sistema.' : 'No se encontraron usuarios que coincidan con la búsqueda.'}
              </td>
            </tr>
          ) : (
            usuariosFiltrados.map(u => {
              const badge = getBadgeRol(u.rol);
              const esPropioUsuario = u.id_usuario === usuarioActualId;

              return (
                <tr key={u.id_usuario} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                  <td style={{ padding: '16px', color: 'var(--texto-mutado)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    #{u.id_usuario}
                  </td>
                  <td style={{ padding: '16px', fontWeight: '700', color: 'var(--texto-principal)', fontSize: '0.95rem' }}>
                    {u.nombre_usuario} {esPropioUsuario && <span style={{ fontSize: '0.75rem', color: 'var(--azul-oscuro)', fontWeight: '600', marginLeft: '6px' }}>(Tú)</span>}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      backgroundColor: badge.bg, color: badge.color,
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '700'
                    }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => onEditar(u)}
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
                        disabled={esPropioUsuario}
                        onClick={() => u.id_usuario && onEliminar(u.id_usuario, u.nombre_usuario)}
                        style={{
                          backgroundColor: 'rgba(37, 99, 235, 0.08)', color: 'var(--azul-oscuro)',
                          border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '6px', padding: '6px 12px',
                          fontSize: '0.8rem', fontWeight: '600', cursor: esPropioUsuario ? 'not-allowed' : 'pointer',
                          opacity: esPropioUsuario ? 0.4 : 1
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
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
