import { crearPedidoTool } from './crear-pedido.tool';

describe('crearPedidoInputSchema (crear_pedido tool input validation)', () => {
  const menuItemId = '22222222-2222-2222-2222-222222222222';

  const futureIso = () =>
    new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

  const validInput = () => ({
    items: [{ menuItemId, quantity: 2 }],
    peopleCount: 400,
    scheduledFor: futureIso(),
    notes: 'Sin cebolla',
  });

  it('accepts a well-formed input', () => {
    const result = crearPedidoTool.inputSchema.safeParse(validInput());
    expect(result.success).toBe(true);
  });

  it('accepts input without optional notes', () => {
    const input = validInput() as { notes?: string };
    delete input.notes;
    const result = crearPedidoTool.inputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects empty items array', () => {
    const result = crearPedidoTool.inputSchema.safeParse({
      ...validInput(),
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an item with a non-uuid menuItemId', () => {
    const result = crearPedidoTool.inputSchema.safeParse({
      ...validInput(),
      items: [{ menuItemId: 'not-a-uuid', quantity: 2 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an item with quantity < 1', () => {
    const result = crearPedidoTool.inputSchema.safeParse({
      ...validInput(),
      items: [{ menuItemId, quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects peopleCount < 1', () => {
    const result = crearPedidoTool.inputSchema.safeParse({
      ...validInput(),
      peopleCount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-ISO scheduledFor', () => {
    const result = crearPedidoTool.inputSchema.safeParse({
      ...validInput(),
      scheduledFor: 'mañana',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a scheduledFor in the past', () => {
    const pastIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const result = crearPedidoTool.inputSchema.safeParse({
      ...validInput(),
      scheduledFor: pastIso,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing peopleCount', () => {
    const input = validInput() as { peopleCount?: number };
    delete input.peopleCount;
    const result = crearPedidoTool.inputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
