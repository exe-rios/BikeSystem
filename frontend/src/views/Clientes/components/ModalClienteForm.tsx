import type { Cliente, ClienteFormData, ErroresFormulario } from '../types';

interface ModalClienteFormProps {
  mostrar: boolean;
  onCerrar: () => void;
  clienteEditando: Cliente | null;
  formData: ClienteFormData;
  setFormData: React.Dispatch<React.SetStateAction<ClienteFormData>>;
  erroresForm: ErroresFormulario;
  errorModal: string | null;
  guardando: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ModalClienteForm({
  mostrar,
  onCerrar,
  clienteEditando,
  formData,
  setFormData,
  erroresForm,
  errorModal,
  guardando,
  onSubmit
}: ModalClienteFormProps) {
  if (!mostrar) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', width: '480px', padding: '30px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
            {clienteEditando ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
          </h3>
          <button onClick={onCerrar} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
        </div>

        {errorModal && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            {errorModal}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  border: `1px solid ${erroresForm.nombre ? '#ef4444' : 'var(--borde-input)'}`,
                  fontSize: '0.9rem', boxSizing: 'border-box'
                }}
              />
              {erroresForm.nombre && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{erroresForm.nombre}</span>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Apellido *</label>
              <input
                type="text"
                value={formData.apellido}
                onChange={e => setFormData({ ...formData, apellido: e.target.value })}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  border: `1px solid ${erroresForm.apellido ? '#ef4444' : 'var(--borde-input)'}`,
                  fontSize: '0.9rem', boxSizing: 'border-box'
                }}
              />
              {erroresForm.apellido && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{erroresForm.apellido}</span>}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>DNI *</label>
            <input
              type="text"
              value={formData.dni}
              onChange={e => setFormData({ ...formData, dni: e.target.value })}
              placeholder="Ej: 40123456"
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: `1px solid ${erroresForm.dni ? '#ef4444' : 'var(--borde-input)'}`,
                fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
            {erroresForm.dni && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{erroresForm.dni}</span>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Teléfono</label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={e => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="Ej: 3421234567"
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: `1px solid ${erroresForm.telefono ? '#ef4444' : 'var(--borde-input)'}`,
                fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
            {erroresForm.telefono && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{erroresForm.telefono}</span>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="ejemplo@correo.com"
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: `1px solid ${erroresForm.email ? '#ef4444' : 'var(--borde-input)'}`,
                fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
            {erroresForm.email && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{erroresForm.email}</span>}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Dirección</label>
            <input
              type="text"
              value={formData.direccion}
              onChange={e => setFormData({ ...formData, direccion: e.target.value })}
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onCerrar}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'transparent',
                border: '1px solid var(--borde-input)',
                borderRadius: '8px',
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
                padding: '12px',
                backgroundColor: 'var(--azul-oscuro)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '1rem',
                cursor: guardando ? 'not-allowed' : 'pointer',
                opacity: guardando ? 0.7 : 1
              }}
            >
              {guardando ? 'Guardando...' : (clienteEditando ? 'Actualizar Cliente' : 'Registrar Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
