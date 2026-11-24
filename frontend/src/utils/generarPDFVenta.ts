import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { VentaDetallada } from '../views/Ventas/types';
import { formatearMoneda, formatearFecha, formatearFechaHora } from './formatters';

/**
 * Genera y descarga un archivo PDF maquetado para el comprobante de venta.
 * Cumple con CU11 y RF11 sin depender exclusivamente del cuadro de impresion.
 */
export function generarPDFVenta(ventaDetalle: VentaDetallada): void {
  const { venta, productos_vendidos } = ventaDetalle;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const compNumero = `FAC-${String(venta.id_venta).padStart(6, '0')}`;
  const esAnulada = venta.estado === 'ANULADA';

  const esConsumidorFinal =
    venta.es_consumidor_final ||
    (venta.cliente_nombre?.toLowerCase().trim() === 'consumidor' && venta.cliente_apellido?.toLowerCase().trim() === 'final') ||
    (venta.cliente_nombre?.toLowerCase().trim() === 'final' && venta.cliente_apellido?.toLowerCase().trim() === 'consumidor') ||
    venta.cliente_direccion?.toLowerCase().includes('mostrador');

  const tieneNombrePersonalizado = 
    esConsumidorFinal && 
    venta.cliente_nombre && 
    venta.cliente_nombre.toLowerCase().trim() !== 'consumidor';

  const clienteNombre = tieneNombrePersonalizado
    ? `${venta.cliente_nombre} ${venta.cliente_apellido || ''} (Consumidor Final)`.trim()
    : esConsumidorFinal
    ? 'Consumidor Final (Venta Mostrador)'
    : `${venta.cliente_nombre || ''} ${venta.cliente_apellido || ''}`.trim() || 'Cliente Mostrador';

  const clienteDni = esConsumidorFinal ? (venta.cliente_dni || 'S/DNI') : (venta.cliente_dni || 'S/DNI');

  // 1. Franja Superior Decorativa
  doc.setFillColor(15, 23, 42); // slate-900
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

  // 3. Recuadro del Comprobante (Lado Derecho)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(122, 13, 74, 29, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('COMPROBANTE DE VENTA', 126, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('NO VALIDO COMO FACTURA', 126, 22.5);

  doc.setFontSize(13.5);
  doc.setTextColor(esAnulada ? 220 : 15, esAnulada ? 38 : 23, esAnulada ? 38 : 42);
  doc.text(compNumero, 126, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${formatearFecha(venta.fecha, 'Hoy')}`, 126, 34);
  doc.text(`Pago: ${venta.metodo_pago_nombre || 'Efectivo'}`, 126, 38.5);

  // 4. Marca de Agua si está Anulada (suave y translúcida para no tapar el contenido)
  if (esAnulada) {
    doc.saveGraphicsState();
    const docConGState = doc as unknown as {
      GState?: new (opts: { opacity: number }) => unknown;
      setGState?: (state: unknown) => void;
    };
    if (typeof docConGState.GState === 'function' && typeof docConGState.setGState === 'function') {
      docConGState.setGState(new docConGState.GState({ opacity: 0.16 }));
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setTextColor(254, 202, 202);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.text('ANULADA', 65, 130, { angle: 35 });
    doc.restoreGraphicsState();
  }

  // 5. Bloque de Datos del Cliente y Operación
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 44, 182, 22, 2, 2, 'FD');

  // Columna Izquierda: Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CLIENTE COMPRADOR', 18, 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(clienteNombre, 18, 55, { maxWidth: 96 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let datosClienteStr = `DNI: ${clienteDni}`;
  if (!esConsumidorFinal && venta.cliente_telefono) {
    datosClienteStr += `  |  Tel: ${venta.cliente_telefono}`;
  }
  doc.text(datosClienteStr, 18, 60, { maxWidth: 96 });

  // Columna Derecha: Datos de Caja
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DATOS DE OPERACION', 120, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Medio de Pago: ${venta.metodo_pago_nombre || 'Efectivo'}`, 120, 55, { maxWidth: 72 });
  doc.text(`Fecha y Hora: ${formatearFechaHora(venta.fecha)}`, 120, 60, { maxWidth: 72 });

  // 6. Tabla de Productos Vendidos (sin cuadrículas negras)
  const filasTabla = productos_vendidos.map((item, idx) => {
    let descripcion = item.nombre;
    if (item.marca || item.modelo) {
      const extra = [item.marca, item.modelo].filter(Boolean).join(' - ');
      if (!descripcion.toLowerCase().includes(extra.toLowerCase())) {
        descripcion += ` (${extra})`;
      }
    }
    if (item.tipo_prod?.toLowerCase() === 'bicicleta') {
      const specs = [
        item.genero ? item.genero.charAt(0).toUpperCase() + item.genero.slice(1) : null,
        item.rodado ? `Rod. ${item.rodado}` : null,
        item.talle ? `Talle ${item.talle}` : null,
        item.color ? item.color : null
      ].filter(Boolean);
      if (specs.length > 0) {
        descripcion += `\n${specs.join(' • ')}`;
      }
    } else if (item.rodado) {
      descripcion += ` - Rod. ${item.rodado}`;
    }

    const cant = String(item.cantidad);
    const unitario = formatearMoneda(item.precio_unitario);
    const total = formatearMoneda(item.costo_total || item.precio_unitario * item.cantidad);

    return [String(idx + 1), descripcion, cant, unitario, total];
  });

  autoTable(doc, {
    startY: 71,
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
    }
  });

  // 7. Bloque de Totales
  const docWithTable = doc as unknown as { lastAutoTable?: { finalY: number } };
  let finalY = docWithTable.lastAutoTable ? docWithTable.lastAutoTable.finalY + 6 : 140;
  const pageHeight = doc.internal.pageSize.getHeight();
  const tieneBicicleta = productos_vendidos.some(p => p.tipo_prod?.toLowerCase() === 'bicicleta');

  if (finalY + (tieneBicicleta ? 52 : 28) > pageHeight - 20) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(125, finalY, 71, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL FACTURADO', 129, finalY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(formatearMoneda(venta.costo_total), 192, finalY + 13, { align: 'right' });

  // 8. Términos de Garantía y Primer Service (si incluye bicicleta)
  const clausulaY = finalY + 24;

  if (tieneBicicleta) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.roundedRect(14, clausulaY, 182, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('CONDICIONES DE GARANTIA OFICIAL Y PRIMER SERVICE:', 18, clausulaY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15);
    const textoGarantia = 'Las bicicletas nuevas cuentan con 6 meses de garantia oficial por defectos de fabricacion. Para mantener la garantia vigente, es requisito indispensable realizar el Primer Service Gratuito de Ajuste y Calibracion dentro de los 30 dias posteriores a la fecha de compra en nuestro taller oficial.';
    const splitGarantia = doc.splitTextToSize(textoGarantia, 174);
    doc.text(splitGarantia, 18, clausulaY + 10);
  }

  // 9. Pie de Página y Validez
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 273, 196, 273);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('COMPROBANTE DE VENTA - DOCUMENTO NO VALIDO COMO FACTURA FISCAL', 14, 278);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Comprobante de gestion comercial interna • Generado por DN BIKES el ${formatearFechaHora(new Date())}`, 14, 283);

  // 10. Descargar archivo PDF
  const nombreArchivo = `Comprobante_${compNumero}_DNBikes.pdf`;
  doc.save(nombreArchivo);
}
