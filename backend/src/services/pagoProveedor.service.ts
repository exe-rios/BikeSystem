import { pool } from '../config/db.js';
import type { PoolClient } from 'pg';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { validarId, validarMontoDecimal } from '../utils/validation.js';
import { normalizarPaginacion, aplicarPaginacionSQL, calcularMetaPaginacion } from '../utils/pagination.js';

export interface DatosPagoPendiente {
  id_proveedor: number;
  id_pago_inicial?: number | null | undefined;
  numero_factura?: string | undefined;
  fecha_factura?: string | undefined;
  monto_factura_total: number | string;
  monto_pagado?: number | string | undefined;
  saldo_pendiente: number | string;
  moneda?: 'ARS' | 'USD' | string | undefined;
  fecha_proximo_pago: string;
  observaciones?: string | undefined;
  idUsuarioOperador?: number | undefined;
  nombreUsuarioOperador?: string | undefined;
}

export interface DatosAbonoPendiente {
  id_metodo_pago: number;
  monto_abono: number | string;
  cotizacion_dolar?: number | string | undefined;
  nueva_fecha_proximo_pago?: string | undefined;
  observaciones?: string | undefined;
  idUsuarioOperador?: number | undefined;
  nombreUsuarioOperador?: string | undefined;
}

const validarFechaIso = (fechaStr: string, mensajeError: string): string => {
  const limpio = String(fechaStr || '').trim();
  const match = limpio.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new BadRequestError(mensajeError);
  }
  const yyyy = Number(match[1]);
  const mm = Number(match[2]);
  const dd = Number(match[3]);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (isNaN(d.getTime()) || d.getUTCFullYear() !== yyyy || d.getUTCMonth() + 1 !== mm || d.getUTCDate() !== dd) {
    throw new BadRequestError(mensajeError);
  }
  return limpio;
};

const redondear2 = (n: number): number => Math.round(n * 100) / 100;

export interface DatosPagoProveedor {
  id_proveedor?: number | undefined;
  nombre_proveedor?: string | undefined;
  id_metodo_pago: number;
  monto_total: number | string;
  moneda?: 'ARS' | 'USD' | string | undefined;
  monto_usd?: number | string | undefined;
  cotizacion_dolar?: number | string | undefined;
  observaciones?: string | undefined;
  idUsuarioOperador?: number | undefined;
  nombreUsuarioOperador?: string | undefined;
}

/** Servicio para el registro contable y control de egresos a proveedores. */
export class PagoProveedorService {
  /** Obtiene el catálogo de formas de pago disponibles en el sistema. */
  static async obtenerMetodosPago() {
    const query = 'SELECT * FROM Metodo_Pago ORDER BY id_metodo_pago ASC;';
    const result = await pool.query(query);
    return result.rows;
  }

  /** Obtiene el historial de pagos a proveedores con totales acumulados y paginación. */
  static async obtenerPagos(filtros?: string | { 
    busqueda?: string | undefined;
    limite?: number | string | undefined;
    pagina?: number | string | undefined;
  }) {
    let busqueda: string | undefined;
    let limite: number | string | undefined;
    let pagina: number | string | undefined;

    if (typeof filtros === 'string') {
      busqueda = filtros;
    } else if (filtros) {
      busqueda = filtros.busqueda;
      limite = filtros.limite;
      pagina = filtros.pagina;
    }

    let query = `
      SELECT 
        p.id_pago,
        p.id_proveedor,
        prov.nombre_empresa AS proveedor_nombre,
        p.id_usuario,
        u.nombre_usuario AS usuario_nombre,
        p.id_metodo_pago,
        mp.nombre AS metodo_pago_nombre,
        p.fecha,
        p.monto_total,
        p.moneda,
        p.monto_usd,
        p.cotizacion_dolar,
        p.observaciones,
        COUNT(*) OVER()::INT AS total_registros
      FROM Pago_Proveedor p
      LEFT JOIN Proveedor prov ON p.id_proveedor = prov.id_proveedor
      INNER JOIN Usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN Metodo_Pago mp ON p.id_metodo_pago = mp.id_metodo_pago
    `;

    const params: any[] = [];
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query += ` WHERE (
        prov.nombre_empresa ILIKE $1 OR 
        mp.nombre ILIKE $1 OR 
        u.nombre_usuario ILIKE $1 OR 
        p.observaciones ILIKE $1 OR 
        CAST(p.id_pago AS TEXT) ILIKE $1
      )`;
      params.push(term);
    }

    const whereParams = [...params];
    const whereSql = busqueda && typeof busqueda === 'string' && busqueda.trim()
      ? ` WHERE (
        prov.nombre_empresa ILIKE $1 OR 
        mp.nombre ILIKE $1 OR 
        u.nombre_usuario ILIKE $1 OR 
        p.observaciones ILIKE $1 OR 
        CAST(p.id_pago AS TEXT) ILIKE $1
      )`
      : '';

    query += ` ORDER BY p.id_pago DESC`;

    const paginacion = normalizarPaginacion({ limite, pagina }, { opcional: true });
    query = aplicarPaginacionSQL(query, params, paginacion);

    const queryTotalMonto = `
      SELECT COALESCE(SUM(p.monto_total), 0)::numeric AS total_monto
      FROM Pago_Proveedor p
      LEFT JOIN Proveedor prov ON p.id_proveedor = prov.id_proveedor
      INNER JOIN Usuario u ON p.id_usuario = u.id_usuario
      LEFT JOIN Metodo_Pago mp ON p.id_metodo_pago = mp.id_metodo_pago
      ${whereSql};
    `;

    const [resultPagos, resultTotal] = await Promise.all([
      pool.query(query, params),
      pool.query(queryTotalMonto, whereParams)
    ]);

    const total = resultPagos.rows.length > 0 ? Number(resultPagos.rows[0].total_registros) : 0;
    const meta = calcularMetaPaginacion(total, paginacion);
    const pagos = resultPagos.rows.map(({ total_registros, ...p }) => p);

    return {
      ...meta,
      total_monto: Number(resultTotal.rows[0]?.total_monto || 0),
      pagos
    };
  }

  /** Registra un nuevo egreso monetario a un proveedor (utilizable dentro o fuera de una transacción). */
  static async crearPago(datos: DatosPagoProveedor, txClient?: PoolClient): Promise<any> {
    const usaTransaccionPropia =
      !txClient &&
      typeof datos.nombre_proveedor === 'string' &&
      datos.nombre_proveedor.trim().length > 0;

    if (usaTransaccionPropia) {
      const ownClient = await pool.connect();
      try {
        await ownClient.query('BEGIN');
        const pagoCreado = await this.crearPago(datos, ownClient);
        await ownClient.query('COMMIT');
        return pagoCreado;
      } catch (err) {
        await ownClient.query('ROLLBACK');
        throw err;
      } finally {
        ownClient.release();
      }
    }

    const db = txClient || pool;
    const {
      id_proveedor,
      nombre_proveedor,
      id_metodo_pago,
      monto_total,
      moneda,
      monto_usd,
      cotizacion_dolar,
      observaciones,
      idUsuarioOperador,
      nombreUsuarioOperador
    } = datos;

    const idOperadorNum = Number(idUsuarioOperador);
    if (!idUsuarioOperador || isNaN(idOperadorNum) || idOperadorNum <= 0) {
      throw new UnauthorizedError('No se pudo identificar al usuario que registra el pago.');
    }

    if ((!id_proveedor && !nombre_proveedor) || !id_metodo_pago) {
      throw new BadRequestError('Completá el proveedor y el método de pago.');
    }

    const monedaLimpia = String(moneda || 'ARS').trim().toUpperCase();
    if (!['ARS', 'USD'].includes(monedaLimpia)) {
      throw new BadRequestError('La moneda del pago debe ser ARS o USD.');
    }

    let proveedorIdFinal = id_proveedor;
    let nombreProveedorFinal = '';
    let proveedorCotizacionDolar: number | null = null;

    if (nombre_proveedor && typeof nombre_proveedor === 'string' && nombre_proveedor.trim()) {
      const nombreLimpio = nombre_proveedor.trim().slice(0, 70);

      const queryBuscar = 'SELECT id_proveedor, nombre_empresa, cotizacion_dolar FROM Proveedor WHERE LOWER(nombre_empresa) = LOWER($1);';
      const resBuscar = await db.query(queryBuscar, [nombreLimpio]);

      if (resBuscar.rowCount && resBuscar.rowCount > 0) {
        proveedorIdFinal = resBuscar.rows[0].id_proveedor;
        nombreProveedorFinal = resBuscar.rows[0].nombre_empresa;
        proveedorCotizacionDolar = resBuscar.rows[0].cotizacion_dolar ? Number(resBuscar.rows[0].cotizacion_dolar) : null;
      } else {
        const queryCrearProv = 'INSERT INTO Proveedor (nombre_empresa) VALUES ($1) RETURNING id_proveedor, nombre_empresa;';
        const resCrear = await db.query(queryCrearProv, [nombreLimpio]);
        proveedorIdFinal = resCrear.rows[0].id_proveedor;
        nombreProveedorFinal = resCrear.rows[0].nombre_empresa;
      }
    } else if (id_proveedor) {
      const resProv = await db.query('SELECT nombre_empresa, cotizacion_dolar FROM Proveedor WHERE id_proveedor = $1;', [id_proveedor]);
      if (resProv.rowCount && resProv.rowCount > 0) {
        nombreProveedorFinal = resProv.rows[0].nombre_empresa;
        proveedorCotizacionDolar = resProv.rows[0].cotizacion_dolar ? Number(resProv.rows[0].cotizacion_dolar) : null;
      }
    }

    let montoUsdNum: number | null = null;
    let cotizacionNum: number | null = null;
    let montoNum: number;

    if (monedaLimpia === 'USD') {
      const montoUsdOrigen = monto_usd !== undefined && monto_usd !== '' ? monto_usd : monto_total;
      montoUsdNum = validarMontoDecimal(montoUsdOrigen, 'El monto en USD del pago');

      const cotRaw = Number(cotizacion_dolar);
      if (cotizacion_dolar !== undefined && cotizacion_dolar !== null && cotizacion_dolar !== '') {
        if (isNaN(cotRaw) || !isFinite(cotRaw) || cotRaw <= 0) {
          throw new BadRequestError('La cotización del dólar debe ser mayor a 0.');
        }
        cotizacionNum = Math.round(cotRaw * 100) / 100;
      } else if (proveedorCotizacionDolar !== null && !isNaN(proveedorCotizacionDolar) && proveedorCotizacionDolar > 0) {
        cotizacionNum = Math.round(proveedorCotizacionDolar * 100) / 100;
      } else {
        const resCot = await db.query(`SELECT valor FROM Configuracion_Sistema WHERE clave = 'cotizacion_dolar' LIMIT 1;`);
        cotizacionNum = Number(resCot.rows[0]?.valor) || 1;
      }

      montoNum = Math.round(montoUsdNum * cotizacionNum * 100) / 100;
      if (montoNum > 99999999.99) {
        throw new BadRequestError('El monto convertido a pesos ($ARS) supera el límite máximo permitido ($99.999.999,99).');
      }
    } else {
      montoNum = validarMontoDecimal(monto_total, 'El monto del pago');
    }

    const query = `
      INSERT INTO Pago_Proveedor (id_proveedor, id_usuario, id_metodo_pago, monto_total, moneda, monto_usd, cotizacion_dolar, observaciones)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      proveedorIdFinal,
      idOperadorNum,
      id_metodo_pago,
      montoNum,
      monedaLimpia,
      montoUsdNum,
      cotizacionNum,
      observaciones ? String(observaciones).trim() : null
    ];

    const result = await db.query(query, values);
    const nuevoPago = result.rows[0];

    const detalleMoneda = monedaLimpia === 'USD' && montoUsdNum !== null && cotizacionNum !== null
      ? ` (USD ${montoUsdNum.toLocaleString('es-AR', { minimumFractionDigits: 2 })} x $${cotizacionNum.toLocaleString('es-AR', { minimumFractionDigits: 2 })})`
      : '';

    const insertarBitacora = () =>
      db.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Proveedores', 'Registro de Pago', $3);`,
        [
          idOperadorNum,
          String(nombreUsuarioOperador || 'Usuario').trim().slice(0, 50),
          `Pago #${nuevoPago.id_pago} registrado a proveedor "${nombreProveedorFinal || 'Proveedor #' + proveedorIdFinal}" por $${montoNum.toLocaleString('es-AR', { minimumFractionDigits: 2 })}${detalleMoneda}.`
        ]
      );

    // Dentro de una transacción, nunca tragar errores SQL sin SAVEPOINT
    if (txClient) {
      await insertarBitacora();
    } else {
      try {
        await insertarBitacora();
      } catch {
        // Ignorar error secundario en bitácora fuera de transacción
      }
    }

    return nuevoPago;
  }

  /** Obtiene los pagos pendientes agendados a proveedores ordenados por fecha de vencimiento. */
  static async obtenerPagosPendientes() {
    const query = `
      SELECT
        pp.id_pendiente,
        pp.id_proveedor,
        prov.nombre_empresa AS proveedor_nombre,
        pp.id_usuario,
        u.nombre_usuario AS usuario_nombre,
        pp.id_pago_inicial,
        pp.numero_factura,
        pp.fecha_factura,
        pp.monto_factura_total,
        pp.monto_pagado,
        pp.saldo_pendiente,
        pp.moneda,
        TO_CHAR(pp.fecha_proximo_pago, 'YYYY-MM-DD') AS fecha_proximo_pago,
        (pp.fecha_proximo_pago - CURRENT_DATE)::INT AS dias_restantes,
        pp.estado,
        pp.observaciones,
        pp.created_at
      FROM Pago_Proveedor_Pendiente pp
      LEFT JOIN Proveedor prov ON pp.id_proveedor = prov.id_proveedor
      LEFT JOIN Usuario u ON pp.id_usuario = u.id_usuario
      WHERE pp.estado = 'PENDIENTE'
      ORDER BY pp.fecha_proximo_pago ASC, pp.id_pendiente ASC;
    `;
    const result = await pool.query(query);
    return {
      total: result.rows.length,
      pendientes: result.rows
    };
  }

  /** Agenda un saldo pendiente de pago a proveedor (utilizable dentro de una transacción). */
  static async crearPagoPendiente(datos: DatosPagoPendiente, txClient?: PoolClient) {
    const db = txClient || pool;
    const idOperadorNum = Number(datos.idUsuarioOperador);
    if (!datos.idUsuarioOperador || isNaN(idOperadorNum) || idOperadorNum <= 0) {
      throw new UnauthorizedError('No se pudo identificar al usuario que agenda el pago pendiente.');
    }

    const idProv = validarId(datos.id_proveedor, 'Seleccioná un proveedor válido para agendar el pago.');
    const totalNum = validarMontoDecimal(datos.monto_factura_total, 'El monto total de la factura');
    const pagadoNum = redondear2(Math.max(0, Number(datos.monto_pagado) || 0));
    const saldoNum = validarMontoDecimal(datos.saldo_pendiente, 'El saldo pendiente');
    const monedaLimpia = String(datos.moneda || 'ARS').trim().toUpperCase() === 'USD' ? 'USD' : 'ARS';
    const fechaIso = validarFechaIso(datos.fecha_proximo_pago, 'Indicá una fecha válida para el próximo pago (AAAA-MM-DD).');

    const res = await db.query(
      `INSERT INTO Pago_Proveedor_Pendiente (
        id_proveedor, id_usuario, id_pago_inicial, numero_factura, fecha_factura,
        monto_factura_total, monto_pagado, saldo_pendiente, moneda, fecha_proximo_pago, estado, observaciones
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, 'PENDIENTE', $11)
      RETURNING *, TO_CHAR(fecha_proximo_pago, 'YYYY-MM-DD') AS fecha_proximo_pago;`,
      [
        idProv,
        idOperadorNum,
        datos.id_pago_inicial || null,
        datos.numero_factura ? String(datos.numero_factura).trim().slice(0, 60) : null,
        datos.fecha_factura ? String(datos.fecha_factura).trim().slice(0, 30) : null,
        totalNum,
        pagadoNum,
        saldoNum,
        monedaLimpia,
        fechaIso,
        datos.observaciones ? String(datos.observaciones).trim() : null
      ]
    );

    return res.rows[0];
  }

  /** Registra un pago (total o parcial) sobre un saldo pendiente agendado y actualiza o cierra la deuda. */
  static async registrarAbonoPendiente(idPendiente: number, datos: DatosAbonoPendiente) {
    const idValid = validarId(idPendiente, 'No se encontró ese pago pendiente.');
    const idOperadorNum = Number(datos.idUsuarioOperador);
    if (!datos.idUsuarioOperador || isNaN(idOperadorNum) || idOperadorNum <= 0) {
      throw new UnauthorizedError('No se pudo identificar al usuario que registra el pago.');
    }

    const idMetodo = validarId(datos.id_metodo_pago, 'Seleccioná un método de pago válido.');
    const montoAbono = redondear2(validarMontoDecimal(datos.monto_abono, 'El monto a pagar'));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resPend = await client.query(
        `SELECT pp.*, prov.nombre_empresa AS proveedor_nombre, prov.cotizacion_dolar AS proveedor_cotizacion_dolar
         FROM Pago_Proveedor_Pendiente pp
         LEFT JOIN Proveedor prov ON pp.id_proveedor = prov.id_proveedor
         WHERE pp.id_pendiente = $1
         FOR UPDATE OF pp;`,
        [idValid]
      );

      if (resPend.rowCount === 0) {
        throw new NotFoundError('Ese pago pendiente no existe.');
      }

      const pend = resPend.rows[0];
      if (pend.estado !== 'PENDIENTE') {
        throw new BadRequestError('Este pago pendiente ya fue saldado o cancelado.');
      }

      const saldoActual = redondear2(Number(pend.saldo_pendiente));
      if (montoAbono > saldoActual) {
        throw new BadRequestError(`El monto a pagar ($${montoAbono.toLocaleString('es-AR')}) supera el saldo pendiente ($${saldoActual.toLocaleString('es-AR')}).`);
      }

      const nuevoSaldo = redondear2(saldoActual - montoAbono);
      const nuevoPagado = redondear2(Number(pend.monto_pagado || 0) + montoAbono);
      const quedaPendiente = nuevoSaldo > 0;

      let nuevaFechaIso: string | null = null;
      if (quedaPendiente) {
        if (!datos.nueva_fecha_proximo_pago) {
          throw new BadRequestError('Como el pago es parcial y queda saldo pendiente, indicá la nueva fecha para el próximo pago.');
        }
        nuevaFechaIso = validarFechaIso(datos.nueva_fecha_proximo_pago, 'La nueva fecha del próximo pago no es válida.');
      }

      const refFactura = pend.numero_factura
        ? `Factura Nº ${pend.numero_factura}${pend.fecha_factura ? ` (${pend.fecha_factura})` : ''}`
        : `Saldo pendiente #${pend.id_pendiente}`;
      const obsPago = datos.observaciones?.trim()
        ? `${refFactura} - ${datos.observaciones.trim()}`
        : `${refFactura} - ${quedaPendiente ? 'Abono parcial de saldo' : 'Cancelación de saldo pendiente'}`;

      const cotAbono = datos.cotizacion_dolar !== undefined && datos.cotizacion_dolar !== null && datos.cotizacion_dolar !== ''
        ? datos.cotizacion_dolar
        : (pend.proveedor_cotizacion_dolar ? Number(pend.proveedor_cotizacion_dolar) : undefined);

      const pagoRegistrado = await this.crearPago(
        {
          id_proveedor: pend.id_proveedor,
          id_metodo_pago: idMetodo,
          monto_total: montoAbono,
          moneda: pend.moneda === 'USD' ? 'USD' : 'ARS',
          monto_usd: pend.moneda === 'USD' ? montoAbono : undefined,
          cotizacion_dolar: pend.moneda === 'USD' ? cotAbono : undefined,
          observaciones: obsPago,
          idUsuarioOperador: idOperadorNum,
          nombreUsuarioOperador: datos.nombreUsuarioOperador
        },
        client
      );

      const resUpd = await client.query(
        `UPDATE Pago_Proveedor_Pendiente
         SET monto_pagado = $1,
             saldo_pendiente = $2,
             estado = $3,
             fecha_proximo_pago = COALESCE($4::date, fecha_proximo_pago),
             updated_at = CURRENT_TIMESTAMP
         WHERE id_pendiente = $5
         RETURNING *, TO_CHAR(fecha_proximo_pago, 'YYYY-MM-DD') AS fecha_proximo_pago;`,
        [
          nuevoPagado,
          quedaPendiente ? nuevoSaldo : 0,
          quedaPendiente ? 'PENDIENTE' : 'PAGADO',
          nuevaFechaIso,
          idValid
        ]
      );

      await client.query('COMMIT');

      return {
        message: quedaPendiente
          ? 'Abono parcial registrado y próximo pago reagendado exitosamente.'
          : 'Saldo cancelado y pago registrado exitosamente.',
        pago: pagoRegistrado,
        pendiente: resUpd.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
