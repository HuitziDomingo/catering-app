import { RoleName } from '@catering-app/shared-types';
import { useSessionStore } from './useSessionStore';
import { getMe, login, register } from '../data-access/authDataAccess';

jest.mock('../data-access/authDataAccess');

const mockTokens = { accessToken: 'access-123', refreshToken: 'refresh-123' };
const mockIdentity = {
  sub: 'user-1',
  email: 'chat-dev-tester@example.com',
  role: 'customer',
};

beforeEach(() => {
  useSessionStore.setState({
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

test('devLogin logs in against the dev test account and stores the real tokens', async () => {
  (login as jest.Mock).mockResolvedValue(mockTokens);
  (getMe as jest.Mock).mockResolvedValue(mockIdentity);

  await useSessionStore.getState().devLogin();

  const state = useSessionStore.getState();
  expect(state.isAuthenticated).toBe(true);
  expect(state.accessToken).toBe('access-123');
  expect(state.refreshToken).toBe('refresh-123');
  expect(state.user).toEqual({
    id: 'user-1',
    fullName: expect.any(String),
    email: mockIdentity.email,
    role: RoleName.CUSTOMER,
  });
  expect(state.authStatus).toBe('idle');
  expect(register).not.toHaveBeenCalled();
});

test('devLogin registers the dev test account when it does not exist yet', async () => {
  (login as jest.Mock).mockRejectedValue(new Error('Credenciales inválidas.'));
  (register as jest.Mock).mockResolvedValue(mockTokens);
  (getMe as jest.Mock).mockResolvedValue(mockIdentity);

  await useSessionStore.getState().devLogin();

  expect(register).toHaveBeenCalledTimes(1);
  expect(useSessionStore.getState().isAuthenticated).toBe(true);
  expect(useSessionStore.getState().accessToken).toBe('access-123');
});

test('devLogin sets an error status when both login and register fail', async () => {
  (login as jest.Mock).mockRejectedValue(new Error('down'));
  (register as jest.Mock).mockRejectedValue(new Error('Network down'));

  await useSessionStore.getState().devLogin();

  const state = useSessionStore.getState();
  expect(state.isAuthenticated).toBe(false);
  expect(state.accessToken).toBeNull();
  expect(state.authStatus).toBe('error');
  expect(state.authError).toBe('Network down');
});

test('devLogout signs out and clears the user and tokens', async () => {
  (login as jest.Mock).mockResolvedValue(mockTokens);
  (getMe as jest.Mock).mockResolvedValue(mockIdentity);
  await useSessionStore.getState().devLogin();

  useSessionStore.getState().devLogout();

  const state = useSessionStore.getState();
  expect(state.isAuthenticated).toBe(false);
  expect(state.user).toBeNull();
  expect(state.accessToken).toBeNull();
  expect(state.refreshToken).toBeNull();
});
