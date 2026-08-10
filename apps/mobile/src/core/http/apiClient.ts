import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useSessionStore } from '../../features/auth/state/useSessionStore';
import { notifySessionExpired } from './sessionExpiry';

// Instancia HTTP única compartida entre features (auth, menu -- ver
// authDataAccess.ts y menuDataAccess.ts). Antes cada feature duplicaba su
// propio apiClient.ts a propósito (ver ADR-020), pero el interceptor de
// refresh necesita ser uno solo: con instancias separadas, un 401 en menú no
// dispararía el mismo refresh que uno en auth, y ambas terminarían pisándose
// el token guardado. Mismo rol que core/auth/auth.interceptor.ts en
// dashboard, adaptado a los interceptors de axios (RN no tiene el
// HttpInterceptorFn de Angular). mcpClient.ts no usa esta instancia (necesita
// fetch crudo para leer la respuesta SSE) pero replica la misma lógica de
// retry -- ver ese archivo.
const DEFAULT_API_URL = 'http://localhost:3000/api';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

export const apiClient = axios.create({ baseURL: API_BASE_URL });

/** Rutas de auth que nunca deben disparar un intento de refresh si fallan con 401 (ver auth.interceptor.ts en dashboard). */
const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/refresh'];

function isAuthRoute(url?: string): boolean {
  return !!url && AUTH_ROUTES.some((path) => url.includes(path));
}

apiClient.interceptors.request.use((config) => {
  const token = useSessionStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/**
 * Si una request responde 401 (y no es a un endpoint de auth -- login/
 * register/refresh fallando con 401 es "credenciales inválidas", no "sesión
 * expirada"), intenta refrescar el access token una vez y reintenta la
 * request original. Si el refresh también falla, limpia la sesión y manda a
 * /login. Reemplaza por completo al toggle de auth temporal (useSessionStore
 * dev scaffolding).
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;

    if (error.response?.status !== 401 || !config || config._retried || isAuthRoute(config.url)) {
      return Promise.reject(error);
    }

    config._retried = true;
    try {
      const tokens = await useSessionStore.getState().refreshSession();
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return apiClient(config);
    } catch (refreshError) {
      useSessionStore.getState().logout();
      notifySessionExpired();
      return Promise.reject(refreshError);
    }
  },
);
