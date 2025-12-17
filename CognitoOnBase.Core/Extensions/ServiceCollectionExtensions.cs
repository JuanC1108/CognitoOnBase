using CognitoOnBase.Core.Models;
using CognitoOnBase.Core.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CognitoOnBase.Core.Extensions;

/// <summary>
/// Extension methods for configuring Cognito services
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds Cognito authentication services to the service collection
    /// </summary>
    public static IServiceCollection AddCognitoServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<CognitoSettings>(configuration.GetSection("Cognito"));
        services.AddScoped<ICognitoService, CognitoService>();

        return services;
    }

    /// <summary>
    /// Adds Cognito authentication services with explicit settings
    /// </summary>
    public static IServiceCollection AddCognitoServices(this IServiceCollection services, Action<CognitoSettings> configureSettings)
    {
        services.Configure(configureSettings);
        services.AddScoped<ICognitoService, CognitoService>();

        return services;
    }
}
