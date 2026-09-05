import type { Bicicleta, Reparacion, NuevaReparacionData } from '../types';

interface ModalAltaReparacionProps {
  mostrar: boolean;
  onCerrar: () => void;
  nuevaReparacion: NuevaReparacionData;
  setNuevaReparacion: React.Dispatch<React.SetStateAction<NuevaReparacionData>>;
  bicicletas: Bicicleta[];
  guardando: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ModalAltaReparacion({
  mostrar,
  onCerrar,
  nuevaReparacion,
  setNuevaReparacion,
  bicicletas,
  guardando,
  onSubmit
}: ModalAltaReparacionProps) {
  if (!mostrar) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', width: '500px', padding: '30px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', color: 'var(--texto-principal)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Registrar Orden de Taller</h3>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Bicicleta a Reparar *</label>
            <select
              value={nuevaReparacion.id_bicicleta}
              onChange={e => setNuevaReparacion({ ...nuevaReparacion, id_bicicleta: Number(e.target.value) })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
              required
            >
              <option value={0}>-- Seleccione la bicicleta del cliente --</option>
              {bicicletas.map(b => (
                <option key={b.id_bicicleta} value={b.id_bicicleta}>
                  #{b.id_bicicleta} — {b.marca} {b.modelo} {b.nombre ? `(${b.apellido}, ${b.nombre})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Descripción del Trabajo / Falla *</label>
            <textarea
              rows={3}
              placeholder="Ej: Cambio de cámara y cubierta, regulación de cambios Shimano, centrado de llanta..."
              value={nuevaReparacion.descripcion}
              onChange={e => setNuevaReparacion({ ...nuevaReparacion, descripcion: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', resize: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Estado Inicial</label>
              <select
                value={nuevaReparacion.estado}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNuevaReparacion({ ...nuevaReparacion, estado: e.target.value as Reparacion['estado'] })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
              >
                <option value="Recibida">Recibida</option>
                <option value="En Reparación">En Reparación</option>
                <option value="Lista">Lista</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Costo Mano de Obra ($) *</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={nuevaReparacion.costo_mano_obra}
                onChange={e => setNuevaReparacion({ ...nuevaReparacion, costo_mano_obra: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="button" onClick={onCerrar} style={{ flex: 1, padding: '12px', border: '1px solid var(--borde-input)', borderRadius: '10px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
            <button type="submit" disabled={guardando} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
              {guardando ? 'Ingresando...' : 'Ingresar al Taller'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
