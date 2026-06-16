# WorkPortal PC初回セットアップスクリプト
# 別のPCでこのプロジェクトを使い始めるときに実行する
# 実行: Z:\applippliportal\setup.ps1

$projectRoot  = "Z:\applippliportal"
$localModules = "C:\workportal_modules"
# トークンは Z:\applippliportal\SECRETS.md を参照

Write-Host "=== WorkPortal セットアップ ===" -ForegroundColor Cyan
Write-Host "プロジェクト: $projectRoot"
Write-Host "node_modules: $localModules"
Write-Host ""

# 1. git safe.directory 設定（SMB ドライブで git を使うために必要）
Write-Host ">>> git safe.directory を設定中..."
git config --global --add safe.directory '%(prefix)///applippliportal.file.core.windows.net/source/applippliportal'
Write-Host ">>> git safe.directory 設定完了" -ForegroundColor Green

# 2. git リモートが未設定なら設定
Set-Location $projectRoot
$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl -or $remoteUrl -notmatch "github.com") {
    Write-Host ">>> git remote が未設定です。SECRETS.md のトークンを使って設定してください："
    Write-Host '    git remote add origin "https://sakita2026:<TOKEN>@github.com/sakita2026/applippliportal.git"'
    Write-Host ">>> SECRETS.md のトークンを確認後、手動で設定してください。" -ForegroundColor Yellow
} else {
    Write-Host ">>> git remote 確認済み" -ForegroundColor Green
}

# 3. 最新コードを取得
Write-Host ">>> 最新コードを取得中..."
git fetch origin
git reset --mixed origin/main
Write-Host ">>> コード最新化完了" -ForegroundColor Green

# 4. node_modules インストール
$nextBin = "$localModules\node_modules\.bin\next.cmd"
if (Test-Path $nextBin) {
    Write-Host ">>> node_modules は既にインストール済みです" -ForegroundColor Green
} else {
    Write-Host ">>> node_modules をインストールしています..."
    New-Item -ItemType Directory $localModules -Force | Out-Null
    Copy-Item "$projectRoot\package.json"      "$localModules\package.json"      -Force
    Copy-Item "$projectRoot\package-lock.json" "$localModules\package-lock.json" -Force
    Push-Location $localModules
    npm install
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -ne 0) {
        Write-Host "ERROR: npm install 失敗 (exit: $exitCode)" -ForegroundColor Red
        exit 1
    }
    Write-Host ">>> インストール完了" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== セットアップ完了 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "開発サーバーを起動するには:"
Write-Host "  Z:\applippliportal\dev.ps1"
Write-Host ""
Write-Host "package.json を変更したら:"
Write-Host "  Copy-Item Z:\applippliportal\package.json C:\workportal_modules\package.json -Force"
Write-Host "  Copy-Item Z:\applippliportal\package-lock.json C:\workportal_modules\package-lock.json -Force"
Write-Host "  Push-Location C:\workportal_modules; npm install; Pop-Location"
