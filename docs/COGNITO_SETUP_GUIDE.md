# Guía de Configuración de AWS Cognito con MFA

## Índice
1. [Crear User Pool](#1-crear-user-pool)
2. [Configurar MFA](#2-configurar-mfa)
3. [Crear App Client](#3-crear-app-client)
4. [Configurar Email OTP](#4-configurar-email-otp)
5. [Crear Usuario de Prueba](#5-crear-usuario-de-prueba)
6. [Configurar la Aplicación](#6-configurar-la-aplicación)

---

## 1. Crear User Pool

### AWS Console
1. Ir a **AWS Console → Amazon Cognito → User pools**
2. Click en **Create user pool**

### Configuración de Sign-in
```
┌─────────────────────────────────────────────────────────────┐
│ Cognito user pool sign-in options                          │
│                                                             │
│ ☐ User name                                                │
│ ✅ Email                                                    │
│ ☐ Phone number                                             │
│                                                             │
│ User name requirements:                                     │
│ ✅ Make user name case insensitive                         │
└─────────────────────────────────────────────────────────────┘
```

### Política de Contraseñas
```
┌─────────────────────────────────────────────────────────────┐
│ Password policy                                             │
│                                                             │
│ ● Custom                                                    │
│                                                             │
│ Password minimum length: [8]                                │
│                                                             │
│ Password requirements:                                      │
│ ✅ Contains at least 1 uppercase letter                    │
│ ✅ Contains at least 1 lowercase letter                    │
│ ✅ Contains at least 1 number                              │
│ ✅ Contains at least 1 special character                   │
│                                                             │
│ Temporary password expiration: [7] days                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Configurar MFA

### Configuración Básica de MFA
```
┌─────────────────────────────────────────────────────────────┐
│ Multi-factor authentication                                 │
│                                                             │
│ MFA enforcement:                                            │
│ ○ No MFA                                                    │
│ ● Optional MFA  ← Recomendado para desarrollo              │
│ ○ Required MFA  ← Recomendado para producción              │
│                                                             │
│ MFA methods:                                                │
│ ✅ Authenticator apps (TOTP)                               │
│    - Google Authenticator, Authy, Microsoft Authenticator  │
│                                                             │
│ ☐ SMS text message                                         │
│    - Requiere configuración de Amazon SNS                  │
│    - Costo adicional por SMS enviado                       │
└─────────────────────────────────────────────────────────────┘
```

### TOTP (Authenticator Apps)
- **No requiere configuración adicional**
- Compatible con:
  - Google Authenticator
  - Microsoft Authenticator
  - Authy
  - 1Password
  - Cualquier app compatible con TOTP

### SMS MFA (Opcional)
Para habilitar SMS:
1. Ir a **Amazon SNS → Text messaging (SMS)**
2. En sandbox, verificar número de teléfono destino
3. Para producción, solicitar salir del sandbox

---

## 3. Crear App Client

### Configuración del Cliente para Angular (SPA)
```
┌─────────────────────────────────────────────────────────────┐
│ App client settings                                         │
│                                                             │
│ App client name: [angular-client]                           │
│                                                             │
│ Client secret:                                              │
│ ○ Generate client secret                                    │
│ ● Don't generate client secret  ← Para SPAs                │
│                                                             │
│ Authentication flows:                                       │
│ ✅ ALLOW_USER_PASSWORD_AUTH                                │
│ ✅ ALLOW_REFRESH_TOKEN_AUTH                                │
│ ✅ ALLOW_USER_SRP_AUTH                                     │
│ ☐ ALLOW_ADMIN_USER_PASSWORD_AUTH                          │
│                                                             │
│ Token expiration:                                           │
│ Access token: [1] hour                                      │
│ ID token: [1] hour                                          │
│ Refresh token: [30] days                                    │
└─────────────────────────────────────────────────────────────┘
```

### Configuración del Cliente para API (Backend)
```
┌─────────────────────────────────────────────────────────────┐
│ App client settings                                         │
│                                                             │
│ App client name: [api-client]                               │
│                                                             │
│ Client secret:                                              │
│ ● Generate client secret  ← Para backends                  │
│                                                             │
│ Authentication flows:                                       │
│ ✅ ALLOW_USER_PASSWORD_AUTH                                │
│ ✅ ALLOW_REFRESH_TOKEN_AUTH                                │
│ ✅ ALLOW_ADMIN_USER_PASSWORD_AUTH                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Configurar Email OTP

### Opción A: Usando Advanced Security (Recomendado)

1. Ir a **User pool → User pool properties**
2. En **Advanced security features**, click **Edit**

```
┌─────────────────────────────────────────────────────────────┐
│ Advanced security features                                  │
│                                                             │
│ ● Audit only - recomendado para desarrollo                 │
│ ○ Full function - recomendado para producción              │
│                                                             │
│ Custom authentication:                                      │
│ ✅ Enable email-based MFA                                  │
│                                                             │
│ Compromised credentials:                                    │
│ ✅ Block use of compromised credentials                    │
└─────────────────────────────────────────────────────────────┘
```

### Opción B: Usando Lambda Triggers (Avanzado)

Para control total sobre Email OTP:
1. Crear Lambda para **Define Auth Challenge**
2. Crear Lambda para **Create Auth Challenge**
3. Crear Lambda para **Verify Auth Challenge**

---

## 5. Crear Usuario de Prueba

### Usando AWS Console

1. Ir a **User pool → Users → Create user**

```
┌─────────────────────────────────────────────────────────────┐
│ Create user                                                 │
│                                                             │
│ User name: [testuser@example.com]                           │
│                                                             │
│ Email address:                                              │
│ ● Send an email invitation                                  │
│ ○ Mark email address as verified                           │
│                                                             │
│ Temporary password:                                         │
│ ○ Generate a password                                       │
│ ● Set a password: [TestPassword123!]                        │
└─────────────────────────────────────────────────────────────┘
```

### Usando AWS CLI

```bash
# Variables
USER_POOL_ID="us-east-1_XXXXXXXXX"
EMAIL="testuser@example.com"
PASSWORD="TestPassword123!"

# Crear usuario
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username $EMAIL \
  --user-attributes Name=email,Value=$EMAIL Name=email_verified,Value=true \
  --temporary-password $PASSWORD \
  --message-action SUPPRESS

# Establecer contraseña permanente (evitar FORCE_CHANGE_PASSWORD)
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username $EMAIL \
  --password $PASSWORD \
  --permanent
```

---

## 6. Configurar la Aplicación

### Backend (.NET API)

Actualizar `CognitoOnBase.Api/appsettings.json`:

```json
{
  "Cognito": {
    "Region": "us-east-1",
    "UserPoolId": "us-east-1_XXXXXXXXX",
    "ClientId": "xxxxxxxxxxxxxxxxxxxxxxxxxx",
    "ClientSecret": null
  }
}
```

### Frontend (Angular)

Actualizar `cognito-mfa-app/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api'
};
```

---

## Flujo de Autenticación con MFA

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Usuario   │────▶│   Login     │────▶│ ¿MFA Configurado?   │
└─────────────┘     └─────────────┘     └─────────────────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
          ┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
          │  No MFA         │          │ TOTP Challenge  │          │ Select MFA Type │
          │  → Dashboard    │          │ → Verify Code   │          │ → Choose Method │
          └─────────────────┘          └─────────────────┘          └─────────────────┘
                                                │                              │
                                                ▼                              ▼
                                       ┌─────────────────┐          ┌─────────────────┐
                                       │ Código Válido?  │          │ TOTP / SMS /    │
                                       │ → Dashboard     │          │ Email Selected  │
                                       └─────────────────┘          └─────────────────┘
```

---

## Challenges de Cognito

| Challenge | Descripción | Componente Angular |
|-----------|-------------|-------------------|
| `SOFTWARE_TOKEN_MFA` | Verificar código TOTP | `/mfa/totp-verify` |
| `SMS_MFA` | Verificar código SMS | `/mfa/totp-verify` |
| `EMAIL_OTP` | Verificar código Email | `/mfa/email-verify` |
| `SELECT_MFA_TYPE` | Elegir método MFA | `/mfa/select` |
| `MFA_SETUP` | Configurar MFA inicial | `/mfa/totp-setup` |
| `NEW_PASSWORD_REQUIRED` | Cambiar contraseña temporal | `/password/new` |

---

## Comandos Útiles de AWS CLI

```bash
# Listar User Pools
aws cognito-idp list-user-pools --max-results 10

# Obtener detalles del User Pool
aws cognito-idp describe-user-pool --user-pool-id us-east-1_XXXXXXXXX

# Listar usuarios
aws cognito-idp list-users --user-pool-id us-east-1_XXXXXXXXX

# Habilitar MFA para usuario
aws cognito-idp admin-set-user-mfa-preference \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username testuser@example.com \
  --software-token-mfa-settings Enabled=true,PreferredMfa=true

# Ver configuración MFA del usuario
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username testuser@example.com

# Resetear MFA del usuario
aws cognito-idp admin-set-user-mfa-preference \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username testuser@example.com \
  --software-token-mfa-settings Enabled=false,PreferredMfa=false
```

---

## Troubleshooting

### "User is not confirmed"
```bash
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username testuser@example.com
```

### "Invalid code"
- Verificar que el reloj del dispositivo esté sincronizado (TOTP)
- Los códigos expiran en 30 segundos

### "MFA not enabled"
1. Verificar que MFA esté en OPTIONAL o ON en User Pool
2. Verificar que el método MFA esté habilitado (TOTP/SMS)
3. El usuario debe completar setup de MFA primero

### "NotAuthorizedException"
- Verificar Client ID correcto
- Verificar que el auth flow esté habilitado
- Verificar credenciales del usuario
