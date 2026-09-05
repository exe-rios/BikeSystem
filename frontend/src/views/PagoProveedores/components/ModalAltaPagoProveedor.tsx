import type { Proveedor, MetodoPago, NuevoPagoData } from '../types';

interface ModalAltaPagoProveedorProps {
  mostrar: boolean;
  onCerrar: () => void;
  nuevoPago: NuevoPagoData;
  setNuevoPago: React.Dispatch<React.SetStateAction<NuevoPagoData>>;
  proveedores: Proveedor[];
  metodosPago: MetodoPago[];
  guardando: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ModalAltaPagoProveedor({
  mostrar,
  onCerrar,
  nuevoPago,
  setNuevoPago,
  proveedores,
  metodosPago,
  guardando,
  onSubmit
}: ModalAltaPagoProveedorProps) {
  if (!mostrar) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', width: '500px', padding: '30px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)', margin: 0 }}>Registrar Pago a Proveedor</h3>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* NOMBRE DE PROVEEDOR INGRESO DIRECTO O SELECCIÓN */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>
              Nombre del Proveedor / Empresa *
            </label>
            <input
              type="text"
              list="proveedores-sugeridos"
              placeholder="Ej: Distribuidora Shimano, Repuestos Rossi..."
              value={nuevoPago.nombre_proveedor}
              onChange={e => setNuevoPago({ ...nuevoPago, nombre_proveedor: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
              required
              autoFocus
            />
            <datalist id="proveedores-sugeridos">
              {proveedores.map(prov => (
                <option key={prov.id_proveedor} value={prov.nombre_empresa} />
              ))}
            </datalist>
            <span style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)', marginTop: '4px', display: 'block' }}>
              Puedes escribir libremente un nombre nuevo o seleccionar uno existente.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Método de Pago *</label>
            <select
              value={nuevoPago.id_metodo_pago}
              onChange={e => setNuevoPago({ ...nuevoPago, id_metodo_pago: Number(e.target.value) })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
              required
            >
              <option value={0}>Seleccione un método...</option>
              {metodosPago.map(mp => (
                <option key={mp.id_metodo_pago} value={mp.id_metodo_pago}>{mp.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Monto Total ($) *</label>
            <input
              type="number"
              step="any"
              min="0"
              value={nuevoPago.monto_total}
              onChange={e => setNuevoPago({ ...nuevoPago, monto_total: e.target.value })}
              placeholder="0.00"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Observaciones</label>
            <textarea
              value={nuevoPago.observaciones}
              onChange={e => setNuevoPago({ ...nuevoPago, observaciones: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }}
              placeholder="Número de factura, comprobante de transferencia, etc."
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onCerrar} style={{ flex: 1, padding: '12px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
            <button type="submit" disabled={guardando} style={{ flex: 2, padding: '12px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
              {guardando ? 'Guardando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
