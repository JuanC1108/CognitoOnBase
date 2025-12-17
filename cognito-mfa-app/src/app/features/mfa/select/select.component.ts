import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

interface MfaOption {
  id: string;
  name: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-mfa-select',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatRadioModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <div class="auth-header">
            <mat-icon class="logo-icon">verified_user</mat-icon>
            <h1>Choose Verification Method</h1>
            <p>Select how you'd like to verify your identity</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          <div class="mfa-options">
            @for (option of availableOptions(); track option.id) {
              <div
                class="mfa-option"
                [class.selected]="selectedMethod() === option.id"
                (click)="selectMethod(option.id)"
              >
                <mat-icon>{{ option.icon }}</mat-icon>
                <div class="option-content">
                  <h3>{{ option.name }}</h3>
                  <p>{{ option.description }}</p>
                </div>
                <mat-icon class="check-icon" *ngIf="selectedMethod() === option.id">
                  check_circle
                </mat-icon>
              </div>
            }
          </div>

          @if (errorMessage()) {
            <div class="error-message">
              <mat-icon>error</mat-icon>
              {{ errorMessage() }}
            </div>
          }

          @if (loading()) {
            <div class="loading-state">
              <mat-spinner diameter="32"></mat-spinner>
              <span>Processing...</span>
            </div>
          }
        </mat-card-content>

        <mat-card-actions>
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Back to Login
          </button>
          <button
            mat-raised-button
            color="primary"
            [disabled]="loading() || !selectedMethod()"
            (click)="continue()"
          >
            Continue
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
        max-width: 450px;
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

      .mfa-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .mfa-option {
        display: flex;
        align-items: center;
        padding: 16px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          border-color: #1976d2;
          background: #f5f5f5;
        }

        &.selected {
          border-color: #1976d2;
          background: #e3f2fd;
        }

        > mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          margin-right: 16px;
          color: #1976d2;
        }

        .option-content {
          flex: 1;

          h3 {
            margin: 0 0 4px;
            font-size: 16px;
            font-weight: 500;
          }

          p {
            margin: 0;
            font-size: 14px;
            color: rgba(0, 0, 0, 0.6);
          }
        }

        .check-icon {
          color: #4caf50;
        }
      }

      .error-message {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #f44336;
        font-size: 14px;
        padding: 12px;
        background: #ffebee;
        border-radius: 4px;
        margin-top: 16px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 16px;
        color: rgba(0, 0, 0, 0.6);
      }

      mat-card-header {
        display: block;
      }

      mat-card-actions {
        display: flex;
        justify-content: space-between;
        padding: 16px 0 0;
      }
    `,
  ],
})
export class SelectComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  selectedMethod = signal<string | null>(null);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  challenge = this.authService.pendingChallenge;

  // All possible MFA options
  private readonly allOptions: MfaOption[] = [
    {
      id: 'SOFTWARE_TOKEN_MFA',
      name: 'Authenticator App',
      description: 'Use a code from your authenticator app',
      icon: 'smartphone',
    },
    {
      id: 'SMS_MFA',
      name: 'SMS',
      description: 'Receive a code via text message',
      icon: 'sms',
    },
    {
      id: 'EMAIL_OTP',
      name: 'Email',
      description: 'Receive a code via email',
      icon: 'email',
    },
  ];

  // Filter available options based on challenge
  availableOptions = signal<MfaOption[]>([]);

  constructor() {
    const availableMethods = this.challenge()?.availableMfaMethods || [];

    if (availableMethods.length > 0) {
      this.availableOptions.set(
        this.allOptions.filter((opt) => availableMethods.includes(opt.id))
      );
    } else {
      // Show all options if no specific methods provided
      this.availableOptions.set(this.allOptions);
    }

    // Pre-select first option
    if (this.availableOptions().length > 0) {
      this.selectedMethod.set(this.availableOptions()[0].id);
    }
  }

  selectMethod(methodId: string): void {
    this.selectedMethod.set(methodId);
  }

  continue(): void {
    const method = this.selectedMethod();
    if (!method) return;

    // Navigate to the appropriate verification page based on selection
    switch (method) {
      case 'SOFTWARE_TOKEN_MFA':
        this.router.navigate(['/mfa/totp-verify']);
        break;
      case 'SMS_MFA':
        this.router.navigate(['/mfa/totp-verify']); // Same component handles SMS
        break;
      case 'EMAIL_OTP':
        this.router.navigate(['/mfa/email-verify']);
        break;
    }
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }
}
