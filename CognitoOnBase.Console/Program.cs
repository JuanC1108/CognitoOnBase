using CognitoOnBase.Core.Extensions;
using CognitoOnBase.Core.Models;
using CognitoOnBase.Core.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CognitoOnBase.Console;

class Program
{
    static async Task Main(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var services = new ServiceCollection();
        services.AddLogging(builder => builder.AddConsole());
        services.AddCognitoServices(configuration);

        var serviceProvider = services.BuildServiceProvider();
        var cognitoService = serviceProvider.GetRequiredService<ICognitoService>();

        System.Console.WriteLine("╔══════════════════════════════════════════╗");
        System.Console.WriteLine("║   Cognito MFA Test Console Application   ║");
        System.Console.WriteLine("╚══════════════════════════════════════════╝");
        System.Console.WriteLine();

        while (true)
        {
            System.Console.WriteLine("\nSelect an option:");
            System.Console.WriteLine("1. Login");
            System.Console.WriteLine("2. Verify MFA Code");
            System.Console.WriteLine("3. Setup TOTP");
            System.Console.WriteLine("4. Verify TOTP Setup");
            System.Console.WriteLine("5. Get User Info");
            System.Console.WriteLine("6. Sign Out");
            System.Console.WriteLine("7. Exit");
            System.Console.Write("\nChoice: ");

            var choice = System.Console.ReadLine();

            switch (choice)
            {
                case "1":
                    await LoginFlow(cognitoService);
                    break;
                case "2":
                    await VerifyMfaFlow(cognitoService);
                    break;
                case "3":
                    await SetupTotpFlow(cognitoService);
                    break;
                case "4":
                    await VerifyTotpSetupFlow(cognitoService);
                    break;
                case "5":
                    await GetUserFlow(cognitoService);
                    break;
                case "6":
                    await SignOutFlow(cognitoService);
                    break;
                case "7":
                    System.Console.WriteLine("Goodbye!");
                    return;
                default:
                    System.Console.WriteLine("Invalid option. Please try again.");
                    break;
            }
        }
    }

    static string? currentSession;
    static string? currentUsername;
    static string? currentAccessToken;
    static ChallengeType currentChallengeType;

    static async Task LoginFlow(ICognitoService cognitoService)
    {
        System.Console.Write("Username: ");
        var username = System.Console.ReadLine() ?? "";

        System.Console.Write("Password: ");
        var password = ReadPassword();

        System.Console.WriteLine("\nAuthenticating...");
        var result = await cognitoService.LoginAsync(username, password);

        if (result.Success)
        {
            currentAccessToken = result.Tokens?.AccessToken;
            System.Console.WriteLine("✓ Login successful!");
            System.Console.WriteLine($"  Access Token: {result.Tokens?.AccessToken?[..50]}...");
        }
        else if (result.Challenge != null)
        {
            currentSession = result.Challenge.Session;
            currentUsername = username;
            currentChallengeType = result.Challenge.Type;

            System.Console.WriteLine($"⚠ Challenge required: {result.Challenge.Type}");

            if (result.Challenge.Type == ChallengeType.SelectMfaType)
            {
                System.Console.WriteLine("  Available MFA methods:");
                foreach (var method in result.Challenge.AvailableMfaMethods ?? [])
                {
                    System.Console.WriteLine($"    - {method}");
                }
            }
            else if (result.Challenge.Type == ChallengeType.NewPasswordRequired)
            {
                System.Console.WriteLine("  Please set a new password.");
            }
            else
            {
                System.Console.WriteLine("  Please use option 2 to verify your MFA code.");
            }
        }
        else
        {
            System.Console.WriteLine($"✗ Login failed: {result.Message}");
        }
    }

    static async Task VerifyMfaFlow(ICognitoService cognitoService)
    {
        if (string.IsNullOrEmpty(currentSession))
        {
            System.Console.WriteLine("No active MFA session. Please login first.");
            return;
        }

        System.Console.Write("Enter MFA code: ");
        var code = System.Console.ReadLine() ?? "";

        System.Console.WriteLine("Verifying...");
        var result = await cognitoService.VerifyMfaAsync(currentUsername!, code, currentSession, currentChallengeType);

        if (result.Success)
        {
            currentAccessToken = result.Tokens?.AccessToken;
            currentSession = null;
            System.Console.WriteLine("✓ MFA verification successful!");
            System.Console.WriteLine($"  Access Token: {result.Tokens?.AccessToken?[..50]}...");
        }
        else
        {
            System.Console.WriteLine($"✗ MFA verification failed: {result.Message}");
        }
    }

    static async Task SetupTotpFlow(ICognitoService cognitoService)
    {
        if (string.IsNullOrEmpty(currentAccessToken))
        {
            System.Console.WriteLine("No access token. Please login first.");
            return;
        }

        System.Console.WriteLine("Setting up TOTP...");
        var result = await cognitoService.SetupTotpAsync(currentAccessToken);

        if (result.Success)
        {
            System.Console.WriteLine("✓ TOTP setup initiated!");
            System.Console.WriteLine($"  Secret Code: {result.SecretCode}");
            System.Console.WriteLine("  Add this secret to your authenticator app.");
            currentSession = result.Session;
        }
        else
        {
            System.Console.WriteLine($"✗ TOTP setup failed: {result.Message}");
        }
    }

    static async Task VerifyTotpSetupFlow(ICognitoService cognitoService)
    {
        if (string.IsNullOrEmpty(currentAccessToken))
        {
            System.Console.WriteLine("No access token. Please login first.");
            return;
        }

        System.Console.Write("Enter TOTP code from authenticator: ");
        var code = System.Console.ReadLine() ?? "";

        System.Console.Write("Device name (optional): ");
        var deviceName = System.Console.ReadLine() ?? "MyDevice";

        System.Console.WriteLine("Verifying TOTP setup...");
        var result = await cognitoService.VerifyTotpSetupAsync(currentAccessToken, code, deviceName);

        if (result.Success)
        {
            System.Console.WriteLine("✓ TOTP setup complete!");
            System.Console.WriteLine($"  Status: {result.Status}");
        }
        else
        {
            System.Console.WriteLine($"✗ TOTP setup verification failed: {result.Message}");
        }
    }

    static async Task GetUserFlow(ICognitoService cognitoService)
    {
        if (string.IsNullOrEmpty(currentAccessToken))
        {
            System.Console.WriteLine("No access token. Please login first.");
            return;
        }

        System.Console.WriteLine("Getting user info...");
        var user = await cognitoService.GetUserAsync(currentAccessToken);

        if (user != null)
        {
            System.Console.WriteLine("✓ User info retrieved:");
            System.Console.WriteLine($"  Username: {user.Username}");
            System.Console.WriteLine($"  Email: {user.Email}");
            System.Console.WriteLine($"  Email Verified: {user.EmailVerified}");
            System.Console.WriteLine($"  Phone: {user.PhoneNumber}");
            System.Console.WriteLine($"  Phone Verified: {user.PhoneNumberVerified}");
        }
        else
        {
            System.Console.WriteLine("✗ Failed to get user info.");
        }
    }

    static async Task SignOutFlow(ICognitoService cognitoService)
    {
        if (string.IsNullOrEmpty(currentAccessToken))
        {
            System.Console.WriteLine("No access token. Please login first.");
            return;
        }

        System.Console.WriteLine("Signing out...");
        var success = await cognitoService.SignOutAsync(currentAccessToken);

        if (success)
        {
            currentAccessToken = null;
            currentSession = null;
            currentUsername = null;
            System.Console.WriteLine("✓ Signed out successfully!");
        }
        else
        {
            System.Console.WriteLine("✗ Sign out failed.");
        }
    }

    static string ReadPassword()
    {
        var password = "";
        ConsoleKeyInfo key;

        do
        {
            key = System.Console.ReadKey(true);

            if (key.Key != ConsoleKey.Enter && key.Key != ConsoleKey.Backspace)
            {
                password += key.KeyChar;
                System.Console.Write("*");
            }
            else if (key.Key == ConsoleKey.Backspace && password.Length > 0)
            {
                password = password[..^1];
                System.Console.Write("\b \b");
            }
        } while (key.Key != ConsoleKey.Enter);

        System.Console.WriteLine();
        return password;
    }
}
