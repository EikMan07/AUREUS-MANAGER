import { jsPDF } from 'jspdf';
import autoTablePlugin from 'jspdf-autotable';

// Helper seguro para llamar a autoTable independientemente del empaquetado ESM/CJS
function applyAutoTable(doc, options) {
  if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
  } else if (typeof autoTablePlugin === 'function') {
    autoTablePlugin(doc, options);
  } else if (autoTablePlugin && typeof autoTablePlugin.default === 'function') {
    autoTablePlugin.default(doc, options);
  } else if (autoTablePlugin && typeof autoTablePlugin.autoTable === 'function') {
    autoTablePlugin.autoTable(doc, options);
  }
}

/**
 * Dibuja vectorialmente el símbolo de colones costarricense (₡)
 * combinando una letra 'C' en negrita con dos trazos diagonales paralelos.
 * Resuelve de forma definitiva el carácter corrupto '¡' (\u00A1) que genera
 * jsPDF al pasar el carácter Unicode \u20A1 con la tipografía estándar helvetica.
 *
 * @param {import('jspdf').jsPDF} doc - Instancia del documento jsPDF
 * @param {number} x - Coordenada X inicial
 * @param {number} y - Coordenada Y (línea base de la tipografía)
 * @param {number} [size=11] - Tamaño de la fuente en pt
 * @param {number[]} [rgbColor=[5, 150, 105]] - Color RGB [R, G, B]
 * @returns {number} Ancho ocupado por la letra 'C' en puntos
 */
export function drawColonSymbol(doc, x, y, size = 11, rgbColor = [5, 150, 105]) {
  doc.saveGraphicsState();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(rgbColor[0], rgbColor[1], rgbColor[2]);
  doc.setCharSpace(0);

  // Escribir la letra 'C' base en negrita
  doc.text('C', x, y);
  const cWidth = doc.getTextWidth('C');

  // Proporciones del símbolo ₡ según la altura de mayúscula en helvetica bold
  const capHeight = size * 0.72;
  const top = y - capHeight;
  const bottom = y + size * 0.04;
  const lineExtension = size * 0.12;

  // Grosor de las dos líneas diagonales acorde a la escala de la tipografía
  const lineWidth = Math.max(0.65, size * 0.08);
  doc.setDrawColor(rgbColor[0], rgbColor[1], rgbColor[2]);
  doc.setLineWidth(lineWidth);

  // Dos barras diagonales paralelas que cruzan la C de abajo-izquierda hacia arriba-derecha
  const slashWidth = size * 0.22;
  const gap = cWidth * 0.28;
  const centerX = x + cWidth * 0.5;

  // Barra 1 (izquierda)
  const x1_bottom = centerX - gap * 0.5 - slashWidth * 0.5;
  const x1_top = x1_bottom + slashWidth;
  doc.line(x1_bottom, bottom + lineExtension, x1_top, top - lineExtension);

  // Barra 2 (derecha)
  const x2_bottom = centerX + gap * 0.5 - slashWidth * 0.5;
  const x2_top = x2_bottom + slashWidth;
  doc.line(x2_bottom, bottom + lineExtension, x2_top, top - lineExtension);

  doc.restoreGraphicsState();
  return cWidth;
}

/**
 * Formatea un número agregando separadores de miles estándar sin caracteres especiales.
 * @param {number|string} amount
 * @returns {string} Ej: "35,250", "32,000", "2,200"
 */
function formatCleanNumber(amount) {
  const num = Number(amount || 0);
  return num.toLocaleString('en-US');
}

/**
 * Genera y descarga un archivo PDF formal de la hoja de cobros del día en orientación horizontal.
 *
 * @param {Object} params
 * @param {string} params.fechaTexto - Fecha completa legible (ej. "Viernes, 6 de Noviembre de 2026")
 * @param {string} params.fechaISO - Fecha en formato YYYY-MM-DD
 * @param {Array} params.cobros - Lista de clientes a cobrar con datos completos
 * @param {number} params.montoTotal - Monto total acumulado
 * @param {string} [params.nombreCobrador] - Nombre del cobrador o prestamista asignado
 */
export function generarPdfCobrosDia({
  fechaTexto = 'Fecha no especificada',
  fechaISO = '',
  cobros = [],
  montoTotal = 0,
  nombreCobrador = 'Cobro-Firme'
}) {
  // Configuración en orientación horizontal A4 (841.89 pt x 595.28 pt)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 36; // 0.5 in de margen lateral

  // Garantizar espaciado estándar de caracteres en todo el documento
  doc.setCharSpace(0);

  // =========================================================================
  // 1. ENCABEZADO SUPERIOR EJECUTIVO (Fondo Corporativo #131629)
  // =========================================================================
  const headerHeight = 72;
  doc.setFillColor(19, 22, 41); // #131629
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Línea de acento verde esmeralda (#10b981) en la base del encabezado
  doc.setFillColor(16, 185, 129); // #10b981
  doc.rect(0, headerHeight - 3, pageWidth, 3, 'F');

  // Título Principal
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setCharSpace(0);
  doc.text('COBRO-FIRME — HOJA DE COBROS DEL DÍA', marginX, 28);

  // Subtítulo con la fecha legible seleccionada
  doc.setTextColor(203, 213, 225); // #cbd5e1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(fechaTexto, marginX, 48);

  // Etiqueta del emisor asignado a la derecha
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // #94a3b8
  const cobradorTexto = `Asignado: ${nombreCobrador}`;
  const cobradorWidth = doc.getTextWidth(cobradorTexto);
  doc.text(cobradorTexto, pageWidth - marginX - cobradorWidth, 48);

  // =========================================================================
  // 2. TARJETAS DE RESUMEN EJECUTIVO (Total Clientes y Monto Total a Recaudar)
  // =========================================================================
  const cardY = headerHeight + 14;
  const cardHeight = 46;
  const cardWidth = (pageWidth - marginX * 2 - 16) / 2;

  // Tarjeta 1: Total de Clientes a Cobrar
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.75);
  doc.roundedRect(marginX, cardY, cardWidth, cardHeight, 6, 6, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text('TOTAL DE CLIENTES A COBRAR', marginX + 14, cardY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text(`${cobros.length} clientes`, marginX + 14, cardY + 35);

  // Tarjeta 2: Monto Total por Cobrar con símbolo ₡ vectorial y número limpio
  const card2X = marginX + cardWidth + 16;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 6, 6, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('MONTO TOTAL POR COBRAR', card2X + 14, cardY + 16);

  // Símbolo vectorial ₡ en verde esmeralda [5, 150, 105] (#059669)
  const cWidthTotal = drawColonSymbol(doc, card2X + 14, cardY + 35, 13, [5, 150, 105]);
  const totalFormatted = formatCleanNumber(montoTotal);

  // Dígitos numéricos juntos sin espaciado alterado ni signos ¡
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(5, 150, 105);
  doc.setCharSpace(0);
  doc.text(totalFormatted, card2X + 14 + cWidthTotal + 3, cardY + 35);

  // =========================================================================
  // 3. TABLA DE COBROS CON 7 COLUMNAS INDIVIDUALES Y AMPLIO ESPACIADO
  // =========================================================================
  const tableStartY = cardY + cardHeight + 14;

  const tableHead = [
    [
      'N°',
      'Cliente',
      'Cédula',
      'Teléfono',
      'Ubicación',
      'Detalles',
      'Monto a cobrar'
    ]
  ];

  const tableBody = cobros.map((item, index) => {
    const num = index + 1;
    const nombre = item.nombre_completo || [item.nombre, item.apellidos].filter(Boolean).join(' ').trim() || 'Sin nombre registrado';
    const cedula = item.cedula ? String(item.cedula) : 'Sin cédula';
    const telefono = item.telefono ? String(item.telefono) : 'Sin teléfono';
    const ubicacion = item.ubicacion ? String(item.ubicacion) : 'Sin ubicación';
    const detalles = item.detalles ? String(item.detalles) : 'Sin detalles';
    const monto = item.monto_cuota || 0;

    return [num, nombre, cedula, telefono, ubicacion, detalles, monto];
  });

  applyAutoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX, bottom: 40 },
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: { top: 12, right: 12, bottom: 12, left: 12 },
      lineHeightFactor: 1.45,
      textColor: [15, 23, 42], // #0f172a
      lineColor: [226, 232, 240], // #e2e8f0
      lineWidth: 0.75,
      overflow: 'linebreak',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [19, 22, 41], // #131629
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: { top: 12, right: 12, bottom: 12, left: 12 }
    },
    columnStyles: {
      0: { cellWidth: 44, halign: 'center', valign: 'middle', fontStyle: 'bold', textColor: [15, 23, 42], cellPadding: { top: 12, right: 6, bottom: 12, left: 6 } },
      1: { cellWidth: 174, halign: 'left', fontStyle: 'bold', fontSize: 10.5, textColor: [15, 23, 42] },
      2: { cellWidth: 85, halign: 'center', fontSize: 10, textColor: [51, 65, 85] },
      3: { cellWidth: 90, halign: 'center', fontSize: 10, textColor: [51, 65, 85] },
      4: { cellWidth: 115, halign: 'left', fontSize: 10, textColor: [15, 23, 42] },
      5: { cellWidth: 'auto', halign: 'left', fontSize: 9.5, textColor: [71, 85, 105] }, // Espacio restante (~150pt)
      6: { cellWidth: 112, halign: 'center', fontStyle: 'bold', fontSize: 11, textColor: [5, 150, 105] }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // #f8fafc
    },
    didParseCell: (data) => {
      // Para la columna N° (índice 0), asegurar que N° y números se mantengan en una sola línea centrada
      if (data.column.index === 0) {
        data.cell.styles.cellPadding = { top: 12, right: 6, bottom: 12, left: 6 };
        data.cell.styles.halign = 'center';
        data.cell.styles.valign = 'middle';
      }

      // Para la columna de Monto a cobrar (índice 6), preparamos el número formateado
      // y limpiamos text para que autoTable no dibuje texto corrupto ni desfasado
      if (data.section === 'body' && data.column.index === 6) {
        data.cell._montoFormateado = formatCleanNumber(data.cell.raw);
        data.cell.text = [''];
      }
    },
    didDrawCell: (data) => {
      // Dibuja el símbolo ₡ vectorial junto al número limpio perfectamente centrado en la celda
      if (data.section === 'body' && data.column.index === 6 && data.cell._montoFormateado) {
        const numStr = data.cell._montoFormateado;
        doc.saveGraphicsState();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setCharSpace(0);

        const cWidth = doc.getTextWidth('C');
        const numWidth = doc.getTextWidth(numStr);
        const spacing = 2.5;
        const totalWidth = cWidth + spacing + numWidth;

        // Centrado horizontal exacto dentro de la celda
        const startX = data.cell.x + (data.cell.width - totalWidth) / 2;
        // Centrado vertical exacto según la línea base
        const startY = data.cell.y + data.cell.height / 2 + 3.5;

        // Dibuja el símbolo de colón ₡ vectorial
        drawColonSymbol(doc, startX, startY, 11, [5, 150, 105]);

        // Dibuja los números en color verde esmeralda #059669
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(5, 150, 105);
        doc.setCharSpace(0);
        doc.text(numStr, startX + cWidth + spacing, startY);

        doc.restoreGraphicsState();
      }
    },
    didDrawPage: (data) => {
      // Pie de página formal en todas las páginas generadas
      const totalPages = doc.internal.getNumberOfPages();
      const currentPage = data.pageNumber;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184); // #94a3b8

      const footerText = 'Cobro-Firme — Documento Ejecutivo de Cobros';
      doc.text(footerText, marginX, pageHeight - 20);

      const pageStr = `Página ${currentPage} de ${totalPages}`;
      const pageStrWidth = doc.getTextWidth(pageStr);
      doc.text(pageStr, pageWidth - marginX - pageStrWidth, pageHeight - 20);
    }
  });

  // =========================================================================
  // 4. DESCARGA DEL ARCHIVO PDF
  // =========================================================================
  const sanitizedFecha = (fechaTexto || 'Cobros')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/__+/g, '_');

  const fileName = `Cobros_${sanitizedFecha}.pdf`;
  doc.save(fileName);
  return fileName;
}

export default generarPdfCobrosDia;
