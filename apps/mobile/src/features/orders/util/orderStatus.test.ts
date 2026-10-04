import { OrderStatus } from '@catering-app/shared-types';
import { formatPaymentMethod, isPayable, ORDER_STATUS_LABELS } from './orderStatus';

describe('isPayable', () => {
  it('solo pending y payment_failed (reintento) se pueden pagar', () => {
    expect(isPayable(OrderStatus.PENDING)).toBe(true);
    expect(isPayable(OrderStatus.PAYMENT_FAILED)).toBe(true);
    for (const status of [
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ]) {
      expect(isPayable(status)).toBe(false);
    }
  });
});

describe('ORDER_STATUS_LABELS', () => {
  it('tiene etiqueta para todos los estados', () => {
    for (const status of Object.values(OrderStatus)) {
      expect(ORDER_STATUS_LABELS[status]).toEqual(expect.any(String));
    }
  });
});

describe('formatPaymentMethod', () => {
  it('traduce ids conocidos, deja pasar los desconocidos y devuelve null sin método', () => {
    expect(formatPaymentMethod('master')).toBe('Mastercard');
    expect(formatPaymentMethod('nuevo_metodo')).toBe('nuevo_metodo');
    expect(formatPaymentMethod(null)).toBeNull();
  });
});
