import type { Proveedor } from '../../../types';
import type { FiltroTipoProducto, FiltroEstadoProducto, FiltroDisponibilidad } from '../types';
import { usePermisos } from '../../../hooks/usePermisos';

interface StockFiltrosProps {
  busqueda: string;
  filtroTipo: FiltroTipoProducto;
  filtroEstado: FiltroEstadoProducto;
  filtroDisponibilidad: FiltroDisponibilidad;
  filtroProveedor: string;
  filtroMoneda: 'todos' | 'ARS' | 'USD';
  proveedores: Proveedor[];
  totalFiltrados: number;
  onCambiarBusqueda: (val: string) => void;
  onCambiarFiltroTipo: (val: FiltroTipoProducto) => void;
  onCambiarFiltroEstado: (val: FiltroEstadoProducto) => void;
  onCambiarFiltroDisponibilidad: (val: FiltroDisponibilidad) => void;
  onCambiarFiltroProveedor: (val: string) => void;
  onCambiarFiltroMoneda: (val: 'todos' | 'ARS' | 'USD') => void;
  onIrAProveedores?: () => void;
  onAbrirPagoProveedor?: () => void;
}

/** Barra de filtros por categoría, proveedor, moneda, disponibilidad, estado y búsqueda por texto. */
export function StockFiltros({
  busqueda,
  filtroTipo,
  filtroEstado,
  filtroDisponibilidad,
  filtroProveedor,
  filtroMoneda,
  proveedores,
  totalFiltrados,
  onCambiarBusqueda,
  onCambiarFiltroTipo,
  onCambiarFiltroEstado,
  onCambiarFiltroDisponibilidad,
  onCambiarFiltroProveedor,
  onCambiarFiltroMoneda,
  onIrAProveedores,
  onAbrirPagoProveedor
}: StockFiltrosProps) {
  const { puedeGestionarProveedores } = usePermisos();
  const hayProveedorSeleccionado = filtroProveedor !== 'todos' && filtroProveedor !== 'sin_proveedor';
  const proveedorActual = hayProveedorSeleccionado
    ? proveedores.find(p => String(p.id_proveedor) === filtroProveedor)
    : undefined;
  const TIPOS: Array<{ id: FiltroTipoProducto; label: string }> = [
    { id: 'todos', label: 'Todos los Tipos' },
    { id: 'bicicleta', label: 'Bicicletas' },
    { id: 'repuesto', label: 'Repuestos' },
    { id: 'accesorio', label: 'Accesorios' },
  ];

  return (
    <div style={{
      backgroundColor: 'var(--bg-tarjeta)',
      border: '1px solid var(--borde-input)',
      borderRadius: '12px',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      {/* Buscador Rápido y Contador */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <input
            type="text"
            maxLength={60}
            placeholder="Buscar por código, ID, nombre, marca o talle (ej: '0016930', '8', 'scott', 'venzo 29')..."
            value={busqueda}
            onChange={e => onCambiarBusqueda(e.target.value.slice(0, 60))}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--borde-input)',
              backgroundColor: 'var(--bg-principal)',
              color: 'var(--texto-principal)',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => onCambiarBusqueda('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--texto-mutado)',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              ✕
            </button>
          )}
        </div>

        <span style={{ fontSize: '0.85rem', color: 'var(--texto-mutado)', fontWeight: '600' }}>
          Mostrando {totalFiltrados} artículo{totalFiltrados === 1 ? '' : 's'}
        </span>
      </div>

      {/* Píldoras de Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Categoría de Producto */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {TIPOS.map(t => {
            const activo = filtroTipo === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onCambiarFiltroTipo(t.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: activo ? 'var(--azul-oscuro)' : 'var(--bg-principal)',
                  color: activo ? '#ffffff' : 'var(--texto-mutado)',
                  transition: 'all 0.15s ease'
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Disponibilidad y Estado */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Disponibilidad */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
              Stock:
            </span>
            {(['todos', 'bajo_stock', 'sin_stock', 'optimo'] as const).map(disp => {
              const activo = filtroDisponibilidad === disp;
              const labels: Record<FiltroDisponibilidad, string> = {
                todos: 'Todos',
                bajo_stock: 'Bajo Stock',
                sin_stock: 'Sin Stock',
                optimo: 'Óptimo'
              };
              return (
                <button
                  key={disp}
                  type="button"
                  onClick={() => onCambiarFiltroDisponibilidad(disp)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '5px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    border: '1px solid var(--borde-input)',
                    cursor: 'pointer',
                    backgroundColor: activo ? (disp === 'bajo_stock' ? '#fee2e2' : disp === 'sin_stock' ? '#fef3c7' : 'var(--bg-tarjeta)') : 'var(--bg-principal)',
                    color: activo ? (disp === 'bajo_stock' ? '#991b1b' : disp === 'sin_stock' ? '#92400e' : 'var(--texto-principal)') : 'var(--texto-mutado)'
                  }}
                >
                  {labels[disp]}
                </button>
              );
            })}
          </div>

          {/* Activos / Inactivos */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
              Estado:
            </span>
            {(['todos', 'activos', 'inactivos'] as const).map(est => {
              const activo = filtroEstado === est;
              return (
                <button
                  key={est}
                  type="button"
                  onClick={() => onCambiarFiltroEstado(est)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '5px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    border: '1px solid var(--borde-input)',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    backgroundColor: activo ? (est === 'inactivos' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)') : 'var(--bg-principal)',
                    color: activo ? (est === 'inactivos' ? '#dc2626' : '#059669') : 'var(--texto-mutado)'
                  }}
                >
                  {est}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filtro por Proveedor, Moneda y Acciones Rápidas de Proveedor */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        paddingTop: '10px',
        borderTop: '1px solid var(--borde-input)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
            Proveedor:
          </span>
          <select
            value={filtroProveedor}
            onChange={e => onCambiarFiltroProveedor(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--borde-input)',
              backgroundColor: 'var(--bg-principal)',
              color: 'var(--texto-principal)',
              fontSize: '0.82rem',
              fontWeight: '600',
              minWidth: '210px'
            }}
          >
            <option value="todos">Todos los Proveedores</option>
            <option value="sin_proveedor">Sin Proveedor Asignado</option>
            {proveedores.map(prov => (
              <option key={prov.id_proveedor} value={String(prov.id_proveedor)}>
                {prov.nombre_empresa}{prov.cotizacion_dolar ? ` (USD $${prov.cotizacion_dolar})` : ''}
              </option>
            ))}
          </select>

          {hayProveedorSeleccionado && proveedorActual && (
            <span style={{
              fontSize: '0.78rem',
              fontWeight: '700',
              color: 'var(--texto-principal)',
              backgroundColor: 'var(--bg-principal)',
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid var(--borde-input)'
            }}>
              Dólar {proveedorActual.nombre_empresa}: {proveedorActual.cotizacion_dolar ? `$${proveedorActual.cotizacion_dolar}` : 'Base'}
            </span>
          )}

          {hayProveedorSeleccionado && onIrAProveedores && (
            <button
              type="button"
              onClick={onIrAProveedores}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-tarjeta)',
                color: 'var(--texto-principal)',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Gestionar en Proveedores y Cotizaciones &rarr;
            </button>
          )}

          {hayProveedorSeleccionado && puedeGestionarProveedores && onAbrirPagoProveedor && (
            <button
              type="button"
              onClick={onAbrirPagoProveedor}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--azul-oscuro)',
                backgroundColor: 'var(--azul-oscuro)',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Declarar Pago al Proveedor
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
            Moneda:
          </span>
          {(['todos', 'ARS', 'USD'] as const).map(mon => {
            const activo = filtroMoneda === mon;
            return (
              <button
                key={mon}
                type="button"
                onClick={() => onCambiarFiltroMoneda(mon)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '5px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  border: '1px solid var(--borde-input)',
                  cursor: 'pointer',
                  backgroundColor: activo ? 'var(--azul-oscuro)' : 'var(--bg-principal)',
                  color: activo ? '#ffffff' : 'var(--texto-mutado)'
                }}
              >
                {mon === 'todos' ? 'Todas' : mon}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
