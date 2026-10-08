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

  const isPublicLogin =
    request.method === 'POST' && requestUrl.pathname === '/auth/login';
  const isPublicRegistration =
    request.method === 'POST' && requestUrl.pathname === '/users';

  if (isPublicLogin || isPublicRegistration) {
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
