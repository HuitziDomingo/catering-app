/**
 * Smoke test de WhatsApp Cloud API (ADR-029) contra la API real de Meta, con
 * el mismo adaptador que usa la API (MetaCloudWhatsAppProvider). Manda a
 * WHATSAPP_TEST_RECIPIENT, que debe estar en la lista de destinatarios
 * permitidos del número de prueba de Meta.
 *
 * Uso (desde la raíz del repo):
 *   pnpm run wa:smoke                          # ayuda, no llama a Meta
 *   pnpm run wa:smoke -- hello_world           # plantilla hello_world (en_US)
 *   pnpm run wa:smoke -- jaspers               # jaspers_market_order_confirmation_v1 con datos de ejemplo
 *   pnpm run wa:smoke -- event <evento>        # plantilla propia (es_MX) de un evento, cuando Meta la apruebe
 *   pnpm run wa:smoke -- templates             # estado de las plantillas en la cuenta (requiere WHATSAPP_BUSINESS_ACCOUNT_ID)
 *
 * Eventos: order_received, new_order_business, order_confirmed, order_preparing,
 * order_delivered, order_cancelled, payment_failed.
 *
 * Para probar el otro formato de número de México (ver ADR-029, "52 1"):
 *   WHATSAPP_MX_NUMBER_FORMAT=521 pnpm run wa:smoke -- hello_world
 * La salida muestra el número usado y el wa_id que devuelve Meta (enmascarados).
 *
 * Variables (de apps/api/.env; se pueden sobreescribir por entorno):
 *   WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_API_VERSION,
 *   WHATSAPP_TEST_RECIPIENT, WHATSAPP_MX_NUMBER_FORMAT, WHATSAPP_BUSINESS_ACCOUNT_ID.
 * El token nunca se imprime.
 */
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import type { ConfigService } from '@nestjs/config';
import {
  DEFAULT_GRAPH_API_VERSION,
  MetaCloudWhatsAppProvider,
} from '../src/notifications/whatsapp/meta-cloud-whatsapp.provider';
import {
  maskPhone,
  toWhatsAppRecipient,
  type MexicanNumberFormat,
} from '../src/notifications/whatsapp/phone-number';
import { WhatsAppSendError, type WhatsAppTemplateMessage } from '../src/notifications/whatsapp/whatsapp-provider';
import { buildTemplateMessage, WhatsAppEvent } from '../src/notifications/whatsapp/whatsapp-templates';

loadEnv({ path: resolve(__dirname, '../.env') });

const USAGE = `Uso: pnpm run wa:smoke -- <hello_world | jaspers | event <evento> | templates>
Eventos: ${Object.values(WhatsAppEvent).join(', ')}`;

const SAMPLE_DATA = {
  customerName: 'Ana Pérez',
  folio: '3F2A9B1C',
  eventDate: '20 nov 2026, 14:00',
  peopleCount: '25',
  total: '$3,700.00',
  items: '2x Chilaquiles rojos, 1x Café de olla',
  reviewNote: 'Sin observaciones',
  receiptLinkToken: 'token-de-prueba',
};

const config = { get: (key: string) => process.env[key] } as unknown as ConfigService;

function scrub(text: string): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  return token ? text.split(token).join('<TOKEN>') : text;
}

async function listTemplates(): Promise<void> {
  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!waba) {
    throw new Error('Falta WHATSAPP_BUSINESS_ACCOUNT_ID en apps/api/.env.');
  }
  const version = process.env.WHATSAPP_API_VERSION || DEFAULT_GRAPH_API_VERSION;
  const res = await fetch(
    `https://graph.facebook.com/${version}/${waba}/message_templates?fields=name,language,status,category&limit=100`,
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } },
  );
  const body = (await res.json()) as {
    data?: { name: string; language: string; status: string; category: string }[];
    error?: { code: number; message: string };
  };
  if (!res.ok || body.error) {
    throw new Error(`HTTP ${res.status}, código ${body.error?.code}: ${body.error?.message}`);
  }
  for (const t of body.data ?? []) {
    console.log(`${t.status.padEnd(10)} ${t.category.padEnd(14)} ${t.language.padEnd(6)} ${t.name}`);
  }
}

async function main(): Promise<void> {
  // pnpm run pasa el `--` separador como argumento.
  const [command, arg] = process.argv.slice(2).filter((a) => a !== '--');
  if (!command) {
    console.log(USAGE);
    return;
  }
  if (command === 'templates') {
    await listTemplates();
    return;
  }

  let message: WhatsAppTemplateMessage;
  if (command === 'hello_world') {
    message = buildTemplateMessage(WhatsAppEvent.ORDER_RECEIVED, SAMPLE_DATA, 'test', 'hello_world');
  } else if (command === 'jaspers') {
    message = buildTemplateMessage(WhatsAppEvent.ORDER_RECEIVED, SAMPLE_DATA, 'test');
  } else if (command === 'event' && Object.values(WhatsAppEvent).includes(arg as WhatsAppEvent)) {
    message = buildTemplateMessage(arg as WhatsAppEvent, SAMPLE_DATA, 'production');
  } else {
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }

  const raw = process.env.WHATSAPP_TEST_RECIPIENT ?? '';
  const format = (process.env.WHATSAPP_MX_NUMBER_FORMAT as MexicanNumberFormat) || '52';
  const to = toWhatsAppRecipient(raw, format);
  if (!to) {
    throw new Error('WHATSAPP_TEST_RECIPIENT falta o no es un número válido.');
  }

  const provider = new MetaCloudWhatsAppProvider(config);
  if (!provider.isEnabled) {
    throw new Error('Faltan WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN.');
  }
  console.log(`Enviando ${message.name} (${message.languageCode}) a ${maskPhone(to)} [formato ${format}, ${to.length} dígitos]…`);
  const result = await provider.sendTemplate(to, message);
  console.log(
    `OK. message id: ${result?.messageId ?? '-'}; wa_id: ${result?.waId ? maskPhone(result.waId) : '-'} ` +
      `(${result?.waId?.length ?? 0} dígitos, empieza con ${result?.waId?.slice(0, 3) ?? '-'}).`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof WhatsAppSendError || error instanceof Error ? error.message : String(error);
  console.error(`Error: ${scrub(message)}`);
  process.exitCode = 1;
});
