import { expect, test } from 'vitest';
import Header from '../src/components/Header.astro';
import { nav, whatsappLink } from '../src/data/site';
import { render, tags, text } from './render';

test('navega a las cuatro secciones, en escritorio y en móvil', async () => {
  const html = await render(Header);
  const hrefs = tags(html, 'a').map((a) => a.href);

  expect(nav.map((item) => item.label)).toEqual(['Servicios', 'Menú', 'Cómo funciona', 'Contacto']);
  for (const item of nav) {
    expect(hrefs.filter((href) => href === item.href)).toHaveLength(2);
  }
  expect(tags(html, 'nav').map((n) => n['aria-label'])).toEqual(['Principal', 'Principal (móvil)']);
});

test('"Haz tu pedido" abre WhatsApp en otra pestaña', async () => {
  const html = await render(Header);
  const ctas = tags(html, 'a').filter((a) => a.href === whatsappLink());

  expect(text(html)).toContain('Haz tu pedido');
  expect(ctas).toHaveLength(2);
  for (const cta of ctas) {
    expect(cta.target).toBe('_blank');
    expect(cta.rel).toContain('noopener');
  }
});

test('el logo es texto "Santo Sazón" y el menú móvil tiene nombre accesible', async () => {
  const html = await render(Header);

  expect(text(html)).toContain('Santo Sazón');
  expect(tags(html, 'summary')[0]['aria-label']).toBe('Abrir menú');
});
