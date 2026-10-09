import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrderStatus } from '@catering-app/shared-types';
import { ListOrdersQueryDto, MAX_STATUS_FILTERS } from './list-orders-query.dto';

// Mismo pipeline que el ValidationPipe global de main.ts ({ transform: true }):
// la query string llega como strings y se transforma antes de validar.
async function parse(query: Record<string, unknown>) {
  const dto = plainToInstance(ListOrdersQueryDto, query);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('ListOrdersQueryDto', () => {
  it('acepta una query vacía (todos los filtros son opcionales)', async () => {
    const { errors } = await parse({});
    expect(errors).toHaveLength(0);
  });

  it('separa status por coma y también acepta el parámetro repetido', async () => {
    expect((await parse({ status: 'pending,confirmed' })).dto.status).toEqual([
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
    ]);
    expect((await parse({ status: ['pending', 'preparing'] })).dto.status).toEqual([
      OrderStatus.PENDING,
      OrderStatus.PREPARING,
    ]);
  });

  it('rechaza un status que no existe', async () => {
    const { errors } = await parse({ status: 'pending,shipped' });
    expect(errors.map((e) => e.property)).toContain('status');
  });

  it(`rechaza más de ${MAX_STATUS_FILTERS} valores de status`, async () => {
    const status = Array.from({ length: MAX_STATUS_FILTERS + 1 }, () => 'pending').join(',');
    const { errors } = await parse({ status });
    expect(errors.map((e) => e.property)).toContain('status');
  });

  it("convierte needsReview 'true'/'false' a booleano y rechaza otros valores", async () => {
    expect((await parse({ needsReview: 'true' })).dto.needsReview).toBe(true);
    expect((await parse({ needsReview: 'false' })).dto.needsReview).toBe(false);
    expect((await parse({ needsReview: 'si' })).errors.map((e) => e.property)).toContain(
      'needsReview',
    );
  });

  it('convierte page/pageSize a number y respeta el máximo de 100', async () => {
    const { dto, errors } = await parse({ page: '2', pageSize: '50' });
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(50);

    expect((await parse({ pageSize: '500' })).errors.map((e) => e.property)).toContain(
      'pageSize',
    );
  });

  it('valida fechas ISO y los valores de sort/direction', async () => {
    const { errors } = await parse({
      from: 'ayer',
      createdSince: '2026-10-03T08:00:00.000Z',
      sort: 'total',
      direction: 'up',
    });
    expect(errors.map((e) => e.property).sort()).toEqual(['direction', 'from', 'sort']);
  });
});
