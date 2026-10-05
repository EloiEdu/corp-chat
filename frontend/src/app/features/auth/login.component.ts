import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import type { LoginRequest } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main
      class="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100"
    >
      <section class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl shadow-black/30">
        <div class="mb-8 text-center">
          <div
            class="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"
            aria-hidden="true"
          >
            <svg
              class="size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 10h8m-8 4h5m-8 5 1.8-3.6A8 8 0 1 1 18 17H9l-4 2Z"
              />
            </svg>
          </div>
          <p class="mb-2 text-sm font-semibold tracking-[0.2em] text-indigo-300 uppercase">
            Corp Chat
          </p>
          <h1 class="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
          <p class="mt-2 text-sm text-slate-400">
            Entre com sua conta corporativa para continuar.
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-5">
          <div>
            <label for="email" class="mb-2 block text-sm font-medium text-slate-200">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="username"
              placeholder="voce@empresa.com"
              [attr.aria-invalid]="form.controls.email.touched && form.controls.email.invalid"
              class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
            />
            @if (form.controls.email.touched && form.controls.email.hasError('required')) {
              <p class="mt-2 text-sm text-rose-300">Informe seu e-mail.</p>
            } @else if (form.controls.email.touched && form.controls.email.hasError('email')) {
              <p class="mt-2 text-sm text-rose-300">Informe um e-mail válido.</p>
            }
          </div>

          <div>
            <label for="password" class="mb-2 block text-sm font-medium text-slate-200">
              Senha
            </label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              placeholder="Sua senha"
              [attr.aria-invalid]="form.controls.password.touched && form.controls.password.invalid"
              class="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
            />
            @if (form.controls.password.touched && form.controls.password.hasError('required')) {
              <p class="mt-2 text-sm text-rose-300">Informe sua senha.</p>
            }
          </div>

          @if (loginError()) {
            <p
              class="rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
              role="alert"
            >
              {{ loginError() }}
            </p>
          }

          <button
            type="submit"
            [disabled]="isSubmitting() || form.invalid"
            [attr.aria-busy]="isSubmitting()"
            class="flex w-full items-center justify-center rounded-lg bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            @if (isSubmitting()) {
              Entrando...
            } @else {
              Entrar
            }
          </button>
        </form>
      </section>
    </main>
  `,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isSubmitting = signal(false);
  readonly loginError = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  submit(): void {
    this.loginError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const credentials: LoginRequest = this.form.getRawValue();
    this.isSubmitting.set(true);

    this.authService
      .login(credentials)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(this.getPostLoginUrl());
        },
        error: () => {
          this.loginError.set('Não foi possível entrar. Confira seu e-mail e sua senha.');
        },
      });
  }

  private getPostLoginUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    // Aceita apenas caminhos internos para evitar redirecionamento externo.
    if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//')) {
      return returnUrl;
    }

    return '/workspaces';
  }
}
