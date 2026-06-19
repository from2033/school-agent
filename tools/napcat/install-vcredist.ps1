$ErrorActionPreference = "Stop"

$installer = "C:\NapCat\downloads\vc_redist.x64.exe"
curl.exe -L --fail --output $installer "https://aka.ms/vs/17/release/vc_redist.x64.exe"
if ($LASTEXITCODE -ne 0) {
    throw "VC++ 运行库下载失败：$LASTEXITCODE"
}

$process = Start-Process $installer `
    -ArgumentList "/install", "/quiet", "/norestart" `
    -Wait `
    -PassThru

Write-Output "VC_EXIT=$($process.ExitCode)"
Write-Output "RUNTIME_EXISTS=$(Test-Path 'C:\Windows\System32\VCRUNTIME140_1.dll')"

if ($process.ExitCode -notin 0, 1638, 3010) {
    exit $process.ExitCode
}
