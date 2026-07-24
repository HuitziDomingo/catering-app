import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { MenuItem } from '@catering-app/shared-types';

/**
 * Shell de la capa data-access del feature de menú (ver ADR-020). Cuando se
 * construya la pantalla real de menú, este servicio consumirá
 * GET /menu/items (ver ADR-006) vía HttpClient. Por ahora es solo el shell
 * de la clase — sin HttpClient inyectado ni llamada real todavía.
 */
@Injectable({ providedIn: 'root' })
export class MenuDataAccessService {
  findActiveItems(): Observable<MenuItem[]> {
    throw new Error(
      'MenuDataAccessService.findActiveItems: aún no implementado (GET /menu/items).',
    );
  }
}
