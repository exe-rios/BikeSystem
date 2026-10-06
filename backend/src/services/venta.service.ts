import { pool } from '../config/db.js';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { validarId } from '../utils/validation.js';
import { normalizarPaginacion, aplicarPaginacionSQL, calcularMetaPaginacion } from '../utils/pagination.js';

/** Servicio para la facturación comercial, control transaccional de stock y garantías. */
export class VentaService {
  /** Procesa una venta completa en una transacción ACID: descuenta stock, calcula subtotales y audita. */
  static async crearVenta(datos: {
    id_cliente: number | string;
    id_metodo_pago?: number | string | undefined;
    cliente_nombre?: string | undefined;
    cliente_apellido?: string | undefined;
    cliente_dni?: string | undefined;
    detalles: Array<{ id_producto: number | string; cantidad: number | string; precio_unitario?: number | string | undefined }>;
    idUsuarioOperador?: number | undefined;
    nombreUsuarioOperador?: string | undefined;
  }) {
    const { id_cliente, id_metodo_pago, cliente_nombre, cliente_apellido, cliente_dni, detalles, idUsuarioOperador, nombreUsuarioOperador } = datos;
    const idUsuarioNum = Number(idUsuarioOperador);
    const idMetodoPagoNum = Number(id_metodo_pago) || 1;

    // Validación estricta de operador para auditoría fidedigna
    if (!idUsuarioOperador || isNaN(idUsuarioNum) || idUsuarioNum <= 0) {
      throw new UnauthorizedError('No se pudo identificar al usuario que realiza la operación.');
    }

    // Resolución del cliente: si no se provee o es 0, se asigna el cliente Consumidor Final
    let idClienteNum = Number(id_cliente);
    if (!id_cliente || isNaN(idClienteNum) || idClienteNum <= 0) {
      const resCF = await pool.query(`
        SELECT id_cliente FROM Cliente 
        WHERE (LOWER(TRIM(nombre)) = 'consumidor' AND LOWER(TRIM(apellido)) = 'final')
           OR (LOWER(TRIM(nombre)) = 'final' AND LOWER(TRIM(apellido)) = 'consumidor')
        LIMIT 1;
      `);
      if (resCF.rowCount && resCF.rowCount > 0) {
        idClienteNum = resCF.rows[0].id_cliente;
      } else {
        idClienteNum = validarId(id_cliente, 'Seleccioná un cliente para la venta.');
      }
    } else {
      idClienteNum = validarId(id_cliente, 'Seleccioná un cliente para la venta.');
    }

    // Datos opcionales de consumidor final para este comprobante específico
    const nombreFinal = typeof cliente_nombre === 'string' && cliente_nombre.trim() ? cliente_nombre.trim().slice(0, 100) : null;
    const apellidoFinal = typeof cliente_apellido === 'string' && cliente_apellido.trim() ? cliente_apellido.trim().slice(0, 100) : null;
    const dniFinal = typeof cliente_dni === 'string' && cliente_dni.trim() ? cliente_dni.trim().slice(0, 20) : null;

    if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
      throw new BadRequestError('Agregá al menos un artículo a la venta.');
    }

    // Prevención de Deadlocks: ordenar los artículos por id_producto antes de los bloqueos FOR UPDATE
    const detallesOrdenados = [...detalles].sort((a, b) => Number(a.id_producto) - Number(b.id_producto));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const queryVenta = `
        INSERT INTO Venta (id_cliente, id_usuario, id_metodo_pago, costo_total, cliente_nombre, cliente_apellido, cliente_dni)
        VALUES ($1, $2, $3, 0, $4, $5, $6)
        RETURNING *;
      `;
      const resVenta = await client.query(queryVenta, [idClienteNum, idUsuarioNum, idMetodoPagoNum, nombreFinal, apellidoFinal, dniFinal]);
      const nuevaVenta = resVenta.rows[0];
      const id_venta = nuevaVenta.id_venta;

      let costoTotalCalculado = 0;
      const detallesGuardados = [];

      for (const item of detallesOrdenados) {
        const idProdNum = validarId(item.id_producto, 'Uno de los artículos seleccionados no es válido.');
        const cantNum = Number(item.cantidad);

        if (isNaN(cantNum) || cantNum <= 0 || !Number.isInteger(cantNum)) {
          throw new BadRequestError('La cantidad debe ser al menos 1.');
        }

        const queryProducto = `
          SELECT id_producto, nombre, marca, modelo, tipo_prod, cantidad, precio, activo 
          FROM Productos 
          WHERE id_producto = $1
          FOR UPDATE;
        `;
        const resultProd = await client.query(queryProducto, [idProdNum]);

        if (resultProd.rowCount === 0) {
          throw new NotFoundError(`El artículo #${idProdNum} no existe en el inventario.`);
        }

        const producto = resultProd.rows[0];
        if (producto.activo === false) {
          throw new BadRequestError(`El artículo "${producto.nombre}" está dado de baja y no se puede comercializar.`);
        }

        if (producto.cantidad < cantNum) {
          throw new BadRequestError(`No hay suficiente stock de "${producto.nombre}". Hay ${producto.cantidad}, pediste ${cantNum}.`);
        }

        // Blindaje de precio: El precio oficial de la base de datos es la única fuente de la verdad
        const precioOficial = Number(producto.precio) || 0;
        const subtotal = Math.round(cantNum * precioOficial * 100) / 100;
        costoTotalCalculado = Math.round((costoTotalCalculado + subtotal) * 100) / 100;

        const queryDetalle = `
          INSERT INTO Detalle_Venta (id_venta, id_producto, cantidad, precio_unitario, costo_total)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;
        const resultDetalle = await client.query(queryDetalle, [id_venta, idProdNum, cantNum, precioOficial, subtotal]);
        detallesGuardados.push(resultDetalle.rows[0]);

        const queryDescuento = `
          UPDATE Productos 
          SET cantidad = cantidad - $1 
          WHERE id_producto = $2;
        `;
        await client.query(queryDescuento, [cantNum, idProdNum]);

        // Registrar egreso en Kardex (Movimiento_Stock)
        await client.query(
          `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
           VALUES ($1, $2, 'EGRESO', $3, 'Venta Comercial', $4);`,
          [idProdNum, idUsuarioNum, cantNum, `Venta #${id_venta} registrada al cliente #${idClienteNum}`]
        );

        // Si es bicicleta, registrar cada unidad individualmente al cliente
        if (producto.tipo_prod === 'bicicleta') {
          const queryBiciCliente = `
            INSERT INTO Bicicleta (id_cliente, marca, modelo)
            VALUES ($1, $2, $3);
          `;
          for (let i = 0; i < cantNum; i++) {
            await client.query(queryBiciCliente, [
              idClienteNum,
              producto.marca || producto.nombre,
              producto.modelo || 'Bicicleta nueva'
            ]);
          }
        }
      }

      const queryActualizarTotal = `
        UPDATE Venta 
        SET costo_total = $1 
        WHERE id_venta = $2
        RETURNING *;
      `;
      const resultTotal = await client.query(queryActualizarTotal, [costoTotalCalculado, id_venta]);

      try {
        await client.query(
          `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
           VALUES ($1, $2, 'Ventas', 'Registro de Venta', $3);`,
          [
            idUsuarioNum,
            nombreUsuarioOperador || 'Vendedor',
            `Venta #${id_venta} registrada por $${costoTotalCalculado}. Cliente #${idClienteNum}, ${detallesGuardados.length} artículo(s).`
          ]
        );
      } catch {
        // Ignorar fallo secundario en bitácora
      }

      await client.query('COMMIT');

      return {
        venta: resultTotal.rows[0],
        detalles: detallesGuardados
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** Consulta el listado paginado de ventas con datos de cliente, vendedor y medio de pago. */
  static async obtenerVentas(busqueda?: string | undefined, paginacion?: { limite?: number | undefined; pagina?: number | undefined }) {
    let query = `
      SELECT 
        v.id_venta,
        v.fecha,
        v.costo_total,
        v.id_cliente,
        COALESCE(v.estado, 'COMPLETADA') AS estado,
        v.id_metodo_pago,
        COALESCE(mp.nombre, 'Efectivo') AS metodo_pago_nombre,
        COALESCE(NULLIF(TRIM(v.cliente_nombre), ''), c.nombre) AS cliente_nombre,
        COALESCE(NULLIF(TRIM(v.cliente_apellido), ''), c.apellido) AS cliente_apellido,
        COALESCE(NULLIF(TRIM(v.cliente_dni), ''), c.dni) AS cliente_dni,
        c.telefono AS cliente_telefono,
        ((LOWER(TRIM(c.nombre)) = 'consumidor' AND LOWER(TRIM(c.apellido)) = 'final') OR c.direccion ILIKE '%mostrador%') AS es_consumidor_final,
        u.nombre_usuario AS usuario_nombre,
        u.rol AS usuario_rol,
        COUNT(*) OVER()::INT AS total_registros
      FROM Venta v
      INNER JOIN Cliente c ON v.id_cliente = c.id_cliente
      INNER JOIN Usuario u ON v.id_usuario = u.id_usuario
      LEFT JOIN Metodo_Pago mp ON v.id_metodo_pago = mp.id_metodo_pago
    `;

    const params: any[] = [];
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query += ` WHERE (
        c.nombre ILIKE $1 OR 
        c.apellido ILIKE $1 OR 
        c.dni ILIKE $1 OR 
        v.cliente_nombre ILIKE $1 OR 
        v.cliente_apellido ILIKE $1 OR 
        v.cliente_dni ILIKE $1 OR 
        u.nombre_usuario ILIKE $1 OR 
        CAST(v.id_venta AS TEXT) ILIKE $1
      )`;
      params.push(term);
    }

    query += ` ORDER BY v.id_venta DESC`;

    const pag = normalizarPaginacion(paginacion);
    query = aplicarPaginacionSQL(query, params, pag);

    const result = await pool.query(query, params);
    const total = result.rows.length > 0 ? Number(result.rows[0].total_registros) : 0;
    const meta = calcularMetaPaginacion(total, pag);

    const ventas = result.rows.map(({ total_registros, ...v }) => v);

    return {
      ...meta,
      ventas
    };
  }

  /** Recupera el comprobante de venta desglosado con cada uno de sus ítems. */
  static async obtenerVentaPorId(id: number) {
    validarId(id, 'El número de factura no es válido.');

    const queryVenta = `
      SELECT 
        v.id_venta,
        v.fecha,
        v.costo_total,
        v.id_cliente,
        COALESCE(v.estado, 'COMPLETADA') AS estado,
        v.id_metodo_pago,
        COALESCE(mp.nombre, 'Efectivo') AS metodo_pago_nombre,
        COALESCE(NULLIF(TRIM(v.cliente_nombre), ''), c.nombre) AS cliente_nombre,
        COALESCE(NULLIF(TRIM(v.cliente_apellido), ''), c.apellido) AS cliente_apellido,
        COALESCE(NULLIF(TRIM(v.cliente_dni), ''), c.dni) AS cliente_dni,
        c.telefono AS cliente_telefono,
        c.email AS cliente_email,
        c.direccion AS cliente_direccion,
        ((LOWER(TRIM(c.nombre)) = 'consumidor' AND LOWER(TRIM(c.apellido)) = 'final') OR c.direccion ILIKE '%mostrador%') AS es_consumidor_final,
        u.nombre_usuario AS usuario_nombre,
        u.rol AS usuario_rol
      FROM Venta v
      INNER JOIN Cliente c ON v.id_cliente = c.id_cliente
      INNER JOIN Usuario u ON v.id_usuario = u.id_usuario
      LEFT JOIN Metodo_Pago mp ON v.id_metodo_pago = mp.id_metodo_pago
      WHERE v.id_venta = $1;
    `;
    const resultVenta = await pool.query(queryVenta, [id]);

    if (resultVenta.rowCount === 0) {
      throw new NotFoundError('La venta solicitada no fue encontrada.');
    }

    const queryDetalles = `
      SELECT 
        dv.id_detalle_venta,
        dv.id_detalle_venta AS id_detalle,
        dv.id_venta,
        dv.id_producto,
        dv.cantidad,
        dv.precio_unitario,
        dv.costo_total,
        p.nombre,
        p.nombre AS producto_nombre,
        p.tipo_prod,
        p.tipo_prod AS producto_tipo,
        COALESCE(pb.marca, p.marca) AS marca,
        COALESCE(pb.marca, p.marca) AS producto_marca,
        COALESCE(p.modelo, '') AS modelo,
        pb.color,
        pb.color AS producto_color,
        pb.rodado,
        pb.rodado AS producto_rodado,
        pb.talle,
        pb.talle AS producto_talle,
        pb.genero,
        pb.genero AS producto_genero
      FROM Detalle_Venta dv
      INNER JOIN Productos p ON dv.id_producto = p.id_producto
      LEFT JOIN Producto_BiciNueva pb ON p.id_producto = pb.id_producto
      WHERE dv.id_venta = $1
      ORDER BY dv.id_detalle_venta ASC;
    `;
    const resultDetalles = await pool.query(queryDetalles, [id]);

    return {
      venta: resultVenta.rows[0],
      detalles: resultDetalles.rows,
      productos_vendidos: resultDetalles.rows
    };
  }

  /** Devuelve la lista de modalidades de pago habilitadas. */
  static async obtenerMetodosPago() {
    const query = 'SELECT * FROM Metodo_Pago ORDER BY id_metodo_pago ASC;';
    const result = await pool.query(query);
    return result.rows;
  }

  /** Consulta el estado de cobertura de garantías de bicicletas: 30 días para 1° service y extensión a 6 meses. */
  static async obtenerGarantiasBicicletas(busqueda?: string | undefined, paginacion?: { limite?: number | undefined; pagina?: number | undefined }) {
    let query = `
      SELECT 
        dv.id_detalle_venta,
        v.id_venta,
        v.fecha AS fecha_venta,
        v.costo_total,
        c.id_cliente,
        COALESCE(NULLIF(TRIM(v.cliente_nombre), ''), c.nombre) AS cliente_nombre,
        COALESCE(NULLIF(TRIM(v.cliente_apellido), ''), c.apellido) AS cliente_apellido,
        COALESCE(NULLIF(TRIM(v.cliente_dni), ''), c.dni) AS cliente_dni,
        c.telefono AS cliente_telefono,
        c.email AS cliente_email,
        ((LOWER(TRIM(c.nombre)) = 'consumidor' AND LOWER(TRIM(c.apellido)) = 'final') OR c.direccion ILIKE '%mostrador%') AS es_consumidor_final,
        u.nombre_usuario AS vendedor,
        p.id_producto,
        p.nombre AS producto_nombre,
        COALESCE(pb.marca, p.marca) AS marca,
        COALESCE(p.modelo, '') AS modelo,
        pb.color,
        pb.rodado,
        pb.talle,
        pb.genero,
        dv.cantidad,
        dv.precio_unitario,
        dv.primer_service_realizado,
        dv.fecha_primer_service,
        dv.observaciones_service,
        dv.service_excepcion,
        u_srv.nombre_usuario AS usuario_service,
        (v.fecha::DATE + 30)::DATE AS fecha_limite_service,
        (v.fecha::DATE + INTERVAL '6 months')::DATE AS fecha_vencimiento_extendida,
        CASE 
          WHEN dv.primer_service_realizado = true THEN (v.fecha::DATE + INTERVAL '6 months')::DATE
          ELSE (v.fecha::DATE + 30)::DATE
        END AS fecha_vencimiento,
        CASE 
          WHEN dv.primer_service_realizado = true THEN ((v.fecha::DATE + INTERVAL '6 months')::DATE - CURRENT_DATE)::INT
          ELSE ((v.fecha::DATE + 30)::DATE - CURRENT_DATE)::INT
        END AS dias_restantes,
        CASE 
          WHEN dv.primer_service_realizado = true THEN 
            CASE 
              WHEN (v.fecha::DATE + INTERVAL '6 months')::DATE < CURRENT_DATE THEN 'concluida'
              WHEN ((v.fecha::DATE + INTERVAL '6 months')::DATE - CURRENT_DATE)::INT <= 15 THEN 'por_vencer'
              ELSE 'vigente'
            END
          ELSE 
            CASE 
              WHEN (v.fecha::DATE + 30)::DATE < CURRENT_DATE THEN 'caducada_sin_service'
              WHEN ((v.fecha::DATE + 30)::DATE - CURRENT_DATE)::INT <= 7 THEN 'service_por_vencer'
              ELSE 'service_pendiente'
            END
        END AS estado_garantia
      FROM Detalle_Venta dv
      INNER JOIN Venta v ON dv.id_venta = v.id_venta
      INNER JOIN Cliente c ON v.id_cliente = c.id_cliente
      INNER JOIN Usuario u ON v.id_usuario = u.id_usuario
      INNER JOIN Productos p ON dv.id_producto = p.id_producto
      LEFT JOIN Producto_BiciNueva pb ON p.id_producto = pb.id_producto
      LEFT JOIN Usuario u_srv ON dv.id_usuario_service = u_srv.id_usuario
      WHERE (v.estado IS NULL OR v.estado != 'ANULADA')
        AND p.tipo_prod = 'bicicleta'
    `;

    const params: any[] = [];
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query += ` AND (
        p.nombre ILIKE $1 OR 
        p.marca ILIKE $1 OR 
        pb.marca ILIKE $1 OR 
        pb.genero ILIKE $1 OR 
        c.nombre ILIKE $1 OR 
        c.apellido ILIKE $1 OR 
        c.dni ILIKE $1 OR 
        v.cliente_nombre ILIKE $1 OR 
        v.cliente_apellido ILIKE $1 OR 
        v.cliente_dni ILIKE $1 OR 
        CAST(v.id_venta AS TEXT) ILIKE $1
      )`;
      params.push(term);
    }

    query += ` ORDER BY v.id_venta DESC`;

    if (paginacion?.limite && paginacion.limite > 0) {
      const lim = Math.min(paginacion.limite, 200);
      const pag = (paginacion.pagina && paginacion.pagina > 0) ? paginacion.pagina : 1;
      const offset = (pag - 1) * lim;

      params.push(lim);
      query += ` LIMIT $${params.length}`;
      params.push(offset);
      query += ` OFFSET $${params.length}`;
    }

    query += `;`;

    const result = await pool.query(query, params);

    let vigentes = 0;
    let service_pendiente = 0;
    let por_vencer = 0;
    let concluidas = 0;

    result.rows.forEach(g => {
      const st = g.estado_garantia;
      if (st === 'vigente') {
        vigentes++;
      } else if (st === 'service_pendiente') {
        service_pendiente++;
      } else if (st === 'service_por_vencer') {
        service_pendiente++;
        por_vencer++;
      } else if (st === 'por_vencer') {
        vigentes++;
        por_vencer++;
      } else if (st === 'caducada_sin_service' || st === 'concluida') {
        concluidas++;
      }
    });

    return {
      total: result.rowCount || 0,
      resumen: {
        total: result.rowCount || 0,
        service_pendiente,
        vigentes,
        por_vencer,
        concluidas
      },
      garantias: result.rows
    };
  }

  /** Registra el primer service obligatorio para una bicicleta vendida y extiende la garantía a 6 meses. */
  static async registrarPrimerService(
    idDetalleVenta: number | string,
    datos: {
      fecha_service?: string | undefined;
      observaciones?: string | undefined;
      idUsuarioOperador?: number | undefined;
      rolUsuarioOperador?: string | undefined;
      nombreUsuarioOperador?: string | undefined;
    }
  ) {
    const idDetNum = validarId(idDetalleVenta, 'El identificador del detalle de venta no es válido.');
    const { fecha_service, observaciones, idUsuarioOperador, rolUsuarioOperador, nombreUsuarioOperador } = datos;

    const queryDetalle = `
      SELECT 
        dv.id_detalle_venta,
        dv.id_venta,
        dv.id_producto,
        dv.primer_service_realizado,
        v.fecha AS fecha_venta,
        v.estado AS estado_venta,
        p.tipo_prod,
        p.nombre AS producto_nombre
      FROM Detalle_Venta dv
      INNER JOIN Venta v ON dv.id_venta = v.id_venta
      INNER JOIN Productos p ON dv.id_producto = p.id_producto
      WHERE dv.id_detalle_venta = $1;
    `;
    const res = await pool.query(queryDetalle, [idDetNum]);
    if (res.rowCount === 0) {
      throw new NotFoundError('El registro de venta de la bicicleta no existe.');
    }

    const reg = res.rows[0];
    if (reg.tipo_prod !== 'bicicleta') {
      throw new BadRequestError('El artículo seleccionado no corresponde a una bicicleta.');
    }
    if (reg.estado_venta === 'ANULADA') {
      throw new BadRequestError('La venta correspondiente fue anulada.');
    }
    if (reg.primer_service_realizado) {
      throw new BadRequestError('El primer service de esta bicicleta ya se encuentra registrado.');
    }

    // Cálculo de días transcurridos desde la fecha de venta
    const fechaVenta = new Date(reg.fecha_venta);
    const fechaSrv = fecha_service ? new Date(fecha_service) : new Date();
    const diffMs = fechaSrv.getTime() - fechaVenta.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let esExcepcion = false;
    if (diffDias > 30) {
      const rol = (rolUsuarioOperador || '').toUpperCase();
      if (rol !== 'ADMIN' && rol !== 'SUPERADMIN') {
        throw new BadRequestError(
          `Han transcurrido ${diffDias} días desde la venta (el plazo regular es de 30 días). Esta acción requiere autorización de un Administrador.`
        );
      }
      esExcepcion = true;
    }

    const obsLimpia = (observaciones || '').trim();

    const queryUpdate = `
      UPDATE Detalle_Venta
      SET 
        primer_service_realizado = true,
        fecha_primer_service = $1,
        observaciones_service = $2,
        id_usuario_service = $3,
        service_excepcion = $4
      WHERE id_detalle_venta = $5
      RETURNING *;
    `;

    const resUpdate = await pool.query(queryUpdate, [
      fechaSrv,
      obsLimpia || null,
      idUsuarioOperador || null,
      esExcepcion,
      idDetNum
    ]);

    // Bitácora de auditoría
    try {
      await pool.query(
        `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
         VALUES ($1, $2, 'Ventas', $3, $4);`,
        [
          idUsuarioOperador || null,
          nombreUsuarioOperador || 'Sistema',
          esExcepcion ? '1° Service Excepción' : '1° Service Registrado',
          `Registro de 1° Service para bicicleta "${reg.producto_nombre}" (Venta #${reg.id_venta}, ítem #${idDetNum}). Garantía extendida a 6 meses desde fecha de compra. Excepción administrativa: ${esExcepcion ? 'Sí' : 'No'}. Observaciones: ${obsLimpia || 'Sin notas adicionales'}`
        ]
      );
    } catch (bitErr) {
      console.warn('No se pudo registrar la bitácora del service:', bitErr);
    }

    return resUpdate.rows[0];
  }

  /** Incorpora un artículo adicional a una venta abierta y actualiza el importe total. */
  static async agregarDetalleVenta(idVenta: number, item: { id_producto: number | string; cantidad: number | string; precio_unitario?: number | string | undefined }) {
    validarId(idVenta, 'El número de venta no es válido.');

    const { id_producto, cantidad } = item;
    const idProdNum = validarId(id_producto, 'El identificador del producto no es válido.');
    const cantNum = Number(cantidad);

    if (isNaN(cantNum) || cantNum <= 0 || !Number.isInteger(cantNum)) {
      throw new BadRequestError('La cantidad debe ser un entero positivo.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const resVenta = await client.query('SELECT * FROM Venta WHERE id_venta = $1 FOR UPDATE;', [idVenta]);
      if (resVenta.rowCount === 0) {
        throw new NotFoundError('La venta no existe.');
      }

      const venta = resVenta.rows[0];
      if (venta.estado === 'ANULADA') {
        throw new BadRequestError('No se pueden agregar productos a una venta anulada.');
      }

      const resProd = await client.query('SELECT id_producto, nombre, marca, modelo, tipo_prod, precio, cantidad, activo FROM Productos WHERE id_producto = $1 FOR UPDATE;', [idProdNum]);
      if (resProd.rowCount === 0) {
        throw new NotFoundError('El producto no existe en el catálogo.');
      }

      const prod = resProd.rows[0];
      if (prod.activo === false) {
        throw new BadRequestError(`El artículo "${prod.nombre}" está dado de baja y no se puede agregar a la venta.`);
      }

      if (prod.cantidad < cantNum) {
        throw new BadRequestError(`Stock insuficiente para "${prod.nombre}".`);
      }

      // Blindaje de precio: Catálogo oficial como fuente de la verdad
      const finalPrice = Number(prod.precio) || 0;
      const subtotal = Math.round(cantNum * finalPrice * 100) / 100;

      const queryInsert = `
        INSERT INTO Detalle_Venta (id_venta, id_producto, cantidad, precio_unitario, costo_total)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
      const resDetalle = await client.query(queryInsert, [idVenta, idProdNum, cantNum, finalPrice, subtotal]);

      await client.query('UPDATE Productos SET cantidad = cantidad - $1 WHERE id_producto = $2;', [cantNum, idProdNum]);

      // Registrar egreso en Kardex (Movimiento_Stock)
      await client.query(
        `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
         VALUES ($1, $2, 'EGRESO', $3, 'Venta Comercial', $4);`,
        [idProdNum, venta.id_usuario, cantNum, `Artículo añadido a Venta #${idVenta}`]
      );

      // Si es bicicleta, registrar al cliente
      if (prod.tipo_prod === 'bicicleta') {
        const queryBiciCliente = `
          INSERT INTO Bicicleta (id_cliente, marca, modelo)
          VALUES ($1, $2, $3);
        `;
        for (let i = 0; i < cantNum; i++) {
          await client.query(queryBiciCliente, [
            venta.id_cliente,
            prod.marca || prod.nombre,
            prod.modelo || 'Bicicleta nueva'
          ]);
        }
      }

      await client.query(
        'UPDATE Venta SET costo_total = (SELECT COALESCE(SUM(costo_total), 0) FROM Detalle_Venta WHERE id_venta = $1) WHERE id_venta = $1;',
        [idVenta]
      );

      await client.query('COMMIT');

      return resDetalle.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** Anula una venta, restituye el stock al inventario y revierte bicicletas si procede. */
  static async anularVenta(id: number, motivo: string, operador: { idUsuarioOperador?: number | undefined; nombreUsuarioOperador?: string | undefined }) {
    validarId(id, 'El número de venta no es válido.');

    const { idUsuarioOperador, nombreUsuarioOperador } = operador;
    const idOperadorNum = Number(idUsuarioOperador);

    // Validación estricta de operador para auditoría
    if (!idUsuarioOperador || isNaN(idOperadorNum) || idOperadorNum <= 0) {
      throw new UnauthorizedError('No se pudo identificar al usuario que realiza la anulación.');
    }

    // Motivo obligatorio para anulación (mínimo 5 caracteres para evitar justificaciones vacías, máximo 250)
    const motivoLimpio = typeof motivo === 'string' ? motivo.trim() : '';
    if (!motivoLimpio || motivoLimpio.length < 5) {
      throw new BadRequestError('Debés indicar un motivo descriptivo para anular la venta (mínimo 5 caracteres).');
    }
    if (motivoLimpio.length > 250) {
      throw new BadRequestError('El motivo de anulación no puede superar los 250 caracteres.');
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const resVenta = await client.query('SELECT * FROM Venta WHERE id_venta = $1 FOR UPDATE;', [id]);
      if (resVenta.rowCount === 0) {
        throw new NotFoundError('La venta no existe.');
      }

      const venta = resVenta.rows[0];
      if (venta.estado === 'ANULADA') {
        throw new BadRequestError('La venta ya se encuentra anulada.');
      }

      const resDetalles = await client.query(`
        SELECT dv.id_producto, dv.cantidad, p.tipo_prod, p.marca, p.modelo, p.nombre
        FROM Detalle_Venta dv
        INNER JOIN Productos p ON dv.id_producto = p.id_producto
        WHERE dv.id_venta = $1;
      `, [id]);

      for (const d of resDetalles.rows) {
        // Reintegrar stock a productos
        await client.query('UPDATE Productos SET cantidad = cantidad + $1 WHERE id_producto = $2;', [d.cantidad, d.id_producto]);

        // Registrar movimiento de stock con el operador verificado
        try {
          await client.query(
            `INSERT INTO Movimiento_Stock (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
             VALUES ($1, $2, 'INGRESO', $3, 'Anulación de Venta', $4);`,
            [d.id_producto, idOperadorNum, d.cantidad, `Reintegro por venta #${id} anulada: ${motivoLimpio}`]
          );
        } catch {
          // Ignorar fallo secundario en tabla opcional de movimientos
        }

        // Si se vendieron bicicletas, remover del cliente las bicicletas creadas si no tienen reparaciones asociadas
        if (d.tipo_prod === 'bicicleta') {
          const marcaBici = d.marca || d.nombre;
          await client.query(`
            DELETE FROM Bicicleta
            WHERE id_bicicleta IN (
              SELECT b.id_bicicleta
              FROM Bicicleta b
              LEFT JOIN Reparacion r ON b.id_bicicleta = r.id_bicicleta
              WHERE b.id_cliente = $1
                AND b.marca = $2
                AND r.id_reparacion IS NULL
              ORDER BY b.id_bicicleta DESC
              LIMIT $3
            );
          `, [venta.id_cliente, marcaBici, d.cantidad]);
        }
      }

      await client.query(
        `UPDATE Venta 
         SET estado = 'ANULADA',
             fecha_anulacion = CURRENT_TIMESTAMP,
             motivo_anulacion = $2
         WHERE id_venta = $1;`,
        [id, motivoLimpio]
      );

      try {
        await client.query(
          `INSERT INTO Bitacora_Actividad (id_usuario, nombre_usuario, modulo, accion, descripcion)
           VALUES ($1, $2, 'Ventas', 'Anulación de Venta', $3);`,
          [
            idOperadorNum,
            nombreUsuarioOperador || 'Usuario',
            `Venta #${id} anulada por ${nombreUsuarioOperador || 'Usuario'}. Motivo: "${motivoLimpio}". Total devuelto: $${venta.costo_total}.`
          ]
        );
      } catch {
        // Ignorar fallo secundario en bitácora
      }

      await client.query('COMMIT');

      return {
        message: 'Venta anulada y stock reintegrado con éxito',
        id_venta: id
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
