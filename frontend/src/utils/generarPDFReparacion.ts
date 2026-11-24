import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Reparacion, DetalleReparacionItem } from '../types';
import { formatearMoneda, formatearFecha, formatearFechaHora } from './formatters';

/**
 * Genera y descarga un comprobante PDF para la orden de reparación de taller.
 */
export function generarPDFReparacion(
  orden: Reparacion,
  repuestos: DetalleReparacionItem[],
  totalRepuestosCosto: number
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const ordenNumero = `REP-${String(orden.id_reparacion || 0).padStart(6, '0')}`;
  const clienteNombre =
    [orden.cliente_apellido, orden.cliente_nombre].filter(Boolean).join(', ') ||
    `Cliente #${orden.id_bicicleta}`;
  const bicicletaNombre =
    [orden.marca, orden.modelo].filter(Boolean).join(' ').trim() ||
    `Bicicleta #${orden.id_bicicleta}`;

  const manoObra = Number(orden.costo_mano_obra || 0);
  const totalRepuestos = Number(totalRepuestosCosto || 0);
  const totalLiquidacion = Number(orden.costo_total ?? manoObra + totalRepuestos);

  // 1. Franja Superior Decorativa
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 10, 'F');

  // 2. Membrete de la Empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text('DN BIKES', 14, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Venta de Bicicletas, Repuestos y Taller Especializado', 14, 29);
  doc.text('Esperanza, Santa Fe, Argentina | Tel: 3496-412345', 14, 33);

  // 3. Recuadro de la Orden (Lado Derecho)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(122, 13, 74, 29, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ORDEN DE REPARACION', 126, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('NO VALIDO COMO FACTURA', 126, 22.5);

  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42);
  doc.text(ordenNumero, 126, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Ingreso: ${formatearFecha(orden.fecha_ingreso, 'Hoy')}`, 126, 34);
  doc.text(
    `Egreso: ${formatearFecha(orden.fecha_egreso, 'Pendiente')}`,
    126,
    38.5
  );

  // 4. Datos del Cliente y Bicicleta
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 46, 182, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CLIENTE / PROPIETARIO', 18, 52);
  doc.text('BICICLETA Y ESTADO', 110, 52);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(clienteNombre, 18, 57, { maxWidth: 88 });
  doc.text(bicicletaNombre, 110, 57, { maxWidth: 82 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`DNI: ${orden.cliente_dni || 'S/D'}`, 18, 62, { maxWidth: 88 });
  doc.text(`Estado: ${orden.estado}`, 110, 62, { maxWidth: 82 });

  // 5. Diagnóstico / Tareas Solicitadas (altura dinámica)
  const diagnosticoTexto = orden.descripcion?.trim() || 'Sin descripcion registrada';
  const splitDiagnostico: string[] = doc.splitTextToSize(diagnosticoTexto, 174);
  const boxDiagY = 72;
  const boxDiagH = Math.max(16, 9 + splitDiagnostico.length * 4.5);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, boxDiagY, 182, boxDiagH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DIAGNOSTICO Y TAREAS DE TALLER', 18, boxDiagY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(splitDiagnostico, 18, boxDiagY + 10);

  // 6. Tabla de Repuestos Utilizados (sin cuadrículas negras)
  const tableStartY = boxDiagY + boxDiagH + 6;
  const filasTabla =
    repuestos.length > 0
      ? repuestos.map((item, idx) => [
          String(idx + 1),
          `${item.nombre || 'Repuesto'}${item.marca ? ` (${item.marca})` : ''}`,
          String(item.cantidad),
          formatearMoneda(item.precio_unitario),
          formatearMoneda(item.costo_total)
        ])
      : [['-', 'Sin repuestos adicionales registrados en esta orden', '-', '-', formatearMoneda(0)]];

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    head: [['#', 'Descripcion', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: filasTabla,
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3,
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
  });

  // 7. Bloque de Liquidación (sin firma)
  const docWithTable = doc as unknown as { lastAutoTable?: { finalY: number } };
  let finalY = docWithTable.lastAutoTable ? docWithTable.lastAutoTable.finalY + 8 : tableStartY + 35;

  if (finalY + 48 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    finalY = 20;
  }

  // Cuadro de liquidación (derecha)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(118, finalY, 78, 30, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Mano de Obra:', 123, finalY + 7);
  doc.text(formatearMoneda(manoObra), 192, finalY + 7, { align: 'right' });

  doc.text('Total Repuestos:', 123, finalY + 13);
  doc.text(formatearMoneda(totalRepuestos), 192, finalY + 13, { align: 'right' });

  doc.setDrawColor(203, 213, 225);
  doc.line(123, finalY + 16, 192, finalY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL ORDEN:', 123, finalY + 24);
  doc.setFontSize(12);
  doc.text(formatearMoneda(totalLiquidacion), 192, finalY + 24, { align: 'right' });

  // 8. Pie de Página y Validez
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(14, pageHeight - 17, 196, pageHeight - 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('COMPROBANTE DE SERVICIO TECNICO - DOCUMENTO NO VALIDO COMO FACTURA FISCAL', 14, pageHeight - 12);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Comprobante de gestion comercial interna • Generado por DN BIKES el ${formatearFechaHora(new Date())}`, 14, pageHeight - 8);

  doc.save(`Orden_${ordenNumero}_DNBikes.pdf`);
}
