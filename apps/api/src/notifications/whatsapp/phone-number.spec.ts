import { maskPhone, normalizeMexicanNumber, toWhatsAppRecipient } from './phone-number';

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

describe('maskPhone', () => {
  it('deja ver solo los últimos 4 dígitos', () => {
    expect(maskPhone('525512345678')).toBe('••••••••5678');
  });
});
