$ErrorActionPreference = "Stop"

$base = "C:\NapCat"
$source = Join-Path $base "qq-extract\Files"
$target = Join-Path $base "NapCat.44498.Shell"
$napcatZip = Join-Path $base "downloads\NapCat.Shell-v4.18.6.zip"
$sevenZip = Join-Path $base "OneKey\7z.exe"
$appDir = Join-Path $target "versions\9.9.26-44498\resources\app"
$napcatDir = Join-Path $appDir "napcat"
$packageJson = Join-Path $appDir "package.json"

if (-not (Test-Path (Join-Path $source "QQ.exe"))) {
    throw "QQ 解压目录不完整：$source"
}
if (-not (Test-Path $napcatZip)) {
    throw "缺少 NapCat 压缩包：$napcatZip"
}

$expectedHash = "9D9273E7EA8C8A76742A69DABB3E7BE5F45B8167C670CA70587E3619F0D8AFAD"
$actualHash = (Get-FileHash $napcatZip -Algorithm SHA256).Hash
if ($actualHash -ne $expectedHash) {
    throw "NapCat SHA-256 校验失败：$actualHash"
}

if (Test-Path $target) {
    Remove-Item -Recurse -Force $target
}
New-Item -ItemType Directory -Force $target | Out-Null
Copy-Item -Recurse -Force (Join-Path $source "*") $target

New-Item -ItemType Directory -Force $napcatDir | Out-Null
& $sevenZip x $napcatZip "-o$napcatDir" -y | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "NapCat 解压失败：$LASTEXITCODE"
}

Copy-Item -Recurse -Force (Join-Path $base "OneKey\bootmain") $target

$package = Get-Content $packageJson -Raw | ConvertFrom-Json
$package.main = "./napcat/napcat.mjs"
$package | ConvertTo-Json -Depth 10 | Set-Content $packageJson -Encoding UTF8

if (-not (Test-Path (Join-Path $napcatDir "napcat.mjs"))) {
    throw "NapCat 主程序不存在"
}
if (-not (Test-Path (Join-Path $target "bootmain\NapCatWinBootMain.exe"))) {
    throw "NapCat 启动器不存在"
}

Write-Output "INSTALL_OK"
Write-Output "ROOT=$target"
Write-Output "QQ=$(Join-Path $target 'QQ.exe')"
Write-Output "BOOT=$(Join-Path $target 'bootmain\NapCatWinBootMain.exe')"
Write-Output "MAIN=$($package.main)"
