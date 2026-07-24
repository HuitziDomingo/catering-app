import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'menu',
    loadComponent: () =>
      import('./features/menu/feature/menu-management/menu-management').then(
        (m) => m.MenuManagement,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'menu' },
];
