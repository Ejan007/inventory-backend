# Test Email Service PowerShell Script
# This script tests the StockIT email service endpoints to verify functionality
# It performs quick tests of the fixed endpoints and shows results

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   STOCKIT EMAIL SERVICE TEST UTILITY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Determine the directory the script is running from
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "Using Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed or not in PATH. Please install Node.js." -ForegroundColor Red
    exit 1
}

# Check if the server is running
$serverRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:4000/api/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $serverRunning = $true
        Write-Host "Server is running!" -ForegroundColor Green
    }
} catch {
    Write-Host "Server is not running. Would you like to start it? (Y/N)" -ForegroundColor Yellow
    $startServer = Read-Host
    
    if ($startServer -eq "Y" -or $startServer -eq "y") {
        Write-Host "Starting server..." -ForegroundColor Yellow
        Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$scriptDir'; npm run dev"
        
        # Wait for server to start
        Write-Host "Waiting for server to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        # Check again if server is running
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $serverRunning = $true
                Write-Host "Server started successfully!" -ForegroundColor Green
            }
        } catch {
            Write-Host "Failed to start server. Please start it manually with 'npm run dev'" -ForegroundColor Red
        }
    } else {
        Write-Host "Please start the server with 'npm run dev' and run this script again." -ForegroundColor Yellow
        exit 1
    }
}

if (-not $serverRunning) {
    Write-Host "Cannot proceed without a running server. Please start it with 'npm run dev'" -ForegroundColor Red
    exit 1
}

function Show-Menu {
    Write-Host "`nSelect a test to run:" -ForegroundColor Cyan
    Write-Host "1. Test Welcome Email (previously failing)" -ForegroundColor White
    Write-Host "2. Test Password Reset Email (previously failing)" -ForegroundColor White
    Write-Host "3. Test All Email Templates Rendering" -ForegroundColor White
    Write-Host "4. Run Comprehensive Email Tests" -ForegroundColor White
    Write-Host "5. Run All Tests" -ForegroundColor White
    Write-Host "6. Exit" -ForegroundColor White
    
    $selection = Read-Host "Enter selection (1-6)"
    return $selection
}

function Run-TestCommand {
    param (
        [string]$TestName,
        [string]$Command
    )
    
    Write-Host "`n---------------------------------------" -ForegroundColor Yellow
    Write-Host "Running test: $TestName" -ForegroundColor Yellow
    Write-Host "Command: $Command" -ForegroundColor Yellow
    Write-Host "---------------------------------------" -ForegroundColor Yellow
    
    try {
        # Execute the command
        $output = Invoke-Expression $Command 2>&1
        
        # Check if the command was successful
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Test completed successfully!" -ForegroundColor Green
        } else {
            Write-Host "`n❌ Test failed with exit code $LASTEXITCODE" -ForegroundColor Red
        }
        
        # Let the user know they can scroll up to see details
        Write-Host "`nScroll up to see test details.`n" -ForegroundColor Cyan
        
        # Ask if they want to see the output again
        Write-Host "Would you like to see the output again? (Y/N)" -ForegroundColor Yellow
        $showOutput = Read-Host
        
        if ($showOutput -eq "Y" -or $showOutput -eq "y") {
            $output | ForEach-Object { Write-Host $_ }
        }
    } catch {
        Write-Host "Error running test: $_" -ForegroundColor Red
    }
}

# Main menu loop
do {
    $selection = Show-Menu
    
    switch ($selection) {
        "1" {
            Run-TestCommand -TestName "Welcome Email Test" -Command "npm run email:fix-test -- --welcome-only"
        }
        "2" {
            Run-TestCommand -TestName "Password Reset Email Test" -Command "npm run email:fix-test -- --password-only" 
        }
        "3" {
            Run-TestCommand -TestName "Email Templates Test" -Command "npm run email:test"
        }
        "4" {
            Run-TestCommand -TestName "Comprehensive Email Test" -Command "npm run email:full-test"
        }
        "5" {
            Run-TestCommand -TestName "All Email Tests" -Command "npm run email:run-all-tests"
        }
        "6" {
            Write-Host "`nThank you for using the StockIT Email Test Utility!" -ForegroundColor Cyan
            exit 0
        }
        default {
            Write-Host "Invalid selection. Please try again." -ForegroundColor Red
        }
    }
    
    Write-Host "`nPress Enter to return to the menu..." -ForegroundColor Yellow
    Read-Host
} while ($true)
