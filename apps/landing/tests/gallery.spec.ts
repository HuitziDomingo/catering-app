import { expect, test } from 'vitest';
import Gallery from '../src/components/Gallery.astro';
import { gallery } from '../src/data/site';
import { render, tags, text } from './render';

test('mosaico de 6 fotos lazy, con tamaño y alt en español', async () => {
  const imgs = tags(await render(Gallery), 'img');

  expect(gallery).toHaveLength(6);
  expect(imgs).toHaveLength(6);
  for (const img of imgs) {
    expect(img.loading).toBe('lazy');
    expect(Number(img.width)).toBeGreaterThan(0);
    expect(Number(img.height)).toBeGreaterThan(0);
    expect(img.alt.length).toBeGreaterThan(15);
  }
});

test('sin testimonios inventados: solo un espacio marcado para opiniones', async () => {
  const body = text(await render(Gallery));

  expect(body).toContain('Espacio para opiniones de clientes');
  expect(body).toContain('Placeholder del mockup');
  expect(body).not.toMatch(/★|estrellas|testimonio/i);
});
