import { TestBed } from '@angular/core/testing';
import { DASHBOARD_ACCESS_DENIED_MESSAGE } from '../../state/auth-state.service';
import { LoginForm, type LoginFormValue } from './login-form';

describe('LoginForm', () => {
  const createFixture = () => {
    TestBed.configureTestingModule({ imports: [LoginForm] });
    const fixture = TestBed.createComponent(LoginForm);
    fixture.detectChanges();
    return fixture;
  };

  const setValue = (fixture: ReturnType<typeof createFixture>, testId: string, value: string) => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      `[data-testid="${testId}"]`,
    );
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('does not emit and marks fields touched when submitted while invalid', () => {
    const fixture = createFixture();
    const submitted = jest.fn();
    fixture.componentInstance.submitted.subscribe(submitted);

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="email-error"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="password-error"]')).not.toBeNull();
  });

  it('emits the email/password once the form is valid', () => {
    const fixture = createFixture();
    let emitted: LoginFormValue | undefined;
    fixture.componentInstance.submitted.subscribe((value) => (emitted = value));

    setValue(fixture, 'email-input', 'admin@example.com');
    setValue(fixture, 'password-input', 'secret123');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(emitted).toEqual({ email: 'admin@example.com', password: 'secret123' });
  });

  it('disables the submit button while pending', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('pending', true);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="submit-button"]',
    );
    expect(button.disabled).toBe(true);
  });

  // Cubre el mensaje de rechazo por rol (ver AuthStateService.login()):
  // login-form solo es responsable de mostrar el string recibido como
  // input, la decisión de rechazar el login vive en auth-state.service.
  it('shows the dashboard-access-denied message when passed as the error input', () => {
    const fixture = createFixture();
    fixture.componentRef.setInput('error', DASHBOARD_ACCESS_DENIED_MESSAGE);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="login-error"]').textContent,
    ).toContain(DASHBOARD_ACCESS_DENIED_MESSAGE);
  });
});
