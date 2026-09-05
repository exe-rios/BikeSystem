import type { Producto } from '../../../types';
import type { FormMovimientoData } from '../types';

interface ModalAjusteStockProps {
  visible: boolean;
  productos: Producto[];
  nuevoMovimiento: FormMovimientoData;
  guardando: boolean;
  error: string | null;
  onChangeMovimiento: (data: FormMovimientoData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ModalAjusteStock({
  visible,
  productos,
  nuevoMovimiento,
  guardando,
  error,
  onChangeMovimiento,
  onSubmit,
  onClose
}: ModalAjusteStockProps) {
  if (!visible) return null;

  const productoSeleccionado = productos.find(p => p.id_producto === nuevoMovimiento.id_producto);
  const stockActual = productoSeleccionado ? Number(productoSeleccionado.cantidad || 0) : 0;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)',
        width: 'min(500px, 100%)',
        padding: '28px',
        borderRadius: '16px',
        border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
        color: 'var(--texto-principal)'
      }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--azul-oscuro)', textTransform: 'uppercase' }}>
              Movimiento de Inventario
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '2px 0 0 0' }}>
              Registrar Ajuste de Stock
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Producto */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
              Seleccionar Producto *
            </label>
            <select
              value={nuevoMovimiento.id_producto}
              onChange={e => onChangeMovimiento({ ...nuevoMovimiento, id_producto: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                fontSize: '0.9rem'
              }}
              required
            >
              <option value={0}>-- Seleccionar Producto --</option>
              {productos.filter(p => p.activo !== false).map(p => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre} {p.marca ? `(${p.marca})` : ''} — Stock disponible: {p.cantidad}
                </option>
              ))}
            </select>

            {productoSeleccionado && (
              <div style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)', marginTop: '4px' }}>
                Stock actual registrado: <strong>{stockActual}</strong> unidad{stockActual === 1 ? '' : 'es'}
              </div>
            )}
          </div>

          {/* Tipo de Movimiento y Cantidad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Tipo de Ajuste *
              </label>
              <select
                value={nuevoMovimiento.tipo_movimiento}
                onChange={e => onChangeMovimiento({ ...nuevoMovimiento, tipo_movimiento: e.target.value as 'INGRESO' | 'EGRESO' })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--borde-input)',
                  backgroundColor: 'var(--bg-principal)',
                  color: nuevoMovimiento.tipo_movimiento === 'INGRESO' ? '#059669' : '#dc2626',
                  fontSize: '0.9rem',
                  fontWeight: '800'
                }}
              >
                <option value="INGRESO">INGRESO</option>
                <option value="EGRESO">EGRESO</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
                Cantidad de Unidades *
              </label>
              <input
                type="number"
                min="1"
                value={nuevoMovimiento.cantidad}
                onChange={e => onChangeMovimiento({ ...nuevoMovimiento, cantidad: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--borde-input)',
                  backgroundColor: 'var(--bg-principal)',
                  color: 'var(--texto-principal)',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
              Motivo del Movimiento *
            </label>
            <select
              value={nuevoMovimiento.motivo}
              onChange={e => onChangeMovimiento({ ...nuevoMovimiento, motivo: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                fontSize: '0.9rem'
              }}
            >
              <option value="Compra / Reposición">Compra / Reposición a Proveedor</option>
              <option value="Ajuste de Inventario">Ajuste de Conteo Físico / Inventario</option>
              <option value="Rotura o Daño">Rotura o Daño de Producto</option>
              <option value="Uso Interno de Taller">Uso Interno en Taller</option>
              <option value="Devolución de Cliente">Devolución de Cliente</option>
              <option value="Otro Motivo">Otro Motivo</option>
            </select>
          </div>

          {/* Observaciones */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>
              Observaciones (Opcional)
            </label>
            <textarea
              rows={3}
              value={nuevoMovimiento.observaciones}
              onChange={e => onChangeMovimiento({ ...nuevoMovimiento, observaciones: e.target.value })}
              placeholder="Detalles adicionales, número de comprobante de compra o motivo específico..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                fontSize: '0.85rem',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '11px',
                border: '1px solid var(--borde-input)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                fontWeight: '600',
                cursor: 'pointer',
                color: 'var(--texto-mutado)'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              style={{
                flex: 2,
                padding: '11px',
                backgroundColor: nuevoMovimiento.tipo_movimiento === 'INGRESO' ? '#059669' : '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: guardando ? 'not-allowed' : 'pointer',
                opacity: guardando ? 0.7 : 1
              }}
            >
              {guardando ? 'Registrando...' : 'Aplicar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
