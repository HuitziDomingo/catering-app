import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from './create-order.dto';
import {
  MAX_ORDER_ITEMS,
  MAX_ORDER_ITEMS_MESSAGE,
  MIN_ORDER_ITEMS_MESSAGE,
} from '../order-items.validation';

// Mismo pipeline que el ValidationPipe global de main.ts ({ transform: true }).
async function parse(body: Record<string, unknown>) {
  const dto = plainToInstance(CreateOrderDto, body);
  const errors = await validate(dto);
  return { dto, errors };
}

const menuItemId = '3f1c2b9a-6d4e-4a7b-9c2d-1e5f6a7b8c9d';

const validBody = (itemCount = 1) => ({
  peopleCount: 10,
  scheduledFor: '2026-12-01T18:00:00.000Z',
  items: Array.from({ length: itemCount }, () => ({ menuItemId, quantity: 1 })),
});

const itemsMessages = (errors: Awaited<ReturnType<typeof parse>>['errors']) =>
  errors
    .filter((e) => e.property === 'items')
    .flatMap((e) => Object.values(e.constraints ?? {}));

describe('CreateOrderDto', () => {
  it('acepta un pedido válido', async () => {
    const { errors } = await parse(validBody());
    expect(errors).toHaveLength(0);
  });

  it(`acepta exactamente ${MAX_ORDER_ITEMS} platillos`, async () => {
    const { errors } = await parse(validBody(MAX_ORDER_ITEMS));
    expect(errors).toHaveLength(0);
  });

  it(`rechaza ${MAX_ORDER_ITEMS + 1} platillos con el mismo mensaje que la tool MCP crear_pedido`, async () => {
    const { errors } = await parse(validBody(MAX_ORDER_ITEMS + 1));
    expect(itemsMessages(errors)).toContain(MAX_ORDER_ITEMS_MESSAGE);
  });

  it('rechaza un pedido sin platillos', async () => {
    const { errors } = await parse(validBody(0));
    expect(itemsMessages(errors)).toContain(MIN_ORDER_ITEMS_MESSAGE);
  });
});
