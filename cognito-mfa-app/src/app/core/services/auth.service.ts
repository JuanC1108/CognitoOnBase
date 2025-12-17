import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { ApiService } from './api.service';
import {
  AuthState,
  LoginRequest,
  LoginResponse,
  MfaVerifyRequest,
  NewPasswordRequest,
  TokenData,
  UserData,
  ChallengeData,
  ChallengeType,
  ApiResponse,
  TotpSetupResponse,
  TotpSetupVerifyRequest,
  TotpVerifyResponse,
} from '../models/auth.models';

const AUTH_STORAGE_KEY = 'cognito_auth_state';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  // Reactive state with signals
  private readonly authState = signal<AuthState>({
    isAuthenticated: false,
  });

  // Public computed signals
  readonly isAuthenticated = computed(() => this.authState().isAuthenticated);
  readonly currentUser = computed(() => this.authState().user);
  readonly tokens = computed(() => this.authState().tokens);
  readonly pendingChallenge = computed(() => this.authState().pendingChallenge);
  readonly pendingUsername = computed(() => this.authState().pendingUsername);

  constructor() {
    this.loadStoredAuth();
  }

  /**
   * Attempts to login with username and password
   */
  login(username: string, password: string): Observable<ApiResponse<LoginResponse>> {
    const request: LoginRequest = { username, password };

    return this.api.login(request).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.handleLoginResponse(response.data, username);
        }
      }),
      catchError((error) => {
        console.error('Login error:', error);
        return of({
          success: false,
          message: error.error?.message || 'Login failed',
        } as ApiResponse<LoginResponse>);
      })
    );
  }

  /**
   * Verifies MFA code
   */
  verifyMfa(code: string): Observable<ApiResponse<LoginResponse>> {
    const challenge = this.pendingChallenge();
    const username = this.pendingUsername();

    if (!challenge || !username) {
      return of({
        success: false,
        message: 'No pending MFA challenge',
      } as ApiResponse<LoginResponse>);
    }

    const request: MfaVerifyRequest = {
      username,
      code,
      session: challenge.session || '',
      challengeType: challenge.type,
    };

    return this.api.verifyMfa(request).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.handleLoginResponse(response.data, username);
        }
      }),
      catchError((error) => {
        console.error('MFA verification error:', error);
        return of({
          success: false,
          message: error.error?.message || 'MFA verification failed',
        } as ApiResponse<LoginResponse>);
      })
    );
  }

  /**
   * Initiates TOTP setup
   */
  setupTotp(): Observable<ApiResponse<TotpSetupResponse>> {
    return this.api.setupTotp().pipe(
      catchError((error) => {
        console.error('TOTP setup error:', error);
        return of({
          success: false,
          message: error.error?.message || 'TOTP setup failed',
        } as ApiResponse<TotpSetupResponse>);
      })
    );
  }

  /**
   * Verifies TOTP setup
   */
  verifyTotpSetup(
    code: string,
    deviceName?: string
  ): Observable<ApiResponse<TotpVerifyResponse>> {
    const request: TotpSetupVerifyRequest = {
      code,
      deviceName: deviceName || 'MyDevice',
    };

    return this.api.verifyTotpSetup(request).pipe(
      catchError((error) => {
        console.error('TOTP verify setup error:', error);
        return of({
          success: false,
          message: error.error?.message || 'TOTP verification failed',
        } as ApiResponse<TotpVerifyResponse>);
      })
    );
  }

  /**
   * Sets new password for NEW_PASSWORD_REQUIRED challenge
   */
  setNewPassword(newPassword: string): Observable<ApiResponse<LoginResponse>> {
    const challenge = this.pendingChallenge();
    const username = this.pendingUsername();

    if (!challenge || !username) {
      return of({
        success: false,
        message: 'No pending password challenge',
      } as ApiResponse<LoginResponse>);
    }

    const request: NewPasswordRequest = {
      username,
      newPassword,
      session: challenge.session || '',
    };

    return this.api.setNewPassword(request).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.handleLoginResponse(response.data, username);
        }
      }),
      catchError((error) => {
        console.error('Set new password error:', error);
        return of({
          success: false,
          message: error.error?.message || 'Failed to set new password',
        } as ApiResponse<LoginResponse>);
      })
    );
  }

  /**
   * Logs out the current user
   */
  logout(): Observable<boolean> {
    return this.api.logout().pipe(
      tap(() => this.clearAuth()),
      map(() => true),
      catchError(() => {
        this.clearAuth();
        return of(true);
      })
    );
  }

  /**
   * Sets the pending challenge (for navigation between components)
   */
  setPendingChallenge(challenge: ChallengeData, username: string): void {
    this.authState.update((state) => ({
      ...state,
      pendingChallenge: challenge,
      pendingUsername: username,
    }));
  }

  /**
   * Gets the access token for API calls
   */
  getAccessToken(): string | null {
    return this.tokens()?.accessToken || null;
  }

  /**
   * Refreshes the current token
   */
  refreshToken(): Observable<boolean> {
    const refreshToken = this.tokens()?.refreshToken;

    if (!refreshToken) {
      return of(false);
    }

    return this.api.refreshToken({ refreshToken }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.authState.update((state) => ({
            ...state,
            tokens: response.data,
          }));
          this.saveToStorage();
        }
      }),
      map((response) => response.success),
      catchError(() => of(false))
    );
  }

  /**
   * Loads user data
   */
  loadUser(): Observable<UserData | null> {
    return this.api.getUser().pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.authState.update((state) => ({
            ...state,
            user: response.data,
          }));
        }
      }),
      map((response) => response.data || null),
      catchError(() => of(null))
    );
  }

  private handleLoginResponse(response: LoginResponse, username: string): void {
    if (response.authenticated && response.tokens) {
      // Full authentication
      this.authState.set({
        isAuthenticated: true,
        user: response.user,
        tokens: response.tokens,
        pendingChallenge: undefined,
        pendingUsername: undefined,
      });
      this.saveToStorage();
      this.router.navigate(['/dashboard']);
    } else if (response.challenge) {
      // Challenge required
      this.authState.update((state) => ({
        ...state,
        pendingChallenge: response.challenge,
        pendingUsername: username,
      }));

      // Navigate to appropriate challenge page
      this.navigateToChallenge(response.challenge.type);
    }
  }

  private navigateToChallenge(challengeType: ChallengeType | string): void {
    const type = typeof challengeType === 'string' ? challengeType : challengeType;

    switch (type) {
      case ChallengeType.SoftwareTokenMfa:
      case 'SoftwareTokenMfa':
        this.router.navigate(['/mfa/totp-verify']);
        break;
      case ChallengeType.SmsMfa:
      case 'SmsMfa':
        this.router.navigate(['/mfa/totp-verify']); // Same component, different display
        break;
      case ChallengeType.EmailOtp:
      case 'EmailOtp':
        this.router.navigate(['/mfa/email-verify']);
        break;
      case ChallengeType.SelectMfaType:
      case 'SelectMfaType':
        this.router.navigate(['/mfa/select']);
        break;
      case ChallengeType.MfaSetup:
      case 'MfaSetup':
        this.router.navigate(['/mfa/totp-setup']);
        break;
      case ChallengeType.NewPasswordRequired:
      case 'NewPasswordRequired':
        this.router.navigate(['/password/new']);
        break;
    }
  }

  private clearAuth(): void {
    this.authState.set({
      isAuthenticated: false,
    });
    localStorage.removeItem(AUTH_STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  private saveToStorage(): void {
    const state = this.authState();
    if (state.tokens) {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          tokens: state.tokens,
          user: state.user,
        })
      );
    }
  }

  private loadStoredAuth(): void {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.tokens?.accessToken) {
          this.authState.set({
            isAuthenticated: true,
            tokens: data.tokens,
            user: data.user,
          });
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }
}
