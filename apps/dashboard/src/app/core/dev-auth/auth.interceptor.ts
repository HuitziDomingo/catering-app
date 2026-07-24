import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { DevTokenStore } from './dev-token.store';

// TEMPORAL: adjunta el JWT pegado a mano en DevTokenStore mientras no
// exista una pantalla de login real (ver DevTokenStore).
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(DevTokenStore).token();
  if (!token) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
