using CognitoOnBase.Api.Models;
using CognitoOnBase.Core.Models;
using CognitoOnBase.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CognitoOnBase.Api.Controllers;

/// <summary>
/// Authentication controller for Cognito MFA operations
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly ICognitoService _cognitoService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(ICognitoService cognitoService, ILogger<AuthController> logger)
    {
        _cognitoService = cognitoService;
        _logger = logger;
    }

    /// <summary>
    /// Initiates user authentication
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        _logger.LogInformation("Login attempt for user: {Username}", request.Username);

        var result = await _cognitoService.LoginAsync(request.Username, request.Password);

        var response = new LoginResponse
        {
            Authenticated = result.Success && result.Tokens != null
        };

        if (result.Success && result.Tokens != null)
        {
            response.Tokens = new TokenData
            {
                AccessToken = result.Tokens.AccessToken,
                IdToken = result.Tokens.IdToken,
                RefreshToken = result.Tokens.RefreshToken,
                ExpiresIn = result.Tokens.ExpiresIn
            };

            // Get user info
            var user = await _cognitoService.GetUserAsync(result.Tokens.AccessToken);
            if (user != null)
            {
                response.User = MapUserInfo(user);
            }

            return Ok(ApiResponse<LoginResponse>.Ok(response, "Login successful"));
        }

        if (result.Challenge != null)
        {
            response.Challenge = new ChallengeData
            {
                Type = result.Challenge.Type.ToString(),
                Session = result.Challenge.Session,
                Parameters = result.Challenge.Parameters,
                AvailableMfaMethods = result.Challenge.AvailableMfaMethods
            };

            return Ok(ApiResponse<LoginResponse>.Ok(response, $"Challenge required: {result.Challenge.Type}"));
        }

        return Unauthorized(ApiResponse<LoginResponse>.Fail(result.Message ?? "Authentication failed", "AUTH_FAILED"));
    }

    /// <summary>
    /// Verifies MFA code (TOTP, SMS, or Email)
    /// </summary>
    [HttpPost("mfa/verify")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> VerifyMfa([FromBody] MfaVerifyRequest request)
    {
        _logger.LogInformation("MFA verification for user: {Username}, Type: {Type}",
            request.Username, request.ChallengeType);

        var challengeType = Enum.Parse<ChallengeType>(request.ChallengeType, ignoreCase: true);
        var result = await _cognitoService.VerifyMfaAsync(
            request.Username,
            request.Code,
            request.Session,
            challengeType);

        if (result.Success && result.Tokens != null)
        {
            var response = new LoginResponse
            {
                Authenticated = true,
                Tokens = new TokenData
                {
                    AccessToken = result.Tokens.AccessToken,
                    IdToken = result.Tokens.IdToken,
                    RefreshToken = result.Tokens.RefreshToken,
                    ExpiresIn = result.Tokens.ExpiresIn
                }
            };

            if (result.User != null)
            {
                response.User = MapUserInfo(result.User);
            }

            return Ok(ApiResponse<LoginResponse>.Ok(response, "MFA verification successful"));
        }

        return Unauthorized(ApiResponse<LoginResponse>.Fail(
            result.Message ?? "MFA verification failed",
            "MFA_FAILED"));
    }

    /// <summary>
    /// Initiates TOTP setup for MFA
    /// </summary>
    [HttpPost("mfa/totp/setup")]
    [ProducesResponseType(typeof(ApiResponse<TotpSetupResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<TotpSetupResponse>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetupTotp([FromHeader(Name = "Authorization")] string authorization)
    {
        var accessToken = ExtractToken(authorization);
        if (string.IsNullOrEmpty(accessToken))
        {
            return BadRequest(ApiResponse<TotpSetupResponse>.Fail("Access token required", "TOKEN_REQUIRED"));
        }

        var result = await _cognitoService.SetupTotpAsync(accessToken);

        if (result.Success)
        {
            // Get user info to generate QR code URI
            var user = await _cognitoService.GetUserAsync(accessToken);
            var issuer = "CognitoMFA";
            var accountName = user?.Email ?? user?.Username ?? "user";

            var qrCodeUri = GenerateTotpUri(result.SecretCode!, issuer, accountName);

            var response = new TotpSetupResponse
            {
                SecretCode = result.SecretCode!,
                Session = result.Session,
                QrCodeUri = qrCodeUri
            };

            return Ok(ApiResponse<TotpSetupResponse>.Ok(response, "TOTP setup initiated"));
        }

        return BadRequest(ApiResponse<TotpSetupResponse>.Fail(
            result.Message ?? "TOTP setup failed",
            "TOTP_SETUP_FAILED"));
    }

    /// <summary>
    /// Verifies and completes TOTP setup
    /// </summary>
    [HttpPost("mfa/totp/verify")]
    [ProducesResponseType(typeof(ApiResponse<TotpVerifyResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<TotpVerifyResponse>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyTotpSetup(
        [FromHeader(Name = "Authorization")] string authorization,
        [FromBody] TotpSetupVerifyRequest request)
    {
        var accessToken = ExtractToken(authorization);
        if (string.IsNullOrEmpty(accessToken))
        {
            return BadRequest(ApiResponse<TotpVerifyResponse>.Fail("Access token required", "TOKEN_REQUIRED"));
        }

        var result = await _cognitoService.VerifyTotpSetupAsync(accessToken, request.Code, request.DeviceName);

        if (result.Success)
        {
            // Enable TOTP as preferred MFA method
            await _cognitoService.SetMfaPreferenceAsync(accessToken, "totp");

            var response = new TotpVerifyResponse
            {
                Status = result.Status ?? "SUCCESS"
            };

            return Ok(ApiResponse<TotpVerifyResponse>.Ok(response, "TOTP setup complete"));
        }

        return BadRequest(ApiResponse<TotpVerifyResponse>.Fail(
            result.Message ?? "TOTP verification failed",
            "TOTP_VERIFY_FAILED"));
    }

    /// <summary>
    /// Sets new password for NEW_PASSWORD_REQUIRED challenge
    /// </summary>
    [HttpPost("password/new")]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetNewPassword([FromBody] NewPasswordRequest request)
    {
        _logger.LogInformation("New password request for user: {Username}", request.Username);

        var result = await _cognitoService.SetNewPasswordAsync(
            request.Username,
            request.NewPassword,
            request.Session);

        var response = new LoginResponse
        {
            Authenticated = result.Success && result.Tokens != null
        };

        if (result.Success && result.Tokens != null)
        {
            response.Tokens = new TokenData
            {
                AccessToken = result.Tokens.AccessToken,
                IdToken = result.Tokens.IdToken,
                RefreshToken = result.Tokens.RefreshToken,
                ExpiresIn = result.Tokens.ExpiresIn
            };

            return Ok(ApiResponse<LoginResponse>.Ok(response, "Password set successfully"));
        }

        if (result.Challenge != null)
        {
            response.Challenge = new ChallengeData
            {
                Type = result.Challenge.Type.ToString(),
                Session = result.Challenge.Session,
                Parameters = result.Challenge.Parameters,
                AvailableMfaMethods = result.Challenge.AvailableMfaMethods
            };

            return Ok(ApiResponse<LoginResponse>.Ok(response, $"Challenge required: {result.Challenge.Type}"));
        }

        return BadRequest(ApiResponse<LoginResponse>.Fail(
            result.Message ?? "Failed to set new password",
            "PASSWORD_CHANGE_FAILED"));
    }

    /// <summary>
    /// Signs out the user globally
    /// </summary>
    [HttpPost("logout")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout([FromHeader(Name = "Authorization")] string authorization)
    {
        var accessToken = ExtractToken(authorization);
        if (string.IsNullOrEmpty(accessToken))
        {
            return Ok(ApiResponse<bool>.Ok(true, "Already logged out"));
        }

        var success = await _cognitoService.SignOutAsync(accessToken);

        return Ok(ApiResponse<bool>.Ok(success, success ? "Logged out successfully" : "Logout completed"));
    }

    /// <summary>
    /// Refreshes access token using refresh token
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(ApiResponse<TokenData>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<TokenData>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var result = await _cognitoService.RefreshTokenAsync(request.RefreshToken);

        if (result != null)
        {
            var response = new TokenData
            {
                AccessToken = result.AccessToken,
                IdToken = result.IdToken,
                RefreshToken = result.RefreshToken,
                ExpiresIn = result.ExpiresIn
            };

            return Ok(ApiResponse<TokenData>.Ok(response, "Token refreshed successfully"));
        }

        return Unauthorized(ApiResponse<TokenData>.Fail("Token refresh failed", "REFRESH_FAILED"));
    }

    /// <summary>
    /// Gets current user information
    /// </summary>
    [HttpGet("user")]
    [ProducesResponseType(typeof(ApiResponse<UserData>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<UserData>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetUser([FromHeader(Name = "Authorization")] string authorization)
    {
        var accessToken = ExtractToken(authorization);
        if (string.IsNullOrEmpty(accessToken))
        {
            return Unauthorized(ApiResponse<UserData>.Fail("Access token required", "TOKEN_REQUIRED"));
        }

        var user = await _cognitoService.GetUserAsync(accessToken);

        if (user != null)
        {
            return Ok(ApiResponse<UserData>.Ok(MapUserInfo(user)));
        }

        return Unauthorized(ApiResponse<UserData>.Fail("Failed to get user info", "USER_NOT_FOUND"));
    }

    /// <summary>
    /// Gets MFA preferences for the current user
    /// </summary>
    [HttpGet("mfa/preferences")]
    [ProducesResponseType(typeof(ApiResponse<MfaPreferenceResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMfaPreferences([FromHeader(Name = "Authorization")] string authorization)
    {
        var accessToken = ExtractToken(authorization);
        if (string.IsNullOrEmpty(accessToken))
        {
            return Unauthorized(ApiResponse<MfaPreferenceResponse>.Fail("Access token required", "TOKEN_REQUIRED"));
        }

        var prefs = await _cognitoService.GetMfaPreferenceAsync(accessToken);

        var response = new MfaPreferenceResponse
        {
            SmsEnabled = prefs?.SmsEnabled ?? false,
            TotpEnabled = prefs?.TotpEnabled ?? false,
            EmailEnabled = prefs?.EmailEnabled ?? false,
            PreferredMethod = prefs?.PreferredMethod
        };

        return Ok(ApiResponse<MfaPreferenceResponse>.Ok(response));
    }

    /// <summary>
    /// Sets MFA preference for the current user
    /// </summary>
    [HttpPost("mfa/preferences")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetMfaPreference(
        [FromHeader(Name = "Authorization")] string authorization,
        [FromBody] MfaPreferenceRequest request)
    {
        var accessToken = ExtractToken(authorization);
        if (string.IsNullOrEmpty(accessToken))
        {
            return Unauthorized(ApiResponse<bool>.Fail("Access token required", "TOKEN_REQUIRED"));
        }

        var success = await _cognitoService.SetMfaPreferenceAsync(accessToken, request.MfaMethod);

        if (success)
        {
            return Ok(ApiResponse<bool>.Ok(true, "MFA preference updated"));
        }

        return BadRequest(ApiResponse<bool>.Fail("Failed to update MFA preference", "MFA_PREF_FAILED"));
    }

    private static string? ExtractToken(string? authorization)
    {
        if (string.IsNullOrEmpty(authorization))
            return null;

        if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return authorization["Bearer ".Length..].Trim();

        return authorization;
    }

    private static UserData MapUserInfo(UserInfo user)
    {
        return new UserData
        {
            Username = user.Username,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            EmailVerified = user.EmailVerified,
            PhoneNumberVerified = user.PhoneNumberVerified,
            Attributes = user.Attributes
        };
    }

    private static string GenerateTotpUri(string secret, string issuer, string accountName)
    {
        var encodedIssuer = Uri.EscapeDataString(issuer);
        var encodedAccount = Uri.EscapeDataString(accountName);
        return $"otpauth://totp/{encodedIssuer}:{encodedAccount}?secret={secret}&issuer={encodedIssuer}&algorithm=SHA1&digits=6&period=30";
    }
}
