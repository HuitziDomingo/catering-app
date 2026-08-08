import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/api-config';

/** Forma de respuesta de /auth/register, /auth/login y /auth/refresh (AuthTokensDto). */
export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
}

/** Forma de respuesta de /auth/me (MeResponseDto): el payload del access token vigente. */
export interface AuthenticatedIdentity {
  readonly sub: string;
  readonly email: string;
  readonly role: string;
}

export interface LoginPayload {
  readonly email: string;
  readonly password: string;
}

export interface RegisterPayload {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly phone?: string | null;
}

/**
 * Capa data-access del feature de auth (ver ADR-020, ADR-010). Llama a los
 * cuatro endpoints reales de apps/api/src/auth/auth.controller.ts. A
 * diferencia del equivalente en mobile (authDataAccess.ts, que adjunta el
 * token a mano por request), acá el token lo adjunta authInterceptor (ver
 * core/auth/) a toda request saliente, así que me() no lo recibe por
 * parámetro.
 */
@Injectable({ providedIn: 'root' })
export class AuthDataAccessService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/auth`;

  login(payload: LoginPayload): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.baseUrl}/login`, payload);
  }

  register(payload: RegisterPayload): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.baseUrl}/register`, payload);
  }

  refresh(refreshToken: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.baseUrl}/refresh`, { refreshToken });
  }

  me(): Observable<AuthenticatedIdentity> {
    return this.http.get<AuthenticatedIdentity>(`${this.baseUrl}/me`);
  }
}
