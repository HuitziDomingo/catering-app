import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { RoleName } from '@catering-app/shared-types';
import { AuthStateService } from '../../features/auth/state/auth-state.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let auth: { isAuthenticated: jest.Mock; user: jest.Mock; clearSession: jest.Mock };
  let router: Router;

  const runGuard = () =>
    TestBed.runInInjectionContext(() =>
      // CanActivateFn expects (route, state); the guard under test ignores both.
      (authGuard as (...args: unknown[]) => boolean | UrlTree)(),
    );

  beforeEach(() => {
    auth = {
      isAuthenticated: jest.fn().mockReturnValue(false),
      user: jest.fn().mockReturnValue(null),
      clearSession: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthStateService, useValue: auth }],
    });
    router = TestBed.inject(Router);
  });

  it('redirects to /login when there is no session', () => {
    const result = runGuard();

    expect(result).toEqual(router.createUrlTree(['/login']));
    expect(auth.clearSession).not.toHaveBeenCalled();
  });

  it.each([RoleName.ADMIN, RoleName.SUPERADMIN])('allows access for role %s', (role) => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.user.mockReturnValue({ id: 'u1', email: 'a@a.com', role });

    expect(runGuard()).toBe(true);
    expect(auth.clearSession).not.toHaveBeenCalled();
  });

  it.each([RoleName.CUSTOMER, RoleName.STAFF])(
    'clears the session and redirects to /login for role %s (defense in depth)',
    (role) => {
      auth.isAuthenticated.mockReturnValue(true);
      auth.user.mockReturnValue({ id: 'u1', email: 'a@a.com', role });

      const result = runGuard();

      expect(result).toEqual(router.createUrlTree(['/login']));
      expect(auth.clearSession).toHaveBeenCalledTimes(1);
    },
  );

  it('clears the session and redirects when authenticated but the user is not loaded yet', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.user.mockReturnValue(null);

    const result = runGuard();

    expect(result).toEqual(router.createUrlTree(['/login']));
    expect(auth.clearSession).toHaveBeenCalledTimes(1);
  });
});
