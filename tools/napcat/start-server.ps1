$ErrorActionPreference = "Stop"

$root = "C:\NapCat\NapCat.44498.Shell"
$bootDir = Join-Path $root "bootmain"
$launcher = Join-Path $bootDir "NapCatWinBootMain.exe"
$qq = Join-Path $root "QQ.exe"

Write-Output "QQ_EXISTS=$(Test-Path $qq)"
Write-Output "BOOT_EXISTS=$(Test-Path $launcher)"
Write-Output "WORKDIR=$bootDir"

Set-Location $bootDir
& $launcher
$code = $LASTEXITCODE

Write-Output "EXIT_CODE=$code"
exit $code
