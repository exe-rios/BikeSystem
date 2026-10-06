import { useState, useId } from 'react';

interface ModalConfirmarBackupProps {
  abierto: boolean;
  onClose: () => void;
  onConfirmar: () => Promise<void>;
}

/** Modal de confirmación para la generación y descarga del respaldo SQL nativo. */
export function ModalConfirmarBackup({
  abierto,
  onClose,
  onConfirmar
}: ModalConfirmarBackupProps) {
  const modalTitleId = useId();
  const [generando, setGenerando] = useState<boolean>(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [completado, setCompletado] = useState<boolean>(false);

  if (!abierto) return null;

  const handleDescargar = async () => {
    try {
      setGenerando(true);
      setErrorLocal(null);
      await onConfirmar();
      setCompletado(true);
      setTimeout(() => {
        setCompletado(false);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorLocal(err.message);
      } else {
        setErrorLocal('Error al generar la copia de seguridad.');
      }
    } finally {
      setGenerando(false);
    }
  };

  const handleCerrar = () => {
    if (generando) return;
    setErrorLocal(null);
    setCompletado(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
      onClick={handleCerrar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        style={{
          backgroundColor: 'var(--bg-tarjeta, #1e293b)',
          color: 'var(--texto-principal, #f8fafc)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--borde-input, #334155)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 id={modalTitleId} style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--texto-principal, #f8fafc)' }}>
              Copia de Seguridad de la Base de Datos
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--texto-mutado, #94a3b8)' }}>
              Respaldo SQL nativo completo (RNF3)
            </p>
          </div>
          <button
            type="button"
            onClick={handleCerrar}
            disabled={generando}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              color: 'var(--texto-mutado, #94a3b8)',
              cursor: generando ? 'not-allowed' : 'pointer',
              padding: '4px 8px'
            }}
          >
            x
          </button>
        </div>

        {/* Explicación y Alcance */}
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '10px',
          padding: '14px',
          fontSize: '0.85rem',
          color: 'var(--texto-principal, #f8fafc)',
          lineHeight: '1.5'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#60a5fa' }}>
            Información del Respaldo:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Se generará un archivo SQL completo con todas las tablas del sistema: usuarios, clientes, proveedores, catálogo, stock, ventas, reparaciones y bitácora.</li>
            <li>El volcado utiliza transacciones atómicas con desactivación temporal de disparadores para permitir una restauración limpia y sin conflictos.</li>
            <li>La operación quedará registrada formalmente en la bitácora de auditoría.</li>
          </ul>
        </div>

        {/* Estado de error si ocurre */}
        {errorLocal && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            {errorLocal}
          </div>
        )}

        {/* Mensaje de completado */}
        {completado && (
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid #22c55e',
            color: '#22c55e',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '600'
          }}>
            Respaldo generado y descarga iniciada correctamente.
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={handleCerrar}
            disabled={generando}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--borde-input, #475569)',
              backgroundColor: 'transparent',
              color: 'var(--texto-principal, #cbd5e1)',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: generando ? 'not-allowed' : 'pointer'
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleDescargar}
            disabled={generando || completado}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: completado ? '#22c55e' : 'var(--azul-primario, #2563eb)',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '0.88rem',
              cursor: (generando || completado) ? 'not-allowed' : 'pointer',
              opacity: generando ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {generando ? 'Generando Respaldo...' : completado ? 'Descargado' : 'Descargar Respaldo (.SQL)'}
          </button>
        </div>
      </div>
    </div>
  );
}
