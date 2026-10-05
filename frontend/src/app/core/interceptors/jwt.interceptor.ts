import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

const API_ORIGIN = new URL(environment.apiUrl).origin;

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  let requestUrl: URL;

  try {
    requestUrl = new URL(request.url, environment.apiUrl);
  } catch {
    return next(request);
  }

  if (requestUrl.origin !== API_ORIGIN) {
    return next(request);
  }

  if (
    requestUrl.pathname === '/auth/login' ||
    requestUrl.pathname === '/users' ||
    requestUrl.pathname.startsWith('/users/')
  ) {
    return next(request);
  }

  const token = inject(AuthService).getAccessToken();
  if (!token) return next(request);

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
