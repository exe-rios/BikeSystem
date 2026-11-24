import { useState, useRef, useEffect, useMemo } from 'react';

export interface SearchableOption {
  value: number | string;
  label: string;
  sublabel?: string;
  badge?: string;
  searchText: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: number | string;
  onChange: (value: number | string) => void;
  placeholder?: string;
  emptyMessage?: string;
  backgroundColor?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  maxVisible?: number;
}

/** Selector desplegable con barra de búsqueda integrada y navegación por teclado. */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Buscar y seleccionar...',
  emptyMessage = 'No se encontraron coincidencias.',
  backgroundColor = 'var(--bg-principal)',
  inputRef,
  maxVisible = 80
}: SearchableSelectProps) {
  const [abierto, setAbierto] = useState(false);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [indiceActivo, setIndiceActivo] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const refInput = inputRef || internalInputRef;

  const opcionSeleccionada = useMemo(
    () => options.find(o => String(o.value) === String(value) && String(value) !== '' && String(value) !== '0'),
    [options, value]
  );

  const opcionesFiltradas = useMemo(() => {
    const q = textoBusqueda.trim().toLowerCase();
    if (!q) return options;
    const terminos = q.split(/\s+/).filter(Boolean);
    return options.filter(o => {
      const hay = o.searchText.toLowerCase();
      return terminos.every(t => hay.includes(t));
    });
  }, [options, textoBusqueda]);

  const opcionesVisibles = useMemo(
    () => opcionesFiltradas.slice(0, maxVisible),
    [opcionesFiltradas, maxVisible]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setTextoBusqueda('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const el = optionRefs.current[indiceActivo];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [indiceActivo, abierto]);

  const seleccionarOpcion = (opt: SearchableOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setAbierto(false);
    setTextoBusqueda('');
  };

  const handleLimpiar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTextoBusqueda('');
    onChange(typeof value === 'number' ? 0 : '');
    setAbierto(true);
    setIndiceActivo(0);
    refInput.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!abierto && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      setAbierto(true);
      setIndiceActivo(0);
      return;
    }
    if (!abierto) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceActivo(prev => Math.min(prev + 1, Math.max(0, opcionesVisibles.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceActivo(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = opcionesVisibles[indiceActivo];
      if (target && !target.disabled) {
        seleccionarOpcion(target);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAbierto(false);
      setTextoBusqueda('');
    }
  };

  const valorInput = abierto ? textoBusqueda : (opcionSeleccionada?.label || '');
  const mostrarBotonLimpiar = Boolean(textoBusqueda || opcionSeleccionada);

  return (
    <div ref={contenedorRef} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          borderRadius: '8px',
          border: `1px solid ${abierto ? 'var(--azul-oscuro)' : 'var(--borde-input)'}`,
          backgroundColor,
          boxSizing: 'border-box',
          transition: 'border-color 0.15s ease'
        }}
      >
        <input
          ref={refInput}
          type="text"
          value={valorInput}
          placeholder={abierto && opcionSeleccionada ? opcionSeleccionada.label : placeholder}
          onFocus={() => {
            setAbierto(true);
            setIndiceActivo(0);
          }}
          onChange={e => {
            setTextoBusqueda(e.target.value);
            if (!abierto) setAbierto(true);
            setIndiceActivo(0);
          }}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            width: '100%',
            minWidth: 0,
            padding: '9px 12px',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            color: 'var(--texto-principal)',
            fontSize: '0.88rem',
            fontWeight: !abierto && opcionSeleccionada ? '600' : '400',
            textOverflow: 'ellipsis'
          }}
        />

        {mostrarBotonLimpiar && (
          <button
            type="button"
            onClick={handleLimpiar}
            title="Limpiar selección"
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 6px',
              cursor: 'pointer',
              color: 'var(--texto-mutado)',
              fontSize: '0.82rem',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        )}

        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (abierto) {
              setAbierto(false);
              setTextoBusqueda('');
            } else {
              setAbierto(true);
              setIndiceActivo(0);
              refInput.current?.focus();
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px 10px 6px 4px',
            cursor: 'pointer',
            color: 'var(--texto-mutado)',
            fontSize: '0.72rem',
            lineHeight: 1
          }}
        >
          {abierto ? '▲' : '▼'}
        </button>
      </div>

      {abierto && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1300,
            backgroundColor: 'var(--bg-tarjeta)',
            border: '1px solid var(--borde-input)',
            borderRadius: '10px',
            boxShadow: '0 12px 24px -6px rgba(15, 23, 42, 0.16)',
            maxHeight: '240px',
            overflowY: 'auto'
          }}
        >
          <div
            style={{
              padding: '5px 12px',
              fontSize: '0.72rem',
              fontWeight: '600',
              color: 'var(--texto-mutado)',
              backgroundColor: 'var(--bg-principal)',
              borderBottom: '1px solid var(--borde-input)',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <span>
              {opcionesFiltradas.length} resultado{opcionesFiltradas.length === 1 ? '' : 's'}
              {opcionesFiltradas.length > maxVisible ? ` (mostrando primeros ${maxVisible})` : ''}
            </span>
            <span>Enter para elegir</span>
          </div>

          {opcionesVisibles.length === 0 ? (
            <div style={{ padding: '14px 12px', fontSize: '0.84rem', color: 'var(--texto-mutado)', textAlign: 'center' }}>
              {emptyMessage}
            </div>
          ) : (
            opcionesVisibles.map((opt, idx) => {
              const esSeleccionada = String(opt.value) === String(value);
              const esResaltada = idx === indiceActivo;
              return (
                <div
                  key={String(opt.value)}
                  ref={el => { optionRefs.current[idx] = el; }}
                  onMouseDown={e => {
                    e.preventDefault();
                    seleccionarOpcion(opt);
                  }}
                  onMouseEnter={() => setIndiceActivo(idx)}
                  style={{
                    padding: '8px 12px',
                    cursor: opt.disabled ? 'not-allowed' : 'pointer',
                    opacity: opt.disabled ? 0.5 : 1,
                    backgroundColor: esSeleccionada
                      ? 'var(--azul-oscuro)'
                      : esResaltada
                      ? 'var(--bg-principal)'
                      : 'var(--bg-tarjeta)',
                    color: esSeleccionada ? '#ffffff' : 'var(--texto-principal)',
                    borderBottom: '1px solid var(--borde-input)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {opt.label}
                    </div>
                    {opt.sublabel && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: esSeleccionada ? 'rgba(255,255,255,0.78)' : 'var(--texto-mutado)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: '1px'
                      }}>
                        {opt.sublabel}
                      </div>
                    )}
                  </div>
                  {opt.badge && (
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      backgroundColor: esSeleccionada ? 'rgba(255,255,255,0.18)' : 'var(--bg-principal)',
                      border: esSeleccionada ? 'none' : '1px solid var(--borde-input)',
                      color: esSeleccionada ? '#ffffff' : 'var(--texto-principal)'
                    }}>
                      {opt.badge}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
