import { OrderStatus } from '@catering-app/shared-types';
import { describePaymentResult } from './PaymentResultCard';

describe('describePaymentResult', () => {
  it('el status real del pedido manda sobre la ruta de regreso', () => {
    expect(describePaymentResult('pending', OrderStatus.CONFIRMED).status).toBe('success');
    expect(describePaymentResult('success', OrderStatus.PAYMENT_FAILED).status).toBe('danger');
  });

  it('regreso "success" con el pedido aún pending: "confirmando" (webhook en camino)', () => {
    expect(describePaymentResult('success', OrderStatus.PENDING)).toMatchObject({
      status: 'info',
      title: 'Estamos confirmando tu pago',
    });
  });

  it('regreso "failure": no se completó', () => {
    expect(describePaymentResult('failure', OrderStatus.PENDING).status).toBe('danger');
  });

  it('regreso "pending" (efectivo/transferencia): pendiente', () => {
    expect(describePaymentResult('pending', OrderStatus.PENDING).title).toBe('Pago pendiente');
  });

  it('pedido cancelado: avisa en vez de decir "aprobado"', () => {
    expect(describePaymentResult('success', OrderStatus.CANCELLED).status).toBe('warning');
  });
});
