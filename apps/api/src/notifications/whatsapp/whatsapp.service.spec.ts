import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';

const mockCreate = jest.fn();

jest.mock('twilio', () => ({
  Twilio: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let config: { get: jest.Mock };

  beforeEach(() => {
    config = {
      get: jest.fn((key: string) =>
        ({
          TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          TWILIO_AUTH_TOKEN: 'faketoken',
          TWILIO_WHATSAPP_NUMBER: 'whatsapp:+14155238886',
        })[key],
      ),
    };
    mockCreate.mockReset().mockResolvedValue({ sid: 'SM123' });

    service = new WhatsAppService(config as unknown as ConfigService);
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
