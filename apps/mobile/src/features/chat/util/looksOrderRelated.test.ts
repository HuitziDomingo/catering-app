import { looksOrderRelated } from './looksOrderRelated';

test.each([
  '¿cuáles son mis pedidos?',
  'Quiero ver mi pedido',
  'ordenes recientes',
  'mis órdenes',
  'información de mi compra',
])('detects order-related message: %s', (message) => {
  expect(looksOrderRelated(message)).toBe(true);
});

test.each(['hola', '¿qué tal el clima?', 'cuál es el menú de hoy'])(
  'does not flag unrelated message: %s',
  (message) => {
    expect(looksOrderRelated(message)).toBe(false);
  },
);
