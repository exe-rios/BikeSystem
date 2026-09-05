import type { ModuloFiltro } from '../types';

interface AuditoriaFiltrosProps {
  modulos: ModuloFiltro[];
  moduloFiltro: ModuloFiltro;
  setModuloFiltro: (m: ModuloFiltro) => void;
  busqueda: string;
  setBusqueda: (b: string) => void;
  onBuscar: (e: React.FormEvent) => void;
}

export function AuditoriaFiltros({
  modulos,
  moduloFiltro,
  setModuloFiltro,
  busqueda,
  setBusqueda,
  onBuscar
}: AuditoriaFiltrosProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '15px',
      flexWrap: 'wrap'
    }}>
      {/* Filtros de Módulo */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {modulos.map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setModuloFiltro(m)}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              border: '1px solid',
              borderColor: moduloFiltro === m ? 'var(--azul-oscuro)' : 'var(--borde-input)',
              backgroundColor: moduloFiltro === m ? 'var(--azul-oscuro)' : 'var(--bg-tarjeta)',
              color: moduloFiltro === m ? '#fff' : 'var(--texto-mutado)',
              fontWeight: moduloFiltro === m ? '700' : '500',
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.15s ease'
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Buscador de Eventos */}
      <form onSubmit={onBuscar} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder="Buscar por usuario, acción o descripción..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            padding: '9px 14px',
            borderRadius: '9px',
            border: '1px solid var(--borde-input)',
            backgroundColor: 'var(--bg-tarjeta)',
            color: 'var(--texto-principal)',
            width: '320px',
            fontSize: '0.88rem'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '9px 16px',
            borderRadius: '9px',
            backgroundColor: 'var(--azul-oscuro)',
            color: '#fff',
            border: 'none',
            fontWeight: '600',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          Buscar
        </button>
      </form>
    </div>
  );
}
