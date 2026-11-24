import jsPDF from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';
import type {
  Venta,
  Reparacion,
  PagoProveedor,
  DashboardTopProducto,
  ReporteCapitalStockResponse,
  ReporteEstadisticasTaller,
  DashboardAlertaStock
} from '../../../types';
import type { TabTipo } from '../types';
import { formatearFecha, formatearFechaHora, formatearMoneda } from '../../../utils/formatters';

export interface ExportarPDFReporteParams {
  activeTab: TabTipo;
  fechaDesde: string;
  fechaHasta: string;
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
  estadisticasTaller?: ReporteEstadisticasTaller;
  alertasStock?: DashboardAlertaStock[];
}

function getLastTableY(doc: jsPDF, fallbackY: number): number {
  const docWithTable = doc as unknown as { lastAutoTable?: { finalY: number } };
  return docWithTable.lastAutoTable ? docWithTable.lastAutoTable.finalY : fallbackY;
}

function dibujarTituloSeccion(doc: jsPDF, tituloSeccion: string, y: number): number {
  let targetY = y;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (targetY + 24 > pageHeight - 16) {
    doc.addPage();
    targetY = 18;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(tituloSeccion, 14, targetY);
  return targetY + 3;
}

function crearOpcionesTablaLimpia(doc: jsPDF, headFontSize = 8.5, bodyFontSize = 8): Partial<UserOptions> {
  return {
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: headFontSize,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: bodyFontSize,
      textColor: [51, 65, 85]
    },
    styles: {
      lineWidth: 0
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    }
  };
}

/** Obtiene el título formal del informe según la pestaña activa. */
function obtenerTituloReporte(tab: TabTipo): string {
  switch (tab) {
    case 'general':
      return 'Consolidado General y Metricas Operativas';
    case 'ventas':
      return 'Informe de Ventas de Mostrador';
    case 'reparaciones':
      return 'Informe de Taller y Reparaciones';
    case 'balance':
      return 'Estado de Flujo de Caja y Balance Financiero';
    case 'top_productos':
      return 'Ranking de Productos Mas Vendidos';
    case 'inventario':
      return 'Valuacion de Capital e Inventario de Bicicletas';
  }
}

/**
 * Genera y descarga un informe gerencial estructurado en formato PDF.
 * Cumple con los requerimientos RF25 y CU22 del pliego de especificaciones.
 */
export function exportarPDFReporte(params: ExportarPDFReporteParams): void {
  const {
    activeTab,
    fechaDesde,
    fechaHasta,
    kpis,
    ventas,
    reparaciones,
    pagos,
    topProductos,
    capitalStock,
    estadisticasTaller,
    alertasStock = []
  } = params;

  const esHorizontal = activeTab === 'inventario' || activeTab === 'reparaciones' || activeTab === 'ventas';
  const doc = new jsPDF({
    orientation: esHorizontal ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fechaHoy = new Date();
  const fechaReporteStr = formatearFecha(fechaHoy).replace(/\//g, '-');
  const titulo = obtenerTituloReporte(activeTab);

  // 1. Franja Superior Decorativa
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 8, 'F');

  // 2. Membrete Institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('DN BIKES', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Venta de Bicicletas, Repuestos y Taller Especializado', 14, 25);
  doc.text('Esperanza, Santa Fe, Argentina | Tel: 3496-412345', 14, 29);

  // Titulo del Reporte
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(titulo, 14, 37);

  // 3. Tarjeta de Informacion de Emision (Lateral Derecho)
  const recuadroAncho = 76;
  const recuadroX = pageWidth - recuadroAncho - 14;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(recuadroX, 12, recuadroAncho, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('PARAMETROS DEL INFORME', recuadroX + 4, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Periodo: ${formatearFecha(fechaDesde, 'Inicio')} a ${formatearFecha(fechaHasta, 'Hoy')}`, recuadroX + 4, 23);
  doc.text(`Emision: ${formatearFechaHora(fechaHoy, '', { dateStyle: 'short', timeStyle: 'short' })}`, recuadroX + 4, 28);
  doc.text(`Estado: Datos Consolidados`, recuadroX + 4, 33);

  // Linea divisoria horizontal
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 42, pageWidth - 14, 42);

  // 4. Tablas Dinamicas segun la Pestana Seleccionada
  const startY = 46;

  if (activeTab === 'general') {
    const kpisData = [
      ['Ingresos Efectivos Cobrados (Ventas + Taller)', formatearMoneda(kpis.total_ingresos), 'Facturacion percibida neta'],
      ['Ventas de Mostrador (Comercial)', formatearMoneda(kpis.total_ventas_monto), `${kpis.porcentaje_ventas}% de los ingresos totales`],
      ['Ingresos por Servicios de Taller (Ordenes Entregadas)', formatearMoneda(kpis.total_reparaciones_monto), `${kpis.porcentaje_taller}% de los ingresos totales`],
      ['Total Facturado en Mano de Obra', formatearMoneda(kpis.total_mano_obra_monto), 'Valor de trabajo tecnico ejecutado'],
      ['Pagos a Proveedores (Egresos Operativos)', formatearMoneda(kpis.total_egresos_monto), 'Insumos, repuestos y rodados 0km'],
      ['Balance Operativo Neto (Ingresos - Egresos)', formatearMoneda(kpis.balance_neto), kpis.balance_neto >= 0 ? 'Superavit Operativo' : 'Deficit'],
      ['Margen de Rentabilidad Operativa', `${kpis.margen_rentabilidad}%`, 'Retorno porcentual sobre ingresos'],
      ['Total de Operaciones Cobradas', String(kpis.total_operaciones_cobradas), 'Transacciones completadas'],
      ['Ticket Promedio por Operacion', formatearMoneda(kpis.ticket_promedio), 'Promedio cobrado por transaccion'],
      ['Monto Estimado de Reparaciones en Taller (En Curso)', formatearMoneda(kpis.monto_estimado_en_proceso), 'Cobranza potencial pendiente']
    ];

    autoTable(doc, {
      ...crearOpcionesTablaLimpia(doc, 9, 8.5),
      startY,
      margin: { left: 14, right: 14 },
      head: [['Metrica / Concepto Financiero', 'Importe / Cantidad', 'Observaciones']],
      body: kpisData,
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 'auto' }
      }
    });

    if (estadisticasTaller) {
      const tallerY = dibujarTituloSeccion(
        doc,
        'Rendimiento del Taller por Estado',
        getLastTableY(doc, startY + 60) + 9
      );
      autoTable(doc, {
        ...crearOpcionesTablaLimpia(doc, 8.5, 8),
        startY: tallerY,
        margin: { left: 14, right: 14 },
        head: [['Estado de Orden en Taller', 'Cantidad de Ordenes', 'Detalle / Monto']],
        body: [
          ['Entregadas (Cobrado Efectivo)', String(estadisticasTaller.entregadas), formatearMoneda(kpis.total_reparaciones_monto)],
          ['Listas para Retiro', String(estadisticasTaller.listas), 'Pendiente de retiro'],
          ['En Reparacion', String(estadisticasTaller.en_reparacion), 'En trabajo tecnico'],
          ['Recibidas', String(estadisticasTaller.recibidas), 'En espera de diagnostico']
        ],
        columnStyles: {
          0: { cellWidth: 75, fontStyle: 'bold' },
          1: { cellWidth: 38, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 'auto', halign: 'right' }
        }
      });
    }

    if (topProductos.length > 0) {
      const topY = dibujarTituloSeccion(
        doc,
        'Top 5 Productos Mas Vendidos',
        getLastTableY(doc, startY + 110) + 9
      );
      autoTable(doc, {
        ...crearOpcionesTablaLimpia(doc, 8.5, 8),
        startY: topY,
        margin: { left: 14, right: 14 },
        head: [['#', 'Descripcion', 'Marca', 'Unidades', 'Total Recaudado']],
        body: topProductos.slice(0, 5).map((p, idx) => [
          `#${idx + 1}`,
          p.nombre,
          p.marca || 'Generico',
          String(p.total_vendido),
          formatearMoneda(Number(p.total_recaudado || 0))
        ]),
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 'auto', fontStyle: 'bold' },
          2: { cellWidth: 36 },
          3: { cellWidth: 24, halign: 'center' },
          4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' }
        }
      });
    }

    if (alertasStock.length > 0) {
      const alertasY = dibujarTituloSeccion(
        doc,
        'Alertas de Stock Critico',
        getLastTableY(doc, startY + 160) + 9
      );
      autoTable(doc, {
        ...crearOpcionesTablaLimpia(doc, 8.5, 8),
        startY: alertasY,
        margin: { left: 14, right: 14 },
        head: [['ID', 'Descripcion', 'Marca', 'Stock Actual', 'Stock Minimo']],
        body: alertasStock.map(a => [
          `#${a.id_producto}`,
          a.nombre,
          a.marca || 'Sin marca',
          String(a.cantidad),
          String(a.stock_minimo)
        ]),
        columnStyles: {
          0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 'auto', fontStyle: 'bold' },
          2: { cellWidth: 36 },
          3: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 26, halign: 'center' }
        }
      });
    }

  } else if (activeTab === 'ventas') {
    const ventasFiltradas = ventas.filter(v => v.estado !== 'ANULADA');
    const totalVentasFiltrado = ventasFiltradas.reduce((acc, v) => acc + Number(v.costo_total || 0), 0);
    const filasVentas = ventas.map(v => {
      const comp = `FAC-${String(v.id_venta).padStart(6, '0')}`;
      const fStr = formatearFecha(v.fecha, '');
      const cliente = v.cliente_nombre ? `${v.cliente_apellido} ${v.cliente_nombre}` : `Cliente #${v.id_cliente}`;
      const estado = v.estado || 'COMPLETADA';
      const total = formatearMoneda(v.costo_total || 0);
      return [comp, fStr, cliente, estado, total];
    });

    autoTable(doc, {
      ...crearOpcionesTablaLimpia(doc, 8.5, 8),
      startY,
      margin: { left: 14, right: 14 },
      head: [['Comprobante', 'Fecha', 'Cliente', 'Estado', 'Total']],
      body: filasVentas.length > 0 ? filasVentas : [['Sin registros', '-', '-', '-', '-']],
      columnStyles: {
        0: { cellWidth: 34, fontStyle: 'bold' },
        1: { cellWidth: 28 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 34, halign: 'center' },
        4: { cellWidth: 38, halign: 'right', fontStyle: 'bold' }
      },
      foot: [
        ['TOTAL FACTURADO (COBRADO)', '', '', `${ventasFiltradas.length} Ventas`, formatearMoneda(totalVentasFiltrado)]
      ],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 9
      }
    });

  } else if (activeTab === 'reparaciones') {
    const entregadas = reparaciones.filter(r => r.estado === 'Entregada');
    const totalManoObraFiltrado = entregadas.reduce((acc, r) => acc + Number(r.costo_mano_obra || 0), 0);
    const totalReparacionesFiltrado = entregadas.reduce((acc, r) => acc + Number(r.costo_total || r.costo_mano_obra || 0), 0);
    const filasRep = reparaciones.map(r => {
      const idRep = `REP-${String(r.id_reparacion).padStart(6, '0')}`;
      const fIng = formatearFecha(r.fecha_ingreso, '');
      const fEgr = formatearFecha(r.fecha_egreso, 'Pendiente');
      const cliente = r.cliente_nombre ? `${r.cliente_apellido} ${r.cliente_nombre}` : `Cliente #${r.id_bicicleta}`;
      const bici = `${r.marca || ''} ${r.modelo || ''}`.trim() || 'Bicicleta';
      const est = r.estado;
      const manoObra = formatearMoneda(r.costo_mano_obra || 0);
      const total = formatearMoneda(r.costo_total || r.costo_mano_obra || 0);
      return [idRep, fIng, fEgr, cliente, bici, est, manoObra, total];
    });

    autoTable(doc, {
      ...crearOpcionesTablaLimpia(doc, 8.5, 8),
      startY,
      margin: { left: 14, right: 14 },
      head: [['Orden', 'F. Ingreso', 'F. Egreso', 'Cliente', 'Bicicleta', 'Estado', 'Mano Obra', 'Total']],
      body: filasRep.length > 0 ? filasRep : [['Sin registros', '-', '-', '-', '-', '-', '-', '-']],
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { cellWidth: 24 },
        2: { cellWidth: 24 },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 32 },
        6: { cellWidth: 28, halign: 'right' },
        7: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
      },
      foot: [
        ['TOTAL COBRADO (ENTREGADAS)', '', '', '', '', `${entregadas.length} Ordenes`, formatearMoneda(totalManoObraFiltrado), formatearMoneda(totalReparacionesFiltrado)]
      ],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8.5
      }
    });

  } else if (activeTab === 'balance') {
    const filasBalance = [
      ['Ventas de Mostrador (Comercial)', 'Ingreso Operativo', formatearMoneda(kpis.total_ventas_monto)],
      ['Taller Especializado (Ordenes Entregadas)', 'Ingreso Operativo', formatearMoneda(kpis.total_reparaciones_monto)],
      ['TOTAL INGRESOS BRUTOS COBRADOS', 'Total de Entradas', formatearMoneda(kpis.total_ingresos)],
      ['Pagos a Proveedores y Adquisiciones', 'Egreso Operativo', formatearMoneda(kpis.total_egresos_monto)],
      ['TOTAL EGRESOS OPERATIVOS', 'Total de Salidas', formatearMoneda(kpis.total_egresos_monto)],
      ['BALANCE NETO REAL (Ingresos - Egresos)', 'Resultado Operativo', formatearMoneda(kpis.balance_neto)],
      ['Margen de Rentabilidad Operativa', 'Rendimiento Porcentual', `${kpis.margen_rentabilidad}%`]
    ];

    autoTable(doc, {
      ...crearOpcionesTablaLimpia(doc, 9, 8.5),
      startY,
      margin: { left: 14, right: 14 },
      head: [['Concepto Financiero', 'Tipo de Movimiento', 'Importe']],
      body: filasBalance,
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 50 },
        2: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
      }
    });

    const pagosY = dibujarTituloSeccion(
      doc,
      `Detalle de Egresos a Proveedores (${pagos.length} comprobantes)`,
      getLastTableY(doc, startY + 60) + 10
    );

    const totalEgresosFiltrado = pagos.reduce((acc, p) => acc + Number(p.monto_total || 0), 0);

    const filasPagos = pagos.map(p => [
      `PAG-${String(p.id_pago || 0).padStart(6, '0')}`,
      formatearFecha(p.fecha, 'N/A'),
      p.proveedor_nombre || `Proveedor #${p.id_proveedor}`,
      p.metodo_pago_nombre || 'Efectivo',
      formatearMoneda(p.monto_total)
    ]);

    autoTable(doc, {
      ...crearOpcionesTablaLimpia(doc, 8.5, 8),
      startY: pagosY,
      margin: { left: 14, right: 14 },
      head: [['N° Pago', 'Fecha', 'Proveedor', 'Metodo de Pago', 'Monto Abonado']],
      body: filasPagos.length > 0 ? filasPagos : [['Sin egresos registrados en el periodo', '-', '-', '-', formatearMoneda(0)]],
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { cellWidth: 24 },
        2: { cellWidth: 'auto', fontStyle: 'bold' },
        3: { cellWidth: 36 },
        4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' }
      },
      foot: [
        ['TOTAL EGRESOS A PROVEEDORES', '', '', `${pagos.length} Comprobantes`, formatearMoneda(totalEgresosFiltrado)]
      ],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8.5
      }
    });

  } else if (activeTab === 'top_productos') {
    const filasTop = topProductos.map((p, idx) => {
      return [
        `#${idx + 1}`,
        p.nombre,
        p.marca || 'Generico',
        String(p.total_vendido),
        formatearMoneda(Number(p.total_recaudado || 0))
      ];
    });

    autoTable(doc, {
      ...crearOpcionesTablaLimpia(doc, 8.5, 8),
      startY,
      margin: { left: 14, right: 14 },
      head: [['Puesto', 'Descripcion', 'Marca', 'Unidades', 'Recaudacion Total']],
      body: filasTop.length > 0 ? filasTop : [['Sin registros', '-', '-', '-', '-']],
      columnStyles: {
        0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 42 },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 38, halign: 'right', fontStyle: 'bold' }
      }
    });

  } else if (activeTab === 'inventario') {
    if (capitalStock) {
      // Cuadro Resumen Ejecutivo de Inventario
      const resumenData = [
        ['Capital Total en Bicicletas 0km', formatearMoneda(capitalStock.resumen.capital_total_bicicletas || 0)],
        ['Unidades Totales de Bicicletas', `${capitalStock.resumen.unidades_total_bicicletas || 0} unidades`],
        ['Modelos de Bicicletas Activos', `${capitalStock.resumen.modelos_activos_bicicletas || 0} modelos`],
        ['Proporcion sobre el Capital Total de la Tienda', `${capitalStock.resumen.porcentaje_bicicletas_capital || 0}%`],
        ['Capital Inmovilizado Estancado (>90 dias sin venta)', formatearMoneda(capitalStock.resumen.capital_estancado || 0)]
      ];

      autoTable(doc, {
        ...crearOpcionesTablaLimpia(doc, 8.5, 8),
        startY,
        margin: { left: 14, right: 14 },
        head: [['Resumen Ejecutivo de Valuacion de Rodados', 'Valor Consolidado']],
        body: resumenData,
        columnStyles: {
          0: { cellWidth: 160 },
          1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
        }
      });

      if (capitalStock.gamas && capitalStock.gamas.length > 0) {
        const gamasY = dibujarTituloSeccion(
          doc,
          'Estratificacion por Gamas de Precio',
          getLastTableY(doc, startY + 40) + 8
        );
        autoTable(doc, {
          ...crearOpcionesTablaLimpia(doc, 8, 8),
          startY: gamasY,
          margin: { left: 14, right: 14 },
          head: [['Gama', 'Rango de Precio', 'Modelos', 'Unidades', '% Stock Fisico', 'Precio Promedio', 'Capital Inmovilizado', '% Capital']],
          body: capitalStock.gamas.map(g => [
            g.nombre,
            g.rango_texto,
            String(g.modelos),
            String(g.unidades),
            `${g.porcentaje_unidades}%`,
            formatearMoneda(g.precio_promedio),
            formatearMoneda(g.capital_inmovilizado),
            `${g.porcentaje_capital}%`
          ]),
          columnStyles: {
            0: { cellWidth: 40, fontStyle: 'bold' },
            1: { cellWidth: 46 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 26, halign: 'center' },
            5: { cellWidth: 34, halign: 'right' },
            6: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
            7: { cellWidth: 'auto', halign: 'center', fontStyle: 'bold' }
          }
        });
      }

      if (capitalStock.desglose_por_tipo && capitalStock.desglose_por_tipo.length > 0) {
        const rubrosY = dibujarTituloSeccion(
          doc,
          'Desglose de Capital por Rubro',
          getLastTableY(doc, startY + 80) + 8
        );
        autoTable(doc, {
          ...crearOpcionesTablaLimpia(doc, 8, 8),
          startY: rubrosY,
          margin: { left: 14, right: 14 },
          head: [['Rubro', 'Referencias Activas', 'Unidades Totales', 'Capital Inmovilizado', '% del Capital Total']],
          body: capitalStock.desglose_por_tipo.map(t => [
            t.tipo_prod.toUpperCase(),
            String(t.total_articulos),
            String(t.total_unidades),
            formatearMoneda(t.capital_inmovilizado),
            `${t.porcentaje_capital}%`
          ]),
          columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'bold' },
            1: { cellWidth: 42, halign: 'center' },
            2: { cellWidth: 42, halign: 'center' },
            3: { cellWidth: 48, halign: 'right', fontStyle: 'bold' },
            4: { cellWidth: 42, halign: 'center', fontStyle: 'bold' }
          }
        });
      }

      const nextY = dibujarTituloSeccion(
        doc,
        `Detalle de Bicicletas en Stock (${capitalStock.bicicletas.length} modelos)`,
        getLastTableY(doc, startY + 120) + 8
      );

      const filasBicis = capitalStock.bicicletas.map(b => [
        `BIC-${String(b.id_producto).padStart(5, '0')}`,
        b.nombre,
        b.marca || 'S/D',
        b.color || 'S/D',
        b.rodado || 'S/D',
        b.gama.toUpperCase(),
        String(b.stock_disponible),
        formatearMoneda(b.precio_unitario || 0),
        formatearMoneda(b.capital_inmovilizado || 0),
        b.estado_rotacion === 'alta_rotacion' ? 'Alta' : b.estado_rotacion === 'rotacion_regular' ? 'Regular' : 'Estancada'
      ]);

      autoTable(doc, {
        ...crearOpcionesTablaLimpia(doc, 8, 7.5),
        startY: nextY,
        margin: { left: 14, right: 14 },
        head: [['Codigo', 'Bicicleta', 'Marca', 'Color', 'Rod.', 'Gama', 'Stock', 'P. Unitario', 'Capital Total', 'Rotacion']],
        body: filasBicis.length > 0 ? filasBicis : [['Sin registros', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
        columnStyles: {
          0: { cellWidth: 24, fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 26 },
          3: { cellWidth: 22 },
          4: { cellWidth: 16, halign: 'center' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 26, halign: 'right' },
          8: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
          9: { cellWidth: 22, halign: 'center' }
        }
      });
    }
  }

  // 5. Pie de Pagina en Todas las Paginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    // Linea divisoria inferior
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.text(
      'Informe de gestion comercial interna • Generado por DN BIKES',
      14,
      pageHeight - 8
    );
    doc.text(
      `Pagina ${i} de ${totalPages}`,
      pageWidth - 14,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // 6. Descarga Directa
  const nombreArchivo = `Reporte_${activeTab.toUpperCase()}_DNBikes_${fechaReporteStr}.pdf`;
  doc.save(nombreArchivo);
}
