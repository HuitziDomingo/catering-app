import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RoleName } from '@catering-app/shared-types';
import { AuthStateService, DASHBOARD_ACCESS_DENIED_MESSAGE } from '../../state/auth-state.service';
import type { LoginFormValue } from '../../ui/login-form/login-form';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let auth: { login: jest.Mock };

  const credentials: LoginFormValue = { email: 'user@example.com', password: 'secret123' };

  const createFixture = () => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        // Ruta stub: LoginForm/RouterLink necesitan un Router real inicializado
        // (ActivatedRoute + estado interno), pero solo /menu debe existir para
        // que navigateByUrl('/menu') resuelva sin lanzar NG04002.
        provideRouter([{ path: 'menu', children: [] }]),
        { provide: AuthStateService, useValue: auth },
      ],
    });
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return fixture;
  };

  const submit = (fixture: ReturnType<typeof createFixture>, value: LoginFormValue) => {
    (fixture.componentInstance as unknown as { onSubmit: (v: LoginFormValue) => void }).onSubmit(
      value,
    );
    fixture.detectChanges();
  };

  beforeEach(() => {
    auth = { login: jest.fn() };
  });

  it('navigates to /menu when the login succeeds (admin/superadmin role)', () => {
    auth.login.mockReturnValue(
      of({ id: 'u1', email: credentials.email, role: RoleName.ADMIN }),
    );
    const fixture = createFixture();
    const navigateSpy = jest.spyOn(TestBed.inject(Router), 'navigateByUrl');

    submit(fixture, credentials);

    expect(auth.login).toHaveBeenCalledWith(credentials);
    expect(navigateSpy).toHaveBeenCalledWith('/menu');
    expect(fixture.nativeElement.querySelector('[data-testid="login-error"]')).toBeNull();
  });

  it('shows the access-denied message and stays on the login screen when the role is rejected', () => {
    auth.login.mockReturnValue(throwError(() => new Error(DASHBOARD_ACCESS_DENIED_MESSAGE)));
    const fixture = createFixture();
    const navigateSpy = jest.spyOn(TestBed.inject(Router), 'navigateByUrl');

    submit(fixture, credentials);

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('[data-testid="login-error"]').textContent,
    ).toContain(DASHBOARD_ACCESS_DENIED_MESSAGE);
  });
});
