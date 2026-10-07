import { expect, test } from 'vitest';
import Footer from '../src/components/Footer.astro';
import { allPhotos, business } from '../src/data/site';
import { render, tags, text } from './render';

test('contacto, horario y redes, y es el destino de "Contacto"', async () => {
  const html = await render(Footer);
  const body = text(html);

  expect(tags(html, 'footer')[0].id).toBe('contacto');
  expect(body).toContain(business.email);
  expect(body).toContain(business.phone);
  for (const h of business.hours) {
    expect(body).toContain(h.days);
  }
  for (const s of business.social) {
    expect(body).toContain(s.name);
  }
});

test('da crédito a cada fotógrafo, con enlace a su perfil de Unsplash', async () => {
  const html = await render(Footer);
  const hrefs = tags(html, 'a').map((a) => a.href);

  expect(text(html)).toMatch(/Fotos temporales/);
  for (const photo of allPhotos) {
    expect(text(html)).toContain(photo.author);
    expect(hrefs.some((href) => href.startsWith(`https://unsplash.com/@${photo.username}?`))).toBe(true);
  }
});
