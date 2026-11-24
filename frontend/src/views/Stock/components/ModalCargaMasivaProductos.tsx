import { useState, useEffect } from 'react';
import type { Proveedor, MetodoPago, ItemCargaMasivaInput, CotizacionProveedorInput, PreviewCargaMasivaResponse } from '../../../types';
import { api } from '../../../services/api';
import { formatearMoneda } from '../../../utils/formatters';
import { parsearArchivoProductos, descargarPlantillaImportacion } from '../utils/importadorArchivo';

interface ModalCargaMasivaProductosProps {
  proveedores: Proveedor[];
  cotizacionDolar: number;
  proveedorInicial?: string;
  onSuccess: () => Promise<void> | void;
  onClose: () => void;
}

/** Modal de carga masiva multi-formato (.xlsx, .csv, .pdf) con vista previa editable y declaración de pago. */
export function ModalCargaMasivaProductos({
  proveedores,
  cotizacionDolar,
  proveedorInicial,
  onSuccess,
  onClose
}: ModalCargaMasivaProductosProps) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [nombreProveedor, setNombreProveedor] = useState<string>(() => {
    const provEncontrado = proveedores.find(p => String(p.id_proveedor) === String(proveedorInicial));
    return provEncontrado?.nombre_empresa || '';
  });
  const [monedaLote, setMonedaLote] = useState<'ARS' | 'USD'>('ARS');
  const [modoStock, setModoStock] = useState<'sumar' | 'reemplazar'>('sumar');
  const [stockDefault, setStockDefault] = useState<string>('0');
  const [archivoNombre, setArchivoNombre] = useState<string>('');
  const [formatoOrigen, setFormatoOrigen] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx');
  const [advertencias, setAdvertencias] = useState<string[]>([]);

  const [itemsEditables, setItemsEditables] = useState<ItemCargaMasivaInput[]>([]);
  const [revPctInputs, setRevPctInputs] = useState<Record<number, string>>({});
  const [cotizacionesProveedores, setCotizacionesProveedores] = useState<CotizacionProveedorInput[]>([]);
  const [preview, setPreview] = useState<PreviewCargaMasivaResponse | null>(null);
  const [filtroPreview, setFiltroPreview] = useState<string>('');
  const [paginaPreview, setPaginaPreview] = useState<number>(1);
  const limitePreview = 25;
  const [porcentajeGananciaLote, setPorcentajeGananciaLote] = useState<string>('');
  const [porcentajeReventaLote, setPorcentajeReventaLote] = useState<string>('');

  // Pago opcional al proveedor (total, parcial o agendado)
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [registrarPago, setRegistrarPago] = useState<boolean>(false);
  const [idMetodoPago, setIdMetodoPago] = useState<number>(1);
  const [monedaPago, setMonedaPago] = useState<'ARS' | 'USD'>('ARS');
  const [montoFacturaTotal, setMontoFacturaTotal] = useState<string>('');
  const [montoPago, setMontoPago] = useState<string>('');
  const [numeroFactura, setNumeroFactura] = useState<string>('');
  const [fechaFactura, setFechaFactura] = useState<string>('');
  const [fechaProximoPago, setFechaProximoPago] = useState<string>('');
  const [observacionesPago, setObservacionesPago] = useState<string>('');

  const [procesando, setProcesando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    api.pagosProveedores.getMetodosPago()
      .then(m => {
        if (activo && Array.isArray(m) && m.length > 0) {
          setMetodosPago(m);
          setIdMetodoPago(m[0].id_metodo_pago);
        }
      })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  const resolverProveedorId = (): { id_proveedor?: number; nombre_proveedor?: string } => {
    const limpio = nombreProveedor.trim();
    if (!limpio) return {};
    const existente = proveedores.find(p => p.nombre_empresa.trim().toLowerCase() === limpio.toLowerCase());
    if (existente?.id_proveedor) {
      return { id_proveedor: existente.id_proveedor, nombre_proveedor: existente.nombre_empresa };
    }
    return { nombre_proveedor: limpio };
  };

  const ejecutarPreviewBackend = async (
    items: ItemCargaMasivaInput[],
    cots: CotizacionProveedorInput[] = cotizacionesProveedores,
    proveedorOverride?: string
  ) => {
    const limpio = (proveedorOverride ?? nombreProveedor).trim();
    let provPayload: { id_proveedor?: number; nombre_proveedor?: string } = {};
    if (limpio) {
      const existente = proveedores.find(p => p.nombre_empresa.trim().toLowerCase() === limpio.toLowerCase());
      provPayload = existente?.id_proveedor
        ? { id_proveedor: existente.id_proveedor, nombre_proveedor: existente.nombre_empresa }
        : { nombre_proveedor: limpio };
    }
    const res = await api.productos.previsualizarCargaMasiva({
      ...provPayload,
      moneda_lote: monedaLote,
      modo_stock_default: modoStock,
      cotizaciones_proveedores: cots,
      items
    });
    setPreview(res);
  };

  const handleArchivoSeleccionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setProcesando(true);
    try {
      const stockFallbackNum = Math.max(0, Math.trunc(Number(stockDefault) || 0));
      const resultado = await parsearArchivoProductos(file, monedaLote, stockFallbackNum);
      setArchivoNombre(file.name);
      setFormatoOrigen(resultado.formato);
      setAdvertencias(resultado.advertencias);
      setCotizacionesProveedores(resultado.cotizacionesProveedores);
      setItemsEditables(resultado.items);
      setRevPctInputs({});
      setFiltroPreview('');
      setPaginaPreview(1);
      let provUsar = nombreProveedor;
      if (!provUsar.trim() && resultado.proveedorDetectado) {
        provUsar = resultado.proveedorDetectado;
        setNombreProveedor(resultado.proveedorDetectado);
      }
      // Autocompletar datos de factura detectada del PDF (Nº, fecha, vencimiento y total)
      if (resultado.facturaDetectada) {
        const fac = resultado.facturaDetectada;
        setNumeroFactura(fac.numero || '');
        setFechaFactura(fac.fecha || '');
        if (fac.moneda) setMonedaPago(fac.moneda);
        if (fac.total && fac.total > 0) {
          const totalStr = String(fac.total);
          setMontoFacturaTotal(totalStr);
          setMontoPago(totalStr);
        } else {
          setMontoFacturaTotal('');
        }
        setFechaProximoPago(fac.fecha_vencimiento || '');
        const partesDesc: string[] = [];
        if (fac.numero) partesDesc.push(`Factura Nº ${fac.numero}`);
        if (fac.fecha) partesDesc.push(`Fecha ${fac.fecha}`);
        if (partesDesc.length > 0) {
          setObservacionesPago(partesDesc.join(' - '));
        }
      } else {
        setNumeroFactura('');
        setFechaFactura('');
        setMontoFacturaTotal('');
        setFechaProximoPago('');
      }
      await ejecutarPreviewBackend(resultado.items, resultado.cotizacionesProveedores, provUsar);
      setPaso(2);
    } catch (err: unknown) {
      console.error('[ModalCargaMasivaProductos] Error al procesar archivo:', err);
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo.');
    } finally {
      setProcesando(false);
      e.target.value = '';
    }
  };

  const handleEditarFila = <K extends keyof ItemCargaMasivaInput>(idx: number, campo: K, valor: ItemCargaMasivaInput[K]) => {
    setItemsEditables(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const actualizado = { ...it, [campo]: valor };
      if (campo === 'tipo_prod' && String(valor) === 'bicicleta' && !actualizado.genero) {
        actualizado.genero = 'unisex';
      }
      if (campo === 'precio_usd') {
        actualizado.precio = undefined;
      }
      if (campo === 'porcentaje_reventa') {
        const pct = Number(valor);
        const esUsd = String(actualizado.moneda || monedaLote).toUpperCase() === 'USD';
        const base = Number(actualizado.costo_usd || (esUsd ? (actualizado.precio_usd ?? actualizado.precio) : actualizado.precio) || 0);
        if (valor !== '' && !isNaN(pct) && pct >= 0) {
          actualizado.porcentaje_reventa = Math.round((pct / 100) * 10000) / 10000;
          if (base > 0) {
            const revCalc = Math.round(base * (1 + pct / 100) * 100) / 100;
            if (!actualizado.costo_usd) actualizado.costo_usd = base;
            if (esUsd) {
              actualizado.precio_reventa_usd = revCalc;
            } else {
              actualizado.precio_reventa = revCalc;
            }
          }
        } else {
          actualizado.porcentaje_reventa = '';
        }
      }
      return actualizado;
    }));
  };

  const handleAplicarPorcentajesRepuestos = async () => {
    const ganPct = porcentajeGananciaLote.trim() !== '' ? Number(porcentajeGananciaLote) : null;
    const revPct = porcentajeReventaLote.trim() !== '' ? Number(porcentajeReventaLote) : null;

    if (ganPct === null && revPct === null) {
      setError('Ingresá al menos un porcentaje de ganancia o de reventa para aplicar.');
      return;
    }
    if ((ganPct !== null && (isNaN(ganPct) || ganPct < 0)) || (revPct !== null && (isNaN(revPct) || revPct < 0))) {
      setError('Los porcentajes deben ser números válidos mayores o iguales a 0.');
      return;
    }

    setError(null);
    const actualizados = itemsEditables.map(it => {
      const tipo = String(it.tipo_prod || '').trim().toLowerCase();
      if (tipo !== 'repuesto' && tipo !== 'accesorio') return it;

      const esUsd = String(it.moneda || monedaLote).toUpperCase() === 'USD';
      const costoBase = Number(it.costo_usd || (esUsd ? (it.precio_usd ?? it.precio) : it.precio) || 0);
      if (costoBase <= 0) return it;

      const nuevo: ItemCargaMasivaInput = { ...it, costo_usd: costoBase };
      if (ganPct !== null) {
        const factorGan = Math.round((ganPct / 100) * 10000) / 10000;
        const ventaCalc = Math.round(costoBase * (1 + factorGan) * 100) / 100;
        nuevo.porcentaje_ganancia = factorGan;
        if (esUsd) {
          nuevo.precio_usd = ventaCalc;
          nuevo.precio = undefined;
        } else {
          nuevo.precio = ventaCalc;
        }
      }
      if (revPct !== null) {
        const factorRev = Math.round((revPct / 100) * 10000) / 10000;
        const revCalc = Math.round(costoBase * (1 + factorRev) * 100) / 100;
        nuevo.porcentaje_reventa = factorRev;
        if (esUsd) {
          nuevo.precio_reventa_usd = revCalc;
          nuevo.precio_reventa = undefined;
        } else {
          nuevo.precio_reventa = revCalc;
        }
      }
      return nuevo;
    });

    setItemsEditables(actualizados);
    setRevPctInputs({});
    setProcesando(true);
    try {
      await ejecutarPreviewBackend(actualizados);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al recalcular precios con los porcentajes.');
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminarFila = async (idx: number) => {
    const nuevos = itemsEditables.filter((_, i) => i !== idx);
    setItemsEditables(nuevos);
    setRevPctInputs({});
    if (nuevos.length > 0) {
      setProcesando(true);
      try {
        await ejecutarPreviewBackend(nuevos);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al recalcular vista previa.');
      } finally {
        setProcesando(false);
      }
    } else {
      setPaso(1);
      setPreview(null);
    }
  };

  const handleCambiarCotizacionProv = (nombreProv: string, nuevoValor: string) => {
    const num = Number(nuevoValor);
    const nuevasCots = cotizacionesProveedores.map(cp =>
      cp.nombre_proveedor === nombreProv ? { ...cp, cotizacion_dolar: isNaN(num) ? 0 : num } : cp
    );
    setCotizacionesProveedores(nuevasCots);

    if (!isNaN(num) && num > 0) {
      setItemsEditables(prev => prev.map(it => {
        if (
          it.nombre_proveedor?.trim().toLowerCase() === nombreProv.trim().toLowerCase() &&
          String(it.moneda || monedaLote).toUpperCase() === 'USD' &&
          it.precio_usd !== undefined &&
          it.precio_usd !== ''
        ) {
          return { ...it, precio: Math.round(Number(it.precio_usd) * num * 100) / 100 };
        }
        return it;
      }));
    }
  };

  const handleRevalidar = async () => {
    setError(null);
    setProcesando(true);
    try {
      await ejecutarPreviewBackend(itemsEditables, cotizacionesProveedores);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al validar las filas.');
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmar = async () => {
    setError(null);
    if (itemsEditables.length === 0) {
      setError('No hay productos para importar.');
      return;
    }

    const montoFacturaNum = Number(montoFacturaTotal) || 0;
    const montoPagadoNum = montoPago.trim() === '' ? 0 : Number(montoPago);
    const totalReferencia = montoFacturaNum > 0 ? montoFacturaNum : montoPagadoNum;
    const saldoPendienteCalc = totalReferencia > montoPagadoNum + 0.01
      ? Math.round((totalReferencia - montoPagadoNum) * 100) / 100
      : 0;

    if (registrarPago) {
      if (!nombreProveedor.trim()) {
        setError('Para declarar un pago debés indicar el proveedor del lote.');
        return;
      }
      if (isNaN(montoPagadoNum) || montoPagadoNum < 0) {
        setError('Ingresá un monto pagado válido (0 o mayor).');
        return;
      }
      if (totalReferencia <= 0) {
        setError('Ingresá el total de la factura o un monto pagado mayor a 0.');
        return;
      }
      if (montoFacturaNum > 0 && montoPagadoNum > montoFacturaNum + 0.01) {
        setError('El monto pagado ahora no puede superar el total de la factura.');
        return;
      }
      if (saldoPendienteCalc > 0 && !fechaProximoPago) {
        setError('Como queda un saldo pendiente de la factura, debés agendar la fecha del próximo pago.');
        return;
      }
    }

    const resolverCotizacionPagoProveedor = (): number => {
      const limpio = nombreProveedor.trim().toLowerCase();
      if (limpio) {
        const cotLoteProv = cotizacionesProveedores.find(
          cp => cp.nombre_proveedor.trim().toLowerCase() === limpio && Number(cp.cotizacion_dolar) > 0
        );
        if (cotLoteProv) return Number(cotLoteProv.cotizacion_dolar);
        const provDb = proveedores.find(
          p => p.nombre_empresa.trim().toLowerCase() === limpio && Number(p.cotizacion_dolar) > 0
        );
        if (provDb?.cotizacion_dolar) return Number(provDb.cotizacion_dolar);
      }
      return cotizacionDolar;
    };
    const cotizacionPagoEfectiva = resolverCotizacionPagoProveedor();

    setProcesando(true);
    try {
      const provPayload = resolverProveedorId();
      const montoArsFinal = monedaPago === 'USD'
        ? Math.round(montoPagadoNum * cotizacionPagoEfectiva * 100) / 100
        : montoPagadoNum;

      const res = await api.productos.ejecutarCargaMasiva({
        ...provPayload,
        moneda_lote: monedaLote,
        origen_formato: formatoOrigen,
        modo_stock_default: modoStock,
        cotizaciones_proveedores: cotizacionesProveedores,
        items: itemsEditables,
        pago: registrarPago ? {
          registrar: true,
          id_metodo_pago: idMetodoPago,
          monto_total: montoArsFinal,
          moneda: monedaPago,
          monto_usd: monedaPago === 'USD' ? montoPagadoNum : undefined,
          monto_factura_total: totalReferencia > 0 ? totalReferencia : undefined,
          numero_factura: numeroFactura.trim() || undefined,
          fecha_factura: fechaFactura.trim() || undefined,
          fecha_proximo_pago: saldoPendienteCalc > 0 ? fechaProximoPago : undefined,
          observaciones: observacionesPago.trim() || undefined
        } : undefined
      });

      const msgPago = res.pago
        ? `\n• Pago #${res.pago.id_pago} registrado por ${formatearMoneda(res.pago.monto_total)}.`
        : '';
      const saldoPendTxt = res.pago_pendiente
        ? (res.pago_pendiente.moneda === 'USD'
            ? `USD ${Number(res.pago_pendiente.saldo_pendiente).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
            : formatearMoneda(res.pago_pendiente.saldo_pendiente))
        : '';
      const msgPendiente = res.pago_pendiente
        ? `\n• Saldo pendiente de ${saldoPendTxt} agendado para el ${res.pago_pendiente.fecha_proximo_pago} (se avisará en Inicio).`
        : '';

      alert(
        `Carga masiva completada para "${res.proveedor.nombre_empresa}":\n` +
        `• Nuevos: ${res.insertados}\n` +
        `• Actualizados: ${res.actualizados}\n` +
        `• Unidades ingresadas: ${res.unidades_ingresadas}${msgPago}${msgPendiente}\n\n` +
        `Todo quedó registrado en Auditoría y Kardex.`
      );

      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la carga masiva.');
    } finally {
      setProcesando(false);
    }
  };

  const montoPagoNum = Number(montoPago) || 0;
  const montoFacturaNumUI = Number(montoFacturaTotal) || 0;
  const saldoPendienteUI = montoFacturaNumUI > montoPagoNum + 0.01
    ? Math.round((montoFacturaNumUI - montoPagoNum) * 100) / 100
    : 0;
  const cotizacionPagoUI = (() => {
    const limpio = nombreProveedor.trim().toLowerCase();
    if (limpio) {
      const cotLoteProv = cotizacionesProveedores.find(
        cp => cp.nombre_proveedor.trim().toLowerCase() === limpio && Number(cp.cotizacion_dolar) > 0
      );
      if (cotLoteProv) return Number(cotLoteProv.cotizacion_dolar);
      const provDb = proveedores.find(
        p => p.nombre_empresa.trim().toLowerCase() === limpio && Number(p.cotizacion_dolar) > 0
      );
      if (provDb?.cotizacion_dolar) return Number(provDb.cotizacion_dolar);
    }
    return cotizacionDolar;
  })();
  const equivalentePagoArs = monedaPago === 'USD'
    ? Math.round(montoPagoNum * cotizacionPagoUI * 100) / 100
    : montoPagoNum;

  const indicesFiltrados = itemsEditables
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => {
      const q = filtroPreview.trim().toLowerCase();
      if (!q) return true;
      return (
        (item.codigo || '').toLowerCase().includes(q) ||
        item.nombre.toLowerCase().includes(q) ||
        (item.nombre_proveedor || '').toLowerCase().includes(q)
      );
    });
  const totalPaginasPreview = Math.max(1, Math.ceil(indicesFiltrados.length / limitePreview));
  const paginaActualSegura = Math.min(paginaPreview, totalPaginasPreview);

  return (
    <div
      onClick={e => !procesando && e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px', boxSizing: 'border-box'
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-tarjeta)', width: 'min(1040px, 100%)', maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto', padding: '28px', borderRadius: '16px', border: '1px solid var(--borde-input)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', color: 'var(--texto-principal)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--azul-oscuro)', textTransform: 'uppercase' }}>
              Importación Masiva ({paso === 1 ? 'Paso 1: Archivo y Proveedor' : 'Paso 2: Revisión y Pago'})
            </span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: '800' }}>
              Carga Masiva de Productos (Excel, CSV o PDF)
            </h3>
          </div>
          <button
            type="button"
            disabled={procesando}
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.3rem',
              cursor: procesando ? 'not-allowed' : 'pointer',
              opacity: procesando ? 0.45 : 1,
              color: 'var(--texto-mutado)'
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '0.86rem', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        {paso === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Descarga de Plantilla */}
            <div style={{
              backgroundColor: 'var(--bg-principal)', border: '1px solid var(--borde-input)',
              borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'
            }}>
              <div style={{ fontSize: '0.85rem' }}>
                <strong>¿Necesitás la plantilla modelo?</strong>
                <div style={{ color: 'var(--texto-mutado)', fontSize: '0.8rem', marginTop: '2px' }}>
                  Descargá el formato recomendado con columnas de nombre, tipo, marca, modelo, stock, moneda y precio.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => descargarPlantillaImportacion('xlsx')}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--azul-oscuro)', backgroundColor: 'var(--azul-oscuro)', color: '#ffffff', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Plantilla Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => descargarPlantillaImportacion('csv')}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Plantilla CSV (.csv)
                </button>
              </div>
            </div>

            {/* Configuración del lote */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '0.84rem' }}>
                  Proveedor del Lote
                </label>
                <input
                  type="text"
                  list="lista-proveedores-carga"
                  value={nombreProveedor}
                  onChange={e => setNombreProveedor(e.target.value)}
                  placeholder="Seleccioná o escribí un proveedor..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
                <datalist id="lista-proveedores-carga">
                  {proveedores.map(p => (
                    <option key={p.id_proveedor} value={p.nombre_empresa} />
                  ))}
                </datalist>
                <span style={{ fontSize: '0.74rem', color: 'var(--texto-mutado)' }}>
                  Si escribís un nombre nuevo se creará automáticamente.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '0.84rem' }}>
                  Moneda predeterminada del archivo
                </label>
                <select
                  value={monedaLote}
                  onChange={e => setMonedaLote(e.target.value as 'ARS' | 'USD')}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem' }}
                >
                  <option value="ARS">Pesos Argentinos (ARS)</option>
                  <option value="USD">Dólares (USD → convierte a {formatearMoneda(cotizacionDolar)})</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '0.84rem' }}>
                  Si el producto ya existe
                </label>
                <select
                  value={modoStock}
                  onChange={e => setModoStock(e.target.value as 'sumar' | 'reemplazar')}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem' }}
                >
                  <option value="sumar">Sumar cantidad al stock actual</option>
                  <option value="reemplazar">Reemplazar stock por la cantidad del archivo</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', fontSize: '0.84rem' }}>
                  Stock si el archivo no trae columna cantidad
                </label>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={stockDefault}
                  onChange={e => setStockDefault(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', color: 'var(--texto-principal)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Zona de carga de archivo */}
            <label style={{
              border: '2px dashed var(--borde-input)', borderRadius: '12px', padding: '32px 20px',
              textAlign: 'center', cursor: procesando ? 'wait' : 'pointer', backgroundColor: 'var(--bg-principal)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--azul-oscuro)' }}>
                {procesando ? 'Analizando archivo...' : 'Hacé clic para seleccionar un archivo .xlsx, .csv o .pdf'}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--texto-mutado)' }}>
                Los precios en USD se convertirán a pesos exactamente usando la cotización vigente ({formatearMoneda(cotizacionDolar)}).
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={handleArchivoSeleccionado}
                disabled={procesando}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Resumen del lote */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', backgroundColor: 'var(--bg-principal)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--borde-input)' }}>
              <div style={{ fontSize: '0.86rem', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span>Archivo: <strong>{archivoNombre}</strong></span>
                <span>Proveedor: <strong>{nombreProveedor.trim() || 'Sin asignar'}</strong></span>
                <span>Nuevos: <strong style={{ color: '#16a34a' }}>{preview?.resumen.nuevos ?? 0}</strong></span>
                <span>Actualizar: <strong style={{ color: 'var(--azul-oscuro)' }}>{preview?.resumen.actualizar ?? 0}</strong></span>
                <span>Errores: <strong style={{ color: (preview?.resumen.con_errores || 0) > 0 ? '#dc2626' : '#16a34a' }}>{preview?.resumen.con_errores ?? 0}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cambiar archivo
                </button>
                <button
                  type="button"
                  onClick={handleRevalidar}
                  disabled={procesando}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--azul-oscuro)', color: '#fff', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Re-validar tabla
                </button>
              </div>
            </div>

            {advertencias.length > 0 && (
              <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem' }}>
                {advertencias.join(' ')}
              </div>
            )}

            {cotizacionesProveedores.length > 0 && (
              <div style={{ backgroundColor: 'var(--bg-principal)', border: '1px solid var(--borde-input)', color: 'var(--texto-principal)', padding: '12px 14px', borderRadius: '10px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <strong>Cotizaciones por proveedor detectadas ({cotizacionesProveedores.length}) — podés ajustarlas antes de importar:</strong>
                  <button
                    type="button"
                    onClick={handleRevalidar}
                    disabled={procesando}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--azul-oscuro)', color: '#ffffff', fontSize: '0.76rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Aplicar y recalcular precios
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                  {cotizacionesProveedores.map(cp => (
                    <div key={cp.nombre_proveedor} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', backgroundColor: 'var(--bg-tarjeta)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.74rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cp.nombre_proveedor}>
                        {cp.nombre_proveedor}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={cp.cotizacion_dolar}
                        onChange={e => handleCambiarCotizacionProv(cp.nombre_proveedor, e.target.value)}
                        style={{ width: '68px', padding: '2px 5px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.76rem', fontWeight: '700', textAlign: 'right' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buscador dentro de la previsualización */}
            {(itemsEditables.length > limitePreview || filtroPreview.trim() !== '') && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={filtroPreview}
                  onChange={e => { setFiltroPreview(e.target.value); setPaginaPreview(1); }}
                  placeholder="Filtrar filas por código, producto o proveedor..."
                  style={{ flex: 1, minWidth: '220px', padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-principal)', fontSize: '0.82rem' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <button
                    type="button"
                    disabled={paginaActualSegura <= 1}
                    onClick={() => setPaginaPreview(p => Math.max(1, p - 1))}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', fontWeight: '600', cursor: paginaActualSegura <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    Anterior
                  </button>
                  <span>Página {paginaActualSegura} de {totalPaginasPreview}</span>
                  <button
                    type="button"
                    disabled={paginaActualSegura >= totalPaginasPreview}
                    onClick={() => setPaginaPreview(p => Math.min(totalPaginasPreview, p + 1))}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', fontWeight: '600', cursor: paginaActualSegura >= totalPaginasPreview ? 'not-allowed' : 'pointer' }}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {/* Ajuste rápido de % Ganancia y % Reventa para Repuestos/Accesorios del lote */}
            {itemsEditables.some(it => it.tipo_prod === 'repuesto' || it.tipo_prod === 'accesorio') && (
              <div style={{
                backgroundColor: 'var(--bg-principal)',
                border: '1px solid var(--borde-input)',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                fontSize: '0.8rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <strong style={{ color: 'var(--texto-principal)' }}>Márgenes rápidos para Repuestos / Accesorios (sobre costo)</strong>
                  <span style={{ fontSize: '0.74rem', color: 'var(--texto-mutado)' }}>
                    Calcula el precio mostrador y el precio de reventa para todos los repuestos del archivo.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: 'var(--texto-principal)' }}>
                    <span>% Público:</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Ej: 60"
                      value={porcentajeGananciaLote}
                      onChange={e => setPorcentajeGananciaLote(e.target.value)}
                      style={{ width: '68px', padding: '5px 7px', borderRadius: '6px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', fontSize: '0.8rem' }}
                    />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: 'var(--texto-principal)' }}>
                    <span>% Reventa:</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Ej: 25"
                      value={porcentajeReventaLote}
                      onChange={e => setPorcentajeReventaLote(e.target.value)}
                      style={{ width: '68px', padding: '5px 7px', borderRadius: '6px', border: '1px solid var(--borde-input)', backgroundColor: 'var(--bg-tarjeta)', color: 'var(--texto-principal)', fontWeight: '700', fontSize: '0.8rem' }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={procesando}
                    onClick={handleAplicarPorcentajesRepuestos}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'var(--azul-oscuro)',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: procesando ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Aplicar a repuestos
                  </button>
                </div>
              </div>
            )}

            {/* Tabla Previa Editable */}
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--borde-input)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-principal)', borderBottom: '1px solid var(--borde-input)' }}>
                    <th style={{ padding: '8px' }}>#</th>
                    <th style={{ padding: '8px' }}>Estado</th>
                    <th style={{ padding: '8px' }}>Código</th>
                    <th style={{ padding: '8px' }}>Nombre</th>
                    <th style={{ padding: '8px' }}>Proveedor</th>
                    <th style={{ padding: '8px' }}>Tipo</th>
                    <th style={{ padding: '8px' }}>Marca</th>
                    <th style={{ padding: '8px' }}>Detalles Bicicleta</th>
                    <th style={{ padding: '8px' }}>Cant.</th>
                    <th style={{ padding: '8px' }}>Moneda</th>
                    <th style={{ padding: '8px' }}>Precio Origen</th>
                    <th style={{ padding: '8px' }}>Precio ARS Final</th>
                    <th style={{ padding: '8px' }}>% Rev.</th>
                    <th style={{ padding: '8px' }}>Precio Reventa</th>
                    <th style={{ padding: '8px' }}>Quitar</th>
                  </tr>
                </thead>
                <tbody>
                  {indicesFiltrados
                    .slice((paginaActualSegura - 1) * limitePreview, paginaActualSegura * limitePreview)
                    .map(({ item, idx }) => {
                    const prevItem = preview?.items[idx];
                    const tieneError = (prevItem?.errores.length || 0) > 0;
                    const esUsd = String(item.moneda || monedaLote).toUpperCase() === 'USD';
                    const precioInput = esUsd ? (item.precio_usd ?? item.precio ?? 0) : (item.precio ?? 0);
                    const cotAplicada = prevItem?.cotizacion_aplicada || cotizacionDolar;
                    const arsCalculado = esUsd
                      ? Math.round(Number(item.precio_usd ?? item.precio ?? 0) * cotAplicada * 100) / 100
                      : Math.round(Number(item.precio ?? 0) * 100) / 100;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--borde-input)', backgroundColor: tieneError ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '6px 8px', color: 'var(--texto-mutado)' }}>{idx + 1}</td>
                        <td style={{ padding: '6px 8px' }}>
                          {tieneError ? (
                            <span title={prevItem?.errores.join(' ')} style={{ color: '#dc2626', fontWeight: '700' }}>
                              Error: {prevItem?.errores[0]}
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.7rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                              backgroundColor: prevItem?.accion === 'ACTUALIZAR' ? 'rgba(37, 99, 235, 0.12)' : 'rgba(22, 163, 74, 0.12)',
                              color: prevItem?.accion === 'ACTUALIZAR' ? '#1d4ed8' : '#15803d'
                            }}>
                              {prevItem?.accion || 'CREAR'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            maxLength={50}
                            value={item.codigo || ''}
                            onChange={e => handleEditarFila(idx, 'codigo', e.target.value)}
                            placeholder="Sin cód."
                            style={{ width: '115px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.78rem', fontFamily: 'monospace' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={item.nombre}
                            onChange={e => handleEditarFila(idx, 'nombre', e.target.value)}
                            style={{ width: '170px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={item.nombre_proveedor || nombreProveedor}
                            onChange={e => handleEditarFila(idx, 'nombre_proveedor', e.target.value)}
                            placeholder="Sin prov."
                            style={{ width: '105px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.78rem' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <select
                            value={item.tipo_prod}
                            onChange={e => handleEditarFila(idx, 'tipo_prod', e.target.value)}
                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.8rem' }}
                          >
                            <option value="repuesto">Repuesto</option>
                            <option value="bicicleta">Bicicleta</option>
                            <option value="accesorio">Accesorio</option>
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="text"
                            value={item.marca || ''}
                            onChange={e => handleEditarFila(idx, 'marca', e.target.value)}
                            style={{ width: '90px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {item.tipo_prod === 'bicicleta' ? (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', minWidth: '210px' }}>
                              <select
                                value={item.genero || 'unisex'}
                                onChange={e => handleEditarFila(idx, 'genero', e.target.value)}
                                title="Género"
                                style={{ padding: '3px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.74rem' }}
                              >
                                <option value="unisex">Unisex</option>
                                <option value="hombre">Hombre</option>
                                <option value="mujer">Mujer</option>
                                <option value="niño/a">Niño/a</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Rod."
                                title="Rodado"
                                value={item.rodado || ''}
                                onChange={e => handleEditarFila(idx, 'rodado', e.target.value)}
                                style={{ width: '44px', padding: '3px 5px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.74rem' }}
                              />
                              <input
                                type="text"
                                placeholder="Talle"
                                title="Talle"
                                value={item.talle || ''}
                                onChange={e => handleEditarFila(idx, 'talle', e.target.value)}
                                style={{ width: '42px', padding: '3px 5px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.74rem' }}
                              />
                              <input
                                type="text"
                                placeholder="Color"
                                title="Color"
                                value={item.color || ''}
                                onChange={e => handleEditarFila(idx, 'color', e.target.value)}
                                style={{ width: '62px', padding: '3px 5px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.74rem' }}
                              />
                            </div>
                          ) : (
                            <span style={{ color: 'var(--texto-mutado)', fontSize: '0.76rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="number"
                            min="0"
                            value={item.cantidad ?? 0}
                            onChange={e => handleEditarFila(idx, 'cantidad', e.target.value)}
                            style={{ width: '60px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <select
                            value={esUsd ? 'USD' : 'ARS'}
                            onChange={e => handleEditarFila(idx, 'moneda', e.target.value)}
                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.8rem' }}
                          >
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                          </select>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={precioInput}
                            onChange={e => {
                              if (esUsd) {
                                handleEditarFila(idx, 'precio_usd', e.target.value);
                              } else {
                                handleEditarFila(idx, 'precio', e.target.value);
                              }
                            }}
                            style={{ width: '90px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                          {formatearMoneda(arsCalculado)}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {item.tipo_prod !== 'bicicleta' ? (
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="%"
                              value={
                                revPctInputs[idx] !== undefined
                                  ? revPctInputs[idx]
                                  : (item.porcentaje_reventa !== undefined && item.porcentaje_reventa !== null && item.porcentaje_reventa !== ''
                                      ? String(Math.round(Number(item.porcentaje_reventa) * 10000) / 100)
                                      : '')
                              }
                              onChange={e => {
                                const val = e.target.value;
                                setRevPctInputs(prev => ({ ...prev, [idx]: val }));
                                handleEditarFila(idx, 'porcentaje_reventa', val);
                              }}
                              style={{ width: '58px', padding: '4px 5px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.78rem', color: 'var(--texto-principal)' }}
                            />
                          ) : (
                            <span style={{ color: 'var(--texto-mutado)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px', fontWeight: '700', color: 'var(--texto-principal)', whiteSpace: 'nowrap' }}>
                          {item.tipo_prod !== 'bicicleta' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: esUsd ? '#0369a1' : 'var(--texto-mutado)' }}>
                                  {esUsd ? 'USD' : '$'}
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="—"
                                  value={esUsd ? (item.precio_reventa_usd ?? '') : (item.precio_reventa ?? prevItem?.precio_reventa ?? '')}
                                  onChange={e => handleEditarFila(idx, esUsd ? 'precio_reventa_usd' : 'precio_reventa', e.target.value)}
                                  style={{ width: '80px', padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--borde-input)', fontSize: '0.78rem', color: 'var(--texto-principal)', fontWeight: '700' }}
                                />
                              </div>
                              {esUsd && Number(item.precio_reventa_usd) > 0 && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--texto-mutado)', fontWeight: '500' }}>
                                  ≈ {formatearMoneda(Math.round(Number(item.precio_reventa_usd) * cotAplicada * 100) / 100)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--texto-mutado)', fontWeight: '400' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <button
                            type="button"
                            onClick={() => handleEliminarFila(idx)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '700' }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Declaración Opcional de Pago al Proveedor */}
            <div style={{
              border: '1px solid var(--borde-input)', borderRadius: '12px', padding: '14px 16px',
              backgroundColor: registrarPago ? 'rgba(13, 148, 136, 0.05)' : 'var(--bg-principal)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={registrarPago}
                  onChange={e => setRegistrarPago(e.target.checked)}
                  style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                />
                <span>Declarar pago al proveedor por esta compra de mercadería</span>
              </label>

              {registrarPago && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                  {(numeroFactura || fechaFactura || montoFacturaNumUI > 0) && (
                    <div style={{
                      backgroundColor: 'rgba(13, 148, 136, 0.08)',
                      border: '1px solid rgba(13, 148, 136, 0.25)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.8rem',
                      color: '#0f766e',
                      fontWeight: '600',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      {numeroFactura && <span>Factura detectada: <strong>Nº {numeroFactura}</strong></span>}
                      {fechaFactura && <span>Fecha: <strong>{fechaFactura}</strong></span>}
                      {montoFacturaNumUI > 0 && <span>Total factura: <strong>{monedaPago === 'USD' ? `USD ${montoFacturaNumUI.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : formatearMoneda(montoFacturaNumUI)}</strong></span>}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: '600' }}>Método de Pago *</label>
                      <select
                        value={idMetodoPago}
                        onChange={e => setIdMetodoPago(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.86rem' }}
                      >
                        {metodosPago.map(mp => (
                          <option key={mp.id_metodo_pago} value={mp.id_metodo_pago}>{mp.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: '600' }}>Moneda</label>
                      <select
                        value={monedaPago}
                        onChange={e => setMonedaPago(e.target.value as 'ARS' | 'USD')}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.86rem' }}
                      >
                        <option value="ARS">Pesos (ARS)</option>
                        <option value="USD">Dólares (USD)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                        Total Factura ({monedaPago})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={montoFacturaTotal}
                        onChange={e => setMontoFacturaTotal(e.target.value)}
                        placeholder="0.00"
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.86rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: '600' }}>
                        Monto Pagado Ahora ({monedaPago}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={montoPago}
                        onChange={e => setMontoPago(e.target.value)}
                        placeholder="0.00 (o parcial)"
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.86rem', boxSizing: 'border-box' }}
                      />
                      {monedaPago === 'USD' && montoPagoNum > 0 && (
                        <span style={{ fontSize: '0.73rem', color: '#0f766e', fontWeight: '600' }}>
                          Equivale a {formatearMoneda(equivalentePagoArs)} ARS
                        </span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: '600' }}>Comprobante / Descripción</label>
                      <input
                        type="text"
                        maxLength={250}
                        value={observacionesPago}
                        onChange={e => setObservacionesPago(e.target.value)}
                        placeholder="Factura Nº ... - Fecha ..."
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--borde-input)', fontSize: '0.86rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  {/* Pago parcial / diferido: cálculo automático de saldo y agenda de próximo pago */}
                  {saldoPendienteUI > 0 && (
                    <div style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.09)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '12px',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#b45309', textTransform: 'uppercase' }}>
                          {montoPagoNum > 0 ? 'Pago Parcial — Saldo Pendiente' : 'Pago Diferido — Saldo Total Pendiente'}
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#92400e', marginTop: '2px' }}>
                          {monedaPago === 'USD'
                            ? `USD ${saldoPendienteUI.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                            : formatearMoneda(saldoPendienteUI)}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#78350f', marginTop: '2px' }}>
                          Se agendará un recordatorio en la pantalla principal (Inicio) para pagar el saldo restante.
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: '700', color: '#92400e' }}>
                          Fecha del Próximo Pago *
                        </label>
                        <input
                          type="date"
                          value={fechaProximoPago}
                          onChange={e => setFechaProximoPago(e.target.value)}
                          required={saldoPendienteUI > 0}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(217, 119, 6, 0.5)',
                            backgroundColor: 'var(--bg-tarjeta)',
                            color: 'var(--texto-principal)',
                            fontSize: '0.86rem',
                            fontWeight: '700',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botones de confirmación */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '11px 18px', border: '1px solid var(--borde-input)', borderRadius: '8px', backgroundColor: 'transparent', fontWeight: '600', cursor: 'pointer', color: 'var(--texto-mutado)' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesando}
                onClick={handleConfirmar}
                style={{ padding: '11px 22px', backgroundColor: 'var(--azul-oscuro)', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: procesando ? 'not-allowed' : 'pointer', opacity: procesando ? 0.7 : 1 }}
              >
                {procesando ? 'Importando...' : `Confirmar Carga (${itemsEditables.length} productos)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
