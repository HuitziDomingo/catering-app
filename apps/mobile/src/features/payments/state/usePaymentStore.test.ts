import { usePaymentStore } from './usePaymentStore';
import { createPaymentPreference } from '../data-access/paymentsDataAccess';
import { openCheckout } from '../util/checkout';

jest.mock('../data-access/paymentsDataAccess');
jest.mock('../util/checkout');

beforeEach(() => {
  usePaymentStore.getState().reset();
  jest.clearAllMocks();
});

test('crea la preferencia, abre Checkout Pro con su URL y devuelve el regreso', async () => {
  (createPaymentPreference as jest.Mock).mockResolvedValue('https://mp/checkout?pref_id=1');
  const back = { result: 'success', orderId: 'order-1', paymentStatus: 'approved' };
  (openCheckout as jest.Mock).mockResolvedValue(back);

  await expect(usePaymentStore.getState().pay('order-1')).resolves.toBe(back);

  expect(createPaymentPreference).toHaveBeenCalledWith('order-1');
  expect(openCheckout).toHaveBeenCalledWith('https://mp/checkout?pref_id=1');
  expect(usePaymentStore.getState()).toMatchObject({ status: 'idle', error: null });
});

test('si la API rechaza la preferencia no abre el checkout y expone el error', async () => {
  (createPaymentPreference as jest.Mock).mockRejectedValue(
    new Error('El pedido no está pendiente de pago (status actual: confirmed).')
  );

  await expect(usePaymentStore.getState().pay('order-1')).resolves.toBeNull();

  expect(openCheckout).not.toHaveBeenCalled();
  expect(usePaymentStore.getState()).toMatchObject({
    status: 'error',
    error: 'El pedido no está pendiente de pago (status actual: confirmed).',
  });
});
