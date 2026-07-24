import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'dev-auth-token';

/**
 * TEMPORAL: sustituye una pantalla de login real, que todavía no existe en
 * el dashboard. Permite pegar a mano un JWT de staff/admin/superadmin para
 * poder probar los endpoints de escritura del menú en local. Eliminar
 * cuando exista una pantalla de login real.
 */
@Injectable({ providedIn: 'root' })
export class DevTokenStore {
  private readonly _token = signal<string | null>(
    typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY),
  );
  readonly token = this._token.asReadonly();

  setToken(token: string): void {
    const trimmed = token.trim();
    this._token.set(trimmed || null);
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  clearToken(): void {
    this._token.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }
}
