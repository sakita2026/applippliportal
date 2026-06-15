# ============================================================
# WorkPortal — Azure リソース作成スクリプト
# 実行前に Azure CLI をインストールして az login を実行すること
# ============================================================

param(
    [string]$ResourceGroup  = "workportal-rg",
    [string]$Location       = "japaneast",
    [string]$SqlServerName  = "workportal-sql",      # グローバル一意名が必要
    [string]$SqlDbName      = "workportaldb",
    [string]$SqlAdminUser   = "sqladmin",
    [string]$AppServicePlan = "workportal-plan",
    [string]$AppName        = "workportal-app"       # グローバル一意名が必要
)

# パスワードを安全に入力
$SqlAdminPassword = Read-Host "Azure SQL 管理者パスワードを入力（12文字以上・大文字小文字数字記号）" -AsSecureString
$SqlAdminPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SqlAdminPassword)
)

Write-Host "`n[1/6] リソースグループを作成中..." -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location

Write-Host "`n[2/6] Azure SQL Server を作成中..." -ForegroundColor Cyan
az sql server create `
    --name $SqlServerName `
    --resource-group $ResourceGroup `
    --location $Location `
    --admin-user $SqlAdminUser `
    --admin-password $SqlAdminPasswordText

Write-Host "`n[3/6] Azure SQL Database を作成中（Basic SKU）..." -ForegroundColor Cyan
az sql db create `
    --name $SqlDbName `
    --server $SqlServerName `
    --resource-group $ResourceGroup `
    --edition Basic `
    --capacity 5

Write-Host "`n[4/6] ファイアウォール設定（Azure サービスからのアクセスを許可）..." -ForegroundColor Cyan
az sql server firewall-rule create `
    --name "AllowAzureServices" `
    --server $SqlServerName `
    --resource-group $ResourceGroup `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0

Write-Host "`n[5/6] App Service Plan を作成中（Linux B1）..." -ForegroundColor Cyan
az appservice plan create `
    --name $AppServicePlan `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku B1 `
    --is-linux

Write-Host "`n[6/6] Web App を作成中（Node.js 20）..." -ForegroundColor Cyan
az webapp create `
    --name $AppName `
    --resource-group $ResourceGroup `
    --plan $AppServicePlan `
    --runtime "NODE:20-lts"

# 接続文字列を生成
$ConnectionString = "sqlserver://${SqlServerName}.database.windows.net:1433;database=${SqlDbName};user=${SqlAdminUser}@${SqlServerName};password=${SqlAdminPasswordText};encrypt=true;trustServerCertificate=false;loginTimeout=30;"

Write-Host "`n[App Service] 環境変数 DATABASE_URL を設定中..." -ForegroundColor Cyan
az webapp config appsettings set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --settings DATABASE_URL=$ConnectionString NODE_ENV=production

Write-Host "`n[App Service] スタートアップコマンドを設定中..." -ForegroundColor Cyan
az webapp config set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --startup-file "node server.js"

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "セットアップ完了！" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "App URL  : https://${AppName}.azurewebsites.net"
Write-Host "DATABASE_URL（.env / GitHub Secrets に設定）:"
Write-Host $ConnectionString -ForegroundColor Yellow
Write-Host "`n次のステップ:"
Write-Host "  1. 上記 DATABASE_URL を .env に設定"
Write-Host "  2. npx prisma migrate dev  でローカルDBを作成"
Write-Host "  3. GitHub リポジトリの Secrets に以下を追加:"
Write-Host "     - AZURE_WEBAPP_NAME = $AppName"
Write-Host "     - DATABASE_URL = (上記の接続文字列)"
Write-Host "     - AZURE_WEBAPP_PUBLISH_PROFILE = (Azure Portal > App Service > 発行プロファイルのダウンロード)"
Write-Host "  4. main ブランチに push → 自動デプロイ"
