# ADR-018: Astro con Pico.css para la landing page

**Estado:** Aceptado
**Fecha:** 2026-07-22

## Contexto

Se necesita una landing page publica (dominio.com) separada del dashboard
(app.dominio.com / dashboard.dominio.com, Angular) y de la app movil,
segun lo ya decidido: framework propio, sin heredar estilos de las otras
apps (branding pendiente de que los hermanos del negocio lo definan).

Ya se decidio Astro como framework (por su salida estatica por defecto,
sin JavaScript enviado al navegador salvo donde se pida explicitamente) en
vez de Next.js/Chakra UI o Angular Universal, dado que la landing es
mayormente estatica (hero, botones de descarga iOS/Android, QR, link al
dashboard). Faltaba decidir la libreria de estilos.

Se descarto Tailwind por preferencia personal del desarrollador. Se
compararon Bulma y Pico.css como alternativas ligeras.

## Decision

Se usa **Pico.css** para el estilo de la landing.

## Justificacion

- Es "classless": se aplica sobre HTML semantico normal, sin llenar el
  markup de clases utilitarias (a diferencia de Bulma, que si es
  basado en clases, similar en uso a Bootstrap solo que mas ligero).
- Coherente con la filosofia de Astro elegida en la decision anterior:
  minimo JavaScript, minimo peso, maxima velocidad de carga.
- Pesa una fraccion de Bulma; para una landing de pocas secciones no se
  necesita un sistema de componentes completo.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| Bulma | Mas pesado que Pico.css; requiere clases utilitarias en el markup, mas cercano en uso a Bootstrap |
| Tailwind | Descartado por preferencia personal del desarrollador |

## Consecuencias

- apps/landing/ se crea con Astro, usando el generador de Nx si esta
  disponible y mantenido, o scaffold manual si no.
- Pico.css se importa como hoja de estilos global, sin build step
  adicional de CSS (no requiere PostCSS/Tailwind config).
- El branding real (colores, isotipo) se aplicara despues, cuando los
  hermanos del negocio lo entreguen; por ahora la landing usa los
  estilos por defecto de Pico.css como base funcional.
