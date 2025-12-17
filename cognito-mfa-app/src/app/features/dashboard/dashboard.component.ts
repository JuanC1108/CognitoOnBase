import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule,
    MatDividerModule,
    MatListModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <span>Cognito MFA Test</span>
      <span class="spacer"></span>
      <button mat-icon-button [matMenuTriggerFor]="userMenu">
        <mat-icon>account_circle</mat-icon>
      </button>
      <mat-menu #userMenu="matMenu">
        <button mat-menu-item disabled>
          <mat-icon>person</mat-icon>
          <span>{{ user()?.username || 'User' }}</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="logout()">
          <mat-icon>logout</mat-icon>
          <span>Logout</span>
        </button>
      </mat-menu>
    </mat-toolbar>

    <div class="dashboard-container">
      <h1>Welcome to the Dashboard</h1>
      <p class="subtitle">You have successfully authenticated with AWS Cognito</p>

      <div class="cards-grid">
        <!-- User Info Card -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>person</mat-icon>
            <mat-card-title>User Information</mat-card-title>
            <mat-card-subtitle>Your account details</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (user()) {
              <mat-list>
                <mat-list-item>
                  <mat-icon matListItemIcon>badge</mat-icon>
                  <div matListItemTitle>Username</div>
                  <div matListItemLine>{{ user()?.username }}</div>
                </mat-list-item>
                <mat-list-item>
                  <mat-icon matListItemIcon>email</mat-icon>
                  <div matListItemTitle>Email</div>
                  <div matListItemLine>
                    {{ user()?.email || 'Not set' }}
                    @if (user()?.emailVerified) {
                      <mat-icon class="verified-icon">verified</mat-icon>
                    }
                  </div>
                </mat-list-item>
                <mat-list-item>
                  <mat-icon matListItemIcon>phone</mat-icon>
                  <div matListItemTitle>Phone</div>
                  <div matListItemLine>
                    {{ user()?.phoneNumber || 'Not set' }}
                    @if (user()?.phoneNumberVerified) {
                      <mat-icon class="verified-icon">verified</mat-icon>
                    }
                  </div>
                </mat-list-item>
              </mat-list>
            } @else {
              <div class="loading-state">
                <mat-spinner diameter="32"></mat-spinner>
                <span>Loading user info...</span>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- MFA Settings Card -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>security</mat-icon>
            <mat-card-title>MFA Settings</mat-card-title>
            <mat-card-subtitle>Manage multi-factor authentication</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon>smartphone</mat-icon>
                <div matListItemTitle>TOTP Authenticator</div>
                <div matListItemLine>Configure your authenticator app</div>
              </mat-list-item>
            </mat-list>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" (click)="setupTotp()">
              <mat-icon>add</mat-icon>
              Setup TOTP
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Session Info Card -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>vpn_key</mat-icon>
            <mat-card-title>Session Information</mat-card-title>
            <mat-card-subtitle>Current authentication session</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon>check_circle</mat-icon>
                <div matListItemTitle>Status</div>
                <div matListItemLine class="authenticated">Authenticated</div>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon>token</mat-icon>
                <div matListItemTitle>Access Token</div>
                <div matListItemLine class="token-preview">
                  {{ tokenPreview() }}
                </div>
              </mat-list-item>
            </mat-list>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="warn" (click)="logout()">
              <mat-icon>logout</mat-icon>
              Sign Out
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .spacer {
        flex: 1 1 auto;
      }

      .dashboard-container {
        padding: 24px;
        max-width: 1200px;
        margin: 0 auto;

        h1 {
          margin: 0 0 8px;
          font-weight: 500;
        }

        .subtitle {
          color: rgba(0, 0, 0, 0.6);
          margin: 0 0 24px;
        }
      }

      .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 24px;
      }

      mat-card {
        mat-card-header {
          mat-icon[mat-card-avatar] {
            font-size: 40px;
            width: 40px;
            height: 40px;
            color: #1976d2;
          }
        }

        mat-card-content {
          padding-top: 16px;
        }
      }

      .verified-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: #4caf50;
        vertical-align: middle;
        margin-left: 4px;
      }

      .authenticated {
        color: #4caf50;
        font-weight: 500;
      }

      .token-preview {
        font-family: monospace;
        font-size: 12px;
        word-break: break-all;
      }

      .loading-state {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        color: rgba(0, 0, 0, 0.6);
      }

      mat-card-actions {
        padding: 8px 16px 16px;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  user = this.authService.currentUser;
  tokens = this.authService.tokens;

  tokenPreview = signal('');

  ngOnInit(): void {
    // Load user info if not already loaded
    if (!this.user()) {
      this.authService.loadUser().subscribe();
    }

    // Set token preview
    const token = this.tokens()?.accessToken;
    if (token) {
      this.tokenPreview.set(token.substring(0, 50) + '...');
    }
  }

  setupTotp(): void {
    this.router.navigate(['/mfa/totp-setup']);
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
