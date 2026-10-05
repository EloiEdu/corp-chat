import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, Observable, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { User } from '../../models/user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

interface LoginResponse {
  access_token: string;
  token_type: 'Bearer';
}

const TOKEN_STORAGE_KEY = 'corp-chat.access-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenState = signal<string | null>(this.readStoredToken());
  private readonly userState = signal<User | null>(null);

  readonly isAuthenticated = computed(() => this.tokenState() !== null);
  readonly currentUser = computed(() => this.userState());

  constructor() {
    const token = this.tokenState();
    if (token) this.restoreUser(token);
  }

  login(credentials: LoginRequest): Observable<User> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(
        tap(({ access_token }) => this.saveToken(access_token)),
        switchMap(({ access_token }) => this.loadUserFromToken(access_token)),
        catchError((error: unknown) => {
          this.clearSession();
          return throwError(() => error);
        }),
      );
  }

  register(user: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/users`, user);
  }

  logout(): void {
    this.clearSession();
  }

  getAccessToken(): string | null {
    return this.tokenState();
  }

  private restoreUser(token: string): void {
    this.loadUserFromToken(token)
      .pipe(
        catchError(() => {
          this.clearSession();
          return EMPTY;
        }),
      )
      .subscribe();
  }

  private loadUserFromToken(token: string): Observable<User> {
    const userId = this.readUserIdFromToken(token);
    if (!userId) {
      this.clearSession();
      return throwError(() => new Error('Invalid access token'));
    }

    return this.http
      .get<User>(`${environment.apiUrl}/users/${encodeURIComponent(userId)}`)
      .pipe(tap((user) => this.userState.set(user)));
  }

  private readUserIdFromToken(token: string): string | null {
    try {
      const encodedPayload = token.split('.')[1];
      if (!encodedPayload) return null;

      const base64 = encodedPayload
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const payload = JSON.parse(atob(base64)) as { sub?: unknown };

      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }

  private readStoredToken(): string | null {
    return typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  private saveToken(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    this.tokenState.set(token);
  }

  private clearSession(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    this.tokenState.set(null);
    this.userState.set(null);
  }
}
