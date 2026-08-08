import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { extractErrorMessage } from '../../../../core/http/extract-error-message';
import { AuthStateService } from '../../state/auth-state.service';
import { RegisterForm, type RegisterFormValue } from '../../ui/register-form/register-form';

/**
 * Pantalla real de registro (ver ADR-020): conecta ui/register-form con
 * state/auth-state.service. /auth/register ya devuelve tokens (igual que
 * /auth/login), así que registrarse deja al usuario con sesión iniciada.
 */
@Component({
  selector: 'app-register-page',
  imports: [RegisterForm, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
})
export class RegisterPage {
  private readonly auth = inject(AuthStateService);
  private readonly router = inject(Router);

  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected onSubmit(value: RegisterFormValue): void {
    this.pending.set(true);
    this.error.set(null);
    this.auth.register(value).subscribe({
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
