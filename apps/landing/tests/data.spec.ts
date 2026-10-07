import { describe, expect, test } from 'vitest';
import { allPhotos, photoSrcset, photoUrl, photos, WHATSAPP_NUMBER, whatsappLink } from '../src/data/site';

describe('whatsappLink', () => {
  test('apunta a wa.me con el número de la constante y el mensaje codificado', () => {
    const link = new URL(whatsappLink('Hola, ¿tienen fecha?'));

    expect(link.origin).toBe('https://wa.me');
    expect(link.pathname).toBe(`/${WHATSAPP_NUMBER}`);
    expect(link.searchParams.get('text')).toBe('Hola, ¿tienen fecha?');
  });

  test('el número es solo dígitos con código de país (formato de wa.me)', () => {
    expect(WHATSAPP_NUMBER).toMatch(/^52\d{10}$/);
  });
});

describe('fotos', () => {
  test('photoUrl arma una URL de images.unsplash.com recortada', () => {
    const url = new URL(photoUrl(photos.heroTable, 1600, 900));

    expect(url.origin).toBe('https://images.unsplash.com');
    expect(url.pathname).toBe(`/photo-${photos.heroTable.id}`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      auto: 'format',
      fit: 'crop',
      w: '1600',
      h: '900',
      q: '80',
    });
  });

  test('photoSrcset lista cada ancho con su descriptor', () => {
    expect(photoSrcset(photos.heroTable, [400, 800], 0.75).split(', ')).toEqual([
      `${photoUrl(photos.heroTable, 400, 300)} 400w`,
      `${photoUrl(photos.heroTable, 800, 600)} 800w`,
    ]);
  });

  test('cada foto tiene alt en español, autor y usuario para los créditos', () => {
    for (const photo of allPhotos) {
      expect(photo.alt.length).toBeGreaterThan(15);
      expect(photo.author).not.toBe('');
      expect(photo.username).toMatch(/^[\w.]+$/);
    }
  });

  test('no hay fotos repetidas', () => {
    const ids = allPhotos.map((photo) => photo.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
