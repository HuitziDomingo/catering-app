import { create } from 'zustand';
import { RoleName } from '@catering-app/shared-types';

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  role: RoleName;
};

export type SessionState = {
  isAuthenticated: boolean;
  user: SessionUser | null;
  devLogin: () => void;
  devLogout: () => void;
};

// Andamiaje temporal: no hay pantallas de login reales todavía, así que este
// store solo define la forma que consumirán las pantallas de Perfil/Chat
// (ver tarea "navigation shell"). devLogin/devLogout y MOCK_USER se
// reemplazan por completo cuando se construya el login real con JWT
// (ver menuDataAccess.ts para el cliente axios que ya existe).
const MOCK_USER: SessionUser = {
  id: 'mock-user-id',
  fullName: 'Ana Torres',
  email: 'ana.torres@example.com',
  role: RoleName.CUSTOMER,
};

export const useSessionStore = create<SessionState>((set) => ({
  isAuthenticated: false,
  user: null,
  devLogin() {
    set({ isAuthenticated: true, user: MOCK_USER });
  },
  devLogout() {
    set({ isAuthenticated: false, user: null });
  },
}));
