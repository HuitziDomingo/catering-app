import { expect, test } from 'vitest';
import CtaBand from '../src/components/CtaBand.astro';
import { WHATSAPP_NUMBER } from '../src/data/site';
import { render, tags, text } from './render';

test('"¿Tienes un evento?" con botón a WhatsApp', async () => {
  const html = await render(CtaBand);
  const whatsapp = tags(html, 'a').filter((a) => a.href.startsWith(`https://wa.me/${WHATSAPP_NUMBER}`));

  expect(text(html)).toContain('¿Tienes un evento?');
  expect(whatsapp).toHaveLength(1);
  expect(whatsapp[0]).toMatchObject({ target: '_blank', rel: 'noopener' });
});

test('badges genéricos "Próximamente" de App Store y Google Play, sin enlaces ni logos', async () => {
  const html = await render(CtaBand);
  const body = text(html);

  expect(body).toContain('Próximamente en App Store');
  expect(body).toContain('Próximamente en Google Play');
  // Solo el botón de WhatsApp es enlace; las tiendas aún no existen.
  expect(tags(html, 'a')).toHaveLength(1);
  expect(tags(html, 'img')).toHaveLength(0);
});
