import type { TabTipo, RangoRapido } from '../types';

interface ReportesFiltrosProps {
  activeTab: TabTipo;
  rangoRapido: RangoRapido;
  fechaDesde: string;
  fechaHasta: string;
  searchTerm: string;
  estadoTallerFiltro: string;
  onCambiarRango: (rango: RangoRapido) => void;
  onCambiarFechaDesde: (fecha: string) => void;
  onCambiarFechaHasta: (fecha: string) => void;
  onCambiarBusqueda: (busqueda: string) => void;
  onCambiarEstadoTaller: (estado: string) => void;
}

export function ReportesFiltros({
  activeTab,
  rangoRapido,
  fechaDesde,
  fechaHasta,
  searchTerm,
  estadoTallerFiltro,
  onCambiarRango,
  onCambiarFechaDesde,
  onCambiarFechaHasta,
  onCambiarBusqueda,
  onCambiarEstadoTaller
}: ReportesFiltrosProps) {
  const rangos: { id: RangoRapido; label: string }[] = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'semana', label: 'Últimos 7 días' },
    { id: 'mes', label: 'Este Mes' },
    { id: 'mes_anterior', label: 'Mes Anterior' },
    { id: 'anio', label: 'Este Año' },
    { id: 'todo', label: 'Todo el Histórico' },
  ];

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'ventas': return 'Comprobante, cliente o vendedor...';
      case 'reparaciones': return 'Nº orden, cliente o bici...';
      case 'balance': return 'Proveedor, usuario o método de pago...';
      default: return 'Buscar producto, cliente o comprobante...';
    }
  };

  return (
    <div className="no-imprimir" style={{ backgroundColor: 'var(--bg-tarjeta)', borderRadius: '14px', border: '1px solid var(--borde-input)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Botones de selección rápida de período */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Rango Rápido:
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {rangos.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => onCambiarRango(r.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: rangoRapido === r.id ? 'var(--azul-oscuro)' : 'var(--bg-principal)',
                color: rangoRapido === r.id ? '#fff' : 'var(--texto-mutado)',
                transition: 'all 0.15s ease'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs de rango de fecha y buscador */}
      <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'reparaciones' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', marginBottom: '6px', display: 'block', fontWeight: '600' }}>
            Fecha Desde
          </label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => onCambiarFechaDesde(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-principal)',
              border: '1px solid var(--borde-input)', borderRadius: '8px', color: 'var(--texto-principal)', fontSize: '0.88rem', outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', marginBottom: '6px', display: 'block', fontWeight: '600' }}>
            Fecha Hasta
          </label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => onCambiarFechaHasta(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-principal)',
              border: '1px solid var(--borde-input)', borderRadius: '8px', color: 'var(--texto-principal)', fontSize: '0.88rem', outline: 'none'
            }}
          />
        </div>

        {activeTab === 'reparaciones' && (
          <div>
            <label style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', marginBottom: '6px', display: 'block', fontWeight: '600' }}>
              Estado de Taller
            </label>
            <select
              value={estadoTallerFiltro}
              onChange={(e) => onCambiarEstadoTaller(e.target.value)}
              style={{
                width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-principal)',
                border: '1px solid var(--borde-input)', borderRadius: '8px', color: 'var(--texto-principal)', fontSize: '0.88rem', outline: 'none'
              }}
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="Entregada">Entregada (Cobrada)</option>
              <option value="Lista">Lista para Retiro</option>
              <option value="En Reparación">En Reparación</option>
              <option value="Recibida">Recibida</option>
            </select>
          </div>
        )}

        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)', marginBottom: '6px', display: 'block', fontWeight: '600' }}>
            Buscar en Registros
          </label>
          <input
            type="text"
            placeholder={getPlaceholder()}
            value={searchTerm}
            onChange={(e) => onCambiarBusqueda(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px', backgroundColor: 'var(--bg-principal)',
              border: '1px solid var(--borde-input)', borderRadius: '8px', color: 'var(--texto-principal)', fontSize: '0.88rem', outline: 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
}
