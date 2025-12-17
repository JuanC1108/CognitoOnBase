namespace CognitoOnBase.Core.Models;

/// <summary>
/// AWS Cognito configuration settings
/// </summary>
public class CognitoSettings
{
    public string Region { get; set; } = "us-east-1";
    public string UserPoolId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string? ClientSecret { get; set; }
}
