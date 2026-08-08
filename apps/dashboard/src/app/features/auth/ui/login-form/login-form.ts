import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiInput } from '@taiga-ui/core';

export interface LoginFormValue {
  readonly email: string;
  readonly password: string;
}

/**
 * Componente de presentación pura (sin lógica de negocio), vive en ui/
 * según ADR-020. El feature/ (login-page) decide qué hacer con el valor
 * emitido y le pasa de vuelta pending/error.
 */
@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule, TuiButton, TuiInput],
  templateUrl: './login-form.html',
  styleUrl: './login-form.scss',
})
export class LoginForm {
  private readonly fb = inject(FormBuilder);

  readonly pending = input(false);
  readonly error = input<string | null>(null);
  readonly submitted = output<LoginFormValue>();

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue());
  }
}
