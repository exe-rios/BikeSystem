import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, type LogsSistemaResponse, type LogsRemotosResponse } from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';

interface ModalLogsSistemaProps {
  abierto: boolean;
  onClose: () => void;
}

type PestanaLogs = 'remoto' | 'local';
type NivelFiltro = 'TODOS' | 'ERROR' | 'WARN' | 'INFO';

function formatearTamanoBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatearFechaLog(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return fechaIso;
  return fecha.toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/** Modal de visor y descarga de logs técnicos (remotos en Supabase y locales) restringido a SUPERADMIN. */
export function ModalLogsSistema({ abierto, onClose }: ModalLogsSistemaProps) {
  const [pestana, setPestana] = useState<PestanaLogs>('remoto');
  const [datosLocal, setDatosLocal] = useState<LogsSistemaResponse | null>(null);
  const [datosRemoto, setDatosRemoto] = useState<LogsRemotosResponse | null>(null);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limiteLineas, setLimiteLineas] = useState<100 | 250 | 500>(250);
  const [nivelFiltro, setNivelFiltro] = useState<NivelFiltro>('TODOS');
  const [equipoFiltro, setEquipoFiltro] = useState<string>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const busquedaDebounced = useDebounce(busqueda, 250);

  const cargarLogsManual = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      if (pestana === 'remoto') {
        const res = await api.logs.obtenerRemotos({
          limite: limiteLineas,
          nivel: nivelFiltro,
          equipo: equipoFiltro,
          busqueda: busquedaDebounced
        });
        setDatosRemoto(res);
      } else {
        const res = await api.logs.obtener(limiteLineas);
        setDatosLocal(res);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los logs del sistema.');
    } finally {
      setCargando(false);
    }
  }, [pestana, limiteLineas, nivelFiltro, equipoFiltro, busquedaDebounced]);

  useEffect(() => {
    if (!abierto) return;
    let cancelado = false;

    const solicitud =
      pestana === 'remoto'
        ? api.logs
            .obtenerRemotos({
              limite: limiteLineas,
              nivel: nivelFiltro,
              equipo: equipoFiltro,
              busqueda: busquedaDebounced
            })
            .then((res) => {
              if (!cancelado) {
                setDatosRemoto(res);
                setError(null);
              }
            })
        : api.logs.obtener(limiteLineas).then((res) => {
            if (!cancelado) {
              setDatosLocal(res);
              setError(null);
            }
          });

    solicitud
      .catch((err: unknown) => {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los logs del sistema.');
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCargando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [abierto, pestana, limiteLineas, nivelFiltro, equipoFiltro, busquedaDebounced]);

  useEffect(() => {
    if (!abierto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [abierto, onClose]);

  const lineasLocalesFiltradas = useMemo(() => {
    const todas = datosLocal?.lineas || [];
    const term = busquedaDebounced.trim().toLowerCase();
    return todas.filter((linea) => {
      if (nivelFiltro !== 'TODOS' && !linea.includes(`[${nivelFiltro}]`)) {
        return false;
      }
      if (term && !linea.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [datosLocal, nivelFiltro, busquedaDebounced]);

  const registrosRemotos = datosRemoto?.registros || [];
  const equiposDisponibles = datosRemoto?.equipos || [];

  const handleDescargar = async () => {
    setDescargando(true);
    setError(null);
    try {
      if (pestana === 'remoto') {
        await api.logs.descargarRemotos({ nivel: nivelFiltro, equipo: equipoFiltro });
      } else {
        await api.logs.descargar();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el archivo de logs.');
    } finally {
      setDescargando(false);
    }
  };

  const handleAbrirCarpeta = async () => {
    try {
      const ok = await window.electronAPI?.openLogsFolder?.();
      if (ok === false) {
        setError('No se pudo abrir la carpeta de logs en el explorador.');
      }
    } catch {
      setError('No se pudo abrir la carpeta de logs en el explorador.');
    }
  };

  if (!abierto) return null;

  const tieneOpenLogsFolder = typeof window !== 'undefined' && Boolean(window.electronAPI?.openLogsFolder);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Logs técnicos del sistema"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 1100
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          width: 'min(1040px, 100%)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Logs técnicos del sistema (SUPERADMIN)
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Errores remotos centralizados en Supabase de todas las PCs y respaldo local
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setCargando(true);
                setPestana('remoto');
              }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: pestana === 'remoto' ? '#0f172a' : '#fff',
                color: pestana === 'remoto' ? '#fff' : '#334155',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Remoto (Todas las PCs)
            </button>
            <button
              type="button"
              onClick={() => {
                setCargando(true);
                setPestana('local');
              }}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: pestana === 'local' ? '#0f172a' : '#fff',
                color: pestana === 'local' ? '#fff' : '#334155',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Archivo local (esta PC)
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar visor de logs"
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px 8px'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra de controles */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            alignItems: 'center'
          }}
        >
          {pestana === 'remoto' && (
            <select
              value={equipoFiltro}
              onChange={(e) => {
                setCargando(true);
                setEquipoFiltro(e.target.value);
              }}
              aria-label="Filtrar por equipo"
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#fff'
              }}
            >
              <option value="TODOS">Todos los equipos</option>
              {equiposDisponibles.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          )}

          <select
            value={nivelFiltro}
            onChange={(e) => {
              if (pestana === 'remoto') setCargando(true);
              setNivelFiltro(e.target.value as NivelFiltro);
            }}
            aria-label="Filtrar por nivel de log"
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              backgroundColor: '#fff'
            }}
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="ERROR">Solo ERROR</option>
            <option value="WARN">Solo WARN</option>
            <option value="INFO">Solo INFO</option>
          </select>

          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Filtrar por texto, usuario, ruta o módulo..."
            aria-label="Buscar dentro de los logs"
            style={{
              flex: '1 1 200px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem'
            }}
          />

          <select
            value={limiteLineas}
            onChange={(e) => {
              setCargando(true);
              setLimiteLineas(Number(e.target.value) as 100 | 250 | 500);
            }}
            aria-label="Cantidad de registros"
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              backgroundColor: '#fff'
            }}
          >
            <option value={100}>Últimos 100</option>
            <option value={250}>Últimos 250</option>
            <option value={500}>Últimos 500</option>
          </select>

          <button
            type="button"
            onClick={cargarLogsManual}
            disabled={cargando}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--azul-oscuro)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: cargando ? 'not-allowed' : 'pointer',
              opacity: cargando ? 0.7 : 1
            }}
          >
            {cargando ? 'Cargando...' : 'Actualizar'}
          </button>

          <button
            type="button"
            onClick={handleDescargar}
            disabled={descargando || cargando}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: descargando || cargando ? 'not-allowed' : 'pointer',
              opacity: descargando || cargando ? 0.7 : 1
            }}
          >
            {descargando ? 'Descargando...' : 'Descargar .log'}
          </button>

          {pestana === 'local' && tieneOpenLogsFolder && (
            <button
              type="button"
              onClick={handleAbrirCarpeta}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#fff',
                color: '#0f172a',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              Abrir carpeta
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              margin: '12px 20px 0',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#b91c1c',
              fontSize: '0.86rem'
            }}
          >
            {error}
          </div>
        )}

        {/* Consola de logs */}
        <div style={{ padding: '14px 20px', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              backgroundColor: '#0f172a',
              color: '#e2e8f0',
              borderRadius: '10px',
              padding: '14px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '0.78rem',
              lineHeight: 1.5,
              maxHeight: '55vh',
              minHeight: '260px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}
          >
            {pestana === 'remoto' ? (
              cargando && !datosRemoto ? (
                <span style={{ color: '#94a3b8' }}>Cargando registros remotos desde Supabase...</span>
              ) : registrosRemotos.length === 0 ? (
                <span style={{ color: '#94a3b8' }}>
                  No hay logs remotos registrados con los filtros seleccionados.
                </span>
              ) : (
                registrosRemotos.map((reg) => {
                  const color =
                    reg.nivel === 'ERROR' ? '#fca5a5' : reg.nivel === 'WARN' ? '#fcd34d' : '#cbd5e1';
                  const userPart = reg.usuario ? ` (${reg.usuario})` : '';
                  return (
                    <div
                      key={reg.id_log}
                      style={{
                        color,
                        paddingBottom: '6px',
                        marginBottom: '6px',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.14)'
                      }}
                    >
                      <div>
                        [{formatearFechaLog(reg.created_at)}] [{reg.nivel}] [{reg.equipo}] [{reg.origen}]
                        {userPart} {reg.mensaje}
                      </div>
                      {reg.detalle && (
                        <div style={{ color: '#94a3b8', paddingLeft: '12px', fontSize: '0.74rem' }}>
                          {reg.detalle}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            ) : cargando && !datosLocal ? (
              <span style={{ color: '#94a3b8' }}>Cargando registros locales...</span>
            ) : lineasLocalesFiltradas.length === 0 ? (
              <span style={{ color: '#94a3b8' }}>
                {datosLocal?.existe === false
                  ? 'Todavía no existe el archivo bikesystem.log en esta PC.'
                  : 'No hay líneas que coincidan con el filtro seleccionado.'}
              </span>
            ) : (
              lineasLocalesFiltradas.map((linea, idx) => {
                const esError = linea.includes('[ERROR]');
                const esWarn = linea.includes('[WARN]');
                const color = esError ? '#fca5a5' : esWarn ? '#fcd34d' : '#cbd5e1';
                return (
                  <div key={idx} style={{ color, paddingBottom: '2px' }}>
                    {linea}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '0.8rem',
            color: '#64748b'
          }}
        >
          {pestana === 'remoto' ? (
            <span>
              Origen: <strong>Supabase (Log_Sistema)</strong> · Equipos:{' '}
              <strong>{equiposDisponibles.length}</strong> · Mostrando:{' '}
              <strong>{registrosRemotos.length}</strong> de <strong>{datosRemoto?.total || 0}</strong> (retención
              máx. 500)
            </span>
          ) : (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Archivo: <strong>{datosLocal?.archivo || 'bikesystem.log'}</strong> · Tamaño:{' '}
              <strong>{formatearTamanoBytes(datosLocal?.tamanoBytes || 0)}</strong> · Líneas mostradas:{' '}
              <strong>{lineasLocalesFiltradas.length}</strong> de <strong>{datosLocal?.totalLineas || 0}</strong>
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#fff',
              color: '#0f172a',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
