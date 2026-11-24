import { useState, useMemo } from 'react';
import type { Bicicleta, Reparacion, NuevaReparacionData } from '../types';
import { SearchableSelect, type SearchableOption } from '../../../components/SearchableSelect';

type FiltroBusquedaBici = 'todos' | 'bicicleta' | 'cliente';

interface ModalAltaReparacionProps {
  mostrar: boolean;
  onCerrar: () => void;
  nuevaReparacion: NuevaReparacionData;
  setNuevaReparacion: React.Dispatch<React.SetStateAction<NuevaReparacionData>>;
  bicicletas: Bicicleta[];
  guardando: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

/** Modal de ingreso de una nueva orden de servicio al taller. */
export function ModalAltaReparacion({
  mostrar,
  onCerrar,
  nuevaReparacion,
  setNuevaReparacion,
  bicicletas,
  guardando,
  onSubmit
}: ModalAltaReparacionProps) {
  const [filtroPor, setFiltroPor] = useState<FiltroBusquedaBici>('todos');

  const opcionesBicicletas: SearchableOption[] = useMemo(() => {
    return bicicletas.map(b => {
      const idStr = String(b.id_bicicleta || '');
      const textoBici = `#${idStr} ${idStr} ${b.marca || ''} ${b.modelo || ''}`;
      const textoCliente = `${b.nombre || ''} ${b.apellido || ''} ${b.apellido || ''} ${b.nombre || ''} ${b.dni || ''}`;
      const searchText =
        filtroPor === 'bicicleta'
          ? textoBici
          : filtroPor === 'cliente'
          ? textoCliente
          : `${textoBici} ${textoCliente}`;

      return {
        value: b.id_bicicleta || 0,
        label: `#${idStr} — ${b.marca} ${b.modelo || ''}`.trim(),
        sublabel: b.nombre ? `Cliente: ${b.apellido}, ${b.nombre}${b.dni ? ` • DNI ${b.dni}` : ''}` : undefined,
        searchText
      };
    });
  }, [bicicletas, filtroPor]);

  if (!mostrar) return null;

  const handleClose = () => {
    if (nuevaReparacion.id_bicicleta !== 0 || nuevaReparacion.descripcion.trim() || nuevaReparacion.costo_mano_obra) {
      if (!window.confirm('Hay datos de la orden sin guardar. ¿Deseas salir?')) return;
    }
    setFiltroPor('todos');
    onCerrar();
  };

  const placeholderBusqueda =
    filtroPor === 'bicicleta'
      ? 'Escribí marca, modelo o #ID de bicicleta...'
      : filtroPor === 'cliente'
      ? 'Escribí nombre, apellido o DNI del cliente...'
      : 'Buscar y seleccionar bicicleta o cliente...';

  return (
    <div
      onClick={e => e.target === e.currentTarget && handleClose()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', width: 'min(540px, 94vw)', padding: '28px',
        borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', color: 'var(--texto-principal)',
        maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Registrar Orden de Taller</h3>
          <button type="button" onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-mutado)' }}>✕</button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Bicicleta a Reparar *</label>

              {/* Filtros de búsqueda: Todos / Bicicleta / Cliente */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {([
                  { id: 'todos', label: 'Todos' },
                  { id: 'bicicleta', label: 'Bicicleta' },
                  { id: 'cliente', label: 'Cliente' }
                ] as const).map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroPor(f.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: filtroPor === f.id ? 'none' : '1px solid var(--borde-input)',
                      backgroundColor: filtroPor === f.id ? 'var(--azul-oscuro)' : 'var(--bg-principal)',
                      color: filtroPor === f.id ? '#ffffff' : 'var(--texto-mutado)'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <SearchableSelect
              options={opcionesBicicletas}
              value={nuevaReparacion.id_bicicleta}
              onChange={val => setNuevaReparacion({ ...nuevaReparacion, id_bicicleta: Number(val) || 0 })}
              placeholder={placeholderBusqueda}
              emptyMessage="No se encontraron bicicletas con ese criterio."
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Descripción del Trabajo / Falla *</label>
              <span style={{ fontSize: '0.72rem', color: nuevaReparacion.descripcion.length >= 250 ? '#ef4444' : 'var(--texto-mutado)' }}>
                {nuevaReparacion.descripcion.length}/250
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={250}
              placeholder="Ej: Cambio de cámara y cubierta, regulación de cambios Shimano, centrado de llanta..."
              value={nuevaReparacion.descripcion}
              onChange={e => setNuevaReparacion({ ...nuevaReparacion, descripcion: e.target.value.slice(0, 250) })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', resize: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Estado Inicial</label>
              <select
                value={nuevaReparacion.estado}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNuevaReparacion({ ...nuevaReparacion, estado: e.target.value as Reparacion['estado'] })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)' }}
              >
                <option value="Recibida">Recibida</option>
                <option value="En Reparación">En Reparación</option>
                <option value="Lista">Lista</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Costo Mano de Obra ($) *</label>
              <input
                type="number"
                step="any"
                min="0"
                max="99999999.99"
                placeholder="0.00"
                value={nuevaReparacion.costo_mano_obra}
                onChange={e => setNuevaReparacion({ ...nuevaReparacion, costo_mano_obra: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.9rem', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button type="button" onClick={handleClose} style={{ flex: 1, padding: '12px', border: '1px solid var(--borde-input)', borderRadius: '10px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}>Cancelar</button>
            <button type="submit" disabled={guardando} style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: 'var(--azul-oscuro)', color: '#fff', fontWeight: '600', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1 }}>
              {guardando ? 'Ingresando...' : 'Ingresar al Taller'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
