import { buildReceiptContent } from './receipt-content';
import { business, paidOrder } from './receipt-fixtures';
import { ReceiptPdfRenderer } from './receipt-pdf.renderer';

/** Páginas del PDF: objetos /Type /Page (sin contar el /Type /Pages raíz). */
function pageCount(pdf: Buffer): number {
  return pdf.toString('latin1').match(/\/Type \/Page\b(?!s)/g)?.length ?? 0;
}

describe('ReceiptPdfRenderer', () => {
  const renderer = new ReceiptPdfRenderer();

  it('genera un PDF válido de una página para un pedido normal', async () => {
    const pdf = await renderer.render(buildReceiptContent(paidOrder(), business));

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.subarray(-6).toString()).toContain('%%EOF');
    expect(pageCount(pdf)).toBe(1);
  });

  it('pone título y autor en los metadatos del PDF', async () => {
    const pdf = await renderer.render(buildReceiptContent(paidOrder(), business));
    const raw = pdf.toString('latin1');

    // pdfkit escribe los metadatos como cadenas literales UTF-16BE con BOM.
    const utf16be = (text: string) =>
      Buffer.from(`\ufeff${text}`, 'utf16le').swap16().toString('latin1');
    expect(raw).toContain(`(${utf16be('Recibo 3F2A9B1C - Santo Sazón')})`);
  });

  it('agrega páginas cuando hay muchos platillos', async () => {
    const order = paidOrder();
    order.items = Array.from({ length: 60 }, (_, i) => ({
      ...order.items[0],
      id: i + 1,
      menuItem: { ...order.items[0].menuItem, name: `Platillo número ${i + 1}` },
    }));

    const pdf = await renderer.render(buildReceiptContent(order, business));

    expect(pageCount(pdf)).toBeGreaterThan(1);
  });

  it('tolera datos opcionales del negocio vacíos y teléfono de cliente nulo', async () => {
    const order = paidOrder();
    order.customer.phone = null;

    const pdf = await renderer.render(
      buildReceiptContent(order, {
        ...business,
        address: null,
        phone: null,
        email: null,
        rfc: null,
      }),
    );

    expect(pageCount(pdf)).toBe(1);
  });
});
