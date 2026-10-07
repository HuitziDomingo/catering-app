import { MX_NUMBER_FORMATS } from '../notifications/whatsapp/phone-number';
import { TEMPLATE_MODES, TEST_TEMPLATES } from '../notifications/whatsapp/whatsapp-templates';

/** Largo mínimo de RECEIPT_LINK_SECRET: firma tokens que duran 30 días (ADR-029). */
export const MIN_RECEIPT_LINK_SECRET_LENGTH = 32;

type Env = Record<string, unknown>;

function value(env: Env, key: string): string | undefined {
  const raw = env[key];
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
}

function oneOf(env: Env, key: string, allowed: readonly string[], errors: string[]): void {
  const current = value(env, key);
  if (current !== undefined && !allowed.includes(current)) {
    errors.push(`${key} debe ser uno de: ${allowed.join(', ')} (recibido "${current}").`);
  }
}

/**
 * Validación de variables al arrancar (ConfigModule.forRoot({ validate })).
 * Solo revisa lo que, mal configurado, fallaría en silencio más tarde: un
 * valor fuera de lista o un secreto débil truena al iniciar con un mensaje
 * claro. Lo opcional sigue siendo opcional -- sin WhatsApp ni link al
 * recibo la API arranca igual y lo registra en el log. Por lo mismo, un
 * BUSINESS_WHATSAPP_NUMBER inválido no detiene el arranque: WhatsAppService
 * lo avisa al iniciar y omite ese aviso.
 *
 * Nunca incluye el valor de un secreto en el mensaje de error.
 */
export function validateEnv(env: Env): Env {
  const errors: string[] = [];

  oneOf(env, 'WHATSAPP_TEMPLATE_MODE', TEMPLATE_MODES, errors);
  oneOf(env, 'WHATSAPP_TEST_TEMPLATE', TEST_TEMPLATES, errors);
  oneOf(env, 'WHATSAPP_MX_NUMBER_FORMAT', MX_NUMBER_FORMATS, errors);

  const apiVersion = value(env, 'WHATSAPP_API_VERSION');
  if (apiVersion !== undefined && !/^v\d+\.\d+$/.test(apiVersion)) {
    errors.push(`WHATSAPP_API_VERSION debe tener la forma vNN.N (ej. v25.0), recibido "${apiVersion}".`);
  }

  const receiptSecret = value(env, 'RECEIPT_LINK_SECRET');
  if (receiptSecret !== undefined) {
    if (receiptSecret.length < MIN_RECEIPT_LINK_SECRET_LENGTH) {
      errors.push(
        `RECEIPT_LINK_SECRET debe tener al menos ${MIN_RECEIPT_LINK_SECRET_LENGTH} caracteres ` +
          '(genera uno con: openssl rand -base64 48).',
      );
    }
    if ([value(env, 'JWT_ACCESS_SECRET'), value(env, 'JWT_REFRESH_SECRET')].includes(receiptSecret)) {
      errors.push('RECEIPT_LINK_SECRET debe ser distinto de JWT_ACCESS_SECRET y JWT_REFRESH_SECRET.');
    }
  }

  // pedido_confirmado lleva un botón con el link al recibo: en producción
  // Meta rechaza la plantilla si falta el sufijo del botón.
  const whatsAppConfigured =
    value(env, 'WHATSAPP_PHONE_NUMBER_ID') !== undefined &&
    value(env, 'WHATSAPP_ACCESS_TOKEN') !== undefined;
  if (
    whatsAppConfigured &&
    value(env, 'WHATSAPP_TEMPLATE_MODE') === 'production' &&
    receiptSecret === undefined
  ) {
    errors.push(
      'RECEIPT_LINK_SECRET es obligatoria con WHATSAPP_TEMPLATE_MODE=production: ' +
        'la plantilla pedido_confirmado lleva el link al recibo.',
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuración inválida (apps/api/.env o variables de entorno):\n- ${errors.join('\n- ')}`,
    );
  }
  return env;
}
