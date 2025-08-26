# Schedule-InventoryCheck.ps1
#
# This PowerShell script creates a scheduled task in Windows to run the inventory check
# at a specified frequency and send email alerts for low stock items.
#
# Usage:
#   .\Schedule-InventoryCheck.ps1 [-Frequency <Daily|Hourly>] [-Time <"HH:MM">]
#
# Examples:
#   .\Schedule-InventoryCheck.ps1 -Frequency Daily -Time "08:00"
#   .\Schedule-InventoryCheck.ps1 -Frequency Hourly

param (
    [Parameter()]
    [ValidateSet("Daily", "Hourly")]
    [string]$Frequency = "Daily",
    
    [Parameter()]
    [string]$Time = "08:00"
)

# Get the current script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodePath = "node.exe"
$scriptToRun = Join-Path $scriptPath "scripts\scheduledInventoryCheck.js"

# Task name and description
$taskName = "StockIT-InventoryCheck-$Frequency"
$taskDescription = "StockIT inventory check and email alerts ($Frequency at $Time)"

# Create the action to run
$action = New-ScheduledTaskAction -Execute $nodePath -Argument $scriptToRun -WorkingDirectory $scriptPath

# Create the trigger based on frequency
if ($Frequency -eq "Daily") {
    $trigger = New-ScheduledTaskTrigger -Daily -At $Time
} else {
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1)
}

# Create the task settings
$settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable -WakeToRun

# Check if the task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    # Update the existing task
    Write-Host "Updating existing scheduled task: $taskName"
    Set-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description $taskDescription
} else {
    # Create a new task
    Write-Host "Creating new scheduled task: $taskName"
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description $taskDescription -RunLevel Highest
}

Write-Host "Task scheduled successfully!"
Write-Host "Task Name: $taskName"
Write-Host "Frequency: $Frequency"
if ($Frequency -eq "Daily") {
    Write-Host "Time: $Time"
} else {
    Write-Host "Interval: Hourly"
}
