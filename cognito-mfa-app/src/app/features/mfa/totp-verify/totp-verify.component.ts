import { Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CodeInputComponent } from '../../../shared/components/code-input/code-input.component';
import { AuthService } from '../../../core/services/auth.service';
import { ChallengeType } from '../../../core/models/auth.models';

@Component({
  selector: 'app-totp-verify',
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
            <mat-icon class="logo-icon">{{ getIcon() }}</mat-icon>
            <h1>{{ getTitle() }}</h1>
            <p>{{ getDescription() }}</p>
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
export class TotpVerifyComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild('codeInput') codeInput!: CodeInputComponent;

  code = signal('');
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  challenge = this.authService.pendingChallenge;

  getIcon(): string {
    const type = this.challenge()?.type;
    if (type === ChallengeType.SmsMfa || type === 'SmsMfa') {
      return 'sms';
    }
    return 'smartphone';
  }

  getTitle(): string {
    const type = this.challenge()?.type;
    if (type === ChallengeType.SmsMfa || type === 'SmsMfa') {
      return 'SMS Verification';
    }
    return 'Authenticator Code';
  }

  getDescription(): string {
    const type = this.challenge()?.type;
    if (type === ChallengeType.SmsMfa || type === 'SmsMfa') {
      return 'Enter the 6-digit code sent to your phone';
    }
    return 'Enter the 6-digit code from your authenticator app';
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
