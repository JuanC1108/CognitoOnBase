using System.ComponentModel.DataAnnotations;

namespace CognitoOnBase.Api.Models;

#region Request Models

/// <summary>
/// Login request model
/// </summary>
public class LoginRequest
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// MFA verification request model
/// </summary>
public class MfaVerifyRequest
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string Code { get; set; } = string.Empty;

    [Required]
    public string Session { get; set; } = string.Empty;

    [Required]
    public string ChallengeType { get; set; } = string.Empty;
}

/// <summary>
/// MFA method selection request
/// </summary>
public class MfaSelectRequest
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Session { get; set; } = string.Empty;

    [Required]
    public string MfaMethod { get; set; } = string.Empty;
}

/// <summary>
/// TOTP setup verification request
/// </summary>
public class TotpSetupVerifyRequest
{
    [Required]
    [StringLength(6, MinimumLength = 6)]
    public string Code { get; set; } = string.Empty;

    public string DeviceName { get; set; } = "MyDevice";
}

/// <summary>
/// New password request model
/// </summary>
public class NewPasswordRequest
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    public string Session { get; set; } = string.Empty;
}

/// <summary>
/// MFA preference update request
/// </summary>
public class MfaPreferenceRequest
{
    [Required]
    public string MfaMethod { get; set; } = string.Empty;
}

/// <summary>
/// Refresh token request
/// </summary>
public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}

#endregion

#region Response Models

/// <summary>
/// Generic API response wrapper
/// </summary>
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }
    public ApiError? Error { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null) => new()
    {
        Success = true,
        Data = data,
        Message = message
    };

    public static ApiResponse<T> Fail(string message, string? errorCode = null) => new()
    {
        Success = false,
        Message = message,
        Error = new ApiError { Code = errorCode ?? "ERROR", Message = message }
    };
}

/// <summary>
/// API error details
/// </summary>
public class ApiError
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Login response data
/// </summary>
public class LoginResponse
{
    public bool Authenticated { get; set; }
    public TokenData? Tokens { get; set; }
    public ChallengeData? Challenge { get; set; }
    public UserData? User { get; set; }
}

/// <summary>
/// Token data
/// </summary>
public class TokenData
{
    public string AccessToken { get; set; } = string.Empty;
    public string IdToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
}

/// <summary>
/// Challenge data for MFA
/// </summary>
public class ChallengeData
{
    public string Type { get; set; } = string.Empty;
    public string? Session { get; set; }
    public Dictionary<string, string>? Parameters { get; set; }
    public List<string>? AvailableMfaMethods { get; set; }
}

/// <summary>
/// User data
/// </summary>
public class UserData
{
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public bool EmailVerified { get; set; }
    public bool PhoneNumberVerified { get; set; }
    public Dictionary<string, string>? Attributes { get; set; }
}

/// <summary>
/// TOTP setup response data
/// </summary>
public class TotpSetupResponse
{
    public string SecretCode { get; set; } = string.Empty;
    public string? Session { get; set; }
    public string QrCodeUri { get; set; } = string.Empty;
}

/// <summary>
/// TOTP setup verification response
/// </summary>
public class TotpVerifyResponse
{
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// MFA preference response
/// </summary>
public class MfaPreferenceResponse
{
    public bool SmsEnabled { get; set; }
    public bool TotpEnabled { get; set; }
    public bool EmailEnabled { get; set; }
    public string? PreferredMethod { get; set; }
}

#endregion
