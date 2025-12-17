import { Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CodeInputComponent } from '../../../shared/components/code-input/code-input.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-email-verify',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    CodeInputComponent,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <div class="auth-header">
            <mat-icon class="logo-icon">email</mat-icon>
            <h1>Email Verification</h1>
            <p>Enter the 6-digit code sent to your email</p>
            @if (emailDestination()) {
              <p class="email-hint">Code sent to: {{ emailDestination() }}</p>
            }
          </div>
        </mat-card-header>

        <mat-card-content>
          <app-code-input
            #codeInput
            [length]="6"
            [disabled]="loading()"
            (codeComplete)="onCodeComplete($event)"
          ></app-code-input>

          @if (errorMessage()) {
            <div class="error-message">
              <mat-icon>error</mat-icon>
              {{ errorMessage() }}
            </div>
          }

          @if (loading()) {
            <div class="loading-state">
              <mat-spinner diameter="32"></mat-spinner>
              <span>Verifying...</span>
            </div>
          }

          <div class="resend-section">
            <p>Didn't receive the code?</p>
            <button mat-button color="primary" [disabled]="resendCooldown() > 0">
              @if (resendCooldown() > 0) {
                Resend in {{ resendCooldown() }}s
              } @else {
                Resend Code
              }
            </button>
          </div>
        </mat-card-content>

        <mat-card-actions>
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Back to Login
          </button>
          <button
            mat-raised-button
            color="primary"
            [disabled]="loading() || code().length !== 6"
            (click)="verify()"
          >
            Verify
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

        .email-hint {
          font-weight: 500;
          color: #1976d2;
          font-size: 14px;
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

      .resend-section {
        text-align: center;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #e0e0e0;

        p {
          margin: 0 0 8px;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.6);
        }
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
export class EmailVerifyComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild('codeInput') codeInput!: CodeInputComponent;

  code = signal('');
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  resendCooldown = signal(0);

  challenge = this.authService.pendingChallenge;

  emailDestination = signal<string | null>(null);

  constructor() {
    // Extract email destination from challenge parameters
    const params = this.challenge()?.parameters;
    if (params?.['CODE_DELIVERY_DESTINATION']) {
      this.emailDestination.set(params['CODE_DELIVERY_DESTINATION']);
    }
  }

  onCodeComplete(code: string): void {
    this.code.set(code);
    this.verify();
  }

  verify(): void {
    if (this.code().length !== 6 || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.verifyMfa(this.code()).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (!response.success) {
          this.errorMessage.set(response.message || 'Verification failed');
          this.codeInput?.reset();
        }
        // Navigation handled by AuthService
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error.message || 'An error occurred');
        this.codeInput?.reset();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }
}
