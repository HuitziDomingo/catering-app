import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../jwt-payload.interface';

/**
 * Autoriza por rol a partir del payload JWT ya validado por JwtAuthGuard
 * (debe usarse siempre después de JwtAuthGuard en `@UseGuards`). Si la ruta
 * no tiene `@Roles(...)`, deja pasar (no restringe).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload }>();

    return !!user && requiredRoles.includes(user.role);
  }
}
