import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/feature/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/feature/register-page/register-page').then(
        (m) => m.RegisterPage,
      ),
  },
  {
    path: 'menu',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/menu/feature/menu-management/menu-management').then(
        (m) => m.MenuManagement,
      ),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/orders/feature/orders-page/orders-page').then((m) => m.OrdersPage),
  },
  {
    path: 'orders/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/orders/feature/order-detail-page/order-detail-page').then(
        (m) => m.OrderDetailPage,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'menu' },
];
