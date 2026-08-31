import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTaiga } from '@taiga-ui/core';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthStateService } from './features/auth/state/auth-state.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTaiga(),
    // Restaura la sesión (GET /auth/me) antes de renderizar nada -- ver
    // AuthStateService.restoreSession() para por qué esto no puede vivir en
    // el constructor del servicio (NG0200, dependencia circular con
    // authInterceptor). El bootstrap espera a que este observable complete.
    provideAppInitializer(() => inject(AuthStateService).restoreSession()),
  ],
};
