import { useState, useMemo } from 'react';
import type { ReporteCapitalStockResponse, ClaveGama, BicicletaCapital } from '../types';
import { formatearMoneda } from '../../../utils/formatters';

interface TabCapitalInventarioProps {
  data: ReporteCapitalStockResponse | null;
  cargando: boolean;
  onExportarCSV: () => void;
}

/** Pestaña de análisis de capital inmovilizado en stock y estratificación de bicicletas por gama de precio. */
export function TabCapitalInventario({
  data,
  cargando,
  onExportarCSV
}: TabCapitalInventarioProps) {
  const [filtroGama, setFiltroGama] = useState<ClaveGama>('todas');
  const [filtroRotacion, setFiltroRotacion] = useState<'todos' | 'estancada' | 'alta_rotacion'>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  const resumen = data?.resumen;
  const gamas = data?.gamas || [];
  const desgloseTipo = data?.desglose_por_tipo || [];
  const bicicletas = data?.bicicletas || [];

  const bicicletasFiltradas = useMemo<BicicletaCapital[]>(() => {
    return bicicletas.filter(b => {
      // 1. Filtro por gama
      if (filtroGama !== 'todas' && b.gama !== filtroGama) {
        return false;
      }

      // 2. Filtro por rotación
      if (filtroRotacion === 'estancada' && b.estado_rotacion !== 'estancada') {
        return false;
      }
      if (filtroRotacion === 'alta_rotacion' && b.estado_rotacion !== 'alta_rotacion') {
        return false;
      }

      // 3. Filtro por término de búsqueda
      if (!busqueda.trim()) return true;
      const term = busqueda.toLowerCase().trim();
      const nombre = (b.nombre || '').toLowerCase();
      const marca = (b.marca || '').toLowerCase();
      const modelo = (b.modelo || '').toLowerCase();
      const idStr = String(b.id_producto);
      return nombre.includes(term) || marca.includes(term) || modelo.includes(term) || idStr.includes(term);
    });
  }, [bicicletas, filtroGama, filtroRotacion, busqueda]);

  if (cargando) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
        Cargando análisis de capital inmovilizado y estratificación de bicicletas...
      </div>
    );
  }

  if (!data || !resumen) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
        No hay datos de inventario disponibles para generar este reporte.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

      {/* 1. RECUADRO DE DIAGNÓSTICO FINANCIERO DE LIQUIDEZ */}
      <div style={{
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a',
        borderLeft: '5px solid #d97706',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <strong style={{ color: '#b45309', fontSize: '0.98rem' }}>
            Diagnóstico de Liquidez y Capital Inmovilizado:
          </strong>
          <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '600', backgroundColor: '#fef3c7', padding: '3px 8px', borderRadius: '6px' }}>
            Auditoría de Activos
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#78350f', lineHeight: '1.5' }}>
          El <strong>{resumen.porcentaje_bicicletas_capital}%</strong> de todo el capital en mercadería de la tienda (<strong>{formatearMoneda(resumen.capital_total_bicicletas)}</strong>) se encuentra inmovilizado en solo <strong>{resumen.unidades_total_bicicletas} bicicletas</strong> físicas.
          Además, el <strong>{resumen.porcentaje_capital_estancado}%</strong> de ese dinero (<strong>{formatearMoneda(resumen.capital_estancado)}</strong>) corresponde a unidades sin ninguna venta registrada en los últimos 90 días.
        </p>
      </div>

      {/* 2. TARJETAS KPIS SUPERIORES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid var(--borde-input)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>
            Capital en Bicicletas
          </span>
          <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: 'var(--azul-oscuro)', margin: '6px 0 2px 0' }}>
            {formatearMoneda(resumen.capital_total_bicicletas)}
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
            {resumen.porcentaje_bicicletas_capital}% del inventario total
          </span>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid var(--borde-input)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>
            Bicicletas en Salón
          </span>
          <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: 'var(--texto-principal)', margin: '6px 0 2px 0' }}>
            {resumen.unidades_total_bicicletas} unidades
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
            En {resumen.modelos_activos_bicicletas} modelos activos
          </span>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid var(--borde-input)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>
            Precio Promedio en Stock
          </span>
          <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: 'var(--texto-principal)', margin: '6px 0 2px 0' }}>
            {formatearMoneda(resumen.precio_promedio_bicicleta)}
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
            Mín: {formatearMoneda(resumen.precio_minimo_bicicleta)} - Máx: {formatearMoneda(resumen.precio_maximo_bicicleta)}
          </span>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', border: '1px solid #fed7aa', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.78rem', color: '#c2410c', fontWeight: '700', textTransform: 'uppercase' }}>
            Capital Sin Rotación (90d)
          </span>
          <h3 style={{ fontSize: '1.7rem', fontWeight: '800', color: '#ea580c', margin: '6px 0 2px 0' }}>
            {formatearMoneda(resumen.capital_estancado)}
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#9a3412' }}>
            {resumen.unidades_estancadas} bicicletas sin movimiento
          </span>
        </div>
      </div>

      {/* 3. ESTRATIFICACIÓN POR GAMAS DE PRECIO (RESPUESTA EXACTA A DIEGO) */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)',
        border: '1px solid var(--borde-input)',
        borderRadius: '14px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--texto-principal)' }}>
              Estratificación del Inventario por Gama de Precios
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: 'var(--texto-mutado)' }}>
              Distribución de bicicletas según segmento económico, intermedio y gama alta.
            </p>
          </div>
          <button
            type="button"
            onClick={onExportarCSV}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--borde-input)',
              backgroundColor: 'var(--bg-principal)',
              color: 'var(--texto-principal)',
              fontSize: '0.84rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Exportar a CSV
          </button>
        </div>

        {/* Tarjetas de las 3 Gamas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {gamas.map(g => {
            const esEconomica = g.clave === 'economica';
            const esIntermedia = g.clave === 'intermedia';
            const bordeColor = esEconomica ? '#bbf7d0' : esIntermedia ? '#bae6fd' : '#fed7aa';
            const bgBadge = esEconomica ? '#dcfce7' : esIntermedia ? '#e0f2fe' : '#ffedd5';
            const textBadge = esEconomica ? '#15803d' : esIntermedia ? '#0369a1' : '#c2410c';

            return (
              <div
                key={g.clave}
                style={{
                  border: `1px solid ${bordeColor}`,
                  borderRadius: '12px',
                  padding: '16px',
                  backgroundColor: 'var(--bg-principal)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{
                      backgroundColor: bgBadge,
                      color: textBadge,
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      textTransform: 'uppercase'
                    }}>
                      {g.nombre}
                    </span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', marginTop: '6px' }}>
                      Rango: {g.rango_texto}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--texto-principal)' }}>
                      {g.unidades} <span style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--texto-mutado)' }}>unid.</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--texto-mutado)' }}>
                      {g.porcentaje_unidades}% del stock físico
                    </div>
                  </div>
                </div>

                <div style={{
                  paddingTop: '12px',
                  borderTop: '1px solid var(--borde-input)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end'
                }}>
                  <div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--texto-mutado)', textTransform: 'uppercase', fontWeight: '600' }}>
                      Capital Inmovilizado
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: textBadge, marginTop: '2px' }}>
                      {formatearMoneda(g.capital_inmovilizado)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--texto-principal)' }}>
                      {g.porcentaje_capital}%
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--texto-mutado)' }}>
                      del capital total
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', backgroundColor: 'var(--bg-tarjeta)', padding: '6px 10px', borderRadius: '6px' }}>
                  Precio Promedio: <strong>{formatearMoneda(g.precio_promedio)}</strong> ({g.modelos} modelos)
                </div>
              </div>
            );
          })}
        </div>

        {/* Gráfico Comparativo: Volumen vs Capital */}
        <div style={{
          backgroundColor: 'var(--bg-principal)',
          border: '1px solid var(--borde-input)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div>
            <strong style={{ fontSize: '0.9rem', color: 'var(--texto-principal)' }}>
              Comparativa Visual: Cantidad de Bicicletas vs. Dinero Inmovilizado
            </strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
              Evidencia si el inventario está compuesto por mayor volumen de rodados económicos o capital concentrado en rodados caros.
            </p>
          </div>

          {/* Barra 1: Porcentaje de Unidades */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px', fontWeight: '600' }}>
              <span>Distribución por Cantidad de Unidades Físicas:</span>
              <span style={{ color: 'var(--texto-mutado)' }}>Total: {resumen.unidades_total_bicicletas} unidades</span>
            </div>
            <div style={{ display: 'flex', height: '24px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--borde-input)' }}>
              {gamas.map(g => (
                <div
                  key={'bar-u-' + g.clave}
                  style={{
                    width: `${g.porcentaje_unidades}%`,
                    backgroundColor: g.clave === 'economica' ? '#22c55e' : g.clave === 'intermedia' ? '#0284c7' : '#ea580c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    transition: 'width 0.3s ease'
                  }}
                  title={`${g.nombre}: ${g.unidades} unidades (${g.porcentaje_unidades}%)`}
                >
                  {g.porcentaje_unidades > 12 ? `${g.porcentaje_unidades}%` : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Barra 2: Porcentaje de Dinero */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px', fontWeight: '600' }}>
              <span>Distribución por Capital Inmovilizado ($):</span>
              <span style={{ color: 'var(--texto-mutado)' }}>Total: {formatearMoneda(resumen.capital_total_bicicletas)}</span>
            </div>
            <div style={{ display: 'flex', height: '24px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--borde-input)' }}>
              {gamas.map(g => (
                <div
                  key={'bar-c-' + g.clave}
                  style={{
                    width: `${g.porcentaje_capital}%`,
                    backgroundColor: g.clave === 'economica' ? '#22c55e' : g.clave === 'intermedia' ? '#0284c7' : '#ea580c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    transition: 'width 0.3s ease'
                  }}
                  title={`${g.nombre}: ${formatearMoneda(g.capital_inmovilizado)} (${g.porcentaje_capital}%)`}
                >
                  {g.porcentaje_capital > 10 ? `${g.porcentaje_capital}%` : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Leyenda del gráfico */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.78rem', paddingTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '3px' }}></span>
              <span>Gama Económica (Menor a $1.000.000)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#0284c7', borderRadius: '3px' }}></span>
              <span>Gama Intermedia ($1.000.000 a $4.000.000)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: '#ea580c', borderRadius: '3px' }}></span>
              <span>Gama Alta / Premium (Mayor a $4.000.000)</span>
            </div>
          </div>
        </div>

        {/* 4. DESGLOSE GENERAL POR RUBRO (BICICLETAS VS REPUESTOS) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {desgloseTipo.map(t => (
            <div
              key={t.tipo_prod}
              style={{
                backgroundColor: 'var(--bg-principal)',
                border: '1px solid var(--borde-input)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--texto-mutado)' }}>
                  Rubro: {t.tipo_prod}
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--texto-principal)', marginTop: '2px' }}>
                  {formatearMoneda(t.capital_inmovilizado)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  color: 'var(--azul-oscuro)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.76rem',
                  fontWeight: '700'
                }}>
                  {t.porcentaje_capital}% del stock
                </span>
                <div style={{ fontSize: '0.76rem', color: 'var(--texto-mutado)', marginTop: '3px' }}>
                  {t.total_unidades} unidades
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* 5. TABLA DETALLADA DE BICICLETAS Y CAPITAL INMOVILIZADO */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)',
        borderRadius: '14px',
        border: '1px solid var(--borde-input)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
        overflow: 'hidden'
      }}>
        {/* Cabecera y Filtros de la Tabla */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--borde-input)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'todas', label: 'Todas las Gamas' },
              { id: 'economica', label: 'Económicas (< $1M)' },
              { id: 'intermedia', label: 'Intermedias ($1M-$4M)' },
              { id: 'alta', label: 'Alta Gama (> $4M)' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroGama(f.id as ClaveGama)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: filtroGama === f.id ? '700' : '500',
                  border: 'none',
                  backgroundColor: filtroGama === f.id ? 'var(--azul-oscuro)' : 'var(--bg-principal)',
                  color: filtroGama === f.id ? '#fff' : 'var(--texto-principal)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={filtroRotacion}
              onChange={e => setFiltroRotacion(e.target.value as 'todos' | 'estancada' | 'alta_rotacion')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                fontSize: '0.84rem'
              }}
            >
              <option value="todos">Toda la rotación</option>
              <option value="estancada">Solo estancadas (0 ventas 90d)</option>
              <option value="alta_rotacion">Solo alta rotación (3+ ventas)</option>
            </select>

            <input
              type="text"
              placeholder="Buscar bicicleta o marca..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                fontSize: '0.84rem',
                width: '220px'
              }}
            />
          </div>
        </div>

        {/* Tabla */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Bicicleta / Modelo</th>
              <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Especificaciones</th>
              <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>Gama</th>
              <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'center' }}>Stock</th>
              <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>Precio Unitario</th>
              <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>Capital Inmovilizado</th>
              <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'center' }}>Rotación (90d)</th>
            </tr>
          </thead>
          <tbody>
            {bicicletasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.9rem' }}>
                  No se encontraron bicicletas con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              bicicletasFiltradas.map(b => {
                const badgeBg = b.gama === 'economica' ? '#dcfce7' : b.gama === 'intermedia' ? '#e0f2fe' : '#ffedd5';
                const badgeColor = b.gama === 'economica' ? '#15803d' : b.gama === 'intermedia' ? '#0369a1' : '#c2410c';
                const labelGama = b.gama === 'economica' ? 'Económica' : b.gama === 'intermedia' ? 'Intermedia' : 'Alta Gama';

                const rotacionBg = b.estado_rotacion === 'alta_rotacion' ? '#dcfce7' : b.estado_rotacion === 'rotacion_regular' ? '#f1f5f9' : '#fee2e2';
                const rotacionColor = b.estado_rotacion === 'alta_rotacion' ? '#15803d' : b.estado_rotacion === 'rotacion_regular' ? '#475569' : '#b91c1c';
                const labelRotacion = b.estado_rotacion === 'alta_rotacion'
                  ? `${b.unidades_vendidas_90d} vendidas (Alta)`
                  : b.estado_rotacion === 'rotacion_regular'
                  ? `${b.unidades_vendidas_90d} vendida(s)`
                  : 'Sin ventas (Estancada)';

                return (
                  <tr key={b.id_producto} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                    {/* Modelo */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', color: 'var(--texto-principal)', fontSize: '0.9rem' }}>
                        {b.nombre}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>
                        ID #{b.id_producto} {b.marca ? `• ${b.marca}` : ''} {b.modelo ? `• ${b.modelo}` : ''}
                      </div>
                    </td>

                    {/* Especificaciones */}
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--texto-principal)' }}>
                      <div>
                        {b.rodado ? `R${b.rodado}` : 'S/R'} {b.talle ? `[${b.talle}]` : ''} {b.color ? `- ${b.color}` : ''}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--texto-mutado)' }}>
                        {b.genero ? `Género: ${b.genero}` : ''}
                      </div>
                    </td>

                    {/* Gama */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: '700',
                        display: 'inline-block'
                      }}>
                        {labelGama}
                      </span>
                    </td>

                    {/* Stock */}
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700', fontSize: '0.92rem' }}>
                      {b.stock_disponible}
                    </td>

                    {/* Precio Unitario */}
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '0.88rem' }}>
                      {formatearMoneda(b.precio_unitario)}
                    </td>

                    {/* Capital Inmovilizado */}
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '800', fontSize: '0.94rem', color: 'var(--texto-principal)' }}>
                      {formatearMoneda(b.capital_inmovilizado)}
                    </td>

                    {/* Rotación */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: rotacionBg,
                        color: rotacionColor,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {labelRotacion}
                      </span>
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
