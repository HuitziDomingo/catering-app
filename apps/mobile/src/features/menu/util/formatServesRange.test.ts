import { formatServesRange } from './formatServesRange';

test('formats a singular exact amount', () => {
  expect(formatServesRange(1, 1)).toBe('Sirve 1 persona');
});

test('formats a plural exact amount', () => {
  expect(formatServesRange(4, 4)).toBe('Sirve 4 personas');
});

test('formats a range', () => {
  expect(formatServesRange(300, 500)).toBe('Sirve de 300 a 500 personas');
});

test('formats a range starting at 1', () => {
  expect(formatServesRange(1, 5)).toBe('Sirve de 1 a 5 personas');
});
