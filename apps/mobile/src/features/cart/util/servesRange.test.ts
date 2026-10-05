import { describeServesRanges, isWithinAnyServesRange } from './servesRange';

const chilaquiles = { name: 'Chilaquiles', servesMin: 300, servesMax: 500 };
const tamales = { name: 'Tamales', servesMin: 50, servesMax: 100 };

describe('isWithinAnyServesRange', () => {
  it('es true si al menos un platillo cubre la cantidad de personas (misma regla que la API)', () => {
    expect(isWithinAnyServesRange([chilaquiles, tamales], 80)).toBe(true);
    expect(isWithinAnyServesRange([chilaquiles, tamales], 400)).toBe(true);
  });

  it('incluye los extremos del rango', () => {
    expect(isWithinAnyServesRange([chilaquiles], 300)).toBe(true);
    expect(isWithinAnyServesRange([chilaquiles], 500)).toBe(true);
  });

  it('es false si ningún platillo lo cubre', () => {
    expect(isWithinAnyServesRange([chilaquiles, tamales], 200)).toBe(false);
    expect(isWithinAnyServesRange([chilaquiles], 1000)).toBe(false);
  });

  it('es false con el carrito vacío', () => {
    expect(isWithinAnyServesRange([], 10)).toBe(false);
  });
});

describe('describeServesRanges', () => {
  it('lista el rango de cada platillo, y un solo número cuando min == max', () => {
    expect(
      describeServesRanges([chilaquiles, { name: 'Pastel', servesMin: 20, servesMax: 20 }])
    ).toBe('Chilaquiles: 300–500 personas\nPastel: 20 personas');
  });
});
