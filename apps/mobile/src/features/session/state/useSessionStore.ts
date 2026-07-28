import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RoleName } from '@catering-app/shared-types';
import { getMe, login, register } from '../data-access/authDataAccess';

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: RoleName;
};

export type AuthStatus = 'idle' | 'loading' | 'error';

export type SessionState = {
  isAuthenticated: boolean;
  user: SessionUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  authStatus: AuthStatus;
  authError: string | null;
  devLogin: () => Promise<void>;
  devLogout: () => void;
};

// Andamiaje temporal (ver ADR-020): no hay pantallas de login/registro
// reales todavía, así que este toggle hace un login REAL (o registro, si la
// cuenta de prueba no existe todavía en este ambiente) contra una cuenta de
// prueba fija, en vez de solo simular el estado localmente. Mismo espíritu
// que el DevTokenStore del dashboard (banner de auth temporal para probar
// el CRUD de menú) -- se reemplaza por completo cuando existan pantallas de
// login/registro reales. accessToken/refreshToken son los JWT reales
// emitidos por la API; se persisten via AsyncStorage (no expo-secure-store
// todavía -- eso es parte del trabajo de auth real más adelante).
const DEV_TEST_CUSTOMER = {
  email: 'chat-dev-tester@example.com',
  password: 'DevChatTester123!',
  fullName: 'Cliente de Prueba (Dev)',
};

async function loginOrRegisterDevTestCustomer() {
  try {
    return await login(DEV_TEST_CUSTOMER.email, DEV_TEST_CUSTOMER.password);
  } catch {
    // La cuenta de prueba no existe todavía en este ambiente -- se crea.
    // register() ya devuelve tokens, no hace falta un login adicional.
    return await register(DEV_TEST_CUSTOMER);
  }
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      authStatus: 'idle',
      authError: null,
      async devLogin() {
        set({ authStatus: 'loading', authError: null });
        try {
          const tokens = await loginOrRegisterDevTestCustomer();
          const me = await getMe(tokens.accessToken);
          set({
            isAuthenticated: true,
            user: {
              id: me.sub,
              fullName: DEV_TEST_CUSTOMER.fullName,
              email: me.email,
              role: me.role as RoleName,
            },
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            authStatus: 'idle',
            authError: null,
          });
        } catch (err) {
          set({
            authStatus: 'error',
            authError:
              err instanceof Error ? err.message : 'No se pudo iniciar sesión.',
          });
        }
      },
      devLogout() {
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
      name: 'session-dev-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // authStatus/authError son estado transitorio de UI -- no tiene
      // sentido persistirlos entre reinicios de la app.
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
