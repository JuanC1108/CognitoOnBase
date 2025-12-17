import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-new-password',
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
            <mat-icon class="logo-icon">lock_reset</mat-icon>
            <h1>Set New Password</h1>
            <p>Your password needs to be changed</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>New Password</mat-label>
              <input
                matInput
                [type]="hidePassword() ? 'password' : 'text'"
                formControlName="password"
                autocomplete="new-password"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="hidePassword.set(!hidePassword())"
              >
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (passwordForm.get('password')?.hasError('required') && passwordForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (passwordForm.get('password')?.hasError('minlength') && passwordForm.get('password')?.touched) {
                <mat-error>Password must be at least 8 characters</mat-error>
              }
            </mat-form-field>

            <!-- Password strength indicator -->
            <div class="password-strength-container">
              <div class="password-strength" [class]="passwordStrength()"></div>
              <span class="strength-label">{{ passwordStrengthLabel() }}</span>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <input
                matInput
                [type]="hideConfirmPassword() ? 'password' : 'text'"
                formControlName="confirmPassword"
                autocomplete="new-password"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="hideConfirmPassword.set(!hideConfirmPassword())"
              >
                <mat-icon>{{ hideConfirmPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (passwordForm.get('confirmPassword')?.hasError('required') && passwordForm.get('confirmPassword')?.touched) {
                <mat-error>Please confirm your password</mat-error>
              }
              @if (passwordForm.get('confirmPassword')?.hasError('passwordMismatch') && passwordForm.get('confirmPassword')?.touched) {
                <mat-error>Passwords do not match</mat-error>
              }
            </mat-form-field>

            <!-- Password requirements -->
            <div class="password-requirements">
              <p>Password must contain:</p>
              <ul>
                <li [class.met]="hasMinLength()">
                  <mat-icon>{{ hasMinLength() ? 'check' : 'close' }}</mat-icon>
                  At least 8 characters
                </li>
                <li [class.met]="hasUppercase()">
                  <mat-icon>{{ hasUppercase() ? 'check' : 'close' }}</mat-icon>
                  One uppercase letter
                </li>
                <li [class.met]="hasLowercase()">
                  <mat-icon>{{ hasLowercase() ? 'check' : 'close' }}</mat-icon>
                  One lowercase letter
                </li>
                <li [class.met]="hasNumber()">
                  <mat-icon>{{ hasNumber() ? 'check' : 'close' }}</mat-icon>
                  One number
                </li>
                <li [class.met]="hasSpecial()">
                  <mat-icon>{{ hasSpecial() ? 'check' : 'close' }}</mat-icon>
                  One special character
                </li>
              </ul>
            </div>

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
                [disabled]="loading() || passwordForm.invalid"
              >
                @if (loading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Set Password
                }
              </button>
            </div>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Back to Login
          </button>
        </mat-card-actions>
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
        max-width: 420px;
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

      .password-strength-container {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;

        .password-strength {
          height: 4px;
          border-radius: 2px;
          flex: 1;
          background: #e0e0e0;
          transition: all 0.3s;

          &.weak {
            background: linear-gradient(to right, #f44336 33%, #e0e0e0 33%);
          }

          &.medium {
            background: linear-gradient(to right, #ff9800 66%, #e0e0e0 66%);
          }

          &.strong {
            background: #4caf50;
          }
        }

        .strength-label {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.6);
          min-width: 60px;
        }
      }

      .password-requirements {
        background: #f5f5f5;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;

        p {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 500;
        }

        ul {
          margin: 0;
          padding: 0;
          list-style: none;

          li {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: rgba(0, 0, 0, 0.6);
            margin-bottom: 4px;

            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
              color: #f44336;
            }

            &.met {
              color: #4caf50;

              mat-icon {
                color: #4caf50;
              }
            }
          }
        }
      }

      .error-message {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f44336;
        font-size: 14px;
        padding: 12px;
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

      mat-card-actions {
        padding: 16px 0 0;
      }
    `,
  ],
})
export class NewPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  passwordForm = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  get password(): string {
    return this.passwordForm.get('password')?.value || '';
  }

  hasMinLength(): boolean {
    return this.password.length >= 8;
  }

  hasUppercase(): boolean {
    return /[A-Z]/.test(this.password);
  }

  hasLowercase(): boolean {
    return /[a-z]/.test(this.password);
  }

  hasNumber(): boolean {
    return /[0-9]/.test(this.password);
  }

  hasSpecial(): boolean {
    return /[!@#$%^&*(),.?":{}|<>]/.test(this.password);
  }

  passwordStrength(): string {
    const checks = [
      this.hasMinLength(),
      this.hasUppercase(),
      this.hasLowercase(),
      this.hasNumber(),
      this.hasSpecial(),
    ];

    const passed = checks.filter(Boolean).length;

    if (passed <= 2) return 'weak';
    if (passed <= 4) return 'medium';
    return 'strong';
  }

  passwordStrengthLabel(): string {
    const strength = this.passwordStrength();
    switch (strength) {
      case 'weak':
        return 'Weak';
      case 'medium':
        return 'Medium';
      case 'strong':
        return 'Strong';
      default:
        return '';
    }
  }

  onSubmit(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { password } = this.passwordForm.value;

    this.authService.setNewPassword(password!).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (!response.success) {
          this.errorMessage.set(response.message || 'Failed to set password');
        }
        // Navigation handled by AuthService
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error.message || 'An error occurred');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }
}
