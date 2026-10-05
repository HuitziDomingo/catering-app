import { useOrdersStore } from './useOrdersStore';
import { fetchMyOrders, fetchOrder } from '../data-access/ordersDataAccess';

jest.mock('../data-access/ordersDataAccess');

const order = (id: string, status = 'pending') => ({ id, status }) as never;

beforeEach(() => {
  useOrdersStore.getState().clear();
  jest.clearAllMocks();
});

test('load trae la primera página de GET /orders/mine y la indexa por id', async () => {
  (fetchMyOrders as jest.Mock).mockResolvedValue({
    items: [order('a'), order('b')],
    total: 2,
    page: 1,
    pageSize: 20,
  });

  await useOrdersStore.getState().load();

  expect(fetchMyOrders).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  expect(useOrdersStore.getState()).toMatchObject({ total: 2, page: 1, listStatus: 'success' });
  expect(Object.keys(useOrdersStore.getState().byId)).toEqual(['a', 'b']);
});

test('loadMore pide la página siguiente sin duplicar pedidos, y no pide de más', async () => {
  (fetchMyOrders as jest.Mock)
    .mockResolvedValueOnce({ items: [order('a'), order('b')], total: 3, page: 1, pageSize: 2 })
    .mockResolvedValueOnce({ items: [order('b'), order('c')], total: 3, page: 2, pageSize: 2 });

  await useOrdersStore.getState().load();
  await useOrdersStore.getState().loadMore();

  expect(useOrdersStore.getState().items.map((o) => o.id)).toEqual(['a', 'b', 'c']);
  await useOrdersStore.getState().loadMore();
  expect(fetchMyOrders).toHaveBeenCalledTimes(2);
});

test('load expone el error si la API falla', async () => {
  (fetchMyOrders as jest.Mock).mockRejectedValue(new Error('Network Error'));

  await useOrdersStore.getState().load();

  expect(useOrdersStore.getState()).toMatchObject({
    listStatus: 'error',
    listError: 'Network Error',
  });
});

test('loadOrder actualiza el detalle y también el pedido en la lista (ej. status tras pagar)', async () => {
  (fetchMyOrders as jest.Mock).mockResolvedValue({ items: [order('a')], total: 1, page: 1, pageSize: 20 });
  await useOrdersStore.getState().load();
  (fetchOrder as jest.Mock).mockResolvedValue(order('a', 'confirmed'));

  const loaded = await useOrdersStore.getState().loadOrder('a');

  expect(loaded).toEqual(order('a', 'confirmed'));
  expect(useOrdersStore.getState().byId.a.status).toBe('confirmed');
  expect(useOrdersStore.getState().items[0].status).toBe('confirmed');
});
