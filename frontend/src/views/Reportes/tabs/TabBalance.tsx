import type { ReporteKPIs, PagoProveedor } from '../../../types';
import { Paginador } from '../../../components/Paginador';
import { formatearMoneda, formatearFecha } from '../../../utils/formatters';

interface TabBalanceProps {
  kpis: ReporteKPIs;
  pagos: PagoProveedor[];
  egresosResumen?: { totalEgresos: number };
  paginaActual: number;
  totalPaginas: number;
  totalRegistros: number;
  limite: number;
  onCambiarPagina: (pagina: number) => void;
}

/** Pestaña de balance financiero con desglose de pagos efectuados a proveedores. */
export function TabBalance({
  kpis,
  pagos,
  egresosResumen,
  paginaActual,
  totalPaginas,
  totalRegistros,
  limite,
  onCambiarPagina
}: TabBalanceProps) {
  const totalEgresosFiltrado = egresosResumen?.totalEgresos ?? kpis.total_egresos_monto;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Tarjeta de Resumen Comparativo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', padding: '20px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>Ingresos Brutos</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#16a34a', margin: '8px 0 4px 0' }}>{formatearMoneda(kpis.total_ingresos)}</h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--texto-mutado)' }}>
            Ventas: {formatearMoneda(kpis.total_ventas_monto)} | Taller: {formatearMoneda(kpis.total_reparaciones_monto)}
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', padding: '20px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>Egresos Operativos</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#dc2626', margin: '8px 0 4px 0' }}>{formatearMoneda(kpis.total_egresos_monto)}</h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--texto-mutado)' }}>
            {totalRegistros} comprobantes abonados a proveedores
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', padding: '20px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>Flujo Neto (Beneficio)</span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: '800', color: kpis.balance_neto >= 0 ? '#16a34a' : '#dc2626', margin: '8px 0 4px 0' }}>
            {formatearMoneda(kpis.balance_neto)}
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: kpis.balance_neto >= 0 ? '#15803d' : '#b91c1c', fontWeight: '600' }}>
            Rentabilidad sobre ventas: {kpis.margen_rentabilidad}%
          </p>
        </div>
      </div>

      {/* Tabla de Desglose de Egresos a Proveedores */}
      <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--borde-input)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--borde-input)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>Detalle de Egresos a Proveedores ({totalRegistros} registros)</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)' }}>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Nº Pago</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Fecha</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Proveedor</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase' }}>Método de Pago</th>
              <th style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--texto-mutado)', fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' }}>Monto Abonado</th>
            </tr>
          </thead>
          <tbody>
            {pagos.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  No se registraron egresos a proveedores para el período seleccionado.
                </td>
              </tr>
            ) : (
              pagos.map((p) => (
                <tr key={p.id_pago} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '0.88rem', fontFamily: 'monospace', fontWeight: '600', color: 'var(--texto-mutado)' }}>
                    PAG-{String(p.id_pago).padStart(6, '0')}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.88rem' }}>
                    {formatearFecha(p.fecha, 'N/A')}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: '600' }}>
                    {p.proveedor_nombre || ('Proveedor #' + p.id_proveedor)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                    {p.metodo_pago_nombre || 'Efectivo'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.95rem', fontWeight: '700', textAlign: 'right', color: '#dc2626' }}>
                    {formatearMoneda(p.monto_total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Paginador
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        totalRegistros={totalRegistros}
        limite={limite}
        alCambiarPagina={onCambiarPagina}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tarjeta)', padding: '14px 20px', borderRadius: '10px', border: '1px solid var(--borde-input)', flexWrap: 'wrap', gap: '12px' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--texto-mutado)' }}>
          Total: <strong>{totalRegistros}</strong> comprobante{totalRegistros === 1 ? '' : 's'} de pago a proveedores para los filtros aplicados.
        </span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)', marginRight: '12px' }}>Total Egresos Filtrados:</span>
          <strong style={{ fontSize: '1.2rem', color: '#dc2626' }}>{formatearMoneda(totalEgresosFiltrado)}</strong>
        </div>
      </div>
    </div>
  );
}
