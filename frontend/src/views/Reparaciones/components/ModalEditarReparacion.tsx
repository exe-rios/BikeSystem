import type { Reparacion } from '../types';

interface ModalEditarReparacionProps {
  mostrar: boolean;
  onCerrar: () => void;
  ordenEditando: Reparacion | null;
  setOrdenEditando: React.Dispatch<React.SetStateAction<Reparacion | null>>;
  guardando: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ModalEditarReparacion({
  mostrar,
  onCerrar,
  ordenEditando,
  setOrdenEditando,
  guardando,
  onSubmit
}: ModalEditarReparacionProps) {
  if (!mostrar || !ordenEditando) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', width: '480px', padding: '28px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', color: 'var(--texto-principal)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>Editar Orden #{ordenEditando.id_reparacion}</h3>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Descripción del Trabajo</label>
            <textarea
              rows={3}
              value={ordenEditando.descripcion}
              onChange={e => setOrdenEditando({ ...ordenEditando, descripcion: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', resize: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Estado</label>
              <select
                value={ordenEditando.estado}
                onChange={e => setOrdenEditando({ ...ordenEditando, estado: e.target.value as Reparacion['estado'] })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
              >
                <option value="Recibida">Recibida</option>
                <option value="En Reparación">En Reparación</option>
                <option value="Lista">Lista</option>
                <option value="Entregada">Entregada</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Costo Mano de Obra ($)</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={ordenEditando.costo_mano_obra ?? ''}
                onChange={e => setOrdenEditando({ ...ordenEditando, costo_mano_obra: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onCerrar} style={{ flex: 1, padding: '11px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
            <button type="submit" disabled={guardando} style={{ flex: 2, padding: '11px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
              {guardando ? 'Guardando...' : 'Actualizar Orden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
