import { hexToRgba } from './hexToRgba';

describe('hexToRgba', () => {
  it('converts a light hex color to rgba with the given alpha', () => {
    expect(hexToRgba('#FFFFFF', 0.6)).toBe('rgba(255, 255, 255, 0.6)');
  });

  it('converts a dark hex color to rgba with the given alpha', () => {
    expect(hexToRgba('#222B45', 0.6)).toBe('rgba(34, 43, 69, 0.6)');
  });

  it('works without a leading #', () => {
    expect(hexToRgba('222B45', 0.6)).toBe('rgba(34, 43, 69, 0.6)');
  });
});
