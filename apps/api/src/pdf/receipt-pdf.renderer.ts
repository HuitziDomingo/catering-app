import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { ReceiptContent } from './receipt-content';

const MARGIN = 50;
const MUTED = '#555555';
const RULE = '#cccccc';

/** Columnas de la tabla de platillos, en puntos desde el margen izquierdo. */
const COLUMNS = {
  description: { x: 0, width: 270 },
  quantity: { x: 280, width: 50 },
  unitPrice: { x: 340, width: 85 },
  subtotal: { x: 427, width: 85 },
};

/**
 * Dibuja el recibo PDF con pdfkit (ADR-007): sin navegador headless, poca
 * memoria en Cloud Run. Usa las fuentes estándar del PDF (Helvetica), que no
 * se empaquetan y cubren acentos y ñ (WinAnsi).
 */
@Injectable()
export class ReceiptPdfRenderer {
  render(content: ReceiptContent): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: MARGIN,
      info: {
        Title: `Recibo ${content.folio} - ${content.business.name}`,
        Author: content.business.name,
      },
    });

    const done = new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    this.drawHeader(doc, content);
    this.drawParties(doc, content);
    this.drawLines(doc, content);
    this.drawPayment(doc, content);
    this.drawFooter(doc, content);

    doc.end();
    return done;
  }

  private drawHeader(doc: PDFKit.PDFDocument, content: ReceiptContent): void {
    const { business } = content;
    const top = doc.y;
    const width = this.contentWidth(doc);

    doc.font('Helvetica-Bold').fontSize(20).fillColor('black').text(business.name, MARGIN, top, {
      width: width * 0.6,
    });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED);
    for (const line of [
      business.address,
      business.phone && `Tel. ${business.phone}`,
      business.email,
      business.rfc && `RFC: ${business.rfc}`,
    ]) {
      if (line) doc.text(line, { width: width * 0.6 });
    }
    const leftBottom = doc.y;

    doc.font('Helvetica-Bold').fontSize(14).fillColor('black').text('RECIBO DE PAGO', MARGIN, top, {
      width,
      align: 'right',
    });
    doc.font('Helvetica').fontSize(10).text(`Folio ${content.folio}`, { width, align: 'right' });

    doc.y = Math.max(leftBottom, doc.y) + 12;
    this.rule(doc);
  }

  private drawParties(doc: PDFKit.PDFDocument, content: ReceiptContent): void {
    const top = doc.y + 10;
    const half = this.contentWidth(doc) / 2;

    this.label(doc, 'CLIENTE', MARGIN, top);
    doc.font('Helvetica').fontSize(10).fillColor('black');
    doc.text(content.customer.name, { width: half - 10 });
    doc.text(content.customer.email, { width: half - 10 });
    if (content.customer.phone) doc.text(content.customer.phone, { width: half - 10 });
    const leftBottom = doc.y;

    this.label(doc, 'PEDIDO', MARGIN + half, top);
    doc.font('Helvetica').fontSize(10).fillColor('black');
    doc.text(`Fecha del pedido: ${content.orderedAt}`, { width: half });
    doc.text(`Fecha del evento: ${content.scheduledFor}`, { width: half });
    doc.text(`Personas: ${content.peopleCount}`, { width: half });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(`ID: ${content.orderId}`, { width: half });

    doc.x = MARGIN;
    doc.y = Math.max(leftBottom, doc.y) + 18;
  }

  private drawLines(doc: PDFKit.PDFDocument, content: ReceiptContent): void {
    this.drawTableHeader(doc);

    for (const line of content.lines) {
      doc.font('Helvetica').fontSize(10);
      const height = doc.heightOfString(line.description, {
        width: COLUMNS.description.width,
      });
      if (doc.y + height > this.bottomLimit(doc)) {
        doc.addPage();
        this.drawTableHeader(doc);
        doc.font('Helvetica').fontSize(10);
      }

      const y = doc.y;
      doc.fillColor('black');
      this.cell(doc, line.description, COLUMNS.description, y);
      this.cell(doc, String(line.quantity), COLUMNS.quantity, y, 'right');
      this.cell(doc, line.unitPrice, COLUMNS.unitPrice, y, 'right');
      this.cell(doc, line.subtotal, COLUMNS.subtotal, y, 'right');
      doc.y = y + height + 6;
    }

    this.rule(doc);
    const y = doc.y + 6;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('black');
    this.cell(doc, 'Total', COLUMNS.unitPrice, y, 'right');
    this.cell(doc, content.total, COLUMNS.subtotal, y, 'right');
    doc.x = MARGIN;
    doc.y = y + 30;
  }

  private drawPayment(doc: PDFKit.PDFDocument, content: ReceiptContent): void {
    if (doc.y + 80 > this.bottomLimit(doc)) doc.addPage();

    this.label(doc, 'PAGO', MARGIN, doc.y);
    doc.font('Helvetica').fontSize(10).fillColor('black');
    doc.text(`Método de pago: ${content.payment.method}`);
    doc.text(`ID de pago (Mercado Pago): ${content.payment.paymentId}`);
    doc.text(`Fecha de pago: ${content.payment.paidAt}`);
  }

  /** Leyenda al pie de la última página (ADR-028: no es un CFDI). */
  private drawFooter(doc: PDFKit.PDFDocument, content: ReceiptContent): void {
    const width = this.contentWidth(doc);
    // Abajo del área de contenido: escribir más abajo del margen inferior
    // haría que pdfkit abriera una página nueva.
    const y = doc.page.height - doc.page.margins.bottom - 30;
    doc.moveTo(MARGIN, y - 8).lineTo(MARGIN + width, y - 8).strokeColor(RULE).stroke();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('black').text(content.legend, MARGIN, y, {
      width,
      align: 'center',
    });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(`Emitido el ${content.issuedAt}`, {
      width,
      align: 'center',
    });
  }

  private drawTableHeader(doc: PDFKit.PDFDocument): void {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED);
    this.cell(doc, 'PLATILLO', COLUMNS.description, y);
    this.cell(doc, 'CANT.', COLUMNS.quantity, y, 'right');
    this.cell(doc, 'PRECIO UNIT.', COLUMNS.unitPrice, y, 'right');
    this.cell(doc, 'IMPORTE', COLUMNS.subtotal, y, 'right');
    doc.y = y + 14;
    this.rule(doc);
    doc.y += 6;
  }

  private cell(
    doc: PDFKit.PDFDocument,
    text: string,
    column: { x: number; width: number },
    y: number,
    align: 'left' | 'right' = 'left',
  ): void {
    doc.text(text, MARGIN + column.x, y, { width: column.width, align });
  }

  private label(doc: PDFKit.PDFDocument, text: string, x: number, y: number): void {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(text, x, y);
    doc.moveDown(0.2);
  }

  private rule(doc: PDFKit.PDFDocument): void {
    doc
      .moveTo(MARGIN, doc.y)
      .lineTo(MARGIN + this.contentWidth(doc), doc.y)
      .strokeColor(RULE)
      .stroke();
  }

  private contentWidth(doc: PDFKit.PDFDocument): number {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  /** Límite para el contenido: deja lugar a la leyenda del pie. */
  private bottomLimit(doc: PDFKit.PDFDocument): number {
    return doc.page.height - doc.page.margins.bottom - 50;
  }
}
