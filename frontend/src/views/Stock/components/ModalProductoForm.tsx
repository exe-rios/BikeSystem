import type { Proveedor } from '../../../types';
import type { FormProductoData } from '../types';
import { formatearMoneda } from '../../../utils/formatters';

interface ModalProductoFormProps {
  visible: boolean;
  modo: 'crear' | 'editar';
  idProducto?: number;
  formData: FormProductoData;
  proveedores: Proveedor[];
  cotizacionDolar: number;
  guardando: boolean;
  error: string | null;
  onChangeField: <K extends keyof FormProductoData>(field: K, value: FormProductoData[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

/** Modal con formulario para dar de alta o modificar un artículo del inventario. */
export function ModalProductoForm({
  visible,
  modo,
  idProducto,
  formData,
  proveedores,
  cotizacionDolar,
  guardando,
  error,
  onChangeField,
  onSubmit,
  onClose
}: ModalProductoFormProps) {
  if (!visible) return null;

  const handleClose = () => {
    const tieneCambios =
      formData.codigo.trim() !== '' ||
      formData.nombre.trim() !== '' ||
      (formData.precio !== '' && Number(formData.precio) > 0) ||
      (formData.precio_usd !== '' && Number(formData.precio_usd) > 0) ||
      (formData.cantidad !== '' && Number(formData.cantidad) > 0 && String(formData.cantidad) !== '1');
    if (modo === 'crear' && tieneCambios) {
      if (!window.confirm('Hay datos ingresados sin guardar. ¿Deseas cerrar la ventana?')) return;
    }
    onClose();
  };

  const esUsd = formData.moneda === 'USD';
  const costoNum = Number(formData.costo_usd) || 0;
  const gananciaPct = Number(formData.porcentaje_ganancia) || 0;
  const reventaPct = Number(formData.porcentaje_reventa) || 0;
  const precioUsdNum = Number(formData.precio_usd) || 0;
  const precioReventaUsdNum = Number(formData.precio_reventa_usd) || 0;
  const provSeleccionado = formData.id_proveedor
    ? proveedores.find(p => String(p.id_proveedor) === String(formData.id_proveedor))
    : undefined;
  const usaDolarPropio = Boolean(provSeleccionado?.cotizacion_dolar && Number(provSeleccionado.cotizacion_dolar) > 0);
  const cotizacionEfectiva = usaDolarPropio ? Number(provSeleccionado!.cotizacion_dolar) : cotizacionDolar;
  const equivalenteArs = Math.round(precioUsdNum * cotizacionEfectiva * 100) / 100;
  const equivalenteReventaArs = Math.round(precioReventaUsdNum * cotizacionEfectiva * 100) / 100;
  const mostrarReventa =
    formData.tipo_prod === 'repuesto' ||
    formData.tipo_prod === 'accesorio' ||
    formData.precio_reventa !== '' ||
    formData.precio_reventa_usd !== '' ||
    formData.porcentaje_reventa !== '';

  const recalcularPrecioDesdeCosto = (nuevoCostoStr: string, nuevaGananciaStr: string, nuevaMoneda: 'ARS' | 'USD' = formData.moneda) => {
    const c = Number(nuevoCostoStr);
    const g = Number(nuevaGananciaStr);
    if (nuevoCostoStr === '' || isNaN(c) || c < 0) return;
    const factor = nuevaGananciaStr !== '' && !isNaN(g) ? g / 100 : 0;
    const calculado = Math.round(c * (1 + factor) * 100) / 100;
    if (nuevaMoneda === 'USD') {
      onChangeField('precio_usd', String(calculado));
    } else {
      onChangeField('precio', String(calculado));
    }
  };

  const recalcularReventaDesdeCosto = (nuevoCostoStr: string, nuevoReventaPctStr: string, nuevaMoneda: 'ARS' | 'USD' = formData.moneda) => {
    const c = Number(nuevoCostoStr);
    const r = Number(nuevoReventaPctStr);
    if (nuevoCostoStr === '' || isNaN(c) || c <= 0 || nuevoReventaPctStr === '' || isNaN(r) || r < 0) return;
    const calculado = Math.round(c * (1 + r / 100) * 100) / 100;
    if (nuevaMoneda === 'USD') {
      onChangeField('precio_reventa_usd', String(calculado));
    } else {
      onChangeField('precio_reventa', String(calculado));
    }
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && handleClose()}
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
              {modo === 'crear' ? 'Nuevo Registro' : `Modificación de Catálogo ${idProducto ? `(#${idProducto})` : ''}`}
            </span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: '800' }}>
              {modo === 'crear' ? 'Cargar Nuevo Artículo' : `Editar Datos del Artículo ${idProducto ? `(#${idProducto})` : ''}`}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
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
          {/* Tipo de Artículo y Proveedor */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.85rem' }}>
                Proveedor
              </label>
              <select
                value={formData.id_proveedor}
                onChange={e => onChangeField('id_proveedor', e.target.value)}
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
                <option value="">Sin proveedor asignado</option>
                {proveedores.map(prov => (
                  <option key={prov.id_proveedor} value={String(prov.id_proveedor)}>
                    {prov.nombre_empresa}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Código de Artículo y Nombre */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                  Código Artículo
                </label>
                <span style={{ fontSize: '0.72rem', color: (formData.codigo || '').length >= 50 ? '#ef4444' : 'var(--texto-mutado)' }}>
                  {(formData.codigo || '').length}/50
                </span>
              </div>
              <input
                type="text"
                maxLength={50}
                value={formData.codigo}
                onChange={e => onChangeField('codigo', e.target.value.slice(0, 50))}
                placeholder="Ej: 0016930"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--borde-input)',
                  backgroundColor: 'var(--bg-principal)',
                  color: 'var(--texto-principal)',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                  Nombre del Producto *
                </label>
                <span style={{ fontSize: '0.72rem', color: formData.nombre.length >= 100 ? '#ef4444' : 'var(--texto-mutado)' }}>
                  {formData.nombre.length}/100
                </span>
              </div>
              <input
                type="text"
                maxLength={100}
                value={formData.nombre}
                onChange={e => onChangeField('nombre', e.target.value.slice(0, 100))}
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
          </div>

          {/* Marca y Modelo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Marca</label>
                <span style={{ fontSize: '0.72rem', color: (formData.marca || '').length >= 50 ? '#ef4444' : 'var(--texto-mutado)' }}>
                  {(formData.marca || '').length}/50
                </span>
              </div>
              <input
                type="text"
                maxLength={50}
                placeholder="Ej: Shimano / Vairo"
                value={formData.marca}
                onChange={e => onChangeField('marca', e.target.value.slice(0, 50))}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Modelo</label>
                <span style={{ fontSize: '0.72rem', color: (formData.modelo || '').length >= 50 ? '#ef4444' : 'var(--texto-mutado)' }}>
                  {(formData.modelo || '').length}/50
                </span>
              </div>
              <input
                type="text"
                maxLength={50}
                placeholder="Ej: Deore / XR 3.8"
                value={formData.modelo}
                onChange={e => onChangeField('modelo', e.target.value.slice(0, 50))}
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.78rem' }}>Género</label>
                  <select
                    value={formData.genero}
                    onChange={e => onChangeField('genero', e.target.value as FormProductoData['genero'])}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--borde-input)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--bg-tarjeta)'
                    }}
                  >
                    <option value="">Seleccionar</option>
                    <option value="hombre">Hombre</option>
                    <option value="mujer">Mujer</option>
                    <option value="unisex">Unisex</option>
                    <option value="niño/a">Niño/a</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.78rem' }}>Color</label>
                  <input
                    type="text"
                    maxLength={30}
                    placeholder="Ej: Gris Negro Blanco"
                    value={formData.color}
                    onChange={e => onChangeField('color', e.target.value.slice(0, 30))}
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
                    <option value="">Sin especificar</option>
                    {['12', '14', '16', '18', '20', '24', '26', '27.5', '28', '29', '700', 'Gravel'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    {formData.rodado && !['12', '14', '16', '18', '20', '24', '26', '27.5', '28', '29', '700', 'Gravel'].includes(formData.rodado) && (
                      <option value={formData.rodado}>{formData.rodado}</option>
                    )}
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
                    <option value="">Sin especificar</option>
                    {['XS', 'S', 'M', 'L', 'XL', '14', '15', '16', '17', '18', '19', '20', '21', '22'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    {formData.talle && !['XS', 'S', 'M', 'L', 'XL', '14', '15', '16', '17', '18', '19', '20', '21', '22'].includes(formData.talle) && (
                      <option value={formData.talle}>{formData.talle}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Cálculo de Precio: Moneda, Costo, % Ganancia y Precio Final */}
          <div style={{
            backgroundColor: 'var(--bg-principal)',
            border: '1px solid var(--borde-input)',
            borderRadius: '10px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--texto-principal)', textTransform: 'uppercase' }}>
                Cálculo de Precio ({esUsd ? 'Lista en USD' : 'Lista en ARS'})
              </span>
              {esUsd && (
                <span style={{
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-tarjeta)',
                  border: '1px solid var(--borde-input)',
                  color: 'var(--texto-principal)'
                }}>
                  {usaDolarPropio
                    ? `Dólar ${provSeleccionado?.nombre_empresa}: ${formatearMoneda(cotizacionEfectiva)}`
                    : `Cotización Base: ${formatearMoneda(cotizacionEfectiva)}`}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.8rem' }}>
                  Moneda *
                </label>
                <select
                  value={formData.moneda}
                  onChange={e => {
                    const m = e.target.value as 'ARS' | 'USD';
                    onChangeField('moneda', m);
                    recalcularPrecioDesdeCosto(String(formData.costo_usd), String(formData.porcentaje_ganancia), m);
                    recalcularReventaDesdeCosto(String(formData.costo_usd), String(formData.porcentaje_reventa), m);
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 8px',
                    borderRadius: '8px',
                    border: '1px solid var(--borde-input)',
                    backgroundColor: 'var(--bg-tarjeta)',
                    color: 'var(--texto-principal)',
                    fontSize: '0.88rem',
                    fontWeight: '700'
                  }}
                >
                  <option value="ARS">ARS ($)</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.8rem' }}>
                  Costo ({esUsd ? 'USD' : 'ARS $'})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="99999999.99"
                  placeholder="Opcional"
                  value={formData.costo_usd}
                  onChange={e => {
                    onChangeField('costo_usd', e.target.value);
                    recalcularPrecioDesdeCosto(e.target.value, String(formData.porcentaje_ganancia));
                    recalcularReventaDesdeCosto(e.target.value, String(formData.porcentaje_reventa));
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--borde-input)',
                    backgroundColor: 'var(--bg-tarjeta)',
                    color: 'var(--texto-principal)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.8rem' }}>
                  Ganancia %
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="10000"
                  placeholder="Ej: 60"
                  value={formData.porcentaje_ganancia}
                  onChange={e => {
                    onChangeField('porcentaje_ganancia', e.target.value);
                    recalcularPrecioDesdeCosto(String(formData.costo_usd), e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--borde-input)',
                    backgroundColor: 'var(--bg-tarjeta)',
                    color: 'var(--texto-principal)',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.8rem' }}>
                  {esUsd ? 'Venta (USD) *' : 'Venta (ARS $) *'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="99999999.99"
                  placeholder="0.00"
                  value={esUsd ? formData.precio_usd : formData.precio}
                  onChange={e => onChangeField(esUsd ? 'precio_usd' : 'precio', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--borde-input)',
                    backgroundColor: 'var(--bg-tarjeta)',
                    color: 'var(--texto-principal)',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
            </div>

            {esUsd && (
              <div style={{
                backgroundColor: 'var(--bg-tarjeta)',
                border: '1px solid var(--azul-oscuro)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.82rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                color: 'var(--texto-principal)'
              }}>
                <span>
                  {costoNum > 0
                    ? `Costo USD ${costoNum.toFixed(2)} + ${gananciaPct}% = USD ${precioUsdNum.toFixed(2)} × ${formatearMoneda(cotizacionEfectiva)}`
                    : `Venta USD ${precioUsdNum.toFixed(2)} × Dólar ${formatearMoneda(cotizacionEfectiva)}`}
                </span>
                <strong style={{ fontSize: '0.96rem' }}>Final Mostrador: {formatearMoneda(equivalenteArs)} ARS</strong>
              </div>
            )}

            {!esUsd && costoNum > 0 && (
              <div style={{
                backgroundColor: 'var(--bg-tarjeta)',
                border: '1px solid var(--borde-input)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.8rem',
                color: 'var(--texto-principal)',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Fórmula: {formatearMoneda(costoNum)} + {gananciaPct}% ganancia</span>
                <strong>Final Mostrador: {formatearMoneda(Number(formData.precio) || 0)} ARS</strong>
              </div>
            )}

            {/* Precio de Reventa / Mayorista para Repuestos */}
            {mostrarReventa && (
              <div style={{
                marginTop: '4px',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-tarjeta)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--azul-oscuro)', textTransform: 'uppercase' }}>
                    Precio de Reventa (Revendedores / Otros locales)
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--texto-mutado)' }}>
                    {costoNum > 0 ? 'Calculado sobre el costo' : 'Ingresá costo para calcular por % o cargá el precio directo'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.8rem' }}>
                      % Reventa (sobre costo)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="10000"
                      placeholder="Ej: 25"
                      value={formData.porcentaje_reventa}
                      onChange={e => {
                        onChangeField('porcentaje_reventa', e.target.value);
                        recalcularReventaDesdeCosto(String(formData.costo_usd), e.target.value);
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--borde-input)',
                        backgroundColor: 'var(--bg-principal)',
                        color: 'var(--texto-principal)',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.8rem' }}>
                      {esUsd ? 'Precio Reventa (USD)' : 'Precio Reventa (ARS $)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="99999999.99"
                      placeholder="Opcional"
                      value={esUsd ? formData.precio_reventa_usd : formData.precio_reventa}
                      onChange={e => {
                        const valStr = e.target.value;
                        onChangeField(esUsd ? 'precio_reventa_usd' : 'precio_reventa', valStr);
                        const v = Number(valStr);
                        if (valStr !== '' && !isNaN(v) && v >= 0 && costoNum > 0) {
                          const pctCalc = Math.round(((v / costoNum) - 1) * 10000) / 100;
                          if (pctCalc >= 0) {
                            onChangeField('porcentaje_reventa', String(pctCalc));
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--borde-input)',
                        backgroundColor: 'var(--bg-principal)',
                        color: 'var(--texto-principal)',
                        fontSize: '0.88rem',
                        fontWeight: '700',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {esUsd && precioReventaUsdNum > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.78rem',
                    color: 'var(--texto-principal)',
                    backgroundColor: 'var(--bg-principal)',
                    border: '1px solid var(--borde-input)',
                    borderRadius: '6px',
                    padding: '6px 10px'
                  }}>
                    <span>
                      {costoNum > 0 && formData.porcentaje_reventa !== ''
                        ? `Costo USD ${costoNum.toFixed(2)} + ${reventaPct}% = USD ${precioReventaUsdNum.toFixed(2)} × ${formatearMoneda(cotizacionEfectiva)}`
                        : `Reventa USD ${precioReventaUsdNum.toFixed(2)} × Dólar ${formatearMoneda(cotizacionEfectiva)}`}
                    </span>
                    <strong>Reventa Final: {formatearMoneda(equivalenteReventaArs)} ARS</strong>
                  </div>
                )}

                {!esUsd && Number(formData.precio_reventa) > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.78rem',
                    color: 'var(--texto-principal)',
                    backgroundColor: 'var(--bg-principal)',
                    border: '1px solid var(--borde-input)',
                    borderRadius: '6px',
                    padding: '6px 10px'
                  }}>
                    <span>
                      {costoNum > 0 && formData.porcentaje_reventa !== ''
                        ? `Fórmula: ${formatearMoneda(costoNum)} + ${reventaPct}% reventa`
                        : 'Precio de reventa configurado manualmente'}
                    </span>
                    <strong>Reventa Final: {formatearMoneda(Number(formData.precio_reventa) || 0)} ARS</strong>
                  </div>
                )}
              </div>
            )}
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
                max="1000000"
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
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.85rem' }}>
                Stock Mínimo (Alerta) *
              </label>
              <input
                type="number"
                min="0"
                max="1000000"
                placeholder="Ej: 2 (0 para sin alerta)"
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
              onClick={handleClose}
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
