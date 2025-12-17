import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <div class="auth-header">
            <mat-icon class="logo-icon">security</mat-icon>
            <h1>Cognito MFA Test</h1>
            <p>Sign in to your account</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Username or Email</mat-label>
              <input matInput formControlName="username" autocomplete="username" />
              <mat-icon matSuffix>person</mat-icon>
              @if (loginForm.get('username')?.hasError('required') && loginForm.get('username')?.touched) {
                <mat-error>Username is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input
                matInput
                [type]="hidePassword() ? 'password' : 'text'"
                formControlName="password"
                autocomplete="current-password"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="hidePassword.set(!hidePassword())"
              >
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>

            @if (errorMessage()) {
              <div class="error-message">
                <mat-icon>error</mat-icon>
                {{ errorMessage() }}
              </div>
            }

            <div class="auth-actions">
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="loading() || loginForm.invalid"
              >
                @if (loading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Sign In
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .auth-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 20px;
        box-sizing: border-box;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .auth-card {
        width: 100%;
        max-width: 400px;
        padding: 24px;
      }

      .auth-header {
        text-align: center;
        width: 100%;
        margin-bottom: 24px;

        .logo-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: #1976d2;
          margin-bottom: 16px;
        }

        h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 500;
        }

        p {
          margin: 8px 0 0;
          color: rgba(0, 0, 0, 0.6);
        }
      }

      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .full-width {
        width: 100%;
      }

      .error-message {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f44336;
        font-size: 14px;
        padding: 8px;
        background: #ffebee;
        border-radius: 4px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .auth-actions {
        margin-top: 16px;

        button {
          width: 100%;
          height: 48px;
          font-size: 16px;
        }

        mat-spinner {
          display: inline-block;
        }
      }

      mat-card-header {
        display: block;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  hidePassword = signal(true);

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.loginForm.value;

    this.authService.login(username!, password!).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (!response.success) {
          this.errorMessage.set(response.message || 'Login failed');
        }
        // Navigation handled by AuthService
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error.message || 'An error occurred');
      },
    });
  }
}
