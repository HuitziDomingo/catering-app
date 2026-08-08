import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable, switchMap, tap, throwError } from 'rxjs';
import { RoleName } from '@catering-app/shared-types';
import {
  AuthDataAccessService,
  type AuthTokens,
  type LoginPayload,
  type RegisterPayload,
} from '../data-access/auth-data-access.service';

const ACCESS_TOKEN_KEY = 'auth-access-token';
const REFRESH_TOKEN_KEY = 'auth-refresh-token';

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
 * verdad) cada vez que hay tokens nuevos o al arrancar la app si ya había
 * un accessToken guardado. Esa misma llamada a /me al arrancar sirve como
 * verificación implícita de que el token siga siendo válido -- si expiró,
 * el interceptor (ver core/auth/auth.interceptor.ts) intenta refrescarlo
 * antes de rendirse y mandar a /login.
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

  constructor() {
    if (this._accessToken()) {
      this.loadCurrentUser().subscribe({ error: () => undefined });
    }
  }

  login(payload: LoginPayload): Observable<AuthUser> {
    return this.dataAccess.login(payload).pipe(
      tap((tokens) => this.setTokens(tokens)),
      switchMap(() => this.loadCurrentUser()),
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
}

function readStorage(key: string): string | null {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
}
