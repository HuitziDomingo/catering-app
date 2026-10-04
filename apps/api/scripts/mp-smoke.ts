/**
 * Smoke test end-to-end del flujo de pagos de Mercado Pago (ADR-024), sin el
 * simulador de webhooks del panel de Mercado Pago (que manda un data.id
 * inventado: PaymentsService.processWebhook re-consulta el pago real con
 * payment.get(), así que nunca cambiaría el estado del pedido).
 *
 * Flujo:
 *   1. Registra un cliente desechable (o hace login con SMOKE_EMAIL/SMOKE_PASSWORD).
 *   2. Crea un pedido con el primer platillo activo del menú.
 *   3. Crea un pago REAL en el sandbox de Mercado Pago: tokeniza una tarjeta
 *      de prueba (POST /v1/card_tokens con la public key) y hace
 *      POST /v1/payments con external_reference = orderId.
 *   4. Firma un webhook localmente con MERCADOPAGO_WEBHOOK_SECRET (mismo HMAC
 *      que WebhookSignatureValidator) y lo manda a /payments/webhook.
 *   5. Verifica que el pedido quede en el status esperado.
 *
 * Requiere la API corriendo (pnpm nx serve api) contra Postgres local.
 *
 * NOTA (2026-10-02): con las credenciales de usuario de prueba (APP_USR-…, tag
 * test_user, MLM), el POST /v1/payments directo de los modos APRO/OTHE devuelve
 * 401 "Unauthorized use of live credentials" (code 7), aun con un comprador de
 * prueba como payer. El flujo validado es el manual: modo `checkout` (pagar el
 * init_point en el navegador logueado como comprador de prueba) + modo `webhook`.
 * Así se validaron APRO -> confirmed y OTHE -> payment_failed.
 *
 * Uso (desde la raíz del repo):
 *   pnpm run mp:smoke            # sin argumentos: imprime la ayuda (USAGE) y no llama a la API
 *   pnpm run mp:smoke -- APRO    # pago directo aprobado -> confirmed (hoy 401, ver NOTA)
 *   pnpm run mp:smoke -- OTHE    # pago directo rechazado -> payment_failed (hoy 401, ver NOTA)
 *
 * Modo manual con Checkout Pro (pago real en el navegador con el comprador de prueba):
 *   pnpm run mp:smoke -- checkout
 *     Crea un pedido y su preferencia (POST /payments/preferences), imprime el
 *     orderId, el checkoutUrl (init_point) y las credenciales del cliente, y termina.
 *   SMOKE_EMAIL=… SMOKE_PASSWORD=… pnpm run mp:smoke -- webhook <paymentId> <orderId> <confirmed|payment_failed>
 *     Firma y manda el webhook del pago y verifica el status del pedido. Requiere
 *     las credenciales del dueño del pedido (las imprime el modo checkout).
 *
 * Variables (se leen de apps/api/.env; se pueden sobreescribir por entorno):
 *   MERCADOPAGO_ACCESS_TOKEN     access token de prueba (el mismo que usa la API)
 *   MERCADOPAGO_PUBLIC_KEY       public key de prueba (solo la usa este script)
 *   MERCADOPAGO_WEBHOOK_SECRET   secreto de firma del webhook (el mismo que usa la API)
 *   SMOKE_API_URL                default http://localhost:${PORT ?? 3000}/api
 *   SMOKE_EMAIL / SMOKE_PASSWORD opcional; si faltan se registra un usuario nuevo
 *   SMOKE_PAYER_EMAIL            email de un usuario de prueba COMPRADOR del mismo país
 *                                (payer de los modos APRO/OTHE; ver NOTA arriba).
 */
import { createHmac, randomUUID } from 'crypto';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: resolve(__dirname, '../.env') });

const MP_API = 'https://api.mercadopago.com';
const API_URL =
  process.env.SMOKE_API_URL ??
  `http://localhost:${process.env.PORT ?? 3000}/api`;

type Holder = 'APRO' | 'OTHE';

const EXPECTED_STATUS: Record<Holder, string> = {
  APRO: 'confirmed',
  OTHE: 'payment_failed',
};

/** Tarjeta de prueba Mastercard de México (ver docs de tarjetas de prueba de Mercado Pago). */
const TEST_CARD = {
  card_number: '5474925432670366',
  security_code: '123',
  expiration_month: 11,
  expiration_year: 2030,
  payment_method_id: 'master',
};

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `${key} no está definida (apps/api/.env o variable de entorno).`,
    );
  }
  return value;
}

async function http<T>(
  method: string,
  url: string,
  opts: { body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ status: number; body: T }> {
  const res = await fetch(url, {
    method,
    headers: {
      ...(opts.body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...opts.headers,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    // respuesta no-JSON: se deja como texto
  }
  return { status: res.status, body: body as T };
}

function expectOk<T>(label: string, res: { status: number; body: T }): T {
  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      `${label} falló (HTTP ${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return res.body;
}

interface Session {
  accessToken: string;
  email: string;
  password: string;
}

async function login(email: string, password: string): Promise<Session> {
  const body = expectOk(
    'Login',
    await http<{ accessToken: string }>('POST', `${API_URL}/auth/login`, {
      body: { email, password },
    }),
  );
  return { accessToken: body.accessToken, email, password };
}

async function getSession(): Promise<Session> {
  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;
  if (email && password) {
    return login(email, password);
  }

  const newEmail = `mp-smoke+${Date.now()}@example.com`;
  const newPassword = `smoke-${randomUUID()}`;
  const body = expectOk(
    'Register',
    await http<{ accessToken: string }>('POST', `${API_URL}/auth/register`, {
      body: {
        fullName: 'Smoke Test Mercado Pago',
        email: newEmail,
        password: newPassword,
        phone: '+52 55 0000 0000',
        whatsappNumber: '+52 55 0000 0000',
      },
    }),
  );
  return {
    accessToken: body.accessToken,
    email: newEmail,
    password: newPassword,
  };
}

async function createOrder(
  accessToken: string,
): Promise<{ id: string; total: string | number }> {
  const items = expectOk(
    'Listar menú',
    await http<Array<{ id: string; name: string; servesMin?: number }>>(
      'GET',
      `${API_URL}/menu/items`,
    ),
  );
  if (!items.length) {
    throw new Error(
      'No hay platillos activos en el menú: crea uno antes de correr el smoke test.',
    );
  }
  const item = items[0];

  return expectOk(
    'Crear pedido',
    await http<{ id: string; total: string | number }>(
      'POST',
      `${API_URL}/orders`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: {
          peopleCount: item.servesMin ?? 10,
          scheduledFor: new Date(
            Date.now() + 14 * 24 * 3600 * 1000,
          ).toISOString(),
          notes: 'Pedido de smoke test de Mercado Pago (mp-smoke.ts)',
          items: [{ menuItemId: item.id, quantity: 1 }],
        },
      },
    ),
  );
}

async function createSandboxPayment(
  orderId: string,
  amount: number,
  holder: Holder,
) {
  const publicKey = requireEnv('MERCADOPAGO_PUBLIC_KEY');
  const accessToken = requireEnv('MERCADOPAGO_ACCESS_TOKEN');

  const token = expectOk(
    'Tokenizar tarjeta',
    await http<{ id: string }>(
      'POST',
      `${MP_API}/v1/card_tokens?public_key=${publicKey}`,
      {
        body: {
          card_number: TEST_CARD.card_number,
          security_code: TEST_CARD.security_code,
          expiration_month: TEST_CARD.expiration_month,
          expiration_year: TEST_CARD.expiration_year,
          cardholder: {
            name: holder,
            identification: { type: 'OTRO', number: '123456789' },
          },
        },
      },
    ),
  );

  return expectOk(
    'Crear pago',
    await http<{ id: number; status: string; status_detail: string }>(
      'POST',
      `${MP_API}/v1/payments`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Idempotency-Key': randomUUID(),
        },
        body: {
          transaction_amount: amount,
          token: token.id,
          installments: 1,
          payment_method_id: TEST_CARD.payment_method_id,
          external_reference: orderId,
          description: `Smoke test pedido ${orderId}`,
          payer: { email: requireEnv('SMOKE_PAYER_EMAIL') },
        },
      },
    ),
  );
}

/** Mismo manifest que WebhookSignatureValidator: `id:<dataId>;request-id:<xRequestId>;ts:<ts>;`. */
function signWebhook(
  dataId: string,
  requestId: string,
  secret: string,
): string {
  const ts = Math.floor(Date.now() / 1000).toString();
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${ts},v1=${v1}`;
}

async function sendSignedWebhook(paymentId: string): Promise<void> {
  const requestId = randomUUID();
  const xSignature = signWebhook(
    paymentId,
    requestId,
    requireEnv('MERCADOPAGO_WEBHOOK_SECRET'),
  );
  expectOk(
    'Webhook',
    await http(
      'POST',
      `${API_URL}/payments/webhook?data.id=${encodeURIComponent(paymentId)}&type=payment`,
      {
        headers: { 'x-signature': xSignature, 'x-request-id': requestId },
        body: {
          type: 'payment',
          action: 'payment.updated',
          data: { id: paymentId },
        },
      },
    ),
  );
}

async function verifyOrderStatus(
  accessToken: string,
  orderId: string,
  expected: string,
): Promise<boolean> {
  const updated = expectOk(
    'Consultar pedido',
    await http<{ status: string }>('GET', `${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );

  const ok = updated.status === expected;
  console.log(
    `${ok ? 'OK' : 'FALLO'}: pedido en "${updated.status}" (esperado "${expected}").`,
  );
  return ok;
}

async function run(holder: Holder): Promise<boolean> {
  console.log(`\n=== ${holder} (esperado: ${EXPECTED_STATUS[holder]}) ===`);

  const { accessToken } = await getSession();
  const order = await createOrder(accessToken);
  console.log(`Pedido ${order.id} creado (total ${order.total}).`);

  const payment = await createSandboxPayment(
    order.id,
    Number(order.total),
    holder,
  );
  console.log(
    `Pago ${payment.id} en sandbox: ${payment.status} (${payment.status_detail}).`,
  );

  await sendSignedWebhook(String(payment.id));
  console.log('Webhook firmado enviado.');

  return verifyOrderStatus(accessToken, order.id, EXPECTED_STATUS[holder]);
}

/** Modo checkout: pedido + preferencia de Checkout Pro; el pago se hace a mano en el navegador. */
async function runCheckout(): Promise<void> {
  const session = await getSession();
  const order = await createOrder(session.accessToken);
  const { checkoutUrl } = expectOk(
    'Crear preferencia',
    await http<{ checkoutUrl: string }>(
      'POST',
      `${API_URL}/payments/preferences`,
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: { orderId: order.id },
      },
    ),
  );

  console.log(`orderId:     ${order.id} (total ${order.total})`);
  console.log(`checkoutUrl: ${checkoutUrl}`);
  console.log(
    `Cliente:     SMOKE_EMAIL=${session.email} SMOKE_PASSWORD=${session.password}`,
  );
}

/** Modo webhook: firma y manda la notificación de un pago ya hecho y verifica el pedido. */
async function runWebhook(
  paymentId?: string,
  orderId?: string,
  expected?: string,
): Promise<boolean> {
  const validExpected = Object.values(EXPECTED_STATUS);
  if (
    !paymentId ||
    !orderId ||
    !expected ||
    !validExpected.includes(expected)
  ) {
    throw new Error(
      `Uso: webhook <paymentId> <orderId> <${validExpected.join('|')}> ` +
        '(con SMOKE_EMAIL/SMOKE_PASSWORD del dueño del pedido).',
    );
  }
  const session = await login(
    requireEnv('SMOKE_EMAIL'),
    requireEnv('SMOKE_PASSWORD'),
  );

  await sendSignedWebhook(paymentId);
  console.log(`Webhook firmado enviado para el pago ${paymentId}.`);

  return verifyOrderStatus(session.accessToken, orderId, expected);
}

const USAGE = `Uso: pnpm run mp:smoke -- <modo>

Modos:
  checkout
      Crea un pedido y su preferencia de Checkout Pro; imprime orderId, checkoutUrl
      (init_point) y las credenciales del cliente (SMOKE_EMAIL/SMOKE_PASSWORD). No paga.
  webhook <paymentId> <orderId> <confirmed|payment_failed>
      Firma y manda el webhook de un pago ya hecho y verifica el status del pedido.
      Requiere SMOKE_EMAIL/SMOKE_PASSWORD del dueño del pedido.
  APRO | OTHE
      Pago directo por POST /v1/payments (APRO -> confirmed, OTHE -> payment_failed).
      OJO: hoy devuelven 401 "Unauthorized use of live credentials" con credenciales
      de usuario de prueba; el flujo validado es checkout + webhook.

API: ${API_URL} (sobreescribible con SMOKE_API_URL)`;

async function main(): Promise<void> {
  // `pnpm run mp:smoke -- APRO` le pasa el `--` literal al script: se ignora.
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const mode = args[0]?.toLowerCase();

  if (!mode || mode === 'help' || mode === '-h' || mode === '--help') {
    console.log(USAGE);
    return;
  }
  if (mode === 'checkout') {
    await runCheckout();
    return;
  }
  if (mode === 'webhook') {
    process.exitCode = (await runWebhook(args[1], args[2], args[3])) ? 0 : 1;
    return;
  }

  const holder = args[0].toUpperCase();
  if (holder === 'APRO' || holder === 'OTHE') {
    process.exitCode = (await run(holder)) ? 0 : 1;
    return;
  }

  console.error(`Modo desconocido: ${args[0]}\n\n${USAGE}`);
  process.exitCode = 1;
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  if (err instanceof TypeError && err.message === 'fetch failed') {
    console.error(`¿Está corriendo la API en ${API_URL}? (pnpm nx serve api)`);
  }
  process.exitCode = 1;
});
