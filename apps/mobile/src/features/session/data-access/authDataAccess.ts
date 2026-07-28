import { apiClient } from './apiClient';

// Capa data-access del feature de sesión (ver ADR-020). POST /auth/login,
// POST /auth/register y GET /auth/me son los mismos endpoints reales que
// usarán las futuras pantallas de login -- ver useSessionStore.ts para el
// porqué se invocan aquí desde un toggle de desarrollo en vez de un
// formulario real.

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthenticatedIdentity = {
  sub: string;
  email: string;
  role: string;
};

export async function login(email: string, password: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/login', { email, password });
  return data;
}

export async function register(payload: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>('/auth/register', payload);
  return data;
}

/** GET /auth/me: payload del JWT actual (sub/email/role) -- ver auth.controller.ts. */
export async function getMe(accessToken: string): Promise<AuthenticatedIdentity> {
  const { data } = await apiClient.get<AuthenticatedIdentity>('/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}
