# StockIT Email Service Demo
# This script demonstrates how to use the fixed email service endpoints

# Set the base URL for our API
$base_url = "http://127.0.0.1:4000/api/email"

Write-Host "=== StockIT Email Service Demo ===" -ForegroundColor Cyan
Write-Host "This script demonstrates how to use the email service"
Write-Host

function Send-WelcomeEmail {
    param(
        [string]$Email,
        [string]$Name,
        [string]$Organization
    )
    
    Write-Host "Sending welcome email to $Email..." -ForegroundColor Yellow
    
    $body = @{
        recipient = $Email
        name = $Name
        organizationName = $Organization
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$base_url/welcome" -Method Post -Body $body -ContentType "application/json"
        Write-Host "Welcome email sent successfully!" -ForegroundColor Green
        Write-Host "Message ID: $($response.messageId)" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "Failed to send welcome email: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        }
        return $false
    }
}

function Send-PasswordResetEmail {
    param(
        [string]$Email,
        [string]$Username,
        [string]$ResetToken
    )
    
    Write-Host "Sending password reset email to $Email..." -ForegroundColor Yellow
    
    $body = @{
        recipient = $Email
        username = $Username
        resetToken = $ResetToken
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$base_url/password-reset" -Method Post -Body $body -ContentType "application/json"
        Write-Host "Password reset email sent successfully!" -ForegroundColor Green
        Write-Host "Message ID: $($response.messageId)" -ForegroundColor Gray
        return $true
    } catch {
        Write-Host "Failed to send password reset email: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $reader.DiscardBufferedData()
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        }
        return $false
    }
}

function Show-Menu {
    Write-Host
    Write-Host "Select an option:" -ForegroundColor Cyan
    Write-Host "1. Send welcome email" -ForegroundColor White
    Write-Host "2. Send password reset email" -ForegroundColor White
    Write-Host "3. Send both emails to the same recipient" -ForegroundColor White
    Write-Host "4. Exit" -ForegroundColor White
    
    $choice = Read-Host "Enter your choice (1-4)"
    return $choice
}

function Get-EmailInput {
    Write-Host
    $email = Read-Host "Enter recipient email address"
    return $email
}

function Confirm-ServerRunning {
    try {
        $null = Invoke-RestMethod -Uri "http://127.0.0.1:4000/api/health" -Method Get -TimeoutSec 2
        return $true
    } catch {
        Write-Host "Server is not running on port 4000!" -ForegroundColor Red
        Write-Host "Please start the server with 'npm run dev' first." -ForegroundColor Yellow
        return $false
    }
}

# Main script execution
if (-not (Confirm-ServerRunning)) {
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

do {
    $choice = Show-Menu
    
    switch ($choice) {
        "1" {
            $email = Get-EmailInput
            $name = Read-Host "Enter user's name"
            $org = Read-Host "Enter organization name"
            Send-WelcomeEmail -Email $email -Name $name -Organization $org
        }
        "2" {
            $email = Get-EmailInput
            $username = Read-Host "Enter username"
            $token = "reset-" + [Guid]::NewGuid().ToString().Substring(0, 8)
            Send-PasswordResetEmail -Email $email -Username $username -ResetToken $token
        }
        "3" {
            $email = Get-EmailInput
            $name = Read-Host "Enter user's name"
            $org = Read-Host "Enter organization name"
            $welcomeSuccess = Send-WelcomeEmail -Email $email -Name $name -Organization $org
            
            if ($welcomeSuccess) {
                Write-Host
                Write-Host "Now sending password reset email to the same recipient..." -ForegroundColor Yellow
                $token = "reset-" + [Guid]::NewGuid().ToString().Substring(0, 8)
                Send-PasswordResetEmail -Email $email -Username $name -ResetToken $token
            }
        }
        "4" {
            Write-Host "Exiting demo. Goodbye!" -ForegroundColor Cyan
            exit
        }
        default {
            Write-Host "Invalid selection. Please try again." -ForegroundColor Red
        }
    }
    
    Write-Host
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    Clear-Host
    Write-Host "=== StockIT Email Service Demo ===" -ForegroundColor Cyan
} while ($true)
