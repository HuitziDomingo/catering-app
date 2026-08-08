import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { AuthStateService } from '../../features/auth/state/auth-state.service';

/**
 * Componente de presentación, vive en core/ igual que theme-toggle (ver
 * ADR-020: infraestructura transversal, no un feature de negocio). Solo
 * visible cuando hay sesión iniciada -- lo decide app.html con @if.
 */
@Component({
  selector: 'app-logout-button',
  imports: [TuiButton],
  templateUrl: './logout-button.html',
  styleUrl: './logout-button.scss',
})
export class LogoutButton {
  private readonly auth = inject(AuthStateService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
