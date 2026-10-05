import { AxiosError, type AxiosResponse } from 'axios';
import { selectItemCount, selectSubtotal, useCartStore, MAX_QUANTITY } from './useCartStore';
import { createOrder } from '../../orders/data-access/ordersDataAccess';

jest.mock('../../orders/data-access/ordersDataAccess');

const chilaquiles = {
  id: 'item-a',
  categoryId: 'cat-a',
  name: 'Chilaquiles',
  description: null,
  // El backend serializa numeric como string en algunos endpoints: se
  // normaliza a number al agregar.
  basePrice: '1500.50' as unknown as number,
  servesMin: 300,
  servesMax: 500,
  attributes: {},
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const tamales = { ...chilaquiles, id: 'item-b', name: 'Tamales', basePrice: 800 };

const orderInput = {
  peopleCount: 350,
  scheduledFor: '2026-10-10T15:00:00.000Z',
  notes: 'Sin cebolla',
};

beforeEach(() => {
  useCartStore.setState({ lines: [], submitStatus: 'idle', submitError: null, lastOrder: null });
  jest.clearAllMocks();
});

describe('líneas del carrito', () => {
  test('addItem agrega una línea con copia del nombre, precio (como number) y rango', () => {
    useCartStore.getState().addItem(chilaquiles, 2);

    expect(useCartStore.getState().lines).toEqual([
      {
        menuItemId: 'item-a',
        name: 'Chilaquiles',
        unitPrice: 1500.5,
        servesMin: 300,
        servesMax: 500,
        quantity: 2,
        // Respaldo para cuando el menú no está cargado (ver resolveCartLineImage).
        imageUrl: null,
      },
    ]);
  });

  test('agregar el mismo platillo suma la cantidad en vez de duplicar la línea', () => {
    useCartStore.getState().addItem(chilaquiles, 2);
    useCartStore.getState().addItem(chilaquiles, 3);

    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().lines[0].quantity).toBe(5);
  });

  test(`la cantidad se limita a ${MAX_QUANTITY}`, () => {
    useCartStore.getState().addItem(chilaquiles, 98);
    useCartStore.getState().addItem(chilaquiles, 5);

    expect(useCartStore.getState().lines[0].quantity).toBe(MAX_QUANTITY);
  });

  test('setQuantity cambia la cantidad, y con 0 quita la línea', () => {
    useCartStore.getState().addItem(chilaquiles, 2);
    useCartStore.getState().setQuantity('item-a', 4);
    expect(useCartStore.getState().lines[0].quantity).toBe(4);

    useCartStore.getState().setQuantity('item-a', 0);
    expect(useCartStore.getState().lines).toEqual([]);
  });

  test('removeItem quita solo esa línea', () => {
    useCartStore.getState().addItem(chilaquiles, 1);
    useCartStore.getState().addItem(tamales, 1);
    useCartStore.getState().removeItem('item-a');

    expect(useCartStore.getState().lines.map((line) => line.menuItemId)).toEqual(['item-b']);
  });

  test('selectItemCount suma unidades y selectSubtotal multiplica precio por cantidad', () => {
    useCartStore.getState().addItem(chilaquiles, 2);
    useCartStore.getState().addItem(tamales, 3);

    expect(selectItemCount(useCartStore.getState())).toBe(5);
    expect(selectSubtotal(useCartStore.getState())).toBe(5401);
  });
});

describe('placeOrder', () => {
  test('crea UN pedido con todas las líneas y vacía el carrito', async () => {
    const order = { id: 'order-1' };
    (createOrder as jest.Mock).mockResolvedValue(order);
    useCartStore.getState().addItem(chilaquiles, 2);
    useCartStore.getState().addItem(tamales, 1);

    const result = await useCartStore.getState().placeOrder(orderInput);

    expect(createOrder).toHaveBeenCalledTimes(1);
    expect(createOrder).toHaveBeenCalledWith({
      ...orderInput,
      items: [
        { menuItemId: 'item-a', quantity: 2 },
        { menuItemId: 'item-b', quantity: 1 },
      ],
    });
    expect(result).toBe(order);
    expect(useCartStore.getState()).toMatchObject({
      lines: [],
      submitStatus: 'success',
      lastOrder: order,
    });
  });

  test('si la API falla conserva el carrito y expone el mensaje de error', async () => {
    const error = new AxiosError('Request failed');
    error.response = {
      data: { message: ['scheduledFor must be a valid ISO 8601 date string'] },
    } as AxiosResponse;
    (createOrder as jest.Mock).mockRejectedValue(error);
    useCartStore.getState().addItem(chilaquiles, 2);

    const result = await useCartStore.getState().placeOrder(orderInput);

    expect(result).toBeNull();
    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().submitStatus).toBe('error');
    expect(useCartStore.getState().submitError).toBe(
      'scheduledFor must be a valid ISO 8601 date string'
    );
  });

  test('con el carrito vacío no llama a la API', async () => {
    await expect(useCartStore.getState().placeOrder(orderInput)).resolves.toBeNull();
    expect(createOrder).not.toHaveBeenCalled();
  });
});
