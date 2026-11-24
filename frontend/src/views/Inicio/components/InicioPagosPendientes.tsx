import { useState } from 'react';
import type { PagoProveedorPendiente, MetodoPago } from '../../../types';
import { api } from '../../../services/api';
import { formatearMoneda } from '../../../utils/formatters';

interface InicioPagosPendientesProps {
  esAdmin: boolean;
  cargando: boolean;
  pendientes: PagoProveedorPendiente[];
  metodosPago: MetodoPago[];
  onPagoRegistrado: () => Promise<void> | void;
  onNavigate: (view: string) => void;
  ocultarBotonHistorial?: boolean;
}

const formatearFechaIsoALegible = (iso?: string | null): string => {
  if (!iso) return '—';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
};

const formatearMontoMoneda = (monto: number | string, moneda: 'ARS' | 'USD'): string => {
  const num = Number(monto) || 0;
  if (moneda === 'USD') {
    return `USD ${num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return formatearMoneda(num);
};

/** Panel de recordatorios y registro rápido de pagos agendados a proveedores en la pantalla principal. */
export function InicioPagosPendientes({
  esAdmin,
  cargando,
  pendientes,
  metodosPago,
  onPagoRegistrado,
  onNavigate,
  ocultarBotonHistorial = false
}: InicioPagosPendientesProps) {
  const [pendienteActivo, setPendienteActivo] = useState<PagoProveedorPendiente | null>(null);
  const [idMetodoPago, setIdMetodoPago] = useState<number>(1);
  const [montoAbono, setMontoAbono] = useState<string>('');
  const [nuevaFecha, setNuevaFecha] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  if (!esAdmin) return null;

  const abrirModalPago = (p: PagoProveedorPendiente) => {
    setPendienteActivo(p);
    setIdMetodoPago(metodosPago[0]?.id_metodo_pago || 1);
    setMontoAbono(String(Number(p.saldo_pendiente) || 0));
    setNuevaFecha('');
    setObservaciones('');
    setErrorModal(null);
  };

  const cerrarModal = () => {
    setPendienteActivo(null);
    setErrorModal(null);
  };

  const saldoActualModal = pendienteActivo ? Math.round((Number(pendienteActivo.saldo_pendiente) || 0) * 100) / 100 : 0;
  const abonoNumModal = Math.round((Number(montoAbono) || 0) * 100) / 100;
  const saldoRestanteModal = abonoNumModal < saldoActualModal
    ? Math.round((saldoActualModal - abonoNumModal) * 100) / 100
    : 0;

  const handleConfirmarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendienteActivo) return;
    setErrorModal(null);

    if (isNaN(abonoNumModal) || abonoNumModal <= 0) {
      setErrorModal('Ingresá un monto válido mayor a 0.');
      return;
    }
    if (abonoNumModal > saldoActualModal) {
      setErrorModal('El monto supera el saldo pendiente.');
      return;
    }
    if (saldoRestanteModal > 0 && !nuevaFecha) {
      setErrorModal('Como queda un saldo pendiente, indicá la nueva fecha para el próximo pago.');
      return;
    }

    setGuardando(true);
    try {
      const res = await api.pagosProveedores.registrarAbonoPendiente(pendienteActivo.id_pendiente, {
        id_metodo_pago: idMetodoPago,
        monto_abono: abonoNumModal,
        nueva_fecha_proximo_pago: saldoRestanteModal > 0 ? nuevaFecha : undefined,
        observaciones: observaciones.trim() || undefined
      });
      alert(res.message);
      cerrarModal();
      await onPagoRegistrado();
    } catch (err: unknown) {
      setErrorModal(err instanceof Error ? err.message : 'No se pudo registrar el pago.');
    } finally {
      setGuardando(false);
    }
  };

  const urgentesCount = pendientes.filter(p => (p.dias_restantes ?? 99) <= 0).length;

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-tarjeta)',
        borderRadius: '14px',
        border: urgentesCount > 0 ? '1px solid rgba(239, 68, 68, 0.45)' : '1px solid var(--borde-input)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', margin: 0, color: urgentesCount > 0 ? '#dc2626' : 'var(--texto-principal)' }}>
            Próximos Pagos a Proveedores
          </h3>
          {pendientes.length > 0 && (
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '20px',
                backgroundColor: urgentesCount > 0 ? '#fee2e2' : 'rgba(37, 99, 235, 0.1)',
                color: urgentesCount > 0 ? '#991b1b' : 'var(--azul-oscuro)'
              }}
            >
              {pendientes.length} pendiente{pendientes.length === 1 ? '' : 's'}
              {urgentesCount > 0 ? ` (${urgentesCount} para hoy o vencido${urgentesCount === 1 ? '' : 's'})` : ''}
            </span>
          )}
        </div>

        {!ocultarBotonHistorial && (
          <button
            type="button"
            onClick={() => onNavigate('pago-proveedores')}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--borde-input)',
              backgroundColor: 'transparent',
              color: 'var(--texto-principal)',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Ver historial de pagos →
          </button>
        )}
      </div>

      {cargando ? (
        <p style={{ margin: 0, color: 'var(--texto-mutado)', fontSize: '0.86rem' }}>Verificando vencimientos programados...</p>
      ) : pendientes.length === 0 ? (
        <div style={{ padding: '12px 14px', backgroundColor: 'rgba(16, 185, 129, 0.06)', borderRadius: '8px', color: '#065f46', fontSize: '0.88rem', fontWeight: '500' }}>
          ✓ No tenés pagos a proveedores agendados pendientes.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pendientes.map(p => {
            const dias = p.dias_restantes ?? 0;
            const esVencido = dias < 0;
            const esHoy = dias === 0;
            const esProximo = dias > 0 && dias <= 3;

            const badgeBg = esVencido || esHoy ? '#fee2e2' : esProximo ? '#fef3c7' : 'rgba(37, 99, 235, 0.1)';
            const badgeColor = esVencido || esHoy ? '#991b1b' : esProximo ? '#92400e' : '#1d4ed8';
            const badgeText = esVencido
              ? `VENCIDO (hace ${Math.abs(dias)} d)`
              : esHoy
              ? 'VENCE HOY'
              : `En ${dias} día${dias === 1 ? '' : 's'}`;

            return (
              <div
                key={p.id_pendiente}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: esVencido || esHoy ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-principal)',
                  border: esVencido || esHoy ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--borde-input)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '800', fontSize: '0.94rem', color: 'var(--texto-principal)' }}>
                      {p.proveedor_nombre || `Proveedor #${p.id_proveedor}`}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', backgroundColor: badgeBg, color: badgeColor }}>
                      {badgeText}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)' }}>
                      Día de pago: {formatearFechaIsoALegible(p.fecha_proximo_pago)}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--texto-mutado)' }}>
                    {p.numero_factura ? `Factura Nº ${p.numero_factura}` : 'Compra a proveedor'}
                    {p.fecha_factura ? ` (${p.fecha_factura})` : ''}
                    {' • '}
                    Total factura: {formatearMontoMoneda(p.monto_factura_total, p.moneda)}
                    {Number(p.monto_pagado) > 0 && ` • Ya pagado: ${formatearMontoMoneda(p.monto_pagado, p.moneda)}`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
                      Saldo a Pagar
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: esVencido || esHoy ? '#dc2626' : 'var(--texto-principal)' }}>
                      {formatearMontoMoneda(p.saldo_pendiente, p.moneda)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirModalPago(p)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--azul-oscuro)',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Registrar Pago
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para registrar pago total o abono parcial del saldo agendado */}
      {pendienteActivo && (
        <div
          onClick={e => e.target === e.currentTarget && cerrarModal()}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1200,
            padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-tarjeta)',
              width: 'min(480px, 100%)',
              borderRadius: '14px',
              border: '1px solid var(--borde-input)',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              color: 'var(--texto-principal)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--azul-oscuro)', textTransform: 'uppercase' }}>
                  Registrar Pago Agendado
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', fontWeight: '800' }}>
                  {pendienteActivo.proveedor_nombre}
                </h3>
              </div>
              <button type="button" onClick={cerrarModal} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--bg-principal)', border: '1px solid var(--borde-input)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.82rem', marginBottom: '14px' }}>
              <div>
                <strong>{pendienteActivo.numero_factura ? `Factura Nº ${pendienteActivo.numero_factura}` : 'Saldo pendiente'}</strong>
                {pendienteActivo.fecha_factura ? ` • Fecha ${pendienteActivo.fecha_factura}` : ''}
              </div>
              <div style={{ marginTop: '4px', color: 'var(--texto-mutado)' }}>
                Saldo pendiente actual:{' '}
                <strong style={{ color: 'var(--texto-principal)' }}>
                  {formatearMontoMoneda(pendienteActivo.saldo_pendiente, pendienteActivo.moneda)}
                </strong>
              </div>
            </div>

            {errorModal && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '12px' }}>
                {errorModal}
              </div>
            )}

            <form onSubmit={handleConfirmarPago} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: '700' }}>Método de Pago *</label>
                <select
                  value={idMetodoPago}
                  onChange={e => setIdMetodoPago(Number(e.target.value))}
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.88rem' }}
                >
                  {metodosPago.map(mp => (
                    <option key={mp.id_metodo_pago} value={mp.id_metodo_pago}>{mp.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: '700' }}>
                  Monto a Pagar ({pendienteActivo.moneda}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={saldoActualModal}
                  value={montoAbono}
                  onChange={e => setMontoAbono(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.92rem', fontWeight: '700', boxSizing: 'border-box' }}
                />
              </div>

              {saldoRestanteModal > 0 && (
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#92400e', marginBottom: '6px' }}>
                    Quedará un saldo restante de {formatearMontoMoneda(saldoRestanteModal, pendienteActivo.moneda)}. Agendá el próximo pago:
                  </div>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={e => setNuevaFecha(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(217, 119, 6, 0.5)', backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', fontSize: '0.86rem', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: '700' }}>Observaciones (Opcional)</label>
                <input
                  type="text"
                  maxLength={200}
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Comprobante de transferencia, cheque..."
                  style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.86rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={cerrarModal}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'transparent', color: 'var(--texto-mutado)', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--azul-oscuro)', color: '#ffffff', fontWeight: '700', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}
                >
                  {guardando ? 'Registrando...' : saldoRestanteModal > 0 ? 'Registrar Abono Parcial' : 'Confirmar y Saldar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
