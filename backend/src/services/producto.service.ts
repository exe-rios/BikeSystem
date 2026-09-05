import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const TIPOS_PRODUCTO_VALIDOS = ['bicicleta', 'repuesto', 'accesorio', 'componente'];

export const PRODUCTO_SELECT = `
  SELECT p.*, 
         COALESCE(pb.marca, p.marca) AS marca, 
         pb.color, pb.rodado, pb.talle,
         CASE 
             WHEN p.cantidad <= 0 THEN 'sin_stock'
             WHEN p.cantidad <= p.stock_minimo OR p.cantidad <= 5 THEN 'bajo_stock'
             ELSE 'optimo'
         END AS estado_stock
  FROM Productos p
  LEFT JOIN Producto_BiciNueva pb ON p.id_producto = pb.id_producto
`;

const validarDatosProducto = (body: any) => {
  const { nombre, tipo_prod, cantidad, precio, stock_minimo } = body;
  const errores: string[] = [];

  if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
    errores.push('Escribí el nombre del artículo (al menos 2 letras).');
  }

  const tipoLimpio = String(tipo_prod || '').trim().toLowerCase();
  if (!tipoLimpio || !TIPOS_PRODUCTO_VALIDOS.includes(tipoLimpio)) {
    errores.push('Elegí un tipo válido: Bicicleta, Repuesto, Accesorio o Componente.');
  }

  if (precio !== undefined && precio !== null && precio !== '') {
    const precioNum = Number(precio);
    if (isNaN(precioNum) || precioNum < 0) {
      errores.push('El precio no puede ser negativo.');
    }
  }

  if (cantidad !== undefined && cantidad !== null && cantidad !== '') {
    const cantNum = Number(cantidad);
    if (isNaN(cantNum) || cantNum < 0 || !Number.isInteger(cantNum)) {
      errores.push('La cantidad debe ser un número entero (0 o más).');
    }
  }

  if (stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== '') {
    const stockMinNum = Number(stock_minimo);
    if (isNaN(stockMinNum) || stockMinNum < 0 || !Number.isInteger(stockMinNum)) {
      errores.push('El stock mínimo debe ser un número entero (0 o más).');
    }
  }

  return errores;
};

export class ProductoService {
  static async obtenerProductos(filtros: { 
    tipo_prod?: string | undefined; 
    tipo?: string | undefined;
    busqueda?: string | undefined; 
    estado_stock?: string | undefined;
    disponibilidad?: string | undefined;
    estado?: string | undefined;
    solo_activos?: boolean | string | undefined;
  }) {
    const { tipo_prod, tipo, busqueda, estado_stock, disponibilidad, estado, solo_activos } = filtros;
    
    // Obtener resumen global de inventario en una sola consulta eficiente
    const queryResumen = `
      SELECT 
        COUNT(*) FILTER (WHERE activo = true)::INT AS total_articulos,
        COALESCE(SUM(cantidad) FILTER (WHERE activo = true), 0)::INT AS total_unidades,
        COUNT(*) FILTER (WHERE activo = true AND (cantidad <= stock_minimo OR cantidad <= 5))::INT AS bajo_stock_count,
        COUNT(*) FILTER (WHERE activo = false)::INT AS inactivos_count
      FROM Productos;
    `;
    const resResumen = await pool.query(queryResumen);
    const resumen = resResumen.rows[0] || {
      total_articulos: 0,
      total_unidades: 0,
      bajo_stock_count: 0,
      inactivos_count: 0
    };

    let query = `${PRODUCTO_SELECT} WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    // Filtro de activos / inactivos
    const estadoFiltro = String(estado || '').trim().toLowerCase();
    if (estadoFiltro === 'activos' || solo_activos === true || solo_activos === 'true') {
      query += ` AND p.activo = true`;
    } else if (estadoFiltro === 'inactivos') {
      query += ` AND p.activo = false`;
    } else if (estadoFiltro !== 'todos') {
      // Por defecto mostrar activos a menos que se especifique 'todos'
      query += ` AND p.activo = true`;
    }

    const tipoFiltro = tipo_prod || tipo;
    if (tipoFiltro && typeof tipoFiltro === 'string' && tipoFiltro.trim() !== 'todos') {
      query += ` AND p.tipo_prod = $${paramIndex}`;
      params.push(tipoFiltro.trim().toLowerCase());
      paramIndex++;
    }

    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query += ` AND (
        p.nombre ILIKE $${paramIndex} OR 
        p.marca ILIKE $${paramIndex} OR 
        p.modelo ILIKE $${paramIndex} OR 
        pb.marca ILIKE $${paramIndex} OR 
        CAST(p.id_producto AS TEXT) ILIKE $${paramIndex}
      )`;
      params.push(term);
      paramIndex++;
    }

    const dispFiltro = String(estado_stock || disponibilidad || '').trim().toLowerCase();
    if (dispFiltro && dispFiltro !== 'todos') {
      if (dispFiltro === 'sin_stock') {
        query += ` AND p.cantidad <= 0`;
      } else if (dispFiltro === 'bajo_stock') {
        query += ` AND (p.cantidad <= p.stock_minimo OR p.cantidad <= 5) AND p.cantidad > 0`;
      } else if (dispFiltro === 'optimo' || dispFiltro === 'disponible') {
        query += ` AND p.cantidad > p.stock_minimo AND p.cantidad > 5`;
      }
    }

    query += ` ORDER BY p.id_producto DESC;`;

    const result = await pool.query(query, params);
    return {
      total: result.rowCount || 0,
      resumen: {
        total_articulos: Number(resumen.total_articulos) || 0,
        total_unidades: Number(resumen.total_unidades) || 0,
        bajo_stock_count: Number(resumen.bajo_stock_count) || 0,
        inactivos_count: Number(resumen.inactivos_count) || 0
      },
      productos: result.rows
    };
  }

  static async obtenerProductoPorId(id: number) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró ese producto.');
    }

    const query = `${PRODUCTO_SELECT} WHERE p.id_producto = $1;`;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Ese producto no existe.');
    }

    return result.rows[0];
  }

  static async crearProducto(datos: any, operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }) {
    const errores = validarDatosProducto(datos);
    if (errores.length > 0) {
      throw new BadRequestError('Hay errores en los datos del artículo.', errores);
    }

    const { nombre, marca, modelo, tipo_prod, cantidad, color, rodado, talle, precio, stock_minimo, activo } = datos;
    const { idUsuarioOperador, nombreUsuarioOperador } = operador;
    const estadoActivo = activo !== undefined ? Boolean(activo) : true;
    const tipoLimpio = String(tipo_prod).trim().toLowerCase();
    const marcaLimpia = marca ? String(marca).trim() : null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const queryProd = `
        INSERT INTO Productos (nombre, marca, modelo, tipo_prod, cantidad, precio, stock_minimo, activo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const resultProd = await client.query(queryProd, [
        nombre.trim(),
        marcaLimpia,
        modelo ? String(modelo).trim() : null,
        tipoLimpio,
        Number(cantidad) || 0,
        Number(precio) || 0,
        Number(stock_minimo) || 0,
        estadoActivo
      ]);

      const nuevoProducto = resultProd.rows[0];

      if (tipoLimpio === 'bicicleta') {
        const queryBici = `
          INSERT INTO Producto_BiciNueva (id_producto, marca, color, rodado, talle)
          VALUES ($1, $2, $3, $4, $5);
        `;
        await client.query(queryBici, [
          nuevoProducto.id_producto,
          marcaLimpia || 'Genérica',
          color ? String(color).trim() : null,
          rodado ? String(rodado).trim() : null,
          talle ? String(talle).trim() : null
        ]);
      }

      if (idUsuarioOperador && Number(cantidad) > 0) {
        try {
          await client.query(
            `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
             VALUES ($1, $2, 'INGRESO', $3, 'Carga Inicial de Inventario', 'Alta de producto nuevo en catálogo');`,
            [nuevoProducto.id_producto, idUsuarioOperador, Number(cantidad)]
          );
        } catch {
          // Ignorar
        }
      }

      try {
        await client.query(
          `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
           VALUES ($1, $2, 'Stock', 'Alta de Producto', $3);`,
          [
            idUsuarioOperador || null,
            nombreUsuarioOperador || 'Usuario',
            `Producto registrado: "${nuevoProducto.nombre}" (ID #${nuevoProducto.id_producto}, Tipo: ${tipoLimpio}, Stock: ${nuevoProducto.cantidad}, Precio: $${nuevoProducto.precio}).`
          ]
        );
      } catch {
        // Ignorar
      }

      await client.query('COMMIT');

      const resultCompleto = await pool.query(`${PRODUCTO_SELECT} WHERE p.id_producto = $1;`, [nuevoProducto.id_producto]);
      return resultCompleto.rows[0] || nuevoProducto;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async actualizarProducto(id: number, datos: any, operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró ese producto.');
    }

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const checkProd = await client.query('SELECT * FROM Productos WHERE id_producto = $1 FOR UPDATE;', [id]);
      if (checkProd.rowCount === 0) {
        throw new NotFoundError('Ese producto no existe.');
      }

      const { nombre, marca, modelo, tipo_prod, cantidad, color, rodado, talle, precio, stock_minimo, activo } = datos;

      let tipoLimpio: string | null = null;
      if (tipo_prod) {
        tipoLimpio = String(tipo_prod).trim().toLowerCase();
        if (!TIPOS_PRODUCTO_VALIDOS.includes(tipoLimpio)) {
          throw new BadRequestError('Elegí un tipo válido: Bicicleta, Repuesto, Accesorio o Componente.');
        }
      }

      const queryProd = `
        UPDATE Productos
        SET nombre = COALESCE($1, nombre),
            marca = COALESCE($2, marca),
            modelo = COALESCE($3, modelo),
            tipo_prod = COALESCE($4, tipo_prod),
            cantidad = COALESCE($5, cantidad),
            precio = COALESCE($6, precio),
            stock_minimo = COALESCE($7, stock_minimo),
            activo = COALESCE($8, activo)
        WHERE id_producto = $9
        RETURNING *;
      `;
      const resultProd = await client.query(queryProd, [
        nombre !== undefined ? String(nombre).trim() : null,
        marca !== undefined ? (marca ? String(marca).trim() : null) : null,
        modelo !== undefined ? (modelo ? String(modelo).trim() : null) : null,
        tipoLimpio,
        cantidad !== undefined && cantidad !== '' ? Number(cantidad) : null,
        precio !== undefined && precio !== '' ? Number(precio) : null,
        stock_minimo !== undefined && stock_minimo !== '' ? Number(stock_minimo) : null,
        activo !== undefined ? Boolean(activo) : null,
        id
      ]);

      const productoActualizado = resultProd.rows[0];

      if (productoActualizado.tipo_prod === 'bicicleta') {
        const queryBici = `
          INSERT INTO Producto_BiciNueva (id_producto, marca, color, rodado, talle)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id_producto) 
          DO UPDATE SET 
            marca = EXCLUDED.marca,
            color = EXCLUDED.color,
            rodado = EXCLUDED.rodado,
            talle = EXCLUDED.talle;
        `;
        await client.query(queryBici, [
          id,
          marca ? String(marca).trim() : 'Genérica',
          color !== undefined ? (color ? String(color).trim() : null) : null,
          rodado !== undefined ? (rodado ? String(rodado).trim() : null) : null,
          talle !== undefined ? (talle ? String(talle).trim() : null) : null
        ]);
      }

      try {
        await client.query(
          `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
           VALUES ($1, $2, 'Stock', 'Modificación de Producto', $3);`,
          [
            idUsuarioOperador || null,
            nombreUsuarioOperador || 'Usuario',
            `Producto actualizado: "${productoActualizado.nombre}" (ID #${id}). Stock: ${productoActualizado.cantidad}, Precio: $${productoActualizado.precio}.`
          ]
        );
      } catch {
        // Ignorar
      }

      await client.query('COMMIT');

      const resultCompleto = await pool.query(`${PRODUCTO_SELECT} WHERE p.id_producto = $1;`, [id]);
      return resultCompleto.rows[0] || productoActualizado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async eliminarProducto(id: number, operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró ese producto.');
    }

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;

    const resProd = await pool.query('SELECT nombre, tipo_prod FROM Productos WHERE id_producto = $1;', [id]);
    if (resProd.rowCount === 0) {
      throw new NotFoundError('Ese producto no existe.');
    }
    const datosProd = resProd.rows[0];

    const query = 'UPDATE Productos SET activo = false WHERE id_producto = $1 RETURNING *;';
    await pool.query(query, [id]);

    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Stock', 'Baja de Producto', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Producto dado de baja (desactivado): "${datosProd.nombre}" (ID #${id}).`
        ]
      );
    } catch {
      // Ignorar
    }

    return { message: 'Producto desactivado del inventario exitosamente' };
  }

  static async reactivarProducto(id: number, operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró ese producto.');
    }

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;

    const resProd = await pool.query('SELECT nombre, tipo_prod FROM Productos WHERE id_producto = $1;', [id]);
    if (resProd.rowCount === 0) {
      throw new NotFoundError('Ese producto no existe.');
    }
    const datosProd = resProd.rows[0];

    const query = 'UPDATE Productos SET activo = true WHERE id_producto = $1 RETURNING *;';
    const result = await pool.query(query, [id]);

    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Stock', 'Reactivación de Producto', $3);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Usuario',
          `Producto reactivado en inventario: "${datosProd.nombre}" (ID #${id}).`
        ]
      );
    } catch {
      // Ignorar
    }

    return {
      message: 'Producto reactivado exitosamente',
      producto: result.rows[0]
    };
  }

  static async ajustarStock(id: number, datos: {
    cantidad_ajuste: number | string;
    tipo_movimiento: 'INGRESO' | 'EGRESO' | 'AJUSTE';
    motivo: string;
    observaciones?: string | undefined;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('No se encontró ese producto.');
    }

    const { cantidad_ajuste, tipo_movimiento, motivo, observaciones, idUsuarioOperador, nombreUsuarioOperador } = datos;
    const cantNum = Number(cantidad_ajuste);

    if (isNaN(cantNum) || cantNum <= 0 || !Number.isInteger(cantNum)) {
      throw new BadRequestError('La cantidad debe ser al menos 1.');
    }

    const tipoNorm = String(tipo_movimiento || '').trim().toUpperCase();
    if (!['INGRESO', 'EGRESO', 'AJUSTE'].includes(tipoNorm)) {
      throw new BadRequestError('El tipo de movimiento debe ser INGRESO, EGRESO o AJUSTE.');
    }

    if (!motivo || typeof motivo !== 'string' || motivo.trim().length < 3) {
      throw new BadRequestError('Escribí el motivo del ajuste (al menos 3 letras).');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resProd = await client.query('SELECT id_producto, nombre, cantidad FROM Productos WHERE id_producto = $1 FOR UPDATE;', [id]);
      if (resProd.rowCount === 0) {
        throw new NotFoundError('Ese producto no existe.');
      }

      const stockActual = Number(resProd.rows[0].cantidad);
      let nuevoStock = stockActual;

      if (tipoNorm === 'INGRESO') {
        nuevoStock = stockActual + cantNum;
      } else if (tipoNorm === 'EGRESO') {
        if (stockActual < cantNum) {
          throw new BadRequestError(`No hay suficiente stock. Hay ${stockActual} unidades.`);
        }
        nuevoStock = stockActual - cantNum;
      } else if (tipoNorm === 'AJUSTE') {
        nuevoStock = cantNum;
      }

      const queryUpdate = 'UPDATE Productos SET cantidad = $1 WHERE id_producto = $2 RETURNING *;';
      const resUpdate = await client.query(queryUpdate, [nuevoStock, id]);

      if (idUsuarioOperador) {
        try {
          await client.query(
            `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
             VALUES ($1, $2, $3, $4, $5, $6);`,
            [
              id,
              idUsuarioOperador,
              tipoNorm,
              cantNum,
              motivo.trim(),
              observaciones ? String(observaciones).trim() : null
            ]
          );
        } catch {
          // Ignorar
        }
      }

      try {
        await client.query(
          `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
           VALUES ($1, $2, 'Stock', 'Ajuste de Stock Manual', $3);`,
          [
            idUsuarioOperador || null,
            nombreUsuarioOperador || 'Usuario',
            `Ajuste de stock en "${resProd.rows[0].nombre}" (ID #${id}): ${tipoNorm} de ${cantNum} un. (Stock anterior: ${stockActual}, Nuevo stock: ${nuevoStock}). Motivo: ${motivo.trim()}.`
          ]
        );
      } catch {
        // Ignorar
      }

      await client.query('COMMIT');

      const resCompleto = await pool.query(`${PRODUCTO_SELECT} WHERE p.id_producto = $1;`, [id]);
      return {
        message: 'Ajuste de inventario aplicado exitosamente',
        producto: resCompleto.rows[0] || resUpdate.rows[0],
        stock_anterior: stockActual,
        nuevo_stock: nuevoStock
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async obtenerMovimientosStock(filtros: { id_producto?: number | string | undefined; busqueda?: string | undefined }) {
    const { id_producto, busqueda } = filtros;
    let query = `
      SELECT ms.*, u.nombre_usuario, p.nombre AS producto_nombre
      FROM Movimiento_Stock ms
      INNER JOIN Usuario u ON ms.id_usuario = u.id_usuario
      INNER JOIN Productos p ON ms.id_producto = p.id_producto
    `;

    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (id_producto) {
      const idNum = Number(id_producto);
      if (!isNaN(idNum) && idNum > 0) {
        whereClauses.push(`ms.id_producto = $${paramIdx}`);
        params.push(idNum);
        paramIdx++;
      }
    }

    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      whereClauses.push(`(
        p.nombre ILIKE $${paramIdx} OR 
        u.nombre_usuario ILIKE $${paramIdx} OR 
        ms.motivo ILIKE $${paramIdx} OR 
        ms.observaciones ILIKE $${paramIdx}
      )`);
      params.push(term);
      paramIdx++;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY ms.id_movimiento DESC;`;

    const result = await pool.query(query, params);
    return {
      total: result.rowCount || 0,
      movimientos: result.rows
    };
  }

  static async obtenerKardex(id: number) {
    return this.obtenerMovimientosStock({ id_producto: id });
  }
}
