import { pool } from '../config/db.js';
import { BadRequestError } from '../utils/errors.js';

export class PagoProveedorService {
  static async obtenerMetodosPago() {
    const query = 'SELECT * FROM Metodo_Pago ORDER BY id_metodo_pago ASC;';
    const result = await pool.query(query);
    return result.rows;
  }

  static async obtenerPagos(busqueda?: string | undefined) {
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
        p.observaciones
      FROM Pago_Proveedor p
      JOIN Proveedor prov ON p.id_proveedor = prov.id_proveedor
      JOIN Usuario u ON p.id_usuario = u.id_usuario
      JOIN Metodo_Pago mp ON p.id_metodo_pago = mp.id_metodo_pago
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

    query += ` ORDER BY p.id_pago DESC;`;

    const queryTotalMonto = `SELECT COALESCE(SUM(monto_total), 0)::numeric AS total_monto FROM Pago_Proveedor;`;

    const [resultPagos, resultTotal] = await Promise.all([
      pool.query(query, params),
      pool.query(queryTotalMonto)
    ]);

    return {
      total: resultPagos.rowCount || 0,
      total_monto: Number(resultTotal.rows[0]?.total_monto || 0),
      pagos: resultPagos.rows
    };
  }

  static async crearPago(datos: {
    id_proveedor?: number | undefined;
    nombre_proveedor?: string | undefined;
    id_metodo_pago: number;
    monto_total: number | string;
    observaciones?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    const {
      id_proveedor,
      nombre_proveedor,
      id_metodo_pago,
      monto_total,
      observaciones,
      idUsuarioOperador,
      nombreUsuarioOperador
    } = datos;

    const montoNum = Number(monto_total);
    if ((!id_proveedor && !nombre_proveedor) || !id_metodo_pago || isNaN(montoNum) || montoNum <= 0) {
      throw new BadRequestError('Completá el proveedor, el método de pago y el monto.');
    }

    let proveedorIdFinal = id_proveedor;
    let nombreProveedorFinal = '';

    if (nombre_proveedor && typeof nombre_proveedor === 'string' && nombre_proveedor.trim()) {
      const nombreLimpio = nombre_proveedor.trim();

      const queryBuscar = 'SELECT id_proveedor, nombre_empresa FROM Proveedor WHERE LOWER(nombre_empresa) = LOWER($1);';
      const resBuscar = await pool.query(queryBuscar, [nombreLimpio]);

      if (resBuscar.rowCount && resBuscar.rowCount > 0) {
        proveedorIdFinal = resBuscar.rows[0].id_proveedor;
        nombreProveedorFinal = resBuscar.rows[0].nombre_empresa;
      } else {
        const queryCrearProv = 'INSERT INTO Proveedor (nombre_empresa) VALUES ($1) RETURNING id_proveedor, nombre_empresa;';
        const resCrear = await pool.query(queryCrearProv, [nombreLimpio]);
        proveedorIdFinal = resCrear.rows[0].id_proveedor;
        nombreProveedorFinal = resCrear.rows[0].nombre_empresa;
      }
    } else if (id_proveedor) {
      const resProv = await pool.query('SELECT nombre_empresa FROM Proveedor WHERE id_proveedor = $1;', [id_proveedor]);
      if (resProv.rowCount && resProv.rowCount > 0) {
        nombreProveedorFinal = resProv.rows[0].nombre_empresa;
      }
    }

    const query = `
      INSERT INTO Pago_Proveedor (id_proveedor, id_usuario, id_metodo_pago, monto_total, observaciones)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [
      proveedorIdFinal,
      idUsuarioOperador || 1,
      id_metodo_pago,
      montoNum,
      observaciones ? String(observaciones).trim() : null
    ];

    const result = await pool.query(query, values);
    const nuevoPago = result.rows[0];

    // Registrar en Bitacora_Actividad
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Proveedores', 'Registro de Pago', $3);`,
        [
          idUsuarioOperador || 1,
          nombreUsuarioOperador || 'Usuario',
          `Pago #${nuevoPago.id_pago} registrado a proveedor "${nombreProveedorFinal || 'Proveedor #' + proveedorIdFinal}" por $${montoNum.toLocaleString('es-AR', { minimumFractionDigits: 2 })}.`
        ]
      );
    } catch {
      // Ignorar error de bitácora
    }

    return nuevoPago;
  }
}
