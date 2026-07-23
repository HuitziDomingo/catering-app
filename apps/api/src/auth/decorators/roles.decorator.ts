import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta a los roles indicados. Requiere que JwtAuthGuard corra
 * antes en la cadena de `@UseGuards` para que RolesGuard pueda leer el rol
 * desde el JWT ya validado.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
