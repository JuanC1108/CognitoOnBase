namespace CognitoOnBase.Core.Models;

/// <summary>
/// Result of MFA verification
/// </summary>
public class MfaVerifyResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public TokenResult? Tokens { get; set; }
    public UserInfo? User { get; set; }
}

/// <summary>
/// Result of TOTP setup initiation
/// </summary>
public class TotpSetupResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? SecretCode { get; set; }
    public string? Session { get; set; }
}

/// <summary>
/// Result of TOTP setup verification
/// </summary>
public class TotpVerifySetupResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? Status { get; set; }
}

/// <summary>
/// MFA preference settings
/// </summary>
public class MfaPreference
{
    public bool SmsEnabled { get; set; }
    public bool TotpEnabled { get; set; }
    public bool EmailEnabled { get; set; }
    public string? PreferredMethod { get; set; }
}
