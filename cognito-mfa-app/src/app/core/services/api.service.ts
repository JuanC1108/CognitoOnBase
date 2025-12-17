import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  MfaVerifyRequest,
  NewPasswordRequest,
  RefreshTokenRequest,
  TokenData,
  TotpSetupResponse,
  TotpSetupVerifyRequest,
  TotpVerifyResponse,
  UserData,
  MfaPreferenceResponse,
} from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Initiates user authentication
   */
  login(request: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.baseUrl}/auth/login`,
      request
    );
  }

  /**
   * Verifies MFA code (TOTP, SMS, or Email)
   */
  verifyMfa(request: MfaVerifyRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.baseUrl}/auth/mfa/verify`,
      request
    );
  }

  /**
   * Initiates TOTP setup
   */
  setupTotp(): Observable<ApiResponse<TotpSetupResponse>> {
    return this.http.post<ApiResponse<TotpSetupResponse>>(
      `${this.baseUrl}/auth/mfa/totp/setup`,
      {}
    );
  }

  /**
   * Verifies TOTP setup
   */
  verifyTotpSetup(
    request: TotpSetupVerifyRequest
  ): Observable<ApiResponse<TotpVerifyResponse>> {
    return this.http.post<ApiResponse<TotpVerifyResponse>>(
      `${this.baseUrl}/auth/mfa/totp/verify`,
      request
    );
  }

  /**
   * Sets new password for NEW_PASSWORD_REQUIRED challenge
   */
  setNewPassword(
    request: NewPasswordRequest
  ): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.baseUrl}/auth/password/new`,
      request
    );
  }

  /**
   * Signs out the user
   */
  logout(): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.baseUrl}/auth/logout`,
      {}
    );
  }

  /**
   * Refreshes access token
   */
  refreshToken(
    request: RefreshTokenRequest
  ): Observable<ApiResponse<TokenData>> {
    return this.http.post<ApiResponse<TokenData>>(
      `${this.baseUrl}/auth/refresh`,
      request
    );
  }

  /**
   * Gets current user information
   */
  getUser(): Observable<ApiResponse<UserData>> {
    return this.http.get<ApiResponse<UserData>>(`${this.baseUrl}/auth/user`);
  }

  /**
   * Gets MFA preferences
   */
  getMfaPreferences(): Observable<ApiResponse<MfaPreferenceResponse>> {
    return this.http.get<ApiResponse<MfaPreferenceResponse>>(
      `${this.baseUrl}/auth/mfa/preferences`
    );
  }

  /**
   * Sets MFA preference
   */
  setMfaPreference(mfaMethod: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(
      `${this.baseUrl}/auth/mfa/preferences`,
      { mfaMethod }
    );
  }
}
