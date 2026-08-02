# ADR-023: Tool MCP crear_pedido (creacion de pedidos via chat)

**Estado:** Aceptado
**Fecha:** 2026-07-28

## Contexto

El chat de mobile (ADR-020, servidor MCP de ADR-002) hoy solo puede
*consultar* pedidos existentes via `consultar_pedidos_por_cliente`. Se
quiere que un cliente pueda *crear* un pedido escribiendo algo como
"puedes pedirme una orden de catering de chilaquiles para 400 personas
en 4 dias para el desayuno".

El chat actual no tiene integracion real de LLM (es pattern-based:
heuristica de palabras clave, ver el chat feature ya implementado) — una
interpretacion de lenguaje natural completa (fechas relativas, cantidad,
nombre de platillo con errores de escritura, etc.) es trabajo de
NLU/LLM real, fuera de alcance de esta tool en su v1.

## Decision

Se agrega una tool MCP nueva, `crear_pedido`, con un input **estructurado**
(no texto libre) que el cliente movil llena mediante extraccion basica de
patrones (regex/keywords) del mensaje del usuario — no NLU real todavia.
La tool en si es la misma sin importar quien la invoque (un chat con
mejor NLU en el futuro podria llenar el mismo input de forma mas
inteligente sin cambiar el servidor).

### Input de la tool

```
{
  items: [{ menuItemId: string, quantity: number }],
  peopleCount: number,
  scheduledFor: string (fecha ISO, debe ser futura),
  notes?: string
}
```

`customerId` se toma del JWT autenticado (mismo patron de seguridad que
`consultar_pedidos_por_cliente`), nunca del input.

### Validacion en el servidor (reutiliza OrdersService.createOrder)

- Cada `menuItemId` debe existir y estar activo (ya implementado en
  OrdersService).
- `peopleCount` debe caer dentro del rango `serves_min`/`serves_max` de
  al menos uno de los items pedidos, o el pedido se marca para revision
  manual del negocio en vez de rechazarse (un catering real puede ajustar
  cantidades) — a definir el comportamiento exacto al implementar, este
  ADR fija el contrato de input/output, no cada regla de negocio fina.
- `scheduledFor` debe ser una fecha futura.

### Extraccion en el cliente (mobile, v1 basica)

- Nombre de platillo: coincidencia simple contra los nombres de
  `menu_items` ya cargados en el store (no fuzzy matching sofisticado en
  v1).
- Cantidad de personas: extraccion de numero + palabra "persona(s)" via
  regex.
- Fecha: soporte basico de expresiones relativas comunes en espanol ("en
  4 dias", "manana", fecha explicita) — libreria de parseo de fechas en
  espanol si ya existe una ligera adecuada, en vez de escribir un parser
  a mano.
- Si la extraccion falla o es ambigua, el chat responde pidiendo
  aclaracion al usuario en vez de adivinar y crear un pedido incorrecto.

## Justificacion

- Reutiliza toda la logica ya construida y probada de `OrdersService`
  (snapshot de precio, transaccion, validacion) — la tool MCP es una
  capa fina sobre codigo ya confiable, no una reimplementacion.
- Mantiene la extraccion de lenguaje natural en el cliente (mas facil de
  iterar sin tocar el servidor) mientras el contrato de la tool
  permanece estable.
- Input estructurado en vez de texto libre en el servidor evita que la
  tool tenga que hacer NLU por su cuenta — separacion clara de
  responsabilidades.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| La tool acepta texto libre y hace su propio NLU en el servidor | Requeriria integrar un LLM dentro del servidor MCP mismo; mucho mayor alcance que lo necesario para v1 |
| Sin confirmacion, crear el pedido directo de la primera interpretacion | Riesgoso — un catering para 400 personas mal interpretado es un error costoso para el negocio, mejor pedir confirmacion cuando hay ambiguedad |

## Consecuencias

- Nueva tool en apps/api/src/mcp/tools/crear-pedido.tool.ts, siguiendo
  el mismo patron de registro que consultar_pedidos_por_cliente.
- El chat de mobile agrega un boton de "Confirmar pedido" antes de
  invocar la tool, mostrando el resumen interpretado (platillo,
  cantidad, fecha) para que el cliente confirme antes de que se cree
  algo real.
- Pantalla de pago (ADR-022, Mercado Pago) es un paso posterior,
  independiente de esta tool.
