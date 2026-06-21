$ErrorActionPreference = "Stop"

$taskName = "MiniStudyQQSync"
$runner = "C:\school-agent\server\scripts\run_qq_sync.bat"

if (-not (Test-Path $runner)) {
    throw "同步启动脚本不存在：$runner"
}

$action = New-ScheduledTaskAction -Execute "C:\Windows\System32\cmd.exe" `
    -Argument "/d /c `"$runner`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "Mini Study QQ message fallback sync; runs every minute." `
    -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Start-Sleep -Seconds 5

$task = Get-ScheduledTask -TaskName $taskName
$info = Get-ScheduledTaskInfo -TaskName $taskName
Write-Output "TASK_STATE=$($task.State)"
Write-Output "LAST_RUN=$($info.LastRunTime)"
Write-Output "LAST_RESULT=$($info.LastTaskResult)"
Write-Output "NEXT_RUN=$($info.NextRunTime)"
