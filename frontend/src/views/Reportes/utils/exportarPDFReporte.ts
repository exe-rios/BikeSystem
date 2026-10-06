import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Venta, Reparacion, PagoProveedor, DashboardTopProducto, ReporteCapitalStockResponse } from '../../../types';
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
  const { activeTab, fechaDesde, fechaHasta, kpis, ventas, reparaciones, topProductos, capitalStock } = params;

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
  doc.text('BIKESYSTEM', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DN BIKES - Gestion Integral de Bicicleteria y Taller Especializado', 14, 25);
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
  let startY = 46;

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
      startY,
      margin: { left: 14, right: 14 },
      head: [['Metrica / Concepto Financiero', 'Importe / Cantidad', 'Observaciones']],
      body: kpisData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 'auto' }
      }
    });

  } else if (activeTab === 'ventas') {
    const ventasFiltradas = ventas.filter(v => v.estado !== 'ANULADA');
    const filasVentas = ventas.map(v => {
      const comp = `FAC-${String(v.id_venta).padStart(6, '0')}`;
      const fStr = formatearFecha(v.fecha, '');
      const cliente = v.cliente_nombre ? `${v.cliente_apellido} ${v.cliente_nombre}` : `Cliente #${v.id_cliente}`;
      const vendedor = v.vendedor || 'Sistema';
      const estado = v.estado || 'COMPLETADA';
      const total = formatearMoneda(v.costo_total || 0);
      return [comp, fStr, cliente, vendedor, estado, total];
    });

    autoTable(doc, {
      startY,
      margin: { left: 14, right: 14 },
      head: [['Comprobante', 'Fecha', 'Cliente', 'Vendedor', 'Estado', 'Total']],
      body: filasVentas.length > 0 ? filasVentas : [['Sin registros', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { cellWidth: 26 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 40 },
        4: { cellWidth: 32 },
        5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
      },
      foot: [
        ['TOTAL FACTURADO (COBRADO)', '', '', '', `${ventasFiltradas.length} Ventas`, formatearMoneda(kpis.total_ventas_monto)]
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
      startY,
      margin: { left: 14, right: 14 },
      head: [['Orden', 'F. Ingreso', 'F. Egreso', 'Cliente', 'Bicicleta', 'Estado', 'Mano Obra', 'Total']],
      body: filasRep.length > 0 ? filasRep : [['Sin registros', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: {
        fillColor: [14, 116, 144],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
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
        ['TOTAL COBRADO (ENTREGADAS)', '', '', '', '', `${entregadas.length} Ordenes`, formatearMoneda(kpis.total_mano_obra_monto), formatearMoneda(kpis.total_reparaciones_monto)]
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
      startY,
      margin: { left: 14, right: 14 },
      head: [['Concepto Financiero', 'Tipo de Movimiento', 'Importe']],
      body: filasBalance,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 95 },
        1: { cellWidth: 50 },
        2: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
      }
    });

  } else if (activeTab === 'top_productos') {
    const filasTop = topProductos.map((p, idx) => {
      return [
        `#${idx + 1}`,
        p.nombre,
        p.marca || 'Generico',
        p.tipo_prod,
        String(p.total_vendido),
        formatearMoneda(Number(p.total_recaudado || 0))
      ];
    });

    autoTable(doc, {
      startY,
      margin: { left: 14, right: 14 },
      head: [['Puesto', 'Producto / Articulo', 'Marca', 'Categoria', 'Unidades', 'Recaudacion Total']],
      body: filasTop.length > 0 ? filasTop : [['Sin registros', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: {
        fillColor: [217, 119, 6], // Amber 600
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 35 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
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
        startY,
        margin: { left: 14, right: 14 },
        head: [['Resumen Ejecutivo de Valuacion de Rodados', 'Valor Consolidado']],
        body: resumenData,
        theme: 'plain',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85]
        },
        columnStyles: {
          0: { cellWidth: 160 },
          1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
        }
      });

      const nextY = (doc as any).lastAutoTable.finalY + 8;

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
        startY: nextY,
        margin: { left: 14, right: 14 },
        head: [['Codigo', 'Bicicleta', 'Marca', 'Color', 'Rod.', 'Gama', 'Stock', 'P. Unitario', 'Capital Total', 'Rotacion']],
        body: filasBicis.length > 0 ? filasBicis : [['Sin registros', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
        theme: 'grid',
        headStyles: {
          fillColor: [79, 70, 229], // Indigo 600
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [51, 65, 85]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
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
      'Documento oficial generado por BikeSystem - Sistema de Gestion Comercial y Taller',
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
  const nombreArchivo = `Reporte_${activeTab.toUpperCase()}_BikeSystem_${fechaReporteStr}.pdf`;
  doc.save(nombreArchivo);
}
