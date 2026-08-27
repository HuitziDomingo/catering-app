import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { NotificationGateway } from './notification.gateway';

/**
 * Módulo del WebSocket Gateway de notificaciones (ver ADR-004). JwtModule se
 * registra sin secreto global igual que en AuthModule -- WsJwtGuard lee
 * JWT_ACCESS_SECRET vía ConfigService (global, ver AppModule) en cada
 * verificación.
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [NotificationGateway, WsJwtGuard],
  exports: [NotificationGateway],
})
export class NotificationsModule {}
