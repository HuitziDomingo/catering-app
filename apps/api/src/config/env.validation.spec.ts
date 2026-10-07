import { validateEnv } from './env.validation';

const STRONG_SECRET = 'x'.repeat(48);

describe('validateEnv', () => {
  it('un entorno vacío es válido (todo lo de WhatsApp y el link es opcional)', () => {
    expect(() => validateEnv({})).not.toThrow();
  });

  it('acepta una configuración completa de producción', () => {
    expect(() =>
      validateEnv({
        WHATSAPP_PHONE_NUMBER_ID: '123',
        WHATSAPP_ACCESS_TOKEN: 'token',
        WHATSAPP_API_VERSION: 'v25.0',
        WHATSAPP_TEMPLATE_MODE: 'production',
        WHATSAPP_MX_NUMBER_FORMAT: '521',
        BUSINESS_WHATSAPP_NUMBER: '+52 55 1234 5678',
        RECEIPT_LINK_SECRET: STRONG_SECRET,
      }),
    ).not.toThrow();
  });

  it.each([
    [{ WHATSAPP_TEMPLATE_MODE: 'prod' }, 'WHATSAPP_TEMPLATE_MODE'],
    [{ WHATSAPP_TEST_TEMPLATE: 'otra' }, 'WHATSAPP_TEST_TEMPLATE'],
    [{ WHATSAPP_MX_NUMBER_FORMAT: '+52' }, 'WHATSAPP_MX_NUMBER_FORMAT'],
    [{ WHATSAPP_API_VERSION: '25' }, 'WHATSAPP_API_VERSION'],
    [{ RECEIPT_LINK_SECRET: 'corto' }, 'al menos 32'],
  ])('rechaza %j', (env, expected) => {
    expect(() => validateEnv(env)).toThrow(expected);
  });

  it('un BUSINESS_WHATSAPP_NUMBER inválido no detiene el arranque (degradación elegante)', () => {
    expect(() => validateEnv({ BUSINESS_WHATSAPP_NUMBER: 'whatsapp:+52XXXXXXXXXX' })).not.toThrow();
  });

  it('RECEIPT_LINK_SECRET no puede repetir un secreto de sesión, y el error no muestra el valor', () => {
    let message = '';
    try {
      validateEnv({ RECEIPT_LINK_SECRET: STRONG_SECRET, JWT_ACCESS_SECRET: STRONG_SECRET });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('distinto de JWT_ACCESS_SECRET');
    expect(message).not.toContain(STRONG_SECRET);
  });

  it('en modo production con WhatsApp configurado exige RECEIPT_LINK_SECRET', () => {
    expect(() =>
      validateEnv({
        WHATSAPP_PHONE_NUMBER_ID: '123',
        WHATSAPP_ACCESS_TOKEN: 'token',
        WHATSAPP_TEMPLATE_MODE: 'production',
      }),
    ).toThrow('RECEIPT_LINK_SECRET es obligatoria');
  });

  it('en modo test no exige RECEIPT_LINK_SECRET', () => {
    expect(() =>
      validateEnv({ WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_ACCESS_TOKEN: 'token', WHATSAPP_TEMPLATE_MODE: 'test' }),
    ).not.toThrow();
  });
});
