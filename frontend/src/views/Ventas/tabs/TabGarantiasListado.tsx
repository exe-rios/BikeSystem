import type { FiltroGarantia, GarantiaConEstado } from '../types';
import { formatearFecha } from '../../../utils/formatters';

interface TabGarantiasListadoProps {
  garantias: GarantiaConEstado[];
  countTotalGarantias: number;
  countVigentes: number;
  countServicePendiente?: number;
  countPorVencer: number;
  countVencidas: number;
  cargando: boolean;
  busquedaGarantia: string;
  filtroGarantia: FiltroGarantia;
  rolUsuario?: string;
  onCambiarBusqueda: (busqueda: string) => void;
  onCambiarFiltro: (filtro: FiltroGarantia) => void;
  onVerDetalle: (idVenta: number) => void;
  onRegistrarService?: (garantia: GarantiaConEstado) => void;
}

/** Pestaña de seguimiento de pólizas de garantía de bicicletas vendidas con control del 1° Service obligatorio. */
export function TabGarantiasListado({
  garantias,
  countTotalGarantias,
  countVigentes,
  countServicePendiente = 0,
  countPorVencer,
  countVencidas,
  cargando,
  busquedaGarantia,
  filtroGarantia,
  rolUsuario,
  onCambiarBusqueda,
  onCambiarFiltro,
  onVerDetalle,
  onRegistrarService
}: TabGarantiasListadoProps) {
  const esAdmin = rolUsuario === 'ADMIN' || rolUsuario === 'SUPERADMIN';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ALERTA SI HAY SERVICES O GARANTÍAS PRÓXIMAS A VENCER */}
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
            <strong style={{ color: '#b45309', fontSize: '0.92rem' }}>Alerta de Coberturas por Vencer:</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.86rem', color: '#92400e' }}>
              Hay <strong>{countPorVencer}</strong> bicicleta(s) con primer service o garantía general próxima a vencer en los próximos días.
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid var(--borde-input)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>Bicicletas Vendidas</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--texto-principal)', margin: '6px 0 0 0' }}>{countTotalGarantias}</h3>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: '700', textTransform: 'uppercase' }}>1° Service Pendiente</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0369a1', margin: '6px 0 0 0' }}>{countServicePendiente}</h3>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '700', textTransform: 'uppercase' }}>Vigentes (6 Meses)</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#15803d', margin: '6px 0 0 0' }}>{countVigentes}</h3>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: '700', textTransform: 'uppercase' }}>Por Vencer</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#d97706', margin: '6px 0 0 0' }}>{countPorVencer}</h3>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid var(--borde-input)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>Concluidas / Caducadas</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#64748b', margin: '6px 0 0 0' }}>{countVencidas}</h3>
        </div>
      </div>

      {/* FILTROS Y BUSCADOR DE GARANTÍAS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'service_pendiente', label: '1° Service Pendiente' },
            { id: 'vigentes', label: 'Vigentes (6 Meses)' },
            { id: 'por_vencer', label: 'Por Vencer' },
            { id: 'concluidas', label: 'Concluidas / Caducadas' }
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
          maxLength={60}
          placeholder="Buscar por cliente, DNI, bicicleta o comprobante..."
          value={busquedaGarantia}
          onChange={e => onCambiarBusqueda(e.target.value.slice(0, 60))}
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
              <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Bicicleta Vendida</th>
              <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>1° Service (30 Días)</th>
              <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Cobertura Garantía</th>
              <th style={{ padding: '14px 16px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ width: '120px', textAlign: 'center' }}>Acciones</span>
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
                const fVenta = formatearFecha(g.fecha_venta, 'N/A');
                const fVenc = formatearFecha(g.infoGarantia.fechaVencimiento, 'N/A');
                const esAlerta = g.infoGarantia.estado === 'por_vencer' || g.infoGarantia.estado === 'service_por_vencer';
                const uniqueKey = g.id_detalle_venta 
                  ? `garantia-detalle-${g.id_detalle_venta}` 
                  : `garantia-v-${g.id_venta}-p-${g.id_producto}-${index}`;

                // Cálculo de días desde la compra
                const diasDesdeVenta = Math.floor(
                  (new Date().getTime() - new Date(g.fecha_venta).getTime()) / (1000 * 60 * 60 * 24)
                );
                const vencioPlazo30Dias = diasDesdeVenta > 30;

                return (
                  <tr
                    key={uniqueKey}
                    style={{
                      borderBottom: '1px solid var(--borde-input)',
                      backgroundColor: esAlerta ? 'rgba(245, 158, 11, 0.04)' : 'transparent'
                    }}
                  >
                    {/* Comprobante / Venta */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: '0.92rem', color: 'var(--azul-oscuro)', fontFamily: 'monospace', fontWeight: '700' }}>
                        FAC-{String(g.id_venta).padStart(6, '0')}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
                        Vendido: {fVenta}
                      </div>
                    </td>

                    {/* Cliente Titular */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--texto-principal)', fontSize: '0.92rem' }}>
                        {g.cliente_apellido ? `${g.cliente_apellido}, ${g.cliente_nombre}` : g.cliente_nombre || 'Cliente Mostrador'}
                        {g.es_consumidor_final && (
                          <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: '600', marginLeft: '6px' }}>
                            (Cons. Final)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
                        DNI: {g.cliente_dni || 'S/DNI'} &bull; Tel: {g.cliente_telefono || '-'}
                      </div>
                    </td>

                    {/* Bicicleta Vendida */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--texto-principal)', fontSize: '0.92rem' }}>
                        {g.producto_nombre}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
                        {g.marca || ''} {g.modelo || ''} {g.genero ? `(${g.genero.charAt(0).toUpperCase() + g.genero.slice(1)}) ` : ''}{g.rodado ? `(R${g.rodado}) ` : ''}{g.talle ? `[${g.talle}] ` : ''}{g.color ? `- ${g.color}` : ''}
                      </div>
                    </td>

                    {/* 1° Service Obligatorio */}
                    <td style={{ padding: '14px 16px' }}>
                      {g.primer_service_realizado ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.76rem',
                              fontWeight: '700'
                            }}>
                              Realizado
                            </span>
                            {g.service_excepcion && (
                              <span style={{
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: '700'
                              }}>
                                Excepción
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--texto-mutado)', marginTop: '2px' }}>
                            Fecha: {formatearFecha(g.fecha_primer_service, 'N/A')}
                            {g.usuario_service && ` por ${g.usuario_service}`}
                          </div>
                          {g.observaciones_service && (
                            <div style={{ fontSize: '0.74rem', color: 'var(--texto-mutado)', fontStyle: 'italic', marginTop: '1px' }}>
                              Nota: {g.observaciones_service}
                            </div>
                          )}
                        </div>
                      ) : !vencioPlazo30Dias ? (
                        <div>
                          <span style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            Pendiente ({30 - diasDesdeVenta} d restantes)
                          </span>
                          <div style={{ fontSize: '0.76rem', color: 'var(--texto-mutado)', marginTop: '2px' }}>
                            Límite: {g.fecha_limite_service ? formatearFecha(g.fecha_limite_service, 'N/A') : '30 días'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span style={{
                            backgroundColor: '#fee2e2',
                            color: '#b91c1c',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: '600',
                            display: 'inline-block'
                          }}>
                            Caducado sin service
                          </span>
                          <div style={{ fontSize: '0.76rem', color: '#991b1b', marginTop: '2px' }}>
                            Venció hace {diasDesdeVenta - 30} día(s)
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Cobertura Garantía */}
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
                      <div style={{ fontSize: '0.76rem', color: 'var(--texto-mutado)', marginTop: '2px' }}>
                        Hasta: {fVenc} ({g.primer_service_realizado ? '6 meses' : '30 días'})
                      </div>
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                        {!g.primer_service_realizado && onRegistrarService && (
                          (!vencioPlazo30Dias || esAdmin) && (
                            <button
                              type="button"
                              onClick={() => onRegistrarService(g)}
                              title={vencioPlazo30Dias ? 'Registrar service como excepción administrativa' : 'Registrar 1° service oficial'}
                              style={{
                                backgroundColor: vencioPlazo30Dias ? 'rgba(245, 158, 11, 0.12)' : 'rgba(22, 163, 74, 0.1)',
                                color: vencioPlazo30Dias ? '#b45309' : '#15803d',
                                border: `1px solid ${vencioPlazo30Dias ? 'rgba(245, 158, 11, 0.3)' : 'rgba(22, 163, 74, 0.3)'}`,
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {vencioPlazo30Dias ? 'Excepción Service' : 'Registrar Service'}
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          onClick={() => onVerDetalle(g.id_venta)}
                          style={{
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                            color: 'var(--azul-oscuro)',
                            border: '1px solid rgba(37, 99, 235, 0.2)',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Ver Factura
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

    </div>
  );
}
