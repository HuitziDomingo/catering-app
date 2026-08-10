import { apiClient } from '../../../core/http/apiClient';

// Capa data-access del feature de auth (ver ADR-020, ADR-010). Llama a los
// cuatro endpoints reales de apps/api/src/auth/auth.controller.ts -- mismos
// tipos/forma que apps/dashboard/src/app/features/auth/data-access/
// auth-data-access.service.ts. El accessToken lo adjunta el interceptor de
// core/http/apiClient.ts a toda request saliente, así que me() no lo recibe
// por parámetro (a diferencia de la versión anterior de este archivo, que
// vivía en features/session y sí lo pedía a mano).

/** Forma de respuesta de /auth/register, /auth/login y /auth/refresh (AuthTokensDto). */
export type AuthTokens = {
  readonly accessToken: string;
  readonly refreshToken: string;
};

/** Forma de respuesta de /auth/me (MeResponseDto): el payload del access token vigente. */
export type AuthenticatedIdentity = {
  readonly sub: string;
  readonly email: string;
  readonly role: string;
};

export type LoginPayload = {
  readonly email: string;
  readonly password: string;
};

export type RegisterPayload = {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly phone?: string | null;
};

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/login', payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/register', payload);
  return data;
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/refresh', { refreshToken });
  return data;
}

export async function me(): Promise<AuthenticatedIdentity> {
  const { data } = await apiClient.get<AuthenticatedIdentity>('/auth/me');
  return data;
}
