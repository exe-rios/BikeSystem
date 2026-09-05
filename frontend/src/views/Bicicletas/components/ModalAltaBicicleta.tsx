import type { Cliente, NuevaBicicletaData } from '../types';

interface ModalAltaBicicletaProps {
  mostrar: boolean;
  onCerrar: () => void;
  nuevaBici: NuevaBicicletaData;
  setNuevaBici: React.Dispatch<React.SetStateAction<NuevaBicicletaData>>;
  clientes: Cliente[];
  guardando: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ModalAltaBicicleta({
  mostrar,
  onCerrar,
  nuevaBici,
  setNuevaBici,
  clientes,
  guardando,
  onSubmit
}: ModalAltaBicicletaProps) {
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
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)' }}>Registrar Bicicleta de Cliente</h3>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Asignar Dueño / Cliente *</label>
            <select
              value={nuevaBici.id_cliente}
              onChange={e => setNuevaBici({ ...nuevaBici, id_cliente: Number(e.target.value) })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
              required
            >
              <option value={0}>-- Seleccionar Cliente --</option>
              {clientes.map(c => (
                <option key={c.id_cliente} value={c.id_cliente}>{c.apellido}, {c.nombre} (DNI: {c.dni})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Marca *</label>
            <input
              type="text"
              placeholder="Ej: Trek, Specialized, Vairo, Venzo..."
              value={nuevaBici.marca}
              onChange={e => setNuevaBici({ ...nuevaBici, marca: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Modelo *</label>
            <input
              type="text"
              placeholder="Ej: Marlin 7, Rockhopper, XR 3.8..."
              value={nuevaBici.modelo}
              onChange={e => setNuevaBici({ ...nuevaBici, modelo: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="button" onClick={onCerrar} style={{ flex: 1, padding: '12px', border: '1px solid var(--borde-input)', borderRadius: '10px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
            <button type="submit" disabled={guardando} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
              {guardando ? 'Guardando...' : 'Guardar Bicicleta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
