# ADR-016: Integrar apps/mobile al workspace real de pnpm

**Estado:** Aceptado
**Fecha:** 2026-07-21
**Relacionado:** corrige una violación de ADR-007 descubierta al depurar un
crash de versión de React en Android

## Contexto

Al depurar un crash de la app móvil ("Incompatible React versions: react
19.2.7 vs react-native-renderer 19.2.3"), se descubrió que **`apps/mobile`
nunca fue miembro real del workspace de pnpm**: `pnpm-workspace.yaml` no
tiene una entrada `packages:` que lo incluya. Tiene su propio `package.json`
solo para que Nx lo reconozca como proyecto, pero `pnpm install` en la raíz
del monorepo nunca lo toca.

Consecuencia real: cada vez que se corre `npx expo install` (o cualquier
variante) dentro de `apps/mobile`, Expo CLI cae a **npm por debajo**, con
un `node_modules` propio y desconectado del resto del monorepo. Varias
dependencias en `apps/mobile/package.json` estaban además fijadas como `*`
(comodín) — bajo npm eso significa "lo más reciente disponible al momento
de instalar", sin ninguna relación con lo que `react-native@0.85.3`
realmente necesita internamente (su `reconcilerVersion` viene compilado y
fijo desde que Meta publicó esa versión).

Esto contradice directamente **ADR-007**, que fijó pnpm como único gestor
de paquetes de todo el monorepo. El fix inmediato (fijar versiones exactas
a mano) resuelve el síntoma de hoy, pero no cierra la puerta a que el mismo
drift vuelva a ocurrir la próxima vez que alguien instale algo nuevo en
`apps/mobile`.

## Decisión

Se agrega `apps/mobile` como miembro real de `pnpm-workspace.yaml`. Todo el
monorepo —incluyendo mobile— se instala desde un único `pnpm-lock.yaml`,
sin `node_modules` ni `package-lock.json` propios y desconectados.

## Justificación

- Cierra el mecanismo de drift de raíz, no solo el síntoma puntual de hoy.
- Restaura el cumplimiento real de ADR-007 en las tres apps del monorepo,
  no solo en dos de tres.
- Evita mantener dos fuentes de verdad de dependencias (`pnpm-lock.yaml` en
  la raíz y un `package-lock.json` de npm dentro de `apps/mobile`), que es
  justo el tipo de inconsistencia silenciosa que causó este bug.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Commitear `package-lock.json` y aceptar npm como gestor paralelo para mobile | Perpetúa la violación de ADR-007; dos gestores de paquetes en el mismo monorepo es exactamente el tipo de inconsistencia que ya causó este bug una vez |
| Solo fijar versiones exactas a mano (como se hizo hoy) sin cambiar el workspace | Corrige el síntoma, no la causa — el mismo drift puede repetirse en la próxima instalación |

## Consecuencias

- `pnpm-workspace.yaml` incluye `apps/mobile` en su lista de `packages`.
- Se elimina `apps/mobile/node_modules` y cualquier `package-lock.json`
  generado por npm; se reinstala todo vía `pnpm install` desde la raíz.
- Las dependencias de `apps/mobile/package.json` fijadas como `*` deben
  quedar con versiones explícitas (ya corregido durante el fix del bug de
  React) — esto se mantiene, ahora reforzado por vivir dentro del
  workspace de pnpm en vez de depender de disciplina manual.
- README actualizado: ya no se instala nada dentro de `apps/mobile` por
  separado; `pnpm install` en la raíz cubre las tres apps.
