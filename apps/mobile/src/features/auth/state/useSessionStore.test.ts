import AsyncStorage from '@react-native-async-storage/async-storage';
import { RoleName } from '@catering-app/shared-types';
import { useSessionStore } from './useSessionStore';
import { login, register, refresh, me } from '../data-access/authDataAccess';

// AsyncStorage is mocked via jest.config.cts moduleNameMapper (the package's
// own documented in-memory mock) -- no native module bindings needed here.
jest.mock('../data-access/authDataAccess');

const mockTokens = { accessToken: 'access-123', refreshToken: 'refresh-123' };
const mockIdentity = { sub: 'user-1', email: 'cliente@example.com', role: 'customer' };

beforeEach(async () => {
  await AsyncStorage.clear();
  useSessionStore.setState({
    isBootstrapping: false,
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    authStatus: 'idle',
    authError: null,
  });
  jest.clearAllMocks();
});

test('starts signed out with no user or tokens', () => {
  const state = useSessionStore.getState();
  expect(state.isAuthenticated).toBe(false);
  expect(state.user).toBeNull();
  expect(state.accessToken).toBeNull();
  expect(state.refreshToken).toBeNull();
});

describe('login', () => {
  test('logs in, loads the current user from /auth/me, and stores the real tokens', async () => {
    (login as jest.Mock).mockResolvedValue(mockTokens);
    (me as jest.Mock).mockResolvedValue(mockIdentity);

    await useSessionStore.getState().login({ email: mockIdentity.email, password: 'secret123' });

    const state = useSessionStore.getState();
    expect(login).toHaveBeenCalledWith({ email: mockIdentity.email, password: 'secret123' });
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('access-123');
    expect(state.refreshToken).toBe('refresh-123');
    expect(state.user).toEqual({ id: 'user-1', email: mockIdentity.email, role: RoleName.CUSTOMER });
    expect(state.authStatus).toBe('idle');
    expect(state.authError).toBeNull();
  });

  test('sets an error status and clears the session when credentials are invalid', async () => {
    (login as jest.Mock).mockRejectedValue(new Error('Credenciales inválidas.'));

    await expect(
      useSessionStore.getState().login({ email: 'x@example.com', password: 'wrong' }),
    ).rejects.toThrow('Credenciales inválidas.');

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.authStatus).toBe('error');
    expect(state.authError).toBe('Credenciales inválidas.');
    expect(me).not.toHaveBeenCalled();
  });
});

describe('register', () => {
  test('registers, loads the current user, and stores the real tokens', async () => {
    (register as jest.Mock).mockResolvedValue(mockTokens);
    (me as jest.Mock).mockResolvedValue(mockIdentity);

    await useSessionStore.getState().register({
      fullName: 'Cliente de Prueba',
      email: mockIdentity.email,
      password: 'secret123',
    });

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('access-123');
    expect(state.user).toEqual({ id: 'user-1', email: mockIdentity.email, role: RoleName.CUSTOMER });
  });

  test('sets an error status when the email is already registered', async () => {
    (register as jest.Mock).mockRejectedValue(new Error('El email ya está registrado.'));

    await expect(
      useSessionStore.getState().register({
        fullName: 'Cliente de Prueba',
        email: mockIdentity.email,
        password: 'secret123',
      }),
    ).rejects.toThrow('El email ya está registrado.');

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.authStatus).toBe('error');
    expect(state.authError).toBe('El email ya está registrado.');
  });
});

describe('refreshSession', () => {
  test('refreshes and stores the new tokens', async () => {
    useSessionStore.setState({ accessToken: 'old-access', refreshToken: 'old-refresh' });
    (refresh as jest.Mock).mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' });

    const tokens = await useSessionStore.getState().refreshSession();

    expect(refresh).toHaveBeenCalledWith('old-refresh');
    expect(tokens).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    expect(useSessionStore.getState().accessToken).toBe('new-access');
    expect(useSessionStore.getState().refreshToken).toBe('new-refresh');
  });

  test('throws without calling the API when there is no refresh token', async () => {
    await expect(useSessionStore.getState().refreshSession()).rejects.toThrow(
      'No hay refresh token disponible.',
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});

test('logout signs out and clears the user and tokens', async () => {
  (login as jest.Mock).mockResolvedValue(mockTokens);
  (me as jest.Mock).mockResolvedValue(mockIdentity);
  await useSessionStore.getState().login({ email: mockIdentity.email, password: 'secret123' });

  useSessionStore.getState().logout();

  const state = useSessionStore.getState();
  expect(state.isAuthenticated).toBe(false);
  expect(state.user).toBeNull();
  expect(state.accessToken).toBeNull();
  expect(state.refreshToken).toBeNull();
});

describe('persistence', () => {
  test('persists only the tokens to storage, not the user or auth status', async () => {
    (login as jest.Mock).mockResolvedValue(mockTokens);
    (me as jest.Mock).mockResolvedValue(mockIdentity);

    await useSessionStore.getState().login({ email: mockIdentity.email, password: 'secret123' });
    await waitForStorageWrite();

    const stored = JSON.parse((await AsyncStorage.getItem('session-auth')) as string);
    expect(stored.state).toEqual({ accessToken: 'access-123', refreshToken: 'refresh-123' });
  });

  test('rehydrating with a saved token reloads the user from /auth/me', async () => {
    await AsyncStorage.setItem(
      'session-auth',
      JSON.stringify({ state: { accessToken: 'access-123', refreshToken: 'refresh-123' }, version: 0 }),
    );
    (me as jest.Mock).mockResolvedValue(mockIdentity);

    await useSessionStore.persist.rehydrate();
    await waitForStorageWrite();

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual({ id: 'user-1', email: mockIdentity.email, role: RoleName.CUSTOMER });
    expect(state.isBootstrapping).toBe(false);
  });

  test('rehydrating with a saved token that /auth/me rejects clears the session', async () => {
    await AsyncStorage.setItem(
      'session-auth',
      JSON.stringify({ state: { accessToken: 'stale-access', refreshToken: 'stale-refresh' }, version: 0 }),
    );
    (me as jest.Mock).mockRejectedValue(new Error('No autorizado.'));

    await useSessionStore.persist.rehydrate();
    await waitForStorageWrite();

    const state = useSessionStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.isBootstrapping).toBe(false);
  });
});

// zustand's persist middleware writes to storage asynchronously after a
// state change; flush pending microtasks before asserting on it.
function waitForStorageWrite() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
