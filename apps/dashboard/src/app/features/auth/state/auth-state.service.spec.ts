import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RoleName } from '@catering-app/shared-types';
import { authInterceptor } from '../../../core/auth/auth.interceptor';
import { AuthDataAccessService } from '../data-access/auth-data-access.service';
import {
  AuthStateService,
  DASHBOARD_ACCESS_DENIED_MESSAGE,
} from './auth-state.service';

const identity = { sub: 'user-1', email: 'admin@example.com', role: RoleName.ADMIN };
const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

describe('AuthStateService', () => {
  let dataAccess: {
    login: jest.Mock;
    register: jest.Mock;
    refresh: jest.Mock;
    me: jest.Mock;
  };

  const createService = () => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthDataAccessService, useValue: dataAccess }],
    });
    return TestBed.inject(AuthStateService);
  };

  beforeEach(() => {
    localStorage.clear();
    dataAccess = {
      login: jest.fn(),
      register: jest.fn(),
      refresh: jest.fn(),
      me: jest.fn().mockReturnValue(of(identity)),
    };
  });

  describe('login()', () => {
    it('resolves with the user and keeps the session when the role has dashboard access', () => {
      dataAccess.login.mockReturnValue(of(tokens));
      const auth = createService();

      let result: unknown;
      auth.login({ email: identity.email, password: 'x' }).subscribe((user) => (result = user));

      expect(result).toEqual({ id: 'user-1', email: identity.email, role: RoleName.ADMIN });
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.user()?.role).toBe(RoleName.ADMIN);
    });

    it.each([RoleName.CUSTOMER, RoleName.STAFF])(
      'rejects the login and clears the session when the role is %s',
      (role) => {
        dataAccess.login.mockReturnValue(of(tokens));
        dataAccess.me.mockReturnValue(of({ ...identity, role }));
        const auth = createService();

        let error: unknown;
        auth.login({ email: identity.email, password: 'x' }).subscribe({
          error: (err) => (error = err),
        });

        expect((error as Error).message).toBe(DASHBOARD_ACCESS_DENIED_MESSAGE);
        expect(auth.isAuthenticated()).toBe(false);
        expect(auth.user()).toBeNull();
        expect(localStorage.getItem('auth-access-token')).toBeNull();
      },
    );
  });

  describe('restoreSession()', () => {
    it('resolves to null and makes no request when there is no stored token', () => {
      const auth = createService();

      let result: unknown = 'not-called';
      auth.restoreSession().subscribe((value) => (result = value));

      expect(result).toBeNull();
      expect(dataAccess.me).not.toHaveBeenCalled();
    });

    it('calls GET /auth/me and restores the user (including role) when a token is stored', () => {
      localStorage.setItem('auth-access-token', 'stored-access-token');
      localStorage.setItem('auth-refresh-token', 'stored-refresh-token');
      dataAccess.me.mockReturnValue(of(identity));
      const auth = createService();

      let result: unknown;
      auth.restoreSession().subscribe((value) => (result = value));

      expect(dataAccess.me).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'user-1', email: identity.email, role: RoleName.ADMIN });
      expect(auth.user()).toEqual({ id: 'user-1', email: identity.email, role: RoleName.ADMIN });
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('clears the session and resolves to null when the stored token is no longer valid', () => {
      localStorage.setItem('auth-access-token', 'stored-access-token');
      localStorage.setItem('auth-refresh-token', 'stored-refresh-token');
      dataAccess.me.mockReturnValue(throwError(() => new Error('401')));
      const auth = createService();

      let result: unknown = 'not-called';
      auth.restoreSession().subscribe((value) => (result = value));

      expect(result).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.user()).toBeNull();
      expect(localStorage.getItem('auth-access-token')).toBeNull();
    });
  });

  // Regresión: AuthStateService solía disparar loadCurrentUser() desde su
  // propio constructor cuando ya había un accessToken guardado. Eso hacía
  // que HttpClient pasara la request de /auth/me por authInterceptor, que
  // a su vez llama inject(AuthStateService) -- como la instancia todavía
  // estaba a medio construir en ese momento, Angular tiraba NG0200
  // (dependencia circular) de forma síncrona, y un `.subscribe({ error: ()
  // => undefined })` se tragaba el error sin dejar rastro: el token seguía
  // en localStorage (isAuthenticated true) pero user()/role se perdía para
  // siempre tras un hard reload. Este bloque usa el HttpClient + interceptor
  // reales (no un mock de AuthDataAccessService) para probar la ruta
  // completa que reprodujo el bug.
  describe('restoreSession() wired through the real HttpClient + authInterceptor', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideHttpClient(withInterceptors([authInterceptor])),
          provideHttpClientTesting(),
        ],
      });
    });

    it('does not throw a circular-dependency error and restores the user from /auth/me', () => {
      localStorage.setItem('auth-access-token', 'stored-access-token');
      localStorage.setItem('auth-refresh-token', 'stored-refresh-token');

      // La instanciación en sí (inject) no debe lanzar NG0200 -- restoreSession()
      // se llama explícitamente después, no desde el constructor.
      const auth = TestBed.inject(AuthStateService);
      expect(auth.user()).toBeNull();

      let result: unknown;
      auth.restoreSession().subscribe((value) => (result = value));

      const httpMock = TestBed.inject(HttpTestingController);
      const req = httpMock.expectOne((r) => r.url.includes('/auth/me'));
      expect(req.request.headers.get('Authorization')).toBe('Bearer stored-access-token');
      req.flush(identity);

      expect(result).toEqual({ id: 'user-1', email: identity.email, role: RoleName.ADMIN });
      expect(auth.user()).toEqual({ id: 'user-1', email: identity.email, role: RoleName.ADMIN });
      httpMock.verify();
    });
  });
});
