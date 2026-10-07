import { expect, test } from 'vitest';
import HowItWorks from '../src/components/HowItWorks.astro';
import { steps } from '../src/data/site';
import { render, tags, text } from './render';

test('tres pasos en orden, como funciona la app: app, Mercado Pago, WhatsApp', async () => {
  const html = await render(HowItWorks);

  expect(steps.map((s) => s.title)).toEqual([
    'Eliges en la app',
    'Pagas seguro con Mercado Pago',
    'Recibes confirmación por WhatsApp',
  ]);
  expect(tags(html, 'ol')).toHaveLength(1);
  expect(tags(html, 'li')).toHaveLength(3);
  expect(text(html)).toContain('te enviamos tu recibo');
});

test('es el destino de "Cómo funciona" (#como-funciona)', async () => {
  expect(tags(await render(HowItWorks), 'section')[0].id).toBe('como-funciona');
});
