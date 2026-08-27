import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { JwtPayload } from '../jwt-payload.interface';

/** Roles autorizados a conectarse a NotificationGateway (ver ADR-004). */
export const WS_STAFF_ROLES = ['staff', 'admin', 'superadmin'];

/**
 * Verifica el access token JWT (mismo secreto/formato que JwtStrategy) para
 * conexiones WebSocket y exige uno de WS_STAFF_ROLES.
 *
 * A diferencia de JwtAuthGuard (REST), `@UseGuards` NO intercepta el
 * lifecycle hook `handleConnection` de un Gateway -- según la documentación
 * de NestJS, los guards de WebSocket solo corren sobre handlers
 * `@SubscribeMessage` (mismo mecanismo que un guard HTTP normal, pero atado
 * al ciclo de vida de un mensaje, no de la conexión). Por eso
 * NotificationGateway llama a `authenticate()` directamente desde
 * `handleConnection` para poder rechazar/desconectar el socket antes de
 * unirlo a la sala; este guard queda disponible además vía `@UseGuards` para
 * cualquier `@SubscribeMessage` que se agregue a futuro.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    return (await this.authenticate(client)) !== null;
  }

  /** Verifica el token y el rol del socket; retorna el payload o null. */
  async authenticate(client: Socket): Promise<JwtPayload | null> {
    const token = this.extractToken(client);
    if (!token) {
      return null;
    }

    try {
      const secret = this.config.get<string>('JWT_ACCESS_SECRET');
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });
      return WS_STAFF_ROLES.includes(payload.role) ? payload : null;
    } catch {
      return null;
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.['token'];
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }

    return undefined;
  }
}
