import { pool } from '../config/db.js';

const construirFiltroFecha = (columna: string, desde?: string | undefined, hasta?: string | undefined, paramOffset: number = 1): { sql: string; params: any[] } => {
  const condiciones: string[] = [];
  const params: any[] = [];
  let idx = paramOffset;

  if (desde && typeof desde === 'string' && desde.trim()) {
    condiciones.push(`DATE(${columna}) >= $${idx++}`);
    params.push(desde.trim());
  }
  if (hasta && typeof hasta === 'string' && hasta.trim()) {
    condiciones.push(`DATE(${columna}) <= $${idx++}`);
    params.push(hasta.trim());
  }

  return {
    sql: condiciones.length > 0 ? ` AND ${condiciones.join(' AND ')}` : '',
    params
  };
};

export class ReporteService {
  static async obtenerDashboard() {
    const queryGanancias = `
      SELECT 
        (SELECT COALESCE(SUM(costo_total), 0) FROM Venta WHERE (estado IS NULL OR estado != 'ANULADA') AND EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)) AS ventas_mes,
        (SELECT COALESCE(SUM(costo_total), 0) FROM Reparacion WHERE estado = 'Entregada' AND EXTRACT(MONTH FROM fecha_egreso) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha_egreso) = EXTRACT(YEAR FROM CURRENT_DATE)) AS taller_mes,
        (SELECT COALESCE(SUM(monto_total), 0) FROM Pago_Proveedor WHERE EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)) AS egresos_proveedores_mes;
    `;
    const resultGanancias = await pool.query(queryGanancias);

    const ventasMes = Number(resultGanancias.rows[0].ventas_mes);
    const tallerMes = Number(resultGanancias.rows[0].taller_mes);
    const egresosMes = Number(resultGanancias.rows[0].egresos_proveedores_mes);
    const recaudacionTotalMes = ventasMes + tallerMes;
    const balanceNetoMes = recaudacionTotalMes - egresosMes;

    const queryTaller = `
      SELECT estado, COUNT(*) as cantidad 
      FROM Reparacion 
      WHERE estado != 'Entregada' 
      GROUP BY estado;
    `;
    const resultTaller = await pool.query(queryTaller);

    const queryStock = `
      SELECT id_producto, nombre, marca, cantidad, stock_minimo 
      FROM Productos 
      WHERE activo = true AND (cantidad <= stock_minimo OR cantidad <= 5)
      ORDER BY cantidad ASC 
      LIMIT 5;
    `;
    const resultStock = await pool.query(queryStock);

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
    const resultTopProd = await pool.query(queryTopProductos);

    return {
      finanzas: {
        ventas_mostrador: ventasMes,
        ingresos_taller: tallerMes,
        total_mes: recaudacionTotalMes,
        egresos_proveedores: egresosMes,
        balance_neto_mes: balanceNetoMes
      },
      taller_activo: resultTaller.rows,
      alertas_stock: resultStock.rows,
      top_productos: resultTopProd.rows
    };
  }

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
    const resVentas = await pool.query(queryVentas, fVentas.params);
    const totalVentasMonto = Number(resVentas.rows[0].total_ventas);
    const totalVentasCantidad = Number(resVentas.rows[0].cantidad_ventas);

    const fTaller = construirFiltroFecha('COALESCE(fecha_egreso, fecha_ingreso)', fechaDesde, fechaHasta, 1);
    const queryTaller = `
      SELECT 
        COALESCE(SUM(costo_total), 0)::NUMERIC AS total_taller,
        COALESCE(SUM(costo_mano_obra), 0)::NUMERIC AS total_mano_obra,
        COUNT(*)::INT AS cantidad_entregadas
      FROM Reparacion
      WHERE estado = 'Entregada' ${fTaller.sql};
    `;
    const resTaller = await pool.query(queryTaller, fTaller.params);
    const totalReparacionesMonto = Number(resTaller.rows[0].total_taller);
    const totalManoObraMonto = Number(resTaller.rows[0].total_mano_obra);
    const totalReparacionesEntregadas = Number(resTaller.rows[0].cantidad_entregadas);

    const fPagos = construirFiltroFecha('fecha', fechaDesde, fechaHasta, 1);
    const queryPagos = `
      SELECT 
        COALESCE(SUM(monto_total), 0)::NUMERIC AS total_egresos,
        COUNT(*)::INT AS cantidad_pagos
      FROM Pago_Proveedor
      WHERE 1=1 ${fPagos.sql};
    `;
    const resPagos = await pool.query(queryPagos, fPagos.params);
    const totalPagosProveedoresMonto = Number(resPagos.rows[0].total_egresos);
    const totalPagosCantidad = Number(resPagos.rows[0].cantidad_pagos);

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
    const resEstadosTaller = await pool.query(queryEstadosTaller, fTallerGeneral.params);

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

    const totalIngresos = totalVentasMonto + totalReparacionesMonto;
    const balanceNetoPeriodo = totalIngresos - totalPagosProveedoresMonto;
    const margenRentabilidad = totalIngresos > 0 
      ? Number(((balanceNetoPeriodo / totalIngresos) * 100).toFixed(1)) 
      : 0;
    const totalOperacionesCobradas = totalVentasCantidad + totalReparacionesEntregadas;
    const ticketPromedio = totalOperacionesCobradas > 0 
      ? Math.round(totalIngresos / totalOperacionesCobradas) 
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

  static async obtenerVentasReporte(filtros: { fechaDesde?: string | undefined; fechaHasta?: string | undefined; busqueda?: string | undefined }) {
    const { fechaDesde, fechaHasta, busqueda } = filtros;
    const condiciones: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (fechaDesde && typeof fechaDesde === 'string' && fechaDesde.trim()) {
      condiciones.push(`DATE(v.fecha) >= $${idx++}`);
      params.push(fechaDesde.trim());
    }
    if (fechaHasta && typeof fechaHasta === 'string' && fechaHasta.trim()) {
      condiciones.push(`DATE(v.fecha) <= $${idx++}`);
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
        u.nombre_usuario AS vendedor
      FROM Venta v
      INNER JOIN Cliente c ON v.id_cliente = c.id_cliente
      INNER JOIN Usuario u ON v.id_usuario = u.id_usuario
      LEFT JOIN Metodo_Pago mp ON v.id_metodo_pago = mp.id_metodo_pago
      ${whereSql}
      ORDER BY v.id_venta DESC;
    `;
    const result = await pool.query(query, params);

    let totalFacturado = 0;
    let ventasCobradas = 0;
    let ventasAnuladas = 0;

    result.rows.forEach(v => {
      if (v.estado === 'ANULADA') {
        ventasAnuladas++;
      } else {
        ventasCobradas++;
        totalFacturado += Number(v.costo_total);
      }
    });

    return {
      total: result.rowCount || 0,
      total_facturado: totalFacturado,
      ventas_cobradas: ventasCobradas,
      ventas_anuladas: ventasAnuladas,
      resumen: {
        total_ventas: result.rowCount || 0,
        ventas_cobradas: ventasCobradas,
        ventas_anuladas: ventasAnuladas,
        total_facturado: totalFacturado
      },
      ventas: result.rows
    };
  }

  static async obtenerReparacionesReporte(filtros: { fechaDesde?: string | undefined; fechaHasta?: string | undefined; busqueda?: string | undefined }) {
    const { fechaDesde, fechaHasta, busqueda } = filtros;
    const condiciones: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (fechaDesde && typeof fechaDesde === 'string' && fechaDesde.trim()) {
      condiciones.push(`DATE(COALESCE(r.fecha_egreso, r.fecha_ingreso)) >= $${idx++}`);
      params.push(fechaDesde.trim());
    }
    if (fechaHasta && typeof fechaHasta === 'string' && fechaHasta.trim()) {
      condiciones.push(`DATE(COALESCE(r.fecha_egreso, r.fecha_ingreso)) <= $${idx++}`);
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
        u.nombre_usuario AS mecanico
      FROM Reparacion r
      INNER JOIN Bicicleta b ON r.id_bicicleta = b.id_bicicleta
      INNER JOIN Cliente c ON b.id_cliente = c.id_cliente
      INNER JOIN Usuario u ON r.id_usuario = u.id_usuario
      ${whereSql}
      ORDER BY r.id_reparacion DESC;
    `;
    const result = await pool.query(query, params);

    let totalRecaudadoEntregadas = 0;
    let totalManoObra = 0;
    let totalEntregadas = 0;
    let totalEnTaller = 0;

    result.rows.forEach(r => {
      if (r.estado === 'Entregada') {
        totalEntregadas++;
        totalRecaudadoEntregadas += Number(r.costo_total);
        totalManoObra += Number(r.costo_mano_obra);
      } else {
        totalEnTaller++;
      }
    });

    return {
      total: result.rowCount || 0,
      entregadas_count: totalEntregadas,
      en_proceso_count: totalEnTaller,
      total_recaudado: totalRecaudadoEntregadas,
      total_mano_obra: totalManoObra,
      resumen: {
        total_ordenes: result.rowCount || 0,
        entregadas: totalEntregadas,
        en_taller: totalEnTaller,
        total_recaudado: totalRecaudadoEntregadas,
        total_mano_obra: totalManoObra
      },
      reparaciones: result.rows
    };
  }

  static async obtenerEgresosReporte(filtros: { fechaDesde?: string | undefined; fechaHasta?: string | undefined; busqueda?: string | undefined }) {
    const { fechaDesde, fechaHasta, busqueda } = filtros;
    const condiciones: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (fechaDesde && typeof fechaDesde === 'string' && fechaDesde.trim()) {
      condiciones.push(`DATE(p.fecha) >= $${idx++}`);
      params.push(fechaDesde.trim());
    }
    if (fechaHasta && typeof fechaHasta === 'string' && fechaHasta.trim()) {
      condiciones.push(`DATE(p.fecha) <= $${idx++}`);
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
        p.observaciones
      FROM Pago_Proveedor p
      JOIN Proveedor prov ON p.id_proveedor = prov.id_proveedor
      JOIN Usuario u ON p.id_usuario = u.id_usuario
      JOIN Metodo_Pago mp ON p.id_metodo_pago = mp.id_metodo_pago
      ${whereSql}
      ORDER BY p.id_pago DESC;
    `;
    const result = await pool.query(query, params);

    const totalEgresos = result.rows.reduce((acc, curr) => acc + Number(curr.monto_total || 0), 0);

    return {
      total: result.rowCount || 0,
      total_egresos: totalEgresos,
      resumen: {
        total_pagos: result.rowCount || 0,
        total_monto_egresos: totalEgresos
      },
      egresos: result.rows,
      pagos: result.rows
    };
  }

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
