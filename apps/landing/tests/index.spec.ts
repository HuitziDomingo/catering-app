import { expect, test } from 'vitest';
import Index from '../src/pages/index.astro';
import { render, tags } from './render';

test('la página es en español, tema claro y con enlace para saltar al contenido', async () => {
  const html = await render(Index);

  expect(tags(html, 'html')[0]).toMatchObject({ lang: 'es', 'data-theme': 'light' });
  expect(tags(html, 'a').some((a) => a.href === '#contenido')).toBe(true);
  expect(tags(html, 'main')[0].id).toBe('contenido');
});

test('todas las secciones en orden, y todas las anclas de la navegación existen', async () => {
  const html = await render(Index);
  const ids = [...html.matchAll(/<(?:section|footer)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);

  expect(ids).toEqual(['inicio', 'servicios', 'menu', 'como-funciona', 'galeria', 'contacto']);
  const anchors = new Set(tags(html, 'a').map((a) => a.href).filter((href) => href.startsWith('#') && href.length > 1));
  for (const anchor of anchors) {
    expect(html).toContain(`id="${anchor.slice(1)}"`);
  }
});

test('solo la foto del hero carga sin lazy; todas tienen alt, ancho y alto', async () => {
  const imgs = tags(await render(Index), 'img');

  expect(imgs.length).toBe(1 + 4 + 6 + 6);
  expect(imgs.filter((img) => img.loading !== 'lazy')).toHaveLength(1);
  for (const img of imgs) {
    expect(img.src.startsWith('https://images.unsplash.com/photo-')).toBe(true);
    expect(img.alt).toBeTruthy();
    expect(img.width).toBeTruthy();
    expect(img.height).toBeTruthy();
  }
});

test('un solo h1', async () => {
  expect(tags(await render(Index), 'h1')).toHaveLength(1);
});
