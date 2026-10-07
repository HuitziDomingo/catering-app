import { expect, test } from 'vitest';
import Index from '../src/pages/index.astro';
import { render, tags } from './render';

test('la página es en español, tema claro y con enlace para saltar al contenido', async () => {
  const html = await render(Index);

  expect(tags(html, 'html')[0]).toMatchObject({ lang: 'es', 'data-theme': 'light' });
  expect(tags(html, 'a').some((a) => a.href === '#contenido')).toBe(true);
  expect(tags(html, 'main')[0].id).toBe('contenido');
});
