import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Index from '../src/pages/index.astro';

test('homepage has App Store and Google Play download buttons', async () => {
  const container = await AstroContainer.create();
  const result = await container.renderToString(Index);

  expect(result).toContain('<a href="#" role="button">Descargar en App Store</a>');
  expect(result).toContain('<a href="#" role="button">Descargar en Google Play</a>');
});
