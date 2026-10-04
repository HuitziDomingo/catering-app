import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { WhatsAppService } from './whatsapp.service';

const mockCreate = jest.fn();

jest.mock('twilio', () => ({
  Twilio: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

/**
 * SID con formato válido (AC + 32 hex), distinto de cualquier cuenta real. Se arma
 * en runtime para que el literal no dispare el secret scanning (Push Protection).
 */
const FAKE_HEX_32 = '0123456789abcdef'.repeat(2);
const VALID_SID = 'AC' + FAKE_HEX_32;

const validEnv: Record<string, string | undefined> = {
  TWILIO_ACCOUNT_SID: VALID_SID,
  TWILIO_AUTH_TOKEN: 'faketoken',
  TWILIO_WHATSAPP_NUMBER: 'whatsapp:+14155238886',
};

function buildService(env: Record<string, string | undefined>): WhatsAppService {
  const config = { get: jest.fn((key: string) => env[key]) };
  return new WhatsAppService(config as unknown as ConfigService);
}

describe('WhatsAppService', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    (Twilio as unknown as jest.Mock).mockClear();
    mockCreate.mockReset().mockResolvedValue({ sid: 'SM123' });
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('con credenciales válidas', () => {
    let service: WhatsAppService;

    beforeEach(() => {
      service = buildService(validEnv);
    });

    it('construye el cliente de Twilio con el SID y el token, sin warnings', () => {
      expect(Twilio).toHaveBeenCalledWith(VALID_SID, 'faketoken');
      expect(service.isEnabled).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('envía el mensaje con el número "from" del sandbox y antepone whatsapp: al destinatario', async () => {
      await service.sendMessage('+5215512345678', 'Hola, tu pedido fue recibido.');

      expect(mockCreate).toHaveBeenCalledWith({
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:+5215512345678',
        body: 'Hola, tu pedido fue recibido.',
      });
    });

    it('no duplica el prefijo whatsapp: si el número ya lo trae', async () => {
      await service.sendMessage('whatsapp:+5215512345678', 'Hola de nuevo.');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'whatsapp:+5215512345678' }),
      );
    });

    it('propaga el error de Twilio al llamador (OrdersService decide si lo atrapa)', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Twilio down'));

      await expect(
        service.sendMessage('+5215512345678', 'Hola'),
      ).rejects.toThrow('Twilio down');
    });
  });

  describe.each([
    ['TWILIO_ACCOUNT_SID'],
    ['TWILIO_AUTH_TOKEN'],
    ['TWILIO_WHATSAPP_NUMBER'],
  ])('sin %s', (missingKey) => {
    it('no construye el cliente, avisa una sola vez y sendMessage es no-op sin lanzar', async () => {
      const service = buildService({ ...validEnv, [missingKey]: undefined });

      expect(Twilio).not.toHaveBeenCalled();
      expect(service.isEnabled).toBe(false);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(missingKey));

      await expect(service.sendMessage('+5215512345678', 'Hola')).resolves.toBeUndefined();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe.each([
    ['el placeholder de .env.example', 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'],
    ['un placeholder en español', 'tu_account_sid'],
    ['un SID sin prefijo AC', 'SK' + FAKE_HEX_32],
    ['un SID demasiado corto', 'AC0123456789abcdef'],
  ])('con TWILIO_ACCOUNT_SID inválido (%s)', (_label, sid) => {
    it('no construye el cliente, avisa una sola vez y sendMessage es no-op sin lanzar', async () => {
      const service = buildService({ ...validEnv, TWILIO_ACCOUNT_SID: sid });

      expect(Twilio).not.toHaveBeenCalled();
      expect(service.isEnabled).toBe(false);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('TWILIO_ACCOUNT_SID no tiene formato válido'),
      );

      await expect(service.sendMessage('+5215512345678', 'Hola')).resolves.toBeUndefined();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
