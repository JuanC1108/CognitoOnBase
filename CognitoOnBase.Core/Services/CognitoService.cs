using System.Security.Cryptography;
using System.Text;
using Amazon;
using Amazon.CognitoIdentityProvider;
using Amazon.CognitoIdentityProvider.Model;
using CognitoOnBase.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CognitoOnBase.Core.Services;

/// <summary>
/// AWS Cognito authentication service implementation
/// </summary>
public class CognitoService : ICognitoService
{
    private readonly AmazonCognitoIdentityProviderClient _cognitoClient;
    private readonly CognitoSettings _settings;
    private readonly ILogger<CognitoService> _logger;

    public CognitoService(IOptions<CognitoSettings> settings, ILogger<CognitoService> logger)
    {
        _settings = settings.Value;
        _logger = logger;

        var region = RegionEndpoint.GetBySystemName(_settings.Region);
        _cognitoClient = new AmazonCognitoIdentityProviderClient(region);
    }

    public async Task<AuthenticationResult> LoginAsync(string username, string password)
    {
        try
        {
            var authParams = new Dictionary<string, string>
            {
                { "USERNAME", username },
                { "PASSWORD", password }
            };

            if (!string.IsNullOrEmpty(_settings.ClientSecret))
            {
                authParams["SECRET_HASH"] = CalculateSecretHash(username);
            }

            var request = new InitiateAuthRequest
            {
                AuthFlow = AuthFlowType.USER_PASSWORD_AUTH,
                ClientId = _settings.ClientId,
                AuthParameters = authParams
            };

            var response = await _cognitoClient.InitiateAuthAsync(request);

            return HandleAuthResponse(response, username);
        }
        catch (NotAuthorizedException ex)
        {
            _logger.LogWarning("Login failed for user {Username}: {Message}", username, ex.Message);
            return new AuthenticationResult
            {
                Success = false,
                Message = "Invalid username or password"
            };
        }
        catch (UserNotFoundException)
        {
            _logger.LogWarning("User not found: {Username}", username);
            return new AuthenticationResult
            {
                Success = false,
                Message = "User not found"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login for user {Username}", username);
            return new AuthenticationResult
            {
                Success = false,
                Message = "An error occurred during authentication"
            };
        }
    }

    public async Task<MfaVerifyResult> VerifyMfaAsync(string username, string code, string session, ChallengeType challengeType)
    {
        try
        {
            var challengeName = challengeType switch
            {
                ChallengeType.SmsMfa => ChallengeNameType.SMS_MFA,
                ChallengeType.SoftwareTokenMfa => ChallengeNameType.SOFTWARE_TOKEN_MFA,
                ChallengeType.EmailOtp => ChallengeNameType.EMAIL_OTP,
                _ => throw new ArgumentException($"Invalid challenge type for MFA: {challengeType}")
            };

            var challengeResponses = new Dictionary<string, string>
            {
                { "USERNAME", username }
            };

            if (challengeType == ChallengeType.SoftwareTokenMfa)
            {
                challengeResponses["SOFTWARE_TOKEN_MFA_CODE"] = code;
            }
            else if (challengeType == ChallengeType.SmsMfa)
            {
                challengeResponses["SMS_MFA_CODE"] = code;
            }
            else if (challengeType == ChallengeType.EmailOtp)
            {
                challengeResponses["EMAIL_OTP_CODE"] = code;
            }

            if (!string.IsNullOrEmpty(_settings.ClientSecret))
            {
                challengeResponses["SECRET_HASH"] = CalculateSecretHash(username);
            }

            var request = new RespondToAuthChallengeRequest
            {
                ClientId = _settings.ClientId,
                ChallengeName = challengeName,
                Session = session,
                ChallengeResponses = challengeResponses
            };

            var response = await _cognitoClient.RespondToAuthChallengeAsync(request);

            if (response.AuthenticationResult != null)
            {
                var userInfo = await GetUserFromToken(response.AuthenticationResult.AccessToken);

                return new MfaVerifyResult
                {
                    Success = true,
                    Tokens = new TokenResult
                    {
                        AccessToken = response.AuthenticationResult.AccessToken,
                        IdToken = response.AuthenticationResult.IdToken,
                        RefreshToken = response.AuthenticationResult.RefreshToken,
                        ExpiresIn = response.AuthenticationResult.ExpiresIn
                    },
                    User = userInfo
                };
            }

            return new MfaVerifyResult
            {
                Success = false,
                Message = "MFA verification failed"
            };
        }
        catch (CodeMismatchException)
        {
            return new MfaVerifyResult
            {
                Success = false,
                Message = "Invalid verification code"
            };
        }
        catch (ExpiredCodeException)
        {
            return new MfaVerifyResult
            {
                Success = false,
                Message = "Verification code has expired"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during MFA verification for user {Username}", username);
            return new MfaVerifyResult
            {
                Success = false,
                Message = "An error occurred during MFA verification"
            };
        }
    }

    public async Task<TotpSetupResult> SetupTotpAsync(string accessToken)
    {
        try
        {
            var request = new AssociateSoftwareTokenRequest
            {
                AccessToken = accessToken
            };

            var response = await _cognitoClient.AssociateSoftwareTokenAsync(request);

            return new TotpSetupResult
            {
                Success = true,
                SecretCode = response.SecretCode,
                Session = response.Session
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during TOTP setup");
            return new TotpSetupResult
            {
                Success = false,
                Message = "Failed to initiate TOTP setup"
            };
        }
    }

    public async Task<TotpVerifySetupResult> VerifyTotpSetupAsync(string accessToken, string code, string friendlyDeviceName)
    {
        try
        {
            var request = new VerifySoftwareTokenRequest
            {
                AccessToken = accessToken,
                UserCode = code,
                FriendlyDeviceName = friendlyDeviceName
            };

            var response = await _cognitoClient.VerifySoftwareTokenAsync(request);

            return new TotpVerifySetupResult
            {
                Success = response.Status == VerifySoftwareTokenResponseType.SUCCESS,
                Status = response.Status.Value,
                Message = response.Status == VerifySoftwareTokenResponseType.SUCCESS
                    ? "TOTP setup completed successfully"
                    : "TOTP verification failed"
            };
        }
        catch (EnableSoftwareTokenMFAException ex)
        {
            _logger.LogWarning("TOTP setup verification failed: {Message}", ex.Message);
            return new TotpVerifySetupResult
            {
                Success = false,
                Message = "Invalid TOTP code"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during TOTP setup verification");
            return new TotpVerifySetupResult
            {
                Success = false,
                Message = "Failed to verify TOTP setup"
            };
        }
    }

    public async Task<AuthenticationResult> SetNewPasswordAsync(string username, string newPassword, string session)
    {
        try
        {
            var challengeResponses = new Dictionary<string, string>
            {
                { "USERNAME", username },
                { "NEW_PASSWORD", newPassword }
            };

            if (!string.IsNullOrEmpty(_settings.ClientSecret))
            {
                challengeResponses["SECRET_HASH"] = CalculateSecretHash(username);
            }

            var request = new RespondToAuthChallengeRequest
            {
                ClientId = _settings.ClientId,
                ChallengeName = ChallengeNameType.NEW_PASSWORD_REQUIRED,
                Session = session,
                ChallengeResponses = challengeResponses
            };

            var response = await _cognitoClient.RespondToAuthChallengeAsync(request);

            return HandleAuthResponse(response, username);
        }
        catch (InvalidPasswordException ex)
        {
            return new AuthenticationResult
            {
                Success = false,
                Message = ex.Message
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting new password for user {Username}", username);
            return new AuthenticationResult
            {
                Success = false,
                Message = "Failed to set new password"
            };
        }
    }

    public async Task<bool> SignOutAsync(string accessToken)
    {
        try
        {
            var request = new GlobalSignOutRequest
            {
                AccessToken = accessToken
            };

            await _cognitoClient.GlobalSignOutAsync(request);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during sign out");
            return false;
        }
    }

    public async Task<UserInfo?> GetUserAsync(string accessToken)
    {
        return await GetUserFromToken(accessToken);
    }

    public async Task<TokenResult?> RefreshTokenAsync(string refreshToken)
    {
        try
        {
            var authParams = new Dictionary<string, string>
            {
                { "REFRESH_TOKEN", refreshToken }
            };

            var request = new InitiateAuthRequest
            {
                AuthFlow = AuthFlowType.REFRESH_TOKEN_AUTH,
                ClientId = _settings.ClientId,
                AuthParameters = authParams
            };

            var response = await _cognitoClient.InitiateAuthAsync(request);

            if (response.AuthenticationResult != null)
            {
                return new TokenResult
                {
                    AccessToken = response.AuthenticationResult.AccessToken,
                    IdToken = response.AuthenticationResult.IdToken,
                    RefreshToken = response.AuthenticationResult.RefreshToken ?? refreshToken,
                    ExpiresIn = response.AuthenticationResult.ExpiresIn
                };
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing token");
            return null;
        }
    }

    public async Task<bool> SetMfaPreferenceAsync(string accessToken, string mfaMethod)
    {
        try
        {
            var request = new SetUserMFAPreferenceRequest
            {
                AccessToken = accessToken
            };

            switch (mfaMethod.ToLower())
            {
                case "totp":
                case "software_token":
                    request.SoftwareTokenMfaSettings = new SoftwareTokenMfaSettingsType
                    {
                        Enabled = true,
                        PreferredMfa = true
                    };
                    break;
                case "sms":
                    request.SMSMfaSettings = new SMSMfaSettingsType
                    {
                        Enabled = true,
                        PreferredMfa = true
                    };
                    break;
                default:
                    return false;
            }

            await _cognitoClient.SetUserMFAPreferenceAsync(request);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting MFA preference");
            return false;
        }
    }

    public async Task<MfaPreference?> GetMfaPreferenceAsync(string accessToken)
    {
        try
        {
            var user = await GetUserAsync(accessToken);
            if (user == null) return null;

            // Get MFA settings from user attributes
            var preference = new MfaPreference();

            if (user.Attributes != null)
            {
                if (user.Attributes.TryGetValue("custom:mfa_enabled", out var mfaEnabled))
                {
                    preference.TotpEnabled = mfaEnabled == "true";
                }
            }

            return preference;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting MFA preference");
            return null;
        }
    }

    private AuthenticationResult HandleAuthResponse(InitiateAuthResponse response, string username)
    {
        if (response.AuthenticationResult != null)
        {
            return new AuthenticationResult
            {
                Success = true,
                Tokens = new TokenResult
                {
                    AccessToken = response.AuthenticationResult.AccessToken,
                    IdToken = response.AuthenticationResult.IdToken,
                    RefreshToken = response.AuthenticationResult.RefreshToken,
                    ExpiresIn = response.AuthenticationResult.ExpiresIn
                }
            };
        }

        if (response.ChallengeName != null)
        {
            var challengeType = response.ChallengeName.Value switch
            {
                "SMS_MFA" => ChallengeType.SmsMfa,
                "SOFTWARE_TOKEN_MFA" => ChallengeType.SoftwareTokenMfa,
                "SELECT_MFA_TYPE" => ChallengeType.SelectMfaType,
                "MFA_SETUP" => ChallengeType.MfaSetup,
                "NEW_PASSWORD_REQUIRED" => ChallengeType.NewPasswordRequired,
                "EMAIL_OTP" => ChallengeType.EmailOtp,
                _ => ChallengeType.None
            };

            var challenge = new AuthenticationChallenge
            {
                Type = challengeType,
                Session = response.Session,
                Parameters = response.ChallengeParameters
            };

            // Extract available MFA methods for SELECT_MFA_TYPE
            if (challengeType == ChallengeType.SelectMfaType &&
                response.ChallengeParameters.TryGetValue("MFAS_CAN_CHOOSE", out var mfaOptions))
            {
                challenge.AvailableMfaMethods = ParseMfaOptions(mfaOptions);
            }

            return new AuthenticationResult
            {
                Success = false,
                Challenge = challenge,
                Message = $"Challenge required: {challengeType}"
            };
        }

        return new AuthenticationResult
        {
            Success = false,
            Message = "Authentication failed"
        };
    }

    private AuthenticationResult HandleAuthResponse(RespondToAuthChallengeResponse response, string username)
    {
        if (response.AuthenticationResult != null)
        {
            return new AuthenticationResult
            {
                Success = true,
                Tokens = new TokenResult
                {
                    AccessToken = response.AuthenticationResult.AccessToken,
                    IdToken = response.AuthenticationResult.IdToken,
                    RefreshToken = response.AuthenticationResult.RefreshToken,
                    ExpiresIn = response.AuthenticationResult.ExpiresIn
                }
            };
        }

        if (response.ChallengeName != null)
        {
            var challengeType = response.ChallengeName.Value switch
            {
                "SMS_MFA" => ChallengeType.SmsMfa,
                "SOFTWARE_TOKEN_MFA" => ChallengeType.SoftwareTokenMfa,
                "SELECT_MFA_TYPE" => ChallengeType.SelectMfaType,
                "MFA_SETUP" => ChallengeType.MfaSetup,
                "NEW_PASSWORD_REQUIRED" => ChallengeType.NewPasswordRequired,
                "EMAIL_OTP" => ChallengeType.EmailOtp,
                _ => ChallengeType.None
            };

            return new AuthenticationResult
            {
                Success = false,
                Challenge = new AuthenticationChallenge
                {
                    Type = challengeType,
                    Session = response.Session,
                    Parameters = response.ChallengeParameters
                },
                Message = $"Challenge required: {challengeType}"
            };
        }

        return new AuthenticationResult
        {
            Success = false,
            Message = "Authentication failed"
        };
    }

    private async Task<UserInfo?> GetUserFromToken(string accessToken)
    {
        try
        {
            var request = new GetUserRequest
            {
                AccessToken = accessToken
            };

            var response = await _cognitoClient.GetUserAsync(request);

            var attributes = response.UserAttributes.ToDictionary(a => a.Name, a => a.Value);

            return new UserInfo
            {
                Username = response.Username,
                Email = attributes.GetValueOrDefault("email"),
                PhoneNumber = attributes.GetValueOrDefault("phone_number"),
                EmailVerified = attributes.GetValueOrDefault("email_verified") == "true",
                PhoneNumberVerified = attributes.GetValueOrDefault("phone_number_verified") == "true",
                Attributes = attributes
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user from token");
            return null;
        }
    }

    private string CalculateSecretHash(string username)
    {
        var message = username + _settings.ClientId;
        var keyBytes = Encoding.UTF8.GetBytes(_settings.ClientSecret!);
        var messageBytes = Encoding.UTF8.GetBytes(message);

        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(messageBytes);
        return Convert.ToBase64String(hash);
    }

    private List<string> ParseMfaOptions(string mfaOptionsJson)
    {
        // Parse the JSON array of MFA options
        var options = new List<string>();
        try
        {
            // Simple parsing for ["SMS_MFA", "SOFTWARE_TOKEN_MFA"] format
            var cleaned = mfaOptionsJson.Trim('[', ']', ' ');
            var parts = cleaned.Split(',');
            foreach (var part in parts)
            {
                var option = part.Trim('"', ' ');
                if (!string.IsNullOrEmpty(option))
                {
                    options.Add(option);
                }
            }
        }
        catch
        {
            // Return empty list on parse error
        }
        return options;
    }
}
