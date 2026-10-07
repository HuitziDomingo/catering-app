import { expect, test } from 'vitest';
import MenuHighlights from '../src/components/MenuHighlights.astro';
import { menuHighlights } from '../src/data/site';
import { render, tags, text } from './render';

test('seis platillos con foto, nombre, descripción y precio "desde"', async () => {
  const html = await render(MenuHighlights);
  const body = text(html);

  expect(menuHighlights).toHaveLength(6);
  for (const dish of menuHighlights) {
    expect(body).toContain(dish.name);
    expect(body).toContain(dish.description);
    expect(body).toMatch(new RegExp(`desde \\$${dish.price} por persona`));
  }
  const imgs = tags(html, 'img');
  expect(imgs).toHaveLength(6);
  expect(imgs.every((img) => img.loading === 'lazy' && img.width && img.height && img.alt)).toBe(true);
});

test('es el destino de "Menú" y "Ver menú" (#menu)', async () => {
  expect(tags(await render(MenuHighlights), 'section')[0].id).toBe('menu');
});
