import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RoleName } from '@catering-app/shared-types';
import {
  login as apiLogin,
  register as apiRegister,
  refresh as apiRefresh,
  me as apiMe,
  type AuthTokens,
  type LoginPayload,
  type RegisterPayload,
} from '../data-access/authDataAccess';
import { extractErrorMessage } from '../../../core/http/extractErrorMessage';

export type SessionUser = {
  id: string;
  email: string;
  role: RoleName;
};

export type AuthStatus = 'idle' | 'loading' | 'error';

export type SessionState = {
  // true mientras zustand/persist rehidrata los tokens guardados y (si hay
  // alguno) se recarga el usuario vía /auth/me al arrancar la app -- las
  // pantallas que dependen de isAuthenticated deben esperar a que esto sea
  // false antes de decidir si mostrar login o contenido real, para no
  // parpadear "inicia sesión" antes de que la rehidratación termine.
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  user: SessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  authStatus: AuthStatus;
  authError: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  /** Solo refresca los tokens -- lo usan core/http/apiClient.ts y mcpClient.ts, no dispara /me. */
  refreshSession: () => Promise<AuthTokens>;
  logout: () => void;
};

/**
 * Estado del feature de auth (ver ADR-020) manejado con Zustand, reemplaza
 * por completo al toggle de desarrollo anterior. accessToken/refreshToken se
 * persisten en AsyncStorage (mismo patrón que useThemeStore) para que cerrar
 * y reabrir la app no cierre la sesión.
 *
 * user NO se persiste: se recarga desde GET /auth/me (fuente única de
 * verdad) cada vez que hay tokens nuevos o al arrancar la app si ya había un
 * accessToken guardado -- mismo diseño que AuthStateService en dashboard. Esa
 * misma llamada a /me al arrancar sirve como verificación implícita de que
 * el token siga siendo válido: si expiró, el interceptor de
 * core/http/apiClient.ts intenta refrescarlo antes de rendirse.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      isBootstrapping: true,
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      authStatus: 'idle',
      authError: null,

      async login(payload) {
        set({ authStatus: 'loading', authError: null });
        try {
          const tokens = await apiLogin(payload);
          set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
          await loadCurrentUser(set);
          set({ authStatus: 'idle' });
        } catch (err) {
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            authStatus: 'error',
            authError: extractErrorMessage(err),
          });
          throw err;
        }
      },

      async register(payload) {
        set({ authStatus: 'loading', authError: null });
        try {
          const tokens = await apiRegister(payload);
          set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
          await loadCurrentUser(set);
          set({ authStatus: 'idle' });
        } catch (err) {
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            authStatus: 'error',
            authError: extractErrorMessage(err),
          });
          throw err;
        }
      },

      async refreshSession() {
        const refreshToken = get().refreshToken;
        if (!refreshToken) {
          throw new Error('No hay refresh token disponible.');
        }
        const tokens = await apiRefresh(refreshToken);
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
        return tokens;
      },

      logout() {
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          authStatus: 'idle',
          authError: null,
        });
      },
    }),
    {
      name: 'session-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // isAuthenticated/user/authStatus/authError son estado derivado o
      // transitorio de UI -- no tiene sentido persistirlos, se recalculan al
      // rehidratar (ver onRehydrateStorage) o al iniciar sesión de nuevo.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.accessToken) {
          useSessionStore.setState({ isBootstrapping: false });
          return;
        }
        loadCurrentUser(useSessionStore.setState)
          .catch(() => {
            useSessionStore.setState({
              isAuthenticated: false,
              user: null,
              accessToken: null,
              refreshToken: null,
            });
          })
          .finally(() => useSessionStore.setState({ isBootstrapping: false }));
      },
    },
  ),
);

async function loadCurrentUser(set: (partial: Partial<SessionState>) => void): Promise<void> {
  const identity = await apiMe();
  set({
    isAuthenticated: true,
    user: { id: identity.sub, email: identity.email, role: identity.role as RoleName },
  });
}
