# ADR-028: Almacenamiento de archivos (imagenes del menu y recibos PDF)

**Estado:** Aceptado
**Fecha:** 2026-10-05
**Relacionado:** ADR-001/ADR-010 (Supabase solo como hosting), ADR-006
(`menu_items.image_url`, `order_documents`), ADR-007 (pdfkit), ADR-014
(Docker Compose en desarrollo), ADR-024/ADR-027 (pago confirmado),
ADR-026 (WhatsApp adjuntara la URL del recibo)

## Contexto

`menu_items.image_url` existe desde ADR-006 y los DTOs aceptan
`imageUrl`, pero no hay donde guardar archivos: no existe endpoint de
subida y todos los platillos muestran un icono generico. Tambien falta el
recibo PDF del pedido (`PdfModule`, ADR-007) y la tabla `order_documents`
(ADR-006), que necesitan el mismo tipo de almacenamiento.

Los dos casos tienen necesidades opuestas:

| | Imagenes del menu | Recibos PDF |
|---|---|---|
| Quien lee | Cualquiera (el menu es publico) | Solo el cliente dueno y el staff |
| Frecuencia de lectura | Muy alta (cada visita al menu) | Baja |
| Cacheable | Si, indefinidamente | No conviene una URL permanente |
| Datos personales | No | Si (nombre, telefono, montos) |

Restricciones del proyecto: la API corre en Cloud Run (CPU/memoria por
uso, ADR-007), sin disco persistente; la base de produccion ya esta en
Supabase; en desarrollo todo debe levantarse con `docker compose up`
(ADR-014) sin tocar recursos reales.

## Decision

### 1. Proveedor: Supabase Storage en produccion, SeaweedFS en desarrollo

- **Produccion/staging:** Supabase Storage del mismo proyecto que ya
  hospeda Postgres. Igual que con la base, Supabase es solo hosting: la
  API accede con una credencial de servidor y **nunca** se usa Supabase
  Auth ni las politicas RLS de Storage para usuarios finales (ADR-010).
  Los permisos los decide NestJS.
- **Desarrollo local:** un servicio `storage` con **SeaweedFS** (S3
  compatible, Apache 2.0) en `docker-compose.yml`, mas un contenedor
  `storage-init` que crea los dos buckets. Los permisos estan en
  `docker/seaweedfs/s3.json`: la credencial de la API lee y escribe todo;
  el acceso anonimo solo puede leer `menu-images`.
- **Por que no MinIO** (la opcion obvia, y la de la primera version de
  este ADR): MinIO dejo de publicar imagenes de Docker de su edicion
  comunitaria; `minio/minio` y `quay.io/minio/minio` ya no se pueden
  descargar, y las de Bitnami quedaron congeladas sin actualizaciones.
  SeaweedFS se mantiene activo, tiene imagen oficial y cubre lo que
  necesitamos (buckets, lectura anonima por bucket, URLs prefirmadas),
  verificado con el SDK de AWS antes de elegirlo.

### 2. Una sola implementacion via el protocolo S3

La API define un puerto `StorageService` (`apps/api/src/storage/`) con
operaciones minimas: `putObject`, `deleteObject`, `getPublicUrl` y
`getSignedUrl`. Hay **un solo adaptador**, basado en `@aws-sdk/client-s3`
+ `@aws-sdk/s3-request-presigner`, que habla con:

- SeaweedFS en local (`STORAGE_ENDPOINT=http://localhost:8333`), y
- el endpoint S3 de Supabase Storage en produccion
  (`https://<ref>.supabase.co/storage/v1/s3`, con access keys S3 que se
  generan en el panel de Supabase).

Asi el codigo que corre en desarrollo es el mismo que corre en
produccion; solo cambian variables de entorno. Si el proveedor cambia
(GCS, R2, S3), se cambian variables, no codigo.

**Pendiente de verificar en staging** contra el proyecto real de
Supabase: subida, borrado y URL prefirmada via el endpoint S3. En local
todo se prueba contra SeaweedFS.

**Plan B si la URL prefirmada no funciona en Supabase:** solo
`getSignedUrl` cambia de implementacion. Se agrega
`@supabase/supabase-js` y un adaptador que firma con
`storage.from(bucket).createSignedUrl(key, expiresIn)`, usando
`SUPABASE_URL` + la `service_role` key (solo en el servidor, nunca en
clientes). Subida y borrado siguen por S3. El puerto `StorageService` no
cambia, asi que ni los recibos ni los controllers se tocan. Se documenta
en un addendum de este ADR.

### 3. Dos buckets

| Bucket | Acceso | Contenido | Llave del objeto |
|---|---|---|---|
| `menu-images` | Lectura publica, escritura solo la API | Imagenes de platillos ya procesadas | `menu-items/<menuItemId>/<uuid>.webp` |
| `order-documents` | Privado | Recibos PDF (y a futuro reportes semanales/mensuales, ADR-006) | `receipts/<orderId>/<uuid>.pdf` |

- La llave lleva un uuid nuevo en cada subida: una imagen reemplazada
  tiene URL distinta, asi que los caches (navegador, `expo-image`) nunca
  muestran la vieja y no hace falta invalidar nada.
- Los recibos se entregan con **URL firmada de corta duracion**
  (15 minutos) que genera la API solo despues de verificar permisos.

### 4. Imagenes del menu

- `POST /menu/items/:id/image` (multipart, campo `image`) y
  `DELETE /menu/items/:id/image`, ambos solo staff/admin/superadmin.
- Validacion: maximo 5 MB, y el formato se verifica por el contenido
  (`sharp(...).metadata()`), no por la extension ni el `Content-Type`
  enviado: solo jpeg, png y webp, de hasta 40 megapixeles (un PNG de
  pocos MB puede declarar dimensiones enormes y agotar la memoria al
  decodificarlo). Fuera de eso, 400 (413 si excede el tamano).
- Procesado con `sharp`: respeta la orientacion EXIF, quita metadatos
  (incluida la ubicacion GPS de fotos de celular), redimensiona a un
  maximo de 1200 px por lado sin agrandar, y convierte a webp (calidad
  ~80).
- **La base guarda la llave, no la URL.** La columna `menu_items.image_url`
  de ADR-006 se renombra a `image_key` (hoy ningun platillo tiene imagen,
  asi que no hay datos que migrar). La API arma `imageUrl` en cada
  respuesta con `STORAGE_PUBLIC_URL` + `/` + bucket + `/` + llave. Asi,
  cambiar el host publico (otra IP de Wi-Fi en desarrollo, un CDN o un
  dominio propio en produccion) es cambiar una variable, sin reescribir
  filas. Las respuestas siguen exponiendo `imageUrl`; la llave nunca sale
  de la API.
- **Solo se puede poner una imagen subiendola:** `imageUrl` se quita de
  `POST /menu/items` y `PATCH /menu/items/:id` (y de sus tipos en
  shared-types). Si se manda, el `ValidationPipe` (`whitelist`) lo
  descarta. Un platillo nuevo se crea sin imagen y se le sube despues.
- Al reemplazar o quitar, se borra el objeto anterior. Si el borrado
  falla, se registra un warning y no se revierte la operacion: un objeto
  huerfano es preferible a un platillo sin imagen.

### 5. Recibos PDF

- **Cuando:** al pasar el pedido a `confirmed`, por cualquier camino
  (webhook de pago aprobado o `pending -> confirmed` manual por
  transferencia/efectivo, ADR-027). Antes de confirmar no hay pago que
  documentar. La generacion corre despues de guardar el cambio de status
  y su fallo **no** revierte la confirmacion ni hace fallar el webhook
  (mismo criterio que ADR-027 para no provocar reintentos infinitos de
  Mercado Pago): se registra el error.
- **Respaldo perezoso:** `GET /orders/:id/receipt` genera el recibo si
  el pedido ya esta confirmado (o en un estado posterior) y todavia no lo
  tiene. Asi un fallo puntual se recupera solo, y los pedidos confirmados
  antes de esta rama tambien obtienen recibo.
- `GET /orders/:id/receipt` responde `{ url, expiresAt }`. Permisos:
  el cliente dueno del pedido o staff/admin/superadmin; otro cliente
  recibe 404 (no se confirma que el pedido existe). Un pedido `pending`
  o `payment_failed` responde 409.
- Un pedido `cancelled` que tenia recibo lo conserva: el pago existio y
  el recibo es parte del rastro para el reembolso manual.
- `PdfModule` con pdfkit (ADR-007), sin navegador headless.

Datos del negocio en el recibo, por variables de entorno (no por
codigo, para no recompilar si cambian): `BUSINESS_NAME` (el negocio es
"Santo Sazon"), `BUSINESS_PHONE`, `BUSINESS_ADDRESS` y `BUSINESS_RFC`
(opcional: si falta, el recibo no muestra la linea). El PDF incluye
siempre la leyenda "Este comprobante no es una factura fiscal": no es
un CFDI.

### 6. Tabla `order_documents`

Se implementa la tabla de ADR-006 con un cambio: en vez de `file_url`
guarda `storage_key`. Una URL firmada caduca, asi que guardarla no sirve;
la llave permite generar una nueva cada vez y no ata la base a un host.

Columnas: `id` (uuid), `order_id` (FK nullable, ADR-006), `type`
(`receipt` / `weekly_report` / `monthly_report`), `storage_key`,
`content_type`, `size_bytes`, `generated_at`. Indice unico parcial en
`(order_id, type)` donde `type = 'receipt'`: un recibo por pedido, y una
generacion concurrente (webhook duplicado + GET) no crea dos.

### 7. Variables de entorno nuevas (`apps/api/.env`)

| Variable | Para que |
|---|---|
| `STORAGE_ENDPOINT` | Endpoint S3 que usa **la API** para subir, borrar y firmar. |
| `STORAGE_PUBLIC_URL` | Base de las URLs que reciben **los clientes** (imagenes y URLs firmadas). Independiente de `STORAGE_ENDPOINT`. |
| `STORAGE_SIGNED_URL_ENDPOINT` | Opcional. Host con el que se firman las URLs de recibos. Default: `STORAGE_PUBLIC_URL`. |
| `STORAGE_REGION` | Region S3 (SeaweedFS acepta cualquiera; Supabase usa la de su proyecto). |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | Credenciales S3. Secretas en produccion. |
| `STORAGE_FORCE_PATH_STYLE` | `true` para SeaweedFS y Supabase (URLs `host/bucket/llave`). |
| `STORAGE_MENU_IMAGES_BUCKET` / `STORAGE_DOCUMENTS_BUCKET` | Nombres de los buckets (`menu-images`, `order-documents`). |
| `BUSINESS_NAME`, `BUSINESS_PHONE`, `BUSINESS_ADDRESS`, `BUSINESS_RFC` | Datos del negocio en el recibo (seccion 5). |

En `.env.example` solo van los valores del SeaweedFS local (que no son
secretos) y marcadores para produccion.

#### Por que dos URLs distintas

La API y los clientes no ven la red igual. La API corre en la Mac y
llega a SeaweedFS por `localhost:8333`; un telefono no: para el, `localhost`
es el propio telefono. Por eso `STORAGE_ENDPOINT` (lo que usa la API) y
`STORAGE_PUBLIC_URL` (lo que se manda a los clientes) se configuran por
separado.

Las URLs firmadas tambien deben llevar un host que el cliente alcance.
La firma S3 incluye el header `Host`, asi que la API firma con un
cliente S3 configurado con ese host (firmar es un calculo local, no hace
ninguna llamada de red): `STORAGE_SIGNED_URL_ENDPOINT`, que por defecto
es `STORAGE_PUBLIC_URL`. En SeaweedFS coinciden (mismo servidor, mismas
rutas `host/bucket/llave`); en Supabase no (ver produccion).

#### Como configurarlo en desarrollo

`STORAGE_ENDPOINT=http://localhost:8333` en todos los casos (la API corre
en la Mac). Lo que cambia es `STORAGE_PUBLIC_URL`, segun donde se pruebe:

| Donde se prueba | `STORAGE_PUBLIC_URL` | Notas |
|---|---|---|
| Dashboard en el navegador de la Mac / simulador de iOS | `http://localhost:8333` | El simulador comparte la red de la Mac. |
| Emulador de Android | `http://localhost:8333` + `adb reverse tcp:8333 tcp:8333` | O `http://10.0.2.2:8333` sin `adb reverse`, pero entonces el dashboard de la Mac no ve las imagenes. |
| Telefono fisico por Wi-Fi | `http://<IP de la Mac en la red>:8333` (ej. `http://192.168.1.68:8333`) | El telefono y la Mac en la misma red. La Mac debe permitir conexiones entrantes al puerto 8333 (firewall de macOS). El dashboard de la Mac tambien funciona con esa IP. |

Como la base guarda llaves y no URLs, cambiar `STORAGE_PUBLIC_URL` (por
ejemplo, si el router asigna otra IP) solo requiere reiniciar la API: las
imagenes ya subidas siguen funcionando.

Android bloquea HTTP sin TLS por defecto en builds de produccion; en el
Dev Client de desarrollo esta permitido. En produccion las URLs son
HTTPS.

#### En produccion

- `STORAGE_ENDPOINT=https://<ref>.supabase.co/storage/v1/s3`
- `STORAGE_PUBLIC_URL=https://<ref>.supabase.co/storage/v1/object/public`
  (o un CDN/dominio propio delante)
- `STORAGE_SIGNED_URL_ENDPOINT=https://<ref>.supabase.co/storage/v1/s3`:
  el endpoint S3 de Supabase ya es publico, y es el que entiende URLs
  prefirmadas S3, no la ruta `/object/public`. Esta es la parte que se
  verifica en staging (ver plan B en la seccion 2).

## Justificacion

- Supabase Storage no agrega un proveedor nuevo: la cuenta, la
  facturacion y el respaldo ya existen por Postgres.
- Bucket publico para imagenes: es contenido publico de alta lectura;
  servirlo directo del almacenamiento (con CDN) evita que cada imagen
  pase por Cloud Run, que cobra por uso.
- Bucket privado + URL firmada para recibos: contienen datos personales.
  La URL firmada permite abrir el PDF en el navegador del sistema desde
  la app (que no puede mandar el header `Authorization`) sin hacer
  publico el archivo, y caduca si se comparte por error.
- Protocolo S3 con SeaweedFS local: el desarrollo usa el mismo codigo que
  produccion, se levanta con un contenedor ligero, y no necesita
  internet ni credenciales reales.
- Procesar en la API con sharp: el movil nunca descarga fotos de varios
  MB, y se eliminan metadatos sensibles antes de publicar.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| `@supabase/supabase-js` + `supabase start` en local | `supabase start` levanta todo el stack de Supabase (Auth, Realtime, Studio, su propio Postgres): pesado, choca con el Postgres de ADR-014 y arrastra Supabase Auth, que ADR-010 descarto. Usar supabase-js en produccion y otra cosa en local dejaria el camino de produccion sin probar en desarrollo |
| Google Cloud Storage (la API ya corre en GCP) | Buena opcion tecnica, pero agrega un proveedor y credenciales mas cuando Supabase ya esta contratado; con el puerto S3 se puede migrar despues sin tocar codigo de negocio |
| Disco local del contenedor | Cloud Run no tiene disco persistente: los archivos se pierden en cada despliegue o reinicio |
| Guardar archivos en Postgres (`bytea`) | Infla la base y los respaldos, y cada imagen pasaria por la API en cada lectura |
| Servir el PDF por la API (stream con JWT) en vez de URL firmada | La app movil abre el PDF en el navegador del sistema, que no manda el header `Authorization`; habria que descargarlo a disco primero. Ademas cada lectura pasaria por Cloud Run |
| Bucket publico tambien para recibos (URL no adivinable) | Una URL permanente con datos personales; si se filtra, no caduca |
| Generar el recibo al crear el pedido | El pedido `pending` aun no esta pagado ni aceptado: el recibo seria de algo que puede no pasar, y habria que regenerarlo al confirmar |

## Consecuencias

- Nuevo `StorageModule` (puerto + adaptador S3) y `PdfModule` en
  `apps/api`. Dependencias nuevas: `sharp`, `pdfkit`, `@aws-sdk/client-s3`,
  `@aws-sdk/s3-request-presigner`. `sharp` es binario nativo: la imagen
  de `apps/api/Dockerfile` (`node:22-slim`, glibc, amd64) lo soporta sin
  cambios.
- `docker-compose.yml` gana `storage` (SeaweedFS, puerto 8333) y
  `storage-init` (crea los buckets y termina).
- Migracion nueva para `order_documents`.
- Desarrollo en dispositivos: hay que poner `STORAGE_PUBLIC_URL` segun
  la tabla de la seccion 7 (simulador, emulador o telefono fisico).
- ADR-006: `menu_items.image_url` pasa a ser `image_key` (migracion de
  renombre). `imageUrl` deja de aceptarse al crear o editar un platillo.
- Movil: `expo-image` es modulo nativo, asi que hay que reconstruir el
  Dev Client (`npx expo prebuild` + `npx expo run:ios`/Android) despues
  de instalarlo (ADR-015).
- Produccion requiere, una sola vez: crear los dos buckets en Supabase
  (`menu-images` publico, `order-documents` privado), generar las access
  keys S3 y cargarlas como variables de Cloud Run.
- ADR-026: el WhatsApp de confirmacion podra incluir una URL firmada del
  recibo; como caduca, se generara al momento del envio (fuera de esta
  rama).
