import { pool } from '../config/db.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

export interface CotizacionDolarInfo {
  cotizacion_dolar: number;
  updated_at: string | null;
  updated_by_nombre: string | null;
  productos_usd_count: number;
}

/** Servicio de configuración global del sistema (cotización manual del dólar y parámetros comerciales). */
export class ConfiguracionService {
  /** Obtiene la cotización vigente del dólar configurada por el administrador y métricas asociadas. */
  static async obtenerCotizacionDolar(): Promise<CotizacionDolarInfo> {
    const queryConfig = `
      SELECT c.valor, c.updated_at, u.nombre_usuario AS updated_by_nombre
      FROM Configuracion_Sistema c
      LEFT JOIN Usuario u ON c.updated_by = u.id_usuario
      WHERE c.clave = 'cotizacion_dolar'
      LIMIT 1;
    `;
    const queryCountUsd = `
      SELECT COUNT(*)::INT AS total
      FROM Productos
      WHERE moneda = 'USD' AND activo = true;
    `;

    const [resConfig, resCount] = await Promise.all([
      pool.query(queryConfig),
      pool.query(queryCountUsd)
    ]);

    const rawValor = resConfig.rows[0]?.valor;
    const cotizacion = Number(rawValor);

    return {
      cotizacion_dolar: !isNaN(cotizacion) && cotizacion > 0 ? cotizacion : 1,
      updated_at: resConfig.rows[0]?.updated_at || null,
      updated_by_nombre: resConfig.rows[0]?.updated_by_nombre || null,
      productos_usd_count: Number(resCount.rows[0]?.total) || 0
    };
  }

  /**
   * Actualiza la cotización manual del dólar y recalcula de forma exacta (sin redondeo)
   * el precio en ARS de todos los productos cuya moneda base es USD.
   */
  static async actualizarCotizacionDolar(
    nuevaCotizacion: number | string,
    operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }
  ) {
    const { idUsuarioOperador, nombreUsuarioOperador } = operador;
    const idOp = Number(idUsuarioOperador);
    if (!idUsuarioOperador || isNaN(idOp) || idOp <= 0) {
      throw new UnauthorizedError('No se pudo identificar al administrador que actualiza la cotización.');
    }

    const cotizacionNum = Number(nuevaCotizacion);
    if (isNaN(cotizacionNum) || !isFinite(cotizacionNum) || cotizacionNum <= 0) {
      throw new BadRequestError('La cotización del dólar debe ser un número mayor a 0.');
    }
    if (cotizacionNum > 99999999.99) {
      throw new BadRequestError('La cotización del dólar no puede superar $99.999.999,99.');
    }

    const cotizacionExacta = Math.round(cotizacionNum * 100) / 100;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const resPrev = await client.query(
        `SELECT valor FROM Configuracion_Sistema WHERE clave = 'cotizacion_dolar' FOR UPDATE;`
      );
      const cotizacionAnterior = resPrev.rows[0]?.valor ? Number(resPrev.rows[0].valor) : 1;

      await client.query(
        `INSERT INTO Configuracion_Sistema (clave, valor, updated_by, updated_at)
         VALUES ('cotizacion_dolar', $1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (clave) DO UPDATE
         SET valor = EXCLUDED.valor,
             updated_by = EXCLUDED.updated_by,
             updated_at = CURRENT_TIMESTAMP;`,
        [String(cotizacionExacta), idOp]
      );

      // Recalcular precio exacto en ARS (y precio de reventa si aplica) para productos en USD sin cotización propia en su proveedor
      const resRecalculo = await client.query(
        `UPDATE Productos p
         SET precio = ROUND(p.precio_usd * $1::numeric, 2),
             precio_reventa = CASE
               WHEN p.precio_reventa_usd IS NOT NULL THEN ROUND(p.precio_reventa_usd * $1::numeric, 2)
               ELSE p.precio_reventa
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE p.moneda = 'USD'
           AND p.activo = true
           AND p.precio_usd IS NOT NULL
           AND (
             p.id_proveedor IS NULL OR
             NOT EXISTS (
               SELECT 1 FROM Proveedor pr
               WHERE pr.id_proveedor = p.id_proveedor AND pr.cotizacion_dolar IS NOT NULL
             )
           )
         RETURNING p.id_producto;`,
        [cotizacionExacta]
      );

      const productosActualizados = resRecalculo.rowCount || 0;

      // Auditoría obligatoria en Bitacora_Actividad dentro de la transacción
      await client.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Configuración', 'Actualización de Cotización USD', $3);`,
        [
          idOp,
          nombreUsuarioOperador || 'Administrador',
          `Cotización del dólar actualizada de $${cotizacionAnterior.toLocaleString('es-AR', { minimumFractionDigits: 2 })} a $${cotizacionExacta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}. Se recalcularon ${productosActualizados} producto(s) en USD.`
        ]
      );

      await client.query('COMMIT');

      return {
        message: 'Cotización del dólar actualizada y precios recalculados exitosamente',
        cotizacion_anterior: cotizacionAnterior,
        cotizacion_dolar: cotizacionExacta,
        productos_actualizados: productosActualizados
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
