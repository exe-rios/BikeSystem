import type { BitacoraActividad, BadgeModuloStyle } from '../types';

interface AuditoriaTablaProps {
  registros: BitacoraActividad[];
  cargando: boolean;
  getModuloBadge: (modulo: string) => BadgeModuloStyle;
}

export function AuditoriaTabla({
  registros,
  cargando,
  getModuloBadge
}: AuditoriaTablaProps) {
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
            <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Fecha y Hora</th>
            <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Módulo</th>
            <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Usuario</th>
            <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Acción</th>
            <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Detalle de la Operación</th>
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr>
              <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                Consultando registros de auditoría...
              </td>
            </tr>
          ) : registros.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.92rem' }}>
                No se encontraron eventos en la bitácora con los filtros aplicados.
              </td>
            </tr>
          ) : (
            registros.map((item) => {
              const styleBadge = getModuloBadge(item.modulo);
              return (
                <tr
                  key={item.id_bitacora}
                  style={{ borderBottom: '1px solid var(--borde-input)', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--texto-mutado)', whiteSpace: 'nowrap' }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' }) : 'N/D'}
                  </td>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      backgroundColor: styleBadge.bg,
                      color: styleBadge.color,
                      border: `1px solid ${styleBadge.border}`,
                      borderRadius: '20px',
                      padding: '3px 10px',
                      fontSize: '0.75rem',
                      fontWeight: '700'
                    }}>
                      {item.modulo}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: '600', color: 'var(--texto-principal)', whiteSpace: 'nowrap' }}>
                    {item.nombre_usuario}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.88rem', fontWeight: '700', color: 'var(--azul-oscuro)', whiteSpace: 'nowrap' }}>
                    {item.accion}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '0.88rem', color: 'var(--texto-principal)', lineHeight: '1.4' }}>
                    {item.descripcion || '—'}
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
