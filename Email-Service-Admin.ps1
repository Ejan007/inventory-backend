# Email-Service-Admin.ps1
#
# This PowerShell script provides a simple menu for common email service
# administration and testing tasks.
#
# Usage:
#   .\Email-Service-Admin.ps1

function Show-Menu {
    Clear-Host
    Write-Host "========================================"
    Write-Host "   StockIT Email Service Administration"
    Write-Host "========================================"
    Write-Host
    Write-Host "1: Create Ethereal test account"
    Write-Host "2: Test email templates"
    Write-Host "3: Test email integration"
    Write-Host "4: Run inventory check (manual)"
    Write-Host "5: Schedule daily inventory check (8:00 AM)"
    Write-Host "6: Schedule hourly inventory check"
    Write-Host "7: View email logs"
    Write-Host "Q: Quit"
    Write-Host
}

function Create-EtherealAccount {
    Write-Host "Creating Ethereal test account..."
    npm run email:ethereal
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Test-EmailTemplates {
    Write-Host "Testing email templates..."
    npm run email:test
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Test-EmailIntegration {
    Write-Host "Testing email integration..."
    npm run email:integration
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Run-InventoryCheck {
    Write-Host "Running inventory check..."
    npm run email:inventory-check
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Schedule-DailyCheck {
    Write-Host "Scheduling daily inventory check at 8:00 AM..."
    .\Schedule-InventoryCheck.ps1 -Frequency Daily -Time "08:00"
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function Schedule-HourlyCheck {
    Write-Host "Scheduling hourly inventory check..."
    .\Schedule-InventoryCheck.ps1 -Frequency Hourly
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

function View-EmailLogs {
    Write-Host "Email Logs:"
    Write-Host "===================="
    
    $logsPath = Join-Path (Get-Location) "logs"
    $logFile = Join-Path $logsPath "email-service.log"
    $errorLogFile = Join-Path $logsPath "email-service-error.log"
    
    if (Test-Path $logFile) {
        Write-Host "`nRecent email activity (last 10 entries):"
        Get-Content $logFile -Tail 10 | ForEach-Object {
            try {
                $entry = ConvertFrom-Json $_
                Write-Host "[$($entry.timestamp)] $($entry.type) | Recipients: $($entry.recipientCount) | Status: $($entry.success ? 'SUCCESS' : 'FAILED')"
            } catch {
                Write-Host $_
            }
        }
    } else {
        Write-Host "No email logs found."
    }
    
    if (Test-Path $errorLogFile) {
        Write-Host "`nRecent errors (last 5 entries):"
        Get-Content $errorLogFile -Tail 5 | ForEach-Object {
            try {
                $entry = ConvertFrom-Json $_
                Write-Host "[$($entry.timestamp)] $($entry.type) | Error: $($entry.error)"
            } catch {
                Write-Host $_
            }
        }
    }
    
    Write-Host "`nPress any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Main menu loop
do {
    Show-Menu
    $input = Read-Host "Please make a selection"
    
    switch ($input) {
        '1' { Create-EtherealAccount }
        '2' { Test-EmailTemplates }
        '3' { Test-EmailIntegration }
        '4' { Run-InventoryCheck }
        '5' { Schedule-DailyCheck }
        '6' { Schedule-HourlyCheck }
        '7' { View-EmailLogs }
        'q' { return }
        default { 
            Write-Host "Invalid selection. Press any key to continue..."
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
    }
} until ($input -eq 'q')
