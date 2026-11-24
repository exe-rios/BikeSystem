import { useState, useMemo } from 'react';
import type { Proveedor, CotizacionDolarInfo, AumentoMasivoResponse } from '../../../types';
import { usePermisos } from '../../../hooks/usePermisos';
import { formatearMoneda } from '../../../utils/formatters';

interface TabProveedoresCotizacionesProps {
  proveedores: Proveedor[];
  cotizacionInfo: CotizacionDolarInfo;
  onGuardarDolarBase: (nuevaCotizacion: number) => Promise<{ productos_actualizados: number; cotizacion_dolar: number }>;
  onGuardarDolarProveedor: (
    idProveedor: number,
    nuevaCotizacion: number | null
  ) => Promise<{ productos_actualizados: number; cotizacion_efectiva: number; nombre_empresa: string }>;
  onCrearProveedor: (datos: {
    nombre_empresa: string;
    cotizacion_dolar?: number | null;
    cuit?: string;
    telefono?: string;
  }) => Promise<void>;
  onAplicarAumentoDirecto: (idProveedor: number, porcentaje: number) => Promise<AumentoMasivoResponse>;
  onAbrirAumento: (idProveedor: number, porcentajeInicial: string) => void;
  onAbrirCargaMasiva: (idProveedor: number) => void;
  onAbrirPago: (idProveedor: number) => void;
  onVerProductos: (idProveedor: number) => void;
}

/** Pestaña fija para administrar cotizaciones de dólar, aumentos porcentuales al costo y altas de proveedores. */
export function TabProveedoresCotizaciones({
  proveedores,
  cotizacionInfo,
  onGuardarDolarBase,
  onGuardarDolarProveedor,
  onCrearProveedor,
  onAplicarAumentoDirecto,
  onAbrirAumento,
  onAbrirCargaMasiva,
  onAbrirPago,
  onVerProductos
}: TabProveedoresCotizacionesProps) {
  const { puedeConfigurarDolar, puedeAumentoMasivo, puedeCargaMasiva, puedeGestionarProveedores } = usePermisos();

  const [busqueda, setBusqueda] = useState('');
  const [dolarBaseInput, setDolarBaseInput] = useState<string | null>(null);
  const [guardandoBase, setGuardandoBase] = useState(false);

  const [dolaresEditados, setDolaresEditados] = useState<Record<number, string>>({});
  const [porcentajesEditados, setPorcentajesEditados] = useState<Record<number, string>>({});
  const [guardandoProvId, setGuardandoProvId] = useState<number | null>(null);
  const [aplicandoAumentoId, setAplicandoAumentoId] = useState<number | null>(null);

  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [dolarNuevo, setDolarNuevo] = useState('');
  const [cuitNuevo, setCuitNuevo] = useState('');
  const [telefonoNuevo, setTelefonoNuevo] = useState('');
  const [creandoNuevo, setCreandoNuevo] = useState(false);

  const [feedback, setFeedback] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const proveedoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = q
      ? proveedores.filter(
          p =>
            p.nombre_empresa.toLowerCase().includes(q) ||
            (p.cuit || '').toLowerCase().includes(q) ||
            (p.telefono || '').toLowerCase().includes(q)
        )
      : proveedores;

    return [...lista].sort((a, b) => a.nombre_empresa.localeCompare(b.nombre_empresa));
  }, [proveedores, busqueda]);

  const valorBaseMostrado = dolarBaseInput !== null ? dolarBaseInput : String(cotizacionInfo.cotizacion_dolar || '');

  const handleGuardarBase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const num = Number(valorBaseMostrado);
    if (isNaN(num) || num <= 0) {
      setFeedback({ tipo: 'error', texto: 'Ingresá una cotización base válida mayor a 0.' });
      return;
    }
    setGuardandoBase(true);
    try {
      const res = await onGuardarDolarBase(num);
      setDolarBaseInput(null);
      setFeedback({
        tipo: 'exito',
        texto: `Cotización base actualizada a ${formatearMoneda(res.cotizacion_dolar)}. Se recalcularon ${res.productos_actualizados} producto(s) sin dólar propio de proveedor.`
      });
    } catch (err: unknown) {
      setFeedback({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo actualizar la cotización base.' });
    } finally {
      setGuardandoBase(false);
    }
  };

  const handleGuardarDolarFila = async (prov: Proveedor) => {
    if (!prov.id_proveedor) return;
    setFeedback(null);
    const id = prov.id_proveedor;
    const raw = id in dolaresEditados ? dolaresEditados[id] : (prov.cotizacion_dolar ? String(prov.cotizacion_dolar) : '');
    const limpio = raw.trim();

    let valorEnviar: number | null = null;
    if (limpio !== '') {
      const num = Number(limpio);
      if (isNaN(num) || num <= 0) {
        setFeedback({ tipo: 'error', texto: `La cotización de "${prov.nombre_empresa}" debe ser mayor a 0 (o dejala vacía para usar la cotización base).` });
        return;
      }
      valorEnviar = num;
    }

    setGuardandoProvId(id);
    try {
      const res = await onGuardarDolarProveedor(id, valorEnviar);
      setDolaresEditados(prev => {
        const copia = { ...prev };
        delete copia[id];
        return copia;
      });
      setFeedback({
        tipo: 'exito',
        texto: `Dólar de "${res.nombre_empresa}" actualizado a ${formatearMoneda(res.cotizacion_efectiva)}. Se recalcularon ${res.productos_actualizados} producto(s) en USD.`
      });
    } catch (err: unknown) {
      setFeedback({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error al actualizar el dólar del proveedor.' });
    } finally {
      setGuardandoProvId(null);
    }
  };

  const handleAplicarAumentoFila = async (prov: Proveedor, pctStr: string) => {
    if (!prov.id_proveedor) return;
    setFeedback(null);
    const pctNum = Number(pctStr);
    if (isNaN(pctNum) || pctNum === 0 || pctNum <= -100) {
      setFeedback({ tipo: 'error', texto: `Ingresá un porcentaje válido para "${prov.nombre_empresa}".` });
      return;
    }

    const accionTxt = pctNum > 0 ? `aumentar un +${pctNum}%` : `descontar un ${pctNum}%`;
    if (
      !window.confirm(
        `¿Confirmás ${accionTxt} el precio de costo de todos los productos de "${prov.nombre_empresa}"?\n\n` +
          `Se recalcularán sus precios de venta manteniendo el % de ganancia y el dólar propio del proveedor.`
      )
    ) {
      return;
    }

    setAplicandoAumentoId(prov.id_proveedor);
    try {
      const res = await onAplicarAumentoDirecto(prov.id_proveedor, pctNum);
      setFeedback({
        tipo: 'exito',
        texto: `Costo actualizado (${pctNum > 0 ? `+${pctNum}%` : `${pctNum}%`}) en ${res.total_afectados} producto(s) de "${res.proveedor.nombre_empresa}" y precios de venta recalculados.`
      });
    } catch (err: unknown) {
      setFeedback({ tipo: 'error', texto: err instanceof Error ? err.message : 'Error al aplicar aumento al proveedor.' });
    } finally {
      setAplicandoAumentoId(null);
    }
  };

  const handleCrearNuevoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (nombreNuevo.trim().length < 2) {
      setFeedback({ tipo: 'error', texto: 'Ingresá el nombre de la empresa (al menos 2 letras).' });
      return;
    }
    const dolarNum = dolarNuevo.trim() !== '' ? Number(dolarNuevo) : null;
    if (dolarNum !== null && (isNaN(dolarNum) || dolarNum <= 0)) {
      setFeedback({ tipo: 'error', texto: 'La cotización inicial del dólar debe ser mayor a 0.' });
      return;
    }

    setCreandoNuevo(true);
    try {
      await onCrearProveedor({
        nombre_empresa: nombreNuevo.trim(),
        cotizacion_dolar: dolarNum,
        cuit: cuitNuevo.trim() || undefined,
        telefono: telefonoNuevo.trim() || undefined
      });
      setNombreNuevo('');
      setDolarNuevo('');
      setCuitNuevo('');
      setTelefonoNuevo('');
      setMostrarNuevo(false);
      setFeedback({ tipo: 'exito', texto: 'Proveedor creado correctamente y disponible para asignar productos.' });
    } catch (err: unknown) {
      setFeedback({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo crear el proveedor.' });
    } finally {
      setCreandoNuevo(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Barra superior: Buscador + Cotización Base + Alta rápida */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)',
        border: '1px solid var(--borde-input)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ flex: '1 1 260px', maxWidth: '380px' }}>
          <input
            type="text"
            placeholder="Buscar proveedor por nombre, CUIT o teléfono..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--borde-input)',
              backgroundColor: 'var(--bg-principal)',
              color: 'var(--texto-principal)',
              fontSize: '0.88rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Cotización Base por defecto */}
          <form onSubmit={handleGuardarBase} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-principal)',
            border: '1px solid var(--borde-input)',
            borderRadius: '8px',
            padding: '5px 8px 5px 12px'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--texto-mutado)' }}>
              Dólar Base (por defecto): $
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              disabled={!puedeConfigurarDolar || guardandoBase}
              value={valorBaseMostrado}
              onChange={e => setDolarBaseInput(e.target.value)}
              style={{
                width: '92px',
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--borde-input)',
                backgroundColor: 'var(--bg-tarjeta)',
                color: 'var(--texto-principal)',
                fontWeight: '700',
                fontSize: '0.85rem',
                textAlign: 'right'
              }}
            />
            {puedeConfigurarDolar && (
              <button
                type="submit"
                disabled={guardandoBase}
                style={{
                  backgroundColor: 'var(--azul-oscuro)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: guardandoBase ? 'not-allowed' : 'pointer',
                  opacity: guardandoBase ? 0.7 : 1
                }}
              >
                {guardandoBase ? 'Guardando...' : 'Guardar Base'}
              </button>
            )}
          </form>

          {puedeGestionarProveedores && (
            <button
              type="button"
              onClick={() => setMostrarNuevo(v => !v)}
              style={{
                backgroundColor: mostrarNuevo ? 'var(--bg-principal)' : 'var(--azul-oscuro)',
                color: mostrarNuevo ? 'var(--texto-principal)' : '#ffffff',
                border: mostrarNuevo ? '1px solid var(--borde-input)' : 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              {mostrarNuevo ? 'Cerrar Formulario' : '+ Nuevo Proveedor'}
            </button>
          )}
        </div>
      </div>

      {/* Formulario desplegable en línea para crear proveedor */}
      {mostrarNuevo && puedeGestionarProveedores && (
        <form
          onSubmit={handleCrearNuevoSubmit}
          style={{
            backgroundColor: 'var(--bg-tarjeta)',
            border: '1px solid var(--azul-oscuro)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
            gap: '12px',
            alignItems: 'end'
          }}
        >
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem', fontWeight: '700' }}>
              Nombre de Empresa / Marca *
            </label>
            <input
              type="text"
              maxLength={70}
              value={nombreNuevo}
              onChange={e => setNombreNuevo(e.target.value)}
              placeholder="Ej: PERETTI, SHIMANO AR..."
              required
              style={{
                width: '100%', padding: '9px 10px', borderRadius: '8px',
                border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)', fontSize: '0.86rem', boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem', fontWeight: '700' }}>
              Dólar Propio ($ ARS)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={dolarNuevo}
              onChange={e => setDolarNuevo(e.target.value)}
              placeholder="Usa base"
              style={{
                width: '100%', padding: '9px 10px', borderRadius: '8px',
                border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)', fontSize: '0.86rem', boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem', fontWeight: '700' }}>
              CUIT
            </label>
            <input
              type="text"
              maxLength={20}
              value={cuitNuevo}
              onChange={e => setCuitNuevo(e.target.value)}
              placeholder="Opcional"
              style={{
                width: '100%', padding: '9px 10px', borderRadius: '8px',
                border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)', fontSize: '0.86rem', boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.78rem', fontWeight: '700' }}>
              Teléfono
            </label>
            <input
              type="text"
              maxLength={20}
              value={telefonoNuevo}
              onChange={e => setTelefonoNuevo(e.target.value)}
              placeholder="Opcional"
              style={{
                width: '100%', padding: '9px 10px', borderRadius: '8px',
                border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)',
                color: 'var(--texto-principal)', fontSize: '0.86rem', boxSizing: 'border-box'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={creandoNuevo}
            style={{
              backgroundColor: 'var(--azul-oscuro)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: creandoNuevo ? 'not-allowed' : 'pointer',
              height: '38px'
            }}
          >
            {creandoNuevo ? 'Creando...' : 'Crear Proveedor'}
          </button>
        </form>
      )}

      {/* Feedback en línea */}
      {feedback && (
        <div style={{
          padding: '11px 16px',
          borderRadius: '10px',
          fontSize: '0.86rem',
          fontWeight: '600',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: feedback.tipo === 'exito' ? 'var(--bg-tarjeta)' : 'rgba(239, 68, 68, 0.08)',
          border: feedback.tipo === 'exito' ? '1px solid var(--azul-oscuro)' : '1px solid #fecaca',
          color: feedback.tipo === 'exito' ? 'var(--texto-principal)' : '#dc2626'
        }}>
          <span>{feedback.texto}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: '700' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabla principal de Proveedores, Cotizaciones y Precios */}
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)',
        border: '1px solid var(--borde-input)',
        borderRadius: '12px',
        overflowX: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-principal)', borderBottom: '1px solid var(--borde-input)' }}>
              <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
                Proveedor
              </th>
              <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'center' }}>
                Artículos en Catálogo
              </th>
              <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
                Cotización Dólar ($ ARS)
              </th>
              <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase' }}>
                Aumento / Ajuste % Costo
              </th>
              <th style={{ padding: '12px 16px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--texto-mutado)', textTransform: 'uppercase', textAlign: 'right' }}>
                Acciones Rápidas
              </th>
            </tr>
          </thead>
          <tbody>
            {proveedoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-mutado)', fontSize: '0.9rem' }}>
                  No se encontraron proveedores para esa búsqueda.
                </td>
              </tr>
            ) : (
              proveedoresFiltrados.map(prov => {
                const id = prov.id_proveedor || 0;
                const dolarInput = id in dolaresEditados
                  ? dolaresEditados[id]
                  : (prov.cotizacion_dolar ? String(prov.cotizacion_dolar) : '');
                const pctInput = id in porcentajesEditados ? porcentajesEditados[id] : '2';
                const guardandoEste = guardandoProvId === id;
                const aplicandoAumentoEste = aplicandoAumentoId === id;
                const cantTotal = prov.productos_count ?? 0;
                const cantUsd = prov.productos_usd_count ?? 0;

                return (
                  <tr key={id} style={{ borderBottom: '1px solid var(--borde-input)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.94rem', color: 'var(--texto-principal)' }}>
                        {prov.nombre_empresa}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--texto-mutado)', marginTop: '2px' }}>
                        ID #{id}
                        {prov.cuit ? ` • CUIT ${prov.cuit}` : ''}
                        {prov.telefono ? ` • Tel ${prov.telefono}` : ''}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--texto-principal)' }}>
                        {cantTotal} artículo{cantTotal === 1 ? '' : 's'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--texto-mutado)' }}>
                        {cantUsd} en USD
                      </div>
                      {cantTotal > 0 && (
                        <button
                          type="button"
                          onClick={() => onVerProductos(id)}
                          style={{
                            marginTop: '4px',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            border: '1px solid var(--borde-input)',
                            backgroundColor: 'var(--bg-principal)',
                            color: 'var(--texto-principal)',
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Ver productos
                        </button>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!puedeConfigurarDolar || guardandoEste}
                          value={dolarInput}
                          placeholder={`Base ($${cotizacionInfo.cotizacion_dolar})`}
                          onChange={e => setDolaresEditados(prev => ({ ...prev, [id]: e.target.value }))}
                          style={{
                            width: '125px',
                            padding: '7px 10px',
                            borderRadius: '7px',
                            border: '1px solid var(--borde-input)',
                            backgroundColor: 'var(--bg-principal)',
                            color: 'var(--texto-principal)',
                            fontWeight: '700',
                            fontSize: '0.86rem'
                          }}
                        />
                        {puedeConfigurarDolar && (
                          <button
                            type="button"
                            disabled={guardandoEste}
                            onClick={() => handleGuardarDolarFila(prov)}
                            style={{
                              backgroundColor: 'var(--azul-oscuro)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '7px 12px',
                              borderRadius: '7px',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: guardandoEste ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {guardandoEste ? 'Recalculando...' : 'Guardar Dólar'}
                          </button>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {puedeAumentoMasivo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <input
                            type="number"
                            step="0.5"
                            disabled={aplicandoAumentoEste}
                            value={pctInput}
                            onChange={e => setPorcentajesEditados(prev => ({ ...prev, [id]: e.target.value }))}
                            style={{
                              width: '66px',
                              padding: '7px 8px',
                              borderRadius: '7px',
                              border: '1px solid var(--borde-input)',
                              backgroundColor: 'var(--bg-principal)',
                              color: 'var(--texto-principal)',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              textAlign: 'right'
                            }}
                          />
                          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--texto-mutado)' }}>%</span>
                          <button
                            type="button"
                            disabled={aplicandoAumentoEste}
                            onClick={() => handleAplicarAumentoFila(prov, pctInput)}
                            style={{
                              backgroundColor: 'var(--azul-oscuro)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '7px 11px',
                              borderRadius: '7px',
                              fontSize: '0.77rem',
                              fontWeight: '700',
                              cursor: aplicandoAumentoEste ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {aplicandoAumentoEste ? 'Aplicando...' : 'Aplicar % Costo'}
                          </button>
                          <button
                            type="button"
                            disabled={aplicandoAumentoEste}
                            onClick={() => onAbrirAumento(id, pctInput)}
                            title="Abrir calculadora con vista previa y filtros por rubro"
                            style={{
                              backgroundColor: 'var(--bg-tarjeta)',
                              color: 'var(--texto-principal)',
                              border: '1px solid var(--borde-input)',
                              padding: '7px 10px',
                              borderRadius: '7px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Previsualizar
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--texto-mutado)' }}>Solo administrador</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {puedeCargaMasiva && (
                          <button
                            type="button"
                            onClick={() => onAbrirCargaMasiva(id)}
                            style={{
                              backgroundColor: 'var(--azul-oscuro)',
                              color: '#ffffff',
                              border: 'none',
                              padding: '7px 12px',
                              borderRadius: '7px',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Cargar Lista
                          </button>
                        )}
                        {puedeGestionarProveedores && (
                          <button
                            type="button"
                            onClick={() => onAbrirPago(id)}
                            style={{
                              backgroundColor: 'var(--bg-tarjeta)',
                              color: 'var(--texto-principal)',
                              border: '1px solid var(--borde-input)',
                              padding: '7px 12px',
                              borderRadius: '7px',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Declarar Pago
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
