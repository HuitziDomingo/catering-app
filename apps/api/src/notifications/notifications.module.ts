import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { NotificationGateway } from './notification.gateway';
import { WhatsAppService } from './whatsapp/whatsapp.service';

/**
 * Módulo de notificaciones: WebSocket Gateway (ADR-004) y WhatsApp vía Twilio
 * (ADR-026) -- dos canales de salida distintos, disparados desde los mismos
 * puntos de OrdersService. JwtModule se registra sin secreto global igual
 * que en AuthModule -- WsJwtGuard lee JWT_ACCESS_SECRET vía ConfigService
 * (global, ver AppModule) en cada verificación.
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [NotificationGateway, WsJwtGuard, WhatsAppService],
  exports: [NotificationGateway, WhatsAppService],
})
export class NotificationsModule {}
