import {
  buildTemplateMessage,
  PRODUCTION_TEMPLATES,
  WhatsAppEvent,
  type WhatsAppTemplateData,
} from './whatsapp-templates';

const data: WhatsAppTemplateData = {
  customerName: 'Ana Pérez',
  folio: '3F2A9B1C',
  eventDate: '20 nov 2026, 14:00',
  peopleCount: '25',
  total: '$3,700.00',
  items: '2x Chilaquiles',
  reviewNote: 'Sin observaciones',
  receiptLinkToken: 'tok',
};

describe('buildTemplateMessage', () => {
  describe('modo production (plantillas de docs/whatsapp-plantillas.md)', () => {
    it.each([
      [WhatsAppEvent.ORDER_RECEIVED, 'pedido_recibido', ['Ana Pérez', '3F2A9B1C', '20 nov 2026, 14:00', '25']],
      [
        WhatsAppEvent.NEW_ORDER_BUSINESS,
        'nuevo_pedido_negocio',
        ['3F2A9B1C', 'Ana Pérez', '20 nov 2026, 14:00', '25', '2x Chilaquiles', 'Sin observaciones'],
      ],
      [WhatsAppEvent.ORDER_CONFIRMED, 'pedido_confirmado', ['Ana Pérez', '3F2A9B1C', '20 nov 2026, 14:00', '$3,700.00']],
      [WhatsAppEvent.ORDER_PREPARING, 'pedido_en_preparacion', ['Ana Pérez', '3F2A9B1C', '20 nov 2026, 14:00']],
      [WhatsAppEvent.ORDER_DELIVERED, 'pedido_entregado', ['Ana Pérez', '3F2A9B1C']],
      [WhatsAppEvent.ORDER_CANCELLED, 'pedido_cancelado', ['Ana Pérez', '3F2A9B1C']],
      [WhatsAppEvent.PAYMENT_FAILED, 'pago_rechazado', ['Ana Pérez', '3F2A9B1C']],
    ])('%s → %s (es_MX) con sus variables en orden', (event, name, params) => {
      const message = buildTemplateMessage(event, data, 'production');

      expect(message).toEqual(
        expect.objectContaining({ name, languageCode: 'es_MX', bodyParams: params }),
      );
    });

    it('solo pedido_confirmado lleva el botón con el token del recibo', () => {
      expect(buildTemplateMessage(WhatsAppEvent.ORDER_CONFIRMED, data, 'production').urlButtonSuffix).toBe('tok');
      for (const event of Object.values(WhatsAppEvent).filter((e) => e !== WhatsAppEvent.ORDER_CONFIRMED)) {
        expect(buildTemplateMessage(event, data, 'production').urlButtonSuffix).toBeUndefined();
      }
    });

    it('pedido_confirmado sin token no manda sufijo de botón', () => {
      const message = buildTemplateMessage(
        WhatsAppEvent.ORDER_CONFIRMED,
        { ...data, receiptLinkToken: undefined },
        'production',
      );
      expect(message.urlButtonSuffix).toBeUndefined();
    });

    it('cada evento tiene su propia plantilla', () => {
      const names = Object.values(PRODUCTION_TEMPLATES).map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('modo test (plantillas de ejemplo de Meta)', () => {
    it.each(Object.values(WhatsAppEvent))(
      '%s manda jaspers_market_order_confirmation_v1 con nombre, folio y fecha',
      (event) => {
        expect(buildTemplateMessage(event, data, 'test')).toEqual({
          name: 'jaspers_market_order_confirmation_v1',
          languageCode: 'en_US',
          bodyParams: ['Ana Pérez', '3F2A9B1C', '20 nov 2026, 14:00'],
        });
      },
    );

    it('con WHATSAPP_TEST_TEMPLATE=hello_world manda hello_world sin variables', () => {
      expect(buildTemplateMessage(WhatsAppEvent.ORDER_CONFIRMED, data, 'test', 'hello_world')).toEqual({
        name: 'hello_world',
        languageCode: 'en_US',
      });
    });
  });
});
