import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { RoleName } from '@catering-app/shared-types';
import {
  AuthDataAccessService,
  type AuthTokens,
  type LoginPayload,
  type RegisterPayload,
} from '../data-access/auth-data-access.service';

const ACCESS_TOKEN_KEY = 'auth-access-token';
const REFRESH_TOKEN_KEY = 'auth-refresh-token';

/**
 * Roles con permiso para iniciar sesión en el dashboard. customer y staff
 * quedan fuera: aunque RolesGuard en la API ya bloquea sus acciones de
 * escritura, el negocio pidió que ni siquiera puedan entrar al panel.
 */
export const DASHBOARD_ALLOWED_ROLES: readonly RoleName[] = [RoleName.ADMIN, RoleName.SUPERADMIN];

export const DASHBOARD_ACCESS_DENIED_MESSAGE =
  'Esta cuenta no tiene acceso al panel de administración.';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly role: RoleName;
}

/**
 * Estado del feature de auth (ver ADR-020) manejado con signals de Angular,
 * reemplaza por completo a DevTokenStore. accessToken/refreshToken se
 * persisten en localStorage (web -- a diferencia de AsyncStorage en mobile,
 * ver useSessionStore.ts) para que un reload no cierre la sesión.
 *
 * user NO se persiste: se recarga desde GET /auth/me (fuente única de
 * verdad) cada vez que hay tokens nuevos, o al arrancar la app vía
 * restoreSession() si ya había un accessToken guardado. Esa misma llamada a
 * /me al arrancar sirve como verificación implícita de que el token siga
 * siendo válido -- si expiró, el interceptor (ver core/auth/auth.interceptor.ts)
 * intenta refrescarlo antes de rendirse y mandar a /login.
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly dataAccess = inject(AuthDataAccessService);

  private readonly _accessToken = signal<string | null>(readStorage(ACCESS_TOKEN_KEY));
  private readonly _refreshToken = signal<string | null>(readStorage(REFRESH_TOKEN_KEY));
  private readonly _user = signal<AuthUser | null>(null);

  readonly accessToken = this._accessToken.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._accessToken() !== null);

  /**
   * Restaura la sesión (GET /auth/me) desde el accessToken persistido.
   * Se invoca una única vez al arrancar la app vía provideAppInitializer
   * (ver app.config.ts) -- deliberadamente NO desde el constructor.
   *
   * Si loadCurrentUser() se disparara en el constructor, HttpClient pasaría
   * la request por authInterceptor, que hace inject(AuthStateService) para
   * leer el token -- pero como esta misma instancia todavía estaría a medio
   * construir en ese momento, Angular lo detecta como dependencia circular
   * (NG0200) y tira ese error de forma síncrona. Un subscribe con el error
   * silenciado se tragaba esa excepción sin dejar rastro: accessToken
   * quedaba seteado (isAuthenticated true, viene del signal leído en el
   * field initializer, no de la llamada a /me) pero user()/role se perdía
   * para siempre tras un hard reload -- nunca llegaba a reintentarse.
   *
   * Al disparar la restauración desde un app initializer, AuthStateService
   * ya está completamente construido cuando authInterceptor vuelve a
   * inyectarlo, así que no hay reentrancia y la request procede con
   * normalidad.
   */
  restoreSession(): Observable<AuthUser | null> {
    if (!this._accessToken()) {
      return of(null);
    }
    return this.loadCurrentUser().pipe(
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  login(payload: LoginPayload): Observable<AuthUser> {
    return this.dataAccess.login(payload).pipe(
      tap((tokens) => this.setTokens(tokens)),
      switchMap(() => this.loadCurrentUser()),
      switchMap((user) => this.assertDashboardAccess(user)),
    );
  }

  register(payload: RegisterPayload): Observable<AuthUser> {
    return this.dataAccess.register(payload).pipe(
      tap((tokens) => this.setTokens(tokens)),
      switchMap(() => this.loadCurrentUser()),
    );
  }

  /** Solo refresca los tokens -- lo usa el interceptor, no dispara /me. */
  refreshTokens(): Observable<AuthTokens> {
    const refreshToken = this._refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token disponible.'));
    }
    return this.dataAccess.refresh(refreshToken).pipe(tap((tokens) => this.setTokens(tokens)));
  }

  logout(): void {
    this.clearSession();
  }

  clearSession(): void {
    this._accessToken.set(null);
    this._refreshToken.set(null);
    this._user.set(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  private setTokens(tokens: AuthTokens): void {
    this._accessToken.set(tokens.accessToken);
    this._refreshToken.set(tokens.refreshToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  private loadCurrentUser(): Observable<AuthUser> {
    return this.dataAccess.me().pipe(
      map((identity) => ({ id: identity.sub, email: identity.email, role: identity.role as RoleName })),
      tap((user) => this._user.set(user)),
    );
  }

  /** Rechaza el login (limpiando la sesión ya establecida) si el rol no tiene acceso al dashboard. */
  private assertDashboardAccess(user: AuthUser): Observable<AuthUser> {
    if (DASHBOARD_ALLOWED_ROLES.includes(user.role)) {
      return of(user);
    }
    this.clearSession();
    return throwError(() => new Error(DASHBOARD_ACCESS_DENIED_MESSAGE));
  }
}

function readStorage(key: string): string | null {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
}
