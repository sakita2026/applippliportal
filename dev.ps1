# WorkPortal 開発サーバー起動スクリプト
# 使い方: Z:\applippliportal\dev.ps1
# node_modules は各PCのローカル (C:\workportal_modules) に置く
# （Azure File Share は SMB制限で node_modules を置けないため）

$projectRoot  = "Z:\applippliportal"
$localModules = "C:\workportal_modules"
$nodeModules  = "$localModules\node_modules"
$nextBin      = "$nodeModules\.bin\next.cmd"

Set-Location $projectRoot

# ─── node_modules セットアップ ──────────────────────────────
if (-not (Test-Path $nextBin)) {
    Write-Host ">>> node_modules をローカルにインストールします ($localModules)..."
    New-Item -ItemType Directory $localModules -Force | Out-Null
    Copy-Item "$projectRoot\package.json"      "$localModules\package.json"      -Force
    Copy-Item "$projectRoot\package-lock.json" "$localModules\package-lock.json" -Force
    Push-Location $localModules
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install 失敗" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host ">>> インストール完了"
} else {
    Write-Host ">>> node_modules 確認済み ($localModules)"
}

# ─── 開発サーバー起動 ───────────────────────────────────────
Write-Host ">>> 開発サーバーを起動中 (http://localhost:3000)..."
$env:NODE_PATH = $nodeModules
& $nextBin dev --turbopack
