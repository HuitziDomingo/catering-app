import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStateService, DASHBOARD_ALLOWED_ROLES } from '../../features/auth/state/auth-state.service';

/**
 * Protege rutas que requieren sesión iniciada Y rol admin/superadmin.
 *
 * El rechazo principal de roles no permitidos ocurre en
 * AuthStateService.login() (con mensaje visible en la pantalla de login).
 * Este guard es defensa en profundidad: cubre el caso de una sesión que
 * exista sin haber pasado por ese flujo -- p. ej. un token de
 * customer/staff guardado en localStorage antes de este cambio. Si eso
 * pasa, limpia la sesión inválida y manda a /login en vez de solo negar la
 * navegación.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  const role = auth.user()?.role;
  if (auth.isAuthenticated() && !!role && DASHBOARD_ALLOWED_ROLES.includes(role)) {
    return true;
  }

  if (auth.isAuthenticated()) {
    auth.clearSession();
  }
  return router.createUrlTree(['/login']);
};
