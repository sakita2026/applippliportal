# WorkPortal 初回セットアップスクリプト
# node_modules を C:\workportal_modules\ にインストールする

$ProjectPath = "C:\workportal"
$ModulesPath  = "C:\workportal_modules"

Write-Host "=== WorkPortal セットアップ ===" -ForegroundColor Cyan

# Node.js 確認
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js が見つかりません。インストールしてから再実行してください。" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Node.js $(node --version)" -ForegroundColor Green

# モジュールディレクトリ作成
if (-not (Test-Path $ModulesPath)) {
    New-Item -ItemType Directory -Path $ModulesPath | Out-Null
    Write-Host "[OK] $ModulesPath を作成しました" -ForegroundColor Green
}

# package.json をコピー
Copy-Item "$ProjectPath\package.json" "$ModulesPath\package.json" -Force
Copy-Item "$ProjectPath\package-lock.json" "$ModulesPath\package-lock.json" -Force -ErrorAction SilentlyContinue

# npm install
Write-Host "npm install を実行中..." -ForegroundColor Yellow
Set-Location $ModulesPath
& npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install に失敗しました" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] node_modules インストール完了" -ForegroundColor Green

Write-Host ""
Write-Host "セットアップ完了！次回からは dev.ps1 を実行してください。" -ForegroundColor Cyan
Write-Host "  C:\workportal\dev.ps1" -ForegroundColor White
