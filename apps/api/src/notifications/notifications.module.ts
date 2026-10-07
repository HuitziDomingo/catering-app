import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { NotificationGateway } from './notification.gateway';
import { MetaCloudWhatsAppProvider } from './whatsapp/meta-cloud-whatsapp.provider';
import { WhatsAppProvider } from './whatsapp/whatsapp-provider';
import { WhatsAppService } from './whatsapp/whatsapp.service';

/**
 * Módulo de notificaciones: WebSocket Gateway (ADR-004) y WhatsApp (eventos
 * de ADR-026, proveedor Meta Cloud API de ADR-029) -- dos canales de salida
 * distintos, disparados desde los mismos puntos de OrdersService. Se inyecta
 * el puerto WhatsAppProvider, no el adaptador. JwtModule se registra sin
 * secreto global igual que en AuthModule -- WsJwtGuard lee
 * JWT_ACCESS_SECRET vía ConfigService (global, ver AppModule) en cada
 * verificación.
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [
    NotificationGateway,
    WsJwtGuard,
    { provide: WhatsAppProvider, useClass: MetaCloudWhatsAppProvider },
    WhatsAppService,
  ],
  exports: [NotificationGateway, WhatsAppService],
})
export class NotificationsModule {}
