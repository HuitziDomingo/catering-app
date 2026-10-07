import {
  canonicalWhatsAppNumber,
  DEFAULT_MX_NUMBER_FORMAT,
  isSameWhatsAppNumber,
  maskPhone,
  normalizeMexicanNumber,
  toWhatsAppRecipient,
} from './phone-number';

describe('normalizeMexicanNumber', () => {
  it.each([
    ['5512345678', '10 dígitos'],
    ['55 1234 5678', 'con espacios'],
    ['55-1234-5678', 'con guiones'],
    ['+52 55 1234 5678', '+52'],
    ['525512345678', '52 sin +'],
    ['+52 1 55 1234 5678', '+52 1 (formato viejo)'],
    ['5215512345678', '521 sin +'],
    ['whatsapp:+5215512345678', 'formato de Twilio'],
    ['044 55 1234 5678', '044 (marcación vieja desde fijo)'],
    ['045 55 1234 5678', '045'],
  ])('%s (%s) → 52 + 10 dígitos por default', (raw) => {
    expect(normalizeMexicanNumber(raw)).toBe('525512345678');
  });

  it('con formato 521 antepone el 1 de celular', () => {
    expect(normalizeMexicanNumber('+52 55 1234 5678', '521')).toBe('5215512345678');
    expect(normalizeMexicanNumber('5215512345678', '521')).toBe('5215512345678');
  });

  it.each(['12345', '+1 415 523 8886', '55123456789', '', 'abc'])(
    '%s no es un número de México → null',
    (raw) => {
      expect(normalizeMexicanNumber(raw)).toBeNull();
    },
  );
});

describe('toWhatsAppRecipient', () => {
  it('México pasa por normalizeMexicanNumber', () => {
    expect(toWhatsAppRecipient('55 1234 5678')).toBe('525512345678');
    expect(toWhatsAppRecipient('55 1234 5678', '521')).toBe('5215512345678');
  });

  it('otros países con + quedan en E.164 sin +', () => {
    expect(toWhatsAppRecipient('+1 (415) 523-8886')).toBe('14155238886');
    expect(toWhatsAppRecipient('whatsapp:+14155238886')).toBe('14155238886');
  });

  it('sin + ni forma mexicana no se puede saber el país → null', () => {
    expect(toWhatsAppRecipient('4155238886123')).toBeNull();
    expect(toWhatsAppRecipient('+123')).toBeNull();
  });
});

describe('formatos 52 y 521 (ADR-029 addendum 01)', () => {
  // Lo que pasó con la API real (2026-10-07): se mandó 52 + 10 dígitos, Meta
  // lo aceptó y respondió con el wa_id en 521 + 10 dígitos.
  const sent = '525512345678';
  const waId = '5215512345678';

  it('el formato de envío por default es 52 + 10 dígitos', () => {
    expect(DEFAULT_MX_NUMBER_FORMAT).toBe('52');
    expect(toWhatsAppRecipient('+52 1 55 1234 5678')).toBe(sent);
  });

  it('normalizeMexicanNumber da el mismo resultado para 52 y 521, en los dos formatos', () => {
    expect(normalizeMexicanNumber(sent)).toBe(normalizeMexicanNumber(waId));
    expect(normalizeMexicanNumber(sent, '521')).toBe(normalizeMexicanNumber(waId, '521'));
  });

  it('canonicalWhatsAppNumber deja los dos en 52 + 10 dígitos', () => {
    expect(canonicalWhatsAppNumber(sent)).toBe(sent);
    expect(canonicalWhatsAppNumber(waId)).toBe(sent);
    expect(canonicalWhatsAppNumber('+52 1 55-1234-5678')).toBe(sent);
  });

  it.each([
    [sent, waId],
    [waId, sent],
    ['55 1234 5678', waId],
    ['+52 1 55 1234 5678', sent],
    ['whatsapp:+5215512345678', '525512345678'],
  ])('isSameWhatsAppNumber(%s, %s) → true', (a, b) => {
    expect(isSameWhatsAppNumber(a, b)).toBe(true);
  });

  it.each([
    [sent, '525512345679'],
    [waId, '5215512345679'],
    [sent, null],
    [undefined, waId],
    ['abc', 'abc'],
  ])('isSameWhatsAppNumber(%s, %s) → false', (a, b) => {
    expect(isSameWhatsAppNumber(a, b)).toBe(false);
  });

  it('los wa_id de otros países (sin +) se comparan por dígitos', () => {
    expect(canonicalWhatsAppNumber('14155238886')).toBe('14155238886');
    expect(isSameWhatsAppNumber('14155238886', '+1 (415) 523-8886')).toBe(true);
    expect(isSameWhatsAppNumber('14155238886', '14155238887')).toBe(false);
  });
});

describe('maskPhone', () => {
  it('deja ver solo los últimos 4 dígitos', () => {
    expect(maskPhone('525512345678')).toBe('••••••••5678');
  });
});
