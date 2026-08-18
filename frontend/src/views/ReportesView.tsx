import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { DashboardData, Venta, Reparacion } from '../types';

type ReportType = 'ventas' | 'reparaciones' | 'general';

export function ReportesView() {
  const [reportType, setReportType] = useState<ReportType>('general');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const [resDash, resVentas, resRep] = await Promise.all([
        api.reportes.getDashboard().catch(() => null),
        api.ventas.getAll().catch(() => ({ total: 0, ventas: [] })),
        api.reparaciones.getAll().catch(() => ({ total: 0, reparaciones: [] }))
      ]);

      if (resDash) setDashboard(resDash);
      setVentas(resVentas.ventas || []);
      setReparaciones(resRep.reparaciones || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cargar datos estadísticos');
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Cálculos dinámicos
  const totalVentasMonto = ventas.reduce((acc, v) => acc + Number(v.costo_total || 0), 0);
  const totalReparacionesMonto = reparaciones.reduce((acc, r) => acc + Number(r.costo_total || r.costo_mano_obra || 0), 0);
  const totalIngresos = totalVentasMonto + totalReparacionesMonto;
  const totalOperaciones = ventas.length + reparaciones.length;
  const ticketPromedio = totalOperaciones > 0 ? totalIngresos / totalOperaciones : 0;

  // Filtrado de ventas
  const ventasFiltradas = ventas.filter(v => {
    const cumpleTermino =
      searchTerm === '' ||
      (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.cliente_apellido && v.cliente_apellido.toLowerCase().includes(searchTerm.toLowerCase())) ||
      String(v.id_venta).includes(searchTerm);

    let cumpleFecha = true;
    if (v.fecha) {
      const f = new Date(v.fecha).toISOString().slice(0, 10);
      if (fechaDesde && f < fechaDesde) cumpleFecha = false;
      if (fechaHasta && f > fechaHasta) cumpleFecha = false;
    }

    return cumpleTermino && cumpleFecha;
  });

  return (
    <div className="imprimible" style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100%', color: 'var(--texto-principal)' }}>

      {/* MEMBRETE EXCLUSIVO PARA IMPRESIÓN */}
      <div className="imprimir-membrete">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800' }}>DN BIKE</h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#444' }}>Informe Ejecutivo y Métricas de Rendimiento</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>REPORTE GERENCIAL</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#666' }}>Fecha de Emisión: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN SUPERIOR: TÍTULO Y ACCIONES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--texto-principal)', fontSize: '2rem', fontWeight: '700', margin: 0 }}>Gestión de Reportes</h1>
          <p style={{ color: 'var(--texto-mutado)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Análisis estadístico del rendimiento del local y taller</p>
        </div>

        <div className="no-imprimir" style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => window.print()}
            style={{
              backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', border: '1px solid var(--borde-input)',
              padding: '10px 18px', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer'
            }}
          >
            Imprimir Reporte
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* BLOQUE DE FILTROS (Oculto al imprimir) */}
      <div className="no-imprimir" style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--texto-principal)', marginBottom: '8px', display: 'block', fontWeight: '600' }}>Tipo de Reporte</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              style={{
                width: '100%', padding: '10px', backgroundColor: 'var(--bg-principal)',
                border: '1px solid var(--borde-input)', borderRadius: '8px', color: 'var(--texto-principal)', fontSize: '0.9rem', outline: 'none'
              }}
            >
              <option value="general">Consolidado General</option>
              <option value="ventas">Ventas de Mostrador</option>
              <option value="reparaciones">Taller y Reparaciones</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--texto-principal)', marginBottom: '8px', display: 'block', fontWeight: '600' }}>Fecha Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{
                width: '100%', padding: '10px', backgroundColor: 'var(--bg-principal)',
                border: '1px solid var(--borde-input)', borderRadius: '8px', color: 'var(--texto-principal)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--texto-principal)', marginBottom: '8px', display: 'block', fontWeight: '600' }}>Fecha Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{
                width: '100%', padding: '10px', backgroundColor: 'var(--bg-principal)',
                border: '1px solid var(--borde-input)', borderRadius: '8px', color: 'var(--texto-principal)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      </div>

      {/* BLOQUE DE INDICADORES KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', padding: '20px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)', margin: '0 0 6px 0' }}>Ingresos Totales (Histórico)</p>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#16a34a', margin: 0 }}>
            ${totalIngresos.toLocaleString()}
          </h3>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', padding: '20px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)', margin: '0 0 6px 0' }}>Recaudación Mes Actual</p>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#2563eb', margin: 0 }}>
            ${Number(dashboard?.finanzas?.total_mes || 0).toLocaleString()}
          </h3>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', padding: '20px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)', margin: '0 0 6px 0' }}>Órdenes de Taller</p>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#ea580c', margin: 0 }}>
            {reparaciones.length}
          </h3>
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', border: '1px solid var(--borde-input)', padding: '20px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)', margin: '0 0 6px 0' }}>Ticket Promedio Operación</p>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--texto-principal)', margin: 0 }}>
            ${Math.round(ticketPromedio).toLocaleString()}
          </h3>
        </div>
      </div>

      {/* TABLA DE DETALLE DE VENTAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-tarjeta)', borderRadius: '8px', padding: '12px 16px', alignItems: 'center', border: '1px solid var(--borde-input)' }}>
          <span style={{ color: 'var(--texto-mutado)', marginRight: '10px' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por comprobante o nombre de cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', border: 'none', backgroundColor: 'transparent', color: 'var(--texto-principal)', fontSize: '0.95rem', outline: 'none' }}
          />
        </div>

        <div style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--borde-input)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>Comprobante</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>Fecha</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>Cliente</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase' }}>Vendedor</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--texto-mutado)', fontWeight: '600', textTransform: 'uppercase', textAlign: 'right' }}>Importe Total</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                    Cargando reportes...
                  </td>
                </tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--texto-mutado)' }}>
                    No se encontraron registros de ventas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                ventasFiltradas.map((item) => (
                  <tr key={item.id_venta} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: 'var(--texto-mutado)', fontFamily: 'monospace' }}>
                      FAC-{String(item.id_venta).padStart(6, '0')}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>
                      {item.fecha ? new Date(item.fecha).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: '500' }}>
                      {item.cliente_nombre ? `${item.cliente_apellido}, ${item.cliente_nombre}` : `Cliente #${item.id_cliente}`}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
                      {item.vendedor || 'Sistema'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.95rem', fontWeight: '700', textAlign: 'right', color: '#16a34a' }}>
                      ${Number(item.costo_total).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}