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

const escaparCsv = (val: unknown): string => `"${String(val ?? '').replace(/"/g, '""')}"`;

/** Exportador de reportes contables a formato CSV con cabecera BOM para Excel. */
export const exportarCSV = (params: ExportarCSVParams): void => {
  const { activeTab, kpis, ventas, reparaciones, pagos, topProductos, capitalStock } = params;
  let csvContent = '';
  const fechaReporte = formatearFecha(new Date()).replace(/\//g, '-');

  if (activeTab === 'ventas') {
    csvContent = 'Comprobante;Fecha;Cliente;Vendedor;Estado;Importe Total\n';
    const ventasActivas = ventas.filter(v => v.estado !== 'ANULADA');
    const totalFiltrado = ventasActivas.reduce((acc, v) => acc + Number(v.costo_total || 0), 0);
    ventas.forEach(v => {
      const comp = 'FAC-' + String(v.id_venta).padStart(6, '0');
      const fecha = formatearFecha(v.fecha, '');
      const cliente = v.cliente_nombre ? `${v.cliente_apellido} ${v.cliente_nombre}` : `Cliente #${v.id_cliente}`;
      const vendedor = v.vendedor || 'Sistema';
      const estado = v.estado || 'COMPLETADA';
      const total = Number(v.costo_total || 0).toFixed(2);
      csvContent += `${[escaparCsv(comp), escaparCsv(fecha), escaparCsv(cliente), escaparCsv(vendedor), escaparCsv(estado), total].join(';')}\n`;
    });
    csvContent += `\n;;;TOTAL FACTURADO (COBRADO);${ventasActivas.length} VENTAS;$${totalFiltrado.toFixed(2)}\n`;
  } else if (activeTab === 'reparaciones') {
    csvContent = 'Orden Taller;Fecha Ingreso;Fecha Egreso;Cliente;Bicicleta;Estado;Mano de Obra;Costo Total;Contabilizado\n';
    const entregadas = reparaciones.filter(r => r.estado === 'Entregada');
    const enProceso = reparaciones.filter(r => r.estado !== 'Entregada');
    const totalManoObra = entregadas.reduce((acc, r) => acc + Number(r.costo_mano_obra || 0), 0);
    const totalCobrado = entregadas.reduce((acc, r) => acc + Number(r.costo_total || r.costo_mano_obra || 0), 0);
    const totalPendiente = enProceso.reduce((acc, r) => acc + Number(r.costo_total || r.costo_mano_obra || 0), 0);
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
      csvContent += `${[escaparCsv(idRep), escaparCsv(fIngreso), escaparCsv(fEgreso), escaparCsv(cliente), escaparCsv(bici), escaparCsv(estado), manoObra, total, escaparCsv(contabilizado)].join(';')}\n`;
    });
    csvContent += `\n;;;;TOTAL COBRADO (ENTREGADAS);${entregadas.length} ORDENES;$${totalManoObra.toFixed(2)};$${totalCobrado.toFixed(2)}\n`;
    csvContent += `;;;;PENDIENTE DE COBRO (EN CURSO);${enProceso.length} ORDENES;;$${totalPendiente.toFixed(2)}\n`;
  } else if (activeTab === 'balance') {
    const totalEgresosFiltrado = pagos.reduce((acc, p) => acc + Number(p.monto_total || 0), 0);
    csvContent = 'CONCEPTO;IMPORTE\n';
    csvContent += `${escaparCsv('Ventas de Mostrador')};${escaparCsv('$' + kpis.total_ventas_monto.toFixed(2))}\n`;
    csvContent += `${escaparCsv('Ingresos de Taller (Entregadas)')};${escaparCsv('$' + kpis.total_reparaciones_monto.toFixed(2))}\n`;
    csvContent += `${escaparCsv('TOTAL INGRESOS BRUTOS')};${escaparCsv('$' + kpis.total_ingresos.toFixed(2))}\n\n`;
    csvContent += `${escaparCsv('Pagos a Proveedores (Egresos)')};${escaparCsv('$' + kpis.total_egresos_monto.toFixed(2))}\n\n`;
    csvContent += `${escaparCsv('BALANCE NETO REAL (Ingresos - Egresos)')};${escaparCsv('$' + kpis.balance_neto.toFixed(2))}\n`;
    csvContent += `${escaparCsv('Margen de Rentabilidad Operativa')};${escaparCsv(`${kpis.margen_rentabilidad}%`)}\n\n`;
    csvContent += 'Nro Pago;Fecha;Proveedor;Metodo de Pago;Monto Abonado\n';
    pagos.forEach(p => {
      const nro = `PAG-${String(p.id_pago || 0).padStart(6, '0')}`;
      const fecha = formatearFecha(p.fecha, 'N/A');
      const proveedor = p.proveedor_nombre || `Proveedor #${p.id_proveedor}`;
      const metodo = p.metodo_pago_nombre || 'Efectivo';
      const monto = Number(p.monto_total || 0).toFixed(2);
      csvContent += `${[escaparCsv(nro), escaparCsv(fecha), escaparCsv(proveedor), escaparCsv(metodo), monto].join(';')}\n`;
    });
    csvContent += `;;;TOTAL EGRESOS FILTRADOS ($);$${totalEgresosFiltrado.toFixed(2)}\n`;
  } else if (activeTab === 'top_productos') {
    csvContent = 'Ranking;Producto;Marca;Categoria;Unidades Vendidas;Recaudacion Total\n';
    topProductos.forEach((p, idx) => {
      csvContent += `${[escaparCsv(idx + 1), escaparCsv(p.nombre), escaparCsv(p.marca || 'Genérico'), escaparCsv(p.tipo_prod), p.total_vendido, `$${Number(p.total_recaudado || 0).toFixed(2)}`].join(';')}\n`;
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
        csvContent += `${[
          escaparCsv(id),
          escaparCsv(nombre),
          escaparCsv(marca),
          escaparCsv(modelo),
          escaparCsv(color),
          escaparCsv(rodado),
          escaparCsv(gama),
          stock,
          `$${precioUnit}`,
          `$${capitalTotal}`,
          ventas90d,
          escaparCsv(rotacion)
        ].join(';')}\n`;
      });
      csvContent += `\n;;;;;;TOTAL INVENTARIO BICICLETAS;${capitalStock.resumen.unidades_total_bicicletas};;$${Number(capitalStock.resumen.capital_total_bicicletas || 0).toFixed(2)};;\n`;
      csvContent += `;;;;;;CAPITAL TOTAL MERCADERIA (TODOS LOS RUBROS);;;$${Number(capitalStock.resumen.capital_total_inventario || 0).toFixed(2)};;\n`;
      csvContent += `;;;;;;PROPORCION CAPITAL EN BICICLETAS;;;${capitalStock.resumen.porcentaje_bicicletas_capital}%;;\n`;
      csvContent += `;;;;;;CAPITAL EN BICICLETAS ESTANCADAS (>90d sin venta);;;$${Number(capitalStock.resumen.capital_estancado || 0).toFixed(2)};;\n`;
    }
  } else {
    // Consolidado General
    csvContent = 'METRICA;VALOR\n';
    csvContent += `${escaparCsv('Ingresos Efectivos Cobrados (Periodo)')};${escaparCsv('$' + kpis.total_ingresos.toFixed(2))}\n`;
    csvContent += `${escaparCsv('Ventas de Mostrador')};${escaparCsv(`$${kpis.total_ventas_monto.toFixed(2)} (${kpis.porcentaje_ventas}%)`)}\n`;
    csvContent += `${escaparCsv('Ingresos Taller (Solo Ordenes Entregadas)')};${escaparCsv(`$${kpis.total_reparaciones_monto.toFixed(2)} (${kpis.porcentaje_taller}%)`)}\n`;
    csvContent += `${escaparCsv('Pagos a Proveedores (Egresos)')};${escaparCsv('$' + kpis.total_egresos_monto.toFixed(2))}\n`;
    csvContent += `${escaparCsv('Balance Neto (Ingresos - Egresos)')};${escaparCsv('$' + kpis.balance_neto.toFixed(2))}\n`;
    csvContent += `${escaparCsv('Total Operaciones Cobradas')};${escaparCsv(kpis.total_operaciones_cobradas)}\n`;
    csvContent += `${escaparCsv('Ticket Promedio Efectivo')};${escaparCsv('$' + kpis.ticket_promedio.toFixed(2))}\n`;
  }

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Reporte_${activeTab.toUpperCase()}_BikeSystem_${fechaReporte}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
