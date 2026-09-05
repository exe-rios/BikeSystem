import type { Usuario, EditarUsuarioData } from '../types';

interface ModalEditarUsuarioProps {
  mostrar: boolean;
  onCerrar: () => void;
  usuarioEditando: Usuario | null;
  formEditar: EditarUsuarioData;
  setFormEditar: React.Dispatch<React.SetStateAction<EditarUsuarioData>>;
  guardando: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ModalEditarUsuario({
  mostrar,
  onCerrar,
  usuarioEditando,
  formEditar,
  setFormEditar,
  guardando,
  onSubmit
}: ModalEditarUsuarioProps) {
  if (!mostrar || !usuarioEditando) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', width: '460px', padding: '28px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', color: 'var(--texto-principal)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>
            Editar Usuario: {usuarioEditando.nombre_usuario}
          </h3>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Rol en el Sistema</label>
            <select
              value={formEditar.rol}
              onChange={e => setFormEditar({ ...formEditar, rol: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
            >
              <option value="EMPLEADO">EMPLEADO</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPERADMIN">SUPERADMIN</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600' }}>Nueva Contraseña (Opcional)</label>
            <input
              type="password"
              placeholder="Dejar en blanco para conservar la actual"
              value={formEditar.contrasena}
              onChange={e => setFormEditar({ ...formEditar, contrasena: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onCerrar} style={{ flex: 1, padding: '11px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
            <button type="submit" disabled={guardando} style={{ flex: 2, padding: '11px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
