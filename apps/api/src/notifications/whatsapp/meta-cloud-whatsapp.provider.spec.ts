import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { buildTemplatePayload, MetaCloudWhatsAppProvider } from './meta-cloud-whatsapp.provider';
import { WhatsAppSendError } from './whatsapp-provider';

// Token falso armado en runtime (no es un secreto real).
const FAKE_TOKEN = ['EAA', 'fake', 'token'].join('-');

const validEnv: Record<string, string | undefined> = {
  WHATSAPP_PHONE_NUMBER_ID: '123456789012345',
  WHATSAPP_ACCESS_TOKEN: FAKE_TOKEN,
  WHATSAPP_API_VERSION: 'v25.0',
};

function build(env: Record<string, string | undefined> = validEnv): MetaCloudWhatsAppProvider {
  return new MetaCloudWhatsAppProvider({ get: (key: string) => env[key] } as unknown as ConfigService);
}

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

describe('MetaCloudWhatsAppProvider', () => {
  let fetchMock: jest.Mock;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        messaging_product: 'whatsapp',
        contacts: [{ input: '525512345678', wa_id: '5215512345678' }],
        messages: [{ id: 'wamid.ABC' }],
      }),
    );
    global.fetch = fetchMock;
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('con configuración', () => {
    it('hace POST /{version}/{phone-number-id}/messages con el token Bearer y el body de plantilla', async () => {
      const result = await build().sendTemplate('525512345678', {
        name: 'pedido_confirmado',
        languageCode: 'es_MX',
        bodyParams: ['Ana', '3F2A9B1C'],
        urlButtonSuffix: 'tok',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://graph.facebook.com/v25.0/123456789012345/messages');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({
        Authorization: `Bearer ${FAKE_TOKEN}`,
        'Content-Type': 'application/json',
      });
      expect(JSON.parse(init.body)).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '525512345678',
        type: 'template',
        template: {
          name: 'pedido_confirmado',
          language: { code: 'es_MX' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'Ana' },
                { type: 'text', text: '3F2A9B1C' },
              ],
            },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'tok' }] },
          ],
        },
      });
      expect(result).toEqual({ messageId: 'wamid.ABC', waId: '5215512345678' });
    });

    it('usa v25.0 si no se define WHATSAPP_API_VERSION', async () => {
      await build({ ...validEnv, WHATSAPP_API_VERSION: undefined }).sendTemplate('525512345678', {
        name: 'hello_world',
        languageCode: 'en_US',
      });

      expect(fetchMock.mock.calls[0][0]).toBe('https://graph.facebook.com/v25.0/123456789012345/messages');
    });

    it('nunca escribe el token en los logs', async () => {
      await build().sendTemplate('525512345678', { name: 'hello_world', languageCode: 'en_US' });

      const logged = [...logSpy.mock.calls, ...warnSpy.mock.calls].flat().join(' ');
      expect(logged).not.toContain(FAKE_TOKEN);
      // Y el número va enmascarado.
      expect(logged).toContain('••••••••5678');
      expect(logged).not.toContain('525512345678');
    });

    it('un wa_id 521 del mismo número no se registra como otro destinatario', async () => {
      // El mock responde wa_id 5215512345678 para to 525512345678 (como Meta).
      const result = await build().sendTemplate('525512345678', { name: 'hello_world', languageCode: 'en_US' });

      expect(result?.waId).toBe('5215512345678');
      expect(logSpy.mock.calls.flat().join(' ')).not.toContain('wa_id');
    });

    it('un wa_id de otro número sí se registra (enmascarado)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, { contacts: [{ wa_id: '5215599990000' }], messages: [{ id: 'wamid.X' }] }),
      );

      await build().sendTemplate('525512345678', { name: 'hello_world', languageCode: 'en_US' });

      expect(logSpy.mock.calls.flat().join(' ')).toContain('wa_id •••••••••0000');
    });

    it.each([
      [190, 401, 'caducó'],
      [131005, 403, 'usuario de sistema'],
      [131030, 400, 'lista de números permitidos'],
      [132001, 404, 'no existe'],
    ])('el error %s de Meta se lanza como WhatsAppSendError con su pista', async (code, status, hint) => {
      fetchMock.mockResolvedValue(
        jsonResponse(status, { error: { code, message: `(#${code}) algo`, type: 'OAuthException' } }),
      );

      const error = await build()
        .sendTemplate('525512345678', { name: 'hello_world', languageCode: 'en_US' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(WhatsAppSendError);
      expect((error as WhatsAppSendError).code).toBe(code);
      expect((error as WhatsAppSendError).httpStatus).toBe(status);
      expect((error as WhatsAppSendError).message).toContain(hint);
      expect((error as WhatsAppSendError).message).not.toContain(FAKE_TOKEN);
    });

    it('un error de red se lanza como WhatsAppSendError sin código', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      const error = await build()
        .sendTemplate('525512345678', { name: 'hello_world', languageCode: 'en_US' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(WhatsAppSendError);
      expect((error as WhatsAppSendError).code).toBeNull();
    });
  });

  describe('sin configuración (degradación elegante)', () => {
    it.each(['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'])(
      'sin %s arranca deshabilitado con un warning y no llama a Meta',
      async (missing) => {
        const provider = build({ ...validEnv, [missing]: '' });

        expect(provider.isEnabled).toBe(false);
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain(missing);
        await expect(
          provider.sendTemplate('525512345678', { name: 'hello_world', languageCode: 'en_US' }),
        ).resolves.toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );
  });
});

describe('buildTemplatePayload', () => {
  it('sin variables ni botón no manda components (hello_world)', () => {
    expect(buildTemplatePayload('525512345678', { name: 'hello_world', languageCode: 'en_US' }).template).toEqual({
      name: 'hello_world',
      language: { code: 'en_US' },
    });
  });

  it('aplana saltos de línea y espacios múltiples, y no manda variables vacías (error 132018)', () => {
    const payload = buildTemplatePayload('525512345678', {
      name: 'x',
      languageCode: 'es_MX',
      bodyParams: ['2x Tacos,\n1x Café', 'a     b', '  '],
    });

    expect((payload.template as unknown as { components: { parameters: { text: string }[] }[] }).components[0].parameters).toEqual([
      { type: 'text', text: '2x Tacos, 1x Café' },
      { type: 'text', text: 'a b' },
      { type: 'text', text: '-' },
    ]);
  });
});
