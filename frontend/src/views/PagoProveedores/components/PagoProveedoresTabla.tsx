import type { PagoProveedor } from '../types';

interface PagoProveedoresTablaProps {
  pagos: PagoProveedor[];
  pagosFiltrados: PagoProveedor[];
  cargando: boolean;
}

export function PagoProveedoresTabla({
  pagos,
  pagosFiltrados,
  cargando
}: PagoProveedoresTablaProps) {
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
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Proveedor / Empresa</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Método de Pago</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registrado Por</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
            <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {cargando ? (
            <tr>
              <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                Cargando pagos...
              </td>
            </tr>
          ) : pagosFiltrados.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                {pagos.length === 0 ? 'No hay pagos a proveedores registrados.' : 'No se encontraron pagos con ese término de búsqueda.'}
              </td>
            </tr>
          ) : (
            pagosFiltrados.map(p => (
              <tr key={p.id_pago} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '500', color: 'var(--texto-principal)' }}>
                  {p.fecha ? new Date(p.fecha).toLocaleDateString() : 'Hoy'}
                </td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-principal)', fontWeight: '600' }}>
                  {p.proveedor_nombre}
                </td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>
                  <span style={{ backgroundColor: 'var(--bg-principal)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid var(--borde-input)' }}>
                    {p.metodo_pago_nombre}
                  </span>
                </td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{p.usuario_nombre}</td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: '#10b981', fontWeight: '700' }}>
                  ${Number(p.monto_total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)', textAlign: 'right' }}>
                  {p.observaciones || '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
