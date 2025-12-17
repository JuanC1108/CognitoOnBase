# Cognito User Pool Infrastructure

This directory contains the infrastructure code to set up an AWS Cognito User Pool with MFA support for the CognitoOnBase test application.

## Prerequisites

1. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```

2. **jq** for JSON parsing (optional but recommended)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install jq

   # macOS
   brew install jq
   ```

## Files

| File | Description |
|------|-------------|
| `cognito-user-pool.yaml` | CloudFormation template for Cognito resources |
| `deploy.sh` | Deployment script |
| `create-test-user.sh` | Script to create test users |
| `destroy.sh` | Script to delete the stack |

## Quick Start

### 1. Deploy the User Pool

```bash
cd infrastructure
chmod +x *.sh
./deploy.sh dev us-east-1
```

This will:
- Create a Cognito User Pool with MFA enabled (optional)
- Create two app clients (one for Angular, one for API)
- Generate configuration files for both projects
- Display all the outputs you need

### 2. Create a Test User

```bash
./create-test-user.sh testuser@example.com MyPassword123!
```

### 3. Update Configuration

The deploy script automatically generates:
- `CognitoOnBase.Api/appsettings.dev.json`
- `cognito-mfa-app/src/environments/environment.dev.ts`

You may need to copy or merge these with your existing configuration files.

## CloudFormation Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| Environment | dev | Environment name (dev, staging, prod) |
| AppName | CognitoMFATest | Application name for resource naming |
| MfaConfiguration | OPTIONAL | MFA mode: OFF, OPTIONAL, or ON |
| AllowedCallbackURLs | localhost:4200 | OAuth callback URLs |
| AllowedLogoutURLs | localhost:4200 | OAuth logout URLs |

## Resources Created

1. **User Pool** - Main Cognito User Pool
   - Password policy (8+ chars, upper, lower, number, symbol)
   - Email as username
   - Auto-verify email
   - TOTP MFA enabled

2. **User Pool Domain** - For Hosted UI (optional)

3. **App Client (Public)** - For Angular SPA
   - No client secret
   - USER_PASSWORD_AUTH flow
   - OAuth/OIDC enabled

4. **App Client (Confidential)** - For backend API
   - With client secret
   - ADMIN_USER_PASSWORD_AUTH flow

5. **Resource Server** - For API scopes (optional)

6. **User Groups** - Admins and Users

## MFA Configuration

The template supports:

### TOTP (Time-based One-Time Password)
- Enabled by default
- Works with Google Authenticator, Authy, Microsoft Authenticator

### SMS MFA (Optional)
To enable SMS MFA:
1. Uncomment `SMS_MFA` in the `EnabledMfas` section
2. Configure SNS for SMS sending
3. Verify a phone number in SNS sandbox (for testing)

### Email OTP
Email OTP requires Amazon SES configuration. By default, Cognito uses its own email service for verification codes.

## Environments

Deploy to different environments:

```bash
# Development
./deploy.sh dev us-east-1

# Staging
./deploy.sh staging us-east-1

# Production
./deploy.sh prod us-east-1
```

## Cleanup

To delete all resources:

```bash
./destroy.sh dev us-east-1
```

**Warning**: This will delete all users and data in the User Pool.

## Outputs

After deployment, you'll get:

| Output | Description |
|--------|-------------|
| UserPoolId | The User Pool ID |
| UserPoolClientId | Client ID for Angular app |
| UserPoolClientIdConfidential | Client ID for API (with secret) |
| UserPoolDomain | Hosted UI domain |
| HostedUIURL | Direct link to Hosted UI login |

## Manual Configuration

If you need to configure manually, update:

**CognitoOnBase.Api/appsettings.json**:
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

**cognito-mfa-app/src/environments/environment.ts**:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api'
};
```

## Troubleshooting

### "User pool domain already exists"
The domain name must be globally unique. The script uses your AWS account ID to make it unique.

### "Cannot delete user pool with domain"
The destroy script handles this, but if you manually delete, remove the domain first:
```bash
aws cognito-idp delete-user-pool-domain --domain your-domain --user-pool-id your-pool-id
```

### MFA not working
1. Ensure MfaConfiguration is set to OPTIONAL or ON
2. Check that SOFTWARE_TOKEN_MFA is in EnabledMfas
3. Verify the user has completed TOTP setup
