import { OrderStatus } from '@catering-app/shared-types';
import { buildReceiptContent, orderFolio, RECEIPT_LEGEND } from './receipt-content';
import { business, paidOrder } from './receipt-fixtures';

describe('buildReceiptContent', () => {
  const issuedAt = new Date('2026-10-06T18:00:00.000Z');

  it('incluye negocio, folio, cliente, platillos, total y pago de Mercado Pago', () => {
    const content = buildReceiptContent(paidOrder(), business, issuedAt);

    expect(content.business.name).toBe('Santo Sazón');
    expect(content.folio).toBe('3F2A9B1C');
    expect(content.orderId).toBe('3f2a9b1c-0000-4000-8000-000000000001');
    expect(content.customer).toEqual({
      name: 'Ana Pérez Núñez',
      email: 'ana@example.com',
      phone: '5512345678',
    });
    expect(content.lines).toEqual([
      {
        description: 'Chilaquiles rojos con pollo',
        quantity: 2,
        unitPrice: '$1,250.00',
        subtotal: '$2,500.00',
      },
      {
        description: 'Café de olla (garrafa)',
        quantity: 1,
        unitPrice: '$1,200.00',
        subtotal: '$1,200.00',
      },
    ]);
    expect(content.total).toBe('$3,700.00');
    expect(content.payment.method).toBe('Visa');
    expect(content.payment.paymentId).toBe('1234567890');
    expect(content.legend).toBe('Este documento no es un comprobante fiscal (CFDI).');
    expect(RECEIPT_LEGEND).toBe(content.legend);
  });

  it('muestra las fechas en la zona horaria del negocio', () => {
    const content = buildReceiptContent(paidOrder(), business, issuedAt);

    // 17:45 UTC = 11:45 en Ciudad de México (UTC-6).
    expect(content.payment.paidAt).toMatch(/6 de octubre de 2026/);
    expect(content.payment.paidAt).toMatch(/11:45/);
    // El evento 2026-11-20 00:00 UTC cae el 19 de noviembre en CDMX.
    expect(content.scheduledFor).toMatch(/19 de noviembre de 2026/);
  });

  it('pago confirmado a mano (transferencia/efectivo): sin datos de Mercado Pago, sin romperse', () => {
    const content = buildReceiptContent(
      paidOrder({ paymentId: null, paymentMethod: null, paidAt: null }),
      business,
      issuedAt,
    );

    expect(content.payment).toEqual({
      method: 'Registrado por el negocio (transferencia o efectivo)',
      paymentId: 'No aplica',
      paidAt: 'No aplica',
    });
  });

  it('un método de pago desconocido se muestra tal cual', () => {
    const content = buildReceiptContent(
      paidOrder({ paymentMethod: 'nuevo_metodo', status: OrderStatus.DELIVERED }),
      business,
      issuedAt,
    );

    expect(content.payment.method).toBe('nuevo_metodo');
  });

  it('orderFolio usa los primeros 8 caracteres del id en mayúsculas', () => {
    expect(orderFolio('abcdef12-3456-7890')).toBe('ABCDEF12');
  });
});
