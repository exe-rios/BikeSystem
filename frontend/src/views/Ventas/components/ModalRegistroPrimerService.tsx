import { useState, useId } from 'react';
import type { GarantiaConEstado } from '../types';
import { formatearFecha } from '../../../utils/formatters';

interface ModalRegistroPrimerServiceProps {
  garantia: GarantiaConEstado | null;
  abierto: boolean;
  rolUsuario?: string;
  onClose: () => void;
  onConfirmar: (
    idDetalleVenta: number,
    payload: { fecha_service?: string; observaciones?: string }
  ) => Promise<boolean>;
}

/** Modal para asentar y registrar el 1° Service Obligatorio de Bicicletas Vendidas. */
export function ModalRegistroPrimerService({
  garantia,
  abierto,
  rolUsuario,
  onClose,
  onConfirmar
}: ModalRegistroPrimerServiceProps) {
  const modalTitleId = useId();
  const fechaInputId = useId();
  const observacionesInputId = useId();
  const autorizacionCheckboxId = useId();
  
  const [fechaService, setFechaService] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [observaciones, setObservaciones] = useState<string>('');
  const [confirmarExcepcion, setConfirmarExcepcion] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  if (!abierto || !garantia) return null;

  // Plazo de 30 días desde la fecha de venta
  const fechaVentaObj = new Date(garantia.fecha_venta);
  const fechaActualObj = new Date();
  const diffTiempo = fechaActualObj.getTime() - fechaVentaObj.getTime();
  const diasDesdeVenta = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));
  const esFueraDeTermino = diasDesdeVenta > 30;
  const esAdmin = rolUsuario === 'ADMIN' || rolUsuario === 'SUPERADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (esFueraDeTermino && !esAdmin) {
      setErrorLocal('El plazo de 30 días ha expirado. Solo un administrador puede autorizar este registro como excepción.');
      return;
    }

    if (esFueraDeTermino && esAdmin && !confirmarExcepcion) {
      setErrorLocal('Debe tildar la casilla de confirmación para autorizar la excepción administrativa.');
      return;
    }

    setGuardando(true);
    try {
      const ok = await onConfirmar(garantia.id_detalle_venta, {
        fecha_service: fechaService || undefined,
        observaciones: observaciones.trim() || undefined
      });
      if (ok) {
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorLocal(err.message);
      } else {
        setErrorLocal('Error al registrar el primer service.');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        style={{
          backgroundColor: 'var(--bg-tarjeta)',
          color: 'var(--texto-principal)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--borde-input)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 id={modalTitleId} style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--texto-principal)' }}>
              Registrar 1° Service Obligatorio
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--texto-mutado)' }}>
              Mantenimiento de asentamiento técnico para validar extensión de garantía a 6 meses.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              color: 'var(--texto-mutado)',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            X
          </button>
        </div>

        {/* Resumen de la Bicicleta y Venta */}
        <div
          style={{
            backgroundColor: 'var(--bg-principal)',
            border: '1px solid var(--borde-input)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontSize: '0.86rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--texto-mutado)' }}>Comprobante:</span>
            <strong style={{ fontFamily: 'monospace' }}>FAC-{String(garantia.id_venta).padStart(6, '0')}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--texto-mutado)' }}>Titular:</span>
            <strong>{garantia.cliente_apellido}, {garantia.cliente_nombre}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--texto-mutado)' }}>Bicicleta:</span>
            <strong>{garantia.producto_nombre} {garantia.marca ? `(${garantia.marca})` : ''}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--texto-mutado)' }}>Fecha de Venta:</span>
            <span>{formatearFecha(garantia.fecha_venta, 'N/A')} ({diasDesdeVenta} días transcurridos)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--texto-mutado)' }}>Límite para 1° Service:</span>
            <span>{garantia.fecha_limite_service ? formatearFecha(garantia.fecha_limite_service, 'N/A') : '30 días desde venta'}</span>
          </div>
        </div>

        {/* Mensaje de estado de plazo */}
        {!esFueraDeTermino ? (
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}
          >
            <strong>En término reglamentario:</strong> La bicicleta se encuentra dentro de los 30 días de asentamiento. Al registrar el service, la garantía quedará extendida oficialmente a 6 meses (180 días) desde la fecha de compra.
          </div>
        ) : esAdmin ? (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}
          >
            <strong>Registro fuera de término (Excepción Administrativa):</strong> Han transcurrido {diasDesdeVenta} días desde la compra (plazo límite: 30 días). Como usuario con privilegios administrativos, puede autorizar el registro extraordinario para reactivar y extender la póliza a 6 meses.
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem'
            }}
          >
            <strong>Plazo vencido:</strong> Han transcurrido {diasDesdeVenta} días desde la fecha de venta. La cobertura caducó por falta del primer service reglamentario dentro de los 30 días. Comuníquese con un Administrador para autorizar una excepción.
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label htmlFor={fechaInputId} style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px', color: 'var(--texto-principal)' }}>
              Fecha de Realización del Service:
            </label>
            <input
              id={fechaInputId}
              type="date"
              value={fechaService}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setFechaService(e.target.value)}
              disabled={esFueraDeTermino && !esAdmin}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div>
            <label htmlFor={observacionesInputId} style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', marginBottom: '6px', color: 'var(--texto-principal)' }}>
              Detalles / Tareas Técnicas Realizadas:
            </label>
            <textarea
              id={observacionesInputId}
              rows={3}
              placeholder="Ejemplo: Reajuste de rayos, centrado, calibración de cambios y frenos, verificación de aprietes generales."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              disabled={esFueraDeTermino && !esAdmin}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)',
                fontSize: '0.88rem',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Confirmación para Excepción de Administrador */}
          {esFueraDeTermino && esAdmin && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id={autorizacionCheckboxId}
                checked={confirmarExcepcion}
                onChange={e => setConfirmarExcepcion(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <label htmlFor={autorizacionCheckboxId} style={{ fontSize: '0.82rem', color: 'var(--texto-principal)', cursor: 'pointer' }}>
                Autorizo formalmente la excepción administrativa para asentar el primer service fuera de término y otorgar los 6 meses de garantía.
              </label>
            </div>
          )}

          {errorLocal && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.82rem'
            }}>
              {errorLocal}
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'transparent',
                color: 'var(--texto-principal)',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || (esFueraDeTermino && !esAdmin)}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: esFueraDeTermino ? '#d97706' : '#16a34a',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: (esFueraDeTermino && !esAdmin) || guardando ? 'not-allowed' : 'pointer',
                opacity: (esFueraDeTermino && !esAdmin) || guardando ? 0.6 : 1
              }}
            >
              {guardando ? 'Guardando...' : esFueraDeTermino ? 'Confirmar Excepción' : 'Confirmar 1° Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
