import type { MenuItem } from '@catering-app/shared-types';
import { extractOrderIntent } from './extractOrderIntent';

const NOW = new Date('2026-07-31T08:00:00.000Z');

// Los mismos NOW +N días / fecha explícita, construidos igual que la
// implementación (Date local, no UTC) -- así la comparación con el
// resultado real no depende de la zona horaria de la máquina/CI que corre
// el test.
function atLocalDaysFromNow(days: number, hour: number): string {
  const result = new Date(NOW);
  result.setDate(result.getDate() + days);
  result.setHours(hour, 0, 0, 0);
  return result.toISOString();
}

function atLocalDate(year: number, month: number, day: number, hour: number): string {
  const result = new Date(year, month - 1, day);
  result.setHours(hour, 0, 0, 0);
  return result.toISOString();
}

const chilaquiles: MenuItem = {
  id: 'menu-item-chilaquiles',
  categoryId: 'cat-1',
  name: 'Chilaquiles',
  description: null,
  basePrice: 45,
  servesMin: 300,
  servesMax: 500,
  attributes: {},
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const enchiladasVerdes: MenuItem = {
  ...chilaquiles,
  id: 'menu-item-enchiladas-verdes',
  name: 'Enchiladas Verdes',
};

// Dos nombres de la misma longitud que aparecen ambos como substring del
// mismo mensaje -- fuerza un empate real en "coincidencia más larga" para
// probar el caso ambiguo (nombres reales de platillos de distinta longitud,
// como "Enchiladas Verdes" vs "Enchiladas Verdes Especiales", nunca
// empatan: el más específico siempre gana).
const platilloA: MenuItem = {
  ...chilaquiles,
  id: 'menu-item-a',
  name: 'Tacos Dorados',
};

const platilloB: MenuItem = {
  ...chilaquiles,
  id: 'menu-item-b',
  name: 'Tacos Sudados',
};

const menuItems = [chilaquiles, enchiladasVerdes];

describe('extractOrderIntent', () => {
  it('extrae platillo, personas y fecha del mensaje original de referencia (ADR-023, sin tildes)', () => {
    const result = extractOrderIntent(
      'puedes pedirme una orden de catering de chilaquiles para 400 personas en 4 dias para el desayuno',
      menuItems,
      NOW,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.intent.menuItem.id).toBe(chilaquiles.id);
    expect(result.intent.peopleCount).toBe(400);
    expect(result.intent.scheduledFor).toBe(atLocalDaysFromNow(4, 9));
  });

  it('extrae correctamente el mismo mensaje con tildes ("días")', () => {
    const result = extractOrderIntent(
      'quiero chilaquiles para 400 personas en 4 días para el desayuno',
      menuItems,
      NOW,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.intent.scheduledFor).toBe(atLocalDaysFromNow(4, 9));
  });

  it('reconoce "mañana" sin tilde', () => {
    const result = extractOrderIntent(
      'necesito enchiladas verdes para 50 personas manana para la cena',
      menuItems,
      NOW,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.intent.menuItem.id).toBe(enchiladasVerdes.id);
    expect(result.intent.scheduledFor).toBe(atLocalDaysFromNow(1, 20));
  });

  it('reconoce una fecha explícita dd/mm/yyyy', () => {
    const result = extractOrderIntent(
      'chilaquiles para 100 personas el 15/08/2026',
      menuItems,
      NOW,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.intent.scheduledFor).toBe(atLocalDate(2026, 8, 15, 12));
  });

  it('reconoce una fecha explícita "N de <mes>"', () => {
    const result = extractOrderIntent(
      'chilaquiles para 100 personas el 20 de agosto para la comida',
      menuItems,
      NOW,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.intent.scheduledFor).toBe(atLocalDate(2026, 8, 20, 14));
  });

  it('falla con no-menu-item-match cuando el platillo no está en el menú cargado', () => {
    const result = extractOrderIntent(
      'quiero tacos para 100 personas mañana',
      menuItems,
      NOW,
    );

    expect(result).toEqual({ ok: false, reason: 'no-menu-item-match' });
  });

  it('falla con ambiguous-menu-item cuando dos platillos distintos empatan como la coincidencia más larga', () => {
    const result = extractOrderIntent(
      'quiero tacos dorados y tacos sudados para 50 personas mañana',
      [platilloA, platilloB],
      NOW,
    );

    expect(result).toEqual({ ok: false, reason: 'ambiguous-menu-item' });
  });

  it('falla con no-people-count cuando no hay cantidad de personas', () => {
    const result = extractOrderIntent('quiero chilaquiles para mañana', menuItems, NOW);

    expect(result).toEqual({ ok: false, reason: 'no-people-count' });
  });

  it('falla con no-date cuando no hay ninguna expresión de fecha reconocible', () => {
    const result = extractOrderIntent(
      'quiero chilaquiles para 100 personas',
      menuItems,
      NOW,
    );

    expect(result).toEqual({ ok: false, reason: 'no-date' });
  });

  it('falla con date-not-future cuando la fecha explícita ya pasó', () => {
    const result = extractOrderIntent(
      'chilaquiles para 100 personas el 01/01/2026',
      menuItems,
      NOW,
    );

    expect(result).toEqual({ ok: false, reason: 'date-not-future' });
  });
});
