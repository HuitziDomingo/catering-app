# ADR-002: Arquitectura MCP — Servidor Propio vs. Consumidor Externo

**Estado:** Aceptado
**Fecha:** 2026-07-14

## Contexto

El sistema necesita que clientes hagan pedidos (React Native), que operadores
gestionen menú y precios (Angular), y que un **chatbot de soporte** dentro de
la app pueda consultar pedidos en lenguaje natural. Además, uno de los objetivos
personales del proyecto es aprender a diseñar arquitecturas MCP a profundidad
como base para una transición a AI Architect.

MCP (Model Context Protocol) es el estándar para exponer datos y acciones de un
sistema a agentes de IA de forma estructurada.

## Decisión

El backend NestJS implementa un **servidor MCP propio** que expone el dominio
del catering como recursos y tools. El primer cliente de este servidor es un
**chatbot de soporte** embebido en la app (React Native + Angular).

## Justificación

- Ser el proveedor de datos (servidor) enseña el diseño del contrato entre
  dominio y agentes — es el trabajo central de un AI Architect.
- Consumir MCPs externos (pagos, mapas, etc.) es un paso natural posterior y no
  requiere entender primero cómo exponer un servidor propio.
- Un chatbot de soporte es un caso de uso acotado y medible para validar el
  ciclo completo: recurso → tool → invocación → respuesta.

## Diseño inicial

- **Recursos expuestos:** `MenuItems`, `Orders`, `Users` (acceso limitado por rol).
- **Primera tool:** `consultarPedidosPorCliente(clienteId)` — el chatbot la
  invoca cuando un cliente pregunta por el estado de su pedido.
- **Autenticación:** token JWT por cliente MCP; permisos por tool (RBAC).
- **Auditoría:** cada invocación se registra en la tabla `mcp_tool_logs`
  (ver ADR-006) — tool, quién invocó, parámetros, resultado, timestamp.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Consumir solo MCPs externos | No enseña a diseñar un servidor MCP propio; aprendizaje insuficiente para la meta de AI Architect |
| Sin MCP, solo REST + WebSockets | Se pierde la oportunidad de un sistema "agent-native" desde el inicio; integrar agentes después sería un hack |
| Servidor MCP como servicio separado (fuera de NestJS) | Complejidad operativa extra (otro Docker, otro deploy) sin necesidad en esta etapa |

## Próximos pasos

1. Definir el esquema completo de tools (inputs, outputs, errores).
2. Implementar el servidor MCP en NestJS (`@modelcontextprotocol/sdk`).
3. Escribir tests: agente de prueba que invoca tools y valida respuestas.
4. Documentar cada tool nueva como adenda a este ADR conforme se agregue.
