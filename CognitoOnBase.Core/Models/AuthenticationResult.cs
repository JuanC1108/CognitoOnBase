namespace CognitoOnBase.Core.Models;

/// <summary>
/// Result of an authentication attempt
/// </summary>
public class AuthenticationResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public AuthenticationChallenge? Challenge { get; set; }
    public TokenResult? Tokens { get; set; }
    public UserInfo? User { get; set; }
}

/// <summary>
/// Challenge types for MFA and password changes
/// </summary>
public enum ChallengeType
{
    None,
    SmsMfa,
    SoftwareTokenMfa,
    SelectMfaType,
    MfaSetup,
    NewPasswordRequired,
    EmailOtp
}

/// <summary>
/// Details about an authentication challenge
/// </summary>
public class AuthenticationChallenge
{
    public ChallengeType Type { get; set; }
    public string? Session { get; set; }
    public Dictionary<string, string>? Parameters { get; set; }
    public List<string>? AvailableMfaMethods { get; set; }
}

/// <summary>
/// JWT tokens from successful authentication
/// </summary>
public class TokenResult
{
    public string AccessToken { get; set; } = string.Empty;
    public string IdToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
}

/// <summary>
/// Basic user information
/// </summary>
public class UserInfo
{
    public string Username { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public bool EmailVerified { get; set; }
    public bool PhoneNumberVerified { get; set; }
    public Dictionary<string, string>? Attributes { get; set; }
}
