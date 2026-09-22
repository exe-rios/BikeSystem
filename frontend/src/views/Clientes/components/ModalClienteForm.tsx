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

/** Modal con formulario controlado para el alta y edición de clientes. */
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

  const handleClose = () => {
    if (!clienteEditando && (formData.nombre.trim() || formData.apellido.trim() || formData.dni.trim() || formData.telefono.trim() || formData.email.trim())) {
      if (!window.confirm('Hay datos del cliente sin guardar. ¿Deseas cerrar la ventana?')) return;
    }
    onCerrar();
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && handleClose()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', width: '480px', padding: '30px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--texto-principal)' }}>
            {clienteEditando ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
          </h3>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Nombre *</label>
                <span style={{ fontSize: '0.72rem', color: formData.nombre.length >= 15 ? '#ef4444' : 'var(--texto-mutado)' }}>
                  {formData.nombre.length}/15
                </span>
              </div>
              <input
                type="text"
                maxLength={15}
                value={formData.nombre}
                onChange={e => setFormData({ ...formData, nombre: e.target.value.slice(0, 15) })}
                placeholder="Ej: Juan"
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  border: `1px solid ${erroresForm.nombre ? '#ef4444' : 'var(--borde-input)'}`,
                  fontSize: '0.9rem', boxSizing: 'border-box'
                }}
              />
              {erroresForm.nombre && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>{erroresForm.nombre}</span>}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Apellido *</label>
                <span style={{ fontSize: '0.72rem', color: formData.apellido.length >= 15 ? '#ef4444' : 'var(--texto-mutado)' }}>
                  {formData.apellido.length}/15
                </span>
              </div>
              <input
                type="text"
                maxLength={15}
                value={formData.apellido}
                onChange={e => setFormData({ ...formData, apellido: e.target.value.slice(0, 15) })}
                placeholder="Ej: Pérez"
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  border: `1px solid ${erroresForm.apellido ? '#ef4444' : 'var(--borde-input)'}`,
                  fontSize: '0.9rem', boxSizing: 'border-box'
                }}
              />
              {erroresForm.apellido && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>{erroresForm.apellido}</span>}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>DNI *</label>
              <span style={{ fontSize: '0.72rem', color: formData.dni.length >= 10 ? '#ef4444' : 'var(--texto-mutado)' }}>
                {formData.dni.length}/10
              </span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={formData.dni}
              onChange={e => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder="Ej: 40123456 (7 u 10 números)"
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: `1px solid ${erroresForm.dni ? '#ef4444' : 'var(--borde-input)'}`,
                fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
            {erroresForm.dni && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>{erroresForm.dni}</span>}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Teléfono</label>
              <span style={{ fontSize: '0.72rem', color: formData.telefono.length >= 15 ? '#ef4444' : 'var(--texto-mutado)' }}>
                {formData.telefono.length}/15
              </span>
            </div>
            <input
              type="tel"
              maxLength={15}
              value={formData.telefono}
              onChange={e => setFormData({ ...formData, telefono: e.target.value.replace(/[^\d+]/g, '').slice(0, 15) })}
              placeholder="Ej: +543421234567"
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: `1px solid ${erroresForm.telefono ? '#ef4444' : 'var(--borde-input)'}`,
                fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
            {erroresForm.telefono && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>{erroresForm.telefono}</span>}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Email</label>
              <span style={{ fontSize: '0.72rem', color: formData.email.length >= 30 ? '#ef4444' : 'var(--texto-mutado)' }}>
                {formData.email.length}/30
              </span>
            </div>
            <input
              type="email"
              maxLength={30}
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value.slice(0, 30) })}
              placeholder="ejemplo@correo.com"
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: `1px solid ${erroresForm.email ? '#ef4444' : 'var(--borde-input)'}`,
                fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
            {erroresForm.email && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>{erroresForm.email}</span>}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--texto-principal)' }}>Dirección</label>
              <span style={{ fontSize: '0.72rem', color: (formData.direccion || '').length >= 40 ? '#ef4444' : 'var(--texto-mutado)' }}>
                {(formData.direccion || '').length}/40
              </span>
            </div>
            <input
              type="text"
              maxLength={40}
              value={formData.direccion}
              onChange={e => setFormData({ ...formData, direccion: e.target.value.slice(0, 40) })}
              placeholder="Ej: San Martín 1234"
              style={{
                width: '100%', padding: '10px', borderRadius: '8px',
                border: `1px solid ${erroresForm.direccion ? '#ef4444' : 'var(--borde-input)'}`,
                fontSize: '0.9rem', boxSizing: 'border-box'
              }}
            />
            {erroresForm.direccion && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>{erroresForm.direccion}</span>}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={handleClose}
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
