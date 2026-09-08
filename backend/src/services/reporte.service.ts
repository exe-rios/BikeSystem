import { pool } from '../config/db.js';
import { BadRequestError } from '../utils/errors.js';
import { DATE_REGEX } from '../utils/validation.js';
import { normalizarPaginacion, aplicarPaginacionSQL, calcularMetaPaginacion } from '../utils/pagination.js';

/** Genera cláusula SQL parametrizada para rango de fechas (desde / hasta). */
const construirFiltroFecha = (columna: string, desde?: string | undefined, hasta?: string | undefined, paramOffset: number = 1): { sql: string; params: any[] } => {
  const condiciones: string[] = [];
  const params: any[] = [];
  let idx = paramOffset;

  if (desde && typeof desde === 'string' && desde.trim()) {
    const desdeLimpio = desde.trim();
    if (!DATE_REGEX.test(desdeLimpio)) {
      throw new BadRequestError('El formato de fecha "desde" no es válido. Usá AAAA-MM-DD (ej: 2026-05-01).');
    }
    condiciones.push(`${columna} >= $${idx++}`);
    params.push(desdeLimpio);
  }
  if (hasta && typeof hasta === 'string' && hasta.trim()) {
    const hastaLimpio = hasta.trim();
    if (!DATE_REGEX.test(hastaLimpio)) {
      throw new BadRequestError('El formato de fecha "hasta" no es válido. Usá AAAA-MM-DD (ej: 2026-05-31).');
    }
    condiciones.push(`${columna} <= $${idx++}`);
    params.push(hastaLimpio);
  }

  return {
    sql: condiciones.length > 0 ? ` AND ${condiciones.join(' AND ')}` : '',
    params
  };
};

/** Servicio de analítica, balances financieros consolidados y reportes del sistema. */
export class ReporteService {
  /** Obtiene métricas en tiempo real para el panel de inicio (finanzas del mes, alertas y ranking). */
  static async obtenerDashboard() {
    const queryGanancias = `
      SELECT 
        (SELECT COALESCE(SUM(costo_total), 0) FROM Venta WHERE (estado IS NULL OR estado != 'ANULADA') AND EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)) AS ventas_mes,
        (SELECT COALESCE(SUM(costo_total), 0) FROM Reparacion WHERE estado = 'Entregada' AND EXTRACT(MONTH FROM COALESCE(fecha_egreso, fecha_ingreso)) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM COALESCE(fecha_egreso, fecha_ingreso)) = EXTRACT(YEAR FROM CURRENT_DATE)) AS taller_mes,
        (SELECT COALESCE(SUM(monto_total), 0) FROM Pago_Proveedor WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)) AS egresos_proveedores_mes;
    `;

    const queryTaller = `
      SELECT estado, COUNT(*) as cantidad 
      FROM Reparacion 
      WHERE estado != 'Entregada' 
      GROUP BY estado;
    `;

    const queryStock = `
      SELECT id_producto, nombre, marca, cantidad, stock_minimo 
      FROM Productos 
      WHERE activo = true AND (cantidad <= stock_minimo OR cantidad <= 5)
      ORDER BY cantidad ASC 
      LIMIT 5;
    `;

    const queryTopProductos = `
      SELECT 
        p.id_producto,
        p.nombre,
        p.tipo_prod,
        COALESCE(pb.marca, p.marca) AS marca,
        COALESCE(SUM(dv.cantidad), 0)::INT AS total_vendido,
        COALESCE(SUM(dv.costo_total), 0)::NUMERIC AS total_recaudado
      FROM Detalle_Venta dv
      INNER JOIN Venta v ON dv.id_venta = v.id_venta
      INNER JOIN Productos p ON dv.id_producto = p.id_producto
      LEFT JOIN Producto_BiciNueva pb ON p.id_producto = pb.id_producto
      WHERE (v.estado IS NULL OR v.estado != 'ANULADA')
      GROUP BY p.id_producto, p.nombre, p.tipo_prod, pb.marca, p.marca
      ORDER BY total_vendido DESC
      LIMIT 10;
    `;

    // Ejecución paralela de las 4 consultas independientes del dashboard
    const [resultGanancias, resultTaller, resultStock, resultTopProd] = await Promise.all([
      pool.query(queryGanancias),
      pool.query(queryTaller),
      pool.query(queryStock),
      pool.query(queryTopProductos)
    ]);

    const ventasMes = Math.round(Number(resultGanancias.rows[0].ventas_mes) * 100) / 100;
    const tallerMes = Math.round(Number(resultGanancias.rows[0].taller_mes) * 100) / 100;
    const egresosMes = Math.round(Number(resultGanancias.rows[0].egresos_proveedores_mes) * 100) / 100;
    const recaudacionTotalMes = Math.round((ventasMes + tallerMes) * 100) / 100;
    const balanceNetoMes = Math.round((recaudacionTotalMes - egresosMes) * 100) / 100;

    const totalTallerActivo = resultTaller.rows.reduce((acc, row) => acc + (parseInt(row.cantidad, 10) || 0), 0);

    return {
      finanzas: {
        ventas_mostrador: ventasMes,
        ingresos_taller: tallerMes,
        total_mes: recaudacionTotalMes,
        egresos_proveedores: egresosMes,
        balance_neto_mes: balanceNetoMes
      },
      taller_activo: resultTaller.rows,
      total_taller_activo: totalTallerActivo,
      alertas_stock: resultStock.rows,
      top_productos: resultTopProd.rows
    };
  }

  /** Calcula KPIs consolidados (ventas, taller, egresos, rentabilidad y ticket promedio) en un período. */
  static async obtenerEstadisticas(filtros: { fechaDesde?: string | undefined; fechaHasta?: string | undefined }) {
    const { fechaDesde, fechaHasta } = filtros;

    const fVentas = construirFiltroFecha('fecha', fechaDesde, fechaHasta, 1);
    const queryVentas = `
      SELECT 
        COALESCE(SUM(costo_total), 0)::NUMERIC AS total_ventas,
        COUNT(*)::INT AS cantidad_ventas
      FROM Venta
      WHERE (estado IS NULL OR estado != 'ANULADA') ${fVentas.sql};
    `;

    const fTaller = construirFiltroFecha('COALESCE(fecha_egreso, fecha_ingreso)', fechaDesde, fechaHasta, 1);
    const queryTaller = `
      SELECT 
        COALESCE(SUM(costo_total), 0)::NUMERIC AS total_taller,
        COALESCE(SUM(costo_mano_obra), 0)::NUMERIC AS total_mano_obra,
        COUNT(*)::INT AS cantidad_entregadas
      FROM Reparacion
      WHERE estado = 'Entregada' ${fTaller.sql};
    `;

    const fPagos = construirFiltroFecha('fecha', fechaDesde, fechaHasta, 1);
    const queryPagos = `
      SELECT 
        COALESCE(SUM(monto_total), 0)::NUMERIC AS total_egresos,
        COUNT(*)::INT AS cantidad_pagos
      FROM Pago_Proveedor
      WHERE 1=1 ${fPagos.sql};
    `;

    const fTallerGeneral = construirFiltroFecha('fecha_ingreso', fechaDesde, fechaHasta, 1);
    const queryEstadosTaller = `
      SELECT 
        estado,
        COUNT(*)::INT AS cantidad,
        COALESCE(SUM(costo_total), 0)::NUMERIC AS monto_total
      FROM Reparacion
      WHERE 1=1 ${fTallerGeneral.sql}
      GROUP BY estado;
    `;

    // Ejecución paralela de las 4 consultas independientes de estadísticas
    const [resVentas, resTaller, resPagos, resEstadosTaller] = await Promise.all([
      pool.query(queryVentas, fVentas.params),
      pool.query(queryTaller, fTaller.params),
      pool.query(queryPagos, fPagos.params),
      pool.query(queryEstadosTaller, fTallerGeneral.params)
    ]);

    const totalVentasMonto = Number(resVentas.rows[0]?.total_ventas || 0);
    const totalVentasCantidad = Number(resVentas.rows[0]?.cantidad_ventas || 0);

    const totalReparacionesMonto = Number(resTaller.rows[0]?.total_taller || 0);
    const totalManoObraMonto = Number(resTaller.rows[0]?.total_mano_obra || 0);
    const totalReparacionesEntregadas = Number(resTaller.rows[0]?.cantidad_entregadas || 0);

    const totalPagosProveedoresMonto = Number(resPagos.rows[0]?.total_egresos || 0);
    const totalPagosCantidad = Number(resPagos.rows[0]?.cantidad_pagos || 0);

    let recibidasCount = 0;
    let enReparacionCount = 0;
    let listasCount = 0;
    let montoEstimadoEnProceso = 0;

    resEstadosTaller.rows.forEach(r => {
      const count = Number(r.cantidad);
      const monto = Number(r.monto_total);
      if (r.estado === 'Recibida') {
        recibidasCount = count;
        montoEstimadoEnProceso += monto;
      } else if (r.estado === 'En Reparación') {
        enReparacionCount = count;
        montoEstimadoEnProceso += monto;
      } else if (r.estado === 'Lista') {
        listasCount = count;
        montoEstimadoEnProceso += monto;
      }
    });

    const totalIngresos = Math.round((totalVentasMonto + totalReparacionesMonto) * 100) / 100;
    const balanceNetoPeriodo = Math.round((totalIngresos - totalPagosProveedoresMonto) * 100) / 100;
    const margenRentabilidad = totalIngresos > 0 
      ? Number(((balanceNetoPeriodo / totalIngresos) * 100).toFixed(1)) 
      : 0;
    const totalOperacionesCobradas = totalVentasCantidad + totalReparacionesEntregadas;
    const ticketPromedio = totalOperacionesCobradas > 0 
      ? Math.round((totalIngresos / totalOperacionesCobradas) * 100) / 100 
      : 0;
    const porcentajeVentas = totalIngresos > 0 
      ? Math.round((totalVentasMonto / totalIngresos) * 100) 
      : 0;
    const porcentajeTaller = totalIngresos > 0 
      ? (100 - porcentajeVentas) 
      : 0;

    return {
      kpis: {
        total_ingresos: totalIngresos,
        total_ventas_monto: totalVentasMonto,
        total_ventas_cantidad: totalVentasCantidad,
        total_reparaciones_monto: totalReparacionesMonto,
        total_reparaciones_cantidad: totalReparacionesEntregadas,
        total_mano_obra_monto: totalManoObraMonto,
        total_egresos_monto: totalPagosProveedoresMonto,
        total_egresos_cantidad: totalPagosCantidad,
        balance_neto: balanceNetoPeriodo,
        margen_rentabilidad: margenRentabilidad,
        total_operaciones_cobradas: totalOperacionesCobradas,
        ticket_promedio: ticketPromedio,
        porcentaje_ventas: porcentajeVentas,
        porcentaje_taller: porcentajeTaller,
        monto_estimado_en_proceso: montoEstimadoEnProceso,
        total_ordenes_en_proceso: (recibidasCount + enReparacionCount + listasCount)
      },
      estadisticas_taller: {
        recibidas: recibidasCount,
        en_reparacion: enReparacionCount,
        listas: listasCount,
        entregadas: totalReparacionesEntregadas
      }
    };
  }

  /** Genera reporte paginado de ventas con filtros de fecha, totales facturados y estado. */
  static async obtenerVentasReporte(filtros: { 
    fechaDesde?: string | undefined; 
    fechaHasta?: string | undefined; 
    busqueda?: string | undefined;
    limite?: number | string | undefined;
    pagina?: number | string | undefined;
  }) {
    const { fechaDesde, fechaHasta, busqueda, limite, pagina } = filtros;
    const condiciones: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (fechaDesde && typeof fechaDesde === 'string' && fechaDesde.trim()) {
      condiciones.push(`v.fecha >= $${idx++}`);
      params.push(fechaDesde.trim());
    }
    if (fechaHasta && typeof fechaHasta === 'string' && fechaHasta.trim()) {
      condiciones.push(`v.fecha <= $${idx++}`);
      params.push(fechaHasta.trim());
    }
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      condiciones.push(`(
        c.nombre ILIKE $${idx} OR 
        c.apellido ILIKE $${idx} OR 
        u.nombre_usuario ILIKE $${idx} OR 
        CAST(v.id_venta AS TEXT) ILIKE $${idx}
      )`);
      params.push(term);
      idx++;
    }

    const whereSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const query = `
      SELECT 
        v.id_venta, 
        v.fecha, 
        v.costo_total, 
        v.id_cliente, 
        v.id_metodo_pago,
        COALESCE(mp.nombre, 'Efectivo') AS metodo_pago_nombre,
        COALESCE(v.estado, 'COMPLETADA') AS estado,
        c.nombre AS cliente_nombre, 
        c.apellido AS cliente_apellido,
        u.nombre_usuario AS vendedor,
        COUNT(*) OVER()::INT AS total_registros,
        COUNT(*) FILTER (WHERE v.estado != 'ANULADA') OVER()::INT AS total_cobradas_resumen,
        COUNT(*) FILTER (WHERE v.estado = 'ANULADA') OVER()::INT AS total_anuladas_resumen,
        COALESCE(SUM(v.costo_total) FILTER (WHERE v.estado != 'ANULADA') OVER(), 0)::NUMERIC AS total_facturado_resumen
      FROM Venta v
      INNER JOIN Cliente c ON v.id_cliente = c.id_cliente
      INNER JOIN Usuario u ON v.id_usuario = u.id_usuario
      LEFT JOIN Metodo_Pago mp ON v.id_metodo_pago = mp.id_metodo_pago
      ${whereSql}
      ORDER BY v.id_venta DESC
    `;

    const paginacion = normalizarPaginacion({ limite, pagina });
    const queryPaginada = aplicarPaginacionSQL(query, params, paginacion);

    const result = await pool.query(queryPaginada, params);

    const firstRow = result.rows[0];
    const total = firstRow ? Number(firstRow.total_registros) : 0;
    const totalFacturado = firstRow ? Math.round(Number(firstRow.total_facturado_resumen) * 100) / 100 : 0;
    const ventasCobradas = firstRow ? Number(firstRow.total_cobradas_resumen) : 0;
    const ventasAnuladas = firstRow ? Number(firstRow.total_anuladas_resumen) : 0;
    const meta = calcularMetaPaginacion(total, paginacion);

    const ventas = result.rows.map(({ total_registros, total_cobradas_resumen, total_anuladas_resumen, total_facturado_resumen, ...v }) => v);

    return {
      ...meta,
      total_facturado: totalFacturado,
      ventas_cobradas: ventasCobradas,
      ventas_anuladas: ventasAnuladas,
      resumen: {
        total_ventas: total,
        ventas_cobradas: ventasCobradas,
        ventas_anuladas: ventasAnuladas,
        total_facturado: totalFacturado
      },
      ventas
    };
  }

  /** Genera reporte paginado de reparaciones con recaudación de taller y mano de obra. */
  static async obtenerReparacionesReporte(filtros: { 
    fechaDesde?: string | undefined; 
    fechaHasta?: string | undefined; 
    busqueda?: string | undefined;
    limite?: number | string | undefined;
    pagina?: number | string | undefined;
  }) {
    const { fechaDesde, fechaHasta, busqueda, limite, pagina } = filtros;
    const condiciones: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (fechaDesde && typeof fechaDesde === 'string' && fechaDesde.trim()) {
      condiciones.push(`COALESCE(r.fecha_egreso, r.fecha_ingreso) >= $${idx++}`);
      params.push(fechaDesde.trim());
    }
    if (fechaHasta && typeof fechaHasta === 'string' && fechaHasta.trim()) {
      condiciones.push(`COALESCE(r.fecha_egreso, r.fecha_ingreso) <= $${idx++}`);
      params.push(fechaHasta.trim());
    }
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      condiciones.push(`(
        c.nombre ILIKE $${idx} OR 
        c.apellido ILIKE $${idx} OR 
        b.marca ILIKE $${idx} OR 
        b.modelo ILIKE $${idx} OR 
        r.descripcion ILIKE $${idx} OR 
        u.nombre_usuario ILIKE $${idx} OR 
        CAST(r.id_reparacion AS TEXT) ILIKE $${idx}
      )`);
      params.push(term);
      idx++;
    }

    const whereSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const query = `
      SELECT 
        r.id_reparacion, 
        r.fecha_ingreso, 
        r.fecha_egreso, 
        r.estado, 
        r.descripcion, 
        r.costo_mano_obra, 
        r.costo_total,
        b.marca, 
        b.modelo, 
        c.nombre AS cliente_nombre, 
        c.apellido AS cliente_apellido,
        u.nombre_usuario AS mecanico,
        COUNT(*) OVER()::INT AS total_registros,
        COUNT(*) FILTER (WHERE r.estado = 'Entregada') OVER()::INT AS total_entregadas_resumen,
        COUNT(*) FILTER (WHERE r.estado != 'Entregada') OVER()::INT AS total_en_proceso_resumen,
        COALESCE(SUM(r.costo_total) FILTER (WHERE r.estado = 'Entregada') OVER(), 0)::NUMERIC AS total_recaudado_resumen,
        COALESCE(SUM(r.costo_mano_obra) FILTER (WHERE r.estado = 'Entregada') OVER(), 0)::NUMERIC AS total_mano_obra_resumen
      FROM Reparacion r
      INNER JOIN Bicicleta b ON r.id_bicicleta = b.id_bicicleta
      INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
      INNER JOIN Usuario u ON r.id_usuario = u.id_usuario
      ${whereSql}
      ORDER BY r.id_reparacion DESC
    `;

    const paginacion = normalizarPaginacion({ limite, pagina });
    const queryPaginada = aplicarPaginacionSQL(query, params, paginacion);

    const result = await pool.query(queryPaginada, params);

    const firstRow = result.rows[0];
    const total = firstRow ? Number(firstRow.total_registros) : 0;
    const totalEntregadas = firstRow ? Number(firstRow.total_entregadas_resumen) : 0;
    const totalEnTaller = firstRow ? Number(firstRow.total_en_proceso_resumen) : 0;
    const totalRecaudadoEntregadas = firstRow ? Math.round(Number(firstRow.total_recaudado_resumen) * 100) / 100 : 0;
    const totalManoObra = firstRow ? Math.round(Number(firstRow.total_mano_obra_resumen) * 100) / 100 : 0;
    const meta = calcularMetaPaginacion(total, paginacion);

    const reparaciones = result.rows.map(({ total_registros, total_entregadas_resumen, total_en_proceso_resumen, total_recaudado_resumen, total_mano_obra_resumen, ...r }) => r);

    return {
      ...meta,
      entregadas_count: totalEntregadas,
      en_proceso_count: totalEnTaller,
      total_recaudado: totalRecaudadoEntregadas,
      total_entregadas: totalEntregadas,
      total_en_proceso: totalEnTaller,
      total_recaudado_entregadas: totalRecaudadoEntregadas,
      total_mano_obra: totalManoObra,
      resumen: {
        total_ordenes: total,
        entregadas: totalEntregadas,
        en_taller: totalEnTaller,
        total_recaudado: totalRecaudadoEntregadas,
        total_mano_obra: totalManoObra
      },
      reparaciones
    };
  }

  /** Genera reporte paginado de egresos a proveedores con filtros de fecha y texto. */
  static async obtenerEgresosReporte(filtros: { 
    fechaDesde?: string | undefined; 
    fechaHasta?: string | undefined; 
    busqueda?: string | undefined;
    limite?: number | string | undefined;
    pagina?: number | string | undefined;
  }) {
    const { fechaDesde, fechaHasta, busqueda, limite, pagina } = filtros;
    const condiciones: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (fechaDesde && typeof fechaDesde === 'string' && fechaDesde.trim()) {
      condiciones.push(`p.fecha >= $${idx++}`);
      params.push(fechaDesde.trim());
    }
    if (fechaHasta && typeof fechaHasta === 'string' && fechaHasta.trim()) {
      condiciones.push(`p.fecha <= $${idx++}`);
      params.push(fechaHasta.trim());
    }
    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      condiciones.push(`(
        prov.nombre_empresa ILIKE $${idx} OR 
        mp.nombre ILIKE $${idx} OR 
        u.nombre_usuario ILIKE $${idx} OR 
        p.observaciones ILIKE $${idx} OR 
        CAST(p.id_pago AS TEXT) ILIKE $${idx}
      )`);
      params.push(term);
      idx++;
    }

    const whereSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const query = `
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
        p.observaciones,
        COUNT(*) OVER()::INT AS total_registros,
        COALESCE(SUM(p.monto_total) OVER(), 0)::NUMERIC AS total_egresos_resumen
      FROM Pago_Proveedor p
      JOIN Proveedor prov ON p.id_proveedor = prov.id_proveedor
      JOIN Usuario u ON p.id_usuario = u.id_usuario
      JOIN Metodo_Pago mp ON p.id_metodo_pago = mp.id_metodo_pago
      ${whereSql}
      ORDER BY p.id_pago DESC
    `;

    const paginacion = normalizarPaginacion({ limite, pagina });
    const queryPaginada = aplicarPaginacionSQL(query, params, paginacion);

    const result = await pool.query(queryPaginada, params);

    const firstRow = result.rows[0];
    const total = firstRow ? Number(firstRow.total_registros) : 0;
    const totalEgresos = firstRow ? Math.round(Number(firstRow.total_egresos_resumen) * 100) / 100 : 0;
    const meta = calcularMetaPaginacion(total, paginacion);

    const egresos = result.rows.map(({ total_registros, total_egresos_resumen, ...p }) => p);

    return {
      ...meta,
      total_egresos: totalEgresos,
      resumen: {
        total_pagos: total,
        total_monto_egresos: totalEgresos
      },
      egresos,
      pagos: egresos
    };
  }

  /** Retorna el ranking de los 20 artículos con mayor volumen de venta e ingresos. */
  static async obtenerRankingProductos() {
    const query = `
      SELECT 
        p.id_producto,
        p.nombre,
        p.tipo_prod,
        COALESCE(pb.marca, p.marca) AS marca,
        COALESCE(SUM(dv.cantidad), 0)::INT AS total_vendido,
        COALESCE(SUM(dv.costo_total), 0)::NUMERIC AS total_recaudado,
        p.cantidad AS stock_actual,
        p.precio AS precio_actual
      FROM Detalle_Venta dv
      INNER JOIN Venta v ON dv.id_venta = v.id_venta
      INNER JOIN Productos p ON dv.id_producto = p.id_producto
      LEFT JOIN Producto_BiciNueva pb ON p.id_producto = pb.id_producto
      WHERE (v.estado IS NULL OR v.estado != 'ANULADA')
      GROUP BY p.id_producto, p.nombre, p.tipo_prod, pb.marca, p.marca, p.cantidad, p.precio
      ORDER BY total_vendido DESC
      LIMIT 20;
    `;
    const result = await pool.query(query);
    return {
      total: result.rowCount || 0,
      ranking: result.rows
    };
  }
}
