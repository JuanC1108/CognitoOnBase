// Request models
export interface LoginRequest {
  username: string;
  password: string;
}

export interface MfaVerifyRequest {
  username: string;
  code: string;
  session: string;
  challengeType: string;
}

export interface MfaSelectRequest {
  username: string;
  session: string;
  mfaMethod: string;
}

export interface TotpSetupVerifyRequest {
  code: string;
  deviceName?: string;
}

export interface NewPasswordRequest {
  username: string;
  newPassword: string;
  session: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Response models
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface LoginResponse {
  authenticated: boolean;
  tokens?: TokenData;
  challenge?: ChallengeData;
  user?: UserData;
}

export interface TokenData {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface ChallengeData {
  type: ChallengeType;
  session?: string;
  parameters?: Record<string, string>;
  availableMfaMethods?: string[];
}

export enum ChallengeType {
  None = 'None',
  SmsMfa = 'SmsMfa',
  SoftwareTokenMfa = 'SoftwareTokenMfa',
  SelectMfaType = 'SelectMfaType',
  MfaSetup = 'MfaSetup',
  NewPasswordRequired = 'NewPasswordRequired',
  EmailOtp = 'EmailOtp',
}

export interface UserData {
  username: string;
  email?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  phoneNumberVerified: boolean;
  attributes?: Record<string, string>;
}

export interface TotpSetupResponse {
  secretCode: string;
  session?: string;
  qrCodeUri: string;
}

export interface TotpVerifyResponse {
  status: string;
}

export interface MfaPreferenceResponse {
  smsEnabled: boolean;
  totpEnabled: boolean;
  emailEnabled: boolean;
  preferredMethod?: string;
}

// Auth state
export interface AuthState {
  isAuthenticated: boolean;
  user?: UserData;
  tokens?: TokenData;
  pendingChallenge?: ChallengeData;
  pendingUsername?: string;
}
