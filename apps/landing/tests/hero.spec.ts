import { expect, test } from 'vitest';
import Hero from '../src/components/Hero.astro';
import { photos, whatsappLink } from '../src/data/site';
import { render, tags, text } from './render';

test('título fuerte y los dos botones: "Ver menú" y "Pedir por WhatsApp"', async () => {
  const html = await render(Hero);
  const links = tags(html, 'a');

  expect(tags(html, 'h1')).toHaveLength(1);
  expect(text(html)).toContain('Ver menú');
  expect(text(html)).toContain('Pedir por WhatsApp');
  expect(links.find((a) => a.href === '#menu')).toBeDefined();
  expect(links.find((a) => a.href === whatsappLink())).toMatchObject({ target: '_blank' });
});

test('la foto del hero carga de inmediato (sin lazy), con tamaño y alt', async () => {
  const [img] = tags(await render(Hero), 'img');

  expect(img.loading).toBeUndefined();
  expect(img.fetchpriority).toBe('high');
  expect(img).toMatchObject({ width: '1600', height: '1000', alt: photos.heroTable.alt });
  expect(img.src).toContain(photos.heroTable.id);
  expect(img.srcset.split(', ')).toHaveLength(5);
});
