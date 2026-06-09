import { useState } from 'react';

type ReportType = 'ventas' | 'reparaciones' | 'stock-uso' | 'ingresos' | 'stock-disponible';

export function ReportesView() {
  const [reportType, setReportType] = useState<ReportType>('ventas');
  const [fechaDesde, setFechaDesde] = useState('2026-05-01');
  const [fechaHasta, setFechaHasta] = useState('2026-05-04');
  const [searchTerm, setSearchTerm] = useState('');

  // Estructura de KPIs nativa adaptada
  const kpiData = {
    ventas: { ingresos: 960000, cantidad: 149, reparaciones: 0, promedio: 6443 },
    reparaciones: { ingresos: 265000, cantidad: 0, reparaciones: 42, promedio: 6310 },
    ingresos: { ingresos: 1225000, cantidad: 149, reparaciones: 42, promedio: 6393 },
  };

  const currentKPI = reportType === 'reparaciones' ? kpiData.reparaciones :
                     reportType === 'ingresos' ? kpiData.ingresos :
                     kpiData.ventas;

  // Listado analítico para la tabla (Hereda la estética de tu gestión de clientes)
  const detalleVentas = [
    { id: 1, fecha: '04/05/2026', tipo: 'Bicicleta', producto: 'MTB Giant Talon 2', cliente: 'Juan Pérez', cantidad: 1, importe: 45000 },
    { id: 2, fecha: '04/05/2026', tipo: 'Accesorio', producto: 'Casco Bell Super 3R', cliente: 'María García', cantidad: 2, importe: 17000 },
    { id: 3, fecha: '04/05/2026', tipo: 'Repuesto', producto: 'Cadena Shimano XT', cliente: 'Carlos López', cantidad: 1, importe: 8500 },
    { id: 4, fecha: '03/05/2026', tipo: 'Bicicleta', producto: 'Ruta Specialized Allez', cliente: 'Ana Martínez', cantidad: 1, importe: 52000 },
    { id: 5, fecha: '03/05/2026', tipo: 'Accesorio', producto: 'Guantes Fox Ranger', cliente: 'Luis Torres', cantidad: 3, importe: 9600 },
    { id: 6, fecha: '03/05/2026', tipo: 'Repuesto', producto: 'Pedales Shimano M520', cliente: 'Pedro Sánchez', cantidad: 2, importe: 9600 },
  ];

  return (
    <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: '100%', color: '#fff' }}>
      
      {/* SECCIÓN SUPERIOR: TÍTULO Y ACCIONES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{color: '#333', fontSize: '2rem', fontWeight: '700', margin: 0 }}>Gestión de Reportes</h1>
          <p style={{ color: '#888', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Análisis estadístico del rendimiento del taller</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{
            backgroundColor: '#1e1e1e', color: '#fff', border: '1px solid #333',
            padding: '10px 18px', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer'
          }}>
            🖨️ Imprimir
          </button>
          <button style={{
            backgroundColor: '#2ecc71', color: '#fff', border: 'none',
            padding: '10px 18px', borderRadius: '8px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer'
          }}>
            + Exportar PDF
          </button>
        </div>
      </div>

      {/* BLOQUE DE FILTROS (Mismo diseño limpio de tus inputs de registro) */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ccc', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#333', marginBottom: '8px', display: 'block', fontWeight: '600' }}>Tipo de Reporte</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              style={{
                width: '100%', padding: '12px', backgroundColor: '#fff',
                border: '1px solid #ccc', borderRadius: '6px', color: '#333', fontSize: '0.9rem', outline: 'none'
              }}
            >
              <option value="ventas">Ventas (Bicicletas, Repuestos, Accesorios)</option>
              <option value="reparaciones">Reparaciones Finalizadas</option>
              <option value="stock-uso">Uso de Stock en Taller</option>
              <option value="ingresos">Ingresos Totales Brutos</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#333', marginBottom: '8px', display: 'block', fontWeight: '600' }}>Fecha Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              style={{
                width: '100%', padding: '12px', backgroundColor: '#fff',
                border: '1px solid #ccc', borderRadius: '6px', color: '#333', fontSize: '0.9rem', outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', color: '#333', marginBottom: '8px', display: 'block', fontWeight: '600' }}>Fecha Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{
                width: '100%', padding: '12px', backgroundColor: '#fff',
                border: '1px solid #ccc', borderRadius: '6px', color: '#333', fontSize: '0.9rem', outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* BLOQUE DE INDICADORES (TARJETAS KPI RÁPIDAS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ccc', padding: '20px' }}>
          <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 6px 0' }}>Ingresos Totales</p>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#2ecc71', margin: 0 }}>${currentKPI.ingresos.toLocaleString()}</h3>
        </div>

        {reportType !== 'reparaciones' && (
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ccc', padding: '20px' }}>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 6px 0' }}>Unidades Vendidas</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#3498db', margin: 0 }}>{currentKPI.cantidad} uds.</h3>
          </div>
        )}

        {reportType !== 'ventas' && (
          <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ccc', padding: '20px' }}>
            <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 6px 0' }}>Reparaciones Listas</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#e67e22', margin: 0 }}>{currentKPI.reparaciones}</h3>
          </div>
        )}

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ccc', padding: '20px' }}>
          <p style={{ fontSize: '0.85rem', color: '#888', margin: '0 0 6px 0' }}>Ticket Promedio</p>
          <h3 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#333', margin: 0 }}>${currentKPI.promedio.toLocaleString()}</h3>
        </div>
      </div>

      {/* SECCIÓN GRÁFICA NATIVA CSS (Sin Recharts) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ccc', padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 20px 0', color: '#333' }}>Ventas Semanales (Volumen)</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', paddingBottom: '8px', borderBottom: '1px solid #ccc' }}>
            {[
              { d: 'Lun', h: '35%' }, { d: 'Mar', h: '60%' }, { d: 'Mié', h: '45%' },
              { d: 'Jue', h: '80%' }, { d: 'Vie', h: '95%' }, { d: 'Sáb', h: '100%' }, { d: 'Dom', h: '55%' }
            ].map(item => (
              <div key={item.d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
                <div style={{ width: '50%', height: item.h, backgroundColor: '#3498db', borderRadius: '4px 4px 0 0', minHeight: '15px' }}></div>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>{item.d}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ccc', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0 0 10px 0', color: '#333' }}>Tendencia del Mes</h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>📈</span>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#888', textAlign: 'center' }}>Rendimiento comercial óptimo y estable en comparación al histórico.</p>
          </div>
        </div>
      </div>

      {/* TABLA DE DESGLOSE (Clon idéntico de tu pantalla "Gestión de Clientes") */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', backgroundColor: '#fff', borderRadius: '6px', padding: '12px 16px', alignItems: 'center' }}>
          <span style={{ color: '#888', marginRight: '10px' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar cliente por nombre o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', border: 'none', backgroundColor: 'transparent', color: '#000', fontSize: '1rem', outline: 'none' }}
          />
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#000' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', backgroundColor: '#fafafa' }}>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>ID</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Fecha</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Tipo</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Producto / Servicio</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Cliente</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#666', fontWeight: 'bold', textAlign: 'center' }}>Cant.</th>
                <th style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#666', fontWeight: 'bold', textAlign: 'right' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {detalleVentas
                .filter(item =>
                  searchTerm === '' ||
                  item.producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  item.cliente.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: '#888' }}>#{item.id.toString().padStart(4, '0')}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>{item.fecha}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                        backgroundColor: item.tipo === 'Bicicleta' ? '#e3f2fd' : '#fff3e0',
                        color: item.tipo === 'Bicicleta' ? '#1e88e5' : '#f57c00'
                      }}>
                        {item.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: '500' }}>{item.producto}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem' }}>{item.cliente}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', textAlign: 'center' }}>{item.cantidad}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: '700', textAlign: 'right', color: '#27ae60' }}>${item.importe.toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}