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
  doc.text('BIKESYSTEM', 14, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('DN BIKES - Venta de Bicicletas, Repuestos y Taller Especializado', 14, 29);
  doc.text('Esperanza, Santa Fe, Argentina | Tel: 3496-412345', 14, 33);

  // 3. Recuadro del Comprobante (Lado Derecho)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(125, 14, 71, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('COMPROBANTE DE VENTA INTERNO', 128, 19);

  doc.setFontSize(14);
  doc.setTextColor(esAnulada ? 220 : 15, esAnulada ? 38 : 23, esAnulada ? 38 : 42);
  doc.text(compNumero, 128, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${formatearFecha(venta.fecha, 'Hoy')}`, 128, 31);
  doc.text(`Pago: ${venta.metodo_pago_nombre || 'Efectivo'}`, 128, 35);

  // 4. Marca de Agua si está Anulada
  if (esAnulada) {
    doc.saveGraphicsState();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.setTextColor(239, 68, 68);
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
  doc.text(clienteNombre, 18, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let datosClienteStr = `DNI: ${clienteDni}`;
  if (!esConsumidorFinal && venta.cliente_telefono) {
    datosClienteStr += `  |  Tel: ${venta.cliente_telefono}`;
  }
  doc.text(datosClienteStr, 18, 60);

  // Columna Derecha: Datos de Caja
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DATOS DE OPERACION', 120, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Vendedor: ${venta.vendedor || 'Sistema'}`, 120, 55);
  doc.text(`Hora: ${formatearFechaHora(venta.fecha).split(' ')[1] || 'S/D'}`, 120, 60);

  // 6. Tabla de Productos Vendidos
  const filasTabla = productos_vendidos.map((item, idx) => {
    let descripcion = item.nombre;
    if (item.marca || item.modelo) {
      const extra = [item.marca, item.modelo].filter(Boolean).join(' - ');
      if (!descripcion.toLowerCase().includes(extra.toLowerCase())) {
        descripcion += ` (${extra})`;
      }
    }
    if (item.rodado) {
      descripcion += ` - Rod. ${item.rodado}`;
    }

    const rubro = (item.tipo_prod || 'Producto').toUpperCase();
    const cant = String(item.cantidad);
    const unitario = formatearMoneda(item.precio_unitario);
    const total = formatearMoneda(item.costo_total || item.precio_unitario * item.cantidad);

    return [String(idx + 1), descripcion, rubro, cant, unitario, total];
  });

  autoTable(doc, {
    startY: 71,
    head: [['#', 'Descripcion del Articulo', 'Rubro', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: filasTabla,
    theme: 'grid',
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
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 2.8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // 7. Bloque de Totales
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 140;

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
  const tieneBicicleta = productos_vendidos.some(p => p.tipo_prod?.toLowerCase() === 'bicicleta');
  let clausulaY = finalY + 24;

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

    clausulaY += 24;
  }

  // 9. Pie de Página y Validez
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Documento no valido como factura fiscal oficial conforme a normas vigentes. Comprobante de gestion comercial interna.', 14, 280);
  doc.text(`Generado por BikeSystem el ${formatearFechaHora(new Date())}`, 14, 284);

  // 10. Descargar archivo PDF
  const nombreArchivo = `Comprobante_${compNumero}_BikeSystem.pdf`;
  doc.save(nombreArchivo);
}
