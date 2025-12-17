using CognitoOnBase.Core.Models;

namespace CognitoOnBase.Core.Services;

/// <summary>
/// Interface for AWS Cognito authentication operations
/// </summary>
public interface ICognitoService
{
    /// <summary>
    /// Initiates authentication with username and password
    /// </summary>
    Task<AuthenticationResult> LoginAsync(string username, string password);

    /// <summary>
    /// Responds to an MFA challenge with the provided code
    /// </summary>
    Task<MfaVerifyResult> VerifyMfaAsync(string username, string code, string session, ChallengeType challengeType);

    /// <summary>
    /// Initiates TOTP MFA setup for a user
    /// </summary>
    Task<TotpSetupResult> SetupTotpAsync(string accessToken);

    /// <summary>
    /// Verifies and completes TOTP setup
    /// </summary>
    Task<TotpVerifySetupResult> VerifyTotpSetupAsync(string accessToken, string code, string friendlyDeviceName);

    /// <summary>
    /// Responds to a NEW_PASSWORD_REQUIRED challenge
    /// </summary>
    Task<AuthenticationResult> SetNewPasswordAsync(string username, string newPassword, string session);

    /// <summary>
    /// Signs out the user globally
    /// </summary>
    Task<bool> SignOutAsync(string accessToken);

    /// <summary>
    /// Gets the current user's information
    /// </summary>
    Task<UserInfo?> GetUserAsync(string accessToken);

    /// <summary>
    /// Refreshes the access token using a refresh token
    /// </summary>
    Task<TokenResult?> RefreshTokenAsync(string refreshToken);

    /// <summary>
    /// Sets MFA preference for the user
    /// </summary>
    Task<bool> SetMfaPreferenceAsync(string accessToken, string mfaMethod);

    /// <summary>
    /// Gets current MFA settings for the user
    /// </summary>
    Task<MfaPreference?> GetMfaPreferenceAsync(string accessToken);
}
