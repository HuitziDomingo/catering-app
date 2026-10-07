/**
 * Formato de los celulares de México para la API de WhatsApp (ver ADR-029,
 * "El detalle del 52 1", y su addendum 01):
 *
 * - `'52'`: `52` + 10 dígitos (ej. 525512345678). Es el formato actual del
 *   plan de numeración (desde 2019 ya no existe el "1" de celular), el que
 *   Meta guarda en la lista de destinatarios permitidos, y el que Meta
 *   acepta para enviar (verificado el 2026-10-07).
 * - `'521'`: `521` + 10 dígitos, el formato viejo. Meta lo devuelve como
 *   `wa_id` aunque se le haya mandado el de 12 dígitos (verificado el
 *   2026-10-07): para comparar, usa isSameWhatsAppNumber.
 *
 * Se elige con `WHATSAPP_MX_NUMBER_FORMAT` (default `'52'`): si en producción
 * Meta rechaza un formato, se cambia la variable, no el código.
 */
export type MexicanNumberFormat = '52' | '521';

export const MX_NUMBER_FORMATS: readonly MexicanNumberFormat[] = ['52', '521'];
export const DEFAULT_MX_NUMBER_FORMAT: MexicanNumberFormat = '52';

/** Prefijos de marcación nacional que se usaban antes de 2019 desde fijos. */
const OLD_MOBILE_PREFIXES = ['044', '045'];

/**
 * Normaliza un número mexicano a solo dígitos, sin `+`, en el formato
 * pedido. Acepta lo que un cliente escribe, lo que ya traía la base o un
 * `wa_id` de Meta: `+52 1 55 1234 5678`, `521-55-1234-5678`, `5512345678`,
 * `044 55 1234 5678`, `whatsapp:+525512345678`, `5215512345678`. Con el
 * formato por default, `52XXXXXXXXXX` y `521XXXXXXXXXX` dan el mismo
 * resultado. Devuelve null si no es un número de México de 10 dígitos.
 */
export function normalizeMexicanNumber(
  raw: string,
  format: MexicanNumberFormat = DEFAULT_MX_NUMBER_FORMAT,
): string | null {
  let digits = raw.replace(/^whatsapp:/i, '').replace(/\D/g, '');

  for (const prefix of OLD_MOBILE_PREFIXES) {
    if (digits.length === 13 && digits.startsWith(prefix)) {
      digits = digits.slice(prefix.length);
    }
  }

  let national: string;
  if (digits.length === 10) {
    national = digits;
  } else if (digits.length === 12 && digits.startsWith('52')) {
    national = digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith('521')) {
    national = digits.slice(3);
  } else {
    return null;
  }

  return format === '521' ? `521${national}` : `52${national}`;
}

/**
 * Número de destino para la API de WhatsApp: los de México pasan por
 * normalizeMexicanNumber; los de otros países se mandan en E.164 sin `+`
 * (8 a 15 dígitos, con código de país). null si no parece un número válido.
 */
export function toWhatsAppRecipient(
  raw: string,
  mxFormat: MexicanNumberFormat = DEFAULT_MX_NUMBER_FORMAT,
): string | null {
  const mexican = normalizeMexicanNumber(raw, mxFormat);
  if (mexican) {
    return mexican;
  }
  const trimmed = raw.replace(/^whatsapp:/i, '').trim();
  const digits = trimmed.replace(/\D/g, '');
  // Sin `+` y sin forma mexicana: no se puede saber el país.
  if (!trimmed.startsWith('+') || digits.length < 8 || digits.length > 15) {
    return null;
  }
  return digits;
}

/**
 * Forma estable de un número de WhatsApp para guardarlo o compararlo:
 * México siempre como `52` + 10 dígitos (sin importar si llegó con el `1`),
 * otros países solo con dígitos (como el `wa_id`, que no lleva `+`). null si
 * no parece un número.
 *
 * A diferencia de toWhatsAppRecipient, acepta números internacionales sin
 * `+`, porque así llegan los `wa_id` de Meta. Ojo: 10 dígitos sin código de
 * país se toman como México.
 */
export function canonicalWhatsAppNumber(raw: string): string | null {
  const mexican = normalizeMexicanNumber(raw, '52');
  if (mexican) {
    return mexican;
  }
  const digits = raw.replace(/^whatsapp:/i, '').replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/**
 * true si dos números son la misma cuenta de WhatsApp, aunque uno venga como
 * `52XXXXXXXXXX` (lo que mandamos o guardamos) y el otro como
 * `521XXXXXXXXXX` (el `wa_id` que devuelve Meta, ADR-029 addendum 01). Sirve
 * para cruzar webhooks o mensajes entrantes con el whatsappNumber del cliente.
 */
export function isSameWhatsAppNumber(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) {
    return false;
  }
  const canonicalA = canonicalWhatsAppNumber(a);
  return canonicalA !== null && canonicalA === canonicalWhatsAppNumber(b);
}

/** Para logs: deja ver solo los últimos 4 dígitos. */
export function maskPhone(number: string): string {
  return number.replace(/\d(?=\d{4})/g, '•');
}
