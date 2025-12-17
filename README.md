# CognitoOnBase - AWS Cognito MFA Test Application

A complete solution for testing AWS Cognito Multi-Factor Authentication (MFA), including TOTP (Time-based One-Time Password) and Email OTP verification.

## Project Structure

```
CognitoOnBase/
├── CognitoOnBase.Core/        # .NET Core library with Cognito service
├── CognitoOnBase.Console/     # CLI application for testing
├── CognitoOnBase.Api/         # Web API for Angular frontend
└── cognito-mfa-app/           # Angular 20 + Material 20 application
```

## Prerequisites

- .NET 8.0 SDK
- Node.js 18+ and npm
- Angular CLI 20
- AWS Account with Cognito User Pool configured

## Configuration

### AWS Cognito Setup

1. Create a User Pool in AWS Cognito
2. Enable MFA (optional or required)
3. Configure TOTP and/or Email OTP as MFA methods
4. Create an App Client (note the Client ID)

### API Configuration

Update `CognitoOnBase.Api/appsettings.json`:

```json
{
  "Cognito": {
    "Region": "us-east-1",
    "UserPoolId": "us-east-1_XXXXXXXXX",
    "ClientId": "your-client-id",
    "ClientSecret": null
  }
}
```

### Angular Configuration

Update `cognito-mfa-app/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api'
};
```

## Running the Application

### Backend API

```bash
cd CognitoOnBase.Api
dotnet restore
dotnet run
```

The API will be available at `http://localhost:5000` with Swagger UI at `/swagger`.

### Angular Frontend

```bash
cd cognito-mfa-app
npm install
ng serve
```

The app will be available at `http://localhost:4200`.

### Console Application (for testing)

```bash
cd CognitoOnBase.Console
dotnet run
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Initiate authentication |
| `/api/auth/mfa/verify` | POST | Verify MFA code |
| `/api/auth/mfa/totp/setup` | POST | Get TOTP secret for setup |
| `/api/auth/mfa/totp/verify` | POST | Verify TOTP setup |
| `/api/auth/password/new` | POST | Set new password |
| `/api/auth/logout` | POST | Sign out |
| `/api/auth/user` | GET | Get user info |
| `/api/auth/refresh` | POST | Refresh token |

## Angular Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | LoginComponent | User login |
| `/dashboard` | DashboardComponent | Main dashboard |
| `/mfa/totp-verify` | TotpVerifyComponent | TOTP code verification |
| `/mfa/totp-setup` | TotpSetupComponent | TOTP setup with QR |
| `/mfa/email-verify` | EmailVerifyComponent | Email OTP verification |
| `/mfa/select` | SelectComponent | MFA method selection |
| `/password/new` | NewPasswordComponent | New password form |

## Features

- **Login with MFA**: Supports TOTP, SMS, and Email OTP
- **TOTP Setup**: QR code generation and manual secret entry
- **Password Management**: Handle NEW_PASSWORD_REQUIRED challenge
- **MFA Selection**: Choose between available MFA methods
- **Session Management**: Token refresh and logout
- **Responsive Design**: Mobile-friendly Angular Material UI

## Technologies

- **Backend**: .NET 8.0, AWS SDK for .NET
- **Frontend**: Angular 20, Angular Material 20
- **Authentication**: AWS Cognito
- **QR Code**: qrcode library for TOTP setup

## License

MIT
