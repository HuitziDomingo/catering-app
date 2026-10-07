import { expect, test } from 'vitest';
import Services from '../src/components/Services.astro';
import { services } from '../src/data/site';
import { render, tags, text } from './render';

test('cuatro servicios, cada uno con foto lazy, tamaño y alt', async () => {
  const html = await render(Services);
  const imgs = tags(html, 'img');

  expect(services.map((s) => s.title)).toEqual(['Eventos sociales', 'Corporativos', 'Bodas', 'Pedidos para llevar']);
  for (const service of services) {
    expect(text(html)).toContain(service.title);
  }
  expect(imgs).toHaveLength(4);
  for (const img of imgs) {
    expect(img).toMatchObject({ loading: 'lazy', width: '640', height: '800' });
    expect(img.alt.length).toBeGreaterThan(15);
  }
});

test('la sección es el destino de "Servicios" en la navegación', async () => {
  const [section] = tags(await render(Services), 'section');
  expect(section.id).toBe('servicios');
});
