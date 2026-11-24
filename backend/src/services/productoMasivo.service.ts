import { pool } from '../config/db.js';
import type { PoolClient } from 'pg';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { validarId } from '../utils/validation.js';
import { validarDatosProducto } from './producto.service.js';
import { PagoProveedorService } from './pagoProveedor.service.js';

export interface ItemCargaMasivaInput {
  id_producto?: number | undefined;
  codigo?: string | undefined;
  nombre: string;
  tipo_prod: string;
  marca?: string | undefined;
  modelo?: string | undefined;
  nombre_proveedor?: string | undefined;
  cantidad?: number | string | undefined;
  stock_minimo?: number | string | undefined;
  precio?: number | string | undefined;
  precio_usd?: number | string | undefined;
  costo_usd?: number | string | undefined;
  porcentaje_ganancia?: number | string | undefined;
  porcentaje_reventa?: number | string | undefined;
  precio_reventa?: number | string | undefined;
  precio_reventa_usd?: number | string | undefined;
  moneda?: 'ARS' | 'USD' | string | undefined;
  color?: string | undefined;
  rodado?: string | undefined;
  talle?: string | undefined;
  genero?: string | undefined;
  modo_stock?: 'sumar' | 'reemplazar' | undefined;
}

export interface CotizacionProveedorInput {
  nombre_proveedor: string;
  cotizacion_dolar: number;
}

export interface DatosCargaMasiva {
  id_proveedor?: number | undefined;
  nombre_proveedor?: string | undefined;
  moneda_lote?: 'ARS' | 'USD' | string | undefined;
  origen_formato?: string | undefined;
  modo_stock_default?: 'sumar' | 'reemplazar' | undefined;
  cotizaciones_proveedores?: CotizacionProveedorInput[] | undefined;
  items: ItemCargaMasivaInput[];
  pago?: {
    registrar: boolean;
    id_metodo_pago: number;
    monto_total: number | string;
    moneda?: 'ARS' | 'USD' | string | undefined;
    monto_usd?: number | string | undefined;
    observaciones?: string | undefined;
    monto_factura_total?: number | string | undefined;
    numero_factura?: string | undefined;
    fecha_factura?: string | undefined;
    fecha_proximo_pago?: string | undefined;
  } | undefined;
}

export interface DatosAumentoMasivo {
  id_proveedor: number | string;
  tipo_ajuste: 'porcentaje' | 'monto_fijo';
  valor: number | string;
  filtro_tipo_prod?: string | undefined;
  filtro_moneda?: string | undefined;
  solo_activos?: boolean | undefined;
  preview?: boolean | undefined;
}

const redondear2 = (n: number): number => Math.round(n * 100) / 100;

const normalizarPorcentajeFactor = (val: unknown): number | null => {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num) || num < 0) return null;
  return num > 10 ? Math.round((num / 100) * 10000) / 10000 : Math.round(num * 10000) / 10000;
};

async function obtenerCotizacionActual(db: PoolClient | typeof pool): Promise<number> {
  const res = await db.query(`SELECT valor FROM Configuracion_Sistema WHERE clave = 'cotizacion_dolar' LIMIT 1;`);
  const val = Number(res.rows[0]?.valor);
  return !isNaN(val) && val > 0 ? val : 1;
}

/** Servicio especializado para carga masiva multi-formato y ajustes masivos de precios por proveedor. */
export class ProductoMasivoService {
  /**
   * Analiza y previsualiza un lote de productos antes de guardar,
   * detectando altas nuevas, actualizaciones existentes, conversión USD->ARS y errores por fila.
   */
  static async previsualizarCargaMasiva(datos: DatosCargaMasiva) {
    const { id_proveedor, nombre_proveedor, moneda_lote, items, modo_stock_default } = datos;

    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestError('El lote debe contener al menos un producto.');
    }
    if (items.length > 2000) {
      throw new BadRequestError('La carga masiva admite hasta 2.000 productos por lote.');
    }

    const monedaLoteNorm = String(moneda_lote || 'ARS').trim().toUpperCase() === 'USD' ? 'USD' : 'ARS';
    const cotizacion = await obtenerCotizacionActual(pool);

    let proveedorInfo: { id_proveedor: number | null; nombre_empresa: string | null; cotizacion_dolar?: number | string | null } = {
      id_proveedor: null,
      nombre_empresa: null
    };

    if (id_proveedor) {
      const idProv = validarId(id_proveedor, 'El proveedor seleccionado no es válido.');
      const resProv = await pool.query('SELECT id_proveedor, nombre_empresa, cotizacion_dolar FROM Proveedor WHERE id_proveedor = $1;', [idProv]);
      if (resProv.rowCount === 0) {
        throw new NotFoundError('El proveedor seleccionado no existe.');
      }
      proveedorInfo = resProv.rows[0];
    } else if (nombre_proveedor && String(nombre_proveedor).trim()) {
      const nombreLimpio = String(nombre_proveedor).trim();
      const resProv = await pool.query('SELECT id_proveedor, nombre_empresa, cotizacion_dolar FROM Proveedor WHERE LOWER(nombre_empresa) = LOWER($1);', [nombreLimpio]);
      if (resProv.rowCount && resProv.rowCount > 0) {
        proveedorInfo = resProv.rows[0];
      } else {
        proveedorInfo = { id_proveedor: null, nombre_empresa: nombreLimpio };
      }
    }

    // Cargar catálogo existente para hacer matching rápido en memoria
    const resExistentes = await pool.query(`
      SELECT p.id_producto, p.id_proveedor, p.codigo, p.nombre, p.marca, p.modelo, p.tipo_prod, p.cantidad, p.precio, p.moneda, p.precio_usd,
             pb.rodado, pb.talle, pb.color, pb.genero
      FROM Productos p
      LEFT JOIN Producto_BiciNueva pb ON p.id_producto = pb.id_producto;
    `);
    const porId = new Map<number, any>();
    const porCodigo = new Map<string, any>();
    const porClave = new Map<string, any>();

    const construirClave = (r: {
      tipo_prod?: string;
      nombre?: string;
      marca?: string | null;
      modelo?: string | null;
      rodado?: string | null;
      talle?: string | null;
      color?: string | null;
    }): string => {
      const base = `${String(r.tipo_prod || '').trim().toLowerCase()}|${String(r.nombre || '').trim().toLowerCase()}|${String(r.marca || '').trim().toLowerCase()}|${String(r.modelo || '').trim().toLowerCase()}`;
      if (String(r.tipo_prod || '').trim().toLowerCase() === 'bicicleta') {
        return `${base}|${String(r.rodado || '').trim().toLowerCase()}|${String(r.talle || '').trim().toLowerCase()}|${String(r.color || '').trim().toLowerCase()}`;
      }
      return base;
    };

    for (const row of resExistentes.rows) {
      porId.set(Number(row.id_producto), row);
      if (row.codigo && String(row.codigo).trim()) {
        const codKey = String(row.codigo).trim().toLowerCase();
        if (!porCodigo.has(codKey)) {
          porCodigo.set(codKey, row);
        }
      }
      const clave = construirClave(row);
      if (!porClave.has(clave)) {
        porClave.set(clave, row);
      }
    }

    let nuevosCount = 0;
    let actualizarCount = 0;
    let erroresCount = 0;

    const cotizacionesMap = new Map<string, number>();
    if (Array.isArray(datos.cotizaciones_proveedores)) {
      for (const cp of datos.cotizaciones_proveedores) {
        const nom = String(cp?.nombre_proveedor || '').trim().toLowerCase();
        const val = Number(cp?.cotizacion_dolar);
        if (nom && !isNaN(val) && isFinite(val) && val > 0 && val <= 99999999.99) {
          cotizacionesMap.set(nom, redondear2(val));
        }
      }
    }

    if (proveedorInfo.nombre_empresa && proveedorInfo.cotizacion_dolar) {
      const nomCab = proveedorInfo.nombre_empresa.trim().toLowerCase();
      const cotCab = Number(proveedorInfo.cotizacion_dolar);
      if (nomCab && !cotizacionesMap.has(nomCab) && !isNaN(cotCab) && isFinite(cotCab) && cotCab > 0) {
        cotizacionesMap.set(nomCab, cotCab);
      }
    }

    const tieneProveedoresPorFila = items.some(it => it?.nombre_proveedor && it.nombre_proveedor.trim());
    if (tieneProveedoresPorFila) {
      const resProvsDb = await pool.query('SELECT nombre_empresa, cotizacion_dolar FROM Proveedor;');
      for (const r of resProvsDb.rows) {
        const nom = String(r.nombre_empresa || '').trim().toLowerCase();
        if (nom && !cotizacionesMap.has(nom) && r.cotizacion_dolar) {
          cotizacionesMap.set(nom, Number(r.cotizacion_dolar));
        }
      }
    }

    const stockAcumuladoPreview = new Map<number, number>();

    const previewItems = items.map((item, idx) => {
      const fila = idx + 1;
      if (!item || typeof item !== 'object') {
        erroresCount++;
        return {
          fila,
          accion: 'CREAR' as const,
          id_producto_existente: null,
          codigo: null,
          nombre: '',
          tipo_prod: 'repuesto',
          marca: null,
          modelo: null,
          nombre_proveedor: proveedorInfo.nombre_empresa || null,
          cotizacion_aplicada: cotizacion,
          cantidad_archivo: 0,
          stock_actual: 0,
          stock_resultante: 0,
          moneda: monedaLoteNorm,
          precio_usd: null,
          costo_usd: null,
          porcentaje_ganancia: null,
          porcentaje_reventa: null,
          precio_reventa_usd: null,
          precio_reventa: null,
          precio_ars: 0,
          precio_actual_ars: null,
          stock_minimo: 0,
          stock_minimo_update: null,
          genero: null,
          color: null,
          rodado: null,
          talle: null,
          errores: ['Fila de producto inválida o vacía.']
        };
      }

      const tipoNorm = String(item.tipo_prod || 'repuesto').trim().toLowerCase();
      const monedaItem = String(item.moneda || monedaLoteNorm).trim().toUpperCase() === 'USD' ? 'USD' : 'ARS';
      const provFila = item.nombre_proveedor ? String(item.nombre_proveedor).trim() : (proveedorInfo.nombre_empresa || null);
      const cotItem = (provFila && cotizacionesMap.get(provFila.toLowerCase())) || cotizacion;

      const payloadValidar = {
        ...item,
        tipo_prod: tipoNorm,
        moneda: monedaItem,
        genero: tipoNorm === 'bicicleta' ? (item.genero || 'unisex') : item.genero
      };

      const errores = validarDatosProducto(payloadValidar);

      const costoUsdVal = item.costo_usd !== undefined && item.costo_usd !== null && item.costo_usd !== ''
        ? redondear2(Number(item.costo_usd) || 0)
        : null;

      let gananciaVal: number | null = null;
      if (item.porcentaje_ganancia !== undefined && item.porcentaje_ganancia !== null && item.porcentaje_ganancia !== '') {
        const normGan = normalizarPorcentajeFactor(item.porcentaje_ganancia);
        if (normGan !== null) {
          if (normGan > 9999.9999) {
            errores.push('El porcentaje de ganancia supera el máximo permitido.');
          } else {
            gananciaVal = normGan;
          }
        }
      }

      let porcentajeReventaVal: number | null = null;
      if (item.porcentaje_reventa !== undefined && item.porcentaje_reventa !== null && item.porcentaje_reventa !== '') {
        const normRev = normalizarPorcentajeFactor(item.porcentaje_reventa);
        if (normRev !== null) {
          if (normRev > 9999.9999) {
            errores.push('El porcentaje de reventa supera el máximo permitido.');
          } else {
            porcentajeReventaVal = normRev;
          }
        }
      }

      let precioUsdCalculado: number | null = null;
      let precioArsCalculado = 0;
      let precioReventaUsdCalculado: number | null = null;
      let precioReventaArsCalculado: number | null = null;

      if (monedaItem === 'USD') {
        const tienePrecioUsd = item.precio_usd !== undefined && item.precio_usd !== null && item.precio_usd !== '';
        const tienePrecioArs = item.precio !== undefined && item.precio !== null && item.precio !== '';

        if (tienePrecioUsd) {
          const rawUsd = Number(item.precio_usd);
          precioUsdCalculado = isNaN(rawUsd) ? 0 : redondear2(rawUsd);
        } else if (costoUsdVal !== null && costoUsdVal > 0 && gananciaVal !== null) {
          precioUsdCalculado = redondear2(costoUsdVal * (1 + gananciaVal));
        } else {
          const rawUsd = tienePrecioArs ? Number(item.precio) : 0;
          precioUsdCalculado = isNaN(rawUsd) ? 0 : redondear2(rawUsd);
        }

        if (tienePrecioArs && Number(item.precio) > 0 && tienePrecioUsd) {
          precioArsCalculado = redondear2(Number(item.precio));
        } else {
          precioArsCalculado = redondear2(precioUsdCalculado * cotItem);
        }

        if (item.precio_reventa_usd !== undefined && item.precio_reventa_usd !== null && item.precio_reventa_usd !== '') {
          precioReventaUsdCalculado = redondear2(Number(item.precio_reventa_usd) || 0);
          precioReventaArsCalculado = redondear2(precioReventaUsdCalculado * cotItem);
        } else if (costoUsdVal !== null && costoUsdVal > 0 && porcentajeReventaVal !== null) {
          precioReventaUsdCalculado = redondear2(costoUsdVal * (1 + porcentajeReventaVal));
          precioReventaArsCalculado = redondear2(precioReventaUsdCalculado * cotItem);
        } else if (item.precio_reventa !== undefined && item.precio_reventa !== null && item.precio_reventa !== '') {
          precioReventaArsCalculado = redondear2(Number(item.precio_reventa) || 0);
          if (cotItem > 0) precioReventaUsdCalculado = redondear2(precioReventaArsCalculado / cotItem);
        }
      } else {
        const tienePrecioArs = item.precio !== undefined && item.precio !== null && item.precio !== '';
        if (tienePrecioArs) {
          const rawArs = Number(item.precio);
          precioArsCalculado = isNaN(rawArs) ? 0 : redondear2(rawArs);
        } else if (costoUsdVal !== null && costoUsdVal > 0 && gananciaVal !== null) {
          precioArsCalculado = redondear2(costoUsdVal * (1 + gananciaVal));
        } else {
          precioArsCalculado = 0;
        }

        if (item.precio_reventa !== undefined && item.precio_reventa !== null && item.precio_reventa !== '') {
          precioReventaArsCalculado = redondear2(Number(item.precio_reventa) || 0);
        } else if (costoUsdVal !== null && costoUsdVal > 0 && porcentajeReventaVal !== null) {
          precioReventaArsCalculado = redondear2(costoUsdVal * (1 + porcentajeReventaVal));
        }
      }

      const codigoItem = item.codigo && String(item.codigo).trim() ? String(item.codigo).trim() : null;
      let existente: any = null;
      if (item.id_producto && Number.isInteger(Number(item.id_producto))) {
        existente = porId.get(Number(item.id_producto)) || null;
      }
      if (!existente && codigoItem) {
        existente = porCodigo.get(codigoItem.toLowerCase()) || null;
      }
      if (!existente && item.nombre) {
        const claveItem = construirClave({
          tipo_prod: tipoNorm,
          nombre: item.nombre,
          marca: item.marca || null,
          modelo: item.modelo || null,
          rodado: item.rodado || null,
          talle: item.talle || null,
          color: item.color || null
        });
        existente = porClave.get(claveItem) || null;
      }

      const accion: 'CREAR' | 'ACTUALIZAR' = existente ? 'ACTUALIZAR' : 'CREAR';
      if (errores.length > 0) {
        erroresCount++;
      } else if (accion === 'CREAR') {
        nuevosCount++;
      } else {
        actualizarCount++;
      }

      const cantidadItem = Math.max(0, Math.trunc(Number(item.cantidad) || 0));
      const modoStock = item.modo_stock || modo_stock_default || 'sumar';
      const stockBase = existente
        ? (stockAcumuladoPreview.get(Number(existente.id_producto)) ?? Number(existente.cantidad))
        : 0;
      const stockResultante = existente
        ? (modoStock === 'sumar' ? stockBase + cantidadItem : cantidadItem)
        : cantidadItem;
      if (existente) {
        stockAcumuladoPreview.set(Number(existente.id_producto), stockResultante);
      }

      const tieneStockMinimo = item.stock_minimo !== undefined && item.stock_minimo !== null && item.stock_minimo !== '';
      const stockMinimoVal = tieneStockMinimo ? Math.max(0, Math.trunc(Number(item.stock_minimo) || 0)) : 0;

      return {
        fila,
        accion,
        id_producto_existente: existente ? Number(existente.id_producto) : null,
        codigo: codigoItem,
        nombre: String(item.nombre || '').trim(),
        tipo_prod: tipoNorm,
        marca: item.marca ? String(item.marca).trim() : null,
        modelo: item.modelo ? String(item.modelo).trim() : null,
        nombre_proveedor: provFila,
        cotizacion_aplicada: cotItem,
        cantidad_archivo: cantidadItem,
        stock_actual: existente ? Number(existente.cantidad) : 0,
        stock_resultante: stockResultante,
        moneda: monedaItem,
        precio_usd: precioUsdCalculado,
        costo_usd: costoUsdVal,
        porcentaje_ganancia: gananciaVal,
        porcentaje_reventa: porcentajeReventaVal,
        precio_reventa_usd: precioReventaUsdCalculado,
        precio_reventa: precioReventaArsCalculado,
        precio_ars: precioArsCalculado,
        precio_actual_ars: existente ? Number(existente.precio) : null,
        stock_minimo: stockMinimoVal,
        stock_minimo_update: tieneStockMinimo ? stockMinimoVal : null,
        genero: tipoNorm === 'bicicleta' ? String(item.genero || 'unisex').trim().toLowerCase() : null,
        color: item.color ? String(item.color).trim() : null,
        rodado: item.rodado ? String(item.rodado).trim() : null,
        talle: item.talle ? String(item.talle).trim() : null,
        errores
      };
    });

    return {
      proveedor: proveedorInfo,
      cotizacion_dolar: cotizacion,
      resumen: {
        total_filas: items.length,
        nuevos: nuevosCount,
        actualizar: actualizarCount,
        con_errores: erroresCount
      },
      items: previewItems
    };
  }

  /**
   * Ejecuta la carga masiva de productos dentro de una transacción atómica,
   * registra movimientos Kardex, auditoría en Bitacora_Actividad y pago opcional al proveedor.
   */
  static async ejecutarCargaMasiva(
    datos: DatosCargaMasiva,
    operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }
  ) {
    const { idUsuarioOperador, nombreUsuarioOperador } = operador;
    const idOp = Number(idUsuarioOperador);
    if (!idUsuarioOperador || isNaN(idOp) || idOp <= 0) {
      throw new UnauthorizedError('No se pudo identificar al administrador que ejecuta la carga masiva.');
    }

    const preview = await this.previsualizarCargaMasiva(datos);
    if (preview.resumen.con_errores > 0) {
      const primerError = preview.items.find(i => i.errores.length > 0);
      throw new BadRequestError(
        `Hay ${preview.resumen.con_errores} fila(s) con errores. Corregí la fila ${primerError?.fila}: ${primerError?.errores[0]}`
      );
    }

    if (datos.pago?.registrar && !datos.id_proveedor && !datos.nombre_proveedor?.trim()) {
      throw new BadRequestError('Para declarar un pago debés seleccionar o escribir el proveedor del lote.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cotizacion = await obtenerCotizacionActual(client);

      // Resolver o crear proveedor del lote si se indicó
      let idProveedorFinal: number | null = null;
      let nombreProveedorFinal = 'Sin proveedor asignado';
      let cotizacionProveedorCabecera: number | null = null;

      if (datos.id_proveedor) {
        const resProv = await client.query(
          'SELECT id_proveedor, nombre_empresa, cotizacion_dolar FROM Proveedor WHERE id_proveedor = $1;',
          [datos.id_proveedor]
        );
        if (resProv.rowCount === 0) {
          throw new NotFoundError('El proveedor seleccionado no existe.');
        }
        idProveedorFinal = resProv.rows[0].id_proveedor;
        nombreProveedorFinal = resProv.rows[0].nombre_empresa;
        cotizacionProveedorCabecera = resProv.rows[0].cotizacion_dolar ? Number(resProv.rows[0].cotizacion_dolar) : null;
      } else if (datos.nombre_proveedor && datos.nombre_proveedor.trim()) {
        const nombreLimpio = datos.nombre_proveedor.trim().slice(0, 70);
        if (nombreLimpio.length < 2) {
          throw new BadRequestError('El nombre del proveedor debe tener al menos 2 caracteres.');
        }
        const resBuscar = await client.query(
          'SELECT id_proveedor, nombre_empresa, cotizacion_dolar FROM Proveedor WHERE LOWER(nombre_empresa) = LOWER($1);',
          [nombreLimpio]
        );
        if (resBuscar.rowCount && resBuscar.rowCount > 0) {
          idProveedorFinal = resBuscar.rows[0].id_proveedor;
          nombreProveedorFinal = resBuscar.rows[0].nombre_empresa;
          cotizacionProveedorCabecera = resBuscar.rows[0].cotizacion_dolar ? Number(resBuscar.rows[0].cotizacion_dolar) : null;
        } else {
          const resCrear = await client.query(
            'INSERT INTO Proveedor (nombre_empresa) VALUES ($1) RETURNING id_proveedor, nombre_empresa;',
            [nombreLimpio]
          );
          idProveedorFinal = resCrear.rows[0].id_proveedor;
          nombreProveedorFinal = resCrear.rows[0].nombre_empresa;
        }
      }

      let insertados = 0;
      let actualizados = 0;
      let unidadesIngresadas = 0;
      const modoStockDefault = datos.modo_stock_default || 'sumar';

      // Mapa de proveedores por fila (para archivos multi-proveedor como REPUESTOS-.xlsx)
      const mapaProveedores = new Map<string, { id: number; nombre: string; cotizacion: number | null }>();
      if (idProveedorFinal) {
        mapaProveedores.set(nombreProveedorFinal.toLowerCase(), {
          id: idProveedorFinal,
          nombre: nombreProveedorFinal,
          cotizacion: cotizacionProveedorCabecera
        });
      }

      const cotInputMap = new Map<string, number>();
      const cotOrigNombreMap = new Map<string, string>();
      if (Array.isArray(datos.cotizaciones_proveedores)) {
        for (const cp of datos.cotizaciones_proveedores) {
          const orig = String(cp?.nombre_proveedor || '').trim();
          const k = orig.toLowerCase();
          const v = Number(cp?.cotizacion_dolar);
          if (k && !isNaN(v) && isFinite(v) && v > 0 && v <= 99999999.99) {
            cotInputMap.set(k, redondear2(v));
            if (!cotOrigNombreMap.has(k)) cotOrigNombreMap.set(k, orig);
          }
        }
      }

      const nombresUnicos = new Set<string>();
      for (const it of preview.items) {
        if (it.nombre_proveedor) {
          nombresUnicos.add(it.nombre_proveedor.trim());
        }
      }
      for (const orig of cotOrigNombreMap.values()) {
        nombresUnicos.add(orig);
      }

      const necesitaProcesarProvs = Array.from(nombresUnicos).some((n) => {
        const k = n.toLowerCase();
        return !mapaProveedores.has(k) || cotInputMap.has(k);
      });

      if (necesitaProcesarProvs) {
        for (const nombreProv of nombresUnicos) {
          const nombreNormalizado = nombreProv.trim().slice(0, 70);
          const k = nombreNormalizado.toLowerCase();
          if (!k || (mapaProveedores.has(k) && !cotInputMap.has(k))) continue;

          const cotNueva = cotInputMap.get(k) ?? null;
          const resBuscar = await client.query(
            'SELECT id_proveedor, nombre_empresa, cotizacion_dolar FROM Proveedor WHERE LOWER(nombre_empresa) = LOWER($1);',
            [nombreNormalizado]
          );

          if (resBuscar.rowCount && resBuscar.rowCount > 0) {
            const pRow = resBuscar.rows[0];
            if (cotNueva !== null) {
              await client.query('UPDATE Proveedor SET cotizacion_dolar = $1 WHERE id_proveedor = $2;', [cotNueva, pRow.id_proveedor]);
            }
            mapaProveedores.set(k, {
              id: pRow.id_proveedor,
              nombre: pRow.nombre_empresa,
              cotizacion: cotNueva ?? (pRow.cotizacion_dolar ? Number(pRow.cotizacion_dolar) : null)
            });
          } else {
            if (nombreNormalizado.length < 2) {
              throw new BadRequestError('El nombre del proveedor debe tener al menos 2 caracteres.');
            }
            const resCrear = await client.query(
              'INSERT INTO Proveedor (nombre_empresa, cotizacion_dolar) VALUES ($1, $2) RETURNING id_proveedor, nombre_empresa, cotizacion_dolar;',
              [nombreNormalizado, cotNueva]
            );
            const pRow = resCrear.rows[0];
            mapaProveedores.set(k, {
              id: pRow.id_proveedor,
              nombre: pRow.nombre_empresa,
              cotizacion: cotNueva
            });
          }
        }
      }

      const prepararItem = (i: number) => {
        const item = preview.items[i];
        if (!item) {
          throw new BadRequestError('Fila de carga masiva no encontrada.');
        }
        const rawItem = datos.items[i];
        const modoStock: 'sumar' | 'reemplazar' = rawItem?.modo_stock || modoStockDefault;
        const provEntry = item.nombre_proveedor ? mapaProveedores.get(item.nombre_proveedor.trim().slice(0, 70).toLowerCase()) : undefined;
        const idProvItem = provEntry?.id ?? idProveedorFinal;
        const nombreProvItem = provEntry?.nombre ?? nombreProveedorFinal;
        const cotItem = provEntry?.cotizacion ?? cotizacion;

        const tieneRawPrecioArs = rawItem?.precio !== undefined && rawItem?.precio !== null && rawItem?.precio !== '' && Number(rawItem.precio) > 0;
        const tieneRawPrecioUsd = rawItem?.precio_usd !== undefined && rawItem?.precio_usd !== null && rawItem?.precio_usd !== '';

        const precioArs = item.moneda === 'USD' && item.precio_usd !== null
          ? (tieneRawPrecioArs && tieneRawPrecioUsd
              ? redondear2(Number(rawItem!.precio))
              : redondear2(item.precio_usd * cotItem))
          : item.precio_ars;

        const precioReventaArs = item.moneda === 'USD' && item.precio_reventa_usd !== null
          ? redondear2(item.precio_reventa_usd * cotItem)
          : item.precio_reventa;

        return { item: { ...item }, modoStock, idProvItem, nombreProvItem, precioArs, precioReventaArs };
      };

      type ItemPreparado = ReturnType<typeof prepararItem>;

      if (preview.items.length > 1) {
        // Camino masivo optimizado (UNNEST) consolidando duplicados dentro del mismo lote
        const paraCrear: ItemPreparado[] = [];
        const indiceCrearPorClave = new Map<string, number>();

        interface AcumuladoActualizar {
          base: ItemPreparado;
          ultimoReemplazo: number | null;
          deltaSumar: number;
        }
        const mapaActualizar = new Map<number, AcumuladoActualizar>();

        const construirClaveCrear = (it: ItemPreparado['item']): string => {
          if (it.codigo) return `cod:${it.codigo.toLowerCase()}`;
          return `key:${it.tipo_prod}|${it.nombre.toLowerCase()}|${(it.marca || '').toLowerCase()}|${(it.modelo || '').toLowerCase()}|${(it.rodado || '').toLowerCase()}|${(it.talle || '').toLowerCase()}|${(it.color || '').toLowerCase()}`;
        };

        for (let i = 0; i < preview.items.length; i++) {
          const p = prepararItem(i);
          if (p.item.accion === 'ACTUALIZAR' && p.item.id_producto_existente) {
            const idExist = p.item.id_producto_existente;
            const previo = mapaActualizar.get(idExist);
            if (!previo) {
              mapaActualizar.set(idExist, {
                base: p,
                ultimoReemplazo: p.modoStock === 'reemplazar' ? p.item.cantidad_archivo : null,
                deltaSumar: p.modoStock === 'sumar' ? p.item.cantidad_archivo : 0
              });
            } else {
              // Consolidar campos más recientes conservando no-nulos previos
              const mergedItem = {
                ...previo.base.item,
                ...p.item,
                codigo: p.item.codigo ?? previo.base.item.codigo,
                marca: p.item.marca ?? previo.base.item.marca,
                modelo: p.item.modelo ?? previo.base.item.modelo,
                costo_usd: p.item.costo_usd ?? previo.base.item.costo_usd,
                porcentaje_ganancia: p.item.porcentaje_ganancia ?? previo.base.item.porcentaje_ganancia,
                porcentaje_reventa: p.item.porcentaje_reventa ?? previo.base.item.porcentaje_reventa,
                precio_reventa: p.item.precio_reventa ?? previo.base.item.precio_reventa,
                precio_reventa_usd: p.item.precio_reventa_usd ?? previo.base.item.precio_reventa_usd,
                stock_minimo_update: p.item.stock_minimo_update ?? previo.base.item.stock_minimo_update,
                color: p.item.color ?? previo.base.item.color,
                rodado: p.item.rodado ?? previo.base.item.rodado,
                talle: p.item.talle ?? previo.base.item.talle
              };
              previo.base = {
                ...p,
                item: mergedItem,
                precioReventaArs: p.precioReventaArs ?? previo.base.precioReventaArs,
                idProvItem: p.idProvItem ?? previo.base.idProvItem
              };
              if (p.modoStock === 'reemplazar') {
                previo.ultimoReemplazo = p.item.cantidad_archivo;
                previo.deltaSumar = 0;
              } else {
                previo.deltaSumar += p.item.cantidad_archivo;
              }
            }
          } else {
            const claveCrear = construirClaveCrear(p.item);
            const idxPrev = indiceCrearPorClave.get(claveCrear);
            if (idxPrev === undefined) {
              indiceCrearPorClave.set(claveCrear, paraCrear.length);
              paraCrear.push(p);
            } else {
              const existenteCrear = paraCrear[idxPrev];
              if (existenteCrear) {
                const nuevaCant = p.modoStock === 'sumar'
                  ? existenteCrear.item.cantidad_archivo + p.item.cantidad_archivo
                  : p.item.cantidad_archivo;
                existenteCrear.item = {
                  ...existenteCrear.item,
                  ...p.item,
                  cantidad_archivo: nuevaCant,
                  codigo: p.item.codigo ?? existenteCrear.item.codigo,
                  marca: p.item.marca ?? existenteCrear.item.marca,
                  modelo: p.item.modelo ?? existenteCrear.item.modelo,
                  costo_usd: p.item.costo_usd ?? existenteCrear.item.costo_usd,
                  porcentaje_ganancia: p.item.porcentaje_ganancia ?? existenteCrear.item.porcentaje_ganancia,
                  porcentaje_reventa: p.item.porcentaje_reventa ?? existenteCrear.item.porcentaje_reventa,
                  precio_reventa_usd: p.item.precio_reventa_usd ?? existenteCrear.item.precio_reventa_usd,
                  stock_minimo: Math.max(existenteCrear.item.stock_minimo, p.item.stock_minimo),
                  color: p.item.color ?? existenteCrear.item.color,
                  rodado: p.item.rodado ?? existenteCrear.item.rodado,
                  talle: p.item.talle ?? existenteCrear.item.talle
                };
                existenteCrear.precioArs = p.precioArs;
                existenteCrear.precioReventaArs = p.precioReventaArs ?? existenteCrear.precioReventaArs;
                existenteCrear.idProvItem = p.idProvItem ?? existenteCrear.idProvItem;
                existenteCrear.nombreProvItem = p.nombreProvItem;
              }
            }
          }
        }

        const movimientosBatch: Array<{ id_producto: number; tipo: 'INGRESO' | 'EGRESO'; cantidad: number; obs: string }> = [];
        const bicisBatch: Array<{ id_producto: number; marca: string; color: string | null; rodado: string | null; talle: string | null; genero: string }> = [];

        if (paraCrear.length > 0) {
          const resBulkInsert = await client.query(
            `INSERT INTO Productos (codigo, nombre, marca, modelo, tipo_prod, cantidad, precio, moneda, precio_usd, costo_usd, porcentaje_ganancia, porcentaje_reventa, precio_reventa, precio_reventa_usd, id_proveedor, stock_minimo, activo)
             SELECT v.codigo, v.nombre, v.marca, v.modelo, v.tipo_prod, v.cantidad, v.precio, v.moneda, v.precio_usd, v.costo_usd, v.porcentaje_ganancia, v.porcentaje_reventa, v.precio_reventa, v.precio_reventa_usd, v.id_proveedor, v.stock_minimo, true
             FROM UNNEST(
               $1::varchar[], $2::varchar[], $3::varchar[], $4::varchar[], $5::varchar[],
               $6::int[], $7::numeric[], $8::varchar[], $9::numeric[],
               $10::numeric[], $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[], $15::int[], $16::int[]
             ) AS v(codigo, nombre, marca, modelo, tipo_prod, cantidad, precio, moneda, precio_usd, costo_usd, porcentaje_ganancia, porcentaje_reventa, precio_reventa, precio_reventa_usd, id_proveedor, stock_minimo)
             RETURNING id_producto;`,
            [
              paraCrear.map(x => x.item.codigo),
              paraCrear.map(x => x.item.nombre),
              paraCrear.map(x => x.item.marca),
              paraCrear.map(x => x.item.modelo),
              paraCrear.map(x => x.item.tipo_prod),
              paraCrear.map(x => x.item.cantidad_archivo),
              paraCrear.map(x => x.precioArs),
              paraCrear.map(x => x.item.moneda),
              paraCrear.map(x => x.item.precio_usd),
              paraCrear.map(x => x.item.costo_usd ?? null),
              paraCrear.map(x => x.item.porcentaje_ganancia ?? null),
              paraCrear.map(x => x.item.porcentaje_reventa ?? null),
              paraCrear.map(x => x.precioReventaArs ?? null),
              paraCrear.map(x => x.item.precio_reventa_usd ?? null),
              paraCrear.map(x => x.idProvItem),
              paraCrear.map(x => x.item.stock_minimo)
            ]
          );

          for (let idx = 0; idx < paraCrear.length; idx++) {
            const p = paraCrear[idx];
            const insertedRow = resBulkInsert.rows[idx];
            if (!p || !insertedRow) continue;
            const nuevoId = Number(insertedRow.id_producto);
            insertados++;
            if (p.item.cantidad_archivo > 0) {
              movimientosBatch.push({
                id_producto: nuevoId,
                tipo: 'INGRESO',
                cantidad: p.item.cantidad_archivo,
                obs: `Alta masiva (${p.nombreProvItem})`
              });
              unidadesIngresadas += p.item.cantidad_archivo;
            }
            if (p.item.tipo_prod === 'bicicleta') {
              bicisBatch.push({
                id_producto: nuevoId,
                marca: p.item.marca || 'Genérica',
                color: p.item.color,
                rodado: p.item.rodado,
                talle: p.item.talle,
                genero: p.item.genero || 'unisex'
              });
            }
          }
        }

        const actualizacionesUnicas = Array.from(mapaActualizar.entries()).sort((a, b) => a[0] - b[0]);
        if (actualizacionesUnicas.length > 0) {
          const idsAct = actualizacionesUnicas.map(([idProd]) => idProd);
          const resPrevAll = await client.query(
            `SELECT id_producto, cantidad FROM Productos WHERE id_producto = ANY($1::int[]) ORDER BY id_producto ASC FOR UPDATE;`,
            [idsAct]
          );
          const stockPrevMap = new Map<number, number>();
          for (const r of resPrevAll.rows) {
            stockPrevMap.set(Number(r.id_producto), Number(r.cantidad || 0));
          }

          const nuevosStocks = actualizacionesUnicas.map(([idProd, acc]) => {
            const prev = stockPrevMap.get(idProd) ?? 0;
            return acc.ultimoReemplazo !== null ? acc.ultimoReemplazo + acc.deltaSumar : prev + acc.deltaSumar;
          });

          const paraActualizar = actualizacionesUnicas.map(([, acc]) => acc.base);

          await client.query(
            `UPDATE Productos AS p
             SET codigo = COALESCE(v.codigo, p.codigo),
                 nombre = v.nombre,
                 marca = COALESCE(v.marca, p.marca),
                 modelo = COALESCE(v.modelo, p.modelo),
                 tipo_prod = v.tipo_prod,
                 cantidad = v.cantidad,
                 precio = v.precio,
                 moneda = v.moneda,
                 precio_usd = v.precio_usd,
                 costo_usd = COALESCE(v.costo_usd, p.costo_usd),
                 porcentaje_ganancia = COALESCE(v.porcentaje_ganancia, p.porcentaje_ganancia),
                 porcentaje_reventa = COALESCE(v.porcentaje_reventa, p.porcentaje_reventa),
                 precio_reventa = COALESCE(v.precio_reventa, p.precio_reventa),
                 precio_reventa_usd = CASE WHEN v.moneda = 'USD' THEN COALESCE(v.precio_reventa_usd, p.precio_reventa_usd) ELSE NULL END,
                 id_proveedor = COALESCE(v.id_proveedor, p.id_proveedor),
                 stock_minimo = COALESCE(v.stock_minimo, p.stock_minimo),
                 activo = true,
                 updated_at = CURRENT_TIMESTAMP
             FROM UNNEST(
               $1::int[], $2::varchar[], $3::varchar[], $4::varchar[], $5::varchar[], $6::varchar[],
               $7::int[], $8::numeric[], $9::varchar[], $10::numeric[],
               $11::numeric[], $12::numeric[], $13::numeric[], $14::numeric[], $15::numeric[], $16::int[], $17::int[]
             ) AS v(id_producto, codigo, nombre, marca, modelo, tipo_prod, cantidad, precio, moneda, precio_usd, costo_usd, porcentaje_ganancia, porcentaje_reventa, precio_reventa, precio_reventa_usd, id_proveedor, stock_minimo)
             WHERE p.id_producto = v.id_producto;`,
            [
              idsAct,
              paraActualizar.map(x => x.item.codigo),
              paraActualizar.map(x => x.item.nombre),
              paraActualizar.map(x => x.item.marca),
              paraActualizar.map(x => x.item.modelo),
              paraActualizar.map(x => x.item.tipo_prod),
              nuevosStocks,
              paraActualizar.map(x => x.precioArs),
              paraActualizar.map(x => x.item.moneda),
              paraActualizar.map(x => x.item.precio_usd),
              paraActualizar.map(x => x.item.costo_usd ?? null),
              paraActualizar.map(x => x.item.porcentaje_ganancia ?? null),
              paraActualizar.map(x => x.item.porcentaje_reventa ?? null),
              paraActualizar.map(x => x.precioReventaArs ?? null),
              paraActualizar.map(x => x.item.precio_reventa_usd ?? null),
              paraActualizar.map(x => x.idProvItem),
              paraActualizar.map(x => x.item.stock_minimo_update ?? null)
            ]
          );

          for (let idx = 0; idx < paraActualizar.length; idx++) {
            const p = paraActualizar[idx];
            const idProd = idsAct[idx];
            const nuevo = nuevosStocks[idx];
            if (!p || idProd === undefined || nuevo === undefined) continue;

            const prev = stockPrevMap.get(idProd) ?? 0;
            const delta = nuevo - prev;
            actualizados++;
            if (delta !== 0) {
              movimientosBatch.push({
                id_producto: idProd,
                tipo: delta > 0 ? 'INGRESO' : 'EGRESO',
                cantidad: Math.abs(delta),
                obs: `Actualización masiva (${p.nombreProvItem}): ${prev} -> ${nuevo} un.`
              });
              if (delta > 0) unidadesIngresadas += delta;
            }
            if (p.item.tipo_prod === 'bicicleta') {
              bicisBatch.push({
                id_producto: idProd,
                marca: p.item.marca || 'Genérica',
                color: p.item.color,
                rodado: p.item.rodado,
                talle: p.item.talle,
                genero: p.item.genero || 'unisex'
              });
            }
          }
        }

        if (movimientosBatch.length > 0) {
          await client.query(
            `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
             SELECT v.id_producto, $1, v.tipo, v.cantidad, 'Carga Masiva', v.obs
             FROM UNNEST($2::int[], $3::varchar[], $4::int[], $5::text[]) AS v(id_producto, tipo, cantidad, obs);`,
            [
              idOp,
              movimientosBatch.map(m => m.id_producto),
              movimientosBatch.map(m => m.tipo),
              movimientosBatch.map(m => m.cantidad),
              movimientosBatch.map(m => m.obs)
            ]
          );
        }

        if (bicisBatch.length > 0) {
          await client.query(
            `INSERT INTO Producto_BiciNueva (id_producto, marca, color, rodado, talle, genero)
             SELECT * FROM UNNEST($1::int[], $2::varchar[], $3::varchar[], $4::varchar[], $5::varchar[], $6::varchar[])
             ON CONFLICT (id_producto) DO UPDATE
             SET marca = COALESCE(NULLIF(EXCLUDED.marca, 'Genérica'), Producto_BiciNueva.marca),
                 color = COALESCE(EXCLUDED.color, Producto_BiciNueva.color),
                 rodado = COALESCE(EXCLUDED.rodado, Producto_BiciNueva.rodado),
                 talle = COALESCE(EXCLUDED.talle, Producto_BiciNueva.talle),
                 genero = COALESCE(EXCLUDED.genero, Producto_BiciNueva.genero);`,
            [
              bicisBatch.map(b => b.id_producto),
              bicisBatch.map(b => b.marca),
              bicisBatch.map(b => b.color),
              bicisBatch.map(b => b.rodado),
              bicisBatch.map(b => b.talle),
              bicisBatch.map(b => b.genero)
            ]
          );
        }
      } else {
        for (let i = 0; i < preview.items.length; i++) {
          const { item, modoStock, idProvItem, nombreProvItem, precioArs, precioReventaArs } = prepararItem(i);
          let idProductoFinal: number;

          if (item.accion === 'ACTUALIZAR' && item.id_producto_existente) {
            const resPrev = await client.query('SELECT cantidad FROM Productos WHERE id_producto = $1 FOR UPDATE;', [item.id_producto_existente]);
            const stockPrev = Number(resPrev.rows[0]?.cantidad || 0);
            const stockNuevo = modoStock === 'sumar' ? stockPrev + item.cantidad_archivo : item.cantidad_archivo;
            const delta = stockNuevo - stockPrev;

            await client.query(
              `UPDATE Productos
               SET codigo = COALESCE($1, codigo),
                   nombre = $2,
                   marca = COALESCE($3, marca),
                   modelo = COALESCE($4, modelo),
                   tipo_prod = $5,
                   cantidad = $6,
                   precio = $7,
                   moneda = $8,
                   precio_usd = $9,
                   costo_usd = COALESCE($10, costo_usd),
                   porcentaje_ganancia = COALESCE($11, porcentaje_ganancia),
                   porcentaje_reventa = COALESCE($12, porcentaje_reventa),
                   precio_reventa = COALESCE($13, precio_reventa),
                   precio_reventa_usd = CASE WHEN $8 = 'USD' THEN COALESCE($14, precio_reventa_usd) ELSE NULL END,
                   id_proveedor = COALESCE($15, id_proveedor),
                   stock_minimo = COALESCE($16, stock_minimo),
                   activo = true,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id_producto = $17;`,
              [
                item.codigo,
                item.nombre,
                item.marca,
                item.modelo,
                item.tipo_prod,
                stockNuevo,
                precioArs,
                item.moneda,
                item.precio_usd,
                item.costo_usd,
                item.porcentaje_ganancia,
                item.porcentaje_reventa,
                precioReventaArs,
                item.precio_reventa_usd,
                idProvItem,
                item.stock_minimo_update,
                item.id_producto_existente
              ]
            );

            idProductoFinal = item.id_producto_existente;
            actualizados++;

            if (delta !== 0) {
              const tipoMov = delta > 0 ? 'INGRESO' : 'EGRESO';
              await client.query(
                `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
                 VALUES ($1, $2, $3, $4, 'Carga Masiva', $5);`,
                [idProductoFinal, idOp, tipoMov, Math.abs(delta), `Actualización masiva (${nombreProvItem}): ${stockPrev} -> ${stockNuevo} un.`]
              );
              if (delta > 0) unidadesIngresadas += delta;
            }
          } else {
            const resInsert = await client.query(
              `INSERT INTO Productos (codigo, nombre, marca, modelo, tipo_prod, cantidad, precio, moneda, precio_usd, costo_usd, porcentaje_ganancia, porcentaje_reventa, precio_reventa, precio_reventa_usd, id_proveedor, stock_minimo, activo)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true)
               RETURNING id_producto;`,
              [
                item.codigo,
                item.nombre,
                item.marca,
                item.modelo,
                item.tipo_prod,
                item.cantidad_archivo,
                precioArs,
                item.moneda,
                item.precio_usd,
                item.costo_usd,
                item.porcentaje_ganancia,
                item.porcentaje_reventa,
                precioReventaArs,
                item.precio_reventa_usd,
                idProvItem,
                item.stock_minimo
              ]
            );

            idProductoFinal = resInsert.rows[0].id_producto;
            insertados++;

            if (item.cantidad_archivo > 0) {
              await client.query(
                `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
                 VALUES ($1, $2, 'INGRESO', $3, 'Carga Masiva', $4);`,
                [idProductoFinal, idOp, item.cantidad_archivo, `Alta masiva (${nombreProvItem})`]
              );
              unidadesIngresadas += item.cantidad_archivo;
            }
          }

          if (item.tipo_prod === 'bicicleta') {
            await client.query(
              `INSERT INTO Producto_BiciNueva (id_producto, marca, color, rodado, talle, genero)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (id_producto) DO UPDATE
               SET marca = COALESCE(NULLIF(EXCLUDED.marca, 'Genérica'), Producto_BiciNueva.marca),
                   color = COALESCE(EXCLUDED.color, Producto_BiciNueva.color),
                   rodado = COALESCE(EXCLUDED.rodado, Producto_BiciNueva.rodado),
                   talle = COALESCE(EXCLUDED.talle, Producto_BiciNueva.talle),
                   genero = COALESCE(EXCLUDED.genero, Producto_BiciNueva.genero);`,
              [
                idProductoFinal,
                item.marca || 'Genérica',
                item.color,
                item.rodado,
                item.talle,
                item.genero || 'unisex'
              ]
            );
          }
        }
      }

      // Declaración de pago (total, parcial o agendado) integrada en la misma transacción
      let pagoRegistrado: any = null;
      let pagoPendiente: any = null;
      if (datos.pago?.registrar && idProveedorFinal) {
        const monedaPagoNorm = String(datos.pago.moneda || 'ARS').trim().toUpperCase() === 'USD' ? 'USD' : 'ARS';
        const montoPagadoOrigen = monedaPagoNorm === 'USD'
          ? redondear2(Math.max(0, Number(datos.pago.monto_usd ?? datos.pago.monto_total) || 0))
          : redondear2(Math.max(0, Number(datos.pago.monto_total) || 0));
        const montoFacturaOrigen = datos.pago.monto_factura_total !== undefined && datos.pago.monto_factura_total !== ''
          ? redondear2(Number(datos.pago.monto_factura_total) || 0)
          : montoPagadoOrigen;

        if (montoPagadoOrigen <= 0 && montoFacturaOrigen <= 0) {
          throw new BadRequestError('Ingresá un monto de pago o el total de la factura mayor a 0.');
        }

        if (montoFacturaOrigen > 0 && montoPagadoOrigen > montoFacturaOrigen) {
          throw new BadRequestError('El monto pagado no puede superar el total de la factura.');
        }

        const saldoPendienteCalc = montoFacturaOrigen > montoPagadoOrigen
          ? redondear2(montoFacturaOrigen - montoPagadoOrigen)
          : 0;

        if (saldoPendienteCalc > 0 && !datos.pago.fecha_proximo_pago) {
          throw new BadRequestError('Como el pago es parcial (queda saldo pendiente), debés agendar la fecha del próximo pago.');
        }

        const obsBase = datos.pago.observaciones?.trim()
          || (datos.pago.numero_factura
            ? `Factura Nº ${datos.pago.numero_factura}${datos.pago.fecha_factura ? ` - Fecha ${datos.pago.fecha_factura}` : ''}`
            : `Pago vinculado a carga masiva (${insertados} nuevos, ${actualizados} actualizados)`);

        const cotPagoEfectiva = mapaProveedores.get(nombreProveedorFinal.toLowerCase())?.cotizacion ?? cotizacion;

        if (montoPagadoOrigen > 0) {
          const obsConTipo = saldoPendienteCalc > 0 ? `${obsBase} (Pago parcial)` : obsBase;
          pagoRegistrado = await PagoProveedorService.crearPago(
            {
              id_proveedor: idProveedorFinal,
              id_metodo_pago: datos.pago.id_metodo_pago,
              monto_total: datos.pago.monto_total,
              moneda: monedaPagoNorm,
              monto_usd: datos.pago.monto_usd,
              cotizacion_dolar: cotPagoEfectiva,
              observaciones: obsConTipo,
              idUsuarioOperador: idOp,
              nombreUsuarioOperador: nombreUsuarioOperador
            },
            client
          );
        }

        if (saldoPendienteCalc > 0 && datos.pago.fecha_proximo_pago) {
          pagoPendiente = await PagoProveedorService.crearPagoPendiente(
            {
              id_proveedor: idProveedorFinal,
              id_pago_inicial: pagoRegistrado?.id_pago ?? null,
              numero_factura: datos.pago.numero_factura,
              fecha_factura: datos.pago.fecha_factura,
              monto_factura_total: montoFacturaOrigen,
              monto_pagado: montoPagadoOrigen,
              saldo_pendiente: saldoPendienteCalc,
              moneda: monedaPagoNorm,
              fecha_proximo_pago: datos.pago.fecha_proximo_pago,
              observaciones: obsBase,
              idUsuarioOperador: idOp,
              nombreUsuarioOperador: nombreUsuarioOperador
            },
            client
          );
        }
      }

      // Auditoría obligatoria de la carga masiva
      const formato = (datos.origen_formato || 'archivo').toUpperCase();
      const monedaLote = String(datos.moneda_lote || 'ARS').toUpperCase();
      const detallePago = pagoRegistrado ? ` Pago #${pagoRegistrado.id_pago} declarado por $${Number(pagoRegistrado.monto_total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}.` : '';
      const detallePendiente = pagoPendiente
        ? ` Saldo pendiente de ${monedaLote === 'USD' && pagoPendiente.moneda === 'USD' ? 'USD ' : '$'}${Number(pagoPendiente.saldo_pendiente).toLocaleString('es-AR', { minimumFractionDigits: 2 })} agendado para el ${pagoPendiente.fecha_proximo_pago}.`
        : '';

      await client.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Stock', 'Carga Masiva de Productos', $3);`,
        [
          idOp,
          String(nombreUsuarioOperador || 'Administrador').trim().slice(0, 50),
          `Carga masiva (${formato}, moneda lote ${monedaLote}) para proveedor "${nombreProveedorFinal}": ${insertados} producto(s) nuevo(s), ${actualizados} actualizado(s), ${unidadesIngresadas} unidad(es) ingresadas.${detallePago}${detallePendiente}`
        ]
      );

      await client.query('COMMIT');

      return {
        message: 'Carga masiva procesada exitosamente',
        proveedor: { id_proveedor: idProveedorFinal, nombre_empresa: nombreProveedorFinal },
        insertados,
        actualizados,
        unidades_ingresadas: unidadesIngresadas,
        pago: pagoRegistrado,
        pago_pendiente: pagoPendiente
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Aplica un aumento (o descuento) masivo a todos los productos de un proveedor.
   * Regla confirmada:
   * - Productos en USD: modifica precio_usd primero y recalcula precio en ARS con la cotización vigente.
   * - Productos en ARS: modifica precio en ARS directamente.
   * - Sin redondeo adicional (precisión exacta a 2 decimales).
   */
  static async aumentoMasivoPorProveedor(
    datos: DatosAumentoMasivo,
    operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }
  ) {
    const { id_proveedor, tipo_ajuste, valor, filtro_tipo_prod, filtro_moneda, solo_activos = true, preview = false } = datos;
    const esTodos = String(id_proveedor || '').trim().toLowerCase() === 'todos';
    const idProv = esTodos ? null : validarId(id_proveedor, 'Seleccioná un proveedor válido.');

    if (!['porcentaje', 'monto_fijo'].includes(String(tipo_ajuste))) {
      throw new BadRequestError('El tipo de ajuste debe ser porcentaje o monto_fijo.');
    }

    const valorNum = Number(valor);
    if (isNaN(valorNum) || !isFinite(valorNum) || valorNum === 0) {
      throw new BadRequestError('Ingresá un valor de ajuste distinto de 0.');
    }
    if (tipo_ajuste === 'porcentaje' && valorNum <= -100) {
      throw new BadRequestError('El porcentaje de descuento no puede ser menor o igual al -100%.');
    }

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;
    const idOp = Number(idUsuarioOperador);
    if (!preview && (!idUsuarioOperador || isNaN(idOp) || idOp <= 0)) {
      throw new UnauthorizedError('No se pudo identificar al administrador que aplica el aumento.');
    }

    const client = await pool.connect();
    try {
      if (!preview) {
        await client.query('BEGIN');
      }

      let proveedor: { id_proveedor: number | null; nombre_empresa: string; cotizacion_dolar?: number | string | null } = {
        id_proveedor: null,
        nombre_empresa: 'Todos los proveedores'
      };
      if (!esTodos && idProv !== null) {
        const resProv = await client.query('SELECT id_proveedor, nombre_empresa, cotizacion_dolar FROM Proveedor WHERE id_proveedor = $1;', [idProv]);
        if (resProv.rowCount === 0) {
          throw new NotFoundError('El proveedor seleccionado no existe.');
        }
        proveedor = resProv.rows[0];
      }

      const cotizacionGlobal = await obtenerCotizacionActual(client);
      const cotizacion = proveedor.cotizacion_dolar ? Number(proveedor.cotizacion_dolar) : cotizacionGlobal;

      const whereClauses: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      if (!esTodos && idProv !== null) {
        whereClauses.push(`p.id_proveedor = $${pIdx}`);
        params.push(idProv);
        pIdx++;
      }
      if (solo_activos) {
        whereClauses.push(`p.activo = true`);
      }
      if (filtro_tipo_prod && filtro_tipo_prod !== 'todos') {
        whereClauses.push(`LOWER(p.tipo_prod) = LOWER($${pIdx})`);
        params.push(filtro_tipo_prod.trim());
        pIdx++;
      }
      if (filtro_moneda && String(filtro_moneda).trim() && String(filtro_moneda).trim().toLowerCase() !== 'todos') {
        const monedaFiltroNorm = String(filtro_moneda).trim().toUpperCase();
        if (!['ARS', 'USD'].includes(monedaFiltroNorm)) {
          throw new BadRequestError('El filtro de moneda debe ser ARS, USD o todos.');
        }
        whereClauses.push(`p.moneda = $${pIdx}`);
        params.push(monedaFiltroNorm);
        pIdx++;
      }

      let querySelect = esTodos
        ? `
          SELECT p.id_producto, p.nombre, p.marca, p.modelo, p.tipo_prod, p.precio, p.moneda, p.precio_usd, p.costo_usd, p.porcentaje_ganancia, p.porcentaje_reventa, p.precio_reventa, p.precio_reventa_usd, p.activo,
                 pr.cotizacion_dolar AS proveedor_cotizacion_dolar
          FROM Productos p
          LEFT JOIN Proveedor pr ON p.id_proveedor = pr.id_proveedor
        `
        : `
          SELECT id_producto, nombre, marca, modelo, tipo_prod, precio, moneda, precio_usd, costo_usd, porcentaje_ganancia, porcentaje_reventa, precio_reventa, precio_reventa_usd, activo
          FROM Productos p
        `;

      if (whereClauses.length > 0) {
        querySelect += ` WHERE ` + whereClauses.join(' AND ');
      }
      querySelect += ` ORDER BY p.id_producto ASC`;
      if (!preview) {
        querySelect += esTodos ? ` FOR UPDATE OF p` : ` FOR UPDATE`;
      }

      const resProductos = await client.query(querySelect, params);
      const productos = resProductos.rows;

      if (productos.length === 0) {
        throw new NotFoundError(
          esTodos
            ? 'No se encontraron productos activos con los filtros seleccionados.'
            : 'No se encontraron productos asignados a ese proveedor con los filtros seleccionados.'
        );
      }

      if (tipo_ajuste === 'monto_fijo') {
        const monedasPresentes = new Set(productos.map(p => (p.moneda === 'USD' ? 'USD' : 'ARS')));
        if (monedasPresentes.size > 1) {
          throw new BadRequestError('Para aplicar un aumento por monto fijo debés filtrar por una única moneda (solo ARS o solo USD).');
        }
      }

      let countUsd = 0;
      let countArs = 0;

      const itemsCalculados = productos.map(prod => {
        const monedaProd: 'ARS' | 'USD' = prod.moneda === 'USD' ? 'USD' : 'ARS';
        const precioArsActual = Number(prod.precio) || 0;
        const precioUsdActual = prod.precio_usd !== null && prod.precio_usd !== undefined ? Number(prod.precio_usd) : null;
        const costoActual = prod.costo_usd !== null && prod.costo_usd !== undefined ? Number(prod.costo_usd) : null;

        const gananciaFactor = normalizarPorcentajeFactor(prod.porcentaje_ganancia);
        const reventaFactor = normalizarPorcentajeFactor(prod.porcentaje_reventa);
        const precioReventaActual = prod.precio_reventa !== null && prod.precio_reventa !== undefined ? Number(prod.precio_reventa) : null;
        const precioReventaUsdActual = prod.precio_reventa_usd !== null && prod.precio_reventa_usd !== undefined ? Number(prod.precio_reventa_usd) : null;

        let nuevoCosto: number | null = costoActual;
        if (costoActual !== null && costoActual > 0) {
          nuevoCosto = tipo_ajuste === 'porcentaje'
            ? redondear2(costoActual * (1 + valorNum / 100))
            : redondear2(costoActual + valorNum);

          if (nuevoCosto < 0) {
            throw new BadRequestError(`El producto "${prod.nombre}" quedaría con costo negativo (${nuevoCosto}).`);
          }
          if (nuevoCosto > 99999999.99) {
            throw new BadRequestError(`El producto "${prod.nombre}" superaría el límite máximo de costo.`);
          }
        }

        let nuevoPrecioUsd: number | null = precioUsdActual;
        let nuevoPrecioArs = precioArsActual;
        let nuevoPrecioReventaUsd: number | null = precioReventaUsdActual;
        let nuevoPrecioReventaArs: number | null = precioReventaActual;

        if (monedaProd === 'USD') {
          const baseUsd = precioUsdActual ?? 0;
          if (nuevoCosto !== null && nuevoCosto > 0 && gananciaFactor !== null) {
            nuevoPrecioUsd = redondear2(nuevoCosto * (1 + gananciaFactor));
          } else {
            nuevoPrecioUsd = tipo_ajuste === 'porcentaje'
              ? redondear2(baseUsd * (1 + valorNum / 100))
              : redondear2(baseUsd + valorNum);
          }

          if (nuevoPrecioUsd < 0) {
            throw new BadRequestError(`El producto "${prod.nombre}" quedaría con precio en USD negativo (${nuevoPrecioUsd}).`);
          }
          if (nuevoPrecioUsd > 99999999.99) {
            throw new BadRequestError(`El producto "${prod.nombre}" superaría el límite máximo de precio.`);
          }

          const cotEfectivaProd = esTodos
            ? (prod.proveedor_cotizacion_dolar ? Number(prod.proveedor_cotizacion_dolar) : cotizacionGlobal)
            : cotizacion;
          nuevoPrecioArs = redondear2(nuevoPrecioUsd * cotEfectivaProd);
          if (nuevoPrecioArs > 99999999.99) {
            throw new BadRequestError(`El producto "${prod.nombre}" superaría el límite máximo de precio en ARS ($99.999.999,99).`);
          }

          if (nuevoCosto !== null && nuevoCosto > 0 && reventaFactor !== null) {
            nuevoPrecioReventaUsd = redondear2(nuevoCosto * (1 + reventaFactor));
            nuevoPrecioReventaArs = redondear2(nuevoPrecioReventaUsd * cotEfectivaProd);
          } else if (precioReventaUsdActual !== null) {
            nuevoPrecioReventaUsd = tipo_ajuste === 'porcentaje'
              ? redondear2(precioReventaUsdActual * (1 + valorNum / 100))
              : redondear2(precioReventaUsdActual + valorNum);
            if (nuevoPrecioReventaUsd < 0) {
              throw new BadRequestError(`El producto "${prod.nombre}" quedaría con precio de reventa en USD negativo (${nuevoPrecioReventaUsd}).`);
            }
            nuevoPrecioReventaArs = redondear2(nuevoPrecioReventaUsd * cotEfectivaProd);
          }

          if (nuevoPrecioReventaUsd !== null && nuevoPrecioReventaUsd > 99999999.99) {
            throw new BadRequestError(`El producto "${prod.nombre}" superaría el límite máximo de reventa en USD.`);
          }
          if (nuevoPrecioReventaArs !== null && nuevoPrecioReventaArs > 99999999.99) {
            throw new BadRequestError(`El producto "${prod.nombre}" superaría el límite máximo de reventa en ARS.`);
          }
          countUsd++;
        } else {
          if (nuevoCosto !== null && nuevoCosto > 0 && gananciaFactor !== null) {
            nuevoPrecioArs = redondear2(nuevoCosto * (1 + gananciaFactor));
          } else {
            nuevoPrecioArs = tipo_ajuste === 'porcentaje'
              ? redondear2(precioArsActual * (1 + valorNum / 100))
              : redondear2(precioArsActual + valorNum);
          }

          if (nuevoPrecioArs < 0) {
            throw new BadRequestError(`El producto "${prod.nombre}" quedaría con precio en ARS negativo (${nuevoPrecioArs}).`);
          }
          if (nuevoPrecioArs > 99999999.99) {
            throw new BadRequestError(`El producto "${prod.nombre}" superaría el límite máximo de precio.`);
          }

          if (nuevoCosto !== null && nuevoCosto > 0 && reventaFactor !== null) {
            nuevoPrecioReventaArs = redondear2(nuevoCosto * (1 + reventaFactor));
          } else if (precioReventaActual !== null) {
            nuevoPrecioReventaArs = tipo_ajuste === 'porcentaje'
              ? redondear2(precioReventaActual * (1 + valorNum / 100))
              : redondear2(precioReventaActual + valorNum);
            if (nuevoPrecioReventaArs < 0) {
              throw new BadRequestError(`El producto "${prod.nombre}" quedaría con precio de reventa en ARS negativo (${nuevoPrecioReventaArs}).`);
            }
          }

          if (nuevoPrecioReventaArs !== null && nuevoPrecioReventaArs > 99999999.99) {
            throw new BadRequestError(`El producto "${prod.nombre}" superaría el límite máximo de reventa en ARS.`);
          }
          countArs++;
        }

        return {
          id_producto: prod.id_producto,
          nombre: prod.nombre,
          marca: prod.marca,
          modelo: prod.modelo,
          tipo_prod: prod.tipo_prod,
          moneda: monedaProd,
          costo_actual: costoActual,
          costo_nuevo: nuevoCosto,
          porcentaje_ganancia: gananciaFactor,
          precio_usd_actual: precioUsdActual,
          precio_usd_nuevo: nuevoPrecioUsd,
          precio_ars_actual: precioArsActual,
          precio_ars_nuevo: nuevoPrecioArs,
          precio_reventa_nuevo: nuevoPrecioReventaArs,
          precio_reventa_usd_nuevo: nuevoPrecioReventaUsd
        };
      });

      if (preview) {
        return {
          preview: true,
          proveedor,
          cotizacion_dolar: cotizacion,
          total_afectados: itemsCalculados.length,
          resumen_moneda: { usd: countUsd, ars: countArs },
          items: itemsCalculados
        };
      }

      if (itemsCalculados.length <= 5) {
        for (const item of itemsCalculados) {
          await client.query(
            `UPDATE Productos
             SET precio = $1,
                 precio_usd = $2,
                 costo_usd = COALESCE($3, costo_usd),
                 precio_reventa = COALESCE($4, precio_reventa),
                 precio_reventa_usd = COALESCE($5, precio_reventa_usd),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id_producto = $6;`,
            [item.precio_ars_nuevo, item.precio_usd_nuevo, item.costo_nuevo, item.precio_reventa_nuevo, item.precio_reventa_usd_nuevo, item.id_producto]
          );
        }
      } else {
        await client.query(
          `UPDATE Productos AS p
           SET precio = v.precio_ars,
               precio_usd = v.precio_usd,
               costo_usd = COALESCE(v.costo_usd, p.costo_usd),
               precio_reventa = COALESCE(v.precio_reventa, p.precio_reventa),
               precio_reventa_usd = COALESCE(v.precio_reventa_usd, p.precio_reventa_usd),
               updated_at = CURRENT_TIMESTAMP
           FROM (
             SELECT * FROM UNNEST(
               $1::int[],
               $2::numeric[],
               $3::numeric[],
               $4::numeric[],
               $5::numeric[],
               $6::numeric[]
             ) AS u(id_producto, precio_ars, precio_usd, costo_usd, precio_reventa, precio_reventa_usd)
           ) AS v
           WHERE p.id_producto = v.id_producto;`,
          [
            itemsCalculados.map(x => x.id_producto),
            itemsCalculados.map(x => x.precio_ars_nuevo),
            itemsCalculados.map(x => x.precio_usd_nuevo),
            itemsCalculados.map(x => x.costo_nuevo),
            itemsCalculados.map(x => x.precio_reventa_nuevo),
            itemsCalculados.map(x => x.precio_reventa_usd_nuevo)
          ]
        );
      }

      const etiquetaValor = tipo_ajuste === 'porcentaje'
        ? `${valorNum > 0 ? '+' : ''}${valorNum}%`
        : `${valorNum > 0 ? '+' : ''}$${valorNum}`;

      const descripcionAuditoria = esTodos
        ? `Ajuste masivo GLOBAL (${etiquetaValor}) aplicado a ${itemsCalculados.length} producto(s) de todo el catálogo: ${countUsd} en USD (respetando cotización de cada proveedor) y ${countArs} en ARS.`
        : `Ajuste masivo (${etiquetaValor}) aplicado a ${itemsCalculados.length} producto(s) de "${proveedor.nombre_empresa}" (ID #${proveedor.id_proveedor}): ${countUsd} en USD (cotización $${cotizacion.toLocaleString('es-AR', { minimumFractionDigits: 2 })}) y ${countArs} en ARS.`;

      await client.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Proveedores', 'Aumento Masivo de Precios', $3);`,
        [
          idOp,
          String(nombreUsuarioOperador || 'Administrador').trim().slice(0, 50),
          descripcionAuditoria
        ]
      );

      await client.query('COMMIT');

      return {
        preview: false,
        message: esTodos
          ? `Se actualizaron ${itemsCalculados.length} producto(s) de todo el catálogo (${etiquetaValor}).`
          : `Se actualizaron ${itemsCalculados.length} producto(s) de ${proveedor.nombre_empresa}.`,
        proveedor,
        cotizacion_dolar: cotizacion,
        total_afectados: itemsCalculados.length,
        resumen_moneda: { usd: countUsd, ars: countArs },
        items: itemsCalculados
      };
    } catch (error) {
      if (!preview) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
