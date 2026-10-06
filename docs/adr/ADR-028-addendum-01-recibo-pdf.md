# ADR-028 — Addendum 01: recibo PDF implementado (ajustes a la seccion 5 y 6)

**Estado:** Aceptado
**Fecha:** 2026-10-06
**Relacionado:** complementa ADR-028 (no lo reemplaza; ADR-028 no se edita),
ADR-007 (pdfkit), ADR-027 (permisos de `GET /orders/:id`)

## Contexto

Al implementar el `PdfModule` (rama `feat/pdf-receipts`) se ajustaron
cinco puntos de las secciones 5 y 6 de ADR-028. Este addendum los
registra; lo demas de ADR-028 se implemento tal cual.

## Decision

1. **Otro cliente recibe 403, no 404.** ADR-028 pedia 404 para no
   confirmar que el pedido existe, pero `GET /orders/:id` (ADR-027) ya
   responde 403 en el mismo caso: con un 404 solo en el recibo, la
   existencia del pedido se confirmaria igual por el otro endpoint. El
   recibo valida el acceso con el mismo `findByIdForRequester` y responde
   lo mismo. Si algun dia se quiere ocultar la existencia, se cambian los
   dos endpoints juntos.

2. **Cuando hay recibo: `isOrderPaid` (shared-types).** Un pedido tiene
   recibo si esta en `confirmed`, `preparing` o `delivered`, **o** si
   tiene `paidAt` (pago aprobado de Mercado Pago), aunque este
   `cancelled`. ADR-028 solo conservaba el recibo de un cancelado que ya
   lo tenia; con esta regla tambien se puede generar para un pago aprobado
   que llego despues de que el staff cancelo (ADR-027, recordPaymentResult):
   documenta un pago real que hay que reembolsar. La misma funcion decide
   si la app y el dashboard muestran el boton, y si la API genera al vuelo
   o responde 409. La generacion automatica sigue siendo al pasar a
   `confirmed`.

3. **Leyenda:** "Este documento no es un comprobante fiscal (CFDI)." (en
   lugar de "Este comprobante no es una factura fiscal"): no llama
   "comprobante" al propio recibo y nombra el CFDI.

4. **`order_documents.created_at`** en lugar de `generated_at`, por
   consistencia con el resto de las tablas (`created_at` con
   `CreateDateColumn`). Columnas finales: `id`, `order_id`, `type`,
   `storage_key`, `content_type`, `size_bytes`, `created_at`, con el
   indice unico parcial `(order_id, type) WHERE type = 'receipt'` y un
   `CHECK` sobre `type`.

5. **`Cache-Control: private, no-store`** en los objetos del bucket
   `order-documents`. El adaptador S3 subia todo con
   `public, max-age=31536000, immutable` (correcto para las imagenes del
   menu); en un recibo eso permitiria que un proxy o CDN siguiera sirviendo
   el PDF despues de que caduque la URL firmada de 15 minutos.

Ademas, detalles de implementacion que ADR-028 dejaba abiertos:

- **Idempotencia en tres niveles:** se busca la fila antes de generar;
  llamadas simultaneas en el mismo proceso comparten una promesa; entre
  instancias (Cloud Run) el indice unico hace fallar el segundo `INSERT`, y
  ese proceso reutiliza la fila ganadora y borra el PDF que subio.
- **La generacion al confirmar se espera** (no queda en segundo plano):
  Cloud Run reduce la CPU al terminar la respuesta. Su fallo se registra
  con `logger.error` y no se propaga.
- **Variables extra:** `BUSINESS_EMAIL` (opcional) y `BUSINESS_TIMEZONE`
  (default `America/Mexico_City`; las fechas del recibo se muestran en esa
  zona). Si falta `BUSINESS_NAME`, se usa "Santo Sazon".
- **Folio:** los primeros 8 caracteres del id del pedido en mayusculas,
  el mismo prefijo con el que el dashboard muestra el pedido. El recibo
  incluye tambien el id completo.
- **Movil:** el PDF se abre con `expo-web-browser` (`openBrowserAsync`),
  que ya estaba en el Dev Client por Checkout Pro: no hizo falta
  reconstruirlo.

## Consecuencias

- `formatPaymentMethod` pasa de la app movil a shared-types: el recibo y
  la app muestran el mismo nombre del metodo de pago.
- Queda pendiente (fuera de esta rama): adjuntar la URL del recibo al
  WhatsApp de confirmacion (ADR-026) y regenerar un recibo a peticion del
  staff (hoy, si cambian los datos del negocio, los recibos ya generados
  no cambian).
