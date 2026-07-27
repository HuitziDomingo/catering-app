import { RoleName } from '@catering-app/shared-types';
import { useSessionStore } from './useSessionStore';

beforeEach(() => {
  useSessionStore.setState({ isAuthenticated: false, user: null });
});

test('starts signed out with no user', () => {
  expect(useSessionStore.getState().isAuthenticated).toBe(false);
  expect(useSessionStore.getState().user).toBeNull();
});

test('devLogin signs in a mock user', () => {
  useSessionStore.getState().devLogin();

  const { isAuthenticated, user } = useSessionStore.getState();
  expect(isAuthenticated).toBe(true);
  expect(user).not.toBeNull();
  expect(user?.fullName).toBeTruthy();
  expect(user?.email).toBeTruthy();
  expect(Object.values(RoleName)).toContain(user?.role);
});

test('devLogout signs out and clears the user', () => {
  useSessionStore.getState().devLogin();
  useSessionStore.getState().devLogout();

  expect(useSessionStore.getState().isAuthenticated).toBe(false);
  expect(useSessionStore.getState().user).toBeNull();
});
