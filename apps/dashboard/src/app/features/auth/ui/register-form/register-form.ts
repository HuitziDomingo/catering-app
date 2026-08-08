import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiInput } from '@taiga-ui/core';

export interface RegisterFormValue {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly phone: string | null;
}

/**
 * Componente de presentación pura (sin lógica de negocio), vive en ui/
 * según ADR-020. Validaciones alineadas con RegisterDto en la API
 * (fullName maxLength 150, email maxLength 255, password 8-72).
 */
@Component({
  selector: 'app-register-form',
  imports: [ReactiveFormsModule, TuiButton, TuiInput],
  templateUrl: './register-form.html',
  styleUrl: './register-form.scss',
})
export class RegisterForm {
  private readonly fb = inject(FormBuilder);

  readonly pending = input(false);
  readonly error = input<string | null>(null);
  readonly submitted = output<RegisterFormValue>();

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    phone: ['', Validators.maxLength(30)],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.submitted.emit({
      fullName: value.fullName,
      email: value.email,
      password: value.password,
      phone: value.phone || null,
    });
  }
}
