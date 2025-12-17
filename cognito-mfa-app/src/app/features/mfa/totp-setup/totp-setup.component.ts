import {
  Component,
  inject,
  signal,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { CodeInputComponent } from '../../../shared/components/code-input/code-input.component';
import { AuthService } from '../../../core/services/auth.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-totp-setup',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatStepperModule,
    CodeInputComponent,
  ],
  template: `
    <div class="setup-container">
      <mat-card class="setup-card">
        <mat-card-header>
          <div class="setup-header">
            <mat-icon class="logo-icon">security</mat-icon>
            <h1>Setup Authenticator</h1>
            <p>Add two-factor authentication to your account</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          @if (loadingSetup()) {
            <div class="loading-state">
              <mat-spinner diameter="48"></mat-spinner>
              <span>Setting up TOTP...</span>
            </div>
          } @else if (setupError()) {
            <div class="error-state">
              <mat-icon>error</mat-icon>
              <p>{{ setupError() }}</p>
              <button mat-raised-button color="primary" (click)="initiateSetup()">
                Try Again
              </button>
            </div>
          } @else if (secretCode()) {
            <mat-stepper orientation="vertical" #stepper>
              <!-- Step 1: Scan QR Code -->
              <mat-step [completed]="step() > 0">
                <ng-template matStepLabel>Scan QR Code</ng-template>
                <div class="step-content">
                  <p>
                    Scan this QR code with your authenticator app (Google Authenticator,
                    Authy, Microsoft Authenticator, etc.)
                  </p>
                  <div class="qr-code-container">
                    <canvas #qrCanvas></canvas>
                  </div>
                  <button mat-button (click)="step.set(1); stepper.next()">
                    Continue
                  </button>
                </div>
              </mat-step>

              <!-- Step 2: Manual Entry -->
              <mat-step [completed]="step() > 1">
                <ng-template matStepLabel>Or Enter Code Manually</ng-template>
                <div class="step-content">
                  <p>If you can't scan the QR code, enter this secret key manually:</p>
                  <div class="secret-code-container">
                    <code class="secret-code">{{ secretCode() }}</code>
                    <button mat-icon-button (click)="copySecret()" matTooltip="Copy to clipboard">
                      <mat-icon>content_copy</mat-icon>
                    </button>
                  </div>
                  <button mat-button (click)="step.set(2); stepper.next()">
                    Continue
                  </button>
                </div>
              </mat-step>

              <!-- Step 3: Verify -->
              <mat-step>
                <ng-template matStepLabel>Verify Setup</ng-template>
                <div class="step-content">
                  <p>Enter the 6-digit code from your authenticator app to verify setup:</p>

                  <app-code-input
                    #codeInput
                    [length]="6"
                    [disabled]="verifying()"
                    (codeComplete)="onCodeComplete($event)"
                  ></app-code-input>

                  @if (verifyError()) {
                    <div class="error-message">
                      <mat-icon>error</mat-icon>
                      {{ verifyError() }}
                    </div>
                  }

                  @if (verifying()) {
                    <div class="loading-state small">
                      <mat-spinner diameter="24"></mat-spinner>
                      <span>Verifying...</span>
                    </div>
                  }

                  <div class="step-actions">
                    <button mat-button (click)="stepper.previous()">Back</button>
                    <button
                      mat-raised-button
                      color="primary"
                      [disabled]="verifying() || code().length !== 6"
                      (click)="verifySetup()"
                    >
                      Verify & Enable
                    </button>
                  </div>
                </div>
              </mat-step>
            </mat-stepper>
          }
        </mat-card-content>

        <mat-card-actions>
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Back to Dashboard
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .setup-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 20px;
        box-sizing: border-box;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .setup-card {
        width: 100%;
        max-width: 500px;
        padding: 24px;
      }

      .setup-header {
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

      .step-content {
        padding: 16px 0;

        p {
          margin: 0 0 16px;
          color: rgba(0, 0, 0, 0.7);
        }
      }

      .qr-code-container {
        display: flex;
        justify-content: center;
        margin: 24px 0;

        canvas {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          background: white;
        }
      }

      .secret-code-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 16px 0;

        .secret-code {
          font-family: monospace;
          font-size: 16px;
          letter-spacing: 2px;
          background: #f5f5f5;
          padding: 12px 24px;
          border-radius: 4px;
          word-break: break-all;
        }
      }

      .step-actions {
        display: flex;
        justify-content: space-between;
        margin-top: 24px;
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
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 48px;
        color: rgba(0, 0, 0, 0.6);

        &.small {
          flex-direction: row;
          padding: 16px;
        }
      }

      .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 48px;
        color: #f44336;

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
        }

        p {
          margin: 0;
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
export class TotpSetupComponent implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('codeInput') codeInput!: CodeInputComponent;

  secretCode = signal<string | null>(null);
  qrCodeUri = signal<string | null>(null);
  loadingSetup = signal(true);
  setupError = signal<string | null>(null);
  step = signal(0);
  code = signal('');
  verifying = signal(false);
  verifyError = signal<string | null>(null);

  ngOnInit(): void {
    this.initiateSetup();
  }

  ngAfterViewInit(): void {
    // QR code will be generated after setup completes
  }

  initiateSetup(): void {
    this.loadingSetup.set(true);
    this.setupError.set(null);

    this.authService.setupTotp().subscribe({
      next: (response) => {
        this.loadingSetup.set(false);
        if (response.success && response.data) {
          this.secretCode.set(response.data.secretCode);
          this.qrCodeUri.set(response.data.qrCodeUri);
          // Generate QR code after view is ready
          setTimeout(() => this.generateQRCode(), 100);
        } else {
          this.setupError.set(response.message || 'Failed to initiate TOTP setup');
        }
      },
      error: (error) => {
        this.loadingSetup.set(false);
        this.setupError.set(error.message || 'An error occurred');
      },
    });
  }

  private generateQRCode(): void {
    const uri = this.qrCodeUri();
    if (uri && this.qrCanvas) {
      QRCode.toCanvas(this.qrCanvas.nativeElement, uri, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).catch((err: Error) => {
        console.error('Error generating QR code:', err);
      });
    }
  }

  copySecret(): void {
    const secret = this.secretCode();
    if (secret) {
      navigator.clipboard.writeText(secret).then(() => {
        this.snackBar.open('Secret code copied to clipboard', 'OK', {
          duration: 2000,
        });
      });
    }
  }

  onCodeComplete(code: string): void {
    this.code.set(code);
    this.verifySetup();
  }

  verifySetup(): void {
    if (this.code().length !== 6 || this.verifying()) {
      return;
    }

    this.verifying.set(true);
    this.verifyError.set(null);

    this.authService.verifyTotpSetup(this.code(), 'MyDevice').subscribe({
      next: (response) => {
        this.verifying.set(false);
        if (response.success) {
          this.snackBar.open('TOTP setup complete! MFA is now enabled.', 'OK', {
            duration: 3000,
          });
          this.router.navigate(['/dashboard']);
        } else {
          this.verifyError.set(response.message || 'Verification failed');
          this.codeInput?.reset();
        }
      },
      error: (error) => {
        this.verifying.set(false);
        this.verifyError.set(error.message || 'An error occurred');
        this.codeInput?.reset();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
