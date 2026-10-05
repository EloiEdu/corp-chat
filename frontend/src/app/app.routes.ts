import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ChatLayoutComponent } from './features/chat/components/chat-layout.component';
import { LoginComponent } from './features/auth/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'workspaces',
    component: ChatLayoutComponent,
    canActivate: [authGuard],
  },
  { path: '', pathMatch: 'full', redirectTo: 'workspaces' },
  { path: '**', redirectTo: 'workspaces' },
];
