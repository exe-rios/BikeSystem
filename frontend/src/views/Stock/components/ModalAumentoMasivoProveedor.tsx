import { useState } from 'react';
import type { Proveedor, AumentoMasivoResponse } from '../../../types';
import { api } from '../../../services/api';
import { formatearMoneda } from '../../../utils/formatters';

interface ModalAumentoMasivoProveedorProps {
  proveedores: Proveedor[];
  cotizacionDolar: number;
  proveedorInicial?: string;
  valorInicial?: string;
  onSuccess: () => Promise<void> | void;
  onClose: () => void;
}

/** Modal para aplicar aumentos (o descuentos) masivos a todos los productos de un proveedor con vista previa. */
export function ModalAumentoMasivoProveedor({
  proveedores,
  cotizacionDolar,
  proveedorInicial,
  valorInicial,
  onSuccess,
  onClose
}: ModalAumentoMasivoProveedorProps) {
  const [idProveedor, setIdProveedor] = useState<string>(() =>
    proveedorInicial && proveedorInicial !== 'todos' && proveedorInicial !== 'sin_proveedor'
      ? proveedorInicial
      : (proveedores[0]?.id_proveedor ? String(proveedores[0].id_proveedor) : '')
  );
  const [tipoAjuste, setTipoAjuste] = useState<'porcentaje' | 'monto_fijo'>('porcentaje');
  const [valor, setValor] = useState<string>(valorInicial || '10');
  const [filtroTipoProd, setFiltroTipoProd] = useState<string>('todos');
  const [filtroMoneda, setFiltroMoneda] = useState<string>('todos');

  const [previewData, setPreviewData] = useState<AumentoMasivoResponse | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const solicitarPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPreviewData(null);

    if (!idProveedor) {
      setError('Seleccioná un proveedor.');
      return;
    }
    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum === 0) {
      setError('Ingresá un valor distinto de 0.');
      return;
    }

    setCargandoPreview(true);
    try {
      const res = await api.productos.aumentoMasivo({
        id_proveedor: idProveedor === 'todos' ? 'todos' : Number(idProveedor),
        tipo_ajuste: tipoAjuste,
        valor: valorNum,
        filtro_tipo_prod: filtroTipoProd,
        filtro_moneda: filtroMoneda,
        solo_activos: true,
        preview: true
      });
      setPreviewData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al calcular la vista previa.');
    } finally {
      setCargandoPreview(false);
    }
  };

  const confirmarAumento = async () => {
    if (!previewData) return;
    setError(null);
    setAplicando(true);
    try {
      const res = await api.productos.aumentoMasivo({
        id_proveedor: idProveedor === 'todos' ? 'todos' : Number(idProveedor),
        tipo_ajuste: tipoAjuste,
        valor: Number(valor),
        filtro_tipo_prod: filtroTipoProd,
        filtro_moneda: filtroMoneda,
        solo_activos: true,
        preview: false
      });
      alert(`${res.message || 'Precios actualizados.'}\nEl cambio quedó registrado en Auditoría.`);
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al aplicar el aumento masivo.');
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px', boxSizing: 'border-box'
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', width: 'min(820px, 100%)', maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto', padding: '28px', borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.18)', color: 'var(--texto-principal)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--azul-oscuro)', textTransform: 'uppercase' }}>
              Actualización Masiva por Proveedor
            </span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: '800' }}>
              Aumentar Precios de un Proveedor
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-principal)',
          border: '1px solid var(--borde-input)',
          borderRadius: '10px',
          padding: '10px 14px',
          fontSize: '0.83rem',
          marginBottom: '16px'
        }}>
          El ajuste se aplica sobre el <strong>Precio de Costo del proveedor</strong> y recalcula automáticamente el <strong>Precio de Venta</strong> manteniendo el <strong>% de Ganancia</strong> de cada artículo y usando el dólar propio del proveedor (o el dólar base si no tiene propio: <strong>{formatearMoneda(cotizacionDolar)}</strong>).
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={solicitarPreview} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.82rem' }}>Proveedor *</label>
            <select
              value={idProveedor}
              onChange={e => { setIdProveedor(e.target.value); setPreviewData(null); }}
              required
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem' }}
            >
              <option value="">Seleccionar proveedor...</option>
              {proveedores.map(p => (
                <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_empresa}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.82rem' }}>Tipo de Ajuste</label>
            <select
              value={tipoAjuste}
              onChange={e => { setTipoAjuste(e.target.value as 'porcentaje' | 'monto_fijo'); setPreviewData(null); }}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem' }}
            >
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto_fijo">Monto Fijo</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.82rem' }}>
              {tipoAjuste === 'porcentaje' ? 'Porcentaje (%)' : 'Monto (+ / -)'} *
            </label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={e => { setValor(e.target.value); setPreviewData(null); }}
              placeholder={tipoAjuste === 'porcentaje' ? 'Ej: 15' : 'Ej: 5000'}
              required
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.82rem' }}>Categoría</label>
            <select
              value={filtroTipoProd}
              onChange={e => { setFiltroTipoProd(e.target.value); setPreviewData(null); }}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem' }}
            >
              <option value="todos">Todas</option>
              <option value="bicicleta">Bicicletas</option>
              <option value="repuesto">Repuestos</option>
              <option value="accesorio">Accesorios</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '0.82rem' }}>Moneda</label>
            <select
              value={filtroMoneda}
              onChange={e => { setFiltroMoneda(e.target.value); setPreviewData(null); }}
              style={{ width: '100%', padding: '9px 10px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem' }}
            >
              <option value="todos">Todas (USD y ARS)</option>
              <option value="USD">Solo en USD</option>
              <option value="ARS">Solo en ARS</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="submit"
              disabled={cargandoPreview}
              style={{ width: '100%', padding: '10px 14px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: cargandoPreview ? 'not-allowed' : 'pointer' }}
            >
              {cargandoPreview ? 'Calculando...' : 'Previsualizar'}
            </button>
          </div>
        </form>

        {previewData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.88rem' }}>
              <span>
                Proveedor: <strong>{previewData.proveedor.nombre_empresa}</strong> — <strong>{previewData.total_afectados}</strong> producto(s) afectados
                ({previewData.resumen_moneda.usd} en USD, {previewData.resumen_moneda.ars} en ARS)
              </span>
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--borde-input)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-principal)', borderBottom: '1px solid var(--borde-input)' }}>
                    <th style={{ padding: '8px 12px' }}>Producto</th>
                    <th style={{ padding: '8px 12px' }}>Moneda</th>
                    <th style={{ padding: '8px 12px' }}>Costo Ant. → Nuevo (% Gan.)</th>
                    <th style={{ padding: '8px 12px' }}>Venta USD Ant. → Nuevo</th>
                    <th style={{ padding: '8px 12px' }}>Venta ARS Ant. → Nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.items.map(item => {
                    const ganPct =
                      item.porcentaje_ganancia !== null && item.porcentaje_ganancia !== undefined
                        ? item.porcentaje_ganancia <= 10
                          ? Math.round(item.porcentaje_ganancia * 10000) / 100
                          : Math.round(item.porcentaje_ganancia * 100) / 100
                        : null;

                    return (
                      <tr key={item.id_producto} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '600' }}>
                          {item.nombre}
                          {(item.marca || item.modelo) && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)', fontWeight: '400' }}>
                              {item.marca} {item.modelo}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                            backgroundColor: 'var(--bg-principal)',
                            border: '1px solid var(--borde-input)',
                            color: 'var(--texto-principal)'
                          }}>
                            {item.moneda}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {item.costo_actual !== null && item.costo_actual !== undefined && item.costo_nuevo !== null && item.costo_nuevo !== undefined ? (
                            <span>
                              {item.moneda === 'USD' ? `USD ${Number(item.costo_actual).toFixed(2)}` : formatearMoneda(item.costo_actual)}
                              {' → '}
                              <strong>
                                {item.moneda === 'USD' ? `USD ${Number(item.costo_nuevo).toFixed(2)}` : formatearMoneda(item.costo_nuevo)}
                              </strong>
                              {ganPct !== null && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--texto-mutado)' }}> (+{ganPct}%)</span>
                              )}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {item.moneda === 'USD' ? (
                            <span>
                              USD {Number(item.precio_usd_actual || 0).toFixed(2)} → <strong>USD {Number(item.precio_usd_nuevo || 0).toFixed(2)}</strong>
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {formatearMoneda(item.precio_ars_actual)} → <strong style={{ color: 'var(--azul-oscuro)' }}>{formatearMoneda(item.precio_ars_nuevo)}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '10px 18px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={aplicando}
                onClick={confirmarAumento}
                style={{ padding: '10px 22px', backgroundColor: 'var(--azul-oscuro)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: aplicando ? 'not-allowed' : 'pointer' }}
              >
                {aplicando ? 'Aplicando...' : `Confirmar y Actualizar (${previewData.total_afectados})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
