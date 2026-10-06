import type { Venta, Reparacion, PagoProveedor, DashboardTopProducto, ReporteCapitalStockResponse } from '../../../types';
import type { TabTipo } from '../types';
import { formatearFecha } from '../../../utils/formatters';

interface ExportarCSVParams {
  activeTab: TabTipo;
  kpis: {
    total_ingresos: number;
    total_ventas_monto: number;
    total_reparaciones_monto: number;
    total_mano_obra_monto: number;
    total_egresos_monto: number;
    balance_neto: number;
    margen_rentabilidad: number;
    total_operaciones_cobradas: number;
    ticket_promedio: number;
    porcentaje_ventas: number;
    porcentaje_taller: number;
    monto_estimado_en_proceso: number;
  };
  ventas: Venta[];
  reparaciones: Reparacion[];
  pagos: PagoProveedor[];
  topProductos: DashboardTopProducto[];
  capitalStock?: ReporteCapitalStockResponse | null;
}

/** Exportador de reportes contables a formato CSV con cabecera BOM para Excel. */
export const exportarCSV = (params: ExportarCSVParams): void => {
  const { activeTab, kpis, ventas, reparaciones, topProductos, capitalStock } = params;
  let csvContent = '';
  const fechaReporte = formatearFecha(new Date()).replace(/\//g, '-');

  if (activeTab === 'ventas') {
    csvContent = 'Comprobante;Fecha;Cliente;Vendedor;Estado;Importe Total\n';
    const ventasActivas = ventas.filter(v => v.estado !== 'ANULADA');
    ventas.forEach(v => {
      const comp = 'FAC-' + String(v.id_venta).padStart(6, '0');
      const fecha = formatearFecha(v.fecha, '');
      const cliente = v.cliente_nombre ? `${v.cliente_apellido} ${v.cliente_nombre}` : `Cliente #${v.id_cliente}`;
      const vendedor = v.vendedor || 'Sistema';
      const estado = v.estado || 'COMPLETADA';
      const total = Number(v.costo_total || 0).toFixed(2);
      csvContent += `"${comp}";"${fecha}";"${cliente}";"${vendedor}";"${estado}";${total}\n`;
    });
    csvContent += `\n;;;TOTAL FACTURADO (COBRADO);${ventasActivas.length} VENTAS;$${kpis.total_ventas_monto.toFixed(2)}\n`;
  } else if (activeTab === 'reparaciones') {
    csvContent = 'Orden Taller;Fecha Ingreso;Fecha Egreso;Cliente;Bicicleta;Estado;Mano de Obra;Costo Total;Contabilizado\n';
    const entregadas = reparaciones.filter(r => r.estado === 'Entregada');
    const enProceso = reparaciones.filter(r => r.estado !== 'Entregada');
    reparaciones.forEach(r => {
      const idRep = 'REP-' + String(r.id_reparacion).padStart(6, '0');
      const fIngreso = formatearFecha(r.fecha_ingreso, '');
      const fEgreso = formatearFecha(r.fecha_egreso, 'Pendiente');
      const cliente = r.cliente_nombre ? `${r.cliente_apellido} ${r.cliente_nombre}` : `Cliente #${r.id_bicicleta}`;
      const bici = `${r.marca || ''} ${r.modelo || ''}`.trim() || 'Bicicleta';
      const estado = r.estado;
      const manoObra = Number(r.costo_mano_obra || 0).toFixed(2);
      const total = Number(r.costo_total || r.costo_mano_obra || 0).toFixed(2);
      const contabilizado = r.estado === 'Entregada' ? 'SI (COBRADO)' : 'NO (EN PROCESO)';
      csvContent += `"${idRep}";"${fIngreso}";"${fEgreso}";"${cliente}";"${bici}";"${estado}";${manoObra};${total};"${contabilizado}"\n`;
    });
    csvContent += `\n;;;;TOTAL COBRADO (ENTREGADAS);${entregadas.length} ORDENES;$${kpis.total_mano_obra_monto.toFixed(2)};$${kpis.total_reparaciones_monto.toFixed(2)}\n`;
    csvContent += `;;;;PENDIENTE DE COBRO (EN CURSO);${enProceso.length} ORDENES;;$${kpis.monto_estimado_en_proceso.toFixed(2)}\n`;
  } else if (activeTab === 'balance') {
    csvContent = 'CONCEPTO;IMPORTE\n';
    csvContent += `"Ventas de Mostrador";"$${kpis.total_ventas_monto.toFixed(2)}"\n`;
    csvContent += `"Ingresos de Taller (Entregadas)";"$${kpis.total_reparaciones_monto.toFixed(2)}"\n`;
    csvContent += `"TOTAL INGRESOS BRUTOS";"$${kpis.total_ingresos.toFixed(2)}"\n\n`;
    csvContent += `"Pagos a Proveedores (Egresos)";"$${kpis.total_egresos_monto.toFixed(2)}"\n\n`;
    csvContent += `"BALANCE NETO REAL (Ingresos - Egresos)";"$${kpis.balance_neto.toFixed(2)}"\n`;
    csvContent += `"Margen de Rentabilidad Operativa";"${kpis.margen_rentabilidad}%"\n`;
  } else if (activeTab === 'top_productos') {
    csvContent = 'Ranking;Producto;Marca;Categoria;Unidades Vendidas;Recaudacion Total\n';
    topProductos.forEach((p, idx) => {
      csvContent += `"${idx + 1}";"${p.nombre}";"${p.marca || 'Genérico'}";"${p.tipo_prod}";${p.total_vendido};$${Number(p.total_recaudado || 0).toFixed(2)}\n`;
    });
  } else if (activeTab === 'inventario') {
    csvContent = 'ID;Bicicleta;Marca;Modelo;Color;Rodado;Gama;Stock Fisico;Precio Venta Unitario;Capital Total Inmovilizado;Ventas Ultimos 90d;Rotacion\n';
    if (capitalStock) {
      capitalStock.bicicletas.forEach(b => {
        const id = `BIC-${String(b.id_producto).padStart(5, '0')}`;
        const nombre = b.nombre;
        const marca = b.marca || 'S/D';
        const modelo = b.modelo || 'S/D';
        const color = b.color || 'S/D';
        const rodado = b.rodado || 'S/D';
        const gama = b.gama;
        const stock = b.stock_disponible;
        const precioUnit = Number(b.precio_unitario || 0).toFixed(2);
        const capitalTotal = Number(b.capital_inmovilizado || 0).toFixed(2);
        const ventas90d = b.unidades_vendidas_90d;
        const rotacion = b.estado_rotacion;
        csvContent += `"${id}";"${nombre}";"${marca}";"${modelo}";"${color}";"${rodado}";"${gama}";${stock};$${precioUnit};$${capitalTotal};${ventas90d};"${rotacion}"\n`;
      });
      csvContent += `\n;;;;;;TOTAL INVENTARIO BICICLETAS;${capitalStock.resumen.unidades_total_bicicletas};;$${Number(capitalStock.resumen.capital_total_bicicletas || 0).toFixed(2)};;\n`;
      csvContent += `;;;;;;CAPITAL TOTAL MERCADERIA (TODOS LOS RUBROS);;;$${Number(capitalStock.resumen.capital_total_inventario || 0).toFixed(2)};;\n`;
      csvContent += `;;;;;;PROPORCION CAPITAL EN BICICLETAS;;;${capitalStock.resumen.porcentaje_bicicletas_capital}%;;\n`;
      csvContent += `;;;;;;CAPITAL EN BICICLETAS ESTANCADAS (>90d sin venta);;;$${Number(capitalStock.resumen.capital_estancado || 0).toFixed(2)};;\n`;
    }
  } else {
    // Consolidado General
    csvContent = 'METRICA;VALOR\n';
    csvContent += `"Ingresos Efectivos Cobrados (Periodo)";"$${kpis.total_ingresos.toFixed(2)}"\n`;
    csvContent += `"Ventas de Mostrador";"$${kpis.total_ventas_monto.toFixed(2)} (${kpis.porcentaje_ventas}%)"\n`;
    csvContent += `"Ingresos Taller (Solo Ordenes Entregadas)";"$${kpis.total_reparaciones_monto.toFixed(2)} (${kpis.porcentaje_taller}%)"\n`;
    csvContent += `"Pagos a Proveedores (Egresos)";"$${kpis.total_egresos_monto.toFixed(2)}"\n`;
    csvContent += `"Balance Neto (Ingresos - Egresos)";"$${kpis.balance_neto.toFixed(2)}"\n`;
    csvContent += `"Total Operaciones Cobradas";"${kpis.total_operaciones_cobradas}"\n`;
    csvContent += `"Ticket Promedio Efectivo";"$${kpis.ticket_promedio.toFixed(2)}"\n`;
  }

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Reporte_${activeTab.toUpperCase()}_BikeSystem_${fechaReporte}.csv`;
  link.click();
};
