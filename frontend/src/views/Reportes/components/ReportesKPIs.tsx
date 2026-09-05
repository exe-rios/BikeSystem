import type { ReporteKPIs } from '../../../types';

interface ReportesKPIsProps {
  kpis: ReporteKPIs;
}

export function ReportesKPIs({ kpis }: ReportesKPIsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      
      {/* 1. Ingresos Brutos */}
      <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', margin: '0 0 6px 0', fontWeight: '600' }}>
          Ingresos Brutos (Período)
        </p>
        <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#16a34a', margin: 0 }}>
          {'$' + (kpis.total_ingresos || 0).toLocaleString()}
        </h3>
        <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', marginTop: '4px', display: 'block' }}>
          {kpis.total_operaciones_cobradas} operaciones cobradas
        </span>
      </div>

      {/* 2. Pagos a Proveedores (Egresos) */}
      <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', margin: '0 0 6px 0', fontWeight: '600' }}>
          Pagos a Proveedores (Egresos)
        </p>
        <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#dc2626', margin: 0 }}>
          {'$' + (kpis.total_egresos_monto || 0).toLocaleString()}
        </h3>
        <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', marginTop: '4px', display: 'block' }}>
          {kpis.total_egresos_cantidad} comprobantes de pago
        </span>
      </div>

      {/* 3. Balance Neto Real */}
      <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', margin: '0 0 6px 0', fontWeight: '600' }}>
          Balance Neto Real (Ganancia)
        </p>
        <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: kpis.balance_neto >= 0 ? '#16a34a' : '#dc2626', margin: 0 }}>
          {'$' + (kpis.balance_neto || 0).toLocaleString()}
        </h3>
        <span style={{ fontSize: '0.78rem', color: kpis.balance_neto >= 0 ? '#15803d' : '#b91c1c', marginTop: '4px', display: 'block', fontWeight: '700' }}>
          Margen operativo: {kpis.margen_rentabilidad}%
        </span>
      </div>

      {/* 4. Ticket Promedio */}
      <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', margin: '0 0 6px 0', fontWeight: '600' }}>
          Ticket Promedio Efectivo
        </p>
        <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: 'var(--texto-principal)', margin: 0 }}>
          {'$' + Math.round(kpis.ticket_promedio || 0).toLocaleString()}
        </h3>
        <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', marginTop: '4px', display: 'block' }}>
          Por venta / orden entregada
        </span>
      </div>

    </div>
  );
}
