import type { FormProductoData } from '../types';

interface ModalProductoFormProps {
  visible: boolean;
  modo: 'crear' | 'editar';
  formData: FormProductoData;
  guardando: boolean;
  error: string | null;
  onChangeField: <K extends keyof FormProductoData>(field: K, value: FormProductoData[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ModalProductoForm({
  visible,
  modo,
  formData,
  guardando,
  error,
  onChangeField,
  onSubmit,
  onClose
}: ModalProductoFormProps) {
  if (!visible) return null;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        padding: '20px',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        boxSizing: 'border-box'
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)',
        width: 'min(560px, 100%)',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        padding: '28px',
        borderRadius: '16px',
        border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
        color: 'var(--texto-principal)'
      }}>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--azul-oscuro)', textTransform: 'uppercase' }}>
              {modo === 'crear' ? 'Nuevo Registro' : 'Modificación de Catálogo'}
            </span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: '800' }}>
              {modo === 'crear' ? 'Cargar Nuevo Artículo' : 'Editar Datos del Artículo'}
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
          {/* Tipo de Artículo */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>
              Tipo de Artículo *
            </label>
            <select
              value={formData.tipo_prod}
              onChange={e => onChangeField('tipo_prod', e.target.value as FormProductoData['tipo_prod'])}
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
              <option value="repuesto">Repuesto</option>
              <option value="bicicleta">Bicicleta Nueva</option>
              <option value="accesorio">Accesorio</option>
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>
              Nombre del Producto *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={e => onChangeField('nombre', e.target.value)}
              placeholder={formData.tipo_prod === 'bicicleta' ? 'Ej: Bicicleta Mountain Bike' : 'Ej: Cubierta Maxxis 29'}
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

          {/* Marca y Modelo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>Marca</label>
              <input
                type="text"
                placeholder="Ej: Shimano / Vairo"
                value={formData.marca}
                onChange={e => onChangeField('marca', e.target.value)}
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
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>Modelo</label>
              <input
                type="text"
                placeholder="Ej: Deore / XR 3.8"
                value={formData.modelo}
                onChange={e => onChangeField('modelo', e.target.value)}
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
              />
            </div>
          </div>

          {/* Especificaciones Exclusivas para Bicicletas */}
          {formData.tipo_prod === 'bicicleta' && (
            <div style={{
              backgroundColor: 'rgba(37, 99, 235, 0.05)',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--azul-oscuro)' }}>
                Especificaciones de Bicicleta
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.78rem' }}>Color</label>
                  <input
                    type="text"
                    placeholder="Ej: Negro/Rojo"
                    value={formData.color}
                    onChange={e => onChangeField('color', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--borde-input)',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.78rem' }}>Rodado</label>
                  <select
                    value={formData.rodado}
                    onChange={e => onChangeField('rodado', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--borde-input)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--bg-tarjeta)'
                    }}
                  >
                    <option value="26">26</option>
                    <option value="27.5">27.5</option>
                    <option value="29">29</option>
                    <option value="700c">700c</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.78rem' }}>Talle</label>
                  <select
                    value={formData.talle}
                    onChange={e => onChangeField('talle', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--borde-input)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--bg-tarjeta)'
                    }}
                  >
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Precio de Venta */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>
              Precio de Venta ($) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={formData.precio}
              onChange={e => onChangeField('precio', e.target.value)}
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

          {/* Stock y Stock Mínimo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>
                {modo === 'crear' ? 'Stock Inicial' : 'Cantidad en Stock'} *
              </label>
              <input
                type="number"
                min="0"
                value={formData.cantidad}
                onChange={e => onChangeField('cantidad', e.target.value)}
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
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>
                Stock Mínimo (Alerta) *
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock_minimo}
                onChange={e => onChangeField('stock_minimo', e.target.value)}
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

          {/* Checkbox Activo en Edición */}
          {modo === 'editar' && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'var(--bg-principal)',
              borderRadius: '8px',
              border: '1px solid var(--borde-input)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={e => onChangeField('activo', e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Producto Activo (Visible para nuevas ventas y reparaciones)</span>
              </label>
            </div>
          )}

          {/* Botones de Acción */}
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
                backgroundColor: 'var(--azul-oscuro)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: guardando ? 'not-allowed' : 'pointer',
                opacity: guardando ? 0.7 : 1
              }}
            >
              {guardando ? 'Guardando...' : (modo === 'crear' ? 'Ingresar a Inventario' : 'Guardar Cambios')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
