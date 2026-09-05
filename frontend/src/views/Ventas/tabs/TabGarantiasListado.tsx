import type { FiltroGarantia, GarantiaConEstado } from '../types';

interface TabGarantiasListadoProps {
  garantias: GarantiaConEstado[];
  countTotalGarantias: number;
  countVigentes: number;
  countPorVencer: number;
  countVencidas: number;
  cargando: boolean;
  busquedaGarantia: string;
  filtroGarantia: FiltroGarantia;
  onCambiarBusqueda: (busqueda: string) => void;
  onCambiarFiltro: (filtro: FiltroGarantia) => void;
  onVerDetalle: (idVenta: number) => void;
}

export function TabGarantiasListado({
  garantias,
  countTotalGarantias,
  countVigentes,
  countPorVencer,
  countVencidas,
  cargando,
  busquedaGarantia,
  filtroGarantia,
  onCambiarBusqueda,
  onCambiarFiltro,
  onVerDetalle
}: TabGarantiasListadoProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ALERTA CRÍTICA SI HAY GARANTÍAS PRÓXIMAS A VENCER EN 7 DÍAS */}
      {countPorVencer > 0 && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderLeft: '5px solid #f59e0b',
          padding: '14px 18px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div>
            <strong style={{ color: '#b45309', fontSize: '0.92rem' }}>Alerta de Garantías por Vencer:</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.86rem', color: '#92400e' }}>
              Hay <strong>{countPorVencer}</strong> bicicleta(s) vendida(s) con garantía de 30 días próxima a vencer (en los próximos 7 días).
            </p>
          </div>
          <button
            type="button"
            onClick={() => onCambiarFiltro('por_vencer')}
            style={{
              backgroundColor: '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Filtrar Alertas
          </button>
        </div>
      )}

      {/* TARJETAS RESUMEN DE GARANTÍAS (KPIS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid var(--borde-input)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>Bicicletas Vendidas</span>
          <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: 'var(--texto-principal)', margin: '6px 0 0 0' }}>{countTotalGarantias}</h3>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase' }}>Garantías Vigentes</span>
          <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#15803d', margin: '6px 0 0 0' }}>{countVigentes}</h3>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: '700', textTransform: 'uppercase' }}>Por Vencer</span>
          <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#d97706', margin: '6px 0 0 0' }}>{countPorVencer}</h3>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid var(--borde-input)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>Garantías Concluidas</span>
          <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#64748b', margin: '6px 0 0 0' }}>{countVencidas}</h3>
        </div>
      </div>

      {/* FILTROS Y BUSCADOR DE GARANTÍAS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'vigentes', label: 'Vigentes' },
            { id: 'por_vencer', label: 'Por Vencer' },
            { id: 'vencidas', label: 'Vencidas' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => onCambiarFiltro(f.id as FiltroGarantia)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: filtroGarantia === f.id ? '700' : '500',
                border: 'none',
                backgroundColor: filtroGarantia === f.id ? 'var(--azul-oscuro)' : 'var(--bg-tarjeta)',
                color: filtroGarantia === f.id ? '#fff' : 'var(--texto-principal)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Buscar por cliente, DNI, bicicleta o comprobante..."
          value={busquedaGarantia}
          onChange={e => onCambiarBusqueda(e.target.value)}
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

      {/* TABLA DE CONTROL DE GARANTÍAS */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Comprobante / Venta</th>
              <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Cliente Titular</th>
              <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Bicicleta Nueva</th>
              <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Período Cobertura (30 Días)</th>
              <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Estado Garantía</th>
              <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ width: '96px', textAlign: 'center' }}>Acciones</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                  Cargando garantías de bicicletas...
                </td>
              </tr>
            ) : garantias.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.95rem' }}>
                  {countTotalGarantias === 0
                    ? 'Aún no se han registrado ventas de bicicletas nuevas con garantía.'
                    : 'No se encontraron garantías con los filtros seleccionados.'}
                </td>
              </tr>
            ) : (
              garantias.map((g, index) => {
                const fVenta = g.fecha_venta ? new Date(g.fecha_venta).toLocaleDateString() : 'N/A';
                const fVenc = g.infoGarantia.fechaVencimiento ? new Date(g.infoGarantia.fechaVencimiento).toLocaleDateString() : 'N/A';
                const esAlerta = g.infoGarantia.estado === 'por_vencer';
                const uniqueKey = g.id_detalle_venta 
                  ? `garantia-detalle-${g.id_detalle_venta}` 
                  : `garantia-v-${g.id_venta}-p-${g.id_producto}-${index}`;

                return (
                  <tr
                    key={uniqueKey}
                    style={{
                      borderBottom: '1px solid var(--borde-input)',
                      backgroundColor: esAlerta ? 'rgba(245, 158, 11, 0.04)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.92rem', color: 'var(--azul-oscuro)', fontFamily: 'monospace', fontWeight: '700' }}>
                        FAC-{String(g.id_venta).padStart(6, '0')}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
                        Vendido: {fVenta}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--texto-principal)', fontSize: '0.92rem' }}>
                        {g.cliente_apellido}, {g.cliente_nombre}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
                        DNI: {g.cliente_dni || 'S/DNI'} &bull; Tel: {g.cliente_telefono || '-'}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--texto-principal)', fontSize: '0.92rem' }}>
                        {g.producto_nombre}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
                        {g.marca || ''} {g.modelo || ''} {g.rodado ? `(R${g.rodado})` : ''} {g.talle ? `[${g.talle}]` : ''} {g.color ? `- ${g.color}` : ''}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>
                        Hasta: {fVenc}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
                        Desde: {fVenta}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        backgroundColor: g.infoGarantia.colorBg,
                        color: g.infoGarantia.colorText,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        display: 'inline-block',
                        border: esAlerta ? '1px solid #fde68a' : 'none'
                      }}>
                        {g.infoGarantia.label}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => onVerDetalle(g.id_venta)}
                        style={{
                          backgroundColor: 'rgba(37, 99, 235, 0.08)',
                          color: 'var(--azul-oscuro)',
                          border: '1px solid rgba(37, 99, 235, 0.2)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Ver Factura
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
