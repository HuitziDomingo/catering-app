import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { extractErrorMessage } from '../../../../core/http/extract-error-message';
import { AuthStateService } from '../../state/auth-state.service';
import { LoginForm, type LoginFormValue } from '../../ui/login-form/login-form';

/** Pantalla real de login (ver ADR-020): conecta ui/login-form con state/auth-state.service. */
@Component({
  selector: 'app-login-page',
  imports: [LoginForm, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthStateService);
  private readonly router = inject(Router);

  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected onSubmit(value: LoginFormValue): void {
    this.pending.set(true);
    this.error.set(null);
    this.auth.login(value).subscribe({
      next: () => {
        this.pending.set(false);
        this.router.navigateByUrl('/menu');
      },
      error: (err: unknown) => {
        this.pending.set(false);
        this.error.set(extractErrorMessage(err));
      },
    });
  }
}
