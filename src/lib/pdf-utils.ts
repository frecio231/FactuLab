import { jsPDF } from 'jspdf';
import { PlaceHolderImages } from './placeholder-images';

export interface InventoryData {
  distribuidor: string;
  marca: string;
  modelo: string;
  serie: string;
  folio: string;
  costo: number;
  ivaPorcentaje: number;
  ivaCalculado: number;
  total: number;
  especificacion: string;
  fecha: Date;
}

export const generateInventoryPDF = async (data: InventoryData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  
  const primaryColor = [31, 51, 84]; // #1F3354
  const accentColor = [41, 214, 255]; // #29D6FF

  // Header Logo
  const logo = PlaceHolderImages.find(img => img.id === 'tienda-logo');
  if (logo) {
    try {
      const img = new Image();
      img.src = logo.imageUrl;
      img.crossOrigin = 'Anonymous';
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Continue even if logo fails
      });
      if (img.complete && img.naturalWidth !== 0) {
        // Logo on top left
        doc.addImage(img, 'PNG', margin, 10, 25, 25);
      }
    } catch (e) {
      console.error('Error loading logo for PDF', e);
    }
  }

  // Header Title & Subtitle (Beside logo)
  const textStartX = margin + 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('FACTULAB', textStartX, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Sistema de Gestión de Inventario Clínico', textStartX, 28);

  // Folio & Date (Right Aligned to prevent overflow)
  const rightMargin = pageWidth - margin;
  doc.setFontSize(11);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  // Use right alignment for long folios
  doc.text(`FACTURA/FOLIO: ${data.folio}`, rightMargin, 22, { align: 'right' });
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${data.fecha.toLocaleDateString('es-ES')}`, rightMargin, 28, { align: 'right' });

  // Divider
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, 40, rightMargin, 40);

  // Content Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalles del Equipo', margin, 50);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const startY = 60;
  const rowHeight = 10;

  const fields = [
    { label: 'Distribuidor:', value: data.distribuidor },
    { label: 'Marca:', value: data.marca },
    { label: 'Modelo:', value: data.modelo },
    { label: 'Número de Serie:', value: data.serie },
  ];

  fields.forEach((field, index) => {
    const y = startY + (index * rowHeight);
    doc.setFont('helvetica', 'bold');
    doc.text(field.label, margin + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(field.value, margin + 45, y);
  });

  // Financial Summary Section
  const financeY = startY + (fields.length * rowHeight) + 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen Financiero', margin, financeY);
  
  doc.setFontSize(11);
  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  
  const financeFields = [
    { label: 'Subtotal:', value: formatter.format(data.costo) },
    { label: `IVA (${data.ivaPorcentaje}%):`, value: formatter.format(data.ivaCalculado) },
    { label: 'Total:', value: formatter.format(data.total) },
  ];

  financeFields.forEach((field, index) => {
    const y = financeY + 10 + (index * rowHeight);
    doc.setFont('helvetica', 'bold');
    doc.text(field.label, margin + 5, y);
    doc.setFont('helvetica', 'normal');
    if (field.label === 'Total:') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    }
    doc.text(field.value, margin + 45, y);
    doc.setTextColor(0); // Reset color
  });

  // Specification Section
  const specY = financeY + 10 + (financeFields.length * rowHeight) + 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Especificaciones Técnicas', margin, specY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitText = doc.splitTextToSize(data.especificacion, pageWidth - (margin * 2) - 10);
  doc.text(splitText, margin + 5, specY + 8);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Documento generado automáticamente por FactuLab. No requiere firma física.', margin, doc.internal.pageSize.getHeight() - 10);
  doc.text('Página 1 de 1', rightMargin, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

  return doc;
};
