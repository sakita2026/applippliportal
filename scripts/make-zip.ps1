Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$src = (Resolve-Path "C:\workportal\.next\standalone").Path.TrimEnd([char]92)
$zipPath = "C:\workportal\deploy.zip"
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
$fs = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
$zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
$files = Get-ChildItem -LiteralPath $src -Recurse -File
foreach ($f in $files) {
  $rel = $f.FullName.Substring($src.Length + 1).Replace([char]92, '/')
  $entry = $zip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
  $es = $entry.Open()
  $fsr = [System.IO.File]::OpenRead($f.FullName)
  $fsr.CopyTo($es)
  $fsr.Close()
  $es.Close()
}
$zip.Dispose()
$fs.Close()
Write-Host ("created {0:N1} MB files={1}" -f ((Get-Item $zipPath).Length/1MB), $files.Count)
$z = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$bs = ($z.Entries | Where-Object { $_.FullName.Contains([char]92) }).Count
$hasServer = [bool]($z.Entries | Where-Object { $_.FullName -eq 'server.js' })
$z.Dispose()
Write-Host ("backslash=$bs serverjs=$hasServer")
