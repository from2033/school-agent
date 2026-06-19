$ErrorActionPreference = "Stop"

$taskName = "NapCatQQ"
$bootDir = "C:\NapCat\NapCat.44498.Shell\bootmain"
$launcher = Join-Path $bootDir "NapCatWinBootMain.exe"

$action = New-ScheduledTaskAction `
    -Execute $launcher `
    -WorkingDirectory $bootDir
$principal = New-ScheduledTaskPrincipal `
    -UserId "Administrator" `
    -LogonType Interactive `
    -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Principal $principal `
    -Settings $settings `
    -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 15

$task = Get-ScheduledTaskInfo -TaskName $taskName
Write-Output "TASK_STATE=$((Get-ScheduledTask -TaskName $taskName).State)"
Write-Output "LAST_RESULT=$($task.LastTaskResult)"
Get-Process QQ, NapCatWinBootMain -ErrorAction SilentlyContinue |
    Select-Object Name, Id, SessionId, Path
