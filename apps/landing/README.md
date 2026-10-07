# Landing de Santo Sazón

Página pública del catering. Astro + Pico.css (ADR-018), tests con Vitest
(ADR-019). Hoy es un **mockup**: el contenido es de relleno y las fotos son
temporales de Unsplash (ver [IMAGES.md](./IMAGES.md)).

## Levantarla en local

Desde la raíz del monorepo (`pnpm install` una vez):

```bash
pnpm nx serve landing          # desarrollo con recarga: http://localhost:4321
pnpm nx build landing          # genera apps/landing/dist
pnpm nx preview landing        # sirve el build (build + astro preview)
pnpm nx test landing           # tests de Vitest
```

Si el puerto 4321 está ocupado, Astro usa el siguiente libre (4322, …) y lo
muestra en la terminal. Para verla desde el teléfono en la misma red Wi-Fi:
`cd apps/landing && npx astro dev --host` y abre la IP que muestra.

## Dónde cambiar las cosas

| Qué | Dónde |
|---|---|
| Textos, precios, horario, contacto, redes | `src/data/site.ts` |
| Número de WhatsApp (placeholder) | `WHATSAPP_NUMBER` en `src/data/site.ts` |
| Fotos y sus créditos | `photos` en `src/data/site.ts` + `IMAGES.md` |
| Colores, tipografía, botones, animaciones | `src/styles/global.css` (variables `--ss-*`) |
| Cada sección | `src/components/` (Header, Hero, Services, MenuHighlights, HowItWorks, Gallery, CtaBand, Footer) |

## Notas de diseño

- Paleta: crema `#FAF6F0`, terracota `#C65D3B` (acentos) y `#B4502F` (texto y
  botones, para cumplir contraste AA), verde `#2F4A3A`, carbón `#1F1F1F` y
  dorado `#D9B26A` (solo sobre fondos oscuros).
- Tipografía: Fraunces (títulos) y DM Sans (texto), desde Google Fonts.
- Animaciones al hacer scroll solo con CSS (`animation-timeline: view()`); con
  `prefers-reduced-motion` o en navegadores sin soporte, el contenido aparece
  sin animación.
- Sin testimonios inventados: la galería tiene un espacio marcado para
  opiniones reales.
