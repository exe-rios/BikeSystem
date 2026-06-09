import { useState } from 'react';
import type { Venta } from '../types';

export function VentasView() {
  // TODO: Cargar ventas desde backend GET /api/ventas
  const [ventas] = useState<Venta[]>([]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Módulo de Ventas</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem' }}>Registro de transacciones comerciales y facturas emitidas</p>
        </div>
        
        <button style={{
          backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none',
          padding: '12px 20px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer'
        }}>
          🛒 Nueva Venta
        </button>
      </div>

      <div style={{ 
        backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Comprobante</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Cliente</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Fecha</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Método</th>
              <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map(v => (
              <tr key={v.id_venta} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)', fontFamily: 'monospace' }}>FAC-{String(v.id_venta).padStart(6, '0')}</td>
                <td style={{ padding: '16px', fontSize: '0.95rem', fontWeight: '600' }}>
                  Cliente #{v.id_cliente}
                </td>
                <td style={{ padding: '16px', fontSize: '0.95rem', color: 'var(--texto-mutado)' }}>{v.fecha}</td>
                <td style={{ padding: '16px' }}><span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>{v.tipo_pago}</span></td>
                <td style={{ padding: '16px', fontWeight: '700', color: '#16a34a', textAlign: 'right' }}>${v.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}