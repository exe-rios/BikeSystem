import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Producto, Proveedor } from '../../../types';

export interface ItemPedidoExportar {
  producto: Producto;
  cantidadPedir: number;
}

export interface DatosExportacionPedido {
  proveedor: Proveedor | null;
  nombreProveedorFallback?: string;
  observaciones?: string;
  items: ItemPedidoExportar[];
}

const formatearFechaArchivo = (fecha: Date): string => {
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatearFechaLegible = (fecha: Date): string =>
  fecha.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

const sanitizarNombreArchivo = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase() || 'PROVEEDOR';

/** Construye una descripción completa del artículo sin duplicar datos que ya figuran en el nombre. */
function construirDescripcionCompleta(p: Producto): string {
  const partes: string[] = [p.nombre.trim()];
  const nombreNorm = p.nombre.toLowerCase();

  if (p.marca && p.marca.trim() && !nombreNorm.includes(p.marca.trim().toLowerCase())) {
    partes.push(p.marca.trim());
  }
  if (p.modelo && p.modelo.trim() && !nombreNorm.includes(p.modelo.trim().toLowerCase())) {
    partes.push(p.modelo.trim());
  }

  if (p.tipo_prod === 'bicicleta') {
    const specs: string[] = [];
    if (p.rodado && !nombreNorm.includes(`r${p.rodado.toLowerCase()}`) && !nombreNorm.includes(`rodado ${p.rodado.toLowerCase()}`)) {
      specs.push(`R${p.rodado}`);
    }
    if (p.talle && !nombreNorm.includes(`t${p.talle.toLowerCase()}`) && !nombreNorm.includes(`talle ${p.talle.toLowerCase()}`)) {
      specs.push(`Talle ${p.talle}`);
    }
    if (p.color && !nombreNorm.includes(p.color.toLowerCase())) {
      specs.push(p.color);
    }
    if (p.genero && p.genero !== 'unisex' && !nombreNorm.includes(p.genero.toLowerCase())) {
      specs.push(p.genero.charAt(0).toUpperCase() + p.genero.slice(1));
    }
    if (specs.length > 0) {
      partes.push(`(${specs.join(' - ')})`);
    }
  }

  return partes.join(' ');
}

function construirEspecificacionesBici(p: Producto): string {
  if (p.tipo_prod !== 'bicicleta') return '';
  const specs: string[] = [];
  if (p.rodado) specs.push(`Rodado ${p.rodado}`);
  if (p.talle) specs.push(`Talle ${p.talle}`);
  if (p.color) specs.push(`Color ${p.color}`);
  if (p.genero) specs.push(p.genero.charAt(0).toUpperCase() + p.genero.slice(1));
  return specs.join(' | ');
}

/**
 * Exporta el pedido al proveedor en formato Excel (.xlsx) respetando estrictamente
 * el orden de columnas: CODIGO, CANTIDAD, DESCRIPCION (+ Marca y Especificaciones).
 */
export function exportarPedidoExcel(datos: DatosExportacionPedido): void {
  const { proveedor, nombreProveedorFallback, observaciones, items } = datos;
  const hoy = new Date();
  const nombreProv = proveedor?.nombre_empresa || nombreProveedorFallback || 'General';
  const totalUnidades = items.reduce((acc, it) => acc + it.cantidadPedir, 0);

  const matriz: Array<Array<string | number>> = [
    ['DN BIKES - PEDIDO A PROVEEDOR'],
    ['Proveedor:', nombreProv, 'Fecha:', formatearFechaLegible(hoy)],
  ];

  if (proveedor?.cuit || proveedor?.telefono) {
    matriz.push([
      'CUIT:',
      proveedor?.cuit || '—',
      'Teléfono:',
      proveedor?.telefono || '—'
    ]);
  }
  if (observaciones && observaciones.trim()) {
    matriz.push(['Observaciones:', observaciones.trim()]);
  }

  matriz.push([]);
  // Orden estricto solicitado: CODIGO | CANTIDAD | DESCRIPCION
  const filaHeaderIdx = matriz.length;
  matriz.push(['CODIGO', 'CANTIDAD', 'DESCRIPCION', 'MARCA', 'ESPECIFICACIONES']);

  for (const it of items) {
    matriz.push([
      it.producto.codigo ? String(it.producto.codigo).trim() : '',
      it.cantidadPedir,
      construirDescripcionCompleta(it.producto),
      it.producto.marca || '',
      construirEspecificacionesBici(it.producto)
    ]);
  }

  matriz.push([]);
  matriz.push(['TOTAL', totalUnidades, `${items.length} artículo(s) solicitado(s)`]);

  const ws = XLSX.utils.aoa_to_sheet(matriz);

  // Forzar formato texto en la columna CODIGO para preservar ceros a la izquierda (ej. 0016930)
  for (let r = filaHeaderIdx + 1; r <= filaHeaderIdx + items.length; r++) {
    const cellRef = XLSX.utils.encode_cell({ r, c: 0 });
    if (ws[cellRef]) {
      ws[cellRef].t = 's';
      ws[cellRef].z = '@';
    }
  }

  ws['!cols'] = [
    { wch: 24 }, // CODIGO
    { wch: 12 }, // CANTIDAD
    { wch: 58 }, // DESCRIPCION
    { wch: 16 }, // MARCA
    { wch: 36 }  // ESPECIFICACIONES
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedido');

  const nombreArchivo = `pedido_${sanitizarNombreArchivo(nombreProv)}_${formatearFechaArchivo(hoy)}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
}

/**
 * Exporta el pedido al proveedor en formato PDF (.pdf) maquetado profesionalmente,
 * respetando el orden estricto de columnas: CODIGO, CANTIDAD, DESCRIPCION (+ Marca).
 */
export function exportarPedidoPDF(datos: DatosExportacionPedido): void {
  const { proveedor, nombreProveedorFallback, observaciones, items } = datos;
  const hoy = new Date();
  const nombreProv = proveedor?.nombre_empresa || nombreProveedorFallback || 'General';
  const totalUnidades = items.reduce((acc, it) => acc + it.cantidadPedir, 0);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // 1. Franja Superior
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 10, 'F');

  // 2. Membrete DN BIKES
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('DN BIKES', 14, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Venta de Bicicletas, Repuestos y Taller Especializado', 14, 28);
  doc.text('Rivadavia 2022 - Esperanza, Santa Fe | Tel: 3496-412345', 14, 32.5);

  // 3. Recuadro derecho: Orden de Pedido
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(126, 13, 70, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('ORDEN DE PEDIDO', 130, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha: ${formatearFechaLegible(hoy)}`, 130, 26);
  doc.text(`Artículos: ${items.length}  |  Unidades: ${totalUnidades}`, 130, 31.5);

  // 4. Datos del Proveedor
  let yCursor = 43;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, yCursor, 182, observaciones?.trim() ? 22 : 16, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`PROVEEDOR: ${nombreProv.toUpperCase()}`, 18, yCursor + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const detallesProv: string[] = [];
  if (proveedor?.cuit) detallesProv.push(`CUIT: ${proveedor.cuit}`);
  if (proveedor?.telefono) detallesProv.push(`Tel: ${proveedor.telefono}`);
  if (proveedor?.email) detallesProv.push(`Email: ${proveedor.email}`);
  doc.text(detallesProv.length > 0 ? detallesProv.join('   |   ') : 'Pedido de reposición de mercadería', 18, yCursor + 11.5);

  if (observaciones?.trim()) {
    doc.setFont('helvetica', 'italic');
    doc.text(`Obs.: ${observaciones.trim().slice(0, 110)}`, 18, yCursor + 17.5);
    yCursor += 27;
  } else {
    yCursor += 21;
  }

  // 5. Tabla con orden estricto: CODIGO | CANTIDAD | DESCRIPCION (+ MARCA)
  const body = items.map(it => [
    it.producto.codigo ? String(it.producto.codigo).trim() : '—',
    String(it.cantidadPedir),
    construirDescripcionCompleta(it.producto),
    it.producto.marca || '—'
  ]);

  autoTable(doc, {
    startY: yCursor,
    head: [['CÓDIGO', 'CANT.', 'DESCRIPCIÓN', 'MARCA']],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    styles: {
      fontSize: 8.2,
      cellPadding: 2.8,
      textColor: [30, 41, 59],
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 38, font: 'courier', fontStyle: 'bold' },
      1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 26 }
    },
    foot: [['TOTAL', String(totalUnidades), `${items.length} artículo(s) solicitado(s)`, '']],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8.5
    }
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `DN Bikes - Orden de Pedido (${nombreProv}) - Página ${i} de ${totalPages}`,
      14,
      290
    );
  }

  const nombreArchivo = `pedido_${sanitizarNombreArchivo(nombreProv)}_${formatearFechaArchivo(hoy)}.pdf`;
  doc.save(nombreArchivo);
}
