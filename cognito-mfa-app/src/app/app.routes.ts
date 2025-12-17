import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'mfa',
    children: [
      {
        path: 'totp-verify',
        loadComponent: () =>
          import('./features/mfa/totp-verify/totp-verify.component').then(
            (m) => m.TotpVerifyComponent
          ),
      },
      {
        path: 'totp-setup',
        loadComponent: () =>
          import('./features/mfa/totp-setup/totp-setup.component').then(
            (m) => m.TotpSetupComponent
          ),
        canActivate: [authGuard],
      },
      {
        path: 'email-verify',
        loadComponent: () =>
          import('./features/mfa/email-verify/email-verify.component').then(
            (m) => m.EmailVerifyComponent
          ),
      },
      {
        path: 'select',
        loadComponent: () =>
          import('./features/mfa/select/select.component').then(
            (m) => m.SelectComponent
          ),
      },
    ],
  },
  {
    path: 'password',
    children: [
      {
        path: 'new',
        loadComponent: () =>
          import(
            './features/password/new-password/new-password.component'
          ).then((m) => m.NewPasswordComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
