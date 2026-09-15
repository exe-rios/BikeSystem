import React from 'react';

interface PaginadorProps {
  paginaActual: number;
  totalPaginas: number;
  totalRegistros: number;
  limite?: number;
  onCambiarPagina?: (pagina: number) => void;
  alCambiarPagina?: (pagina: number) => void;
}

/** Componente de paginación con ventana deslizante de 5 páginas y botones de navegación rápida. */
export const Paginador: React.FC<PaginadorProps> = ({
  paginaActual,
  totalPaginas,
  totalRegistros,
  onCambiarPagina,
  alCambiarPagina,
}) => {
  const handlerCambio = onCambiarPagina || alCambiarPagina || (() => {});
  if (totalRegistros <= 0) {
    return null;
  }

  // Generar ventana de páginas visibles (hasta 5 páginas alrededor de la actual)
  const generarPaginas = () => {
    const paginas: number[] = [];
    const inicio = Math.max(1, paginaActual - 2);
    const fin = Math.min(totalPaginas, paginaActual + 2);

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }
    return paginas;
  };

  const paginasVisibles = generarPaginas();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: 'var(--bg-tarjeta)',
        borderRadius: '12px',
        border: '1px solid var(--borde-input)',
        marginTop: '12px',
        fontSize: '0.88rem',
        color: 'var(--texto-principal)',
      }}
    >
      {/* Botonera de paginación centrada */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
        {/* Botón Primera Página */}
        <button
          onClick={() => handlerCambio(1)}
          disabled={paginaActual <= 1}
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid var(--borde-input)',
            backgroundColor: paginaActual <= 1 ? 'rgba(0,0,0,0.03)' : 'var(--bg-tarjeta)',
            color: paginaActual <= 1 ? 'var(--texto-mutado)' : 'var(--texto-principal)',
            cursor: paginaActual <= 1 ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '0.82rem',
            transition: 'all 0.15s ease',
          }}
          title="Primera página"
        >
          ««
        </button>

        {/* Botón Anterior */}
        <button
          onClick={() => handlerCambio(paginaActual - 1)}
          disabled={paginaActual <= 1}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--borde-input)',
            backgroundColor: paginaActual <= 1 ? 'rgba(0,0,0,0.03)' : 'var(--bg-tarjeta)',
            color: paginaActual <= 1 ? 'var(--texto-mutado)' : 'var(--texto-principal)',
            cursor: paginaActual <= 1 ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '0.82rem',
            transition: 'all 0.15s ease',
          }}
        >
          Anterior
        </button>

        {/* Números de página */}
        {paginasVisibles.map((p) => {
          const esActiva = p === paginaActual;
          return (
            <button
              key={p}
              onClick={() => handlerCambio(p)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: esActiva ? '1px solid var(--azul-oscuro)' : '1px solid var(--borde-input)',
                backgroundColor: esActiva ? 'var(--azul-oscuro)' : 'var(--bg-tarjeta)',
                color: esActiva ? '#ffffff' : 'var(--texto-principal)',
                cursor: esActiva ? 'default' : 'pointer',
                fontWeight: esActiva ? '700' : '500',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Botón Siguiente */}
        <button
          onClick={() => handlerCambio(paginaActual + 1)}
          disabled={paginaActual >= totalPaginas}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--borde-input)',
            backgroundColor: paginaActual >= totalPaginas ? 'rgba(0,0,0,0.03)' : 'var(--bg-tarjeta)',
            color: paginaActual >= totalPaginas ? 'var(--texto-mutado)' : 'var(--texto-principal)',
            cursor: paginaActual >= totalPaginas ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '0.82rem',
            transition: 'all 0.15s ease',
          }}
        >
          Siguiente
        </button>

        {/* Botón Última Página */}
        <button
          onClick={() => handlerCambio(totalPaginas)}
          disabled={paginaActual >= totalPaginas}
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid var(--borde-input)',
            backgroundColor: paginaActual >= totalPaginas ? 'rgba(0,0,0,0.03)' : 'var(--bg-tarjeta)',
            color: paginaActual >= totalPaginas ? 'var(--texto-mutado)' : 'var(--texto-principal)',
            cursor: paginaActual >= totalPaginas ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '0.82rem',
            transition: 'all 0.15s ease',
          }}
          title="Última página"
        >
          »»
        </button>
      </div>
    </div>
  );
};
