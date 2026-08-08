import { inject } from '@angular/core';
import { HttpErrorResponse, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStateService } from '../../features/auth/state/auth-state.service';

/** Rutas de auth que nunca deben disparar un intento de refresh si fallan con 401. */
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/refresh'];

/**
 * Adjunta el accessToken vigente a toda request saliente. Si una request
 * responde 401 (y no es a un endpoint de auth -- login/register/refresh
 * fallando con 401 es "credenciales inválidas", no "sesión expirada"),
 * intenta refrescar el access token una vez y reintenta la request
 * original. Si el refresh también falla, limpia la sesión y manda a
 * /login. Reemplaza por completo al banner de auth temporal (DevTokenStore).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStateService);
  const router = inject(Router);

  const token = auth.accessToken();
  const authedReq = token ? withAuth(req, token) : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthRoute(req.url)) {
        return throwError(() => error);
      }

      return auth.refreshTokens().pipe(
        switchMap((tokens) => next(withAuth(req, tokens.accessToken))),
        catchError((refreshError: unknown) => {
          auth.clearSession();
          router.navigateByUrl('/login');
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

function withAuth(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isAuthRoute(url: string): boolean {
  return AUTH_ROUTES.some((path) => url.includes(path));
}
